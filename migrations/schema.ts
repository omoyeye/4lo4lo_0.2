import { pgTable, unique, serial, integer, date, boolean, text, timestamp, numeric, index, varchar, json } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const dailyTaskAllocation = pgTable("daily_task_allocation", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	taskId: integer("task_id").notNull(),
	allocatedDate: date("allocated_date").notNull(),
	isCompleted: boolean("is_completed").default(false).notNull(),
}, (table) => [
	unique("daily_task_allocation_user_id_task_id_allocated_date_unique").on(table.userId, table.taskId, table.allocatedDate),
]);

export const milestones = pgTable("milestones", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	target: integer().notNull(),
	category: text().notNull(),
	icon: text().notNull(),
	iconBgColor: text("icon_bg_color").notNull(),
	progressColor: text("progress_color").notNull(),
	reward: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const payouts = pgTable("payouts", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	amount: integer().notNull(),
	status: text().default('pending').notNull(),
	paymentMethod: text("payment_method").notNull(),
	paymentDetails: text("payment_details"),
	requestedAt: timestamp("requested_at", { mode: 'string' }).defaultNow().notNull(),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	processedBy: integer("processed_by"),
});

export const referrals = pgTable("referrals", {
	id: serial().primaryKey().notNull(),
	referrerId: integer("referrer_id").notNull(),
	referredId: integer("referred_id").notNull(),
	pointsAwarded: integer("points_awarded").default(0).notNull(),
	isProcessed: boolean("is_processed").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	processedAt: timestamp("processed_at", { mode: 'string' }),
});

export const userMilestones = pgTable("user_milestones", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	milestoneId: integer("milestone_id").notNull(),
	progress: integer().default(0).notNull(),
	completed: boolean().default(false).notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	rewardClaimed: boolean("reward_claimed").default(false).notNull(),
});

export const userTasks = pgTable("user_tasks", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	taskId: integer("task_id").notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }).notNull(),
	pointsEarned: integer("points_earned").notNull(),
	verificationStatus: text("verification_status").default('pending').notNull(),
	verifiedAt: timestamp("verified_at", { mode: 'string' }),
	verifiedBy: integer("verified_by"),
});

export const admins = pgTable("admins", {
	id: serial().primaryKey().notNull(),
	username: text().notNull(),
	password: text().notNull(),
	email: text().notNull(),
	role: text().default('admin').notNull(),
	lastLogin: timestamp("last_login", { mode: 'string' }),
	status: text().default('active').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("admins_username_unique").on(table.username),
]);

export const promotionPlans = pgTable("promotion_plans", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	engagementCount: integer("engagement_count").notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	displayOrder: integer("display_order").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	updatedBy: integer("updated_by").notNull(),
});

export const promotionRequests = pgTable("promotion_requests", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	planId: integer("plan_id").notNull(),
	socialMediaUrl: text("social_media_url").notNull(),
	platform: text().notNull(),
	engagementType: text("engagement_type").notNull(),
	additionalDetails: text("additional_details"),
	status: text().default('pending').notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	paymentStatus: text("payment_status").default('unpaid').notNull(),
	requestedAt: timestamp("requested_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	assignedTo: integer("assigned_to"),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	adminNotes: text("admin_notes"),
	customEngagementCount: integer("custom_engagement_count"),
	stripeSessionId: text("stripe_session_id"),
});

export const taskClicks = pgTable("task_clicks", {
	id: serial().primaryKey().notNull(),
	taskId: integer("task_id").notNull(),
	userId: integer("user_id").notNull(),
	clickedAt: timestamp("clicked_at", { mode: 'string' }).defaultNow().notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	sessionId: text("session_id"),
	convertedToCompletion: boolean("converted_to_completion").default(false).notNull(),
});

export const socialAccounts = pgTable("social_accounts", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	provider: text().notNull(),
	providerId: text("provider_id").notNull(),
	username: text(),
	displayName: text("display_name"),
	profileUrl: text("profile_url"),
	avatarUrl: text("avatar_url"),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	tokenExpiry: timestamp("token_expiry", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	isVerified: boolean("is_verified").default(false).notNull(),
	lastVerifiedAt: timestamp("last_verified_at", { mode: 'string' }),
});

