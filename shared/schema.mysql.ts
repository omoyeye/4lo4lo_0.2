/**
 * MySQL-compatible Drizzle ORM schema.
 * Converted from shared/schema.ts (PostgreSQL / Neon).
 *
 * Key differences from the PG schema:
 *  - mysqlTable instead of pgTable
 *  - serial() → int().autoincrement().primaryKey()
 *  - text columns kept as text (MySQL TEXT has no length limit issue)
 *  - jsonb → json
 *  - numeric → decimal
 *  - pgEnum removed → plain varchar / text columns
 *  - boolean → tinyint(1) under the hood (Drizzle handles it)
 *  - unique() constraints preserved via .unique() or table-level
 */

import {
  mysqlTable,
  int,
  varchar,
  text,
  boolean,
  timestamp,
  date,
  decimal,
  json,
  unique,
} from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  displayName: varchar("display_name", { length: 255 }),
  googleId: varchar("google_id", { length: 255 }).unique(),
  avatar: text("avatar"),
  facebook_handle: varchar("facebook_handle", { length: 255 }),
  instagram_handle: varchar("instagram_handle", { length: 255 }),
  tiktok_handle: varchar("tiktok_handle", { length: 255 }),
  youtube_handle: varchar("youtube_handle", { length: 255 }),
  platform: varchar("platform", { length: 100 }).default("local"),
  country: varchar("country", { length: 100 }).default("Unknown"),
  points: int("points").notNull().default(0),
  cashablePoints: int("cashable_points").notNull().default(0),
  pendingPoints: int("pending_points").notNull().default(0),
  level: int("level").notNull().default(1),
  progress: int("progress").notNull().default(0),
  globalRank: int("global_rank"),
  role: varchar("role", { length: 50 }).default("member"),
  region: varchar("region", { length: 100 }).default("Unknown"),
  referralCode: varchar("referral_code", { length: 100 }).notNull().unique(),
  referredBy: int("referred_by"),
  dailyTasksCompleted: int("daily_tasks_completed").notNull().default(0),
  lastTaskDate: date("last_task_date", { mode: 'string' }),
  streakCount: int("streak_count").notNull().default(0),
  lastLoginDate: date("last_login_date", { mode: 'string' }),
  notificationPreferences: json("notification_preferences").$type<Record<string, boolean>>().default({}),
  isPublic: boolean("is_public").notNull().default(true),
  bio: text("bio"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// tasks
// ---------------------------------------------------------------------------
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  taskUrl: text("task_url").notNull(),
  platform: varchar("platform", { length: 100 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  points: int("points").notNull().default(50),
  isActive: boolean("is_active").notNull().default(true),
  maxCompletions: int("max_completions"),
  expiresAt: timestamp("expires_at"),
  scheduledPublishAt: timestamp("scheduled_publish_at"),
  category: varchar("category", { length: 100 }),
  difficulty: varchar("difficulty", { length: 50 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: int("created_by").notNull(),
});

// ---------------------------------------------------------------------------
// user_tasks
// ---------------------------------------------------------------------------
export const userTasks = mysqlTable("user_tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  taskId: int("task_id").notNull(),
  completedAt: timestamp("completed_at").notNull(),
  pointsEarned: int("points_earned").notNull(),
  verificationStatus: varchar("verification_status", { length: 50 }).notNull().default("pending"),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: int("verified_by"),
});

// ---------------------------------------------------------------------------
// daily_task_allocation
// ---------------------------------------------------------------------------
export const dailyTaskAllocation = mysqlTable(
  "daily_task_allocation",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    taskId: int("task_id").notNull(),
    allocatedDate: date("allocated_date").notNull(),
    isCompleted: boolean("is_completed").notNull().default(false),
  },
  (table) => ({
    uniqueAllocation: unique().on(table.userId, table.taskId, table.allocatedDate),
  })
);

// ---------------------------------------------------------------------------
// referrals
// ---------------------------------------------------------------------------
export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  referrerId: int("referrer_id").notNull(),
  referredId: int("referred_id").notNull(),
  pointsAwarded: int("points_awarded").notNull().default(0),
  isProcessed: boolean("is_processed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
});

// ---------------------------------------------------------------------------
// referral_reward_claims
// ---------------------------------------------------------------------------
export const referralRewardClaims = mysqlTable("referral_reward_claims", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  referralCount: int("referral_count").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
  processedBy: int("processed_by"),
  paymentMethod: varchar("payment_method", { length: 100 }),
  paymentDetails: text("payment_details"),
});

