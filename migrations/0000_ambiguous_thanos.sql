CREATE TABLE "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"last_login" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admins_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "allocation_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" integer NOT NULL,
	"metric_name" text NOT NULL,
	"metric_value" numeric(10, 4) NOT NULL,
	"metric_unit" text,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" integer,
	"task_id" integer,
	"user_segment" text
);
--> statement-breakpoint
CREATE TABLE "batch_task_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" integer NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"allocated_at" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'allocated' NOT NULL,
	"clicked_at" timestamp,
	"completed_at" timestamp,
	"points_earned" integer DEFAULT 0,
	"expires_at" timestamp,
	"user_segment" text,
	"allocation_reason" text
);
--> statement-breakpoint
CREATE TABLE "daily_task_allocation" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"task_id" integer NOT NULL,
	"allocated_date" date NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "daily_task_allocation_user_id_task_id_allocated_date_unique" UNIQUE("user_id","task_id","allocated_date")
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"target" integer NOT NULL,
	"category" text NOT NULL,
	"icon" text NOT NULL,
	"icon_bg_color" text NOT NULL,
	"progress_color" text NOT NULL,
	"reward" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text NOT NULL,
	"payment_details" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"processed_by" integer
);
--> statement-breakpoint
CREATE TABLE "promotion_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"engagement_count" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"social_media_url" text NOT NULL,
	"platform" text NOT NULL,
	"engagement_type" text NOT NULL,
	"additional_details" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"custom_engagement_count" integer,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"stripe_session_id" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"assigned_to" integer,
	"completed_at" timestamp,
	"admin_notes" text
);
--> statement-breakpoint
CREATE TABLE "referral_reward_claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"referral_count" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"processed_by" integer,
	"payment_method" text,
	"payment_details" text
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_id" integer NOT NULL,
	"referred_id" integer NOT NULL,
	"points_awarded" integer DEFAULT 0 NOT NULL,
	"is_processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "system_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"metric_name" text NOT NULL,
	"metric_value" numeric(15, 4) NOT NULL,
	"metric_unit" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"server_node" text,
	"alert_threshold" numeric(15, 4),
	"is_alert" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"target_user_count" integer NOT NULL,
	"actual_allocated_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"allocation_criteria" text,
	"strategy" text DEFAULT 'random' NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"scheduled_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"paused_by" integer,
	"paused_reason" text
);
--> statement-breakpoint
CREATE TABLE "task_clicks" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"clicked_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"session_id" text,
	"converted_to_completion" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_performance" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"date" date NOT NULL,
	"total_allocations" integer DEFAULT 0 NOT NULL,
	"total_clicks" integer DEFAULT 0 NOT NULL,
	"total_completions" integer DEFAULT 0 NOT NULL,
	"average_time_to_click" integer DEFAULT 0,
	"average_time_to_complete" integer DEFAULT 0,
	"click_through_rate" numeric(5, 2) DEFAULT '0',
	"completion_rate" numeric(5, 2) DEFAULT '0',
	"user_satisfaction_score" numeric(3, 2) DEFAULT '0',
	"revenue_generated" numeric(10, 2) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"task_url" text NOT NULL,
	"platform" text NOT NULL,
	"type" text NOT NULL,
	"points" integer DEFAULT 50 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"max_completions" integer,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date" date NOT NULL,
	"login_count" integer DEFAULT 0 NOT NULL,
	"tasks_viewed" integer DEFAULT 0 NOT NULL,
	"tasks_clicked" integer DEFAULT 0 NOT NULL,
	"tasks_completed" integer DEFAULT 0 NOT NULL,
	"time_spent_minutes" integer DEFAULT 0 NOT NULL,
	"engagement_score" numeric(5, 2) DEFAULT '0',
	"activity_level" text DEFAULT 'low',
	"last_activity_at" timestamp,
	"device_info" text,
	"geo_location" text
);
--> statement-breakpoint
CREATE TABLE "user_milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"milestone_id" integer NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"reward_claimed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"preferred_platforms" text,
	"preferred_task_types" text,
	"optimal_task_count" integer DEFAULT 5,
	"best_active_hours" text,
	"notification_preferences" text,
	"difficulty_preference" text DEFAULT 'medium',
	"points_motivation" integer DEFAULT 5,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_segments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"criteria" text NOT NULL,
	"user_count" integer DEFAULT 0 NOT NULL,
	"average_engagement" numeric(5, 2) DEFAULT '0',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"task_id" integer NOT NULL,
	"completed_at" timestamp NOT NULL,
	"points_earned" integer NOT NULL,
	"verification_status" text DEFAULT 'pending' NOT NULL,
	"verified_at" timestamp,
	"verified_by" integer
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"google_id" text,
	"avatar" text,
	"facebook_handle" text,
	"instagram_handle" text,
	"tiktok_handle" text,
	"youtube_handle" text,
	"platform" text DEFAULT 'local',
	"country" text DEFAULT 'Unknown',
	"points" integer DEFAULT 0 NOT NULL,
	"cashable_points" integer DEFAULT 0 NOT NULL,
	"pending_points" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"global_rank" integer,
	"role" text DEFAULT 'member',
	"region" text DEFAULT 'Unknown',
	"referral_code" text NOT NULL,
	"referred_by" integer,
	"daily_tasks_completed" integer DEFAULT 0 NOT NULL,
	"last_task_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code")
);