export const referralRewardClaims = pgTable("referral_reward_claims", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	referralCount: integer("referral_count").notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	status: text().default('pending').notNull(),
	requestedAt: timestamp("requested_at", { mode: 'string' }).defaultNow().notNull(),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	processedBy: integer("processed_by"),
	paymentMethod: text("payment_method"),
	paymentDetails: text("payment_details"),
});

export const tasks = pgTable("tasks", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	taskUrl: text("task_url").notNull(),
	platform: text().notNull(),
	type: text().notNull(),
	points: integer().default(50).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	createdBy: integer("created_by").notNull(),
	difficulty: text().default('easy'),
	estimatedTime: integer("estimated_time"),
	requiresVerification: boolean("requires_verification").default(false),
	verificationInstructions: text("verification_instructions"),
	isPromoted: boolean("is_promoted").default(false),
	isFeatured: boolean("is_featured").default(false),
	tags: text().array(),
	requirements: text(),
	maxCompletions: integer("max_completions"),
	currentCompletions: integer("current_completions").default(0),
});

export const session = pgTable("session", {
	sid: varchar().primaryKey().notNull(),
	sess: json().notNull(),
	expire: timestamp({ precision: 6, mode: 'string' }).notNull(),
}, (table) => [
	index("IDX_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const achievements = pgTable("achievements", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text().notNull(),
	icon: text().notNull(),
	type: text().notNull(),
	requirement: integer().notNull(),
	pointsReward: integer("points_reward").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const userAchievements = pgTable("user_achievements", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	achievementId: integer("achievement_id").notNull(),
	earnedAt: timestamp("earned_at", { mode: 'string' }).defaultNow().notNull(),
	progress: integer().default(0).notNull(),
});

export const payoutRequests = pgTable("payout_requests", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	amount: integer().notNull(),
	paymentMethod: text("payment_method").notNull(),
	paymentDetails: text("payment_details").notNull(),
	status: text().default('pending').notNull(),
	requestedAt: timestamp("requested_at", { mode: 'string' }).defaultNow().notNull(),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	processedBy: integer("processed_by"),
	notes: text(),
	transactionId: text("transaction_id"),
});

export const userPreferences = pgTable("user_preferences", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	emailNotifications: boolean("email_notifications").default(true).notNull(),
	taskNotifications: boolean("task_notifications").default(true).notNull(),
	achievementNotifications: boolean("achievement_notifications").default(true).notNull(),
	payoutNotifications: boolean("payout_notifications").default(true).notNull(),
	preferredTaskTypes: text("preferred_task_types").array(),
	minimumPointsPerTask: integer("minimum_points_per_task").default(10),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("user_preferences_user_id_key").on(table.userId),
]);

export const weeklyLeaderboard = pgTable("weekly_leaderboard", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	weekStart: date("week_start").notNull(),
	pointsEarned: integer("points_earned").default(0).notNull(),
	tasksCompleted: integer("tasks_completed").default(0).notNull(),
	rank: integer(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: text().notNull(),
	password: text().notNull(),
	email: text().notNull(),
	points: integer().default(0).notNull(),
	cashablePoints: integer("cashable_points").default(0).notNull(),
	pendingPoints: integer("pending_points").default(0).notNull(),
	level: integer().default(1).notNull(),
	progress: integer().default(0).notNull(),
	globalRank: integer("global_rank"),
	role: text().default('member'),
	referralCode: text("referral_code").notNull(),
	referredBy: integer("referred_by"),
	dailyTasksCompleted: integer("daily_tasks_completed").default(0).notNull(),
	lastTaskDate: date("last_task_date"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	displayName: text("display_name"),
	bio: text(),
	profilePicture: text("profile_picture"),
	theme: text().default('light'),
	emailVerified: boolean("email_verified").default(false).notNull(),
	verificationToken: text("verification_token"),
	verificationTokenExpiry: timestamp("verification_token_expiry", { mode: 'string' }),
	googleId: text("google_id"),
	avatar: text(),
	platform: text().default('local'),
	region: text().default('Unknown'),
	country: text().default('Unknown'),
}, (table) => [
	unique("users_username_unique").on(table.username),
	unique("users_referral_code_unique").on(table.referralCode),
	unique("users_google_id_key").on(table.googleId),
]);

export const passwordResetTokens = pgTable("password_reset_tokens", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	token: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	used: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("password_reset_tokens_token_key").on(table.token),
]);
