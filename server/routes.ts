import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertUserSchema, 
  insertAdminSchema, 
  insertPromotionPlanSchema, 
  insertPromotionRequestSchema, 
  promotionPlans, 
  promotionRequests,
  taskClicks,
  taskBatches,
  batchTaskAllocations,
  tasks,
  users,
  appSettings,
  adminLoginSchema,
  adminRegisterSchema,
  taskCompleteSchema,
  taskClickSchema,
  createTaskSchema,
  updateTaskSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
  updateUserRoleSchema,
  updateUserPasswordSchema,
  updatePromotionPlanSchema,
  updatePromotionRequestSchema,
  updateUserSchema,
  insertClassroomVideoSchema,
  insertBadgeSchema,
  insertReferralTierSchema,
  createListingSchema,
  createListingCommentSchema,
  sellListingSchema,
  insertAdPlacementSchema,
  insertProfileLinkSchema,
  type PointListing,
  type InsertBadge,
  type InsertReferralTier
} from "@shared/schema.mysql";
import { setupAuth } from "./auth";
import passport from "passport";
import { nanoid } from "nanoid";
import crypto, { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "./db";
import { eq, sql, desc, and } from "drizzle-orm";
import rateLimit from 'express-rate-limit';
import Stripe from "stripe";

// Health check rate limiter
const healthCheckLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 health check requests per windowMs
  message: { message: "Too many health check requests" },
  standardHeaders: true,
  legacyHeaders: false,
});
import session from "express-session";
import { initializeRealTimeService, getRealTimeService } from "./websocket";
import { getTaskAllocator, initializeTaskAllocator } from "./task-allocator";
import { dashboardCache, cacheKeys } from "./cache";
import { notificationService } from "./notification-service";
import { initializeContentScheduler } from "./services/content-scheduler";

// Extend session interface to include admin properties
declare module "express-session" {
  interface SessionData {
    admin?: {
      id: number;
      username: string;
      isAdmin: boolean;
      role: string;
    };
  }
}

// Initialize Stripe with secret key - referenced from Stripe blueprint integration
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

