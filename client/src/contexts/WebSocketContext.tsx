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
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const subscribersRef = useRef<Set<MessageHandler>>(new Set());
  const isConnectingRef = useRef(false);
  
  const maxReconnectAttempts = 5;

  const handleIncomingMessage = useCallback((message: WebSocketMessage) => {
    // Check if this message is for the current user or is a global message
    const isForCurrentUser = !message.userId || message.userId === user?.id;
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
    
    // Cache invalidation logic
    switch (message.type) {
      case 'task_completed':
        // Admins see all task completions for dashboard/analytics
        if (isForCurrentUser || isAdmin) {
          queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
        }
        // Only invalidate user-specific data for the current user
        if (isForCurrentUser) {
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        }
        break;
        
      case 'points_updated':
        // Only invalidate for current user
        if (isForCurrentUser) {
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
        }
        break;
        
      case 'new_task':
        // New tasks are global - everyone sees them
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
        queryClient.invalidateQueries({ queryKey: ['adminTasks'] });
        break;
        
      case 'settings_updated':
        // Admin changed a setting — refresh app settings for all users immediately
        queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
        break;

      case 'authenticated':
      case 'admin_authenticated':
        console.log('Successfully authenticated with WebSocket');
        break;
        
      case 'error':
        console.error('WebSocket error:', message.data);
        break;
    }

    // Notify all subscribers (they can do their own filtering if needed)
    subscribersRef.current.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in WebSocket message handler:', error);
      }
    });
  }, [user]);

  const connect = useCallback(() => {
    // Prevent duplicate connections - check both OPEN and CONNECTING states
    const currentState = wsRef.current?.readyState;
    if (currentState === WebSocket.OPEN || currentState === WebSocket.CONNECTING) {
      return;
    }

    if (isConnectingRef.current) {
      return;
    }

    isConnectingRef.current = true;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
        
        // Authenticate if user is logged in
        if (user) {
          ws.send(JSON.stringify({
            type: 'authenticate',
            userId: user.id,
            isAdmin: user.role === 'admin' || user.role === 'superadmin',
            timestamp: Date.now()
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          handleIncomingMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        isConnectingRef.current = false;
        wsRef.current = null;
        
        // Cancel any existing reconnect timer to prevent overlapping attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        
        // Only auto-reconnect if enabled, we haven't exceeded attempts, user is logged in, AND we have active subscribers
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts && user && subscribersRef.current.size > 0) {
          reconnectAttemptsRef.current++;
          const backoffDelay = reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1);
          console.log(`Reconnecting in ${backoffDelay}ms... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            // Double-check we still have user auth and subscribers before reconnecting
            if (user && subscribersRef.current.size > 0) {
              connect();
            }
          }, backoffDelay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnectingRef.current = false;
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      isConnectingRef.current = false;
      setIsConnected(false);
    }
  }, [user, autoReconnect, reconnectInterval, handleIncomingMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    isConnectingRef.current = false;
  }, []);

  const send = useCallback((message: any): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const subscribe = useCallback((handler: MessageHandler) => {
    subscribersRef.current.add(handler);
    
    // Connect if this is the first subscriber
    if (subscribersRef.current.size === 1) {
      connect();
    }
    
    // Return unsubscribe function
    return () => {
      subscribersRef.current.delete(handler);
      
      // Disconnect if no more subscribers
      if (subscribersRef.current.size === 0) {
        disconnect();
      }
    };
  }, [connect, disconnect]);

  // Re-authenticate when user changes, and force disconnect on logout
  useEffect(() => {
    if (isConnected && user && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'authenticate',
        userId: user.id,
        isAdmin: user.role === 'admin' || user.role === 'superadmin',
        timestamp: Date.now()
      }));
    }
    
    // Force disconnect and clear subscribers if user logs out
    if (!user) {
      // Clear any pending reconnect timers
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      reconnectAttemptsRef.current = 0;
      
      // Close the connection - this prevents reconnect attempts
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      isConnectingRef.current = false;
      
      // Clear all subscribers to force re-subscription on next login
      // This ensures connect() will be called when user logs back in
      subscribersRef.current.clear();
    } else if (user && !isConnected && subscribersRef.current.size > 0) {
      // User just logged in and we have subscribers - reconnect
      connect();
    }
  }, [user, isConnected, connect]);

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
    lastMessage
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

// Hook for subscribing to WebSocket messages with cleanup
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
            userId: message.data.userId,
            taskId: message.data.taskId,
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
