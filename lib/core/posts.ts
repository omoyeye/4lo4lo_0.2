import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { storage } from "@/lib/core/storage";
import { execute, isMissingTable, queryRows } from "@/lib/core/sql-utils";

/**
 * Community posts, comments and likes (scripts/sql/011). Plain text only:
 * bodies are stored as typed and rendered as text, never as HTML.
 */

export const POST_MAX_WORDS = 250;
export const COMMENT_MAX_WORDS = 100;
const POST_MAX_CHARS = 3000;
const COMMENT_MAX_CHARS = 1000; // the column is VARCHAR(1000)

export class PostError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Trims, collapses runs of blank lines, and enforces the word / length caps. */
function clean(text: unknown, maxWords: number, maxChars: number, what: string): string {
  const body = String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!body) throw new PostError(`Write something first`, 400);
  const words = wordCount(body);
  if (words > maxWords) throw new PostError(`${what} can be at most ${maxWords} words (yours is ${words})`, 400);
  if (body.length > maxChars) throw new PostError(`${what} is too long`, 400);
  return body;
}

export interface PostAuthor {
  id: number;
  username: string;
  displayName: string | null;
  avatar: string | null;
  level: number;
}

export interface CommunityPost {
  id: number;
  body: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  likedByMe: boolean;
  author: PostAuthor;
}

export interface PostComment {
  id: number;
  postId: number;
  body: string;
  createdAt: string;
  author: PostAuthor;
}

type Row = Record<string, unknown>;

/**
 * created_at is selected as UNIX_TIMESTAMP(): the database runs in US Eastern
 * time and the driver reads dates as UTC, so a plain column read is hours out.
 * The epoch value of a TIMESTAMP column is zone-independent.
 */
const iso = (epoch: unknown) => new Date(Number(epoch) * 1000).toISOString();
const author = (r: Row): PostAuthor => ({
  id: Number(r.author_id),
  username: String(r.username),
  displayName: (r.display_name as string) ?? null,
  avatar: (r.avatar as string) ?? null,
  level: Number(r.level ?? 1),
});

export async function postsEnabled(): Promise<boolean> {
  try {
    await queryRows(sql`SELECT id FROM community_posts LIMIT 1`);
    return true;
  } catch (err) {
    if (isMissingTable(err)) return false;
    throw err;
  }
}

/** Newest first. `before` is the last post id already shown (keyset pagination). */
export async function listPosts(viewerId: number, before: number | null, limit = 20): Promise<{ posts: CommunityPost[]; nextCursor: number | null }> {
  const rows = await queryRows<Row>(sql`
    SELECT p.id, p.body, p.like_count, p.comment_count, UNIX_TIMESTAMP(p.created_at) AS created_at,
           u.id AS author_id, u.username, u.display_name, u.avatar, u.level,
           EXISTS(SELECT 1 FROM community_post_likes l WHERE l.post_id = p.id AND l.user_id = ${viewerId}) AS liked
    FROM community_posts p
    JOIN users u ON u.id = p.user_id
    WHERE (u.role IS NULL OR u.role <> 'deleted') ${before ? sql`AND p.id < ${before}` : sql``}
    ORDER BY p.id DESC
    LIMIT ${limit + 1}
  `);
  const page = rows.slice(0, limit);
  return {
    posts: page.map((r) => ({
      id: Number(r.id),
      body: String(r.body),
      likeCount: Number(r.like_count),
      commentCount: Number(r.comment_count),
      createdAt: iso(r.created_at),
      likedByMe: Number(r.liked) === 1,
      author: author(r),
    })),
    nextCursor: rows.length > limit ? Number(page[page.length - 1].id) : null,
  };
}

export async function createPost(userId: number, text: unknown): Promise<number> {
  const body = clean(text, POST_MAX_WORDS, POST_MAX_CHARS, "A post");
  const res = await execute(sql`INSERT INTO community_posts (user_id, body) VALUES (${userId}, ${body})`);
  return res.insertId;
}