export async function registerRoutes(app: Express, httpServer?: any): Promise<Server> {
  // Enhanced health check endpoint
  app.get("/api/health", healthCheckLimiter, async (_req, res) => {
    try {
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      // Test database connection
      let dbStatus = "healthy";
      try {
        await storage.getUser(1);
      } catch (dbError) {
        dbStatus = "error";
      }
      
      const health = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: Math.floor(uptime),
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024)
        },
        database: dbStatus,
        environment: process.env.NODE_ENV || 'development'
      };
      
      res.status(200).json(health);
    } catch (error) {
      res.status(503).json({ 
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Stripe Webhook Handler - MUST be before setupAuth to use raw body parser
  // Referenced from Stripe blueprint integration
  app.post(
    "/api/webhooks/stripe",
    express.raw({ type: 'application/json' }),
    async (req: Request, res: Response) => {
      const sig = req.headers['stripe-signature'];
      
      if (!sig) {
        return res.status(400).send('No signature provided');
      }

      let event: Stripe.Event;

      try {
        // Verify webhook signature
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
          console.error('STRIPE_WEBHOOK_SECRET is not set');
          return res.status(500).send('Webhook secret not configured');
        }

        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          webhookSecret
        );
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }

      // Handle the checkout.session.completed event
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        
        try {
          // Find the promotion request by stripeSessionId
          const [promotionRequest] = await db
            .select()
            .from(promotionRequests)
            .where(eq(promotionRequests.stripeSessionId, session.id));

          if (!promotionRequest) {
            console.error('Promotion request not found for session:', session.id);
            return res.status(404).send('Promotion request not found');
          }

          // Update promotion request: set paymentStatus to "paid", status to "pending"
          const [updatedRequest] = await db
            .update(promotionRequests)
            .set({
              paymentStatus: 'paid',
              status: 'pending',
              updatedAt: new Date(),
            })
            .where(eq(promotionRequests.stripeSessionId, session.id))
            .returning();

          console.log('✅ Payment successful for promotion request:', updatedRequest.id);

          // Send WebSocket notification to user about successful payment
          try {
            const realTimeService = getRealTimeService();
            if (realTimeService) {
              realTimeService.broadcastToUser(promotionRequest.userId, {
                type: 'payment_success',
                data: {
                  message: 'Payment successful! Your promotion request is being processed.',
                  promotionRequestId: updatedRequest.id,
                },
                timestamp: Date.now(),
              });
            }
          } catch (wsError) {
            console.error('Failed to send WebSocket notification:', wsError);
            // Don't fail the webhook if WS fails
          }

          res.status(200).json({ received: true, promotionRequestId: updatedRequest.id });
        } catch (error) {
          console.error('Error processing webhook:', error);
          return res.status(500).send('Error processing payment');
        }
      } else {
        // Return 200 for other event types we don't handle
        res.status(200).json({ received: true });
      }
    }
  );

  // Setup authentication routes - this handles /api/login, /api/register, /api/logout, and /api/user
  setupAuth(app);

  // Strict superadmin middleware - only allows superadmin role
  function requireSuperadmin(req: Request, res: Response, next: NextFunction) {
    // Check if admin session exists with superadmin role
    const isSuperadminRole = req.session?.admin?.role === 'superadmin';
    
    if (!isSuperadminRole) {
      return res.status(403).json({ 
        message: "Access denied: Superadmin privileges required" 
      });
    }
    
    next();
  }

  // Admin middleware - allows both admin and superadmin roles
  function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const role = req.session?.admin?.role;
    if (role !== 'admin' && role !== 'superadmin') {
      return res.status(403).json({ 
        message: "Access denied: Admin privileges required" 
      });
    }
    next();
  }
  
  // Helper to check if request has superadmin privileges (for conditional logic)
  function isSuperadmin(req: Request): boolean {
    return req.session?.admin?.role === 'superadmin';
  }
  
  // Enhanced error handler with better logging and user-friendly messages
  function handleError(res: Response, error: any, message: string = "Internal server error", statusCode: number = 500) {
    // Log detailed error for debugging
    console.error(`[${new Date().toISOString()}] ${message}:`, {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      statusCode,
      timestamp: new Date().toISOString()
    });

    // Return user-friendly error response
    const errorResponse = {
      message,
      error: process.env.NODE_ENV === 'development' 
        ? (error instanceof Error ? error.message : "Unknown error")
        : "An error occurred while processing your request",
      timestamp: new Date().toISOString(),
      code: statusCode
    };
    
    return res.status(statusCode).json(errorResponse);
  }

  // Helper function for comparing hashed passwords
  const scryptAsync = promisify(scrypt);
  async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
    try {
      // Handle both dot and colon separated formats
      let salt: string, hashed: string;
      
      if (stored.includes(':')) {
        // New format: hash:salt  
        [hashed, salt] = stored.split(':');
      } else {
        // Old format: hash.salt
        [hashed, salt] = stored.split('.');
      }
      
      if (!salt || !hashed) {
        console.error("Invalid password format:", stored);
        return false;
      }
      
      const hashedBuf = Buffer.from(hashed, 'hex');
      const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      
      // Ensure buffers are the same length for timing-safe comparison
      if (hashedBuf.length !== suppliedBuf.length) {
        console.error("Buffer length mismatch:", hashedBuf.length, "vs", suppliedBuf.length);
        return false;
      }
      
      return timingSafeEqual(hashedBuf, suppliedBuf);
    } catch (error) {
      console.error("Password comparison error:", error);
      return false;
    }
  }

  // Admin status endpoint - verifies current admin session
  app.get("/api/admin/status", (req: Request, res: Response) => {
    const adminSession = req.session?.admin;
    
    if (!adminSession || (adminSession.role !== 'superadmin' && adminSession.role !== 'admin')) {
      return res.status(401).json({ 
        isAdmin: false,
        message: "Not authenticated as admin" 
      });
    }
    
    return res.status(200).json({
      isAdmin: true,
      role: adminSession.role,
      username: adminSession.username,
      id: adminSession.id
    });
  });

  // Admin login route (separate from regular auth)
  app.post("/api/auth/admin/login", async (req: Request, res: Response) => {
    try {
      const validatedData = adminLoginSchema.parse(req.body);
      const { username, password } = validatedData;

      // Authenticate against the admin table in database
      const admin = await storage.getAdminByUsername(username);
      
      if (!admin) {
        return res.status(401).json({ message: "Invalid admin credentials" });
      }

      // Check password using the same method as regular users
      const isValidPassword = await comparePasswords(password, admin.password);
      
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid admin credentials" });
      }

      // Allow both admin and superadmin roles
      if (admin.role !== 'superadmin' && admin.role !== 'admin') {
        return res.status(403).json({ message: "Access denied: Insufficient privileges" });
      }

      // Update last login
      await storage.updateAdminLastLogin(admin.id);

      // Set admin session
      req.session.admin = {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        isAdmin: true
      };

      return res.status(200).json({
        id: admin.id,
        username: admin.username,
        role: admin.role,
        status: admin.status,
        message: "Admin login successful"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      return handleError(res, error, "Admin login failed");
    }
  });

  // Protect all admin routes (except login and status check) with admin middleware
  app.use("/api/admin", (req: Request, res: Response, next: NextFunction) => {
    // Allow status check and login without authentication
    if (req.path === "/status" || req.path === "/login") {
      return next();
    }
    // Routes that require superadmin only (managing other admins)
    if (req.path === "/register" || req.path.startsWith("/admins")) {
      return requireSuperadmin(req, res, next);
    }
    // All other admin routes require admin or superadmin
    return requireAdmin(req, res, next);
  });

  // ===== NOTIFICATION PREFERENCE ROUTES =====
  // Must be registered BEFORE /api/user/:id to prevent the dynamic segment swallowing the path.

  app.get("/api/user/notification-preferences", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Unauthorized" });
      const userId = (req.user as any).id;
      const prefs = await storage.getUserNotificationPreferences(userId);
      return res.json(prefs);
    } catch (error) {
      return handleError(res, error, "Failed to fetch notification preferences");
    }
  });

  app.put("/api/user/notification-preferences", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Unauthorized" });
      const userId = (req.user as any).id;
      const prefsSchema = z.record(z.boolean());
      const parsed = prefsSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid preferences format" });
      const updated = await storage.updateUserNotificationPreferences(userId, parsed.data);
      if (!updated) return res.status(404).json({ message: "User not found" });
      return res.json({ message: "Preferences updated" });
    } catch (error) {
      return handleError(res, error, "Failed to update notification preferences");
    }
  });

  // ===== REFERRAL TIER ROUTES =====
  // Must be registered BEFORE /api/user/:id to prevent the dynamic segment swallowing the path.

  app.get("/api/user/referral-tier", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Unauthorized" });
      const userId = (req.user as any).id;
      const result = await storage.getUserReferralTier(userId);
      return res.json(result);
    } catch (error) {
      return handleError(res, error, "Failed to fetch referral tier");
    }
  });

  app.get("/api/referral-tiers", async (req: Request, res: Response) => {
    try {
      const tiers = await storage.getReferralTiers();
      return res.json(tiers);
    } catch (error) {
      return handleError(res, error, "Failed to fetch referral tiers");
    }
  });

  // Get current user endpoint
  app.get("/api/user/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const requestingUser = req.user as { id: number };
      const isAdminSession = req.session?.admin?.role === 'admin' || req.session?.admin?.role === 'superadmin';
      if (requestingUser.id !== userId && !isAdminSession) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Don't send password in response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      return handleError(res, error, "Failed to fetch user");
    }
  });

  // Password Reset Routes
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      
      // Always return success to avoid email enumeration attacks
      if (!user) {
        return res.status(200).json({ 
          message: "If an account with that email exists, a password reset link has been sent" 
        });
      }

      // Generate reset token
      const resetToken = nanoid(32);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Save token to database
      await storage.createPasswordResetToken(user.id, resetToken, expiresAt);

      // Send email with reset link - use request origin or fallback to production URL
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const baseUrl = process.env.FRONTEND_URL || (host ? `${protocol}://${host}` : 'https://4lo4lo.site');
      const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
      
      console.log(`Password reset link generated: ${resetLink}`);
      
      const { sendPasswordResetEmail } = await import('./services/email');
      await sendPasswordResetEmail({
        username: user.username,
        email: user.email,
        resetLink
      });

      // Create in-app notification for admin about password reset request
      notificationService.notifyAdminPasswordReset(user.id, user.username, user.email)
        .catch(err => console.error("Failed to send password reset notification:", err));

      res.status(200).json({ 
        message: "If an account with that email exists, a password reset link has been sent" 
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      return handleError(res, error, "Failed to process password reset request");
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      // Get token from database
      const resetToken = await storage.getPasswordResetToken(token);

      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Check if token is expired
      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ message: "Reset token has expired" });
      }

      // Check if token was already used
      if (resetToken.used) {
        return res.status(400).json({ message: "Reset token has already been used" });
      }

      // Hash new password
      const scryptAsync = promisify(scrypt);
      const salt = crypto.randomBytes(16).toString("hex");
      const buf = (await scryptAsync(newPassword, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;

      // Update user password
      await storage.updateUserPassword(resetToken.userId, hashedPassword);

      // Mark token as used
      await storage.markTokenAsUsed(token);

      // Get user details for confirmation email
      const user = await storage.getUser(resetToken.userId);
      if (user && user.email) {
        // Send confirmation email
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const baseUrl = process.env.FRONTEND_URL || (host ? `${protocol}://${host}` : 'https://4lo4lo.site');
        const loginLink = `${baseUrl}/auth`;

        const { sendPasswordResetConfirmationEmail } = await import('./services/email');
        sendPasswordResetConfirmationEmail({
          username: user.username,
          email: user.email,
          loginLink
        }).catch(err => console.error("Failed to send confirmation email:", err));

        // Send in-app notification to user
        await storage.createNotification({
          userId: user.id,
          type: "security_alert",
          title: "Password Changed Successfully",
          message: "Your password has been reset. If you did not make this change, please contact support immediately.",
          isRead: false,
          adminOnly: false,
          createdAt: new Date()
        });
      }

      res.status(200).json({ message: "Password successfully reset" });
    } catch (error) {
      console.error('Reset password error:', error);
      return handleError(res, error, "Failed to reset password");
    }
  });

  // Tasks API routes - removed duplicate route

  // Update User Profile
  app.patch("/api/user/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const requestingUser = req.user as { id: number };
      const isAdminSession = req.session?.admin?.role === 'admin' || req.session?.admin?.role === 'superadmin';
      if (requestingUser.id !== userId && !isAdminSession) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const validatedData = updateUserSchema.parse(req.body);
      const updatedUser = await storage.updateUserProfile(userId, validatedData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return the updated user (excluding password)
      const { password, ...userWithoutPassword } = updatedUser;
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user profile:", error);
      return res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  // Check for new tasks since last check
  app.get("/api/tasks/new/:userId", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = parseInt(req.params.userId);
      const { lastCheck } = req.query;

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const requestingUser = req.user as { id: number };
      const isAdminSession = req.session?.admin?.role === 'admin' || req.session?.admin?.role === 'superadmin';
      if (requestingUser.id !== userId && !isAdminSession) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const tasks = await storage.getAvailableTasks(userId);
      
      if (lastCheck) {
        const lastCheckDate = new Date(lastCheck as string);
        const newTasks = tasks.filter(task => 
          new Date(task.createdAt) > lastCheckDate
        );
        
        return res.status(200).json({
          newTasks,
          totalNew: newTasks.length,
          totalAvailable: tasks.length
        });
      }

      res.status(200).json({
        newTasks: tasks,
        totalNew: tasks.length,
        totalAvailable: tasks.length
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to check for new tasks" });
    }
  });

  // Task API routes
  app.get("/api/tasks", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      const requestingUser = req.user as { id: number };
      const isAdminSession = req.session?.admin?.role === 'admin' || req.session?.admin?.role === 'superadmin';
      if (requestingUser.id !== Number(userId) && !isAdminSession) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get all active tasks and user's completed task IDs in parallel
      const [tasks, completedTaskIds] = await Promise.all([
        storage.getTasks(),
        storage.getCompletedTaskIds(Number(userId))
      ]);

      // Use Set for O(1) lookup of completed tasks
      const completedSet = new Set(completedTaskIds);

      // Filter available tasks efficiently
      const availableTasks = tasks.filter((task: any) => 
        task.isActive && !completedSet.has(task.id)
      );

      res.json(availableTasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to get tasks" });
    }
  });

  app.get("/api/tasks/available/:userId", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const requestingUser = req.user as { id: number };
      const isAdminSession = req.session?.admin?.role === 'admin' || req.session?.admin?.role === 'superadmin';
      if (requestingUser.id !== userId && !isAdminSession) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const tasks = await storage.getAvailableTasks(userId);
      res.status(200).json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to get available tasks" });
    }
  });

  app.get("/api/tasks/completed/:userId", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const requestingUser = req.user as { id: number };
      const isAdminSession = req.session?.admin?.role === 'admin' || req.session?.admin?.role === 'superadmin';
      if (requestingUser.id !== userId && !isAdminSession) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const tasks = await storage.getCompletedTasks(userId);
      res.status(200).json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to get completed tasks" });
    }
  });

  app.post("/api/tasks/complete", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const validatedData = taskCompleteSchema.parse(req.body);
      const { taskId, clickId } = validatedData;
      const userId = (req.user as { id: number }).id;

      console.log("Task completion request body:", req.body);
      console.log("userId:", userId, "taskId:", taskId);

      // Check if task is already completed
      const existingCompletion = await storage.getCompletedTasks(userId);
      const isAlreadyCompleted = existingCompletion.some(task => task.id === taskId);

      if (isAlreadyCompleted) {
        return res.status(200).json({ message: "Task already completed", alreadyCompleted: true });
      }

      const userTask = await storage.completeTask(userId, taskId);

      // Mark any task clicks as converted
      if (clickId) {
        // Update the specific click that led to this completion
        await db
          .update(taskClicks)
          .set({ convertedToCompletion: true })
          .where(eq(taskClicks.id, clickId));
      }

      // Send real-time notification to user about task completion
      const realTimeService = getRealTimeService();
      if (realTimeService) {
        const task = await storage.getTaskById(taskId);
        if (task) {
          realTimeService.broadcastTaskCompletion(userId, taskId, task);
        }
        
        // Update user's points in real-time
        const user = await storage.getUser(userId);
        if (user) {
          realTimeService.broadcastUserPointsUpdate(userId, user.points);
        }
      }

      // Check and award any newly unlocked badges (fire-and-forget — don't block the response)
      storage.checkAndAwardBadges(userId).catch(() => {});

      res.status(200).json(userTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Task completion error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to complete task" });
    }
  });

  // Task click tracking
  app.post("/api/tasks/click", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const validatedData = taskClickSchema.parse(req.body);
      const { taskId } = validatedData;
      const userId = (req.user as { id: number }).id;

      console.log("Task click request body:", req.body);
      console.log("userId:", userId, "taskId:", taskId);

      // Get IP and user agent from request
      const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const sessionId = req.sessionID || null;

      const taskClick = await storage.recordTaskClick({
        userId,
        taskId,
        ipAddress: ipAddress ? String(ipAddress) : null,
        userAgent: userAgent || null,
        sessionId,
        convertedToCompletion: false
      });

      res.status(201).json(taskClick);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to record task click" });
    }
  });

  // Admin task click analytics
  app.get("/api/admin/analytics/task-clicks", async (req: Request, res: Response) => {
    try {
      const analytics = await storage.getTaskClickAnalytics();
      res.status(200).json(analytics);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to get task click analytics" });
    }
  });

  app.get("/api/admin/task-clicks/:taskId", async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.taskId);

      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const clicks = await storage.getTaskClicks(taskId);
      const clickCount = await storage.getTaskClicksCount(taskId);

      res.status(200).json({ 
        clicks,
        total: clickCount
      });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to get task clicks" });
    }
  });

  // Dashboard API routes
  // Leaderboard
  app.get("/api/leaderboard", async (req: Request, res: Response) => {
    try {
      const allSettings = await db.select().from(appSettings);
      const settingsMap: Record<string, string> = {};
      for (const s of allSettings) settingsMap[s.key] = s.value ?? "";

      if (settingsMap.leaderboard_enabled === "false") {
        return res.status(403).json({ message: "Leaderboard is currently disabled" });
      }

      let period = (req.query.period as string) || 'alltime';
      if (period === 'all') period = 'alltime';
      if (!['alltime', 'weekly', 'monthly'].includes(period)) {
        return res.status(400).json({ message: "Invalid period. Use: alltime, weekly, monthly" });
      }
      const country = (req.query.country as string) || undefined;
      const limit = Math.max(1, Math.min(parseInt(settingsMap.leaderboard_limit || '50', 10) || 50, 500));
      const requestingUserId = req.isAuthenticated() && req.user ? (req.user as any).id as number : undefined;

      const result = await storage.getLeaderboard({
        period: period as 'alltime' | 'weekly' | 'monthly',
        country,
        limit,
        requestingUserId,
      });

      return res.json(result);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      return res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/dashboard/:userId", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const requestingUser = req.user as { id: number };
      const isAdminSession = req.session?.admin?.role === 'admin' || req.session?.admin?.role === 'superadmin';
      if (requestingUser.id !== userId && !isAdminSession) {
        return res.status(403).json({ message: "Forbidden" });
      }

      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('ETag', `W/"dashboard-${userId}-${Math.floor(Date.now() / 60000)}"`);


      // Check cache first
      const cacheKey = cacheKeys.dashboard(userId);
      const cached = dashboardCache.get(cacheKey);
      if (cached) {
        return res.status(200).json(cached);
      }

      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const [availableTasks, completed, taskCounts, pointsData, milestones, recentTasks, topEarners] = await Promise.all([
        storage.getAvailableTasks(userId),
        storage.getCompletedTasks(userId),
        storage.getTaskCounts(userId),
        storage.getUserPoints(userId),
        storage.getUserMilestones(userId),
        storage.getRecentTasks(userId, 5),
        storage.getTopEarners(5)
      ]);

      // Strip passwords from top earners
      const safeTopEarners = topEarners.map(({ password, ...user }) => user);

      const dashboardResult = {
        user: {
          id: user.id,
          username: user.username,
          points: user.points,
          level: user.level,
          progress: user.progress,
          globalRank: user.globalRank
        },
        taskCounts: {
          available: availableTasks.length || 0,
          completed: completed.length || 0,
        },
        pointsData,
        milestones,
        recentTasks,
        topEarners: safeTopEarners,
        lastUpdated: new Date().toISOString()
      };

      // Cache the result for 30 seconds
      dashboardCache.set(cacheKey, dashboardResult);

      res.status(200).json(dashboardResult);
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ message: "Failed to get dashboard data" });
    }
  });

  // ====== Notification Routes ======
  
  // Get user notifications
  app.get("/api/notifications", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const userId = (req.user as any).id;
      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await storage.getUserNotifications(userId, limit);
      res.status(200).json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Get unread notification count
  app.get("/api/notifications/unread-count", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const userId = (req.user as any).id;
      const count = await storage.getUnreadNotificationCount(userId);
      res.status(200).json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  // Mark single notification as read
  app.patch("/api/notifications/:id/read", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const notificationId = parseInt(req.params.id);
      if (isNaN(notificationId)) {
        return res.status(400).json({ message: "Invalid notification ID" });
      }
      
      const notification = await storage.markNotificationAsRead(notificationId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.status(200).json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.post("/api/notifications/mark-all-read", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const userId = (req.user as any).id;
      await storage.markAllNotificationsAsRead(userId);
      res.status(200).json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Delete notification
  app.delete("/api/notifications/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    try {
      const notificationId = parseInt(req.params.id);
      if (isNaN(notificationId)) {
        return res.status(400).json({ message: "Invalid notification ID" });
      }
      
      const deleted = await storage.deleteNotification(notificationId);
      if (!deleted) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.status(200).json({ message: "Notification deleted" });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Admin notification routes
  app.get("/api/admin/notifications", async (req: Request, res: Response) => {
    if (!req.session?.admin) {
      return res.status(401).json({ message: "Admin authentication required" });
    }
    
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await storage.getAdminNotifications(limit);
      res.status(200).json(notifications);
    } catch (error) {
      console.error("Error fetching admin notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/admin/notifications/unread-count", async (req: Request, res: Response) => {
    if (!req.session?.admin) {
      return res.status(401).json({ message: "Admin authentication required" });
    }
    
    try {
      const count = await storage.getUnreadAdminNotificationCount();
      res.status(200).json({ count });
    } catch (error) {
      console.error("Error fetching admin unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.post("/api/admin/notifications/mark-all-read", async (req: Request, res: Response) => {
    if (!req.session?.admin) {
      return res.status(401).json({ message: "Admin authentication required" });
    }
    
    try {
      await storage.markAllAdminNotificationsAsRead();
      res.status(200).json({ message: "All admin notifications marked as read" });
    } catch (error) {
      console.error("Error marking admin notifications as read:", error);
      res.status(500).json({ message: "Failed to mark notifications as read" });
    }
  });

  // =============================================
  // ADMIN BULK MESSAGING ROUTES
  // =============================================

  // Configure multer for file uploads
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const multerStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  });

  const upload = multer({
    storage: multerStorage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (_req, file, cb) => {
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('File type not allowed'));
      }
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static(uploadDir));

  // Upload file for email attachment
  app.post("/api/admin/upload", upload.single('file'), async (req: Request, res: Response) => {
    if (!req.session?.admin) {
      return res.status(401).json({ message: "Admin authentication required" });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      res.status(200).json({
        success: true,
        url: fileUrl,
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Send bulk email to all users
  app.post("/api/admin/bulk-email", async (req: Request, res: Response) => {
    if (!req.session?.admin) {
      return res.status(401).json({ message: "Admin authentication required" });
    }

    try {
      const { subject, htmlContent, textContent } = req.body;

      if (!subject || !htmlContent) {
        return res.status(400).json({ message: "Subject and HTML content are required" });
      }

      // Get all users with emails
      const allUsers = await storage.getAllUsers();
      const recipients = allUsers
        .filter(user => user.email)
        .map(user => ({ email: user.email, username: user.username }));

      if (recipients.length === 0) {
        return res.status(400).json({ message: "No verified users to send emails to" });
      }

      // Import and use the bulk email function
      const { sendBulkEmail } = await import('./services/email');
      const result = await sendBulkEmail({
        subject,
        htmlContent,
        textContent,
        recipients
      });

      res.status(200).json({
        message: `Email sent to ${result.success} users. Failed: ${result.failed}`,
        ...result
      });
    } catch (error) {
      console.error("Bulk email error:", error);
      res.status(500).json({ message: "Failed to send bulk emails" });
    }
  });

  // Send bulk in-app notification to all users
  app.post("/api/admin/bulk-notification", async (req: Request, res: Response) => {
    if (!req.session?.admin) {
      return res.status(401).json({ message: "Admin authentication required" });
    }

    try {
      const { title, message, type = "system_announcement" } = req.body;

      if (!title || !message) {
        return res.status(400).json({ message: "Title and message are required" });
      }

      // Get all users
      const allUsers = await storage.getAllUsers();
      let successCount = 0;

      // Send notification to each user
      for (const user of allUsers) {
        try {
          await storage.createNotification({
            userId: user.id,
            adminOnly: false,
            type,
            title,
            message,
            data: null,
            isRead: false
          });
          successCount++;
        } catch (err) {
          console.error(`Failed to create notification for user ${user.id}:`, err);
        }
      }

      // Also broadcast via WebSocket if available
      try {
        const websocketModule = await import('./websocket');
        const rtService = websocketModule.getRealTimeService();
        if (rtService) {
          rtService.broadcastToAllUsers({
            type: "new_notification",
            data: { type, title, message },
            timestamp: Date.now()
          });
        }
      } catch (err) {
        console.error("Failed to broadcast notification:", err);
      }

      res.status(200).json({
        message: `In-app notification sent to ${successCount} users`,
        success: successCount,
        total: allUsers.length
      });
    } catch (error) {
      console.error("Bulk notification error:", error);
      res.status(500).json({ message: "Failed to send bulk notifications" });
    }
  });

  // Send both email and in-app notification
  app.post("/api/admin/bulk-message", async (req: Request, res: Response) => {
    if (!req.session?.admin) {
      return res.status(401).json({ message: "Admin authentication required" });
    }

    try {
      const { subject, htmlContent, textContent, sendEmail, sendNotification } = req.body;

      if (!subject || !htmlContent) {
        return res.status(400).json({ message: "Subject and content are required" });
      }

      const results: any = {
        email: null,
        notification: null
      };

      // Get all users
      const allUsers = await storage.getAllUsers();

      // Send emails if requested
      if (sendEmail) {
        const recipients = allUsers
          .filter(user => user.email)
          .map(user => ({ email: user.email, username: user.username }));

        if (recipients.length > 0) {
          const { sendBulkEmail } = await import('./services/email');
          results.email = await sendBulkEmail({
            subject,
            htmlContent,
            textContent,
            recipients
          });
        } else {
          results.email = { success: 0, failed: 0, errors: ["No verified users"] };
        }
      }

      // Send in-app notifications if requested
      if (sendNotification) {
        let successCount = 0;
        const plainTextMessage = textContent || htmlContent.replace(/<[^>]*>/g, '').substring(0, 500);

        for (const user of allUsers) {
          try {
            await storage.createNotification({
              userId: user.id,
              adminOnly: false,
              type: "system_announcement",
              title: subject,
              message: plainTextMessage,
              data: null,
              isRead: false
            });
            successCount++;
          } catch (err) {
            console.error(`Failed notification for user ${user.id}:`, err);
          }
        }

        results.notification = {
          success: successCount,
          total: allUsers.length
        };

        // Broadcast via WebSocket
        try {
          const websocketModule = await import('./websocket');
          const rtService = websocketModule.getRealTimeService();
          if (rtService) {
            rtService.broadcastToAllUsers({
              type: "new_notification",
              data: { type: "system_announcement", title: subject, message: plainTextMessage },
              timestamp: Date.now()
            });
          }
        } catch (err) {
          console.error("Failed to broadcast:", err);
        }
      }

      res.status(200).json({
        message: "Bulk message sent successfully",
        results
      });
    } catch (error) {
      console.error("Bulk message error:", error);
      res.status(500).json({ message: "Failed to send bulk message" });
    }
  });

  // Get user count for preview
  app.get("/api/admin/user-count", async (req: Request, res: Response) => {
    if (!req.session?.admin) {
      return res.status(401).json({ message: "Admin authentication required" });
    }

    try {
      const allUsers = await storage.getAllUsers();
      const verifiedUsers = allUsers.filter(user => user.email);
      
      res.status(200).json({
        total: allUsers.length,
        verified: verifiedUsers.length,
        unverified: allUsers.length - verifiedUsers.length
      });
    } catch (error) {
      console.error("Error getting user count:", error);
      res.status(500).json({ message: "Failed to get user count" });
    }
  });

  // Admin account management
  app.post("/api/admin/register", async (req: Request, res: Response) => {
    try {
      const validatedData = adminRegisterSchema.parse(req.body);
      const { username, password, email, role } = validatedData;

      // Check if admin already exists
      const existingAdmin = await (storage as any).getAdminByUsername(username);
      if (existingAdmin) {
        return res.status(400).json({ message: "Admin username already exists" });
      }

      // Hash the password
      const salt = crypto.randomBytes(16).toString("hex");
      const buf = await scryptAsync(password, salt, 64) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;

      // Create the admin account
      const newAdmin = await (storage as any).createAdmin({
        username,
        password: hashedPassword,
        email,
        role,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Don't return the password
      const { password: _, ...adminWithoutPassword } = newAdmin;
      res.status(201).json(adminWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Admin registration error:", error);
      res.status(500).json({ message: "Failed to create admin account" });
    }
  });

  app.get("/api/admin/admins", async (_req: Request, res: Response) => {
    try {
      const admins = await (storage as any).getAllAdmins();
      // Strip passwords
      const safeAdmins = admins.map(({ password, ...admin }: any) => admin);
      res.status(200).json(safeAdmins);
    } catch (error) {
      res.status(500).json({ message: "Failed to get admins" });
    }
  });

  app.patch("/api/admin/admins/:id", async (req: Request, res: Response) => {
    try {
      const adminId = parseInt(req.params.id);
      const { username, email, password, role } = req.body;
      
      const updateData: any = { updatedAt: new Date() };
      if (username) updateData.username = username;
      if (email) updateData.email = email;
      if (role) updateData.role = role;
      
      if (password) {
        const salt = crypto.randomBytes(16).toString("hex");
        const buf = await scryptAsync(password, salt, 64) as Buffer;
        updateData.password = `${buf.toString("hex")}.${salt}`;
      }
      
      const updatedAdmin = await (storage as any).updateAdmin(adminId, updateData);
      const { password: _, ...safeAdmin } = updatedAdmin;
      res.status(200).json(safeAdmin);
    } catch (error) {
      console.error("Admin update error:", error);
      res.status(500).json({ message: "Failed to update admin account" });
    }
  });

  app.delete("/api/admin/admins/:id", async (req: Request, res: Response) => {
    try {
      const adminId = parseInt(req.params.id);
      await (storage as any).deleteAdmin(adminId);
      res.status(200).json({ message: "Admin deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete admin" });
    }
  });

  // Admin API routes
  app.get("/api/admin/stats", async (_req: Request, res: Response) => {
    try {
      const [allUsers, allTasks, userTasks, allPromotionRequests] = await Promise.all([
        storage.getAllUsers(),
        storage.getTasks(),
        storage.getAllUserTasks(),
        db.select().from(promotionRequests)
      ]);

      const activeTasks = allTasks.filter(task => task.isActive).length;
      const totalCompletions = Array.from(userTasks).length;
      const userGrowth = allUsers.reduce((acc, user) => {
        const date = new Date(user.createdAt).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const taskCompletionRate = allTasks.map(task => ({
        taskId: task.id,
        title: task.title,
        completions: Array.from(userTasks).filter(ut => ut.taskId === task.id).length
      }));

      // Calculate regional distribution
      const regionalDistribution = allUsers.reduce((acc, user) => {
        const region = user.region || 'Unknown';
        acc[region] = (acc[region] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate promotion metrics
      const totalPromotionRequests = allPromotionRequests.length;
      const totalPromotionRevenue = allPromotionRequests.reduce((sum: number, request: any) => {
        return sum + (parseFloat(request.price?.toString() || '0') || 0);
      }, 0);

      res.status(200).json({
        totalUsers: allUsers.length,
        activeTasks,
        totalTasks: allTasks.length,
        totalCompletions,
        totalPromotionRequests,
        totalPromotionRevenue: totalPromotionRevenue.toFixed(2),
        systemHealth: "Healthy",
        analytics: {
          userGrowth,
          taskCompletionRate,
          topPlatforms: allTasks.reduce((acc, task) => {
            acc[task.platform] = (acc[task.platform] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          regionalDistribution
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get admin stats" });
    }
  });

  // Admin User Management
  app.get("/api/admin/users", async (_req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      // Strip passwords
      const safeUsers = users.map(({ password, ...user }) => user);
      res.status(200).json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.post("/api/admin/users", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const newUser = await storage.createUser(userData);
      // Don't send password back
      const { password, ...userWithoutPassword } = newUser;

      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.delete("/api/admin/users/:id", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.patch("/api/admin/users/:id/role", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const validatedData = updateUserRoleSchema.parse(req.body);
      const updatedUser = await storage.updateUserRole(userId, validatedData.role);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Don't send password back
      const { password, ...userWithoutPassword } = updatedUser;

      res.status(200).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch("/api/admin/users/:id/password", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const validatedData = updateUserPasswordSchema.parse(req.body);
      const updatedUser = await storage.updateUserPassword(userId, validatedData.password);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  app.patch("/api/admin/users/:id/points", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const { points } = z.object({ points: z.number().int() }).parse(req.body);

      const userBefore = await storage.getUser(userId);
      if (!userBefore) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await storage.updateUserPoints(userId, points);
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update points" });
      }

      const realTimeService = getRealTimeService();
      if (realTimeService) {
        realTimeService.broadcastUserPointsUpdate(userId, updatedUser.points);
      }

      const { password, ...userWithoutPassword } = updatedUser;
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update points" });
    }
  });

  // Admin Task Management
  app.get("/api/admin/tasks", async (_req: Request, res: Response) => {
    try {
      const tasks = await storage.getTasks();
      res.status(200).json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to get tasks" });
    }
  });

  app.post("/api/admin/tasks", async (req: Request, res: Response) => {
    try {
      const validatedData = createTaskSchema.parse(req.body);

      const scheduledAt = validatedData.scheduledPublishAt
        ? new Date(validatedData.scheduledPublishAt)
        : null;
      const newTask = await storage.addTask({
        ...validatedData,
        isActive: scheduledAt ? false : true,
        maxCompletions: validatedData.maxCompletions ?? null,
        createdAt: new Date(),
        createdBy: req.user?.id || 1,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
        scheduledPublishAt: scheduledAt,
        category: null,
      });

      // Only notify users when the task is immediately active (not scheduled for later)
      if (newTask.isActive) {
        const realTimeService = getRealTimeService();
        if (realTimeService) {
          realTimeService.broadcastNewTask(newTask);
        }
        notificationService.notifyNewTask(newTask.title, newTask.id).catch(err => {
          console.error("Failed to send new task notifications:", err);
        });
      }

      res.status(201).json(newTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Task creation error:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch("/api/admin/tasks/:id", async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.id);

      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const validatedData = updateTaskSchema.parse(req.body);
      const clearingSchedule = "scheduledPublishAt" in req.body && req.body.scheduledPublishAt === null;
      const settingSchedule = "scheduledPublishAt" in req.body && req.body.scheduledPublishAt !== null;
      const taskUpdates: Partial<import("@shared/schema.mysql").Task> = {
        ...validatedData,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : (validatedData.expiresAt === null ? null : undefined),
        scheduledPublishAt: validatedData.scheduledPublishAt
          ? new Date(validatedData.scheduledPublishAt)
          : (validatedData.scheduledPublishAt === null ? null : undefined),
        // When schedule is set, deactivate so scheduler publishes it later
        ...(settingSchedule && !("isActive" in req.body) ? { isActive: false } : {}),
        // When schedule is explicitly cleared, auto-publish immediately
        ...(clearingSchedule && !("isActive" in req.body) ? { isActive: true } : {}),
      };
      const updatedTask = await storage.updateTask(taskId, taskUpdates);
      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.status(200).json(updatedTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/admin/tasks/:id", async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.id);

      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const success = await storage.deleteTask(taskId);
      if (!success) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // System Configuration
  app.get("/api/admin/milestones", async (_req: Request, res: Response) => {
    try {
      const milestones = await storage.getMilestones();
      res.status(200).json(milestones);
    } catch (error) {
      res.status(500).json({ message: "Failed to get milestones" });
    }
  });

  app.post("/api/admin/milestones", async (req: Request, res: Response) => {
    try {
      const validatedData = createMilestoneSchema.parse(req.body);
      const newMilestone = await storage.addMilestone({
        ...validatedData,
        createdAt: new Date()
      });
      res.status(201).json(newMilestone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create milestone" });
    }
  });

  app.patch("/api/admin/milestones/:id", async (req: Request, res: Response) => {
    try {
      const milestoneId = parseInt(req.params.id);

      if (isNaN(milestoneId)) {
        return res.status(400).json({ message: "Invalid milestone ID" });
      }

      const validatedData = updateMilestoneSchema.parse(req.body);
      const updatedMilestone = await storage.updateMilestone(milestoneId, validatedData);
      if (!updatedMilestone) {
        return res.status(404).json({ message: "Milestone not found" });
      }

      res.status(200).json(updatedMilestone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update milestone" });
    }
  });

  app.delete("/api/admin/milestones/:id", async (req: Request, res: Response) => {
    try {
      const milestoneId = parseInt(req.params.id);

      if (isNaN(milestoneId)) {
        return res.status(400).json({ message: "Invalid milestone ID" });
      }

      const success = await storage.deleteMilestone(milestoneId);
      if (!success) {
        return res.status(404).json({ message: "Milestone not found" });
      }

      res.status(200).json({ message: "Milestone deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete milestone" });
    }
  });

  // Analytics and Reports
  app.get("/api/admin/analytics/task-completions", async (_req: Request, res: Response) => {
    try {
      const taskCompletions = await storage.getTaskCompletionAnalytics();
      res.status(200).json(taskCompletions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get task completion analytics" });
    }
  });

  app.get("/api/admin/analytics/user-activity", async (_req: Request, res: Response) => {
    try {
      const userActivity = await storage.getUserActivityAnalytics();
      res.status(200).json(userActivity);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user activity analytics" });
    }
  });

  // System maintenance endpoints
  app.post("/api/admin/backup", async (_req: Request, res: Response) => {
    try {
      // Implementation would depend on your backup strategy
      // This is a placeholder that creates a timestamp
      const timestamp = new Date().toISOString();
      res.status(200).json({ 
        message: "Backup completed", 
        timestamp 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to create backup" });
    }
  });

  app.post("/api/admin/maintenance/toggle", async (_req: Request, res: Response) => {
    try {
      // Toggle maintenance mode - you would implement this based on your needs
      const isEnabled = Math.random() > 0.5; // Placeholder
      res.status(200).json({ isEnabled });
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle maintenance mode" });
    }
  });

  app.post("/api/admin/security/audit", async (_req: Request, res: Response) => {
    try {
      // Implementation would depend on your audit requirements
      const auditId = Date.now().toString();
      res.status(200).json({ 
        message: "Audit initiated", 
        auditId 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to initiate security audit" });
    }
  });

  // System status monitoring endpoints
  app.get("/api/admin/system/db-status", async (req: Request, res: Response) => {
    if (!isSuperadmin(req)) {
      return res.status(403).json({ message: "Superadmin access required" });
    }
    try {
      // Check database connection by performing a simple query
      await storage.getUser(1); // Just try to get a user to test connection

      res.status(200).json({ 
        connected: true,
        status: "healthy",
        lastChecked: new Date().toISOString()
      });
    } catch (error) {
      console.error("Database status check error:", error);
      res.status(200).json({ 
        connected: false,
        status: "error",
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/admin/system/metrics", async (req: Request, res: Response) => {
    if (!isSuperadmin(req)) {
      return res.status(403).json({ message: "Superadmin access required" });
    }
    try {
      // Get system metrics
      const memoryUsage = process.memoryUsage();

      // Get task and user counts as application metrics
      const userCount = (await storage.getAllUsers()).length;
      const taskCount = (await storage.getTasks()).length;
      const completedTaskCount = (await storage.getAllUserTasks()).length;

      res.status(200).json({
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024), // Convert to MB
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024)
        },
        application: {
          users: userCount,
          tasks: taskCount,
          completedTasks: completedTaskCount,
          taskCompletionRate: taskCount > 0 ? (completedTaskCount / taskCount).toFixed(2) : 0
        },
        server: {
          uptime: Math.floor(process.uptime()),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("System metrics error:", error);
      res.status(500).json({ message: "Failed to get system metrics" });
    }
  });

  // App Settings API routes
  app.get("/api/settings", async (_req: Request, res: Response) => {
    try {
      const settings = await db.select().from(appSettings);
      const settingsMap: Record<string, string> = {};
      settings.forEach(setting => {
        settingsMap[setting.key] = setting.value;
      });
      res.status(200).json(settingsMap);
    } catch (error) {
      console.error("Failed to get app settings:", error);
      res.status(500).json({ message: "Failed to get app settings" });
    }
  });

  app.get("/api/settings/:key", async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const [setting] = await db.select().from(appSettings).where(eq(appSettings.key, key));
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      res.status(200).json({ key: setting.key, value: setting.value });
    } catch (error) {
      console.error("Failed to get app setting:", error);
      res.status(500).json({ message: "Failed to get app setting" });
    }
  });

  app.put("/api/admin/settings/:key", async (req: Request, res: Response) => {
    if (!isSuperadmin(req)) {
      return res.status(403).json({ message: "Superadmin access required" });
    }
    try {
      const { key } = req.params;
      const { value } = req.body;

      if (typeof value !== 'string') {
        return res.status(400).json({ message: "Value must be a string" });
      }

      const [existingSetting] = await db.select().from(appSettings).where(eq(appSettings.key, key));
      
      if (existingSetting) {
        await db.update(appSettings)
          .set({ 
            value, 
            updatedAt: new Date(),
            updatedBy: req.session?.admin?.id || null
          })
          .where(eq(appSettings.key, key));
      } else {
        await db.insert(appSettings).values({
          key,
          value,
          updatedAt: new Date(),
          updatedBy: req.session?.admin?.id || null
        });
      }

      // Broadcast settings change to all connected users so their caches refresh immediately
      const realTimeService = getRealTimeService();
      if (realTimeService) {
        try {
          realTimeService.broadcastToAllUsers({
            type: 'settings_updated',
            data: { key, value },
            timestamp: Date.now()
          });
        } catch (broadcastError) {
          console.error("Failed to broadcast settings update:", broadcastError);
        }
      }

      res.status(200).json({ key, value, updated: true });
    } catch (error) {
      console.error("Failed to update app setting:", error);
      res.status(500).json({ message: "Failed to update app setting" });
    }
  });

  // Database cleanup endpoint - clears all test user data for launch preparation
  app.delete("/api/admin/cleanup-database", async (req: Request, res: Response) => {
    if (!isSuperadmin(req)) {
      return res.status(403).json({ message: "Superadmin access required" });
    }

    try {
      // Import all necessary tables for deletion
      const { 
        userTasks, 
        referrals, 
        referralRewardClaims, 
        payouts, 
        userMilestones, 
        dailyTaskAllocation,
        taskClicks,
        promotionRequests,
        batchTaskAllocations,
        passwordResetTokens
      } = await import("@shared/schema.mysql");

      // Delete data in order to respect foreign key constraints
      // First, delete user-related data
      await db.delete(userTasks);
      await db.delete(referrals);
      await db.delete(referralRewardClaims);
      await db.delete(payouts);
      await db.delete(userMilestones);
      await db.delete(dailyTaskAllocation);
      await db.delete(taskClicks);
      await db.delete(promotionRequests);
      await db.delete(batchTaskAllocations);
      await db.delete(passwordResetTokens);

      // Finally, delete all users
      await db.delete(users);

      // Clear any cache
      dashboardCache.del(cacheKeys.dashboardStats);

      console.log("✅ Database cleanup completed by admin:", req.session?.admin?.username);

      res.status(200).json({ 
        success: true, 
        message: "All test user data has been cleared successfully. The platform is ready for launch.",
        tablesCleared: [
          "users", "userTasks", "referrals", "referralRewardClaims", 
          "payouts", "userMilestones", "dailyTaskAllocation", 
          "taskClicks", "promotionRequests", "batchTaskAllocations", "passwordResetTokens"
        ]
      });
    } catch (error) {
      console.error("Failed to cleanup database:", error);
      res.status(500).json({ 
        message: "Failed to cleanup database", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Referral History API route
  app.get("/api/referral/:userId/history", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return handleError(res, new Error("Invalid user ID"), "Invalid user ID", 400);
      }

      if ((req.user as any).id !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const referralHistory = await storage.getReferralHistory(userId);
      res.status(200).json(referralHistory);
    } catch (error) {
      return handleError(res, error, "Failed to get referral history");
    }
  });

  // Rewards API routes
  app.get("/api/referral/:userId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return handleError(res, new Error("Invalid user ID"), "Invalid user ID", 400);
      }

      if ((req.user as any).id !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const referrer = await storage.getUser(userId);
      if (!referrer) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get referral stats
      const referralStats = await storage.getReferralStats(userId);

      res.status(200).json({
        totalReferrals: referralStats.totalReferrals,
        coinsEarned: referralStats.totalPoints,
        referralCode: referrer.referralCode
      });

    } catch (error) {
      res.status(500).json({ message: "Failed to get referral data" });
    }
  });

  // Referral reward endpoints
  app.get("/api/referral-reward/:userId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return handleError(res, new Error("Invalid user ID"), "Invalid user ID", 400);
      }

      if ((req.user as any).id !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const rewardInfo = await storage.getReferralRewardInfo(userId);
      res.status(200).json(rewardInfo);
    } catch (error) {
      return handleError(res, error, "Failed to get referral reward info");
    }
  });

  app.post("/api/referral-reward/claim", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const userId = (req.user as any).id;

      // Get reward info to validate eligibility
      const rewardInfo = await storage.getReferralRewardInfo(userId);
      
      if (!rewardInfo.eligibleToClaim) {
        return res.status(400).json({ 
          message: "Not eligible to claim. You need at least 20 referrals and claimable referrals available." 
        });
      }

      // Create the claim
      const claim = await storage.createReferralRewardClaim(
        userId,
        rewardInfo.claimableReferrals,
        rewardInfo.claimableAmount
      );

      res.status(201).json({
        message: "Claim submitted successfully. Your request is pending review.",
        claim
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleError(res, error, "Validation failed", 400);
      }
      return handleError(res, error, "Failed to create claim");
    }
  });

  app.get("/api/referral-reward/claims/:userId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return handleError(res, new Error("Invalid user ID"), "Invalid user ID", 400);
      }

      if ((req.user as any).id !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const claims = await storage.getReferralRewardClaims(userId);
      res.status(200).json(claims);
    } catch (error) {
      return handleError(res, error, "Failed to get claim history");
    }
  });

  // Payout endpoints
  app.post("/api/payouts", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const schema = z.object({
        amount: z.number().int().positive(),
        paymentMethod: z.string().min(1),
        paymentDetails: z.string().optional()
      });

      const data = schema.parse(req.body);
      const userId = (req.user as any).id;

      const payout = await storage.createPayout({
        userId,
        amount: data.amount,
        status: "pending",
        paymentMethod: data.paymentMethod,
        paymentDetails: data.paymentDetails || null,
        requestedAt: new Date(),
        processedAt: null,
        processedBy: null
      });

      // Send WebSocket notification to admins
      const realTimeService = getRealTimeService();
      if (realTimeService) {
        realTimeService.broadcastToAdmins({
          type: 'new_payout_request',
          data: {
            id: payout.id,
            userId: payout.userId,
            amount: payout.amount,
            paymentMethod: payout.paymentMethod,
            requestedAt: payout.requestedAt
          },
          timestamp: Date.now()
        });
      }

      // Create in-app notification for admin about withdrawal request
      const user = await storage.getUser(userId);
      if (user) {
        notificationService.notifyAdminWithdrawalRequest(
          user.id,
          user.username,
          data.amount,
          payout.id
        ).catch(err => console.error("Failed to send withdrawal notification:", err));
      }

      res.status(201).json({
        message: "Payout request submitted successfully",
        payout
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleError(res, error, "Validation failed", 400);
      }
      return handleError(res, error, "Failed to create payout request");
    }
  });

  app.get("/api/payouts/user/:userId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return handleError(res, new Error("Invalid user ID"), "Invalid user ID", 400);
      }

      if ((req.user as any).id !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const payouts = await storage.getUserPayouts(userId);
      res.status(200).json(payouts);
    } catch (error) {
      return handleError(res, error, "Failed to get user payouts");
    }
  });

  app.get("/api/admin/payouts", async (req: Request, res: Response) => {
    try {
      const payouts = await storage.getAllPayouts();
      
      // Fetch user details for each payout
      const payoutsWithUserDetails = await Promise.all(
        payouts.map(async (payout) => {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, payout.userId))
            .limit(1);
          
          return {
            ...payout,
            user: user ? {
              id: user.id,
              username: user.username,
              email: user.email,
              points: user.points
            } : null
          };
        })
      );
      
      res.status(200).json(payoutsWithUserDetails);
    } catch (error) {
      return handleError(res, error, "Failed to get all payouts");
    }
  });

  app.patch("/api/admin/payouts/:id", async (req: Request, res: Response) => {
    try {
      const payoutId = parseInt(req.params.id);
      if (isNaN(payoutId)) {
        return handleError(res, new Error("Invalid payout ID"), "Invalid payout ID", 400);
      }

      const schema = z.object({
        status: z.enum(['pending', 'approved', 'rejected', 'completed']),
        processedBy: z.number().int().positive().optional()
      });

      const data = schema.parse(req.body);

      const payout = await storage.updatePayoutStatus(
        payoutId,
        data.status,
        data.processedBy
      );

      if (!payout) {
        return res.status(404).json({ message: "Payout not found" });
      }

      // Send WebSocket notification to the user
      const realTimeService = getRealTimeService();
      if (realTimeService) {
        realTimeService.broadcastToUser(payout.userId, {
          type: 'payout_status_updated',
          data: {
            id: payout.id,
            status: payout.status,
            amount: payout.amount
          },
          timestamp: Date.now()
        });
      }

      // Create in-app notification for user about payout status
      notificationService.notifyPayoutProcessed(payout.userId, payout.amount, data.status)
        .catch(err => console.error("Failed to send payout notification:", err));

      res.status(200).json({
        message: "Payout status updated successfully",
        payout
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return handleError(res, error, "Validation failed", 400);
      }
      return handleError(res, error, "Failed to update payout status");
    }
  });

  app.get("/api/rewards/:userId", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const requestingUser = req.user as { id: number };
      const isAdminSession = req.session?.admin?.role === 'admin' || req.session?.admin?.role === 'superadmin';
      if (requestingUser.id !== userId && !isAdminSession) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const [tasks, user] = await Promise.all([
        storage.getCompletedTasks(userId),
        storage.getUser(userId)
      ]);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get all available tasks
      const allTasks = await storage.getTasks();
      const activeTasks = allTasks.filter(task => task.isActive);

      // Calculate 3 months from user registration
      const userRegistrationDate = new Date(user.createdAt);
      const threeMonthsLater = new Date(userRegistrationDate);
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
      const isWithinFirstThreeMonths = new Date() <= threeMonthsLater;
      
      // For Social Starter: check if user completed all tasks within first 3 months
      const socialStarterUnlocked = isWithinFirstThreeMonths && tasks.length >= activeTasks.length && activeTasks.length > 0;
      const socialStarterProgress = activeTasks.length > 0 
        ? Math.min((tasks.length / activeTasks.length) * 100, 100)
        : 0;

      // Calculate rewards based on user's progress
      const rewards = [
        {
          id: '1',
          title: 'Social Starter',
          description: 'Complete all tasks within your first 3 months',
          points: 100,
          icon: 'globe',
          unlocked: socialStarterUnlocked,
          progress: socialStarterProgress
        },
        {
          id: '2', 
          title: 'Engagement Pro',
          description: 'Complete 500 tasks to unlock',
          points: 500,
          icon: 'zap',
          unlocked: tasks.length >= 500,
          progress: Math.min((tasks.length / 500) * 100, 100)
        }
      ];

      res.status(200).json(rewards);
    } catch (error) {
      res.status(500).json({ message: "Failed to get rewards" });
    }
  });

  // Add some sample tasks for demo
  await initializeSampleTasks();

  app.get("/api/tasks/similar/:platform", async (req: Request, res: Response) => {
    try {
      const { platform } = req.params;
      const tasks = await storage.getTasks();
      const similarTasks = tasks
        .filter(task => task.platform === platform && task.isActive)
        .slice(0, 5);
      res.status(200).json(similarTasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to get similar tasks" });
    }
  });

  // Promotion Plans API routes
  app.get("/api/promotion/plans", async (_req: Request, res: Response) => {
    try {
      const result = await db.select().from(promotionPlans);
      res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching promotion plans:", error);
      res.status(500).json({ message: "Failed to get promotion plans" });
    }
  });

  app.post("/api/promotion/plans", async (req: Request, res: Response) => {
    // Admin only endpoint - use unified authentication helper
    if (!isSuperadmin(req)) {
      return res.status(403).json({ message: "Superadmin access required" });
    }

    try {
      const adminId = req.session?.admin?.id || req.user?.id || 0;
      const planData = insertPromotionPlanSchema.parse({
        ...req.body,
        updatedAt: new Date(),
        updatedBy: adminId
      });

      const [newPlan] = await db.insert(promotionPlans).values(planData).returning();
      res.status(201).json(newPlan);
    } catch (error) {
      console.error("Error creating promotion plan:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create promotion plan" });
    }
  });

  app.patch("/api/promotion/plans/:id", async (req: Request, res: Response) => {
    if (!isSuperadmin(req)) {
      return res.status(403).json({ message: "Superadmin access required" });
    }

    try {
      const planId = parseInt(req.params.id);
      if (isNaN(planId)) {
        return res.status(400).json({ message: "Invalid plan ID" });
      }

      const [existingPlan] = await db.select().from(promotionPlans).where(eq(promotionPlans.id, planId));

      if (!existingPlan) {
        return res.status(404).json({ message: "Promotion plan not found" });
      }

      // Validate the updates
      const validatedData = updatePromotionPlanSchema.parse(req.body);

      // Update only the provided fields
      const adminId = req.session?.admin?.id || req.user?.id || 0;
      const updates = {
        ...validatedData,
        updatedAt: new Date(),
        updatedBy: adminId
      };

      const [updatedPlan] = await db
        .update(promotionPlans)
        .set(updates)
        .where(eq(promotionPlans.id, planId))
        .returning();

      res.status(200).json(updatedPlan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error updating promotion plan:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update promotion plan" });
    }
  });

  app.delete("/api/promotion/plans/:id", async (req: Request, res: Response) => {
    if (!isSuperadmin(req)) {
      return res.status(403).json({ message: "Superadmin access required" });
    }

    try {
      const planId = parseInt(req.params.id);
      if (isNaN(planId)) {
        return res.status(400).json({ message: "Invalid plan ID" });
      }

      // Instead of deleting, mark as inactive
      const adminId = req.session?.admin?.id || req.user?.id || 0;
      await db
        .update(promotionPlans)
        .set({ 
          isActive: false,
          updatedAt: new Date(),
          updatedBy: adminId
        })
        .where(eq(promotionPlans.id, planId));

      res.status(200).json({ message: "Promotion plan deactivated" });
    } catch (error) {
      console.error("Error deleting promotion plan:", error);
      res.status(500).json({ message: "Failed to delete promotion plan" });
    }
  });

  // Promotion Requests API routes
  // Get single promotion request with user details (Admin only)
  app.get("/api/admin/promotion-request/:id", async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.id);
      
      if (isNaN(requestId)) {
        return res.status(400).json({ message: "Invalid request ID" });
      }

      // Fetch the request with user details
      const result = await db
        .select({
          id: promotionRequests.id,
          userId: promotionRequests.userId,
          planId: promotionRequests.planId,
          socialMediaUrl: promotionRequests.socialMediaUrl,
          platform: promotionRequests.platform,
          engagementType: promotionRequests.engagementType,
          additionalDetails: promotionRequests.additionalDetails,
          status: promotionRequests.status,
          price: promotionRequests.price,
          customEngagementCount: promotionRequests.customEngagementCount,
          paymentStatus: promotionRequests.paymentStatus,
          stripeSessionId: promotionRequests.stripeSessionId,
          requestedAt: promotionRequests.requestedAt,
          updatedAt: promotionRequests.updatedAt,
          assignedTo: promotionRequests.assignedTo,
          completedAt: promotionRequests.completedAt,
          adminNotes: promotionRequests.adminNotes,
          user: {
            id: users.id,
            username: users.username,
            email: users.email,
            points: users.points
          }
        })
        .from(promotionRequests)
        .leftJoin(users, eq(promotionRequests.userId, users.id))
        .where(eq(promotionRequests.id, requestId))
        .limit(1);

      if (result.length === 0) {
        return res.status(404).json({ message: "Request not found" });
      }

      return res.status(200).json(result[0]);
    } catch (error) {
      console.error("Error fetching request details:", error);
      return res.status(500).json({ message: "Failed to fetch request details" });
    }
  });

  app.get("/api/promotion/requests", async (req: Request, res: Response) => {
    // Admin or user endpoint (users can only see their own requests)
    try {
      const { userId } = req.query;

      if (userId) {
        // User is viewing their own requests — must be authenticated and own the data
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const userIdNum = parseInt(userId as string);

        if (isNaN(userIdNum)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }

        if ((req.user as any).id !== userIdNum) {
          return res.status(403).json({ message: "Forbidden" });
        }

        const result = await db
          .select()
          .from(promotionRequests)
          .where(eq(promotionRequests.userId, userIdNum));

        return res.status(200).json(result);
      } else {
        // Admin is viewing all requests - check authentication
        if (!isSuperadmin(req)) {
          return res.status(403).json({ message: "Superadmin access required" });
        }

        const result = await db.select().from(promotionRequests);
        return res.status(200).json(result);
      }
    } catch (error) {
      console.error("Error fetching promotion requests:", error);
      res.status(500).json({ message: "Failed to get promotion requests" });
    }
  });

  app.post("/api/promotion/requests", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const authenticatedUserId = (req.user as any).id;
      const requestData = insertPromotionRequestSchema.parse({
        ...req.body,
        userId: authenticatedUserId,
        requestedAt: new Date(),
        updatedAt: new Date(),
      });

      const [newRequest] = await db.insert(promotionRequests).values(requestData).returning();
      
      // Create in-app notification for admin about promotion request
      const user = await storage.getUser(authenticatedUserId);
      if (user) {
        notificationService.notifyAdminPromotionRequest(user.id, user.username, newRequest.id)
          .catch(err => console.error("Failed to send promotion notification:", err));
      }
      
      res.status(201).json(newRequest);
    } catch (error) {
      console.error("Error creating promotion request:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create promotion request" });
    }
  });

  app.patch("/api/promotion/requests/:id", async (req: Request, res: Response) => {
    if (!isSuperadmin(req)) {
      return res.status(403).json({ message: "Superadmin access required" });
    }

    try {
      const requestId = parseInt(req.params.id);
      if (isNaN(requestId)) {
        return res.status(400).json({ message: "Invalid request ID" });
      }

      const [existingRequest] = await db
        .select()
        .from(promotionRequests)
        .where(eq(promotionRequests.id, requestId));

      if (!existingRequest) {
        return res.status(404).json({ message: "Promotion request not found" });
      }

      // Validate the updates
      const validatedData = updatePromotionRequestSchema.parse(req.body);

      // If updating to completed status, set completedAt
      let updates: any = {
        ...validatedData,
        updatedAt: new Date(),
      };

      if (validatedData.status === 'completed' && !existingRequest.completedAt) {
        updates.completedAt = new Date();
      }

      // If assigning to admin, set assignedTo
      if (validatedData.assignedTo && !existingRequest.assignedTo) {
        updates.assignedTo = req.user?.id || 0;
      }

      const [updatedRequest] = await db
        .update(promotionRequests)
        .set(updates)
        .where(eq(promotionRequests.id, requestId))
        .returning();

      res.status(200).json(updatedRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error updating promotion request:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update promotion request" });
    }
  });

  app.delete("/api/promotion/requests/:id", async (req: Request, res: Response) => {
    if (!isSuperadmin(req)) {
      return res.status(403).json({ message: "Superadmin access required" });
    }

    try {
      const requestId = parseInt(req.params.id);
      if (isNaN(requestId)) {
        return res.status(400).json({ message: "Invalid request ID" });
      }

      const [deletedRequest] = await db
        .delete(promotionRequests)
        .where(eq(promotionRequests.id, requestId))
        .returning();

      if (!deletedRequest) {
        return res.status(404).json({ message: "Promotion request not found" });
      }

      res.status(200).json({ message: "Promotion request deleted successfully" });
    } catch (error) {
      console.error("Error deleting promotion request:", error);
      res.status(500).json({ message: "Failed to delete promotion request" });
    }
  });

  // Stripe Checkout Session Endpoint - referenced from Stripe blueprint integration
  app.post("/api/promotion/create-checkout", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const authenticatedUserId = (req.user as any).id;
      // Validate request body
      const schema = z.object({
        planId: z.number().int().positive(),
        customEngagementCount: z.number().int().positive(),
        socialMediaUrl: z.string().url(),
        platform: z.string(),
        engagementType: z.string(),
        additionalDetails: z.string().optional(),
      });

      const validatedData = { ...schema.parse(req.body), userId: authenticatedUserId };

      // Get the plan details
      const [plan] = await db
        .select()
        .from(promotionPlans)
        .where(eq(promotionPlans.id, validatedData.planId));

      if (!plan) {
        return res.status(404).json({ message: "Promotion plan not found" });
      }

      if (!plan.isActive) {
        return res.status(400).json({ message: "This promotion plan is no longer active" });
      }

      // Calculate total price: (customEngagementCount / plan.engagementCount) × plan.price
      const totalPrice = (validatedData.customEngagementCount / plan.engagementCount) * parseFloat(plan.price);
      const amountInCents = Math.round(totalPrice * 100); // Convert to cents for Stripe

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${plan.name} - ${validatedData.engagementType}`,
                description: `${validatedData.customEngagementCount} ${validatedData.engagementType} for ${validatedData.platform}`,
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: 'https://4lo4lo.site/promote-me?session_id={CHECKOUT_SESSION_ID}&status=success',
        cancel_url: 'https://4lo4lo.site/promote-me?status=cancelled',
        metadata: {
          userId: validatedData.userId.toString(),
          planId: validatedData.planId.toString(),
          customEngagementCount: validatedData.customEngagementCount.toString(),
        },
      });

      // Store promotion request in database with status "pending_payment"
      const [promotionRequest] = await db
        .insert(promotionRequests)
        .values({
          userId: validatedData.userId,
          planId: validatedData.planId,
          socialMediaUrl: validatedData.socialMediaUrl,
          platform: validatedData.platform,
          engagementType: validatedData.engagementType,
          additionalDetails: validatedData.additionalDetails || null,
          status: 'pending_payment',
          price: totalPrice.toFixed(2),
          customEngagementCount: validatedData.customEngagementCount,
          paymentStatus: 'unpaid',
          stripeSessionId: session.id,
          requestedAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Return session info for frontend redirect
      res.status(200).json({
        sessionId: session.id,
        sessionUrl: session.url,
        promotionRequestId: promotionRequest.id,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors,
        });
      }
      console.error("Error creating checkout session:", error);
      return handleError(res, error, "Failed to create checkout session", 500);
    }
  });

  // Pay for promotion using points
  app.post("/api/promotion/pay-with-points", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const authenticatedUserId = (req.user as any).id;
      // Validate request body
      const schema = z.object({
        planId: z.number().int().positive(),
        customEngagementCount: z.number().int().positive(),
        socialMediaUrl: z.string().url(),
        platform: z.string(),
        engagementType: z.string(),
        additionalDetails: z.string().optional(),
      });

      const validatedData = { ...schema.parse(req.body), userId: authenticatedUserId };

      // Get the plan details
      const [plan] = await db
        .select()
        .from(promotionPlans)
        .where(eq(promotionPlans.id, validatedData.planId));

      if (!plan) {
        return res.status(404).json({ message: "Promotion plan not found" });
      }

      if (!plan.isActive) {
        return res.status(400).json({ message: "This promotion plan is no longer active" });
      }

      // Calculate total price: (customEngagementCount / plan.engagementCount) × plan.price
      const totalPrice = (validatedData.customEngagementCount / plan.engagementCount) * parseFloat(plan.price);

      // Get the points_to_currency_rate setting
      const [rateSetting] = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.key, "points_to_currency_rate"));
      
      const conversionRate = parseFloat(rateSetting?.value || "0.001"); // Default: 1000 points = $1
      
      // Calculate required points (price / rate)
      // If rate is 0.001, then $1 = 1000 points
      const requiredPoints = Math.ceil(totalPrice / conversionRate);

      // Get the user and check if they have enough points
      const user = await storage.getUser(validatedData.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.points < requiredPoints) {
        return res.status(400).json({ 
          message: "Insufficient points",
          required: requiredPoints,
          available: user.points,
          shortfall: requiredPoints - user.points
        });
      }

      // Deduct points from user (pass negative value)
      const updatedUser = await storage.updateUserPoints(validatedData.userId, -requiredPoints);
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to deduct points" });
      }

      // Create the promotion request with paid status
      const [promotionRequest] = await db
        .insert(promotionRequests)
        .values({
          userId: validatedData.userId,
          planId: validatedData.planId,
          socialMediaUrl: validatedData.socialMediaUrl,
          platform: validatedData.platform,
          engagementType: validatedData.engagementType,
          additionalDetails: validatedData.additionalDetails || null,
          status: 'pending', // Ready for processing
          price: totalPrice.toFixed(2),
          customEngagementCount: validatedData.customEngagementCount,
          paymentStatus: 'paid_with_points',
          pointsUsed: requiredPoints,
          requestedAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      res.status(200).json({
        success: true,
        message: "Promotion request submitted successfully using points!",
        promotionRequestId: promotionRequest.id,
        pointsDeducted: requiredPoints,
        remainingPoints: updatedUser.points,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors,
        });
      }
      console.error("Error processing points payment:", error);
      return handleError(res, error, "Failed to process points payment", 500);
    }
  });

  app.get("/api/admin/promotion/requests/stats", async (_req: Request, res: Response) => {
    // Admin dashboard stats
    try {
      // Get counts by status
      const result = await db
        .select({
          status: promotionRequests.status,
          count: sql`count(*)::int`,
        })
        .from(promotionRequests)
        .groupBy(promotionRequests.status);

      // Convert to object
      const statusCounts = result.reduce((acc, curr) => {
        acc[curr.status] = Number(curr.count || 0);
        return acc;
      }, {} as Record<string, number>);

      // Get total revenue
      const [revenue] = await db
        .select({
          total: sql`sum(price)::numeric(10,2)`,
          paid: sql`sum(case when payment_status = 'paid' then price else 0 end)::numeric(10,2)`,
          pending: sql`sum(case when payment_status = 'unpaid' then price else 0 end)::numeric(10,2)`,
        })
        .from(promotionRequests);

      res.status(200).json({
        statusCounts,
        revenue: {
          total: revenue.total || 0,
          paid: revenue.paid || 0,
          pending: revenue.pending || 0,
        }
      });
    } catch (error) {
      console.error("Error fetching promotion request stats:", error);
      res.status(500).json({ message: "Failed to get promotion request stats" });
    }
  });

  // Session configuration is handled in setupAuth() via storage.sessionStore
  // No duplicate session setup needed here

  // Add batch allocation endpoints for the comprehensive task allocation system
  app.get("/api/admin/batches", async (_req: Request, res: Response) => {
    try {
      res.json([]);
    } catch (error) {
      console.error("Error fetching batches:", error);
      res.status(500).json({ message: "Failed to fetch batches" });
    }
  });

  app.get("/api/admin/analytics/dashboard", async (_req: Request, res: Response) => {
    try {
      res.json({
        activeUsersToday: 0,
        activeBatches: 0, 
        pendingAllocations: 0,
        completionRate: "0.00",
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error getting dashboard metrics:", error);
      res.status(500).json({ message: "Failed to get dashboard metrics" });
    }
  });

  // Support email endpoint
  app.post("/api/support/contact", async (req: Request, res: Response) => {
    try {
      const { name, email, subject, message } = req.body;

      // Validate input
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email address" });
      }

      // Import nodemailer
      const nodemailer = await import("nodemailer");

      // Create transporter - Using Gmail for simplicity
      // In production, you should use environment variables for credentials
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.SUPPORT_EMAIL_USER || "your-email@gmail.com",
          pass: process.env.SUPPORT_EMAIL_PASSWORD || "your-app-password"
        }
      });

      // Email options
      const mailOptions = {
        from: email,
        to: "support@4lo4lo.site",
        subject: `Support Request: ${subject}`,
        html: `
          <h2>New Support Request</h2>
          <p><strong>From:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `
      };

      // Send email
      await transporter.sendMail(mailOptions);

      res.status(200).json({ 
        message: "Support request sent successfully. We'll get back to you soon!" 
      });
    } catch (error) {
      console.error("Error sending support email:", error);
      res.status(500).json({ 
        message: "Failed to send support request. Please try again later." 
      });
    }
  });

  // ===== MARKETPLACE ROUTES (user) =====

  // Helper: enrich listings with seller/buyer usernames and comments with commenter usernames
  async function enrichListing(listing: PointListing) {
    const seller = await storage.getUser(listing.sellerId);
    const buyer = listing.buyerId ? await storage.getUser(listing.buyerId) : null;
    const rawComments = await storage.getListingComments(listing.id);
    const comments = await Promise.all(rawComments.map(async (c) => {
      const commenter = await storage.getUser(c.userId);
      return { ...c, username: commenter?.username ?? "unknown" };
    }));
    return {
      ...listing,
      sellerUsername: seller?.username ?? "unknown",
      buyerUsername: buyer?.username ?? null,
      comments,
    };
  }

  // GET /api/marketplace/listings — list all listings (enriched)
  app.get("/api/marketplace/listings", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Unauthorized" });
      const listings = await storage.getListings();
      const enriched = await Promise.all(listings.map(enrichListing));
      return res.json(enriched);
    } catch (error) {
      return handleError(res, error, "Failed to fetch listings");
    }
  });

  // POST /api/marketplace/listings — create listing
  app.post("/api/marketplace/listings", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Unauthorized" });
      const userId = (req.user as any).id;
      const parsed = createListingSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Validation error", errors: parsed.error.errors });
      const { pointsAmount, note } = parsed.data;

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.points < pointsAmount) return res.status(400).json({ message: "Insufficient points balance" });

      const openListings = await storage.getOpenListingsBySeller(userId);
      const [maxOpenSetting] = await db.select().from(appSettings).where(eq(appSettings.key, "max_open_listings"));
      const parsedCap = maxOpenSetting ? parseInt(maxOpenSetting.value, 10) : NaN;
      const maxOpenListings = (!isNaN(parsedCap) && parsedCap >= 1) ? Math.min(parsedCap, 50) : 3;
      if (openListings.length >= maxOpenListings) {
        return res.status(400).json({ message: `You have reached the maximum of ${maxOpenListings} open listings. Please sell or remove an existing listing before creating a new one.` });
      }

      const listing = await storage.createListing({ sellerId: userId, pointsAmount, note: note ?? null, status: "open", buyerId: null });
      const enriched = await enrichListing(listing);
      return res.status(201).json(enriched);
    } catch (error) {
      return handleError(res, error, "Failed to create listing");
    }
  });

  // GET /api/marketplace/listings/:id — single listing (enriched)
  app.get("/api/marketplace/listings/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Unauthorized" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid listing ID" });
      const listing = await storage.getListingById(id);
      if (!listing) return res.status(404).json({ message: "Listing not found" });
      const enriched = await enrichListing(listing);
      return res.json(enriched);
    } catch (error) {
      return handleError(res, error, "Failed to fetch listing");
    }
  });

  // POST /api/marketplace/listings/:id/comments — add comment
  app.post("/api/marketplace/listings/:id/comments", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Unauthorized" });
      const userId = (req.user as any).id;
      const listingId = parseInt(req.params.id);
      if (isNaN(listingId)) return res.status(400).json({ message: "Invalid listing ID" });

      const listing = await storage.getListingById(listingId);
      if (!listing) return res.status(404).json({ message: "Listing not found" });
      if (listing.status === "sold") return res.status(400).json({ message: "Cannot comment on a sold listing" });
      if (listing.sellerId === userId) return res.status(400).json({ message: "You cannot comment on your own listing" });

      // Enforce one comment per user per listing
      const existingComments = await storage.getListingComments(listingId);
      const alreadyCommented = existingComments.some((c) => c.userId === userId);
      if (alreadyCommented) return res.status(409).json({ message: "You have already expressed interest in this listing" });

      const parsed = createListingCommentSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Validation error", errors: parsed.error.errors });

      const comment = await storage.createListingComment({ listingId, userId, message: parsed.data.message });
      const commenter = await storage.getUser(userId);
      return res.status(201).json({ ...comment, username: commenter?.username ?? "unknown" });
    } catch (error: any) {
      // Map DB unique-constraint violation to a deterministic 409
      if (error?.code === "23505" || (error?.message && error.message.includes("unique_user_comment"))) {
        return res.status(409).json({ message: "You have already expressed interest in this listing" });
      }
      return handleError(res, error, "Failed to add comment");
    }
  });

  // POST /api/marketplace/listings/:id/sell — mark as sold (seller only)
  app.post("/api/marketplace/listings/:id/sell", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Unauthorized" });
      const userId = (req.user as any).id;
      const listingId = parseInt(req.params.id);
      if (isNaN(listingId)) return res.status(400).json({ message: "Invalid listing ID" });

      const listing = await storage.getListingById(listingId);
      if (!listing) return res.status(404).json({ message: "Listing not found" });
      if (listing.sellerId !== userId) return res.status(403).json({ message: "Only the seller can mark a listing as sold" });
      if (listing.status === "sold") return res.status(400).json({ message: "Listing is already sold" });

      const parsed = sellListingSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Validation error", errors: parsed.error.errors });

      const comment = await storage.getListingComment(parsed.data.buyerCommentId);
      if (!comment || comment.listingId !== listingId) return res.status(400).json({ message: "Invalid buyer comment" });

      const updatedListing = await storage.sellListing(listingId, comment.userId);
      const enriched = await enrichListing(updatedListing);

      // Notify the buyer
      const seller = await storage.getUser(userId);
      const buyer = await storage.getUser(comment.userId);
      if (buyer && seller) {
        await storage.createNotification({
          userId: buyer.id,
          adminOnly: false,
          type: "payout_processed",
          title: "Points Received via Marketplace",
          message: `You received ${listing.pointsAmount} points from @${seller.username} via the marketplace.`,
          isRead: false,
        });
        // Notify the seller
        await storage.createNotification({
          userId: seller.id,
          adminOnly: false,
          type: "system_announcement",
          title: "Listing Sold",
          message: `You sold ${listing.pointsAmount} points to @${buyer.username}.`,
          isRead: false,
        });
      }

      return res.json(enriched);
    } catch (error) {
      return handleError(res, error, "Failed to complete sale");
    }
  });

  // DELETE /api/marketplace/listings/:id — owner deletes their own open listing
  app.delete("/api/marketplace/listings/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Unauthorized" });
      const userId = (req.user as any).id;
      const listingId = parseInt(req.params.id);
      if (isNaN(listingId)) return res.status(400).json({ message: "Invalid listing ID" });

      const listing = await storage.getListingById(listingId);
      if (!listing) return res.status(404).json({ message: "Listing not found" });
      if (listing.sellerId !== userId) return res.status(403).json({ message: "You can only delete your own listings" });
      if (listing.status !== "open") return res.status(400).json({ message: "Only open listings can be deleted" });

      const deleted = await storage.deleteListing(listingId);
      if (!deleted) return res.status(404).json({ message: "Listing not found" });
      return res.json({ message: "Listing deleted" });
    } catch (error) {
      return handleError(res, error, "Failed to delete listing");
    }
  });

  // ===== MARKETPLACE ROUTES (admin) =====

  // GET /api/admin/marketplace/listings — all listings with full detail
  app.get("/api/admin/marketplace/listings", requireAdmin, async (req: Request, res: Response) => {
    try {
      const listings = await storage.getListings();
      const enriched = await Promise.all(listings.map(enrichListing));
      return res.json(enriched);
    } catch (error) {
      return handleError(res, error, "Failed to fetch marketplace listings");
    }
  });

  // DELETE /api/admin/marketplace/listings/:id
  app.delete("/api/admin/marketplace/listings/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid listing ID" });
      const deleted = await storage.deleteListing(id);
      if (!deleted) return res.status(404).json({ message: "Listing not found" });
      return res.json({ message: "Listing deleted" });
    } catch (error) {
      return handleError(res, error, "Failed to delete listing");
    }
  });

  // DELETE /api/admin/marketplace/comments/:id
  app.delete("/api/admin/marketplace/comments/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid comment ID" });
      const deleted = await storage.deleteListingComment(id);
      if (!deleted) return res.status(404).json({ message: "Comment not found" });
      return res.json({ message: "Comment deleted" });
    } catch (error) {
      return handleError(res, error, "Failed to delete comment");
    }
  });

  // Initialize sample tasks
  await initializeSampleTasks();

  // Use the provided httpServer or create a new one
  const server = httpServer || createServer(app);
  
  // Initialize WebSocket service for real-time features
  if (server) {
    initializeRealTimeService(server);
    console.log('🔌 WebSocket service initialized');
    
    // Initialize task allocator for optimized task distribution
    initializeTaskAllocator({
      type: 'balanced',
      batchSize: 10,
      userLimit: 20,
      cooldownMinutes: 5
    });
    console.log('📊 Task allocator initialized');
  }

  // Initialize content scheduler (runs every 5 minutes to auto-publish scheduled content)
  initializeContentScheduler();
  // ===== CLASSROOM ROUTES =====

  // User: get published videos with completion status
  app.get("/api/classroom/videos", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const userId = (req.user as any).id;
      const videos = await storage.getClassroomVideos(true);
      const completions = await storage.getUserClassroomCompletions(userId);
      const completedVideoIds = new Set(completions.map(c => c.videoId));
      const videosWithStatus = videos.map(v => ({ ...v, completed: completedVideoIds.has(v.id) }));
      return res.json(videosWithStatus);
    } catch (error) {
      return handleError(res, error, "Failed to fetch classroom videos");
    }
  });

  // User: get single video with completion status
  app.get("/api/classroom/videos/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const videoId = parseInt(req.params.id);
      if (isNaN(videoId)) return res.status(400).json({ message: "Invalid video ID" });
      const video = await storage.getClassroomVideo(videoId);
      if (!video || !video.isPublished) return res.status(404).json({ message: "Video not found" });
      const userId = (req.user as any).id;
      const completion = await storage.getClassroomCompletion(userId, videoId);
      return res.json({ ...video, completed: !!completion });
    } catch (error) {
      return handleError(res, error, "Failed to fetch classroom video");
    }
  });

  // User: mark video as complete and award points
  app.post("/api/classroom/videos/:id/complete", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const videoId = parseInt(req.params.id);
      if (isNaN(videoId)) return res.status(400).json({ message: "Invalid video ID" });
      const video = await storage.getClassroomVideo(videoId);
      if (!video || !video.isPublished) return res.status(404).json({ message: "Video not found" });
      const userId = (req.user as any).id;
      const existing = await storage.getClassroomCompletion(userId, videoId);
      if (existing) return res.status(409).json({ message: "Already completed", pointsEarned: 0 });
      await storage.createClassroomCompletion({ userId, videoId, pointsEarned: video.pointsReward });
      await storage.updateUserPoints(userId, video.pointsReward);
      storage.checkAndAwardBadges(userId).catch(() => {});
      return res.json({ success: true, pointsEarned: video.pointsReward });
    } catch (error) {
      return handleError(res, error, "Failed to mark video as complete");
    }
  });

  // Admin: get all classroom videos (including unpublished)
  app.get("/api/admin/classroom/videos", requireAdmin, async (req: Request, res: Response) => {
    try {
      const videos = await storage.getClassroomVideos(false);
      return res.json(videos);
    } catch (error) {
      return handleError(res, error, "Failed to fetch classroom videos");
    }
  });

  // Admin: create classroom video
  app.post("/api/admin/classroom/videos", requireAdmin, async (req: Request, res: Response) => {
    try {
      const body = { ...req.body };
      if (body.scheduledPublishAt && typeof body.scheduledPublishAt === "string") {
        body.scheduledPublishAt = new Date(body.scheduledPublishAt);
      }
      const parsed = insertClassroomVideoSchema.safeParse(body);
      if (!parsed.success) return res.status(400).json({ message: "Validation error", errors: parsed.error.errors });
      const video = await storage.createClassroomVideo(parsed.data);
      return res.status(201).json(video);
    } catch (error) {
      return handleError(res, error, "Failed to create classroom video");
    }
  });

  // Admin: update classroom video
  app.patch("/api/admin/classroom/videos/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const videoId = parseInt(req.params.id);
      if (isNaN(videoId)) return res.status(400).json({ message: "Invalid video ID" });
      const clearingSchedule = "scheduledPublishAt" in req.body && req.body.scheduledPublishAt === null;
      const settingSchedule = "scheduledPublishAt" in req.body && req.body.scheduledPublishAt !== null;
      const body = { ...req.body };
      if (body.scheduledPublishAt && typeof body.scheduledPublishAt === "string") {
        body.scheduledPublishAt = new Date(body.scheduledPublishAt);
      }
      // When schedule is set, mark unpublished so scheduler will publish it later
      if (settingSchedule && !("isPublished" in req.body)) {
        body.isPublished = false;
      }
      // When schedule is explicitly cleared, auto-publish immediately
      if (clearingSchedule && !("isPublished" in req.body)) {
        body.isPublished = true;
      }
      const parsed = insertClassroomVideoSchema.partial().safeParse(body);
      if (!parsed.success) return res.status(400).json({ message: "Validation error", errors: parsed.error.errors });
      const video = await storage.updateClassroomVideo(videoId, parsed.data);
      if (!video) return res.status(404).json({ message: "Video not found" });
      return res.json(video);
    } catch (error) {
      return handleError(res, error, "Failed to update classroom video");
    }
  });

  // Admin: delete classroom video
  app.delete("/api/admin/classroom/videos/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const videoId = parseInt(req.params.id);
      if (isNaN(videoId)) return res.status(400).json({ message: "Invalid video ID" });
      const deleted = await storage.deleteClassroomVideo(videoId);
      if (!deleted) return res.status(404).json({ message: "Video not found" });
      return res.json({ success: true });
    } catch (error) {
      return handleError(res, error, "Failed to delete classroom video");
    }
  });

  // ===== STREAKS & BADGES ROUTES =====

  // Daily check-in: update login streak + award eligible badges
  app.post("/api/user/checkin", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const userId = (req.user as any).id;
      const updatedUser = await storage.updateLoginStreak(userId);
      const newBadgeKeys = await storage.checkAndAwardBadges(userId);
      return res.json({ user: updatedUser, newBadgeKeys });
    } catch (error) {
      return handleError(res, error, "Failed to process check-in");
    }
  });

  // List all badge definitions
  app.get("/api/badges", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const allBadges = await storage.getAllBadges();
      return res.json(allBadges);
    } catch (error) {
      return handleError(res, error, "Failed to fetch badges");
    }
  });

  // Current user's earned badges
  app.get("/api/user/badges", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const userId = (req.user as any).id;
      const earned = await storage.getUserBadges(userId);
      return res.json(earned);
    } catch (error) {
      return handleError(res, error, "Failed to fetch user badges");
    }
  });

  // Level history for the authenticated user
  app.get("/api/level-history", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const history = await storage.getUserLevelHistory((req.user as any).id);
      return res.json(history);
    } catch (error) {
      return handleError(res, error, "Failed to fetch level history");
    }
  });

  // Public profile by username
  app.get("/api/profile/:username", async (req: Request, res: Response) => {
    try {
      const profile = await storage.getPublicProfile(req.params.username);
      if (!profile) return res.status(404).json({ message: "Profile not found or private" });
      // Return only explicitly safe public fields — never expose email, password, referral metadata, etc.
      const u = profile.user;
      const safeUser = {
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatar: u.avatar,
        country: u.country,
        points: u.points,
        level: u.level,
        streakCount: u.streakCount,
        globalRank: u.globalRank,
        facebook_handle: u.facebook_handle,
        instagram_handle: u.instagram_handle,
        tiktok_handle: u.tiktok_handle,
        youtube_handle: u.youtube_handle,
        isPublic: u.isPublic,
        createdAt: u.createdAt,
      };
      const links = await storage.getPublicProfileLinks(u.id);
      return res.json({ user: safeUser, badges: profile.badges, links });
    } catch (error) {
      return handleError(res, error, "Failed to fetch profile");
    }
  });

  // ===== PROFILE LINKS =====

  app.get("/api/profile-links", async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    try {
      const links = await storage.getUserProfileLinks(req.user.id);
      return res.json(links);
    } catch (error) {
      return handleError(res, error, "Failed to fetch profile links");
    }
  });

  app.post("/api/profile-links", async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    try {
      const parsed = insertProfileLinkSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Validation error", errors: parsed.error.errors });
      const link = await storage.createProfileLink(req.user.id, parsed.data);
      return res.status(201).json(link);
    } catch (error) {
      return handleError(res, error, "Failed to create profile link");
    }
  });

  app.patch("/api/profile-links/:id", async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const parsed = insertProfileLinkSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Validation error", errors: parsed.error.errors });
      const link = await storage.updateProfileLink(id, req.user.id, parsed.data);
      if (!link) return res.status(404).json({ message: "Link not found" });
      return res.json(link);
    } catch (error) {
      return handleError(res, error, "Failed to update profile link");
    }
  });

  app.delete("/api/profile-links/:id", async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const deleted = await storage.deleteProfileLink(id, req.user.id);
      if (!deleted) return res.status(404).json({ message: "Link not found" });
      return res.json({ success: true });
    } catch (error) {
      return handleError(res, error, "Failed to delete profile link");
    }
  });

  // Public streak settings — used by user-facing streak widget to show next milestone
  app.get("/api/streak-settings", async (req: Request, res: Response) => {
    try {
      return res.json(await storage.getStreakSettings());
    } catch (error) {
      return handleError(res, error, "Failed to fetch streak settings");
    }
  });

  // ===== ADMIN STREAK SETTINGS =====

  app.get("/api/admin/streak-settings", requireAdmin, async (req: Request, res: Response) => {
    try {
      return res.json(await storage.getStreakSettings());
    } catch (error) {
      return handleError(res, error, "Failed to fetch streak settings");
    }
  });

  app.post("/api/admin/streak-settings", requireAdmin, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        milestones: z.array(z.object({ streak: z.number().int().positive(), bonusPoints: z.number().int().min(0) }))
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Validation error", errors: parsed.error.errors });
      await storage.saveStreakSettings(parsed.data);
      return res.json({ success: true });
    } catch (error) {
      return handleError(res, error, "Failed to save streak settings");
    }
  });

  // ===== ADMIN BADGE MANAGEMENT =====

  app.get("/api/admin/badges", requireAdmin, async (req: Request, res: Response) => {
    try {
      const allBadges = await storage.getAllBadges();
      return res.json(allBadges);
    } catch (error) {
      return handleError(res, error, "Failed to fetch badges");
    }
  });

  app.post("/api/admin/badges", requireAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = insertBadgeSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Validation error", errors: parsed.error.errors });
      const badge = await storage.createBadge(parsed.data);
      return res.status(201).json(badge);
    } catch (error) {
      return handleError(res, error, "Failed to create badge");
    }
  });

  app.patch("/api/admin/badges/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const badgeId = parseInt(req.params.id);
      if (isNaN(badgeId)) return res.status(400).json({ message: "Invalid badge ID" });
      const parsed = insertBadgeSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Validation error", errors: parsed.error.errors });
      const badge = await storage.updateBadge(badgeId, parsed.data);
      if (!badge) return res.status(404).json({ message: "Badge not found" });
      return res.json(badge);
    } catch (error) {
      return handleError(res, error, "Failed to update badge");
    }
  });

  app.delete("/api/admin/badges/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const badgeId = parseInt(req.params.id);
      if (isNaN(badgeId)) return res.status(400).json({ message: "Invalid badge ID" });
      const deleted = await storage.deleteBadge(badgeId);
      if (!deleted) return res.status(404).json({ message: "Badge not found" });
      return res.json({ success: true });
    } catch (error) {
      return handleError(res, error, "Failed to delete badge");
    }
  });

  // ===== ADMIN REFERRAL TIER ROUTES =====

  app.get("/api/admin/referral-tiers", requireAdmin, async (req: Request, res: Response) => {
    try {
      const tiers = await storage.getReferralTiers();
      return res.json(tiers);
    } catch (error) {
      return handleError(res, error, "Failed to fetch referral tiers");
    }
  });

  app.post("/api/admin/referral-tiers", requireAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = insertReferralTierSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      const tier = await storage.createReferralTier(parsed.data);
      return res.status(201).json(tier);
    } catch (error) {
      return handleError(res, error, "Failed to create referral tier");
    }
  });

  app.patch("/api/admin/referral-tiers/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const tierId = parseInt(req.params.id);
      if (isNaN(tierId)) return res.status(400).json({ message: "Invalid tier ID" });
      const parsed = insertReferralTierSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      const tier = await storage.updateReferralTier(tierId, parsed.data);
      if (!tier) return res.status(404).json({ message: "Referral tier not found" });
      return res.json(tier);
    } catch (error) {
      return handleError(res, error, "Failed to update referral tier");
    }
  });

  app.delete("/api/admin/referral-tiers/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const tierId = parseInt(req.params.id);
      if (isNaN(tierId)) return res.status(400).json({ message: "Invalid tier ID" });
      const deleted = await storage.deleteReferralTier(tierId);
      if (!deleted) return res.status(404).json({ message: "Referral tier not found" });
      return res.json({ success: true });
    } catch (error) {
      return handleError(res, error, "Failed to delete referral tier");
    }
  });

  // Seed default badges (idempotent — skips existing)
  await seedDefaultBadges();

  // Seed default referral tiers (idempotent — skips if any tiers already exist)
  try {
    const existingTiers = await storage.getReferralTiers();
    if (existingTiers.length === 0) {
      const defaultTiers: InsertReferralTier[] = [
        { label: "Bronze", minReferrals: 1,  maxReferrals: 20,   multiplier: "1.00" },
        { label: "Silver", minReferrals: 21, maxReferrals: 50,   multiplier: "1.50" },
        { label: "Gold",   minReferrals: 51, maxReferrals: null,  multiplier: "2.00" },
      ];
      for (const tier of defaultTiers) {
        await storage.createReferralTier(tier);
      }
      console.log("✅ Default referral tiers seeded");
    }
  } catch (error) {
    console.error("Failed to seed default referral tiers:", error);
  }

  // ===== PUBLIC TOOLS ROUTES =====

  // GET /s/:shortCode — Short link redirect (server-side 302, before SPA fallback)
  app.get("/s/:shortCode", async (req: Request, res: Response) => {
    const { shortCode } = req.params;
    try {
      const record = await storage.getShortenedUrl(shortCode);
      if (!record) return res.status(404).send("Short link not found");
      storage.incrementShortenedUrlClicks(shortCode).catch((err) => {
        console.error(`[analytics] Failed to increment clicks for short code "${shortCode}":`, err);
      });
      return res.redirect(302, record.originalUrl);
    } catch (error) {
      return res.status(500).send("Server error");
    }
  });

  // POST /api/tools/qr-lead — Capture email + original URL before QR download
  app.post("/api/tools/qr-lead", async (req: Request, res: Response) => {
    try {
      const { email, originalUrl } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ message: "Valid email required" });
      }
      if (!originalUrl || typeof originalUrl !== "string") {
        return res.status(400).json({ message: "originalUrl is required" });
      }
      await storage.createQrEmailLead(email.toLowerCase().trim(), originalUrl.trim());
      return res.json({ ok: true });
    } catch (error) {
      return handleError(res, error, "Failed to save email lead");
    }
  });

  // POST /api/tools/shorten — Create a short URL
  app.post("/api/tools/shorten", async (req: Request, res: Response) => {
    try {
      const { originalUrl } = req.body;
      if (!originalUrl || typeof originalUrl !== "string") {
        return res.status(400).json({ message: "originalUrl is required" });
      }
      let parsedUrl: URL;
      try { parsedUrl = new URL(originalUrl); } catch { return res.status(400).json({ message: "Invalid URL format" }); }
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return res.status(400).json({ message: "Only http and https URLs are allowed" });
      }
      let shortened;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const shortCode = nanoid(6);
          shortened = await storage.createShortenedUrl(originalUrl, shortCode);
          break;
        } catch (colErr: unknown) {
          const msg = colErr instanceof Error ? colErr.message : "";
          if (attempt === 4 || !msg.includes("unique")) throw colErr;
        }
      }
      if (!shortened) return res.status(500).json({ message: "Could not generate a unique short code" });
      const host = `${req.protocol}://${req.get("host")}`;
      return res.json({ shortUrl: `${host}/s/${shortened.shortCode}` });
    } catch (error) {
      return handleError(res, error, "Failed to shorten URL");
    }
  });

  // GET /api/tools/ads — Get active ad placements (public)
  app.get("/api/tools/ads", async (_req: Request, res: Response) => {
    try {
      const ads = await storage.getActiveAdPlacements();
      return res.json(ads);
    } catch (error) {
      return handleError(res, error, "Failed to fetch ads");
    }
  });

  // ===== ADMIN TOOLS ROUTES =====

  // GET /api/admin/ads — List all ad placements (admin)
  app.get("/api/admin/ads", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const ads = await storage.getAllAdPlacements();
      return res.json(ads);
    } catch (error) {
      return handleError(res, error, "Failed to fetch ads");
    }
  });

  // POST /api/admin/ads — Create ad placement
  app.post("/api/admin/ads", requireAdmin, async (req: Request, res: Response) => {
    try {
      const data = insertAdPlacementSchema.parse(req.body);
      const ad = await storage.createAdPlacement(data);
      return res.json(ad);
    } catch (error) {
      return handleError(res, error, "Failed to create ad");
    }
  });

  // PATCH /api/admin/ads/:id — Update ad placement
  app.patch("/api/admin/ads/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertAdPlacementSchema.partial().parse(req.body);
      const ad = await storage.updateAdPlacement(id, data);
      if (!ad) return res.status(404).json({ message: "Ad not found" });
      return res.json(ad);
    } catch (error) {
      return handleError(res, error, "Failed to update ad");
    }
  });

  // DELETE /api/admin/ads/:id — Delete ad placement
  app.delete("/api/admin/ads/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const ok = await storage.deleteAdPlacement(id);
      if (!ok) return res.status(404).json({ message: "Ad not found" });
      return res.json({ ok: true });
    } catch (error) {
      return handleError(res, error, "Failed to delete ad");
    }
  });

  // GET /api/admin/tools/urls — List all shortened URLs with click counts (admin)
  app.get("/api/admin/tools/urls", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const urls = await storage.getAllShortenedUrls();
      return res.json(urls);
    } catch (error) {
      return handleError(res, error, "Failed to fetch shortened URLs");
    }
  });

  // GET /api/admin/tools/qr-leads — List QR email leads (admin)
  app.get("/api/admin/tools/qr-leads", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const leads = await storage.getQrEmailLeads();
      return res.json(leads);
    } catch (error) {
      return handleError(res, error, "Failed to fetch QR leads");
    }
  });

  return server;
}

async function seedDefaultBadges() {
  try {
    const defaultBadges: InsertBadge[] = [
      { key: "first_task",    title: "First Step",       description: "Complete your very first task",       iconName: "check-circle",   condition: { type: "tasks_completed", threshold: 1 },  pointsBonus: 10  },
      { key: "task_10",       title: "Task Veteran",      description: "Complete 10 tasks",                   iconName: "shield",         condition: { type: "tasks_completed", threshold: 10 }, pointsBonus: 25  },
      { key: "task_50",       title: "Task Master",       description: "Complete 50 tasks",                   iconName: "star",           condition: { type: "tasks_completed", threshold: 50 }, pointsBonus: 100 },
      { key: "task_100",      title: "Task Legend",       description: "Complete 100 tasks",                  iconName: "trophy",         condition: { type: "tasks_completed", threshold: 100 },pointsBonus: 250 },
      { key: "streak_3",      title: "On Fire",           description: "Log in 3 days in a row",             iconName: "flame",          condition: { type: "login_streak",     threshold: 3 },  pointsBonus: 15  },
      { key: "streak_7",      title: "Week Warrior",      description: "Log in 7 days in a row",             iconName: "zap",            condition: { type: "login_streak",     threshold: 7 },  pointsBonus: 50  },
      { key: "streak_30",     title: "Monthly Legend",    description: "Log in 30 days in a row",            iconName: "crown",          condition: { type: "login_streak",     threshold: 30 }, pointsBonus: 200 },
      { key: "referral_1",    title: "Connector",         description: "Refer your first friend",            iconName: "user-plus",      condition: { type: "referrals",        threshold: 1 },  pointsBonus: 20  },
      { key: "referral_5",    title: "Network Builder",   description: "Refer 5 friends",                    iconName: "users",          condition: { type: "referrals",        threshold: 5 },  pointsBonus: 75  },
      { key: "referral_20",   title: "Community Leader",  description: "Refer 20 friends",                   iconName: "share-2",        condition: { type: "referrals",        threshold: 20 }, pointsBonus: 300 },
      { key: "classroom_1",   title: "Student",           description: "Complete your first classroom video", iconName: "book-open",     condition: { type: "classroom_videos", threshold: 1 },  pointsBonus: 10  },
      { key: "classroom_5",   title: "Scholar",           description: "Complete 5 classroom videos",        iconName: "graduation-cap", condition: { type: "classroom_videos", threshold: 5 },  pointsBonus: 50  },
      { key: "points_1000",   title: "Point Earner",      description: "Earn 1,000 points",                  iconName: "coins",          condition: { type: "points",           threshold: 1000 },pointsBonus: 50  },
      { key: "points_10000",  title: "High Roller",       description: "Earn 10,000 points",                 iconName: "gem",            condition: { type: "points",           threshold: 10000 },pointsBonus: 500 },
    ];

    for (const badge of defaultBadges) {
      const existing = await storage.getBadgeByKey(badge.key);
      if (!existing) {
        await storage.createBadge(badge);
        console.log(`✅ Seeded badge: ${badge.key}`);
      }
    }
  } catch (error) {
    console.error("Failed to seed badges:", error);
  }
}

async function initializeSampleTasks() {
  try {
    // First check if there are any tasks already
    const existingTasks = await storage.getTasks();

    // Only add sample tasks if there are none already
    if (existingTasks.length === 0) {
      // Need to create an admin user first
      const adminExists = await storage.getUserByUsername("admin");

      if (!adminExists) {
        // Create an admin user with default credentials
        const admin = await storage.createUser({
          username: "administrator",
          password: "Admin@123!", // This will be hashed by the createUser function
          email: "admin@example.com",
          role: "admin",
          referralCode: nanoid(8)
        });

        // Create sample tasks
        const sampleTasks = [
          {
            title: "Follow 3 TikTok creators",
            description: "Follow 3 TikTok creators to stay updated with their content",
            taskUrl: "https://www.tiktok.com/explore",
            platform: "tiktok",
            type: "follow",
            points: 50,
            isActive: true,
            createdAt: new Date(),
            createdBy: admin.id
          },
          {
            title: "Like 5 YouTube videos",
            description: "Like 5 YouTube videos to show your appreciation",
            taskUrl: "https://www.youtube.com/",
            platform: "youtube",
            type: "like",
            points: 30,
            isActive: true,
            createdAt: new Date(),
            createdBy: admin.id
          },
          {
            title: "Comment on 2 Instagram posts",
            description: "Leave a meaningful comment on 2 Instagram posts",
            taskUrl: "https://www.instagram.com/",
            platform: "instagram",
            type: "comment",
            points: 40,
            isActive: true,
            createdAt: new Date(),
            createdBy: admin.id
          },
          {
            title: "Share a Facebook post",
            description: "Share a Facebook post to your timeline",
            taskUrl: "https://www.facebook.com/",
            platform: "facebook",
            type: "share",
            points: 60,
            isActive: true,
            createdAt: new Date(),
            createdBy: admin.id
          },
          {
            title: "Follow X/Twitter accounts",
            description: "Follow 3 X/Twitter accounts in your niche",
            taskUrl: "https://twitter.com/",
            platform: "twitter",
            type: "follow",
            points: 45,
            isActive: true,
            createdAt: new Date(),
            createdBy: admin.id
          },
          {
            title: "Retweet content",
            description: "Retweet 2 relevant posts in your field",
            taskUrl: "https://twitter.com/",
            platform: "twitter", 
            type: "share",
            points: 35,
            isActive: true,
            createdAt: new Date(),
            createdBy: admin.id
          }
        ];

        for (const task of sampleTasks) {
          await storage.addTask({
            ...task,
            maxCompletions: null,
            expiresAt: null,
            scheduledPublishAt: null,
            category: null,
          });
        }
      }
    }
  } catch (error) {
    console.error("Failed to initialize sample tasks:", error);
  }
}

