import { storage } from './storage';
import { getRealTimeService } from './websocket';
import type { Task, User } from '@shared/schema.mysql';
import { taskCache } from './cache';

export interface TaskAllocation {
  userId: number;
  taskId: number;
  allocatedAt: Date;
  expiresAt: Date;
  status: 'allocated' | 'completed' | 'expired';
}

export interface AllocationStrategy {
  type: 'balanced' | 'priority' | 'random';
  batchSize: number;
  userLimit: number;
  cooldownMinutes: number;
}

export class TaskAllocator {
  private allocations: Map<string, TaskAllocation> = new Map();
  private userCooldowns: Map<number, Date> = new Map();
  private strategy: AllocationStrategy;

  constructor(strategy: AllocationStrategy = {
    type: 'balanced',
    batchSize: 5,
    userLimit: 10,
    cooldownMinutes: 15
  }) {
    this.strategy = strategy;
    this.startCleanupTimer();
  }

  private startCleanupTimer() {
    setInterval(() => {
      this.cleanupExpiredAllocations();
    }, 60000); // Clean up every minute
  }

  private cleanupExpiredAllocations() {
    const now = new Date();
    const expired: string[] = [];

    Array.from(this.allocations.entries()).forEach(([key, allocation]) => {
      if (allocation.expiresAt < now && allocation.status !== 'completed') {
        allocation.status = 'expired';
        expired.push(key);
      }
    });

    // Remove expired allocations
    expired.forEach(key => this.allocations.delete(key));
    
    if (expired.length > 0) {
      console.log(`🗑️ Cleaned up ${expired.length} expired task allocations`);
    }
  }

  private getAllocationKey(userId: number, taskId: number): string {
    return `${userId}:${taskId}`;
  }

  private isUserOnCooldown(userId: number): boolean {
    const cooldown = this.userCooldowns.get(userId);
    if (!cooldown) return false;

    const now = new Date();
    const cooldownEnd = new Date(cooldown.getTime() + this.strategy.cooldownMinutes * 60000);
    return now < cooldownEnd;
  }

  private async getUserCompletedTasksToday(userId: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return await storage.getUserDailyTaskCount(userId);
  }

  private async getTaskDistribution(): Promise<Map<number, number>> {
    const distribution = new Map<number, number>();
    
    // Get all tasks and their completion counts
    const tasks = await storage.getTasks();
    
    for (const task of tasks) {
      if (task.isActive) {
        const completionCount = await this.getTaskCompletionCount(task.id);
        distribution.set(task.id, completionCount);
      }
    }
    
    return distribution;
  }

  private async getTaskCompletionCount(taskId: number): Promise<number> {
    // Check cache first
    const cached = taskCache.get(`task_completion_count_${taskId}`);
    if (cached) return cached;

    // Get from database
    const allUserTasks = await storage.getAllUserTasks();
    const count = allUserTasks.filter(ut => ut.taskId === taskId).length;
    
    // Cache for 5 minutes
    taskCache.set(`task_completion_count_${taskId}`, count, 300);
    
    return count;
  }

