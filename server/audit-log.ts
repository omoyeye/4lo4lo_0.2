
import { storage } from "./storage";

export interface AuditLogEntry {
  userId: number;
  action: string;
  details: string;
  timestamp: Date;
}

export async function logAction(userId: number, action: string, details: string) {
  try {
    await storage.createAuditLog({
      userId,
      action,
      details,
      timestamp: new Date()
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}
