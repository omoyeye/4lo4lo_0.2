// Simple SSE implementation using Next.js Response streams
// This file replaces the old WebSocket server for real-time notifications

export type NotificationPayload = {
  type: string;
  data: any;
  userId?: number; // Target specific user, or omit for broadcast
};

export class RealTimeService {
  private clients: Set<{
    controller: ReadableStreamDefaultController;
    userId?: number;
  }> = new Set();

  constructor() {
    // Save to global to survive hot reloads in Next.js development
    if (process.env.NODE_ENV === "development") {
      const globalAny: any = global;
      if (globalAny.__realTimeService) {
        return globalAny.__realTimeService;
      }
      globalAny.__realTimeService = this;
    }
  }

  addClient(controller: ReadableStreamDefaultController, userId?: number) {
    const client = { controller, userId };
    this.clients.add(client);
    
    // Send initial connection success message
    this.sendToController(controller, {
      type: "connected",
      data: { message: "SSE Connected" },
    });
    
    return () => {
      this.clients.delete(client);
    };
  }

  broadcast(type: string, data: any) {
    this.clients.forEach(client => {
      this.sendToController(client.controller, { type, data });
    });
  }

  broadcastNotification(userIdOrNotification: any, notificationObj?: any) {
    if (typeof userIdOrNotification === 'number' && notificationObj) {
      this.sendToUser(userIdOrNotification, "notification", notificationObj);
    } else {
      this.broadcast("notification", userIdOrNotification);
    }
  }

  broadcastAdminNotification(notification: any) {
    this.broadcast("admin_notification", notification);
  }

  sendToUser(userId: number, type: string, data: any) {
    this.clients.forEach(client => {
      if (client.userId === userId) {
        this.sendToController(client.controller, { type, data });
      }
    });
  }

  broadcastToUser(userId: number, typeOrPayload: string | any, data?: any) {
    if (typeof typeOrPayload === 'string') {
      this.sendToUser(userId, typeOrPayload, data);
    } else {
      // Handle the case where the whole payload object is passed
      const { type, data: payloadData, ...rest } = typeOrPayload;
      this.sendToUser(userId, type || "notification", payloadData || rest);
    }
  }

  private sendToController(controller: ReadableStreamDefaultController, payload: NotificationPayload) {
    try {
      const dataString = `data: ${JSON.stringify(payload)}\n\n`;
      controller.enqueue(new TextEncoder().encode(dataString));
    } catch (error) {
      // Client likely disconnected
      // We don't remove it here, it will be removed when the request ends
    }
  }
}

// Singleton instance
const realTimeService = new RealTimeService();

export function getRealTimeService() {
  return realTimeService;
}