  public async allocateTasksToUser(userId: number): Promise<Task[]> {
    try {
      // Check if user is on cooldown
      if (this.isUserOnCooldown(userId)) {
        console.log(`⏰ User ${userId} is on cooldown`);
        return [];
      }

      // Check user's daily task limit
      const dailyCompletions = await this.getUserCompletedTasksToday(userId);
      if (dailyCompletions >= this.strategy.userLimit) {
        console.log(`🚫 User ${userId} has reached daily task limit`);
        return [];
      }

      // Get all available tasks
      const allTasks = await storage.getAvailableTasks(userId);
      
      if (allTasks.length === 0) {
        return [];
      }

      // Apply allocation strategy
      const allocatedTasks = await this.applyAllocationStrategy(userId, allTasks);
      
      // Create allocations
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 60000); // 30 minutes

      for (const task of allocatedTasks) {
        const allocation: TaskAllocation = {
          userId,
          taskId: task.id,
          allocatedAt: now,
          expiresAt,
          status: 'allocated'
        };
        
        const key = this.getAllocationKey(userId, task.id);
        this.allocations.set(key, allocation);
      }

      // Set user cooldown
      this.userCooldowns.set(userId, now);

      // Send real-time notification
      const realTimeService = getRealTimeService();
      if (realTimeService && allocatedTasks.length > 0) {
        realTimeService.broadcastToUser(userId, {
          type: 'tasks_allocated',
          data: {
            tasks: allocatedTasks,
            count: allocatedTasks.length,
            expiresAt: expiresAt.toISOString()
          },
          timestamp: Date.now()
        });
      }

      console.log(`✅ Allocated ${allocatedTasks.length} tasks to user ${userId}`);
      return allocatedTasks;
    } catch (error) {
      console.error('Task allocation error:', error);
      return [];
    }
  }

  private async applyAllocationStrategy(userId: number, availableTasks: Task[]): Promise<Task[]> {
    switch (this.strategy.type) {
      case 'balanced':
        return this.balancedAllocation(availableTasks);
      case 'priority':
        return this.priorityAllocation(availableTasks);
      case 'random':
        return this.randomAllocation(availableTasks);
      default:
        return this.balancedAllocation(availableTasks);
    }
  }

  private async balancedAllocation(tasks: Task[]): Promise<Task[]> {
    // Get task distribution
    const distribution = await this.getTaskDistribution();
    
    // Sort tasks by completion count (ascending) and points (descending)
    const sortedTasks = tasks.sort((a, b) => {
      const aCompletions = distribution.get(a.id) || 0;
      const bCompletions = distribution.get(b.id) || 0;
      
      if (aCompletions !== bCompletions) {
        return aCompletions - bCompletions; // Fewer completions first
      }
      
      return b.points - a.points; // Higher points first
    });

    return sortedTasks.slice(0, this.strategy.batchSize);
  }

  private priorityAllocation(tasks: Task[]): Promise<Task[]> {
    // Sort by points (descending) and creation date (newest first)
    const sortedTasks = tasks.sort((a, b) => {
      if (a.points !== b.points) {
        return b.points - a.points;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return Promise.resolve(sortedTasks.slice(0, this.strategy.batchSize));
  }

  private randomAllocation(tasks: Task[]): Promise<Task[]> {
    const shuffled = [...tasks].sort(() => Math.random() - 0.5);
    return Promise.resolve(shuffled.slice(0, this.strategy.batchSize));
  }

  public async completeTaskAllocation(userId: number, taskId: number): Promise<boolean> {
    const key = this.getAllocationKey(userId, taskId);
    const allocation = this.allocations.get(key);
    
    if (!allocation) {
      console.log(`⚠️ No allocation found for user ${userId}, task ${taskId}`);
      return false;
    }

    if (allocation.status === 'expired') {
      console.log(`⏰ Allocation expired for user ${userId}, task ${taskId}`);
      return false;
    }

    allocation.status = 'completed';
    
    // Remove from active allocations
    this.allocations.delete(key);
    
    console.log(`✅ Completed allocation for user ${userId}, task ${taskId}`);
    return true;
  }

  public async getUserAllocations(userId: number): Promise<TaskAllocation[]> {
    const userAllocations: TaskAllocation[] = [];
    
    for (const [key, allocation] of this.allocations) {
      if (allocation.userId === userId && allocation.status === 'allocated') {
        userAllocations.push(allocation);
      }
    }
    
    return userAllocations;
  }

  public async getSystemStats(): Promise<{
    totalAllocations: number;
    activeAllocations: number;
    completedAllocations: number;
    expiredAllocations: number;
    usersCooling: number;
  }> {
    const stats = {
      totalAllocations: this.allocations.size,
      activeAllocations: 0,
      completedAllocations: 0,
      expiredAllocations: 0,
      usersCooling: 0
    };

    for (const allocation of this.allocations.values()) {
      switch (allocation.status) {
        case 'allocated':
          stats.activeAllocations++;
          break;
        case 'completed':
          stats.completedAllocations++;
          break;
        case 'expired':
          stats.expiredAllocations++;
          break;
      }
    }

    // Count users on cooldown
    const now = new Date();
    for (const [userId, cooldownTime] of this.userCooldowns) {
      const cooldownEnd = new Date(cooldownTime.getTime() + this.strategy.cooldownMinutes * 60000);
      if (now < cooldownEnd) {
        stats.usersCooling++;
      }
    }

    return stats;
  }

  public updateStrategy(newStrategy: Partial<AllocationStrategy>): void {
    this.strategy = { ...this.strategy, ...newStrategy };
    console.log('📊 Task allocation strategy updated:', this.strategy);
  }
}

// Global instance
let taskAllocator: TaskAllocator | null = null;

export function getTaskAllocator(): TaskAllocator {
  if (!taskAllocator) {
    taskAllocator = new TaskAllocator();
  }
  return taskAllocator;
}

export function initializeTaskAllocator(strategy?: AllocationStrategy): TaskAllocator {
  taskAllocator = new TaskAllocator(strategy);
  return taskAllocator;
}