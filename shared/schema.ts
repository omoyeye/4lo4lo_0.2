import { pgTable, text, serial, integer, boolean, timestamp, date, unique, pgEnum, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  googleId: text("google_id").unique(),
  avatar: text("avatar"),
  facebook_handle: text("facebook_handle"),
  instagram_handle: text("instagram_handle"),
  tiktok_handle: text("tiktok_handle"),
  youtube_handle: text("youtube_handle"),
  platform: text("platform").default("local"),
  country: text("country").default("Unknown"),
  points: integer("points").notNull().default(0),
  cashablePoints: integer("cashable_points").notNull().default(0),
  pendingPoints: integer("pending_points").notNull().default(0),
  level: integer("level").notNull().default(1),
  progress: integer("progress").notNull().default(0),
  globalRank: integer("global_rank"),
  role: text("role").default("member"),
  region: text("region").default("Unknown"),
  referralCode: text("referral_code").notNull().unique(),
  referredBy: integer("referred_by"),
  dailyTasksCompleted: integer("daily_tasks_completed").notNull().default(0),
  lastTaskDate: date("last_task_date"),
  streakCount: integer("streak_count").notNull().default(0),
  lastLoginDate: date("last_login_date"),
  notificationPreferences: jsonb("notification_preferences").$type<Record<string, boolean>>().default({}),
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  taskUrl: text("task_url").notNull(),
  platform: text("platform").notNull(),
  type: text("type").notNull(),
  points: integer("points").notNull().default(50),
  isActive: boolean("is_active").notNull().default(true),
  maxCompletions: integer("max_completions"),
  expiresAt: timestamp("expires_at"),
  scheduledPublishAt: timestamp("scheduled_publish_at"),
  category: text("category"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull(),
});

export const userTasks = pgTable("user_tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  taskId: integer("task_id").notNull(),
  completedAt: timestamp("completed_at").notNull(),
  pointsEarned: integer("points_earned").notNull(),
  verificationStatus: text("verification_status").notNull().default("pending"),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: integer("verified_by"),
});

export const dailyTaskAllocation = pgTable(
  "daily_task_allocation", 
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    taskId: integer("task_id").notNull(),
    allocatedDate: date("allocated_date").notNull(),
    isCompleted: boolean("is_completed").notNull().default(false),
  },
  (table) => {
    return {
      uniqueAllocation: unique().on(table.userId, table.taskId, table.allocatedDate),
    };
  }
);

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull(),
  referredId: integer("referred_id").notNull(),
  pointsAwarded: integer("points_awarded").notNull().default(0),
  isProcessed: boolean("is_processed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const referralRewardClaims = pgTable("referral_reward_claims", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  referralCount: integer("referral_count").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
  processedBy: integer("processed_by"),
  paymentMethod: text("payment_method"),
  paymentDetails: text("payment_details"),
});

export const payouts = pgTable("payouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method").notNull(),
  paymentDetails: text("payment_details"),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
  processedBy: integer("processed_by"),
});

export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  target: integer("target").notNull(),
  category: text("category").notNull(),
  icon: text("icon").notNull(),
  iconBgColor: text("icon_bg_color").notNull(),
  progressColor: text("progress_color").notNull(),
  reward: integer("reward").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userMilestones = pgTable("user_milestones", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  milestoneId: integer("milestone_id").notNull(),
  progress: integer("progress").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  rewardClaimed: boolean("reward_claimed").notNull().default(false),
});

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("admin"),
  lastLogin: timestamp("last_login"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: integer("updated_by"),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const taskClicks = pgTable("task_clicks", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  userId: integer("user_id").notNull(),
  clickedAt: timestamp("clicked_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionId: text("session_id"),
  convertedToCompletion: boolean("converted_to_completion").notNull().default(false),
});

export const promotionPlans = pgTable("promotion_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  platform: text("platform").notNull().default("facebook"),
  engagementCount: integer("engagement_count").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: integer("updated_by").notNull(),
});

