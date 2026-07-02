import { db } from "../db";
import { users, tasks, taskBatches, batchTaskAllocations, userAnalytics, allocationAnalytics } from "@shared/schema.mysql";
import { eq, and, gte, lte, desc, asc, sql, inArray } from "drizzle-orm";
import type { AllocationCriteria, AllocationPreview } from "@shared/schema.mysql";

export class BatchAllocationService {
  
  // Create a new batch allocation with intelligent user selection
  async createBatch(
    name: string, 
    description: string, 
    targetUserCount: number,
    taskIds: number[],
    criteria: AllocationCriteria,
    strategy: string,
    createdBy: number
  ) {
    // Create the batch record
    const [batch] = await db.insert(taskBatches).values({
      name,
      description,
      targetUserCount,
      allocationCriteria: JSON.stringify(criteria),
      strategy,
      createdBy,
      status: "pending"
    }).returning();

    return batch;
  }

  // Preview allocation before execution
  async previewAllocation(criteria: AllocationCriteria): Promise<AllocationPreview> {
    const eligibleUsers = await this.findEligibleUsers(criteria);
    
    // Calculate metrics
    const byLevel: Record<number, number> = {};
    const byRegion: Record<string, number> = {};
    let totalCompletionRate = 0;

    for (const user of eligibleUsers) {
      // Group by level
      byLevel[user.level] = (byLevel[user.level] || 0) + 1;
      
      // Group by region (if available in user analytics)
      const region = "Unknown"; // Would get from user analytics
      byRegion[region] = (byRegion[region] || 0) + 1;
      
      // Calculate completion rate based on user history
      totalCompletionRate += await this.getUserCompletionRate(user.id);
    }

    const averageCompletionRate = eligibleUsers.length > 0 
      ? totalCompletionRate / eligibleUsers.length 
      : 0;

    // Estimate engagement metrics
    const expectedCompletions = Math.floor(eligibleUsers.length * (averageCompletionRate / 100));
    const projectedTimeToComplete = this.estimateCompletionTime(eligibleUsers.length, averageCompletionRate);
    const riskFactors = this.identifyRiskFactors(eligibleUsers, criteria);

    return {
      targetUsers: {
        total: eligibleUsers.length,
        byLevel,
        byRegion,
        averageCompletionRate
      },
      estimatedEngagement: {
        expectedCompletions,
        projectedTimeToComplete,
        riskFactors
      }
    };
  }

  // Find eligible users based on criteria
  async findEligibleUsers(criteria: AllocationCriteria) {
    let query = db.select().from(users);
    
    const conditions = [];

    // Level range filter
    if (criteria.userLevel) {
      conditions.push(
        and(
          gte(users.level, criteria.userLevel.min),
          lte(users.level, criteria.userLevel.max)
        )
      );
    }

    // Points range filter
    if (criteria.pointsRange) {
      conditions.push(
        and(
          gte(users.points, criteria.pointsRange.min),
          lte(users.points, criteria.pointsRange.max)
        )
      );
    }

    // Apply all conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.execute();
  }

  // Execute batch allocation with selected strategy
  async executeBatch(batchId: number) {
    const batch = await db.select().from(taskBatches).where(eq(taskBatches.id, batchId)).limit(1);
    if (!batch.length) throw new Error("Batch not found");

    const batchData = batch[0];
    const criteria = JSON.parse(batchData.allocationCriteria || "{}") as AllocationCriteria;

    // Update batch status to allocating
    await db.update(taskBatches)
      .set({ status: "allocating", startedAt: new Date() })
      .where(eq(taskBatches.id, batchId));

    try {
      // Find eligible users
      const eligibleUsers = await this.findEligibleUsers(criteria);
      
      // Select users based on strategy
      const selectedUsers = await this.selectUsersByStrategy(
        eligibleUsers, 
        batchData.targetUserCount, 
        batchData.strategy
      );

      // Get tasks for this batch (for now using all active tasks, could be batch-specific)
      const activeTasks = await db.select().from(tasks).where(eq(tasks.isActive, true));

      // Allocate tasks to selected users
      const allocations = [];
      for (const user of selectedUsers) {
        for (const task of activeTasks) {
          allocations.push({
            batchId,
            taskId: task.id,
            userId: user.id,
            userSegment: this.determineUserSegment(user),
            allocationReason: `Selected via ${batchData.strategy} strategy`,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
          });
        }
      }

      // Batch insert allocations
      if (allocations.length > 0) {
        await db.insert(batchTaskAllocations).values(allocations);
      }

      // Update batch completion
      await db.update(taskBatches)
        .set({ 
          status: "completed", 
          completedAt: new Date(),
          actualAllocatedCount: selectedUsers.length 
        })
        .where(eq(taskBatches.id, batchId));

      // Record analytics
      await this.recordAllocationAnalytics(batchId, selectedUsers.length, allocations.length);

      return {
        batchId,
        usersAllocated: selectedUsers.length,
        tasksAllocated: allocations.length,
        status: "completed"
      };

    } catch (error) {
      // Update batch status to failed
      await db.update(taskBatches)
        .set({ status: "cancelled", pausedReason: `Error: ${error.message}` })
        .where(eq(taskBatches.id, batchId));
      
      throw error;
    }
  }

  // Select users based on allocation strategy
  async selectUsersByStrategy(users: any[], targetCount: number, strategy: string) {
    switch (strategy) {
      case "performance_based":
        return this.selectHighPerformers(users, targetCount);
      case "engagement_revival":
        return this.selectDormantUsers(users, targetCount);
      case "fair_distribution":
        return this.selectFairDistribution(users, targetCount);
      case "random":
      default:
        return this.selectRandomUsers(users, targetCount);
    }
  }

