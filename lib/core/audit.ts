import { after } from "next/server";
import { sql } from "drizzle-orm";
import { execute, isMissingTable, queryRows } from "@/lib/core/sql-utils";

/**
 * Admin activity log (scripts/sql/010). Writes happen after the response and
 * never fail the action being logged; before the table exists they're skipped.
 */

export type AuditAction =
  | "payout.update"
  | "points.adjust"
  | "user.delete"
  | "user.role"
  | "user.password_reset"
  | "setting.update"
  | "proof.review";

export function logAdminAction(entry: {
  adminId: number;
  action: AuditAction;
  targetType?: "user" | "payout" | "setting" | "proof";
  targetId?: number | null;
  summary: string;
  details?: Record<string, unknown>;
}) {
  const write = () =>
    execute(sql`
      INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, summary, details)
      VALUES (${entry.adminId}, ${entry.action}, ${entry.targetType ?? null}, ${entry.targetId ?? null},
              ${entry.summary.slice(0, 500)}, ${entry.details ? JSON.stringify(entry.details) : null})
    `).catch((err) => {
      if (!isMissingTable(err)) console.error("audit: write failed", err);
    });
  try {
    after(write);
  } catch {
    void write();
  }
}

export interface AuditRow {
  id: number;
  admin_id: number;
  admin_username: string | null;
  action: AuditAction;
  target_type: string | null;
  target_id: number | null;
  summary: string;
  created_at: string;
}

export async function listAdminActions(limit = 200): Promise<{ enabled: boolean; entries: AuditRow[] }> {
  try {
    const entries = await queryRows<AuditRow>(sql`
      SELECT l.id, l.admin_id, u.username AS admin_username, l.action, l.target_type, l.target_id, l.summary, l.created_at
      FROM admin_audit_log l LEFT JOIN users u ON u.id = l.admin_id
      ORDER BY l.created_at DESC, l.id DESC
      LIMIT ${limit}
    `);
    return { enabled: true, entries };
  } catch (err) {
    if (isMissingTable(err)) return { enabled: false, entries: [] };
    throw err;
  }
}
