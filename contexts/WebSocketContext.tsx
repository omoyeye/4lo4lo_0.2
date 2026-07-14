"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { queryClient } from '@/lib/queryClient';

export interface WebSocketMessage {
  type: string;
  data: any;
  userId?: number;
  timestamp: number;
}

type MessageHandler = (message: WebSocketMessage) => void;

interface WebSocketContextType {
  isConnected: boolean;
  /** No-op for SSE — kept for API compatibility. Use POST endpoints for client→server messages. */
  send: (message: any) => boolean;
  subscribe: (handler: MessageHandler) => () => void;
  lastMessage: WebSocketMessage | null;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export function WebSocketProvider({
  children,
  autoReconnect = true,
  reconnectInterval = 3000
}: WebSocketProviderProps) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const esRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const subscribersRef = useRef<Set<MessageHandler>>(new Set());
  const isConnectingRef = useRef(false);

  const maxReconnectAttempts = 5;

  const handleIncomingMessage = useCallback((message: WebSocketMessage) => {
    // Normalise — SSE events may not carry a timestamp; fall back to now
    const msg: WebSocketMessage = {
      ...message,
      timestamp: message.timestamp ?? Date.now(),
    };

    const isForCurrentUser = !msg.userId || msg.userId === user?.id;
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    switch (msg.type) {
      case 'task_completed':
        if (isForCurrentUser || isAdmin) {
          queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
        }
        if (isForCurrentUser) {
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        }
        break;

      case 'points_updated':
        if (isForCurrentUser) {
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
        }
        break;

      case 'new_task':
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
        queryClient.invalidateQueries({ queryKey: ['adminTasks'] });
        break;

      case 'settings_updated':
        queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
        break;

      case 'connected':
        console.log('SSE connected');
        break;

      case 'error':
        console.error('SSE server error:', msg.data);
        break;
    }

    subscribersRef.current.forEach(handler => {
      try {
        handler(msg);
      } catch (error) {
        console.error('Error in SSE message handler:', error);
      }
    });
  }, [user]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setIsConnected(false);
    isConnectingRef.current = false;
  }, []);

  const connect = useCallback(() => {
    if (esRef.current && esRef.current.readyState !== EventSource.CLOSED) return;
    if (isConnectingRef.current) return;

    isConnectingRef.current = true;

    try {
      // Pass userId as query param so the server can target this client
      const url = user
        ? `/api/sse?userId=${user.id}`
        : '/api/sse';

      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        console.log('SSE connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
      };

      es.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          handleIncomingMessage(message);
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      es.onerror = () => {
        // onerror fires on any connection loss — EventSource auto-retries internally,
        // but we manage our own reconnect logic for backoff control.
        isConnectingRef.current = false;

        if (es.readyState === EventSource.CLOSED) {
          setIsConnected(false);
          esRef.current = null;

          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }

          if (
            autoReconnect &&
            reconnectAttemptsRef.current < maxReconnectAttempts &&
            user &&
            subscribersRef.current.size > 0
          ) {
            reconnectAttemptsRef.current++;
            const backoffDelay = reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1);
            console.log(`SSE reconnecting in ${backoffDelay}ms... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

            reconnectTimeoutRef.current = setTimeout(() => {
              if (user && subscribersRef.current.size > 0) {
                connect();
              }
            }, backoffDelay);
          }
        }
      };
    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      isConnectingRef.current = false;
      setIsConnected(false);
    }
  }, [user, autoReconnect, reconnectInterval, handleIncomingMessage, disconnect]);

  /** SSE is server→client only. Kept for API compatibility — callers should use fetch/POST for client→server. */
  const send = useCallback((_message: any): boolean => {
    console.warn('send() is a no-op with SSE transport. Use a POST API endpoint instead.');
    return false;
  }, []);

  const subscribe = useCallback((handler: MessageHandler) => {
    subscribersRef.current.add(handler);

    if (subscribersRef.current.size === 1) {
      connect();
    }

    return () => {
      subscribersRef.current.delete(handler);
      if (subscribersRef.current.size === 0) {
        disconnect();
      }
    };
  }, [connect, disconnect]);

  // React to user login/logout
  useEffect(() => {
    if (!user) {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      reconnectAttemptsRef.current = 0;
      disconnect();
      subscribersRef.current.clear();
    } else if (user && !isConnected && subscribersRef.current.size > 0) {
      connect();
    }
  }, [user, isConnected, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const value: WebSocketContextType = {
    isConnected,
    send,
    subscribe,
    lastMessage,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

// Hook for subscribing to SSE messages with cleanup
export function useWebSocketSubscription(handler: MessageHandler) {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe(handler);
    return unsubscribe;
  }, [subscribe, handler]);
}

// Hook for real-time task updates
export function useTaskUpdates() {
  const [newTaskCount, setNewTaskCount] = useState(0);
  const [recentCompletions, setRecentCompletions] = useState<any[]>([]);

  const handler = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'new_task':
        setNewTaskCount(prev => prev + 1);
        break;
      case 'task_completed':
        setRecentCompletions(prev => [message.data, ...prev.slice(0, 9)]);
        break;
    }
  }, []);

  useWebSocketSubscription(handler);

  const clearNewTaskCount = useCallback(() => {
    setNewTaskCount(0);
  }, []);

  return {
    newTaskCount,
    recentCompletions,
    clearNewTaskCount
  };
}

// Hook for admin dashboard real-time updates
export function useAdminUpdates() {
  const [activeUsers, setActiveUsers] = useState(0);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  const handler = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'task_completed':
        setRecentActivities(prev => [
          {
            type: 'task_completion',
            userId: message.data?.userId,
            taskId: message.data?.taskId,
            timestamp: message.timestamp
          },
          ...prev.slice(0, 19)
        ]);
        break;
      case 'user_connected':
        setActiveUsers(prev => prev + 1);
        break;
      case 'user_disconnected':
        setActiveUsers(prev => Math.max(0, prev - 1));
        break;
    }
  }, []);

  useWebSocketSubscription(handler);

  return {
    activeUsers,
    recentActivities
  };
}