  // Random selection
  selectRandomUsers(users: any[], targetCount: number) {
    const shuffled = users.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(targetCount, users.length));
  }

  // Select high performers
  async selectHighPerformers(users: any[], targetCount: number) {
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const completionRate = await this.getUserCompletionRate(user.id);
        return { ...user, completionRate };
      })
    );

    return usersWithStats
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, Math.min(targetCount, users.length));
  }

  // Select dormant users for re-engagement
  selectDormantUsers(users: any[], targetCount: number) {
    const dormantUsers = users.filter(user => {
      const daysSinceLastTask = user.lastTaskDate 
        ? Math.floor((Date.now() - new Date(user.lastTaskDate).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      return daysSinceLastTask > 7; // Haven't done tasks in 7+ days
    });

    return this.selectRandomUsers(dormantUsers, targetCount);
  }

  // Fair distribution across user segments
  selectFairDistribution(users: any[], targetCount: number) {
    const segments = {
      new: users.filter(u => u.level <= 2),
      regular: users.filter(u => u.level > 2 && u.level <= 10),
      advanced: users.filter(u => u.level > 10)
    };

    const perSegment = Math.floor(targetCount / 3);
    const selected = [
      ...this.selectRandomUsers(segments.new, perSegment),
      ...this.selectRandomUsers(segments.regular, perSegment),
      ...this.selectRandomUsers(segments.advanced, perSegment)
    ];

    // Fill remaining slots if any
    const remaining = targetCount - selected.length;
    if (remaining > 0) {
      const allRemaining = users.filter(u => !selected.includes(u));
      selected.push(...this.selectRandomUsers(allRemaining, remaining));
    }

    return selected;
  }

  // Get user's historical completion rate
  async getUserCompletionRate(userId: number): Promise<number> {
    try {
      const analytics = await db.select()
        .from(userAnalytics)
        .where(eq(userAnalytics.userId, userId))
        .orderBy(desc(userAnalytics.date))
        .limit(30); // Last 30 days

      if (analytics.length === 0) return 50; // Default rate for new users

      const totalViewed = analytics.reduce((sum, day) => sum + day.tasksViewed, 0);
      const totalCompleted = analytics.reduce((sum, day) => sum + day.tasksCompleted, 0);

      return totalViewed > 0 ? (totalCompleted / totalViewed) * 100 : 50;
    } catch (error) {
      // Return default if analytics table doesn't exist yet
      return 50;
    }
  }

  // Determine user segment based on activity and performance
  determineUserSegment(user: any): string {
    if (user.level <= 2) return "new";
    if (user.points > 10000) return "high_performer";
    if (user.dailyTasksCompleted === 0) return "dormant";
    return "regular";
  }

  // Estimate completion time based on user count and completion rate
  estimateCompletionTime(userCount: number, completionRate: number): string {
    const estimatedCompletions = userCount * (completionRate / 100);
    const avgTimePerTask = 15; // minutes
    const totalMinutes = estimatedCompletions * avgTimePerTask;
    
    if (totalMinutes < 60) return `${Math.round(totalMinutes)} minutes`;
    if (totalMinutes < 1440) return `${Math.round(totalMinutes / 60)} hours`;
    return `${Math.round(totalMinutes / 1440)} days`;
  }

  // Identify potential risk factors
  identifyRiskFactors(users: any[], criteria: AllocationCriteria): string[] {
    const risks = [];
    
    if (users.length < 100) risks.push("Small user pool may limit effectiveness");
    if (criteria.userLevel.max - criteria.userLevel.min > 15) risks.push("Wide level range may have varying engagement");
    
    const newUsers = users.filter(u => u.level <= 2).length;
    if (newUsers / users.length > 0.5) risks.push("High percentage of new users");
    
    return risks;
  }

  // Record allocation analytics
  async recordAllocationAnalytics(batchId: number, usersCount: number, allocationsCount: number) {
    try {
      const metrics = [
        {
          batchId,
          metricName: "users_selected",
          metricValue: usersCount.toString(),
          metricUnit: "count"
        },
        {
          batchId,
          metricName: "allocations_created",
          metricValue: allocationsCount.toString(),
          metricUnit: "count"
        }
      ];

      await db.insert(allocationAnalytics).values(metrics);
    } catch (error) {
      // Skip analytics if table doesn't exist yet
      console.log("Analytics recording skipped:", error.message);
    }
  }

  // Get batch status and progress
  async getBatchStatus(batchId: number) {
    try {
      const batch = await db.select().from(taskBatches).where(eq(taskBatches.id, batchId)).limit(1);
      if (!batch.length) throw new Error("Batch not found");

      const allocations = await db.select()
        .from(batchTaskAllocations)
        .where(eq(batchTaskAllocations.batchId, batchId));

      const completed = allocations.filter(a => a.status === "completed").length;
      const clicked = allocations.filter(a => a.status === "clicked").length;

      return {
        batch: batch[0],
        progress: {
          total: allocations.length,
          completed,
          clicked,
          pending: allocations.length - completed,
          completionRate: allocations.length > 0 ? (completed / allocations.length) * 100 : 0
        }
      };
    } catch (error) {
      throw new Error(`Error getting batch status: ${error.message}`);
    }
  }

  // Pause a running batch
  async pauseBatch(batchId: number, reason: string, pausedBy: number) {
    await db.update(taskBatches)
      .set({ 
        status: "paused", 
        pausedBy,
        pausedReason: reason 
      })
      .where(eq(taskBatches.id, batchId));
  }

  // Resume a paused batch
  async resumeBatch(batchId: number) {
    await db.update(taskBatches)
      .set({ 
        status: "allocating", 
        pausedBy: null,
        pausedReason: null 
      })
      .where(eq(taskBatches.id, batchId));
  }
}

export const batchAllocationService = new BatchAllocationService();