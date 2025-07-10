import { useState, useEffect, useRef, useCallback } from 'react';

export interface WebSocketMessage {
  type: string;
  payload?: any;
}

export interface UseWebSocketProps {
  url?: string;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoReconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export function useWebSocket({
  url,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  autoReconnect = true,
  reconnectAttempts = 5,
  reconnectDelay = 3000
}: UseWebSocketProps) {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<WebSocketMessage[]>([]);

  const connect = useCallback(() => {
    if (!url) {
      console.log('🔍 No WebSocket URL provided, skipping connection');
      return;
    }
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('🔍 WebSocket already connected, skipping');
      return; // Already connected
    }
    
    console.log('🔍 Connecting to WebSocket:', url);
    setConnectionStatus('connecting');
    
    try {
      wsRef.current = new WebSocket(url);
      
      wsRef.current.onopen = () => {
        console.log('🔗 WebSocket connected successfully');
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        
        // Send any queued messages
        while (messageQueueRef.current.length > 0) {
          const message = messageQueueRef.current.shift();
          if (message) {
            console.log('📤 Sending queued message:', message.type);
            sendMessage(message.type, message.payload);
          }
        }
        
        onConnect?.();
      };
      
      wsRef.current.onmessage = (event) => {
        console.log('📥 Received WebSocket message:', event.data);
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      wsRef.current.onclose = (event) => {
        console.log('🔌 WebSocket connection closed. Code:', event.code, 'Reason:', event.reason, 'Clean:', event.wasClean);
        setConnectionStatus('disconnected');
        onDisconnect?.();
        
        // Attempt to reconnect if enabled
        if (autoReconnect && reconnectAttemptsRef.current < reconnectAttempts) {
          reconnectAttemptsRef.current++;
          
          // Exponential backoff with jitter for better mobile stability
          const baseDelay = reconnectDelay * Math.pow(1.5, reconnectAttemptsRef.current - 1);
          const jitter = Math.random() * 1000; // Add up to 1 second of jitter
          const delay = Math.min(baseDelay + jitter, 30000); // Cap at 30 seconds
          
          console.log(`🔄 Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttemptsRef.current}/${reconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= reconnectAttempts) {
          console.error('❌ Max reconnection attempts reached');
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error occurred:', error);
        setConnectionStatus('error');
        onError?.(error);
      };
      
    } catch (error) {
      setConnectionStatus('error');
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [url, onConnect, onMessage, onDisconnect, onError, autoReconnect, reconnectAttempts, reconnectDelay]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setConnectionStatus('disconnected');
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0; // Reset attempts
    connect();
  }, [disconnect, connect]);

  const sendMessage = useCallback((type: string, payload?: any) => {
    const message: WebSocketMessage = { type, payload };
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      // Queue message for when connection is established
      messageQueueRef.current.push(message);
    }
  }, []);

  // Connect when URL is provided
  useEffect(() => {
    if (url) {
      console.log('🔍 useWebSocket effect triggered with URL:', url);
      connect();
    }
    
    return () => {
      console.log('🔍 useWebSocket cleanup triggered');
      disconnect();
    };
  }, [url, connect, disconnect]);

  return {
    connectionStatus,
    lastMessage,
    connect,
    disconnect,
    reconnect,
    sendMessage,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting'
  };
}