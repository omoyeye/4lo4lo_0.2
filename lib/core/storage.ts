import {
  users,
  tasks,
  userTasks,
  milestones,
  userMilestones,
  referrals,
  admins,
  taskClicks,
  payouts,
  passwordResetTokens,
  type User,
  type InsertUser,
  type Task,
  type UserTask,
  type Milestone,
  type UserMilestone,
  type MilestoneWithProgress,
  type TaskCount,
  type PointsData,
  type Referral,
  type ReferralRewardClaim,
  type Payout,
  type Admin,
  type InsertAdmin,
  type TaskClick,
  type InsertTaskClick,
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
} from "@shared/schema.mysql";

// Session store imports removed as we use NextAuth now

export interface LeaderboardEntry {
  id: number;
  username: string;
  displayName: string | null;
  avatar: string | null;
  country: string | null;
  points: number;
  streakCount: number;
  level: number;
  rank: number;
}

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByReferralCode(referralCode: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(userId: number, userData: Partial<User>): Promise<User | undefined>;
  updateUserPoints(userId: number, points: number): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  deleteUser(userId: number): Promise<boolean>;
  updateUserRole(userId: number, role: string): Promise<User | undefined>;
  updateUserPassword(userId: number, password: string): Promise<User | undefined>;

  // Task operations
  getTasks(): Promise<Task[]>;
  getTaskById(id: number): Promise<Task | undefined>;
  getAvailableTasks(userId: number): Promise<Task[]>;
  getCompletedTasks(userId: number): Promise<Task[]>;
  getCompletedTaskIds(userId: number): Promise<number[]>;
  getUserDailyTaskCount(userId: number): Promise<number>;
  resetDailyTasks(): Promise<void>;
  addTask(task: Omit<Task, "id">): Promise<Task>;
  updateTask(taskId: number, taskData: Partial<Task>): Promise<Task | undefined>;
  deleteTask(taskId: number): Promise<boolean>;

  // UserTask operations
  completeTask(userId: number, taskId: number): Promise<UserTask>;
  getRecentTasks(userId: number, limit: number): Promise<(UserTask & { task: Task })[]>;
  getAllUserTasks(): Promise<UserTask[]>;

  // Milestone operations
  getMilestones(): Promise<Milestone[]>;
  getMilestoneById(id: number): Promise<Milestone | undefined>;
  getUserMilestones(userId: number): Promise<MilestoneWithProgress[]>;
  addMilestone(milestone: Omit<Milestone, "id">): Promise<Milestone>;
  updateMilestone(milestoneId: number, milestoneData: Partial<Milestone>): Promise<Milestone | undefined>;
  deleteMilestone(milestoneId: number): Promise<boolean>;

  // Dashboard operations
  getTaskCounts(userId: number): Promise<TaskCount>;
  getUserPoints(userId: number): Promise<PointsData>;
  getTopEarners(limit: number): Promise<User[]>;
  getLeaderboard(options: { period: 'alltime' | 'weekly' | 'monthly'; country?: string; limit?: number; requestingUserId?: number }): Promise<{ entries: LeaderboardEntry[]; userEntry: LeaderboardEntry | null }>;

  // Referral operations
  getReferralStats(userId: number): Promise<{ totalReferrals: number; totalPoints: number }>;
  addReferral(referrerId: number, referredId: number): Promise<Referral>;
  getReferralHistory(userId: number): Promise<Array<{
    id: number;
    referredUsername: string;
    referredAt: Date;
    pointsEarned: number;
    status: string
  }>>;

  // Referral reward claim operations
  getReferralRewardInfo(userId: number): Promise<{
    totalReferrals: number;
    claimableReferrals: number;
    claimableAmount: string;
    eligibleToClaim: boolean;
  }>;
  createReferralRewardClaim(userId: number, referralCount: number, amount: string): Promise<ReferralRewardClaim>;
  getReferralRewardClaims(userId: number): Promise<ReferralRewardClaim[]>;

  // Payout operations
  createPayout(payout: Omit<Payout, "id">): Promise<Payout>;
  getAllPayouts(): Promise<Payout[]>;
  getUserPayouts(userId: number): Promise<Payout[]>;
  getPayoutById(id: number): Promise<Payout | undefined>;
  updatePayoutStatus(id: number, status: string, processedBy?: number): Promise<Payout | undefined>;

  // Admin operations
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  getAllAdmins(): Promise<Admin[]>;
  updateAdminLastLogin(adminId: number): Promise<Admin | undefined>;
  updateAdminStatus(adminId: number, status: string): Promise<Admin | undefined>;
  updateAdminPassword(adminId: number, password: string): Promise<Admin | undefined>;
  updateAdmin(id: number, adminData: Partial<Admin>): Promise<Admin>;
  deleteAdmin(id: number): Promise<void>;

  // Task Click Tracking
  recordTaskClick(clickData: InsertTaskClick): Promise<TaskClick>;
  getTaskClicks(taskId: number): Promise<TaskClick[]>;
  getTaskClicksCount(taskId: number): Promise<number>;
  getUserTaskClicks(userId: number): Promise<TaskClick[]>;
  getTaskClickAnalytics(): Promise<{ taskId: number; title: string; platform: string; totalClicks: number; uniqueUsers: number; conversionRate: number }[]>;

  // Password Reset Token operations
  createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<void>;
  getPasswordResetToken(token: string): Promise<{ userId: number; expiresAt: Date; used: boolean } | undefined>;
  markTokenAsUsed(token: string): Promise<void>;
  getUserByEmail(email: string): Promise<User | undefined>;

  // Analytics
  getTaskCompletionAnalytics(): Promise<any>; // Adjust type as needed
  getUserActivityAnalytics(): Promise<any>; // Adjust type as needed

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number, limit?: number): Promise<Notification[]>;
  getAdminNotifications(limit?: number): Promise<Notification[]>;
  markNotificationAsRead(notificationId: number): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: number): Promise<void>;
  markAllAdminNotificationsAsRead(): Promise<void>;
  deleteNotification(notificationId: number): Promise<boolean>;
  getUnreadNotificationCount(userId: number): Promise<number>;
  getUnreadAdminNotificationCount(): Promise<number>;

  // Classroom operations
  getClassroomVideos(publishedOnly?: boolean): Promise<ClassroomVideo[]>;
  getClassroomVideo(id: number): Promise<ClassroomVideo | undefined>;
  createClassroomVideo(data: InsertClassroomVideo): Promise<ClassroomVideo>;
  updateClassroomVideo(id: number, data: Partial<InsertClassroomVideo>): Promise<ClassroomVideo | undefined>;
  deleteClassroomVideo(id: number): Promise<boolean>;
  getClassroomCompletion(userId: number, videoId: number): Promise<ClassroomCompletion | undefined>;
  createClassroomCompletion(data: InsertClassroomCompletion): Promise<ClassroomCompletion>;
  getUserClassroomCompletions(userId: number): Promise<ClassroomCompletion[]>;

  // Scheduler operations
  getScheduledTasks(): Promise<Task[]>;
  getScheduledClassroomVideos(): Promise<ClassroomVideo[]>;

  // Streak operations
  updateLoginStreak(userId: number): Promise<User | undefined>;
  getStreakSettings(): Promise<{ milestones: Array<{ streak: number; bonusPoints: number }> }>;
  saveStreakSettings(settings: { milestones: Array<{ streak: number; bonusPoints: number }> }): Promise<void>;

  // Badge operations
  getAllBadges(): Promise<Badge[]>;
  getBadgeByKey(key: string): Promise<Badge | undefined>;
  createBadge(data: InsertBadge): Promise<Badge>;
  updateBadge(id: number, data: Partial<InsertBadge>): Promise<Badge | undefined>;
  deleteBadge(id: number): Promise<boolean>;
  getUserBadges(userId: number): Promise<(UserBadge & { badge: Badge })[]>;
  awardBadge(userId: number, badgeKey: string): Promise<UserBadge | null>;
  checkAndAwardBadges(userId: number): Promise<string[]>;

  // Public profile
  getPublicProfile(username: string): Promise<{ user: User; badges: (UserBadge & { badge: Badge })[] } | null>;

  // Level history
  addLevelHistoryEntry(userId: number, level: number): Promise<void>;
  getUserLevelHistory(userId: number): Promise<import("@shared/schema.mysql").LevelHistory[]>;

  // Notification preference operations
  getUserNotificationPreferences(userId: number): Promise<Record<string, boolean>>;
  updateUserNotificationPreferences(userId: number, prefs: Record<string, boolean>): Promise<User | undefined>;

  // Referral tier operations
  getReferralTiers(): Promise<import("@shared/schema.mysql").ReferralTier[]>;
  getReferralTier(id: number): Promise<import("@shared/schema.mysql").ReferralTier | undefined>;
  createReferralTier(data: import("@shared/schema.mysql").InsertReferralTier): Promise<import("@shared/schema.mysql").ReferralTier>;
  updateReferralTier(id: number, data: Partial<import("@shared/schema.mysql").InsertReferralTier>): Promise<import("@shared/schema.mysql").ReferralTier | undefined>;
  deleteReferralTier(id: number): Promise<boolean>;
  getUserReferralTier(userId: number): Promise<{ tier: import("@shared/schema.mysql").ReferralTier | null; nextTier: import("@shared/schema.mysql").ReferralTier | null; totalReferrals: number }>;

  // Marketplace operations
  createListing(data: InsertPointListing): Promise<PointListing>;
  getListings(): Promise<PointListing[]>;
  getOpenListingsBySeller(sellerId: number): Promise<PointListing[]>;
  getListingById(id: number): Promise<PointListing | undefined>;
  updateListing(id: number, data: Partial<PointListing>): Promise<PointListing | undefined>;
  deleteListing(id: number): Promise<boolean>;
  sellListing(listingId: number, buyerId: number): Promise<PointListing>;
  createListingComment(data: InsertListingComment): Promise<ListingComment>;
  getListingComments(listingId: number): Promise<ListingComment[]>;
  getListingComment(id: number): Promise<ListingComment | undefined>;
  deleteListingComment(id: number): Promise<boolean>;

  // Profile links
  getUserProfileLinks(userId: number): Promise<import("@shared/schema.mysql").ProfileLink[]>;
  getPublicProfileLinks(userId: number): Promise<import("@shared/schema.mysql").ProfileLink[]>;
  createProfileLink(userId: number, data: import("@shared/schema.mysql").InsertProfileLink): Promise<import("@shared/schema.mysql").ProfileLink>;
  updateProfileLink(id: number, userId: number, data: Partial<import("@shared/schema.mysql").InsertProfileLink>): Promise<import("@shared/schema.mysql").ProfileLink | undefined>;
  deleteProfileLink(id: number, userId: number): Promise<boolean>;

  // Tools operations
  createQrEmailLead(email: string, originalUrl: string): Promise<void>;
  getQrEmailLeads(): Promise<import("@shared/schema.mysql").QrEmailLead[]>;
  createShortenedUrl(originalUrl: string, shortCode: string): Promise<import("@shared/schema.mysql").ShortenedUrl>;
  getShortenedUrl(shortCode: string): Promise<import("@shared/schema.mysql").ShortenedUrl | undefined>;
  incrementShortenedUrlClicks(shortCode: string): Promise<void>;
  getAllShortenedUrls(): Promise<import("@shared/schema.mysql").ShortenedUrl[]>;
  getAllAdPlacements(): Promise<import("@shared/schema.mysql").AdPlacement[]>;
  getActiveAdPlacements(): Promise<import("@shared/schema.mysql").AdPlacement[]>;
  createAdPlacement(data: import("@shared/schema.mysql").InsertAdPlacement): Promise<import("@shared/schema.mysql").AdPlacement>;
  updateAdPlacement(id: number, data: Partial<import("@shared/schema.mysql").InsertAdPlacement>): Promise<import("@shared/schema.mysql").AdPlacement | undefined>;
  deleteAdPlacement(id: number): Promise<boolean>;

  // sessionStore: any; // Removed
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tasks: Map<number, Task>;
  private userTasks: Map<number, UserTask>;
  private milestones: Map<number, Milestone>;
  private userMilestones: Map<number, UserMilestone>;
  private taskClicks: Map<number, TaskClick>;
  private admins: Map<number, Admin>;

  private userId: number;
  private taskId: number;
  private userTaskId: number;
  private milestoneId: number;
  private userMilestoneId: number;
  private taskClickId: number;

  // Analytics data
  private taskCompletionsByPlatform: Map<string, number>;
  private userActivityByDate: Map<string, number>;

  // public sessionStore: any; // Removed

  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.userTasks = new Map();
    this.milestones = new Map();
    this.userMilestones = new Map();
    this.taskClicks = new Map();
    this.admins = new Map();
    this.taskCompletionsByPlatform = new Map();
    this.userActivityByDate = new Map();

    this.userId = 1;
    this.taskId = 1;
    this.userTaskId = 1;
    this.milestoneId = 1;
    this.userMilestoneId = 1;
    this.taskClickId = 1;

    // Session store initialization removed

    // Initialize some milestones
    this.initMilestones();
  }

  private initMilestones() {
    const defaultMilestones: Omit<Milestone, "id">[] = [
      {
        title: "Social Explorer",
        description: "Complete tasks across all platforms",
        target: 10,
        category: "social_explorer",
        icon: "globe",
        iconBgColor: "bg-blue-500 bg-opacity-20 text-blue-400",
        progressColor: "bg-blue-400",
        reward: 100,
        createdAt: new Date()
      },
      {
        title: "Engagement Master",
        description: "Complete 50 engagement tasks",
        target: 50,
        category: "engagement_master",
        icon: "zap",
        iconBgColor: "bg-purple-500 bg-opacity-20 text-purple-400",
        progressColor: "bg-purple-400",
        reward: 250,
        createdAt: new Date()
      },
      {
        title: "Community Builder",
        description: "Help grow 5 channels",
        target: 5,
        category: "community_builder",
        icon: "users",
        iconBgColor: "bg-pink-500 bg-opacity-20 text-pink-400",
        progressColor: "bg-pink-400",
        reward: 150,
        createdAt: new Date()
      },
      {
        title: "Point Collector",
        description: "Earn 1000 points",
        target: 1000,
        category: "point_collector",
        icon: "award",
        iconBgColor: "bg-yellow-500 bg-opacity-20 text-yellow-400",
        progressColor: "bg-yellow-400",
        reward: 500,
        createdAt: new Date()
      }
    ];

    defaultMilestones.forEach(milestone => {
      const id = this.milestoneId++;
      this.milestones.set(id, { ...milestone, id });
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByReferralCode(referralCode: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.referralCode === referralCode,
    );
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.googleId === googleId,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email,
      displayName: insertUser.displayName || null,
      googleId: insertUser.googleId ?? null,
      avatar: insertUser.avatar ?? null,
      facebook_handle: insertUser.facebook_handle ?? null,
      instagram_handle: insertUser.instagram_handle ?? null,
      tiktok_handle: insertUser.tiktok_handle ?? null,
      youtube_handle: insertUser.youtube_handle ?? null,
      country: insertUser.country ?? null,
      platform: insertUser.platform ?? null,
      points: 0,
      cashablePoints: 0,
      pendingPoints: 0,
      level: 1,
      progress: 0,
      globalRank: null,
      bio: null,
      role: insertUser.role || "member",
      region: insertUser.region || "Unknown",
      referralCode: insertUser.referralCode || `REF${id}${Math.random().toString(36).substring(2, 7)}`,
      referredBy: insertUser.referredBy || null,
      dailyTasksCompleted: 0,
      lastTaskDate: null,
      streakCount: 0,
      lastLoginDate: null,
      notificationPreferences: {},
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(id, user);

    // Create user milestones for the new user
    const milestonesArray = Array.from(this.milestones.values());
    for (const milestone of milestonesArray) {
      this.createUserMilestone(id, milestone.id);
    }

    return user;
  }

  async updateUserPoints(userId: number, points: number): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;

    user.points += points;

    // Update level based on points
    const newLevel = Math.floor(user.points / 1000) + 1;
    if (newLevel > user.level) {
      user.level = newLevel;
      user.progress = 0;
    } else {
      user.progress = (user.points % 1000) / 10; // 0-100 percentage
    }

    this.users.set(userId, user);

    // Update the point collector milestone
    const pointMilestone = Array.from(this.milestones.values())
      .find(m => m.category === "point_collector");

    if (pointMilestone) {
      const userMilestone = Array.from(this.userMilestones.values())
        .find(um => um.userId === userId && um.milestoneId === pointMilestone.id);

      if (userMilestone) {
        userMilestone.progress = user.points;
        userMilestone.completed = user.points >= pointMilestone.target;
        this.userMilestones.set(userMilestone.id, userMilestone);
      }
    }

    return user;
  }

  // Update User Profile
  async updateUserProfile(userId: number, userData: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;

    Object.assign(user, userData);
    user.updatedAt = new Date();
    this.users.set(userId, user);
  }


  // Task operations
  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async getTaskById(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getAvailableTasks(userId: number): Promise<Task[]> {
    const completedTaskIds = new Set(
      Array.from(this.userTasks.values())
        .filter(ut => ut.userId === userId)
        .map(ut => ut.taskId)
    );

    return Array.from(this.tasks.values())
      .filter(task => {
        // Check if task is active and user hasn't completed it
        if (!task.isActive || completedTaskIds.has(task.id)) {
          return false;
        }

        // Check if task has reached max completions
        if (task.maxCompletions !== null && task.maxCompletions !== undefined) {
          const completionCount = Array.from(this.userTasks.values())
            .filter(ut => ut.taskId === task.id)
            .length;

          if (completionCount >= task.maxCompletions) {
            return false;
          }
        }

        return true;
      });
  }

  async getCompletedTasks(userId: number): Promise<Task[]> {
    const completedTaskIds = new Set(
      Array.from(this.userTasks.values())
        .filter(ut => ut.userId === userId)
        .map(ut => ut.taskId)
    );

    return Array.from(this.tasks.values())
      .filter(task => completedTaskIds.has(task.id));
  }

  async getCompletedTaskIds(userId: number): Promise<number[]> {
    return Array.from(this.userTasks.values())
      .filter(ut => ut.userId === userId)
      .map(ut => ut.taskId);
  }

  // Add a task for demo purposes
  async addTask(task: Omit<Task, "id">): Promise<Task> {
    const id = this.taskId++;
    const newTask: Task = { ...task, id };
    this.tasks.set(id, newTask);
    return newTask;
  }

  // UserTask operations
  async completeTask(userId: number, taskId: number): Promise<UserTask> {
    const task = await this.getTaskById(taskId);
    if (!task) throw new Error("Task not found");

    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    // Check if already completed
    const isCompleted = Array.from(this.userTasks.values())
      .some(ut => ut.userId === userId && ut.taskId === taskId);

    if (isCompleted) throw new Error("Task already completed");

    // Create new user task
    const id = this.userTaskId++;
    const userTask: UserTask = {
      id,
      userId,
      taskId,
      completedAt: new Date(),
      pointsEarned: task.points,
      verificationStatus: "pending",
      verifiedAt: null,
      verifiedBy: null
    };
    this.userTasks.set(id, userTask);

    // Update user points
    await this.updateUserPoints(userId, task.points);

    // Update milestones
    await this.updateMilestones(userId, task);

    return userTask;
  }

  async getRecentTasks(userId: number, limit: number): Promise<(UserTask & { task: Task })[]> {
    return Array.from(this.userTasks.values())
      .filter(ut => ut.userId === userId)
      .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
      .slice(0, limit)
      .map(ut => {
        const task = this.tasks.get(ut.taskId);
        if (!task) throw new Error("Task not found");
        return { ...ut, task };
      });
  }

  // Milestone operations
  async getMilestones(): Promise<Milestone[]> {
    return Array.from(this.milestones.values());
  }

  async getMilestoneById(id: number): Promise<Milestone | undefined> {
    return this.milestones.get(id);
  }

  private async createUserMilestone(userId: number, milestoneId: number): Promise<UserMilestone> {
    const id = this.userMilestoneId++;
    const userMilestone: UserMilestone = {
      id,
      userId,
      milestoneId,
      progress: 0,
      completed: false,
      completedAt: null,
      rewardClaimed: false
    };
    this.userMilestones.set(id, userMilestone);
    return userMilestone;
  }

  async getUserMilestones(userId: number): Promise<MilestoneWithProgress[]> {
    const userMilestonesList = Array.from(this.userMilestones.values())
      .filter(um => um.userId === userId);

    return Promise.all(userMilestonesList.map(async um => {
      const milestone = await this.getMilestoneById(um.milestoneId);
      if (!milestone) throw new Error("Milestone not found");

      return {
        ...milestone,
        progress: um.progress,
        percentComplete: Math.min(100, Math.round((um.progress / milestone.target) * 100))
      };
    }));
  }

  private async updateMilestones(userId: number, task: Task): Promise<void> {
    const userMilestones = Array.from(this.userMilestones.values())
      .filter(um => um.userId === userId);

    for (const userMilestone of userMilestones) {
      const milestone = await this.getMilestoneById(userMilestone.milestoneId);
      if (!milestone) continue;

      switch (milestone.category) {
        case "social_explorer":
          // Track tasks completed across different platforms
          const userTasksArray = Array.from(this.userTasks.values());
          const completedTasks = userTasksArray.filter(ut => ut.userId === userId);

          // Safely collect platform types with null/undefined check
          const platformsArray: string[] = [];
          for (const ut of completedTasks) {
            const task = this.tasks.get(ut.taskId);
            if (task && task.platform) {
              platformsArray.push(task.platform);
            }
          }

          const completedPlatforms = new Set(platformsArray);

          userMilestone.progress = completedPlatforms.size;
          break;

        case "engagement_master":
          // Track total completed tasks
          userMilestone.progress = Array.from(this.userTasks.values())
            .filter(ut => ut.userId === userId).length;
          break;

        case "community_builder":
          // For simplicity, we'll just increment by 1 for each task that's a follow type
          if (task.type === "follow") {
            userMilestone.progress += 1;
          }
          break;

        // Point collector is handled in updateUserPoints
      }

      userMilestone.completed = userMilestone.progress >= milestone.target;
      this.userMilestones.set(userMilestone.id, userMilestone);
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

    // For daily points, we'll calculate points earned in the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const userTasksArray = Array.from(this.userTasks.values());
    const recentUserTasks = userTasksArray.filter(ut =>
      ut.userId === userId &&
      ut.completedAt >= oneDayAgo
    );

    let dailyPoints = 0;
    for (const ut of recentUserTasks) {
      const task = this.tasks.get(ut.taskId);
      if (task) {
        dailyPoints += task.points || 0;
      }
    }

    return {
      total: user.points,
      daily: dailyPoints
    };
  }

  async getTopEarners(limit: number): Promise<User[]> {
    return Array.from(this.users.values())
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);
  }

  async getLeaderboard(options: { period: 'alltime' | 'weekly' | 'monthly'; country?: string; limit?: number; requestingUserId?: number }): Promise<{ entries: LeaderboardEntry[]; userEntry: LeaderboardEntry | null }> {
    const limit = options.limit ?? 50;
    let allUsers = Array.from(this.users.values());
    if (options.country) {
      allUsers = allUsers.filter(u => u.country === options.country);
    }
    const sorted = allUsers.sort((a, b) => b.points - a.points);
    const computeLevel = (pts: number) => Math.floor(pts / 1000) + 1;
    const entries: LeaderboardEntry[] = sorted.slice(0, limit).map((u, i) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName ?? null,
      avatar: u.avatar ?? null,
      country: u.country ?? null,
      points: u.points,
      streakCount: u.streakCount ?? 0,
      level: computeLevel(u.points),
      rank: i + 1,
    }));
    let userEntry: LeaderboardEntry | null = null;
    if (options.requestingUserId) {
      const idx = sorted.findIndex(u => u.id === options.requestingUserId);
      const allSorted = Array.from(this.users.values()).sort((a, b) => b.points - a.points);
      const globalIdx = allSorted.findIndex(u => u.id === options.requestingUserId);
      if (globalIdx >= 0) {
        const u = allSorted[globalIdx];
        userEntry = { id: u.id, username: u.username, displayName: u.displayName ?? null, avatar: u.avatar ?? null, country: u.country ?? null, points: u.points, streakCount: u.streakCount ?? 0, level: computeLevel(u.points), rank: globalIdx + 1 };
      }
    }
    return { entries, userEntry };
  }

  // Admin Methods
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async deleteUser(userId: number): Promise<boolean> {
    if (!this.users.has(userId)) return false;

    // Delete user
    this.users.delete(userId);

    // Delete user tasks
    const userTasksEntries = Array.from(this.userTasks.entries());
    for (const [id, userTask] of userTasksEntries) {
      if (userTask.userId === userId) {
        this.userTasks.delete(id);
      }
    }

    // Delete user milestones
    const userMilestonesEntries = Array.from(this.userMilestones.entries());
    for (const [id, userMilestone] of userMilestonesEntries) {
      if (userMilestone.userId === userId) {
        this.userMilestones.delete(id);
      }
    }

    return true;
  }

  async updateUserRole(userId: number, role: string): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;

    user.role = role as 'admin' | 'member' | 'guest';
    this.users.set(userId, user);

    return user;
  }

  async updateUserPassword(userId: number, password: string): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;

    user.password = password;
    this.users.set(userId, user);

    return user;
  }

  async updateTask(taskId: number, taskData: Partial<Task>): Promise<Task | undefined> {
    const task = await this.getTaskById(taskId);
    if (!task) return undefined;

    const updatedTask = { ...task, ...taskData };
    this.tasks.set(taskId, updatedTask);

    return updatedTask;
  }

  async deleteTask(taskId: number): Promise<boolean> {
    if (!this.tasks.has(taskId)) return false;

    // Delete task
    this.tasks.delete(taskId);

    // Delete user tasks related to this task
    const taskUserEntries = Array.from(this.userTasks.entries());
    for (const [id, userTask] of taskUserEntries) {
      if (userTask.taskId === taskId) {
        this.userTasks.delete(id);
      }
    }

    return true;
  }

  // Admin operations (stub implementations for MemStorage)
  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    // Stub implementation for MemStorage - return hardcoded admin for development
    if (username === 'admin') {
      return {
        id: 1,
        username: 'admin',
        password: '8bc11c416f6eb49929d72b38194ba53ba25157ee75cb280fc25d30ffe8a991f7:32cd38562c10c43695ffdd552ff8399d61cf54c85eaab9445043b77a2ce77c35ac8fb6809fddc08dc4cf89ebdba06d7578382452fe3032e74b74d7ae8de5c9f8',
        email: 'admin@growsocial.com',
        role: 'superadmin',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null
      };
    }
    return undefined;
  }

  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    throw new Error("Admin creation not implemented in MemStorage");
  }

  async getAllAdmins(): Promise<Admin[]> {
    return [];
  }

  async updateAdminLastLogin(adminId: number): Promise<Admin | undefined> {
    return undefined;
  }

  async updateAdminStatus(adminId: number, status: string): Promise<Admin | undefined> {
    const admin = this.admins.get(adminId);
    if (!admin) return undefined;
    admin.status = status;
    this.admins.set(adminId, admin);
    return admin;
  }

  async updateAdminPassword(adminId: number, password: string): Promise<Admin | undefined> {
    const admin = this.admins.get(adminId);
    if (!admin) return undefined;
    admin.password = password;
    this.admins.set(adminId, admin);
    return admin;
  }

  async updateAdmin(id: number, adminData: Partial<Admin>): Promise<Admin> {
    const admin = this.admins.get(id);
    if (!admin) throw new Error("Admin not found");
    const updatedAdmin = { ...admin, ...adminData };
    this.admins.set(id, updatedAdmin);
    return updatedAdmin;
  }

  async deleteAdmin(id: number): Promise<void> {
    this.admins.delete(id);
  }

  async getUserDailyTaskCount(userId: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const userTasksToday = Array.from(this.userTasks.values())
      .filter(ut => ut.userId === userId && ut.completedAt >= today);

    return userTasksToday.length;
  }

  async resetDailyTasks(): Promise<void> {
    // No-op for MemStorage
  }

  async getReferralHistory(userId: number): Promise<Array<{
    id: number;
    referredUsername: string;
    referredAt: Date;
    pointsEarned: number;
    status: string
  }>> {
    const referredUsers = Array.from(this.users.values())
      .filter(user => user.referredBy === userId);

    return referredUsers.map(user => ({
      id: user.id,
      referredUsername: user.username,
      referredAt: user.createdAt,
      pointsEarned: 10,
      status: user.level > 1 ? 'active' : 'new'
    }));
  }

  async getReferralRewardInfo(userId: number): Promise<{
    totalReferrals: number;
    claimableReferrals: number;
    claimableAmount: string;
    eligibleToClaim: boolean;
  }> {
    // Stub implementation for MemStorage
    const stats = await this.getReferralStats(userId);
    return {
      totalReferrals: stats.totalReferrals,
      claimableReferrals: stats.totalReferrals,
      claimableAmount: (stats.totalReferrals * 0.25).toFixed(2),
      eligibleToClaim: stats.totalReferrals >= 20
    };
  }

  async createReferralRewardClaim(userId: number, referralCount: number, amount: string): Promise<ReferralRewardClaim> {
    // Stub implementation for MemStorage
    throw new Error("MemStorage does not support referral reward claims. Please use DatabaseStorage.");
  }

  async getReferralRewardClaims(userId: number): Promise<ReferralRewardClaim[]> {
    // Stub implementation for MemStorage
    return [];
  }



  async addMilestone(milestone: Omit<Milestone, "id">): Promise<Milestone> {
    const id = this.milestoneId++;
    const newMilestone: Milestone = { ...milestone, id };
    this.milestones.set(id, newMilestone);

    // Create user milestone for all users
    const userIds = Array.from(this.users.keys());
    for (const userId of userIds) {
      await this.createUserMilestone(userId, id);
    }

    return newMilestone;
  }

  async updateMilestone(milestoneId: number, milestoneData: Partial<Milestone>): Promise<Milestone | undefined> {
    const milestone = await this.getMilestoneById(milestoneId);
    if (!milestone) return undefined;

    const updatedMilestone = { ...milestone, ...milestoneData };
    this.milestones.set(milestoneId, updatedMilestone);

    return updatedMilestone;
  }

  async deleteMilestone(milestoneId: number): Promise<boolean> {
    if (!this.milestones.has(milestoneId)) return false;

    // Delete milestone
    this.milestones.delete(milestoneId);

    // Delete user milestones related to this milestone
    const milestoneEntries = Array.from(this.userMilestones.entries());
    for (const [id, userMilestone] of milestoneEntries) {
      if (userMilestone.milestoneId === milestoneId) {
        this.userMilestones.delete(id);
      }
    }

    return true;
  }

  async getAllUserTasks(): Promise<UserTask[]> {
    return Array.from(this.userTasks.values());
  }

  async getTaskCompletionAnalytics(): Promise<any> {
    // Count task completions by platform
    const tasks = await this.getTasks();
    const userTasks = Array.from(this.userTasks.values());

    const completionsByPlatform: Record<string, number> = {};
    const completionsByType: Record<string, number> = {};

    for (const userTask of userTasks) {
      const task = tasks.find(t => t.id === userTask.taskId);
      if (task) {
        // Count by platform
        completionsByPlatform[task.platform] = (completionsByPlatform[task.platform] || 0) + 1;

        // Count by type
        completionsByType[task.type] = (completionsByType[task.type] || 0) + 1;
      }
    }

    return {
      completionsByPlatform,
      completionsByType,
      totalCompletions: userTasks.length,
      completionsByDay: this.getCompletionsByDay(userTasks)
    };
  }

  private getCompletionsByDay(userTasks: UserTask[]): Record<string, number> {
    const result: Record<string, number> = {};

    for (const userTask of userTasks) {
      const date = userTask.completedAt.toISOString().split('T')[0]; // YYYY-MM-DD
      result[date] = (result[date] || 0) + 1;
    }

    return result;
  }

  async getUserActivityAnalytics(): Promise<any> {
    const users = await this.getAllUsers();
    const userTasks = Array.from(this.userTasks.values());

    // Active users in last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    const activeUserIds = new Set<number>();
    for (const userTask of userTasks) {
      if (userTask.completedAt >= sevenDaysAgo) {
        activeUserIds.add(userTask.userId);
      }
    }

    // User growth over time (simplified)
    const userGrowth: Record<string, number> = {};
    // This is a simplified implementation. In a real app, we would track when users were created.
    userGrowth[new Date().toISOString().split('T')[0]] = users.length;

    // Top users by completions
    const completionsByUser: Record<number, number> = {};
    for (const userTask of userTasks) {
      completionsByUser[userTask.userId] = (completionsByUser[userTask.userId] || 0) + 1;
    }

    const topUsersByCompletions = Object.entries(completionsByUser)
      .map(([userId, count]) => ({
        userId: parseInt(userId),
        completions: count
      }))
      .sort((a, b) => b.completions - a.completions)
      .slice(0, 10)
      .map(entry => {
        const user = users.find(u => u.id === entry.userId);
        return {
          id: entry.userId,
          username: user?.username || 'Unknown',
          completions: entry.completions
        };
      });

    return {
      totalUsers: users.length,
      activeUsers: activeUserIds.size,
      userGrowth,
      topUsersByCompletions
    };
  }

  // Referral operations
  async getReferralStats(userId: number): Promise<{ totalReferrals: number; totalPoints: number }> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    // Count referrals (users who were referred by this user)
    const referrals = Array.from(this.users.values())
      .filter(u => u.referredBy === userId);

    // Calculate total points earned from referrals (1 point per referral)
    const totalPoints = referrals.length;

    return {
      totalReferrals: referrals.length,
      totalPoints
    };
  }

  async addReferral(referrerId: number, referredId: number): Promise<Referral> {
    const referrer = await this.getUser(referrerId);
    if (!referrer) throw new Error("Referrer not found");

    const referred = await this.getUser(referredId);
    if (!referred) throw new Error("Referred user not found");

    // Add referral information to the referred user
    referred.referredBy = referrerId;
    this.users.set(referredId, referred);

    // Award points to the referrer (1 point per referral)
    await this.updateUserPoints(referrerId, 1);

    // Return a new Referral object matching the schema
    return {
      id: Date.now(), // Using timestamp as a simple ID
      referrerId,
      referredId,
      pointsAwarded: 1,
      isProcessed: true,
      processedAt: new Date(),
      createdAt: new Date()
    };
  }

  // Task Click Tracking
  async recordTaskClick(clickData: InsertTaskClick): Promise<TaskClick> {
    const id = this.taskClickId++;
    const taskClick: TaskClick = {
      id,
      userId: clickData.userId,
      taskId: clickData.taskId,
      clickedAt: new Date(),
      ipAddress: clickData.ipAddress || null,
      userAgent: clickData.userAgent || null,
      sessionId: clickData.sessionId || null,
      convertedToCompletion: clickData.convertedToCompletion || false
    };
    this.taskClicks.set(id, taskClick);
    return taskClick;
  }

  async getTaskClicks(taskId: number): Promise<TaskClick[]> {
    return Array.from(this.taskClicks.values())
      .filter(click => click.taskId === taskId)
      .sort((a, b) => b.clickedAt.getTime() - a.clickedAt.getTime());
  }

  async getTaskClicksCount(taskId: number): Promise<number> {
    return Array.from(this.taskClicks.values())
      .filter(click => click.taskId === taskId)
      .length;
  }

  async getUserTaskClicks(userId: number): Promise<TaskClick[]> {
    return Array.from(this.taskClicks.values())
      .filter(click => click.userId === userId)
      .sort((a, b) => b.clickedAt.getTime() - a.clickedAt.getTime());
  }

  async getTaskClickAnalytics(): Promise<{ taskId: number; title: string; platform: string; totalClicks: number; uniqueUsers: number; conversionRate: number }[]> {
    // Get all tasks
    const allTasks = Array.from(this.tasks.values());

    // For each task, calculate clicks, unique users, and conversion rate
    return Promise.all(allTasks.map(async (task) => {
      const clicksForTask = Array.from(this.taskClicks.values())
        .filter(click => click.taskId === task.id);

      const totalClicks = clicksForTask.length;

      // Get unique users who clicked
      const uniqueUserIds = new Set(clicksForTask.map(click => click.userId));
      const uniqueUsers = uniqueUserIds.size;

      // Get completed tasks for this task
      const completedCount = Array.from(this.userTasks.values())
        .filter(ut => ut.taskId === task.id).length;

      // Calculate conversion rate (completed / clicked)
      const conversionRate = uniqueUsers > 0
        ? Math.round((completedCount / uniqueUsers) * 100)
        : 0;

      return {
        taskId: task.id,
        title: task.title,
        platform: task.platform || "Unknown",
        totalClicks,
        uniqueUsers,
        conversionRate
      };
    }));
  }

  // Payout operations (not implemented in MemStorage - use DatabaseStorage)
  async createPayout(payout: Omit<Payout, "id">): Promise<Payout> {
    throw new Error("Payout operations not supported in MemStorage. Please use DatabaseStorage.");
  }

  async getAllPayouts(): Promise<Payout[]> {
    throw new Error("Payout operations not supported in MemStorage. Please use DatabaseStorage.");
  }

  async getUserPayouts(userId: number): Promise<Payout[]> {
    throw new Error("Payout operations not supported in MemStorage. Please use DatabaseStorage.");
  }

  async getPayoutById(id: number): Promise<Payout | undefined> {
    throw new Error("Payout operations not supported in MemStorage. Please use DatabaseStorage.");
  }

  async updatePayoutStatus(id: number, status: string, processedBy?: number): Promise<Payout | undefined> {
    throw new Error("Payout operations not supported in MemStorage. Please use DatabaseStorage.");
  }

  // Password Reset Token operations (not implemented in MemStorage - use DatabaseStorage)
  async createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<void> {
    throw new Error("Password reset operations not supported in MemStorage. Please use DatabaseStorage.");
  }

  async getPasswordResetToken(token: string): Promise<{ userId: number; expiresAt: Date; used: boolean } | undefined> {
    throw new Error("Password reset operations not supported in MemStorage. Please use DatabaseStorage.");
  }

  async markTokenAsUsed(token: string): Promise<void> {
    throw new Error("Password reset operations not supported in MemStorage. Please use DatabaseStorage.");
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  // Notification operations (not implemented in MemStorage - use DatabaseStorage)
  async createNotification(notification: InsertNotification): Promise<Notification> {
    throw new Error("Notification operations not supported in MemStorage. Please use DatabaseStorage.");
  }

  async getUserNotifications(userId: number, limit?: number): Promise<Notification[]> {
    throw new Error("Notification operations not supported in MemStorage. Please use DatabaseStorage.");
  }

  async getAdminNotifications(limit?: number): Promise<Notification[]> {
    throw new Error("Notification operations not supported in MemStorage. Please use DatabaseStorage.");
  }

  async markNotificationAsRead(notificationId: number): Promise<Notification | undefined> {
    throw new Error("Notification operations not supported in MemStorage. Please use DatabaseStorage.");
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    throw new Error("Notification operations not supported in MemStorage. Please use DatabaseStorage.");
  }

  async markAllAdminNotificationsAsRead(): Promise<void> {
    throw new Error("Notification operations not supported in MemStorage. Please use DatabaseStorage.");
  }

  async deleteNotification(notificationId: number): Promise<boolean> {
    throw new Error("Notification operations not supported in MemStorage. Please use DatabaseStorage.");
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    throw new Error("Notification operations not supported in MemStorage. Please use DatabaseStorage.");
  }

  async getUnreadAdminNotificationCount(): Promise<number> {
    throw new Error("Notification operations not supported in MemStorage. Please use DatabaseStorage.");
  }

  // Classroom operations (not fully implemented in MemStorage)
  async getClassroomVideos(publishedOnly?: boolean): Promise<ClassroomVideo[]> {
    return [];
  }
  async getClassroomVideo(id: number): Promise<ClassroomVideo | undefined> {
    return undefined;
  }
  async createClassroomVideo(data: InsertClassroomVideo): Promise<ClassroomVideo> {
    throw new Error("Classroom operations not supported in MemStorage. Please use DatabaseStorage.");
  }
  async updateClassroomVideo(id: number, data: Partial<InsertClassroomVideo>): Promise<ClassroomVideo | undefined> {
    throw new Error("Classroom operations not supported in MemStorage. Please use DatabaseStorage.");
  }
  async deleteClassroomVideo(id: number): Promise<boolean> {
    throw new Error("Classroom operations not supported in MemStorage. Please use DatabaseStorage.");
  }
  async getClassroomCompletion(userId: number, videoId: number): Promise<ClassroomCompletion | undefined> {
    return undefined;
  }
  async createClassroomCompletion(data: InsertClassroomCompletion): Promise<ClassroomCompletion> {
    throw new Error("Classroom operations not supported in MemStorage. Please use DatabaseStorage.");
  }
  async getUserClassroomCompletions(userId: number): Promise<ClassroomCompletion[]> {
    return [];
  }

  async getScheduledTasks(): Promise<Task[]> {
    return [];
  }

  async getScheduledClassroomVideos(): Promise<ClassroomVideo[]> {
    return [];
  }

  // Streak operations (MemStorage stubs)
  async updateLoginStreak(userId: number): Promise<User | undefined> {
    throw new Error("Streak operations not supported in MemStorage. Please use DatabaseStorage.");
  }
  async getStreakSettings(): Promise<{ milestones: Array<{ streak: number; bonusPoints: number }> }> {
    return { milestones: [{ streak: 7, bonusPoints: 50 }, { streak: 30, bonusPoints: 200 }, { streak: 100, bonusPoints: 500 }] };
  }
  async saveStreakSettings(_settings: { milestones: Array<{ streak: number; bonusPoints: number }> }): Promise<void> {
    // no-op in MemStorage
  }

  // Badge operations (MemStorage stubs)
  async getAllBadges(): Promise<Badge[]> {
    return [];
  }
  async getBadgeByKey(key: string): Promise<Badge | undefined> {
    return undefined;
  }
  async createBadge(data: InsertBadge): Promise<Badge> {
    throw new Error("Badge operations not supported in MemStorage. Please use DatabaseStorage.");
  }
  async updateBadge(id: number, data: Partial<InsertBadge>): Promise<Badge | undefined> {
    throw new Error("Badge operations not supported in MemStorage. Please use DatabaseStorage.");
  }
  async deleteBadge(id: number): Promise<boolean> {
    throw new Error("Badge operations not supported in MemStorage. Please use DatabaseStorage.");
  }
  async getUserBadges(userId: number): Promise<(UserBadge & { badge: Badge })[]> {
    return [];
  }
  async awardBadge(userId: number, badgeKey: string): Promise<UserBadge | null> {
    return null;
  }
  async checkAndAwardBadges(userId: number): Promise<string[]> {
    return [];
  }

  // Public profile (MemStorage stub)
  async getPublicProfile(username: string): Promise<{ user: User; badges: (UserBadge & { badge: Badge })[] } | null> {
    return null;
  }

  // Level history (MemStorage stubs)
  async addLevelHistoryEntry(_userId: number, _level: number): Promise<void> { }
  async getUserLevelHistory(_userId: number): Promise<import("@shared/schema.mysql").LevelHistory[]> {
    return [];
  }

  async getUserNotificationPreferences(userId: number): Promise<Record<string, boolean>> {
    const user = await this.getUser(userId);
    return (user?.notificationPreferences as Record<string, boolean>) || {};
  }

  async updateUserNotificationPreferences(userId: number, prefs: Record<string, boolean>): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    user.notificationPreferences = prefs;
    user.updatedAt = new Date();
    this.users.set(userId, user);
    return user;
  }

  async getReferralTiers(): Promise<import("@shared/schema.mysql").ReferralTier[]> {
    throw new Error("Referral tier operations not supported in MemStorage. Use DatabaseStorage.");
  }
  async getReferralTier(id: number): Promise<import("@shared/schema.mysql").ReferralTier | undefined> {
    throw new Error("Referral tier operations not supported in MemStorage. Use DatabaseStorage.");
  }
  async createReferralTier(data: import("@shared/schema.mysql").InsertReferralTier): Promise<import("@shared/schema.mysql").ReferralTier> {
    throw new Error("Referral tier operations not supported in MemStorage. Use DatabaseStorage.");
  }
  async updateReferralTier(id: number, data: Partial<import("@shared/schema.mysql").InsertReferralTier>): Promise<import("@shared/schema.mysql").ReferralTier | undefined> {
    throw new Error("Referral tier operations not supported in MemStorage. Use DatabaseStorage.");
  }
  async deleteReferralTier(id: number): Promise<boolean> {
    throw new Error("Referral tier operations not supported in MemStorage. Use DatabaseStorage.");
  }
  async getUserReferralTier(userId: number): Promise<{ tier: import("@shared/schema.mysql").ReferralTier | null; nextTier: import("@shared/schema.mysql").ReferralTier | null; totalReferrals: number }> {
    return { tier: null, nextTier: null, totalReferrals: 0 };
  }

  // Marketplace operations (MemStorage stubs)
  async createListing(data: InsertPointListing): Promise<PointListing> {
    throw new Error("Marketplace operations not supported in MemStorage. Use DatabaseStorage.");
  }
  async getListings(): Promise<PointListing[]> {
    return [];
  }
  async getOpenListingsBySeller(sellerId: number): Promise<PointListing[]> {
    return [];
  }
  async getListingById(id: number): Promise<PointListing | undefined> {
    return undefined;
  }
  async updateListing(id: number, data: Partial<PointListing>): Promise<PointListing | undefined> {
    throw new Error("Marketplace operations not supported in MemStorage. Use DatabaseStorage.");
  }
  async deleteListing(id: number): Promise<boolean> {
    throw new Error("Marketplace operations not supported in MemStorage. Use DatabaseStorage.");
  }
  async sellListing(listingId: number, buyerId: number): Promise<PointListing> {
    throw new Error("Marketplace operations not supported in MemStorage. Use DatabaseStorage.");
  }
  async createListingComment(data: InsertListingComment): Promise<ListingComment> {
    throw new Error("Marketplace operations not supported in MemStorage. Use DatabaseStorage.");
  }
  async getListingComments(listingId: number): Promise<ListingComment[]> {
    return [];
  }
  async getListingComment(id: number): Promise<ListingComment | undefined> {
    return undefined;
  }
  async deleteListingComment(id: number): Promise<boolean> {
    throw new Error("Marketplace operations not supported in MemStorage. Use DatabaseStorage.");
  }

  // Tools operations (MemStorage stubs)
  async createQrEmailLead(_email: string, _originalUrl: string): Promise<void> {
    throw new Error("Tools operations not supported in MemStorage. Use DatabaseStorage.");
  }
  async getQrEmailLeads(): Promise<import("@shared/schema.mysql").QrEmailLead[]> {
    return [];
  }
  async createShortenedUrl(_originalUrl: string, _shortCode: string): Promise<import("@shared/schema.mysql").ShortenedUrl> {
    throw new Error("Tools operations not supported in MemStorage. Use DatabaseStorage.");
  }
  async getShortenedUrl(_shortCode: string): Promise<import("@shared/schema.mysql").ShortenedUrl | undefined> {
    return undefined;
  }
  async incrementShortenedUrlClicks(_shortCode: string): Promise<void> {
    // no-op in MemStorage
  }
  async getAllShortenedUrls(): Promise<import("@shared/schema.mysql").ShortenedUrl[]> {
    return [];
  }
  async getAllAdPlacements(): Promise<import("@shared/schema.mysql").AdPlacement[]> {
    return [];
  }
  async getActiveAdPlacements(): Promise<import("@shared/schema.mysql").AdPlacement[]> {
    return [];
  }
  async createAdPlacement(_data: import("@shared/schema.mysql").InsertAdPlacement): Promise<import("@shared/schema.mysql").AdPlacement> {
    throw new Error("Tools operations not supported in MemStorage. Use DatabaseStorage.");
  }
  async updateAdPlacement(_id: number, _data: Partial<import("@shared/schema.mysql").InsertAdPlacement>): Promise<import("@shared/schema.mysql").AdPlacement | undefined> {
    throw new Error("Tools operations not supported in MemStorage. Use DatabaseStorage.");
  }
  async deleteAdPlacement(_id: number): Promise<boolean> {
    throw new Error("Tools operations not supported in MemStorage. Use DatabaseStorage.");
  }

  // Profile links (MemStorage stubs)
  async getUserProfileLinks(_userId: number): Promise<import("@shared/schema.mysql").ProfileLink[]> { return []; }
  async getPublicProfileLinks(_userId: number): Promise<import("@shared/schema.mysql").ProfileLink[]> { return []; }
  async createProfileLink(_userId: number, _data: import("@shared/schema.mysql").InsertProfileLink): Promise<import("@shared/schema.mysql").ProfileLink> {
    throw new Error("Profile links not supported in MemStorage.");
  }
  async updateProfileLink(_id: number, _userId: number, _data: Partial<import("@shared/schema.mysql").InsertProfileLink>): Promise<import("@shared/schema.mysql").ProfileLink | undefined> {
    throw new Error("Profile links not supported in MemStorage.");
  }
  async deleteProfileLink(_id: number, _userId: number): Promise<boolean> {
    throw new Error("Profile links not supported in MemStorage.");
  }
}

// Import DatabaseStorage
import { DatabaseStorage } from "./storage.db";

// Always use DatabaseStorage since we have PostgreSQL available
export const storage = new DatabaseStorage();
