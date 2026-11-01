import type { User } from "@shared/schema.mysql";
import { isUndeliverable } from "@/lib/core/email-verification";

/**
 * Members who may receive announcement emails: real addresses only, not
 * deleted accounts, and not anyone who opted out (Settings → Notifications
 * "System announcements", or the unsubscribe link in an email).
 */
export function announcementRecipients(users: User[]) {
  return users
    .filter((u) => u.role !== "deleted" && u.email && !isUndeliverable(u.email))
    .filter((u) => (u.notificationPreferences as Record<string, boolean> | null)?.notifySystemAnnouncements !== false)
    .map((u) => ({ id: u.id, email: u.email, username: u.username }));
}
