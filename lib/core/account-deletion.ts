import { randomBytes } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { hashPassword } from "@/auth";
import {
  notifications,
  passwordResetTokens,
  payouts,
  pointListings,
  profileLinks,
  userPreferences,
  users,
} from "@shared/schema.mysql";
import { isMissingTable, queryRows } from "@/lib/core/sql-utils";

/**
 * Account deletion by anonymization.
 *
 * The old admin delete removed the user row together with their completions,
 * referrals and payout history, which corrupted other members' referral
 * counts and the payout ledger. Instead the row is kept and every piece of
 * personal data on it is overwritten, then personal side tables are cleared.
 * Task, referral and payout history stays, attached to "Deleted user".
 */

/** Tables from later migrations; a missing one is simply skipped. */
const OPTIONAL_DELETES = [
  (id: number) => sql`DELETE FROM mobile_push_tokens WHERE user_id = ${id}`,
  (id: number) => sql`DELETE FROM user_follows WHERE follower_id = ${id} OR following_id = ${id}`,
  (id: number) => sql`DELETE FROM email_verifications WHERE user_id = ${id}`,
  (id: number) => sql`DELETE FROM user_devices WHERE user_id = ${id}`,
  (id: number) => sql`DELETE FROM media_uploads WHERE user_id = ${id}`,
  // Proof screenshots and notes go with the account (Privacy Policy §7); the
  // completions themselves stay, anonymised, in user_tasks.
  (id: number) => sql`DELETE FROM task_proofs WHERE user_id = ${id}`,
  // Community posts and comments are personal content; other members'
  // comments on a deleted post go with it.
  (id: number) => sql`DELETE FROM community_post_likes WHERE user_id = ${id}`,
  (id: number) => sql`DELETE c FROM community_post_comments c JOIN community_posts p ON p.id = c.post_id WHERE p.user_id = ${id}`,
  (id: number) => sql`DELETE l FROM community_post_likes l JOIN community_posts p ON p.id = l.post_id WHERE p.user_id = ${id}`,
  (id: number) => sql`DELETE FROM community_post_comments WHERE user_id = ${id}`,
  (id: number) => sql`DELETE FROM community_posts WHERE user_id = ${id}`,
  (id: number) => sql`UPDATE payout_holds SET released = 1 WHERE user_id = ${id}`,
];

/** Profile photo and proof screenshots held in Vercel Blob (database-stored images go with media_uploads). */
async function blobImageUrls(userId: number): Promise<string[]> {
  const urls: string[] = [];
  const [u] = await db.select({ avatar: users.avatar }).from(users).where(eq(users.id, userId));
  if (u?.avatar) urls.push(u.avatar);
  try {
    const rows = await queryRows<{ image_url: string }>(sql`SELECT image_url FROM task_proofs WHERE user_id = ${userId}`);
    urls.push(...rows.map((r) => r.image_url));
  } catch (err) {
    if (!isMissingTable(err)) throw err;
  }
  return urls.filter((url) => /\.blob\.vercel-storage\.com\//.test(url));
}

export async function anonymizeUser(userId: number): Promise<void> {
  const scrambled = await hashPassword(randomBytes(32).toString("hex"));
  const now = new Date();
  const blobs = await blobImageUrls(userId).catch(() => [] as string[]);

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        username: `deleted_${userId}`,
        email: `deleted-${userId}@deleted.invalid`,
        password: scrambled,
        displayName: "Deleted user",
        googleId: null,
        avatar: null,
        bio: null,
        facebook_handle: null,
        instagram_handle: null,
        tiktok_handle: null,
        youtube_handle: null,
        notificationPreferences: {},
        isPublic: false,
        role: "deleted",
        referralCode: `deleted-${userId}`,
        pendingPoints: 0,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    await tx.delete(profileLinks).where(eq(profileLinks.userId, userId));
    await tx.delete(userPreferences).where(eq(userPreferences.userId, userId));
    await tx.delete(notifications).where(eq(notifications.userId, userId));
    // Same as the owner deleting their own open listings; sold ones stay as history.
    await tx.delete(pointListings).where(and(eq(pointListings.sellerId, userId), eq(pointListings.status, "open")));
    await tx
      .update(payouts)
      .set({ status: "rejected", processedAt: now })
      .where(and(eq(payouts.userId, userId), sql`${payouts.status} IN ('pending', 'processing')`));
  });

  for (const query of OPTIONAL_DELETES) {
    await db.execute(query(userId)).catch((err) => {
      if (!isMissingTable(err)) console.error("account deletion: cleanup step failed", err);
    });
  }

  if (blobs.length && process.env.BLOB_READ_WRITE_TOKEN) {
    const { del } = await import("@vercel/blob");
    await del(blobs).catch((err) => console.error("account deletion: image cleanup failed", err));
  }
}