export const promotionRequests = pgTable("promotion_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  planId: integer("plan_id").notNull(),
  socialMediaUrl: text("social_media_url").notNull(),
  platform: text("platform").notNull(),
  engagementType: text("engagement_type").notNull(),
  additionalDetails: text("additional_details"),
  status: text("status").notNull().default("pending"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  customEngagementCount: integer("custom_engagement_count"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  stripeSessionId: text("stripe_session_id"),
  pointsUsed: integer("points_used"),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  assignedTo: integer("assigned_to"),
  completedAt: timestamp("completed_at"),
  adminNotes: text("admin_notes"),
});

// Batch allocation system for scalable task distribution
export const taskBatches = pgTable("task_batches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  targetUserCount: integer("target_user_count").notNull(),
  actualAllocatedCount: integer("actual_allocated_count").notNull().default(0),
  status: text("status").notNull().default("pending"),
  allocationCriteria: text("allocation_criteria"),
  strategy: text("strategy").notNull().default("random"),
  priority: integer("priority").notNull().default(5),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull(),
  pausedBy: integer("paused_by"),
  pausedReason: text("paused_reason"),
});

export const batchTaskAllocations = pgTable("batch_task_allocations", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull(),
  taskId: integer("task_id").notNull(),
  userId: integer("user_id").notNull(),
  allocatedAt: timestamp("allocated_at").notNull().defaultNow(),
  status: text("status").notNull().default("allocated"),
  clickedAt: timestamp("clicked_at"),
  completedAt: timestamp("completed_at"),
  pointsEarned: integer("points_earned").default(0),
  expiresAt: timestamp("expires_at"),
  userSegment: text("user_segment"),
  allocationReason: text("allocation_reason"),
});

export const userAnalytics = pgTable("user_analytics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: date("date").notNull(),
  loginCount: integer("login_count").notNull().default(0),
  tasksViewed: integer("tasks_viewed").notNull().default(0),
  tasksClicked: integer("tasks_clicked").notNull().default(0),
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  timeSpentMinutes: integer("time_spent_minutes").notNull().default(0),
  engagementScore: numeric("engagement_score", { precision: 5, scale: 2 }).default("0"),
  activityLevel: text("activity_level").default("low"),
  lastActivityAt: timestamp("last_activity_at"),
  deviceInfo: text("device_info"),
  geoLocation: text("geo_location"),
});

export const allocationAnalytics = pgTable("allocation_analytics", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull(),
  metricName: text("metric_name").notNull(),
  metricValue: numeric("metric_value", { precision: 10, scale: 4 }).notNull(),
  metricUnit: text("metric_unit"),
  calculatedAt: timestamp("calculated_at").notNull().defaultNow(),
  userId: integer("user_id"),
  taskId: integer("task_id"),
  userSegment: text("user_segment"),
});

export const userSegments = pgTable("user_segments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  criteria: text("criteria").notNull(),
  userCount: integer("user_count").notNull().default(0),
  averageEngagement: numeric("average_engagement", { precision: 5, scale: 2 }).default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull(),
});

export const taskPerformance = pgTable("task_performance", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  date: date("date").notNull(),
  totalAllocations: integer("total_allocations").notNull().default(0),
  totalClicks: integer("total_clicks").notNull().default(0),
  totalCompletions: integer("total_completions").notNull().default(0),
  averageTimeToClick: integer("average_time_to_click").default(0),
  averageTimeToComplete: integer("average_time_to_complete").default(0),
  clickThroughRate: numeric("click_through_rate", { precision: 5, scale: 2 }).default("0"),
  completionRate: numeric("completion_rate", { precision: 5, scale: 2 }).default("0"),
  userSatisfactionScore: numeric("user_satisfaction_score", { precision: 3, scale: 2 }).default("0"),
  revenueGenerated: numeric("revenue_generated", { precision: 10, scale: 2 }).default("0"),
});

