import type { Task } from "@shared/schema.mysql";

/** A task that is inactive, expired or full; the message is safe to show. */
export class TaskClosedError extends Error {}

/**
 * Whether members can still see and earn from a task: active, not past the
 * admin-set expiry, and under its completion cap. Listing and completing both
 * go through this, so a task that has closed stops paying as well as showing.
 *
 * `completions` is the task's non-rejected completion count; leave it out
 * where it isn't known and only the cap check is skipped.
 */
export function taskClosedReason(task: Task, completions?: number, now = new Date()): string | null {
  if (!task.isActive) return "This task is no longer available";
  if (task.expiresAt && new Date(task.expiresAt).getTime() <= now.getTime()) return "This task has expired";
  if (task.maxCompletions != null && completions !== undefined && completions >= task.maxCompletions) {
    return "This task has reached its completion limit";
  }
  return null;
}

export function isTaskOpen(task: Task, completions?: number, now = new Date()): boolean {
  return taskClosedReason(task, completions, now) === null;
}
