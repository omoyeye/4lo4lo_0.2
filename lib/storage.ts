// Central storage export for Next.js API routes.
// Re-exports the DatabaseStorage implementation from server/storage.db.ts
// so that API routes don't need to import from the server/ directory directly.
export { storage } from "@/lib/core/storage";
export type { IStorage, LeaderboardEntry } from "@/lib/core/storage";