export const systemMetrics = pgTable("system_metrics", {
  id: serial("id").primaryKey(),
  metricName: text("metric_name").notNull(),
  metricValue: numeric("metric_value", { precision: 15, scale: 4 }).notNull(),
  metricUnit: text("metric_unit"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  serverNode: text("server_node"),
  alertThreshold: numeric("alert_threshold", { precision: 15, scale: 4 }),
  isAlert: boolean("is_alert").notNull().default(false),
});

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  preferredPlatforms: text("preferred_platforms"),
  preferredTaskTypes: text("preferred_task_types"),
  optimalTaskCount: integer("optimal_task_count").default(5),
  bestActiveHours: text("best_active_hours"),
  notificationPreferences: text("notification_preferences"),
  difficultyPreference: text("difficulty_preference").default("medium"),
  pointsMotivation: integer("points_motivation").default(5),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const notificationTypeEnum = pgEnum("notification_type", [
  "new_task",
  "points_threshold",
  "referral_milestone",
  "promote_me_request",
  "withdrawal_request",
  "password_reset_request",
  "task_approved",
  "task_rejected",
  "payout_processed",
  "system_announcement"
]);

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  adminOnly: boolean("admin_only").notNull().default(false),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: text("data"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true });
export const insertUserTaskSchema = createInsertSchema(userTasks).omit({ id: true });
export const insertMilestoneSchema = createInsertSchema(milestones).omit({ id: true });
export const insertUserMilestoneSchema = createInsertSchema(userMilestones).omit({ id: true });
export const insertDailyTaskAllocationSchema = createInsertSchema(dailyTaskAllocation).omit({ id: true });
export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true });
export const insertPayoutSchema = createInsertSchema(payouts).omit({ id: true });
export const insertAdminSchema = createInsertSchema(admins).omit({ id: true });
export const insertTaskClickSchema = createInsertSchema(taskClicks).omit({ id: true });
export const insertPromotionPlanSchema = createInsertSchema(promotionPlans).omit({ id: true }).extend({
  price: z.union([z.string(), z.number()]).transform(val => String(val))
});
export const insertPromotionRequestSchema = createInsertSchema(promotionRequests).omit({ id: true });
export const insertTaskBatchSchema = createInsertSchema(taskBatches).omit({ id: true });
export const insertBatchTaskAllocationSchema = createInsertSchema(batchTaskAllocations).omit({ id: true });
export const insertUserAnalyticsSchema = createInsertSchema(userAnalytics).omit({ id: true });
export const insertAllocationAnalyticsSchema = createInsertSchema(allocationAnalytics).omit({ id: true });
export const insertUserSegmentSchema = createInsertSchema(userSegments).omit({ id: true });
export const insertTaskPerformanceSchema = createInsertSchema(taskPerformance).omit({ id: true });
export const insertSystemMetricsSchema = createInsertSchema(systemMetrics).omit({ id: true });
export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({ id: true });
export const insertAppSettingSchema = createInsertSchema(appSettings).omit({ id: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertUserTask = z.infer<typeof insertUserTaskSchema>;
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type InsertUserMilestone = z.infer<typeof insertUserMilestoneSchema>;
export type InsertDailyTaskAllocation = z.infer<typeof insertDailyTaskAllocationSchema>;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type InsertPayout = z.infer<typeof insertPayoutSchema>;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type InsertTaskClick = z.infer<typeof insertTaskClickSchema>;
export type InsertPromotionPlan = z.infer<typeof insertPromotionPlanSchema>;
export type InsertPromotionRequest = z.infer<typeof insertPromotionRequestSchema>;
export type InsertTaskBatch = z.infer<typeof insertTaskBatchSchema>;
export type InsertBatchTaskAllocation = z.infer<typeof insertBatchTaskAllocationSchema>;
export type InsertUserAnalytics = z.infer<typeof insertUserAnalyticsSchema>;
export type InsertAllocationAnalytics = z.infer<typeof insertAllocationAnalyticsSchema>;
export type InsertUserSegment = z.infer<typeof insertUserSegmentSchema>;
export type InsertTaskPerformance = z.infer<typeof insertTaskPerformanceSchema>;
export type InsertSystemMetrics = z.infer<typeof insertSystemMetricsSchema>;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type InsertAppSetting = z.infer<typeof insertAppSettingSchema>;
export type AppSetting = typeof appSettings.$inferSelect;

// Request body validation schemas for API routes
export const adminLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const adminRegisterSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "superadmin"]).default("admin"),
});