async function ownerOf(table: "community_posts" | "community_post_comments", id: number): Promise<number | null> {
  const rows = await queryRows<{ user_id: number }>(sql`SELECT user_id FROM ${sql.raw(table)} WHERE id = ${id} LIMIT 1`);
  return rows[0]?.user_id ?? null;
}

export async function deletePost(postId: number, userId: number, isAdmin: boolean): Promise<void> {
  const owner = await ownerOf("community_posts", postId);
  if (owner === null) throw new PostError("Post not found", 404);
  if (owner !== userId && !isAdmin) throw new PostError("You can only delete your own posts", 403);
  await db.transaction(async (tx) => {
    await tx.execute(sql`DELETE FROM community_post_likes WHERE post_id = ${postId}`);
    await tx.execute(sql`DELETE FROM community_post_comments WHERE post_id = ${postId}`);
    await tx.execute(sql`DELETE FROM community_posts WHERE id = ${postId}`);
  });
}

/** Toggles the viewer's like; returns the new state and the recounted total. */
export async function toggleLike(postId: number, userId: number): Promise<{ liked: boolean; likeCount: number }> {
  if ((await ownerOf("community_posts", postId)) === null) throw new PostError("Post not found", 404);
  const removed = await execute(sql`DELETE FROM community_post_likes WHERE post_id = ${postId} AND user_id = ${userId}`);
  const liked = removed.affectedRows === 0;
  if (liked) await execute(sql`INSERT IGNORE INTO community_post_likes (post_id, user_id) VALUES (${postId}, ${userId})`);
  // Recount rather than +/-1 so concurrent taps can't drift the total.
  await execute(sql`UPDATE community_posts SET like_count = (SELECT COUNT(*) FROM community_post_likes WHERE post_id = ${postId}) WHERE id = ${postId}`);
  const rows = await queryRows<{ like_count: number }>(sql`SELECT like_count FROM community_posts WHERE id = ${postId}`);
  return { liked, likeCount: Number(rows[0]?.like_count ?? 0) };
}

export async function listComments(postId: number): Promise<PostComment[]> {
  const rows = await queryRows<Row>(sql`
    SELECT c.id, c.post_id, c.body, UNIX_TIMESTAMP(c.created_at) AS created_at,
           u.id AS author_id, u.username, u.display_name, u.avatar, u.level
    FROM community_post_comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ${postId} AND (u.role IS NULL OR u.role <> 'deleted')
    ORDER BY c.id ASC
    LIMIT 200
  `);
  return rows.map((r) => ({ id: Number(r.id), postId: Number(r.post_id), body: String(r.body), createdAt: iso(r.created_at), author: author(r) }));
}

export async function addComment(postId: number, userId: number, username: string, text: unknown): Promise<number> {
  const body = clean(text, COMMENT_MAX_WORDS, COMMENT_MAX_CHARS, "A comment");
  const postOwner = await ownerOf("community_posts", postId);
  if (postOwner === null) throw new PostError("Post not found", 404);
  const res = await execute(sql`INSERT INTO community_post_comments (post_id, user_id, body) VALUES (${postId}, ${userId}, ${body})`);
  await execute(sql`UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = ${postId}`);

  if (postOwner !== userId) {
    storage
      .createNotification({
        userId: postOwner,
        adminOnly: false,
        type: "post_comment",
        title: `@${username} commented on your post`,
        message: body.length > 120 ? `${body.slice(0, 117)}…` : body,
        data: JSON.stringify({ postId }),
        isRead: false,
      })
      .catch(() => {});
  }
  return res.insertId;
}

export async function deleteComment(commentId: number, userId: number, isAdmin: boolean): Promise<void> {
  const rows = await queryRows<{ user_id: number; post_id: number }>(sql`SELECT user_id, post_id FROM community_post_comments WHERE id = ${commentId} LIMIT 1`);
  const c = rows[0];
  if (!c) throw new PostError("Comment not found", 404);
  if (c.user_id !== userId && !isAdmin) throw new PostError("You can only delete your own comments", 403);
  await execute(sql`DELETE FROM community_post_comments WHERE id = ${commentId}`);
  await execute(sql`UPDATE community_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = ${c.post_id}`);
}
