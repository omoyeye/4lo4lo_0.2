import { db } from "../db";
import { 
  userAnalytics, 
  allocationAnalytics, 
  taskPerformance, 
  systemMetrics,
  users,
  tasks,
  batchTaskAllocations,
  taskBatches
} from "@shared/schema.mysql";
import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";

export class AnalyticsService {
  
  // Track user activity and engagement
  async trackUserActivity(userId: number, activity: {
    tasksViewed?: number;
    tasksClicked?: number;
    tasksCompleted?: number;
    timeSpentMinutes?: number;
    deviceInfo?: string;
    geoLocation?: string;
  }) {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Check if analytics record exists for today
      const existing = await db.select()
        .from(userAnalytics)
        .where(and(
          eq(userAnalytics.userId, userId),
          eq(userAnalytics.date, new Date(today))
        ))
        .limit(1);

      if (existing.length > 0) {
        // Update existing record
        await db.update(userAnalytics)
          .set({
            tasksViewed: sql`${userAnalytics.tasksViewed} + ${activity.tasksViewed || 0}`,
            tasksClicked: sql`${userAnalytics.tasksClicked} + ${activity.tasksClicked || 0}`,
            tasksCompleted: sql`${userAnalytics.tasksCompleted} + ${activity.tasksCompleted || 0}`,
            timeSpentMinutes: sql`${userAnalytics.timeSpentMinutes} + ${activity.timeSpentMinutes || 0}`,
            lastActivityAt: new Date(),
            deviceInfo: activity.deviceInfo || existing[0].deviceInfo,
            geoLocation: activity.geoLocation || existing[0].geoLocation
          })
          .where(and(
            eq(userAnalytics.userId, userId),
            eq(userAnalytics.date, new Date(today))
          ));
      } else {
        // Create new record
        await db.insert(userAnalytics).values({
          userId,
          date: new Date(today),
          tasksViewed: activity.tasksViewed || 0,
          tasksClicked: activity.tasksClicked || 0,
          tasksCompleted: activity.tasksCompleted || 0,
          timeSpentMinutes: activity.timeSpentMinutes || 0,
          lastActivityAt: new Date(),
          deviceInfo: activity.deviceInfo,
          geoLocation: activity.geoLocation
        });
      }

      // Update engagement score
      await this.updateUserEngagementScore(userId);
    } catch (error) {
      console.error("Error tracking user activity:", error);
    }
  }

  // Calculate and update user engagement score
  async updateUserEngagementScore(userId: number) {
    try {
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);

      const analytics = await db.select()
        .from(userAnalytics)
        .where(and(
          eq(userAnalytics.userId, userId),
          gte(userAnalytics.date, new Date(last30Days.toISOString().split('T')[0]))
        ));

      if (analytics.length === 0) return;

      const totalViewed = analytics.reduce((sum, day) => sum + day.tasksViewed, 0);
      const totalCompleted = analytics.reduce((sum, day) => sum + day.tasksCompleted, 0);
      const totalTime = analytics.reduce((sum, day) => sum + day.timeSpentMinutes, 0);
      const activeDays = analytics.filter(day => day.tasksViewed > 0).length;

      // Calculate engagement score (0-100)
      const completionRate = totalViewed > 0 ? (totalCompleted / totalViewed) * 100 : 0;
      const timeScore = Math.min(totalTime / 60, 100); // Max 60 minutes = 100 points
      const consistencyScore = (activeDays / 30) * 100;

      const engagementScore = (completionRate * 0.4) + (timeScore * 0.3) + (consistencyScore * 0.3);
      
      // Determine activity level
      let activityLevel = "low";
      if (engagementScore > 70) activityLevel = "high";
      else if (engagementScore > 40) activityLevel = "medium";

      // Update latest record
      const today = new Date().toISOString().split('T')[0];
      await db.update(userAnalytics)
        .set({
          engagementScore: engagementScore.toFixed(2),
          activityLevel
        })
        .where(and(
          eq(userAnalytics.userId, userId),
          eq(userAnalytics.date, new Date(today))
        ));
    } catch (error) {
      console.error("Error updating engagement score:", error);
    }
  }

  // Get real-time dashboard metrics
  async getDashboardMetrics() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);

      // Active users today
      const activeUsersToday = await db.select({ count: count() })
        .from(userAnalytics)
        .where(eq(userAnalytics.date, new Date(today)));

      // Active batches
      const activeBatches = await db.select({ count: count() })
        .from(taskBatches)
        .where(eq(taskBatches.status, "allocating"));

      // Pending allocations
      const pendingAllocations = await db.select({ count: count() })
        .from(batchTaskAllocations)
        .where(eq(batchTaskAllocations.status, "allocated"));

      // Completion rate last 7 days
      const recentAnalytics = await db.select()
        .from(userAnalytics)
        .where(gte(userAnalytics.date, new Date(last7Days.toISOString().split('T')[0])));

      const totalViewed = recentAnalytics.reduce((sum, day) => sum + day.tasksViewed, 0);
      const totalCompleted = recentAnalytics.reduce((sum, day) => sum + day.tasksCompleted, 0);
      const completionRate = totalViewed > 0 ? (totalCompleted / totalViewed) * 100 : 0;

      return {
        activeUsersToday: activeUsersToday[0]?.count || 0,
        activeBatches: activeBatches[0]?.count || 0,
        pendingAllocations: pendingAllocations[0]?.count || 0,
        completionRate: completionRate.toFixed(2),
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error getting dashboard metrics:", error);
      return {
        activeUsersToday: 0,
        activeBatches: 0,
        pendingAllocations: 0,
        completionRate: "0.00",
        lastUpdated: new Date().toISOString()
      };
    }
  }

  // Get user engagement trends
  async getUserEngagementTrends(days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const trends = await db.select({
        date: userAnalytics.date,
        totalUsers: count(),
        avgEngagement: sql`AVG(CAST(${userAnalytics.engagementScore} AS NUMERIC))`,
        totalViewed: sql`SUM(${userAnalytics.tasksViewed})`,
        totalCompleted: sql`SUM(${userAnalytics.tasksCompleted})`
      })
      .from(userAnalytics)
      .where(gte(userAnalytics.date, new Date(startDate.toISOString().split('T')[0])))
      .groupBy(userAnalytics.date)
      .orderBy(userAnalytics.date);

      return trends;
    } catch (error) {
      console.error("Error getting engagement trends:", error);
      return [];
    }
  }

  // Get task performance analytics
  async getTaskPerformanceAnalytics(taskId?: number) {
    try {
      const conditions = [];
      if (taskId) {
        conditions.push(eq(batchTaskAllocations.taskId, taskId));
      }

      const results = await db.select({
        taskId: batchTaskAllocations.taskId,
        totalAllocations: count(),
        completed: sql`COUNT(CASE WHEN ${batchTaskAllocations.status} = 'completed' THEN 1 END)`,
        clicked: sql`COUNT(CASE WHEN ${batchTaskAllocations.status} = 'clicked' THEN 1 END)`,
        avgTimeToComplete: sql`AVG(EXTRACT(EPOCH FROM (${batchTaskAllocations.completedAt} - ${batchTaskAllocations.allocatedAt})) / 60)`
      })
      .from(batchTaskAllocations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(batchTaskAllocations.taskId)
      .execute();

      return results.map(result => ({
        ...result,
        completionRate: result.totalAllocations > 0 
          ? (Number(result.completed) / result.totalAllocations * 100).toFixed(2)
          : "0.00",
        clickRate: result.totalAllocations > 0
          ? (Number(result.clicked) / result.totalAllocations * 100).toFixed(2)
          : "0.00"
      }));
    } catch (error) {
      console.error("Error getting task performance:", error);
      return [];
    }
  }

  // Get batch allocation analytics
  async getBatchAnalytics(batchId: number) {
    try {
      const batch = await db.select()
        .from(taskBatches)
        .where(eq(taskBatches.id, batchId))
        .limit(1);

      if (!batch.length) throw new Error("Batch not found");

      const allocations = await db.select()
        .from(batchTaskAllocations)
        .where(eq(batchTaskAllocations.batchId, batchId));

      const analytics = await db.select()
        .from(allocationAnalytics)
        .where(eq(allocationAnalytics.batchId, batchId));

      // Calculate metrics
      const totalAllocations = allocations.length;
      const completed = allocations.filter(a => a.status === "completed").length;
      const clicked = allocations.filter(a => a.status === "clicked").length;
      const expired = allocations.filter(a => a.expiresAt && new Date(a.expiresAt) < new Date()).length;

      // User segment breakdown
      const segmentBreakdown = allocations.reduce((acc, allocation) => {
        const segment = allocation.userSegment || "unknown";
        acc[segment] = (acc[segment] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        batch: batch[0],
        metrics: {
          totalAllocations,
          completed,
          clicked,
          expired,
          pending: totalAllocations - completed - clicked - expired,
          completionRate: totalAllocations > 0 ? (completed / totalAllocations * 100).toFixed(2) : "0.00",
          clickRate: totalAllocations > 0 ? (clicked / totalAllocations * 100).toFixed(2) : "0.00"
        },
        segmentBreakdown,
        analyticsHistory: analytics
      };
    } catch (error) {
      console.error("Error getting batch analytics:", error);
      throw error;
    }
  }

  // Record system metrics
  async recordSystemMetric(metricName: string, value: number, unit: string, serverNode?: string) {
    try {
      await db.insert(systemMetrics).values({
        metricName,
        metricValue: value.toString(),
        metricUnit: unit,
        serverNode: serverNode || "main",
        isAlert: false
      });
    } catch (error) {
      console.error("Error recording system metric:", error);
    }
  }

  // Get system health metrics
  async getSystemHealth() {
    try {
      const last5Minutes = new Date();
      last5Minutes.setMinutes(last5Minutes.getMinutes() - 5);

      const recentMetrics = await db.select()
        .from(systemMetrics)
        .where(gte(systemMetrics.timestamp, last5Minutes))
        .orderBy(desc(systemMetrics.timestamp));

      const groupedMetrics = recentMetrics.reduce((acc, metric) => {
        if (!acc[metric.metricName]) {
          acc[metric.metricName] = [];
        }
        acc[metric.metricName].push(metric);
        return acc;
      }, {} as Record<string, any[]>);

      return {
        metrics: groupedMetrics,
        healthScore: this.calculateHealthScore(groupedMetrics),
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error getting system health:", error);
      return {
        metrics: {},
        healthScore: 100,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  // Calculate overall system health score
  private calculateHealthScore(metrics: Record<string, any[]>): number {
    // Simple health scoring based on response times and error rates
    let score = 100;
    
    if (metrics.response_time) {
      const avgResponseTime = metrics.response_time.reduce((sum, m) => sum + parseFloat(m.metricValue), 0) / metrics.response_time.length;
      if (avgResponseTime > 1000) score -= 20; // Slow response times
      else if (avgResponseTime > 500) score -= 10;
    }

    if (metrics.error_rate) {
      const avgErrorRate = metrics.error_rate.reduce((sum, m) => sum + parseFloat(m.metricValue), 0) / metrics.error_rate.length;
      if (avgErrorRate > 5) score -= 30; // High error rate
      else if (avgErrorRate > 1) score -= 15;
    }

    return Math.max(0, score);
  }
}

export const analyticsService = new AnalyticsService();