// ---------------------------------------------------------------------------
// payouts
// ---------------------------------------------------------------------------
export const payouts = mysqlTable("payouts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  amount: int("amount").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  paymentMethod: varchar("payment_method", { length: 100 }).notNull(),
  paymentDetails: text("payment_details"),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
  processedBy: int("processed_by"),
});

// ---------------------------------------------------------------------------
// milestones
// ---------------------------------------------------------------------------
export const milestones = mysqlTable("milestones", {
  id: int("id").autoincrement().primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  target: int("target").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 100 }).notNull(),
  iconBgColor: varchar("icon_bg_color", { length: 100 }).notNull(),
  progressColor: varchar("progress_color", { length: 100 }).notNull(),
  reward: int("reward").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// user_milestones
// ---------------------------------------------------------------------------
export const userMilestones = mysqlTable("user_milestones", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  milestoneId: int("milestone_id").notNull(),
  progress: int("progress").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  rewardClaimed: boolean("reward_claimed").notNull().default(false),
});

// ---------------------------------------------------------------------------
// admins
// ---------------------------------------------------------------------------
export const admins = mysqlTable("admins", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("admin"),
  lastLogin: timestamp("last_login"),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// app_settings
// ---------------------------------------------------------------------------
export const appSettings = mysqlTable("app_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: int("updated_by"),
});

// ---------------------------------------------------------------------------
// password_reset_tokens
// ---------------------------------------------------------------------------
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  token: varchar("token", { length: 512 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// task_clicks
// ---------------------------------------------------------------------------
export const taskClicks = mysqlTable("task_clicks", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("task_id").notNull(),
  userId: int("user_id").notNull(),
  clickedAt: timestamp("clicked_at").notNull().defaultNow(),
  ipAddress: varchar("ip_address", { length: 100 }),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id", { length: 255 }),
  convertedToCompletion: boolean("converted_to_completion").notNull().default(false),
});

// ---------------------------------------------------------------------------
// promotion_plans
// ---------------------------------------------------------------------------
export const promotionPlans = mysqlTable("promotion_plans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  platform: varchar("platform", { length: 100 }).notNull().default("facebook"),
  engagementCount: int("engagement_count").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: int("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: int("updated_by").notNull(),
});

// ---------------------------------------------------------------------------
// promotion_requests
// ---------------------------------------------------------------------------
export const promotionRequests = mysqlTable("promotion_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  planId: int("plan_id").notNull(),
  socialMediaUrl: text("social_media_url").notNull(),
  platform: varchar("platform", { length: 100 }).notNull(),
  engagementType: varchar("engagement_type", { length: 100 }).notNull(),
  additionalDetails: text("additional_details"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  customEngagementCount: int("custom_engagement_count"),
  paymentStatus: varchar("payment_status", { length: 50 }).notNull().default("unpaid"),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }),
  pointsUsed: int("points_used"),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  assignedTo: int("assigned_to"),
  completedAt: timestamp("completed_at"),
  adminNotes: text("admin_notes"),
});

// ---------------------------------------------------------------------------
// task_batches
// ---------------------------------------------------------------------------
export const taskBatches = mysqlTable("task_batches", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  targetUserCount: int("target_user_count").notNull(),
  actualAllocatedCount: int("actual_allocated_count").notNull().default(0),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  allocationCriteria: text("allocation_criteria"),
  strategy: varchar("strategy", { length: 50 }).notNull().default("random"),
  priority: int("priority").notNull().default(5),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: int("created_by").notNull(),
  pausedBy: int("paused_by"),
  pausedReason: text("paused_reason"),
});

// ---------------------------------------------------------------------------
// batch_task_allocations
// ---------------------------------------------------------------------------
export const batchTaskAllocations = mysqlTable("batch_task_allocations", {
  id: int("id").autoincrement().primaryKey(),
  batchId: int("batch_id").notNull(),
  taskId: int("task_id").notNull(),
  userId: int("user_id").notNull(),
  allocatedAt: timestamp("allocated_at").notNull().defaultNow(),
  status: varchar("status", { length: 50 }).notNull().default("allocated"),
  clickedAt: timestamp("clicked_at"),
  completedAt: timestamp("completed_at"),
  pointsEarned: int("points_earned").default(0),
  expiresAt: timestamp("expires_at"),
  userSegment: varchar("user_segment", { length: 100 }),
  allocationReason: text("allocation_reason"),
});

