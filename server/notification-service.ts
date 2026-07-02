import { storage } from './storage';
import { getRealTimeService } from './websocket';
import type { InsertNotification, Notification } from '@shared/schema.mysql';

export type NotificationType = 
  | 'new_task'
  | 'points_threshold'
  | 'referral_milestone'
  | 'promote_me_request'
  | 'withdrawal_request'
  | 'password_reset_request'
  | 'task_approved'
  | 'task_rejected'
  | 'payout_processed'
  | 'system_announcement'
  | 'new_lesson';

const NOTIFICATION_PREF_MAP: Partial<Record<NotificationType, string>> = {
  task_approved: 'notifyTaskUpdates',
  task_rejected: 'notifyTaskUpdates',
  referral_milestone: 'notifyReferralActivity',
  payout_processed: 'notifyPayoutUpdates',
  new_lesson: 'notifyNewLessons',
  system_announcement: 'notifySystemAnnouncements',
};

interface NotificationData {
  type: NotificationType;
  title: string;
  message: string;
  userId?: number;
  adminOnly?: boolean;
  data?: Record<string, any>;
}

class NotificationService {
  async createAndBroadcast(notificationData: NotificationData): Promise<Notification | null> {
    const { type, title, message, userId, adminOnly = false, data } = notificationData;

    if (!adminOnly && userId) {
      const prefKey = NOTIFICATION_PREF_MAP[type];
      if (prefKey) {
        const prefs = await storage.getUserNotificationPreferences(userId);
        if (prefs[prefKey] === false) {
          return null;
        }
      }
    }
    
    const insertData: InsertNotification = {
      type,
      title,
      message,
      userId: userId || null,
      adminOnly,
      data: data ? JSON.stringify(data) : null,
      isRead: false,
    };
    
    const notification = await storage.createNotification(insertData);
    
    const realTimeService = getRealTimeService();
    if (realTimeService) {
      if (adminOnly) {
        realTimeService.broadcastAdminNotification(notification);
      } else if (userId) {
        realTimeService.broadcastNotification(userId, notification);
      }
    }
    
    return notification;
  }

  async notifyNewTask(taskTitle: string, taskId: number): Promise<void> {
    const allUsers = await storage.getAllUsers();
    
    for (const user of allUsers) {
      await this.createAndBroadcast({
        type: 'new_task',
        title: 'New Task Available!',
        message: `A new task "${taskTitle}" has been added. Complete it to earn points!`,
        userId: user.id,
        data: { taskId }
      });
    }
  }

  async notifyPointsThreshold(userId: number, currentPoints: number, withdrawThreshold: number): Promise<void> {
    if (currentPoints >= withdrawThreshold) {
      await this.createAndBroadcast({
        type: 'points_threshold',
        title: 'Ready to Withdraw!',
        message: `Congratulations! You have ${currentPoints} points and can now withdraw. Consider using Promote Me to boost your social media presence!`,
        userId,
        data: { currentPoints, withdrawThreshold }
      });
    }
  }

  async notifyReferralMilestone(userId: number, currentReferrals: number, targetReferrals: number): Promise<void> {
    const remaining = targetReferrals - currentReferrals;
    if (remaining === 1) {
      await this.createAndBroadcast({
        type: 'referral_milestone',
        title: 'Almost There!',
        message: `You're just 1 referral away from reaching the ${targetReferrals} referral target! Share your code now.`,
        userId,
        data: { currentReferrals, targetReferrals }
      });
    }
  }

  async notifyAdminPromotionRequest(userId: number, username: string, requestId: number): Promise<void> {
    await this.createAndBroadcast({
      type: 'promote_me_request',
      title: 'New Promote Me Request',
      message: `User "${username}" has submitted a promotion request. Review it in the admin panel.`,
      adminOnly: true,
      data: { userId, requestId }
    });
  }

  async notifyAdminWithdrawalRequest(userId: number, username: string, amount: number, payoutId: number): Promise<void> {
    await this.createAndBroadcast({
      type: 'withdrawal_request',
      title: 'New Withdrawal Request',
      message: `User "${username}" has requested a withdrawal of ${amount} points.`,
      adminOnly: true,
      data: { userId, amount, payoutId }
    });
  }

  async notifyAdminPasswordReset(userId: number, username: string, email: string): Promise<void> {
    await this.createAndBroadcast({
      type: 'password_reset_request',
      title: 'Password Reset Request',
      message: `User "${username}" (${email}) has requested a password reset.`,
      adminOnly: true,
      data: { userId, email }
    });
  }

  async notifyTaskApproved(userId: number, taskTitle: string, pointsEarned: number): Promise<void> {
    await this.createAndBroadcast({
      type: 'task_approved',
      title: 'Task Approved!',
      message: `Your submission for "${taskTitle}" has been approved. You earned ${pointsEarned} points!`,
      userId,
      data: { taskTitle, pointsEarned }
    });
  }

  async notifyTaskRejected(userId: number, taskTitle: string, reason?: string): Promise<void> {
    await this.createAndBroadcast({
      type: 'task_rejected',
      title: 'Task Submission Rejected',
      message: `Your submission for "${taskTitle}" was not approved.${reason ? ` Reason: ${reason}` : ''}`,
      userId,
      data: { taskTitle, reason }
    });
  }

  async notifyPayoutProcessed(userId: number, amount: number, status: string): Promise<void> {
    await this.createAndBroadcast({
      type: 'payout_processed',
      title: status === 'approved' ? 'Payout Approved!' : 'Payout Update',
      message: status === 'approved' 
        ? `Your withdrawal of ${amount} points has been approved and is being processed.`
        : `Your withdrawal request has been updated. Status: ${status}`,
      userId,
      data: { amount, status }
    });
  }

  async broadcastSystemAnnouncement(title: string, message: string): Promise<void> {
    const allUsers = await storage.getAllUsers();
    
    for (const user of allUsers) {
      await this.createAndBroadcast({
        type: 'system_announcement',
        title,
        message,
        userId: user.id
      });
    }
  }
}

export const notificationService = new NotificationService();
