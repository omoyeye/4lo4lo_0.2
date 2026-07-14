import {
  users,
  tasks,
  userTasks,
  milestones,
  userMilestones,
  dailyTaskAllocation,
  referrals,
  referralRewardClaims,
  referralTiers,
  payouts,
  admins,
  taskClicks,
  passwordResetTokens,
  appSettings,
  notifications,
  classroomVideos,
  classroomCompletions,
  badges,
  userBadges,
  pointListings,
  listingComments,
  qrEmailLeads,
  shortenedUrls,
  adPlacements,
  levelHistory,
  profileLinks,
  type ProfileLink,
  type InsertProfileLink,
  type User,
  type InsertUser,
  type Task,
  type UserTask,
  type Milestone,
  type UserMilestone,
  type DailyTaskAllocation,
  type Referral,
  type ReferralRewardClaim,
  type ReferralTier,
  type InsertReferralTier,
  type Payout,
  type Admin,
  type InsertAdmin,
  type TaskClick,
  type InsertTaskClick,
  type MilestoneWithProgress,
  type TaskCount,
  type PointsData,
  type Notification,
  type InsertNotification,
  type ClassroomVideo,
  type InsertClassroomVideo,
  type ClassroomCompletion,
  type InsertClassroomCompletion,
  type Badge,
  type InsertBadge,
  type UserBadge,
  type PointListing,
  type InsertPointListing,
  type ListingComment,
  type InsertListingComment,
  type QrEmailLead,
  type ShortenedUrl,
  type AdPlacement,
  type InsertAdPlacement,
} from "@shared/schema.mysql";
import { IStorage, LeaderboardEntry } from "./storage";
import { db } from "./db";
import { eq, and, desc, sql, gte, count, inArray, or, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
// Session store imports removed

export class DatabaseStorage implements IStorage {
  constructor() {
    // Session store initialization removed
    console.log("✅ Database storage initialized");
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByReferralCode(referralCode: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.referralCode, referralCode));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.googleId, googleId));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    // Generate a unique referral code if not provided
    if (!user.referralCode) {
      user.referralCode = nanoid(8);
    }

    const [insertResult] = await db.insert(users).values(user);
    const [newUser] = await db.select().from(users).where(eq(users.id, (insertResult as any).insertId));

    // Create milestone entries for this user
    const allMilestones = await this.getMilestones();
    for (const milestone of allMilestones) {
      await this.createUserMilestone(newUser.id, milestone.id);
    }

    return newUser;
  }

  async updateUserProfile(userId: number, userData: Partial<User>): Promise<User | undefined> {
    const userIdInt = Math.floor(Number(userId));

    const user = await this.getUser(userIdInt);
    if (!user) return undefined;

    // Remove fields that should never be updated directly
    const { id, points, level, progress, createdAt, updatedAt, ...allowedFields } =
      userData;

    // If no updatable fields were passed, return existing user
    if (Object.keys(allowedFields).length === 0) {
      return user;
    }

    await db
      .update(users)
      .set({
        ...allowedFields,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userIdInt));
    const [updatedUser] = await db.select().from(users).where(eq(users.id, userIdInt));

    return updatedUser;
  }

  async updateUserPoints(
    userId: number,
    points: number,
  ): Promise<User | undefined> {
    // Make sure userId and points are integers
    const userIdInt = Math.floor(Number(userId));
    const pointsInt = Math.floor(Number(points));

    const user = await this.getUser(userIdInt);
    if (!user) return undefined;

    // Calculate new points as integers
    const newPoints = user.points + pointsInt;
    const newLevel = Math.floor(newPoints / 1000) + 1;
    const newProgress = Math.floor((newPoints % 1000) / 10); // 0-100 percentage

    // Update user points
    await db
      .update(users)
      .set({
        points: newPoints,
        level: newLevel,
        progress: newProgress,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userIdInt));
    const [updatedUser] = await db.select().from(users).where(eq(users.id, userIdInt));

    // Record level-up history when the level increases
    if (newLevel > user.level) {
      for (let lvl = user.level + 1; lvl <= newLevel; lvl++) {
        await db.insert(levelHistory).values({ userId: userIdInt, level: lvl });
      }
    }

    // Update the point collector milestone
    const pointMilestone = (
      await db
        .select()
        .from(milestones)
        .where(eq(milestones.category, "point_collector"))
    )[0];

    if (pointMilestone) {
      const [userMilestone] = await db
        .select()
        .from(userMilestones)
        .where(
          and(
            eq(userMilestones.userId, userIdInt),
            eq(userMilestones.milestoneId, pointMilestone.id),
          ),
        );

      if (userMilestone) {
        await db
          .update(userMilestones)
          .set({
            progress: updatedUser.points,
            completed: updatedUser.points >= pointMilestone.target,
            completedAt:
              updatedUser.points >= pointMilestone.target ? new Date() : null,
          })
          .where(eq(userMilestones.id, userMilestone.id));
      }
    }

    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async deleteUser(userId: number): Promise<boolean> {
    try {
      // Delete associated user tasks
      await db.delete(userTasks).where(eq(userTasks.userId, userId));

      // Delete associated user milestones
      await db.delete(userMilestones).where(eq(userMilestones.userId, userId));

      // Delete user's task allocations
      await db
        .delete(dailyTaskAllocation)
        .where(eq(dailyTaskAllocation.userId, userId));

      // Delete user's referrals
      await db
        .delete(referrals)
        .where(
          sql`${referrals.referrerId} = ${userId} OR ${referrals.referredId} = ${userId}`,
        );

      // Delete user's payouts
      await db.delete(payouts).where(eq(payouts.userId, userId));

      // Delete the user
      await db.delete(users).where(eq(users.id, userId));

      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }

  async updateUserRole(
    userId: number,
    role: string,
  ): Promise<User | undefined> {
    await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId));
    const [updatedUser] = await db.select().from(users).where(eq(users.id, userId));

    return updatedUser;
  }

  async updateUserPassword(
    userId: number,
    password: string,
  ): Promise<User | undefined> {
    await db
      .update(users)
      .set({ password, updatedAt: new Date() })
      .where(eq(users.id, userId));
    const [updatedUser] = await db.select().from(users).where(eq(users.id, userId));

    return updatedUser;
  }

  // Task operations
  async getTasks(): Promise<Task[]> {
    return db.select().from(tasks);
  }

  async getTaskById(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getAvailableTasks(userId: number): Promise<Task[]> {
    // Get task IDs that the user has completed
    const completedTaskIds = await this.getCompletedTaskIds(userId);
    const completedSet = new Set(completedTaskIds);

    // Get all active tasks
    const allTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.isActive, true));

    // Filter out completed tasks
    const availableTasks = allTasks.filter(
      (task) => !completedSet.has(task.id),
    );

    return availableTasks;
  }

  async getCompletedTaskIds(userId: number): Promise<number[]> {
    // Efficiently get just the task IDs that the user has completed
    const completedTasks = await db
      .select({ taskId: userTasks.taskId })
      .from(userTasks)
      .where(eq(userTasks.userId, userId));

    return completedTasks.map((ct) => ct.taskId);
  }

  async getCompletedTasks(userId: number): Promise<Task[]> {
    // Get completed task IDs
    const completedTaskIds = await this.getCompletedTaskIds(userId);

    // Get full task details for completed tasks
    return await db
      .select()
      .from(tasks)
      .where(inArray(tasks.id, completedTaskIds));
  }

  async addTask(task: Omit<Task, "id">): Promise<Task> {
    const [taskInsertResult] = await db.insert(tasks).values(task);
    const [newTask] = await db.select().from(tasks).where(eq(tasks.id, (taskInsertResult as any).insertId));
    return newTask!;
  }

  async updateTask(
    taskId: number,
    taskData: Partial<Task>,
  ): Promise<Task | undefined> {
    await db
      .update(tasks)
      .set(taskData)
      .where(eq(tasks.id, taskId));
    const [updatedTask] = await db.select().from(tasks).where(eq(tasks.id, taskId));

    return updatedTask;
  }

  async deleteTask(taskId: number): Promise<boolean> {
    try {
      // Delete all user tasks for this task
      await db.delete(userTasks).where(eq(userTasks.taskId, taskId));

      // Delete all daily task allocations for this task
      await db
        .delete(dailyTaskAllocation)
        .where(eq(dailyTaskAllocation.taskId, taskId));

      // Delete the task
      await db.delete(tasks).where(eq(tasks.id, taskId));

      return true;
    } catch (error) {
      console.error("Error deleting task:", error);
      return false;
    }
  }

  // UserTask operations
  async getUserDailyTaskCount(userId: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completions = await db
      .select()
      .from(userTasks)
      .where(
        and(eq(userTasks.userId, userId), gte(userTasks.completedAt, today)),
      );

    return completions.length;
  }

  async completeTask(userId: number, taskId: number): Promise<UserTask> {
    // Use a transaction to ensure data consistency under high load
    return await db.transaction(async (tx) => {
      const task = await this.getTaskById(taskId);
      if (!task) throw new Error("Task not found");

      const user = await this.getUser(userId);
      if (!user) throw new Error("User not found");

      // Check if already completed - use FOR UPDATE to prevent race conditions
      const existingCompletion = await tx
        .select()
        .from(userTasks)
        .where(and(eq(userTasks.userId, userId), eq(userTasks.taskId, taskId)))
        .for("update");

      if (existingCompletion.length > 0) {
        throw new Error("Task already completed");
      }

      // Mark the daily allocation as completed
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const formattedToday = today.toISOString().split("T")[0];
      await db
        .update(dailyTaskAllocation)
        .set({ isCompleted: true })
        .where(
          and(
            eq(dailyTaskAllocation.userId, userId),
            eq(dailyTaskAllocation.taskId, taskId),
            // Use the safest approach for date comparison that works in all environments
            sql`DATE(${dailyTaskAllocation.allocatedDate}) = ${formattedToday}`,
          ),
        );

      // Create new user task record
      const now = new Date();
      const [utInsertResult] = await db
        .insert(userTasks)
        .values({
          userId,
          taskId,
          completedAt: now,
          pointsEarned: task.points,
          verificationStatus: "pending",
        });
      const [userTask] = await db.select().from(userTasks).where(eq(userTasks.id, (utInsertResult as any).insertId));

      // Update user's daily tasks completed count
      await db
        .update(users)
        .set({
          dailyTasksCompleted: user.dailyTasksCompleted + 1,
          // Use SQL casting to ensure proper date format in both development and production
          lastTaskDate: sql`${formattedToday}`,
          updatedAt: now,
        })
        .where(eq(users.id, userId));

      // Update user points
      await this.updateUserPoints(userId, task.points);

      // Update milestones
      await this.updateMilestones(userId, task);

      return userTask;
    });
  }

  async getRecentTasks(
    userId: number,
    limit: number,
  ): Promise<(UserTask & { task: Task })[]> {
    const recentTasks = await db
      .select({
        userTask: userTasks,
        task: tasks,
      })
      .from(userTasks)
      .innerJoin(tasks, eq(userTasks.taskId, tasks.id))
      .where(eq(userTasks.userId, userId))
      .orderBy(desc(userTasks.completedAt))
      .limit(limit);

    return recentTasks.map(({ userTask, task }) => ({ ...userTask, task }));
  }

  async getAllUserTasks(): Promise<UserTask[]> {
    return db.select().from(userTasks);
  }

  // Milestone operations
  async getMilestones(): Promise<Milestone[]> {
    return db.select().from(milestones);
  }

  async getMilestoneById(id: number): Promise<Milestone | undefined> {
    const [milestone] = await db
      .select()
      .from(milestones)
      .where(eq(milestones.id, id));
    return milestone;
  }

  private async createUserMilestone(
    userId: number,
    milestoneId: number,
  ): Promise<UserMilestone> {
    const [umInsertResult] = await db
      .insert(userMilestones)
      .values({
        userId,
        milestoneId,
        progress: 0,
        completed: false,
        rewardClaimed: false,
      });
    const [userMilestone] = await db.select().from(userMilestones).where(eq(userMilestones.id, (umInsertResult as any).insertId));

    return userMilestone!;
  }

  async getUserMilestones(userId: number): Promise<MilestoneWithProgress[]> {
    const userMilestoneData = await db
      .select({
        milestone: milestones,
        userMilestone: userMilestones,
      })
      .from(userMilestones)
      .innerJoin(milestones, eq(userMilestones.milestoneId, milestones.id))
      .where(eq(userMilestones.userId, userId));

    return userMilestoneData.map(({ milestone, userMilestone }) => ({
      ...milestone,
      progress: userMilestone.progress,
      percentComplete: Math.min(
        100,
        Math.round((userMilestone.progress / milestone.target) * 100),
      ),
    }));
  }

  private async updateMilestones(userId: number, task: Task): Promise<void> {
    // Get all milestones for this user
    const userMilestoneEntries = await db
      .select()
      .from(userMilestones)
      .where(eq(userMilestones.userId, userId));

    for (const userMilestone of userMilestoneEntries) {
      const milestone = await this.getMilestoneById(userMilestone.milestoneId);
      if (!milestone) continue;

      switch (milestone.category) {
        case "social_explorer": {
          // Track tasks completed across different platforms
          const completedPlatformsResult = await db
            .select({
              platform: tasks.platform,
            })
            .from(userTasks)
            .innerJoin(tasks, eq(userTasks.taskId, tasks.id))
            .where(eq(userTasks.userId, userId))
            .groupBy(tasks.platform);

          const completedPlatforms = completedPlatformsResult.length;

          await db
            .update(userMilestones)
            .set({
              progress: completedPlatforms,
              completed: completedPlatforms >= milestone.target,
              completedAt:
                completedPlatforms >= milestone.target ? new Date() : null,
            })
            .where(eq(userMilestones.id, userMilestone.id));
          break;
        }

        case "engagement_master": {
          // Track total completed tasks
          const completedTasksCount = await db
            .select({ count: count() })
            .from(userTasks)
            .where(eq(userTasks.userId, userId));

          const taskCount = completedTasksCount[0].count;

          await db
            .update(userMilestones)
            .set({
              progress: taskCount,
              completed: taskCount >= milestone.target,
              completedAt: taskCount >= milestone.target ? new Date() : null,
            })
            .where(eq(userMilestones.id, userMilestone.id));
          break;
        }

        case "community_builder": {
          // For simplicity, we'll just increment by 1 for each task that's a follow type
          if (task.type === "follow") {
            await db
              .update(userMilestones)
              .set({
                progress: userMilestone.progress + 1,
                completed: userMilestone.progress + 1 >= milestone.target,
                completedAt:
                  userMilestone.progress + 1 >= milestone.target
                    ? new Date()
                    : null,
              })
              .where(eq(userMilestones.id, userMilestone.id));
          }
          break;
        }

        // Point collector is handled in updateUserPoints
      }
    }
  }

  async addMilestone(milestone: Omit<Milestone, "id">): Promise<Milestone> {
    const [msInsertResult] = await db
      .insert(milestones)
      .values(milestone);
    const [newMilestone] = await db.select().from(milestones).where(eq(milestones.id, (msInsertResult as any).insertId));

    // Create user milestone entries for all users
    const allUsers = await this.getAllUsers();
    for (const user of allUsers) {
      await this.createUserMilestone(user.id, newMilestone.id);
    }

    return newMilestone;
  }

  async updateMilestone(
    milestoneId: number,
    milestoneData: Partial<Milestone>,
  ): Promise<Milestone | undefined> {
    await db
      .update(milestones)
      .set(milestoneData)
      .where(eq(milestones.id, milestoneId));
    const [updatedMilestone] = await db.select().from(milestones).where(eq(milestones.id, milestoneId));

    return updatedMilestone;
  }

  async deleteMilestone(milestoneId: number): Promise<boolean> {
    try {
      // Delete all user milestones for this milestone
      await db
        .delete(userMilestones)
        .where(eq(userMilestones.milestoneId, milestoneId));

      // Delete the milestone
      await db.delete(milestones).where(eq(milestones.id, milestoneId));

      return true;
    } catch (error) {
      console.error("Error deleting milestone:", error);
      return false;
    }
  }

  // Dashboard operations
  async getTaskCounts(userId: number): Promise<TaskCount> {
    const available = (await this.getAvailableTasks(userId)).length;
    const completed = (await this.getCompletedTasks(userId)).length;

    return { available, completed };
  }

  async getUserPoints(userId: number): Promise<PointsData> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    // For daily points, calculate points earned in the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const dailyPointsResult = await db
      .select({ sum: sql<number>`SUM(${userTasks.pointsEarned})` })
      .from(userTasks)
      .where(
        and(
          eq(userTasks.userId, userId),
          gte(userTasks.completedAt, oneDayAgo),
        ),
      );

    const dailyPoints = dailyPointsResult[0]?.sum || 0;

    return {
      total: user.points,
      daily: dailyPoints,
    };
  }

  async getTopEarners(limit: number): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.points)).limit(limit);
  }

  async getLeaderboard(options: { period: 'alltime' | 'weekly' | 'monthly'; country?: string; limit?: number; requestingUserId?: number }): Promise<{ entries: LeaderboardEntry[]; userEntry: LeaderboardEntry | null }> {
    const limit = options.limit ?? 50;

    const computeLevel = (pts: number) => Math.floor(pts / 1000) + 1;

    if (options.period === 'alltime') {
      // All-time: sort by cumulative points on users table
      let query = db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatar: users.avatar,
          country: users.country,
          points: users.points,
          streakCount: users.streakCount,
        })
        .from(users)
        .orderBy(desc(users.points))
        .$dynamic();

      if (options.country) {
        query = query.where(eq(users.country, options.country));
      }

      const rows = await query.limit(500);
      const entries: LeaderboardEntry[] = rows.slice(0, limit).map((r, i) => ({
        ...r,
        displayName: r.displayName ?? null,
        avatar: r.avatar ?? null,
        country: r.country ?? null,
        streakCount: r.streakCount ?? 0,
        level: computeLevel(r.points),
        rank: i + 1,
      }));

      let userEntry: LeaderboardEntry | null = null;
      if (options.requestingUserId) {
        const idx = rows.findIndex(r => r.id === options.requestingUserId);
        if (idx >= 0) {
          const r = rows[idx];
          userEntry = { ...r, displayName: r.displayName ?? null, avatar: r.avatar ?? null, country: r.country ?? null, streakCount: r.streakCount ?? 0, level: computeLevel(r.points), rank: idx + 1 };
        } else {
          // User is beyond the fetched window — compute their global rank separately
          const [uRow] = await db.select({
            id: users.id, username: users.username, displayName: users.displayName,
            avatar: users.avatar, country: users.country, points: users.points, streakCount: users.streakCount,
          }).from(users).where(eq(users.id, options.requestingUserId));
          if (uRow) {
            const [rankRow] = await db.select({ rank: sql<string>`COUNT(*) + 1` }).from(users).where(sql`${users.points} > ${uRow.points}`);
            const globalRank = Number(rankRow?.rank ?? rows.length + 1);
            userEntry = { ...uRow, displayName: uRow.displayName ?? null, avatar: uRow.avatar ?? null, country: uRow.country ?? null, streakCount: uRow.streakCount ?? 0, level: computeLevel(uRow.points), rank: globalRank };
          }
        }
      }
      return { entries, userEntry };
    }

    // Weekly / monthly: compute points from BOTH task completions AND classroom completions in the period
    const now = new Date();
    const startDate = new Date(now);
    if (options.period === 'weekly') {
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate.setDate(now.getDate() - 30);
    }

    const countryClause = options.country ? sql`AND u.country = ${options.country}` : sql``;

    type RawRow = {
      id: number;
      username: string;
      displayName: string | null;
      avatar: string | null;
      country: string | null;
      streakCount: number;
      points: string;
    };

    const [rows] = await db.execute(sql`
      SELECT
        u.id,
        u.username,
        u.display_name AS "displayName",
        u.avatar,
        u.country,
        u.streak_count AS "streakCount",
        COALESCE(SUM(p.pts), 0) AS points
      FROM users u
      INNER JOIN (
        SELECT user_id, points_earned AS pts
        FROM user_tasks
        WHERE completed_at >= ${startDate}
        UNION ALL
        SELECT user_id, points_earned AS pts
        FROM classroom_completions
        WHERE completed_at >= ${startDate}
      ) p ON u.id = p.user_id
      ${countryClause}
      GROUP BY u.id, u.username, u.display_name, u.avatar, u.country, u.streak_count
      ORDER BY points DESC
      LIMIT 500
    `) as unknown as [RawRow[], unknown];

    const entries: LeaderboardEntry[] = rows.slice(0, limit).map((r, i) => ({
      id: r.id,
      username: r.username,
      displayName: r.displayName ?? null,
      avatar: r.avatar ?? null,
      country: r.country ?? null,
      points: Number(r.points),
      streakCount: r.streakCount ?? 0,
      level: computeLevel(Number(r.points)),
      rank: i + 1,
    }));

    let userEntry: LeaderboardEntry | null = null;
    if (options.requestingUserId) {
      const idx = rows.findIndex(r => r.id === options.requestingUserId);
      if (idx >= 0) {
        const r = rows[idx];
        const pts = Number(r.points);
        userEntry = { id: r.id, username: r.username, displayName: r.displayName ?? null, avatar: r.avatar ?? null, country: r.country ?? null, points: pts, streakCount: r.streakCount ?? 0, level: computeLevel(pts), rank: idx + 1 };
      } else {
        // User had no activity in this period — look up their base info and give rank = total+1
        const [uArr] = await db.execute(sql`
          SELECT
            u.id, u.username, u.display_name AS "displayName", u.avatar, u.country, u.streak_count AS "streakCount",
            COALESCE((
              SELECT SUM(pts) FROM (
                SELECT points_earned AS pts FROM user_tasks WHERE user_id = ${options.requestingUserId} AND completed_at >= ${startDate}
                UNION ALL
                SELECT points_earned AS pts FROM classroom_completions WHERE user_id = ${options.requestingUserId} AND completed_at >= ${startDate}
              ) ep
            ), 0) AS points
          FROM users u WHERE u.id = ${options.requestingUserId}
        `) as unknown as [RawRow[], unknown];
        if (uArr.length > 0) {
          const uRow = uArr[0];
          const uPts = Number(uRow.points);
          // Compute rank: count rows with higher period_points
          const [rankArr] = await db.execute(sql`
            SELECT COUNT(*) + 1 AS rank FROM (
              SELECT user_id, COALESCE(SUM(pts), 0) AS total_pts FROM (
                SELECT user_id, points_earned AS pts FROM user_tasks WHERE completed_at >= ${startDate}
                UNION ALL
                SELECT user_id, points_earned AS pts FROM classroom_completions WHERE completed_at >= ${startDate}
              ) c GROUP BY user_id
            ) pp WHERE pp.total_pts > ${uPts}
          `) as unknown as [{ rank: string }[], unknown];
          const globalRank = Number(rankArr[0]?.rank ?? rows.length + 1);
          userEntry = { id: uRow.id, username: uRow.username, displayName: uRow.displayName ?? null, avatar: uRow.avatar ?? null, country: uRow.country ?? null, points: uPts, streakCount: uRow.streakCount ?? 0, level: computeLevel(uPts), rank: globalRank };
        }
      }
    }
    return { entries, userEntry };
  }

  // Analytics
  async getTaskCompletionAnalytics(): Promise<any> {
    // Get completions by platform
    const platformCompletions = await db
      .select({
        platform: tasks.platform,
        count: count(),
      })
      .from(userTasks)
      .innerJoin(tasks, eq(userTasks.taskId, tasks.id))
      .groupBy(tasks.platform);

    // Get completions by day (for the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyCompletions = await db
      .select({
        day: sql<string>`DATE(${userTasks.completedAt})`,
        count: count(),
      })
      .from(userTasks)
      .where(gte(userTasks.completedAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${userTasks.completedAt})`)
      .orderBy(sql`DATE(${userTasks.completedAt})`);

    // Convert to a more usable format
    const completionsByDay: Record<string, number> = {};
    dailyCompletions.forEach((day) => {
      completionsByDay[day.day] = day.count;
    });

    // Get completions by type
    const typeCompletions = await db
      .select({
        type: tasks.type,
        count: count(),
      })
      .from(userTasks)
      .innerJoin(tasks, eq(userTasks.taskId, tasks.id))
      .groupBy(tasks.type);

    return {
      completionsByPlatform: Object.fromEntries(
        platformCompletions.map((p) => [p.platform, p.count]),
      ),
      completionsByDay,
      completionsByType: Object.fromEntries(
        typeCompletions.map((t) => [t.type, t.count]),
      ),
      totalCompletions: dailyCompletions.reduce((sum, d) => sum + d.count, 0),
    };
  }

  async getUserActivityAnalytics(): Promise<any> {
    // Get all users
    const allUsers = await this.getAllUsers();

    // Active users in last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    const activeUsersResult = await db
      .select({ userId: userTasks.userId })
      .from(userTasks)
      .where(gte(userTasks.completedAt, sevenDaysAgo))
      .groupBy(userTasks.userId);

    const activeUsers = activeUsersResult.length;

    // User growth (we would need a more sophisticated approach, but for now just count users)
    // In a real app, we would track user signups over time
    const userGrowth: Record<string, number> = {
      [now.toISOString().split("T")[0]]: allUsers.length,
    };

    // Top users by task completions
    const topUsersByCompletions = await db
      .select({
        userId: userTasks.userId,
        completions: count(),
      })
      .from(userTasks)
      .groupBy(userTasks.userId)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Get user details for these top users
    const topUsersWithDetails = await Promise.all(
      topUsersByCompletions.map(async (entry) => {
        const user = await this.getUser(entry.userId);
        return {
          id: entry.userId,
          username: user?.username || "Unknown",
          completions: entry.completions,
        };
      }),
    );

    return {
      totalUsers: allUsers.length,
      activeUsers,
      userGrowth,
      topUsersByCompletions: topUsersWithDetails,
    };
  }

  // Referral operations
  async getReferralStats(
    userId: number,
  ): Promise<{ totalReferrals: number; totalPoints: number }> {
    const referrals = await db
      .select()
      .from(users)
      .where(eq(users.referredBy, userId));

    // Calculate total points earned from referrals (1 point per referral)
    const totalPoints = referrals.length;

    return {
      totalReferrals: referrals.length,
      totalPoints,
    };
  }

  async getReferralHistory(userId: number): Promise<
    Array<{
      id: number;
      referredUsername: string;
      referredAt: Date;
      pointsEarned: number;
      status: string;
    }>
  > {
    const referrals = await db
      .select({
        id: users.id,
        username: users.username,
        createdAt: users.createdAt,
        level: users.level,
      })
      .from(users)
      .where(eq(users.referredBy, userId))
      .orderBy(desc(users.createdAt));

    return referrals.map((referral) => ({
      id: referral.id,
      referredUsername: referral.username,
      referredAt: referral.createdAt,
      pointsEarned: 10, // Standard referral bonus points
      status: referral.level > 1 ? "active" : "new",
    }));
  }

  async addReferral(referrerId: number, referredId: number): Promise<Referral> {
    // Convert to integers to ensure database compatibility
    const referrerIdInt = Math.floor(Number(referrerId));
    const referredIdInt = Math.floor(Number(referredId));

    // First check if users exist
    const referrer = await this.getUser(referrerIdInt);
    if (!referrer) throw new Error("Referrer not found");

    const referred = await this.getUser(referredIdInt);
    if (!referred) throw new Error("Referred user not found");

    // Update the referred user with referrer information
    await db
      .update(users)
      .set({ referredBy: referrerIdInt })
      .where(eq(users.id, referredIdInt));

    // Award points to the referrer (1 point per referral)
    await this.updateUserPoints(referrerIdInt, 1);

    // Create a referral record
    const [refInsert] = await db
      .insert(referrals)
      .values({
        referrerId: referrerIdInt,
        referredId: referredIdInt,
        pointsAwarded: 1,
        isProcessed: true,
        processedAt: new Date(),
      });
    const [referralRecord] = await db.select().from(referrals).where(eq(referrals.id, (refInsert as any).insertId));

    return referralRecord!;
  }

  // Referral reward claim operations
  async getReferralRewardInfo(userId: number): Promise<{
    totalReferrals: number;
    claimableReferrals: number;
    claimableAmount: string;
    eligibleToClaim: boolean;
  }> {
    // Get settings from database
    const settingsResult = await db.select().from(appSettings);
    const settingsMap: Record<string, string> = {};
    settingsResult.forEach(s => { settingsMap[s.key] = s.value; });

    const referralRatePerPerson = parseFloat(settingsMap.referral_rate_per_person || "0.25");
    const minimumReferralsToClaim = parseInt(settingsMap.minimum_referrals_to_claim || "20");

    // Get total number of referrals for this user
    const referralStats = await this.getReferralStats(userId);
    const totalReferrals = referralStats.totalReferrals;

    // Determine the active tier multiplier based on referral count
    const tiers = await db.select().from(referralTiers).orderBy(referralTiers.minReferrals);
    let multiplier = 1.0;
    for (const tier of tiers) {
      const inRange = totalReferrals >= tier.minReferrals &&
        (tier.maxReferrals === null || totalReferrals <= tier.maxReferrals);
      if (inRange) {
        multiplier = parseFloat(tier.multiplier as string);
        break;
      }
    }

    // Get sum of already claimed referrals
    const claims = await db
      .select()
      .from(referralRewardClaims)
      .where(eq(referralRewardClaims.userId, userId));

    const totalClaimedReferrals = claims.reduce(
      (sum, claim) => sum + claim.referralCount,
      0,
    );

    // Calculate claimable referrals and amount using dynamic settings + tier multiplier
    const claimableReferrals = Math.max(
      0,
      totalReferrals - totalClaimedReferrals,
    );
    const claimableAmount = (claimableReferrals * referralRatePerPerson * multiplier).toFixed(2);
    const eligibleToClaim = totalReferrals >= minimumReferralsToClaim && claimableReferrals > 0;

    return {
      totalReferrals,
      claimableReferrals,
      claimableAmount,
      eligibleToClaim,
    };
  }

  async createReferralRewardClaim(
    userId: number,
    referralCount: number,
    amount: string,
  ): Promise<ReferralRewardClaim> {
    const [rrcInsert] = await db
      .insert(referralRewardClaims)
      .values({
        userId,
        referralCount,
        amount,
        status: "pending",
        requestedAt: new Date(),
      });
    const [claim] = await db.select().from(referralRewardClaims).where(eq(referralRewardClaims.id, (rrcInsert as any).insertId));

    return claim!;
  }

  async getReferralRewardClaims(
    userId: number,
  ): Promise<ReferralRewardClaim[]> {
    return db
      .select()
      .from(referralRewardClaims)
      .where(eq(referralRewardClaims.userId, userId))
      .orderBy(desc(referralRewardClaims.requestedAt));
  }

  // Admin operations
  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const [admin] = await db
      .select()
      .from(admins)
      .where(eq(admins.username, username));
    return admin;
  }

  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const [adminInsertResult] = await db.insert(admins).values(admin);
    const [newAdmin] = await db.select().from(admins).where(eq(admins.id, (adminInsertResult as any).insertId));
    return newAdmin;
  }

  async getAllAdmins(): Promise<Admin[]> {
    return db.select().from(admins);
  }

  async updateAdminLastLogin(adminId: number): Promise<Admin | undefined> {
    await db
      .update(admins)
      .set({
        lastLogin: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(admins.id, adminId));
    const [updatedAdmin] = await db.select().from(admins).where(eq(admins.id, adminId));

    return updatedAdmin;
  }

  async updateAdminStatus(
    adminId: number,
    status: string,
  ): Promise<Admin | undefined> {
    await db
      .update(admins)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(admins.id, adminId));
    const [updatedAdmin] = await db.select().from(admins).where(eq(admins.id, adminId));

    return updatedAdmin;
  }

  async updateAdminPassword(
    adminId: number,
    password: string,
  ): Promise<Admin | undefined> {
    await db
      .update(admins)
      .set({
        password,
        updatedAt: new Date(),
      })
      .where(eq(admins.id, adminId));
    const [updatedAdmin] = await db.select().from(admins).where(eq(admins.id, adminId));

    return updatedAdmin;
  }

  async updateAdmin(id: number, adminData: Partial<Admin>): Promise<Admin> {
    await db
      .update(admins)
      .set({ ...adminData, updatedAt: new Date() })
      .where(eq(admins.id, id));
    const [updatedAdmin] = await db.select().from(admins).where(eq(admins.id, id));
    if (!updatedAdmin) throw new Error("Admin not found");
    return updatedAdmin;
  }

  async deleteAdmin(id: number): Promise<void> {
    await db.delete(admins).where(eq(admins.id, id));
  }

  // Method to reset daily tasks (should be called once per day)
  async resetDailyTasks(): Promise<void> {
    // Reset daily tasks completed counter for all users
    await db.update(users).set({
      dailyTasksCompleted: 0,
      updatedAt: new Date(),
    });

    // Mark all daily allocations as expired (could also delete them)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const formattedToday = today.toISOString().split("T")[0];

    await db
      .delete(dailyTaskAllocation)
      .where(
        sql`DATE(${dailyTaskAllocation.allocatedDate}) < DATE(${formattedToday})`,
      );
  }

  // Task Click Tracking
  async recordTaskClick(clickData: InsertTaskClick): Promise<TaskClick> {
    const [tcInsert] = await db
      .insert(taskClicks)
      .values({
        ...clickData,
        clickedAt: new Date(),
      });
    const [taskClick] = await db.select().from(taskClicks).where(eq(taskClicks.id, (tcInsert as any).insertId));

    return taskClick!;
  }

  async getTaskClicks(taskId: number): Promise<TaskClick[]> {
    return db
      .select()
      .from(taskClicks)
      .where(eq(taskClicks.taskId, taskId))
      .orderBy(desc(taskClicks.clickedAt));
  }

  async getTaskClicksCount(taskId: number): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(taskClicks)
      .where(eq(taskClicks.taskId, taskId));

    return result[0].count;
  }

  async getUserTaskClicks(userId: number): Promise<TaskClick[]> {
    return db
      .select()
      .from(taskClicks)
      .where(eq(taskClicks.userId, userId))
      .orderBy(desc(taskClicks.clickedAt));
  }

  async getTaskClickAnalytics(): Promise<
    {
      taskId: number;
      title: string;
      platform: string;
      totalClicks: number;
      uniqueUsers: number;
      conversionRate: number;
    }[]
  > {
    // Get all tasks
    const allTasks = await this.getTasks();

    // For each task, calculate statistics
    return Promise.all(
      allTasks.map(async (task) => {
        // Get clicks for this task
        const clicksResult = await db
          .select({ count: count() })
          .from(taskClicks)
          .where(eq(taskClicks.taskId, task.id));

        const totalClicks = clicksResult[0].count;

        // Get unique users who clicked
        const uniqueUsersResult = await db
          .select({ userId: taskClicks.userId })
          .from(taskClicks)
          .where(eq(taskClicks.taskId, task.id))
          .groupBy(taskClicks.userId);

        const uniqueUsers = uniqueUsersResult.length;

        // Get completed tasks for this task
        const completedResult = await db
          .select({ count: count() })
          .from(userTasks)
          .where(eq(userTasks.taskId, task.id));

        const completedCount = completedResult[0].count;

        // Calculate conversion rate (completed / clicked)
        const conversionRate =
          uniqueUsers > 0
            ? Math.round((completedCount / uniqueUsers) * 100)
            : 0;

        return {
          taskId: task.id,
          title: task.title,
          platform: task.platform || "Unknown",
          totalClicks,
          uniqueUsers,
          conversionRate,
        };
      }),
    );
  }

  // Payout operations
  async createPayout(payoutData: Omit<Payout, "id">): Promise<Payout> {
    const [payoutInsert] = await db.insert(payouts).values(payoutData);
    const result = await db.select().from(payouts).where(eq(payouts.id, (payoutInsert as any).insertId));
    return result[0];
  }

  async getAllPayouts(): Promise<Payout[]> {
    return await db.select().from(payouts).orderBy(desc(payouts.requestedAt));
  }

  async getUserPayouts(userId: number): Promise<Payout[]> {
    return await db
      .select()
      .from(payouts)
      .where(eq(payouts.userId, userId))
      .orderBy(desc(payouts.requestedAt));
  }

  async getPayoutById(id: number): Promise<Payout | undefined> {
    const result = await db.select().from(payouts).where(eq(payouts.id, id));

    return result[0];
  }

  async updatePayoutStatus(
    id: number,
    status: string,
    processedBy?: number,
  ): Promise<Payout | undefined> {
    const updateData: any = {
      status,
      processedAt: new Date(),
    };

    if (processedBy) {
      updateData.processedBy = processedBy;
    }

    await db
      .update(payouts)
      .set(updateData)
      .where(eq(payouts.id, id));
    const [payoutResult] = await db.select().from(payouts).where(eq(payouts.id, id));

    return payoutResult;
  }

  // Password Reset Token operations
  async createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<void> {
    await db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
      used: false
    });
  }

  async getPasswordResetToken(token: string): Promise<{ userId: number; expiresAt: Date; used: boolean } | undefined> {
    const [result] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));

    if (!result) return undefined;

    return {
      userId: result.userId,
      expiresAt: result.expiresAt,
      used: result.used
    };
  }

  async markTokenAsUsed(token: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [notifInsertResult] = await db.insert(notifications).values(notification);
    const [result] = await db.select().from(notifications).where(eq(notifications.id, (notifInsertResult as any).insertId));
    return result!;
  }

  async getUserNotifications(userId: number, limit: number = 50): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.adminOnly, false)))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getAdminNotifications(limit: number = 50): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.adminOnly, true))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async markNotificationAsRead(notificationId: number): Promise<Notification | undefined> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId));
    const [result] = await db.select().from(notifications).where(eq(notifications.id, notificationId));
    return result;
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.adminOnly, false)));
  }

  async markAllAdminNotificationsAsRead(): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.adminOnly, true));
  }

  async deleteNotification(notificationId: number): Promise<boolean> {
    const [deleteResult] = await db
      .delete(notifications)
      .where(eq(notifications.id, notificationId));
    return ((deleteResult as any).affectedRows ?? 0) > 0;
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.adminOnly, false),
        eq(notifications.isRead, false)
      ));
    return result?.count || 0;
  }

  async getUnreadAdminNotificationCount(): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.adminOnly, true),
        eq(notifications.isRead, false)
      ));
    return result?.count || 0;
  }

  // Classroom operations
  async getClassroomVideos(publishedOnly = false): Promise<ClassroomVideo[]> {
    const query = db.select().from(classroomVideos);
    if (publishedOnly) {
      return await query.where(eq(classroomVideos.isPublished, true)).orderBy(classroomVideos.displayOrder, classroomVideos.createdAt);
    }
    return await query.orderBy(classroomVideos.displayOrder, classroomVideos.createdAt);
  }

  async getClassroomVideo(id: number): Promise<ClassroomVideo | undefined> {
    const [video] = await db.select().from(classroomVideos).where(eq(classroomVideos.id, id));
    return video;
  }

  async createClassroomVideo(data: InsertClassroomVideo): Promise<ClassroomVideo> {
    const [cvInsert] = await db.insert(classroomVideos).values(data);
    const [video] = await db.select().from(classroomVideos).where(eq(classroomVideos.id, (cvInsert as any).insertId));
    return video;
  }

  async updateClassroomVideo(id: number, data: Partial<InsertClassroomVideo>): Promise<ClassroomVideo | undefined> {
    await db.update(classroomVideos).set(data).where(eq(classroomVideos.id, id));
    const [video] = await db.select().from(classroomVideos).where(eq(classroomVideos.id, id));
    return video;
  }

  async deleteClassroomVideo(id: number): Promise<boolean> {
    const deleteResult = await db.delete(classroomVideos).where(eq(classroomVideos.id, id));
    const result = (deleteResult as any)[0]?.affectedRows > 0 ? [{ id }] : [];
    return result.length > 0;
  }

  async getClassroomCompletion(userId: number, videoId: number): Promise<ClassroomCompletion | undefined> {
    const [completion] = await db
      .select()
      .from(classroomCompletions)
      .where(and(eq(classroomCompletions.userId, userId), eq(classroomCompletions.videoId, videoId)));
    return completion;
  }

  async createClassroomCompletion(data: InsertClassroomCompletion): Promise<ClassroomCompletion> {
    const [ccInsert] = await db.insert(classroomCompletions).values(data);
    const [completion] = await db.select().from(classroomCompletions).where(eq(classroomCompletions.id, (ccInsert as any).insertId));
    return completion;
  }

  async getUserClassroomCompletions(userId: number): Promise<ClassroomCompletion[]> {
    return await db
      .select()
      .from(classroomCompletions)
      .where(eq(classroomCompletions.userId, userId));
  }

  // ─── Scheduler operations ───────────────────────────────────────────────────

  async getScheduledTasks(): Promise<Task[]> {
    const now = new Date();
    return await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.isActive, false),
          sql`${tasks.scheduledPublishAt} IS NOT NULL AND ${tasks.scheduledPublishAt} <= ${now}`
        )
      );
  }

  async getScheduledClassroomVideos(): Promise<ClassroomVideo[]> {
    const now = new Date();
    return await db
      .select()
      .from(classroomVideos)
      .where(
        and(
          eq(classroomVideos.isPublished, false),
          sql`${classroomVideos.scheduledPublishAt} IS NOT NULL AND ${classroomVideos.scheduledPublishAt} <= ${now}`
        )
      );
  }

  // ─── Streak operations ─────────────────────────────────────────────────────

  async updateLoginStreak(userId: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return undefined;

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const lastDate = user.lastLoginDate as string | null;

    if (lastDate === today) {
      // Already checked in today — no update needed
      return user;
    }

    let newStreak = 1;
    if (lastDate) {
      const last = new Date(lastDate);
      const now = new Date(today);
      const diffDays = Math.round((now.getTime() - last.getTime()) / 86400000);
      if (diffDays === 1) {
        newStreak = (user.streakCount || 0) + 1;
      }
      // diffDays > 1 → streak broken, reset to 1
    }

    // Update streak count + login date first
    await db.update(users).set({ streakCount: newStreak, lastLoginDate: today }).where(eq(users.id, userId));

    // Check streak milestone bonuses from settings and award through updateUserPoints (keeps level/progress consistent)
    try {
      const settings = await this.getStreakSettings();
      const milestone = settings.milestones.find(m => m.streak === newStreak);
      if (milestone && milestone.bonusPoints > 0) {
        await this.updateUserPoints(userId, milestone.bonusPoints);
      }
    } catch { /* ignore settings errors */ }

    const [updated] = await db.select().from(users).where(eq(users.id, userId));
    return updated;
  }

  async getStreakSettings(): Promise<{ milestones: Array<{ streak: number; bonusPoints: number }> }> {
    const defaultSettings = { milestones: [{ streak: 7, bonusPoints: 50 }, { streak: 30, bonusPoints: 200 }, { streak: 100, bonusPoints: 500 }] };
    const [row] = await db.select().from(appSettings).where(eq(appSettings.key, "streak_settings"));
    if (!row?.value) return defaultSettings;
    try { return JSON.parse(row.value); } catch { return defaultSettings; }
  }

  async saveStreakSettings(settings: { milestones: Array<{ streak: number; bonusPoints: number }> }): Promise<void> {
    const value = JSON.stringify(settings);
    const [existing] = await db.select().from(appSettings).where(eq(appSettings.key, "streak_settings"));
    if (existing) {
      await db.update(appSettings).set({ value }).where(eq(appSettings.key, "streak_settings"));
    } else {
      await db.insert(appSettings).values({ key: "streak_settings", value });
    }
  }

  // ─── Badge operations ──────────────────────────────────────────────────────

  async getAllBadges(): Promise<Badge[]> {
    return await db.select().from(badges).orderBy(badges.id);
  }

  async getBadgeByKey(key: string): Promise<Badge | undefined> {
    const [badge] = await db.select().from(badges).where(eq(badges.key, key));
    return badge;
  }

  async createBadge(data: InsertBadge): Promise<Badge> {
    const [badgeInsert] = await db.insert(badges).values(data);
    const [badge] = await db.select().from(badges).where(eq(badges.id, (badgeInsert as any).insertId));
    return badge;
  }

  async updateBadge(id: number, data: Partial<InsertBadge>): Promise<Badge | undefined> {
    await db.update(badges).set(data).where(eq(badges.id, id));
    const [badge] = await db.select().from(badges).where(eq(badges.id, id));
    return badge;
  }

  async deleteBadge(id: number): Promise<boolean> {
    const badgeDeleteResult = await db.delete(badges).where(eq(badges.id, id));
    const result = (badgeDeleteResult as any)[0]?.affectedRows > 0 ? [{ id }] : [];
    return result.length > 0;
  }

  async getUserBadges(userId: number): Promise<(UserBadge & { badge: Badge })[]> {
    const rows = await db
      .select({
        id: userBadges.id,
        userId: userBadges.userId,
        badgeKey: userBadges.badgeKey,
        earnedAt: userBadges.earnedAt,
        badge: badges,
      })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeKey, badges.key))
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.earnedAt));
    return rows.map((r) => ({ ...r, badge: r.badge }));
  }

  async awardBadge(userId: number, badgeKey: string): Promise<UserBadge | null> {
    try {
      const earnedAt = new Date();
      const [result] = await db
        .insert(userBadges)
        .values({ userId, badgeKey, earnedAt });

      const [awarded] = await db
        .select()
        .from(userBadges)
        .where(eq(userBadges.id, result.insertId));

      return awarded || null;
    } catch {
      return null;
    }
  }

  async checkAndAwardBadges(userId: number): Promise<string[]> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return [];

    const allBadges = await this.getAllBadges();
    const earnedKeys = new Set(
      (await db.select({ badgeKey: userBadges.badgeKey }).from(userBadges).where(eq(userBadges.userId, userId))).map((r) => r.badgeKey)
    );

    // Get stats we need for badge conditions
    const [taskCountRow] = await db
      .select({ cnt: count() })
      .from(userTasks)
      .where(eq(userTasks.userId, userId));
    const completedTasks = Number(taskCountRow?.cnt || 0);

    const [referralCountRow] = await db
      .select({ cnt: count() })
      .from(referrals)
      .where(eq(referrals.referrerId, userId));
    const totalReferrals = Number(referralCountRow?.cnt || 0);

    const [classroomCountRow] = await db
      .select({ cnt: count() })
      .from(classroomCompletions)
      .where(eq(classroomCompletions.userId, userId));
    const classroomCompleted = Number(classroomCountRow?.cnt || 0);

    const currentStreak = user.streakCount || 0;

    const newlyAwarded: string[] = [];
    for (const badge of allBadges) {
      if (earnedKeys.has(badge.key)) continue;
      const { type, threshold } = badge.condition;
      let qualifies = false;
      if (type === "tasks_completed") qualifies = completedTasks >= threshold;
      else if (type === "login_streak") qualifies = currentStreak >= threshold;
      else if (type === "referrals") qualifies = totalReferrals >= threshold;
      else if (type === "classroom_videos") qualifies = classroomCompleted >= threshold;
      else if (type === "points") qualifies = (user.points || 0) >= threshold;
      else if (type === "level") qualifies = (user.level || 1) >= threshold;

      if (qualifies) {
        const awarded = await this.awardBadge(userId, badge.key);
        if (awarded) {
          newlyAwarded.push(badge.key);
          // Award bonus points through updateUserPoints to keep level/progress consistent
          if (badge.pointsBonus > 0) {
            await this.updateUserPoints(userId, badge.pointsBonus);
          }
        }
      }
    }

    return newlyAwarded;
  }

  // ─── Public profile ────────────────────────────────────────────────────────

  async getPublicProfile(username: string): Promise<{ user: User; badges: (UserBadge & { badge: Badge })[] } | null> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user || !user.isPublic) return null;

    const earnedBadges = await this.getUserBadges(user.id);
    return { user, badges: earnedBadges };
  }

  // ─── Notification preference operations ───────────────────────────────────

  async getUserNotificationPreferences(userId: number): Promise<Record<string, boolean>> {
    const [user] = await db.select({ notificationPreferences: users.notificationPreferences }).from(users).where(eq(users.id, userId));
    return (user?.notificationPreferences as Record<string, boolean>) || {};
  }

  async updateUserNotificationPreferences(userId: number, prefs: Record<string, boolean>): Promise<User | undefined> {
    await db
      .update(users)
      .set({ notificationPreferences: prefs, updatedAt: new Date() })
      .where(eq(users.id, userId));
    const [updated] = await db.select().from(users).where(eq(users.id, userId));
    return updated;
  }

  // ─── Referral tier operations ──────────────────────────────────────────────

  async getReferralTiers(): Promise<ReferralTier[]> {
    return await db.select().from(referralTiers).orderBy(referralTiers.minReferrals);
  }

  async getReferralTier(id: number): Promise<ReferralTier | undefined> {
    const [tier] = await db.select().from(referralTiers).where(eq(referralTiers.id, id));
    return tier;
  }

  async createReferralTier(data: InsertReferralTier): Promise<ReferralTier> {
    const [rtInsert] = await db.insert(referralTiers).values(data);
    const [tier] = await db.select().from(referralTiers).where(eq(referralTiers.id, (rtInsert as any).insertId));
    return tier;
  }

  async updateReferralTier(id: number, data: Partial<InsertReferralTier>): Promise<ReferralTier | undefined> {
    await db.update(referralTiers).set(data).where(eq(referralTiers.id, id));
    const [tier] = await db.select().from(referralTiers).where(eq(referralTiers.id, id));
    return tier;
  }

  async deleteReferralTier(id: number): Promise<boolean> {
    const rtDeleteResult = await db.delete(referralTiers).where(eq(referralTiers.id, id));
    const result = (rtDeleteResult as any)[0]?.affectedRows > 0 ? [{ id }] : [];
    return result.length > 0;
  }

  async getUserReferralTier(userId: number): Promise<{ tier: ReferralTier | null; nextTier: ReferralTier | null; totalReferrals: number }> {
    const referralStats = await this.getReferralStats(userId);
    const totalReferrals = referralStats.totalReferrals;

    const tiers = await db.select().from(referralTiers).orderBy(referralTiers.minReferrals);

    let currentTier: ReferralTier | null = null;
    let nextTier: ReferralTier | null = null;

    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      const inRange = totalReferrals >= t.minReferrals &&
        (t.maxReferrals === null || totalReferrals <= t.maxReferrals);
      if (inRange) {
        currentTier = t;
        nextTier = tiers[i + 1] ?? null;
        break;
      }
    }

    // If no tier matched (e.g. below first tier min), set next to first tier
    if (!currentTier && tiers.length > 0) {
      nextTier = tiers[0];
    }

    return { tier: currentTier, nextTier, totalReferrals };
  }

  // ===== Marketplace operations =====

  async createListing(data: InsertPointListing): Promise<PointListing> {
    const [plInsert] = await db.insert(pointListings).values(data);
    const [listing] = await db.select().from(pointListings).where(eq(pointListings.id, (plInsert as any).insertId));
    return listing;
  }

  async getListings(): Promise<PointListing[]> {
    return db.select().from(pointListings).orderBy(desc(pointListings.createdAt));
  }

  async getOpenListingsBySeller(sellerId: number): Promise<PointListing[]> {
    return db
      .select()
      .from(pointListings)
      .where(and(eq(pointListings.sellerId, sellerId), eq(pointListings.status, "open")));
  }

  async getListingById(id: number): Promise<PointListing | undefined> {
    const [listing] = await db.select().from(pointListings).where(eq(pointListings.id, id));
    return listing;
  }

  async updateListing(id: number, data: Partial<PointListing>): Promise<PointListing | undefined> {
    await db.update(pointListings).set(data).where(eq(pointListings.id, id));
    const [listing] = await db.select().from(pointListings).where(eq(pointListings.id, id));
    return listing;
  }

  async deleteListing(id: number): Promise<boolean> {
    const plDeleteResult = await db.delete(pointListings).where(eq(pointListings.id, id));
    const result = (plDeleteResult as any)[0]?.affectedRows > 0 ? [{ id }] : [];
    return result.length > 0;
  }

  async sellListing(listingId: number, buyerId: number): Promise<PointListing> {
    await db.update(pointListings)
      .set({ status: "sold", buyerId, soldAt: new Date() })
      .where(eq(pointListings.id, listingId));
    const [listing] = await db.select().from(pointListings).where(eq(pointListings.id, listingId));
    return listing;
  }

  async createListingComment(data: InsertListingComment): Promise<ListingComment> {
    const [lcInsert] = await db.insert(listingComments).values(data);
    const [comment] = await db.select().from(listingComments).where(eq(listingComments.id, (lcInsert as any).insertId));
    return comment;
  }

  async getListingComments(listingId: number): Promise<ListingComment[]> {
    return db.select().from(listingComments).where(eq(listingComments.listingId, listingId)).orderBy(listingComments.createdAt);
  }

  async getListingComment(id: number): Promise<ListingComment | undefined> {
    const [comment] = await db.select().from(listingComments).where(eq(listingComments.id, id));
    return comment;
  }

  async deleteListingComment(id: number): Promise<boolean> {
    const lcDeleteResult = await db.delete(listingComments).where(eq(listingComments.id, id));
    const result = (lcDeleteResult as any)[0]?.affectedRows > 0 ? [{ id }] : [];
    return result.length > 0;
  }

  // Tools operations
  async createQrEmailLead(email: string, originalUrl: string): Promise<void> {
    await db.insert(qrEmailLeads).values({ email, originalUrl });
  }

  async getQrEmailLeads(): Promise<QrEmailLead[]> {
    return db.select().from(qrEmailLeads).orderBy(desc(qrEmailLeads.createdAt));
  }

  async createShortenedUrl(originalUrl: string, shortCode: string): Promise<ShortenedUrl> {
    const [suInsert] = await db.insert(shortenedUrls).values({ shortCode, originalUrl });
    const [row] = await db.select().from(shortenedUrls).where(eq(shortenedUrls.id, (suInsert as any).insertId));
    return row;
  }

  async getShortenedUrl(shortCode: string): Promise<ShortenedUrl | undefined> {
    const [row] = await db.select().from(shortenedUrls).where(eq(shortenedUrls.shortCode, shortCode));
    return row;
  }

  async incrementShortenedUrlClicks(shortCode: string): Promise<void> {
    await db.update(shortenedUrls)
      .set({ clicks: sql`${shortenedUrls.clicks} + 1` })
      .where(eq(shortenedUrls.shortCode, shortCode));
  }

  async getAllShortenedUrls(): Promise<ShortenedUrl[]> {
    return db.select().from(shortenedUrls).orderBy(desc(shortenedUrls.createdAt));
  }

  async getAllAdPlacements(): Promise<AdPlacement[]> {
    return db.select().from(adPlacements).orderBy(desc(adPlacements.createdAt));
  }

  async getActiveAdPlacements(): Promise<AdPlacement[]> {
    return db.select().from(adPlacements).where(eq(adPlacements.isActive, true));
  }

  async createAdPlacement(data: InsertAdPlacement): Promise<AdPlacement> {
    const [apInsert] = await db.insert(adPlacements).values(data);
    const [row] = await db.select().from(adPlacements).where(eq(adPlacements.id, (apInsert as any).insertId));
    return row;
  }

  async updateAdPlacement(id: number, data: Partial<InsertAdPlacement>): Promise<AdPlacement | undefined> {
    await db.update(adPlacements).set(data).where(eq(adPlacements.id, id));
    const [row] = await db.select().from(adPlacements).where(eq(adPlacements.id, id));
    return row;
  }

  async deleteAdPlacement(id: number): Promise<boolean> {
    const apDeleteResult = await db.delete(adPlacements).where(eq(adPlacements.id, id));
    const result = (apDeleteResult as any)[0]?.affectedRows > 0 ? [{ id }] : [];
    return result.length > 0;
  }

  // ─── Level history ─────────────────────────────────────────────────────────

  async addLevelHistoryEntry(userId: number, level: number): Promise<void> {
    await db.insert(levelHistory).values({ userId, level });
  }

  async getUserLevelHistory(userId: number): Promise<import("@shared/schema.mysql").LevelHistory[]> {
    return db
      .select()
      .from(levelHistory)
      .where(eq(levelHistory.userId, userId))
      .orderBy(levelHistory.reachedAt);
  }

  // ─── Profile links ──────────────────────────────────────────────────────────

  async getUserProfileLinks(userId: number): Promise<ProfileLink[]> {
    return db.select().from(profileLinks).where(eq(profileLinks.userId, userId)).orderBy(profileLinks.displayOrder);
  }

  async getPublicProfileLinks(userId: number): Promise<ProfileLink[]> {
    return db.select().from(profileLinks)
      .where(and(eq(profileLinks.userId, userId), eq(profileLinks.isActive, true)))
      .orderBy(profileLinks.displayOrder);
  }

  async createProfileLink(userId: number, data: InsertProfileLink): Promise<ProfileLink> {
    const [plinkInsert] = await db.insert(profileLinks).values({ ...data, userId });
    const [link] = await db.select().from(profileLinks).where(eq(profileLinks.id, (plinkInsert as any).insertId));
    return link;
  }

  async updateProfileLink(id: number, userId: number, data: Partial<InsertProfileLink>): Promise<ProfileLink | undefined> {
    await db.update(profileLinks).set(data).where(and(eq(profileLinks.id, id), eq(profileLinks.userId, userId)));
    const [link] = await db.select().from(profileLinks).where(eq(profileLinks.id, id));
    return link;
  }

  async deleteProfileLink(id: number, userId: number): Promise<boolean> {
    const plinkDeleteResult = await db.delete(profileLinks).where(and(eq(profileLinks.id, id), eq(profileLinks.userId, userId)));
    const result = (plinkDeleteResult as any)[0]?.affectedRows > 0 ? [{ id }] : [];
    return result.length > 0;
  }
}