// ---------------------------------------------------------------------------
// user_analytics
// ---------------------------------------------------------------------------
export const userAnalytics = mysqlTable("user_analytics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  date: date("date").notNull(),
  loginCount: int("login_count").notNull().default(0),
  tasksViewed: int("tasks_viewed").notNull().default(0),
  tasksClicked: int("tasks_clicked").notNull().default(0),
  tasksCompleted: int("tasks_completed").notNull().default(0),
  timeSpentMinutes: int("time_spent_minutes").notNull().default(0),
  engagementScore: decimal("engagement_score", { precision: 5, scale: 2 }).default("0"),
  activityLevel: varchar("activity_level", { length: 50 }).default("low"),
  lastActivityAt: timestamp("last_activity_at"),
  deviceInfo: text("device_info"),
  geoLocation: text("geo_location"),
});

// ---------------------------------------------------------------------------
// allocation_analytics
// ---------------------------------------------------------------------------
export const allocationAnalytics = mysqlTable("allocation_analytics", {
  id: int("id").autoincrement().primaryKey(),
  batchId: int("batch_id").notNull(),
  metricName: varchar("metric_name", { length: 255 }).notNull(),
  metricValue: decimal("metric_value", { precision: 10, scale: 4 }).notNull(),
  metricUnit: varchar("metric_unit", { length: 50 }),
  calculatedAt: timestamp("calculated_at").notNull().defaultNow(),
  userId: int("user_id"),
  taskId: int("task_id"),
  userSegment: varchar("user_segment", { length: 100 }),
});

// ---------------------------------------------------------------------------
// user_segments
// ---------------------------------------------------------------------------
export const userSegments = mysqlTable("user_segments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  criteria: text("criteria").notNull(),
  userCount: int("user_count").notNull().default(0),
  averageEngagement: decimal("average_engagement", { precision: 5, scale: 2 }).default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: int("created_by").notNull(),
});

// ---------------------------------------------------------------------------
// task_performance
// ---------------------------------------------------------------------------
export const taskPerformance = mysqlTable("task_performance", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("task_id").notNull(),
  date: date("date").notNull(),
  totalAllocations: int("total_allocations").notNull().default(0),
  totalClicks: int("total_clicks").notNull().default(0),
  totalCompletions: int("total_completions").notNull().default(0),
  averageTimeToClick: int("average_time_to_click").default(0),
  averageTimeToComplete: int("average_time_to_complete").default(0),
  clickThroughRate: decimal("click_through_rate", { precision: 5, scale: 2 }).default("0"),
  completionRate: decimal("completion_rate", { precision: 5, scale: 2 }).default("0"),
  userSatisfactionScore: decimal("user_satisfaction_score", { precision: 3, scale: 2 }).default("0"),
  revenueGenerated: decimal("revenue_generated", { precision: 10, scale: 2 }).default("0"),
});

// ---------------------------------------------------------------------------
// system_metrics
// ---------------------------------------------------------------------------
export const systemMetrics = mysqlTable("system_metrics", {
  id: int("id").autoincrement().primaryKey(),
  metricName: varchar("metric_name", { length: 255 }).notNull(),
  metricValue: decimal("metric_value", { precision: 15, scale: 4 }).notNull(),
  metricUnit: varchar("metric_unit", { length: 50 }),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  serverNode: varchar("server_node", { length: 255 }),
  alertThreshold: decimal("alert_threshold", { precision: 15, scale: 4 }),
  isAlert: boolean("is_alert").notNull().default(false),
});