export const updateUserSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  email: z.string().email().optional(),
  displayName: z.string().optional().nullable(),
  isPublic: z.boolean().optional(),
  facebook_handle: z.string().optional().nullable(),
  instagram_handle: z.string().optional().nullable(),
  tiktok_handle: z.string().optional().nullable(),
  youtube_handle: z.string().optional().nullable(),
  country: z.string().optional(),
  region: z.string().optional(),
  notificationPreferences: z.record(z.boolean()).optional(),
});

export const taskCompleteSchema = z.object({
  userId: z.number().int().positive("User ID must be a positive integer").optional(),
  taskId: z.number().int().positive("Task ID must be a positive integer"),
  clickId: z.number().int().positive().optional(),
});

export const taskClickSchema = z.object({
  userId: z.number().int().positive("User ID must be a positive integer").optional(),
  taskId: z.number().int().positive("Task ID must be a positive integer"),
});

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  taskUrl: z.string().url("Task URL must be a valid URL"),
  platform: z.enum(['youtube', 'tiktok', 'facebook', 'instagram', 'twitter', 'whatsapp', 'telegram', 'linkedin', 'snapchat', 'pinterest', 'discord', 'threads', 'survey'], {
    errorMap: () => ({ message: "Invalid platform" })
  }),
  type: z.enum(['like', 'follow', 'comment', 'share', 'view', 'subscribe'], {
    errorMap: () => ({ message: "Invalid task type" })
  }),
  points: z.number().int().min(1, "Points must be at least 1"),
  maxCompletions: z.number().int().positive().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  scheduledPublishAt: z.string().datetime().optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  taskUrl: z.string().url().optional(),
  platform: z.enum(['youtube', 'tiktok', 'facebook', 'instagram', 'twitter', 'whatsapp', 'telegram', 'linkedin', 'snapchat', 'pinterest', 'discord', 'threads', 'survey']).optional(),
  type: z.enum(['like', 'follow', 'comment', 'share', 'view', 'subscribe']).optional(),
  points: z.number().int().min(1).optional(),
  maxCompletions: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  scheduledPublishAt: z.string().datetime().optional().nullable(),
});

export const createMilestoneSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  target: z.number().int().min(1, "Target must be at least 1"),
  category: z.string().min(1, "Category is required"),
  icon: z.string().min(1, "Icon is required"),
  iconBgColor: z.string().min(1, "Icon background color is required"),
  progressColor: z.string().min(1, "Progress color is required"),
  reward: z.number().int().min(0, "Reward cannot be negative").default(0),
});

export const updateMilestoneSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  target: z.number().int().min(1).optional(),
  category: z.string().min(1).optional(),
  icon: z.string().min(1).optional(),
  iconBgColor: z.string().min(1).optional(),
  progressColor: z.string().min(1).optional(),
  reward: z.number().int().min(0).optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'guest'], {
    errorMap: () => ({ message: "Invalid role. Must be 'admin', 'member', or 'guest'" })
  }),
});

export const updateUserPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const updatePromotionPlanSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  platform: z.string().optional(),
  engagementCount: z.number().int().min(1).optional(),
  price: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const updatePromotionRequestSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  paymentStatus: z.enum(['paid', 'unpaid']).optional(),
  assignedTo: z.number().int().positive().optional(),
  adminNotes: z.string().optional(),
});

export type User = typeof users.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type UserTask = typeof userTasks.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type UserMilestone = typeof userMilestones.$inferSelect;
export type DailyTaskAllocation = typeof dailyTaskAllocation.$inferSelect;
export type Referral = typeof referrals.$inferSelect;
export type ReferralRewardClaim = typeof referralRewardClaims.$inferSelect;
export type Payout = typeof payouts.$inferSelect;
export type Admin = typeof admins.$inferSelect;
export type TaskClick = typeof taskClicks.$inferSelect;
export type PromotionPlan = typeof promotionPlans.$inferSelect;
export type PromotionRequest = typeof promotionRequests.$inferSelect;
export type TaskBatch = typeof taskBatches.$inferSelect;
export type BatchTaskAllocation = typeof batchTaskAllocations.$inferSelect;
export type UserAnalytics = typeof userAnalytics.$inferSelect;
export type AllocationAnalytics = typeof allocationAnalytics.$inferSelect;
export type UserSegment = typeof userSegments.$inferSelect;
export type TaskPerformance = typeof taskPerformance.$inferSelect;
export type SystemMetrics = typeof systemMetrics.$inferSelect;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Dashboard specific types
export type TaskCount = {
  available: number;
  completed: number;
};

