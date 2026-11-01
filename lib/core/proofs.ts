import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailyTaskAllocation, tasks, userTasks, users } from "@shared/schema.mysql";
import { storage } from "@/lib/core/storage";
import { getSettingBool, isMissingTable, queryRows } from "@/lib/core/sql-utils";

/**
 * Proof of task completion.
 *
 * When the `task_proof_required` setting is on, finishing a task means
 * uploading a screenshot. The completion is recorded straight away (so the
 * task can't be claimed twice) with verification_status "in_review", and its
 * points go to users.pending_points. An admin then approves, which moves the
 * points into the balance, or rejects, which removes the completion so the
 * member can try again.
 */

export class ProofError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export interface ProofRow {
  id: number;
  user_id: number;
  task_id: number;
  user_task_id: number | null;
  image_url: string;
  note: string | null;
  points: number;
  status: "pending" | "approved" | "rejected";
  reject_reason: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
}

/** Proofs are required only when the setting is on AND the table exists. */
export async function proofRequired(): Promise<boolean> {
  if (!(await getSettingBool("task_proof_required", false))) return false;
  try {
    await queryRows(sql`SELECT id FROM task_proofs LIMIT 1`);
    return true;
  } catch (err) {
    if (isMissingTable(err)) return false;
    throw err;
  }
}

export async function submitProof(opts: { userId: number; taskId: number; imageUrl: string; note?: string | null }) {
  const { userId, taskId, imageUrl } = opts;
  const note = opts.note?.trim().slice(0, 500) || null;

  const task = await storage.getTaskById(taskId);
  if (!task || !task.isActive) throw new ProofError("This task is no longer available", 404);

  const today = new Date().toISOString().split("T")[0];
  const now = new Date();

  const proofId = await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(userTasks)
      .where(and(eq(userTasks.userId, userId), eq(userTasks.taskId, taskId)))
      .for("update");
    if (existing.length > 0) {
      throw new ProofError(existing[0].verificationStatus === "in_review" ? "Your proof for this task is already being reviewed" : "Task already completed", 409);
    }

    await tx
      .update(dailyTaskAllocation)
      .set({ isCompleted: true })
      .where(and(eq(dailyTaskAllocation.userId, userId), eq(dailyTaskAllocation.taskId, taskId), sql`DATE(${dailyTaskAllocation.allocatedDate}) = ${today}`));

    const [ut] = await tx.insert(userTasks).values({
      userId,
      taskId,
      completedAt: now,
      pointsEarned: task.points,
      verificationStatus: "in_review",
    });
    const userTaskId = (ut as unknown as { insertId: number }).insertId;

    await tx
      .update(users)
      .set({
        dailyTasksCompleted: sql`${users.dailyTasksCompleted} + 1`,
        lastTaskDate: sql`${today}`,
        pendingPoints: sql`${users.pendingPoints} + ${task.points}`,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    const [proof] = (await tx.execute(
      sql`INSERT INTO task_proofs (user_id, task_id, user_task_id, image_url, note, points) VALUES (${userId}, ${taskId}, ${userTaskId}, ${imageUrl}, ${note}, ${task.points})`
    )) as unknown as [{ insertId: number }];
    return proof.insertId;
  });

  storage
    .createNotification({
      userId: null,
      adminOnly: true,
      type: "proof_submitted",
      title: "New task proof to review",
      message: `A member submitted proof for "${task.title}"`,
      data: JSON.stringify({ proofId, taskId, userId }),
      isRead: false,
    })
    .catch(() => {});

  return { proofId, points: task.points };
}

export async function listProofs(status: string, limit = 200) {
  const where = status === "all" ? sql`1 = 1` : sql`p.status = ${status}`;
  return queryRows<
    ProofRow & { username: string; display_name: string | null; avatar: string | null; task_title: string; platform: string; task_url: string }
  >(sql`
    SELECT p.*, u.username, u.display_name, u.avatar, t.title AS task_title, t.platform, t.task_url
    FROM task_proofs p
    JOIN users u ON u.id = p.user_id
    JOIN tasks t ON t.id = p.task_id
    WHERE ${where}
    ORDER BY p.status = 'pending' DESC, p.created_at DESC
    LIMIT ${limit}
  `);
}

export async function countPendingProofs(): Promise<number> {
  try {
    const rows = await queryRows<{ n: number }>(sql`SELECT COUNT(*) AS n FROM task_proofs WHERE status = 'pending'`);
    return Number(rows[0]?.n ?? 0);
  } catch (err) {
    if (isMissingTable(err)) return 0;
    throw err;
  }
}

export async function myProofs(userId: number) {
  return queryRows<ProofRow & { task_title: string; platform: string }>(sql`
    SELECT p.*, t.title AS task_title, t.platform
    FROM task_proofs p JOIN tasks t ON t.id = p.task_id
    WHERE p.user_id = ${userId}
    ORDER BY p.created_at DESC
    LIMIT 100
  `);
}

export async function reviewProof(opts: { proofId: number; adminId: number; action: "approve" | "reject"; reason?: string | null }) {
  const { proofId, adminId, action } = opts;
  const reason = opts.reason?.trim().slice(0, 500) || null;

  const result = await db.transaction(async (tx) => {
    const [rows] = (await tx.execute(sql`SELECT * FROM task_proofs WHERE id = ${proofId} FOR UPDATE`)) as unknown as [ProofRow[]];
    const proof = rows[0];
    if (!proof) throw new ProofError("Proof not found", 404);
    if (proof.status !== "pending") throw new ProofError(`This proof was already ${proof.status}`, 409);

    await tx.execute(
      sql`UPDATE task_proofs SET status = ${action === "approve" ? "approved" : "rejected"}, reject_reason = ${reason}, reviewed_by = ${adminId}, reviewed_at = NOW() WHERE id = ${proofId}`
    );
    await tx
      .update(users)
      .set({ pendingPoints: sql`GREATEST(${users.pendingPoints} - ${proof.points}, 0)` })
      .where(eq(users.id, proof.user_id));

    if (proof.user_task_id) {
      if (action === "approve") {
        await tx
          .update(userTasks)
          .set({ verificationStatus: "verified", verifiedAt: new Date(), verifiedBy: adminId })
          .where(eq(userTasks.id, proof.user_task_id));
      } else {
        // Removing the completion lets the member redo the task properly.
        await tx.delete(userTasks).where(eq(userTasks.id, proof.user_task_id));
      }
    }
    return proof;
  });

  const [task] = await db.select({ title: tasks.title }).from(tasks).where(eq(tasks.id, result.task_id));
  const title = task?.title ?? "your task";

  if (action === "approve") {
    // Through updateUserPoints so level, progress and level history stay right.
    await storage.updateUserPoints(result.user_id, result.points);
    storage.checkAndAwardBadges(result.user_id).catch(() => {});
  }

  storage
    .createNotification({
      userId: result.user_id,
      adminOnly: false,
      type: action === "approve" ? "proof_approved" : "proof_rejected",
      title: action === "approve" ? `+${result.points} points approved` : "Task proof not accepted",
      message:
        action === "approve"
          ? `Your proof for "${title}" was approved and the points are in your balance.`
          : `Your proof for "${title}" was not accepted${reason ? `: ${reason}` : ""}. You can do the task again and resubmit.`,
      data: JSON.stringify({ proofId, taskId: result.task_id }),
      isRead: false,
    })
    .catch(() => {});

  return { ...result, status: action === "approve" ? "approved" : "rejected" };
}