// ---------------------------------------------------------------------------
// user_preferences
// ---------------------------------------------------------------------------
export const userPreferences = mysqlTable("user_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique(),
  preferredPlatforms: text("preferred_platforms"),
  preferredTaskTypes: text("preferred_task_types"),
  optimalTaskCount: int("optimal_task_count").default(5),
  bestActiveHours: text("best_active_hours"),
  notificationPreferences: text("notification_preferences"),
  difficultyPreference: varchar("difficulty_preference", { length: 50 }).default("medium"),
  pointsMotivation: int("points_motivation").default(5),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// notifications  (enum type removed — plain text column)
// ---------------------------------------------------------------------------
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id"),
  adminOnly: boolean("admin_only").notNull().default(false),
  type: varchar("type", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  data: text("data"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// point_listings  (listingStatusEnum → plain varchar)
// ---------------------------------------------------------------------------
export const pointListings = mysqlTable("point_listings", {
  id: int("id").autoincrement().primaryKey(),
  sellerId: int("seller_id").notNull(),
  buyerId: int("buyer_id"),
  pointsAmount: int("points_amount").notNull(),
  note: text("note"),
  status: varchar("status", { length: 50 }).notNull().default("open"),
  soldAt: timestamp("sold_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// listing_comments
// ---------------------------------------------------------------------------
export const listingComments = mysqlTable(
  "listing_comments",
  {
    id: int("id").autoincrement().primaryKey(),
    listingId: int("listing_id").notNull(),
    userId: int("user_id").notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueUserComment: unique().on(table.listingId, table.userId),
  })
);

// ---------------------------------------------------------------------------
// classroom_videos
// ---------------------------------------------------------------------------
export const classroomVideos = mysqlTable("classroom_videos", {
  id: int("id").autoincrement().primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  transcript: text("transcript").notNull().default(""),
  pointsReward: int("points_reward").notNull().default(50),
  isPublished: boolean("is_published").notNull().default(false),
  displayOrder: int("display_order").notNull().default(0),
  scheduledPublishAt: timestamp("scheduled_publish_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// classroom_completions
// ---------------------------------------------------------------------------
export const classroomCompletions = mysqlTable("classroom_completions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  videoId: int("video_id").notNull(),
  pointsEarned: int("points_earned").notNull(),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// badges  (condition jsonb → json)
// ---------------------------------------------------------------------------
export const badges = mysqlTable("badges", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull().default(""),
  iconName: varchar("icon_name", { length: 100 }).notNull().default("award"),
  condition: json("condition").$type<{ type: string; threshold: number }>().notNull(),
  pointsBonus: int("points_bonus").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// user_badges
// ---------------------------------------------------------------------------
export const userBadges = mysqlTable(
  "user_badges",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    badgeKey: varchar("badge_key", { length: 255 }).notNull(),
    earnedAt: timestamp("earned_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueUserBadge: unique().on(table.userId, table.badgeKey),
  })
);

// ---------------------------------------------------------------------------
// referral_tiers
// ---------------------------------------------------------------------------
export const referralTiers = mysqlTable("referral_tiers", {
  id: int("id").autoincrement().primaryKey(),
  label: varchar("label", { length: 100 }).notNull(),
  minReferrals: int("min_referrals").notNull(),
  maxReferrals: int("max_referrals"),
  multiplier: decimal("multiplier", { precision: 4, scale: 2 }).notNull().default("1.00"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// qr_email_leads
// ---------------------------------------------------------------------------
export const qrEmailLeads = mysqlTable("qr_email_leads", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  originalUrl: text("original_url").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// shortened_urls
// ---------------------------------------------------------------------------
export const shortenedUrls = mysqlTable("shortened_urls", {
  id: int("id").autoincrement().primaryKey(),
  shortCode: varchar("short_code", { length: 100 }).notNull().unique(),
  originalUrl: text("original_url").notNull(),
  clicks: int("clicks").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// level_history
// ---------------------------------------------------------------------------
export const levelHistory = mysqlTable("level_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  level: int("level").notNull(),
  reachedAt: timestamp("reached_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// profile_links
// ---------------------------------------------------------------------------
export const profileLinks = mysqlTable("profile_links", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  title: varchar("title", { length: 100 }).notNull(),
  url: text("url").notNull(),
  displayOrder: int("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// ad_placements
// ---------------------------------------------------------------------------
export const adPlacements = mysqlTable("ad_placements", {
  id: int("id").autoincrement().primaryKey(),
  position: varchar("position", { length: 50 }).notNull().default("top"),
  adCode: text("ad_code").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Insert Schemas (re-exported so storage layer can use them)
// ---------------------------------------------------------------------------
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
  price: z.union([z.string(), z.number()]).transform((val) => String(val)),
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
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({ id: true, createdAt: true });
export const insertPointListingSchema = createInsertSchema(pointListings).omit({ id: true, createdAt: true });
export const insertListingCommentSchema = createInsertSchema(listingComments).omit({ id: true, createdAt: true });
export const insertClassroomVideoSchema = createInsertSchema(classroomVideos).omit({ id: true, createdAt: true });
export const insertClassroomCompletionSchema = createInsertSchema(classroomCompletions).omit({ id: true, completedAt: true });
export const insertBadgeSchema = createInsertSchema(badges).omit({ id: true, createdAt: true });
export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({ id: true, earnedAt: true });
export const insertReferralTierSchema = createInsertSchema(referralTiers).omit({ id: true, createdAt: true });
export const insertQrEmailLeadSchema = createInsertSchema(qrEmailLeads).omit({ id: true, createdAt: true });
export const insertShortenedUrlSchema = createInsertSchema(shortenedUrls).omit({ id: true, createdAt: true });
export const insertLevelHistorySchema = createInsertSchema(levelHistory).omit({ id: true, reachedAt: true });
export const insertProfileLinkSchema = createInsertSchema(profileLinks)
  .omit({ id: true, userId: true, createdAt: true })
  .extend({
    title: z.string().min(1, "Title is required").max(100),
    url: z.string().url("Must be a valid URL"),
    displayOrder: z.number().int().default(0),
    isActive: z.boolean().default(true),
  });
export const insertAdPlacementSchema = createInsertSchema(adPlacements)
  .omit({ id: true, createdAt: true })
  .extend({
    position: z.enum(["top", "middle", "left", "right", "bottom", "all"]),
    adCode: z.string().min(1, "Ad code is required"),
  });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
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
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type PointListing = typeof pointListings.$inferSelect;
export type ListingComment = typeof listingComments.$inferSelect;
export type ClassroomVideo = typeof classroomVideos.$inferSelect;
export type ClassroomCompletion = typeof classroomCompletions.$inferSelect;
export type Badge = typeof badges.$inferSelect;
export type UserBadge = typeof userBadges.$inferSelect;
export type ReferralTier = typeof referralTiers.$inferSelect;
export type QrEmailLead = typeof qrEmailLeads.$inferSelect;
export type ShortenedUrl = typeof shortenedUrls.$inferSelect;
export type LevelHistory = typeof levelHistory.$inferSelect;
export type ProfileLink = typeof profileLinks.$inferSelect;
export type AdPlacement = typeof adPlacements.$inferSelect;
export type AppSetting = typeof appSettings.$inferSelect;

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
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type InsertPointListing = z.infer<typeof insertPointListingSchema>;
export type InsertListingComment = z.infer<typeof insertListingCommentSchema>;
export type InsertClassroomVideo = z.infer<typeof insertClassroomVideoSchema>;
export type InsertClassroomCompletion = z.infer<typeof insertClassroomCompletionSchema>;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;
export type InsertReferralTier = z.infer<typeof insertReferralTierSchema>;
export type InsertQrEmailLead = z.infer<typeof insertQrEmailLeadSchema>;
export type InsertShortenedUrl = z.infer<typeof insertShortenedUrlSchema>;
export type InsertLevelHistory = z.infer<typeof insertLevelHistorySchema>;
export type InsertProfileLink = z.infer<typeof insertProfileLinkSchema>;
export type InsertAdPlacement = z.infer<typeof insertAdPlacementSchema>;

// ---------------------------------------------------------------------------
// Zod validation schemas for API routes
// (These were in schema.ts but must also exist here for routes.ts imports)
// ---------------------------------------------------------------------------

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
  platform: z.enum(
    ["youtube", "tiktok", "facebook", "instagram", "twitter", "whatsapp", "telegram", "linkedin", "snapchat", "pinterest", "discord", "threads", "survey"],
    { errorMap: () => ({ message: "Invalid platform" }) }
  ),
  type: z.enum(["like", "follow", "comment", "share", "view", "subscribe"], {
    errorMap: () => ({ message: "Invalid task type" }),
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
  platform: z
    .enum(["youtube", "tiktok", "facebook", "instagram", "twitter", "whatsapp", "telegram", "linkedin", "snapchat", "pinterest", "discord", "threads", "survey"])
    .optional(),
  type: z.enum(["like", "follow", "comment", "share", "view", "subscribe"]).optional(),
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
  role: z.enum(["admin", "member", "guest"], {
    errorMap: () => ({ message: "Invalid role. Must be 'admin', 'member', or 'guest'" }),
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
  price: z.union([z.string(), z.number()]).transform((val) => String(val)).optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const updatePromotionRequestSchema = z.object({
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
  paymentStatus: z.enum(["paid", "unpaid"]).optional(),
  assignedTo: z.number().int().positive().optional(),
  adminNotes: z.string().optional(),
});

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

// ---------------------------------------------------------------------------
// TypeScript interfaces / helper types (from original schema.ts)
// ---------------------------------------------------------------------------

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

export interface AllocationCriteria {
  userLevel: { min: number; max: number };
  activityScore: number;
  geography: string[];
  previousTaskHistory: "include_recent" | "exclude_recent" | "any";
  pointsRange: { min: number; max: number };
  engagementLevel: "high" | "medium" | "low" | "any";
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
    difficultyProgression: "linear" | "adaptive" | "random";
    refreshInterval: number;
  };
  qualityControl: {
    minimumCompletionRate: number;
    maximumReports: number;
    verificationRequired: boolean;
  };
}
