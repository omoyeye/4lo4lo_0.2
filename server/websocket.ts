import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from './storage';
import type { User, Task, UserTask } from '@shared/schema.mysql';

export interface WebSocketMessage {
  type: string;
  data: any;
  userId?: number;
  timestamp: number;
}

export interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  isAdmin?: boolean;
  isAlive?: boolean;
}

export class RealTimeService {
  private wss: WebSocketServer;
  private clients: Map<number, AuthenticatedWebSocket[]> = new Map();
  private adminClients: Set<AuthenticatedWebSocket> = new Set();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupWebSocket();
    this.setupHeartbeat();
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
      // Only log unique connections, not every attempt
      const clientCount = this.wss.clients.size;
      if (clientCount % 10 === 1) {
        console.log(`WebSocket connections: ${clientCount}`);
      }
      
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format',
            timestamp: Date.now()
          }));
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleDisconnect(ws);
      });
    });
  }

  private setupHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
        if (ws.isAlive === false) {
          this.handleDisconnect(ws);
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds
  }

  private handleMessage(ws: AuthenticatedWebSocket, data: any) {
    switch (data.type) {
      case 'authenticate':
        this.handleAuthentication(ws, data);
        break;
      case 'subscribe':
        this.handleSubscription(ws, data);
        break;
      case 'task_update':
        this.handleTaskUpdate(ws, data);
        break;
      case 'ping':
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: Date.now()
        }));
        break;
      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Unknown message type',
          timestamp: Date.now()
        }));
    }
  }

  private async handleAuthentication(ws: AuthenticatedWebSocket, data: any) {
    try {
      const { userId, isAdmin, token } = data;
      
      // In a real app, you would validate the token here
      // For now, we'll use a simple validation
      if (userId) {
        const user = await storage.getUser(userId);
        if (user) {
          ws.userId = userId;
          this.addClient(userId, ws);
          
          ws.send(JSON.stringify({
            type: 'authenticated',
            userId: userId,
            timestamp: Date.now()
          }));
        }
      }

      if (isAdmin) {
        ws.isAdmin = true;
        this.adminClients.add(ws);
        
        ws.send(JSON.stringify({
          type: 'admin_authenticated',
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('Authentication error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Authentication failed',
        timestamp: Date.now()
      }));
    }
  }

  private handleSubscription(ws: AuthenticatedWebSocket, data: any) {
    const { channels } = data;
    
    // Store subscription preferences (in a real app, you'd store this in database)
    ws.send(JSON.stringify({
      type: 'subscribed',
      channels: channels,
      timestamp: Date.now()
    }));
  }

  private handleTaskUpdate(ws: AuthenticatedWebSocket, data: any) {
    if (!ws.userId) return;

    // Broadcast task updates to relevant clients
    this.broadcastTaskUpdate(data);
  }

  private handleDisconnect(ws: AuthenticatedWebSocket) {
    if (ws.userId) {
      this.removeClient(ws.userId, ws);
    }
    if (ws.isAdmin) {
      this.adminClients.delete(ws);
    }
  }

  private addClient(userId: number, ws: AuthenticatedWebSocket) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, []);
    }
    this.clients.get(userId)!.push(ws);
  }

  private removeClient(userId: number, ws: AuthenticatedWebSocket) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      const index = userClients.indexOf(ws);
      if (index > -1) {
        userClients.splice(index, 1);
      }
      if (userClients.length === 0) {
        this.clients.delete(userId);
      }
    }
  }

  // Public methods for broadcasting updates
  public broadcastToUser(userId: number, message: WebSocketMessage) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      const messageStr = JSON.stringify(message);
      userClients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        }
      });
    }
  }

  public broadcastToAllUsers(message: WebSocketMessage) {
    const messageStr = JSON.stringify(message);
    this.clients.forEach((userClients) => {
      userClients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        }
      });
    });
  }

  public broadcastToAdmins(message: WebSocketMessage) {
    const messageStr = JSON.stringify(message);
    this.adminClients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }

  public broadcastTaskUpdate(taskData: any) {
    const message: WebSocketMessage = {
      type: 'task_update',
      data: taskData,
      timestamp: Date.now()
    };
    
    this.broadcastToAllUsers(message);
  }

  public broadcastTaskCompletion(userId: number, taskId: number, task: Task) {
    const message: WebSocketMessage = {
      type: 'task_completed',
      data: {
        userId,
        taskId,
        task,
        points: task.points
      },
      timestamp: Date.now()
    };
    
    this.broadcastToUser(userId, message);
    this.broadcastToAdmins(message);
  }

  public broadcastUserPointsUpdate(userId: number, newPoints: number) {
    const message: WebSocketMessage = {
      type: 'points_updated',
      data: {
        userId,
        newPoints
      },
      timestamp: Date.now()
    };
    
    this.broadcastToUser(userId, message);
  }

  public broadcastNewTask(task: Task) {
    const message: WebSocketMessage = {
      type: 'new_task',
      data: task,
      timestamp: Date.now()
    };
    
    this.broadcastToAllUsers(message);
  }

  public broadcastSystemAnnouncement(announcement: string) {
    const message: WebSocketMessage = {
      type: 'system_announcement',
      data: { message: announcement },
      timestamp: Date.now()
    };
    
    this.broadcastToAllUsers(message);
  }

  public broadcastNotification(userId: number, notification: any) {
    const message: WebSocketMessage = {
      type: 'new_notification',
      data: notification,
      userId,
      timestamp: Date.now()
    };
    
    this.broadcastToUser(userId, message);
  }

  public broadcastAdminNotification(notification: any) {
    const message: WebSocketMessage = {
      type: 'new_admin_notification',
      data: notification,
      timestamp: Date.now()
    };
    
    this.broadcastToAdmins(message);
  }

  public getConnectedUsersCount(): number {
    return this.clients.size;
  }

  public getConnectedAdminsCount(): number {
    return this.adminClients.size;
  }

  public getUserConnectionStatus(userId: number): boolean {
    return this.clients.has(userId);
  }
}

// Global instance
let realTimeService: RealTimeService | null = null;

export function initializeRealTimeService(server: Server): RealTimeService {
  if (!realTimeService) {
    realTimeService = new RealTimeService(server);
  }
  return realTimeService;
}

export function getRealTimeService(): RealTimeService | null {
  return realTimeService;
}