export type PointsData = {
  total: number;
  daily: number;
};

export type MilestoneWithProgress = {
  id: number;
  title: string;
  description: string;
  target: number;
  category: string;
  icon: string;
  iconBgColor: string;
  progressColor: string;
  progress: number;
  percentComplete: number;
};

// Advanced allocation types for the new system
export interface AllocationCriteria {
  userLevel: { min: number; max: number };
  activityScore: number;
  geography: string[];
  previousTaskHistory: 'include_recent' | 'exclude_recent' | 'any';
  pointsRange: { min: number; max: number };
  engagementLevel: 'high' | 'medium' | 'low' | 'any';
}

export interface AllocationPreview {
  targetUsers: {
    total: number;
    byLevel: Record<number, number>;
    byRegion: Record<string, number>;
    averageCompletionRate: number;
  };
  estimatedEngagement: {
    expectedCompletions: number;
    projectedTimeToComplete: string;
    riskFactors: string[];
  };
}

export interface PredictiveMetrics {
  completionProbability: number;
  estimatedCompletionTime: number;
  userChurnRisk: number;
  revenueImpact: number;
  optimalTaskCount: number;
}

export interface TaskPoolStrategy {
  distributionRules: {
    maxTasksPerUser: number;
    taskMixRatio: Record<string, number>;
    difficultyProgression: 'linear' | 'adaptive' | 'random';
    refreshInterval: number;
  };
  qualityControl: {
    minimumCompletionRate: number;
    maximumReports: number;
    verificationRequired: boolean;
  };
}

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({ id: true, createdAt: true });
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

// Marketplace tables
export const listingStatusEnum = pgEnum("listing_status", ["open", "sold"]);

export const pointListings = pgTable("point_listings", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull(),
  buyerId: integer("buyer_id"),
  pointsAmount: integer("points_amount").notNull(),
  note: text("note"),
  status: listingStatusEnum("status").notNull().default("open"),
  soldAt: timestamp("sold_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const listingComments = pgTable(
  "listing_comments",
  {
    id: serial("id").primaryKey(),
    listingId: integer("listing_id").notNull(),
    userId: integer("user_id").notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueUserComment: unique().on(table.listingId, table.userId),
  })
);

export const insertPointListingSchema = createInsertSchema(pointListings).omit({ id: true, createdAt: true });
export const insertListingCommentSchema = createInsertSchema(listingComments).omit({ id: true, createdAt: true });

export type PointListing = typeof pointListings.$inferSelect;
export type InsertPointListing = z.infer<typeof insertPointListingSchema>;
export type ListingComment = typeof listingComments.$inferSelect;
export type InsertListingComment = z.infer<typeof insertListingCommentSchema>;

export const createListingSchema = z.object({
  pointsAmount: z.number().int().min(1, "Must sell at least 1 point"),
  note: z.string().max(500).optional(),
});

export const createListingCommentSchema = z.object({
  message: z.string().min(1, "Message is required").max(500),
});

export const sellListingSchema = z.object({
  buyerCommentId: z.number().int().positive("Buyer comment ID is required"),
});

