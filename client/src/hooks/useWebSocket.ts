import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { queryClient } from '@/lib/queryClient';

export interface WebSocketMessage {
  type: string;
  data: any;
  userId?: number;
  timestamp: number;
}

export interface WebSocketHookOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export interface WebSocketHook {
  isConnected: boolean;
  send: (message: any) => boolean;
  connect: () => void;
  disconnect: () => void;
  lastMessage: WebSocketMessage | null;
}

// Singleton WebSocket instance to prevent multiple connections
let globalWebSocket: WebSocket | null = null;
let connectionCount = 0;
let isConnecting = false;

export function useWebSocket(options: WebSocketHookOptions = {}): WebSocketHook {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    reconnectInterval = 3000
  } = options;

  const connect = useCallback(() => {
    // Use singleton pattern to prevent multiple connections
    if (globalWebSocket?.readyState === WebSocket.OPEN) {
      wsRef.current = globalWebSocket;
      setIsConnected(true);
      return;
    }

    if (isConnecting) {
      return;
    }

    isConnecting = true;
    connectionCount++;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      globalWebSocket = new WebSocket(wsUrl);
      wsRef.current = globalWebSocket;

      // Add error handling for connection failure
      globalWebSocket.addEventListener('error', () => {
        isConnecting = false;
        setIsConnected(false);
      });

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        isConnecting = false;
        
        // Authenticate if user is logged in
        if (user) {
          wsRef.current?.send(JSON.stringify({
            type: 'authenticate',
            userId: user.id,
            isAdmin: user.role === 'admin' || user.role === 'superadmin',
            timestamp: Date.now()
          }));
        }
        
        onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          
          // Handle different message types
          handleIncomingMessage(message);
          
          onMessage?.(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        isConnecting = false;
        globalWebSocket = null;
        onDisconnect?.();
        
        // Auto-reconnect if enabled and there are still active components
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts && connectionCount > 0) {
          reconnectAttemptsRef.current++;
          console.log(`Reconnecting... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1)); // Exponential backoff
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnecting = false;
        onError?.(error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      isConnecting = false;
      setIsConnected(false);
    }
  }, [user, onConnect, onDisconnect, onMessage, onError, autoReconnect, reconnectInterval]);

  const disconnect = useCallback(() => {
    connectionCount = Math.max(0, connectionCount - 1);
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    // Only close the global connection if no components are using it
    if (connectionCount === 0 && globalWebSocket) {
      globalWebSocket.close();
      globalWebSocket = null;
    }
    
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  const send = useCallback((message: any): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const handleIncomingMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'task_completed':
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        break;
        
      case 'points_updated':
        // Invalidate user and dashboard queries
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
        break;
        
      case 'new_task':
        // Invalidate task queries
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
        queryClient.invalidateQueries({ queryKey: ['adminTasks'] });
        break;
        
      case 'settings_updated':
        // Admin changed a setting — refresh app settings for all users immediately
        queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
        break;

      case 'system_announcement':
        // Could show a toast notification
        console.log('System announcement:', message.data.message);
        break;
        
      case 'authenticated':
        console.log('Successfully authenticated with WebSocket');
        break;
        
      case 'admin_authenticated':
        console.log('Successfully authenticated as admin with WebSocket');
        break;
        
      case 'error':
        console.error('WebSocket error:', message.data);
        break;
    }
  }, []);

  // Connect when component mounts
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Reconnect when user changes
  useEffect(() => {
    if (isConnected && user) {
      send({
        type: 'authenticate',
        userId: user.id,
        isAdmin: user.role === 'admin' || user.role === 'superadmin',
        timestamp: Date.now()
      });
    }
  }, [user, isConnected, send]);

  return {
    isConnected,
    send,
    connect,
    disconnect,
    lastMessage
  };
}

// Hook for real-time task updates
export function useTaskUpdates() {
  const [newTaskCount, setNewTaskCount] = useState(0);
  const [recentCompletions, setRecentCompletions] = useState<any[]>([]);

  useWebSocket({
    onMessage: (message) => {
      switch (message.type) {
        case 'new_task':
          setNewTaskCount(prev => prev + 1);
          break;
        case 'task_completed':
          setRecentCompletions(prev => [message.data, ...prev.slice(0, 9)]);
          break;
      }
    }
  });

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

  useWebSocket({
    onMessage: (message) => {
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
    }
  });

  return {
    activeUsers,
    recentActivities
  };
}