// Classroom tables
export const classroomVideos = pgTable("classroom_videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  transcript: text("transcript").notNull().default(""),
  pointsReward: integer("points_reward").notNull().default(50),
  isPublished: boolean("is_published").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  scheduledPublishAt: timestamp("scheduled_publish_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const classroomCompletions = pgTable("classroom_completions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  videoId: integer("video_id").notNull(),
  pointsEarned: integer("points_earned").notNull(),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

export type ClassroomVideo = typeof classroomVideos.$inferSelect;
export const insertClassroomVideoSchema = createInsertSchema(classroomVideos).omit({ id: true, createdAt: true });
export type InsertClassroomVideo = z.infer<typeof insertClassroomVideoSchema>;

export type ClassroomCompletion = typeof classroomCompletions.$inferSelect;
export const insertClassroomCompletionSchema = createInsertSchema(classroomCompletions).omit({ id: true, completedAt: true });
export type InsertClassroomCompletion = z.infer<typeof insertClassroomCompletionSchema>;

// Badges — achievement definitions
export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  iconName: text("icon_name").notNull().default("award"),
  condition: jsonb("condition").$type<{ type: string; threshold: number }>().notNull(),
  pointsBonus: integer("points_bonus").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userBadges = pgTable(
  "user_badges",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    badgeKey: text("badge_key").notNull(),
    earnedAt: timestamp("earned_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueUserBadge: unique().on(table.userId, table.badgeKey),
  })
);

export type Badge = typeof badges.$inferSelect;
export const insertBadgeSchema = createInsertSchema(badges).omit({ id: true, createdAt: true });
export type InsertBadge = z.infer<typeof insertBadgeSchema>;

export type UserBadge = typeof userBadges.$inferSelect;
export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({ id: true, earnedAt: true });
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;

// Referral tiers — multiplier brackets for referral rewards
export const referralTiers = pgTable("referral_tiers", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  minReferrals: integer("min_referrals").notNull(),
  maxReferrals: integer("max_referrals"),
  multiplier: numeric("multiplier", { precision: 4, scale: 2 }).notNull().default("1.00"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ReferralTier = typeof referralTiers.$inferSelect;
export const insertReferralTierSchema = createInsertSchema(referralTiers).omit({ id: true, createdAt: true });
export type InsertReferralTier = z.infer<typeof insertReferralTierSchema>;

// QR code email leads — visitors who submit their email to download a QR code
export const qrEmailLeads = pgTable("qr_email_leads", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  originalUrl: text("original_url").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type QrEmailLead = typeof qrEmailLeads.$inferSelect;
export const insertQrEmailLeadSchema = createInsertSchema(qrEmailLeads).omit({ id: true, createdAt: true });
export type InsertQrEmailLead = z.infer<typeof insertQrEmailLeadSchema>;

// Shortened URLs — public URL shortener tool
export const shortenedUrls = pgTable("shortened_urls", {
  id: serial("id").primaryKey(),
  shortCode: text("short_code").notNull().unique(),
  originalUrl: text("original_url").notNull(),
  clicks: integer("clicks").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ShortenedUrl = typeof shortenedUrls.$inferSelect;
export const insertShortenedUrlSchema = createInsertSchema(shortenedUrls).omit({ id: true, createdAt: true });
export type InsertShortenedUrl = z.infer<typeof insertShortenedUrlSchema>;

// Level history — records each time a user reaches a new level
export const levelHistory = pgTable("level_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  level: integer("level").notNull(),
  reachedAt: timestamp("reached_at").notNull().defaultNow(),
});

export type LevelHistory = typeof levelHistory.$inferSelect;
export const insertLevelHistorySchema = createInsertSchema(levelHistory).omit({ id: true, reachedAt: true });
export type InsertLevelHistory = z.infer<typeof insertLevelHistorySchema>;

// Profile links — user-controlled linktree-style links shown on their public profile
export const profileLinks = pgTable("profile_links", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ProfileLink = typeof profileLinks.$inferSelect;
export const insertProfileLinkSchema = createInsertSchema(profileLinks)
  .omit({ id: true, userId: true, createdAt: true })
  .extend({
    title: z.string().min(1, "Title is required").max(100),
    url: z.string().url("Must be a valid URL"),
    displayOrder: z.number().int().default(0),
    isActive: z.boolean().default(true),
  });
export type InsertProfileLink = z.infer<typeof insertProfileLinkSchema>;

// Ad placements — admin pastes Google Ads/AdSense script code, assigned to a position slot
export const adPlacements = pgTable("ad_placements", {
  id: serial("id").primaryKey(),
  position: text("position").notNull().default("top"),
  adCode: text("ad_code").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AdPlacement = typeof adPlacements.$inferSelect;
export const insertAdPlacementSchema = createInsertSchema(adPlacements)
  .omit({ id: true, createdAt: true })
  .extend({
    position: z.enum(["top", "middle", "left", "right", "bottom", "all"]),
    adCode: z.string().min(1, "Ad code is required"),
  });
export type InsertAdPlacement = z.infer<typeof insertAdPlacementSchema>;