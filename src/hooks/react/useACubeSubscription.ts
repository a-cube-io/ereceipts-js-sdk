/**
 * useACubeSubscription - Real-time data subscriptions
 * Handles WebSocket connections and real-time updates
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ACubeSDK } from '@/core/sdk';

export interface SubscriptionOptions<TData> {
  enabled?: boolean;
  reconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  onData?: (data: TData) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  filter?: (data: TData) => boolean;
  transform?: (data: any) => TData;
}

export interface SubscriptionResult<TData> {
  data: TData | null;
  error: Error | null;
  isConnected: boolean;
  isConnecting: boolean;
  isError: boolean;
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';
  reconnectCount: number;
  subscribe: () => void;
  unsubscribe: () => void;
  send: (message: any) => void;
}

export function useACubeSubscription<TData = unknown>(
  subscriptionKey: string,
  options: SubscriptionOptions<TData> = {}
): SubscriptionResult<TData> {
  const {
    enabled = true,
    reconnect = true,
    reconnectDelay = 1000,
    maxReconnectAttempts = 5,
    onData,
    onError,
    onConnect,
    onDisconnect,
    filter,
    transform,
  } = options;

  const [state, setState] = useState<{
    data: TData | null;
    error: Error | null;
    isConnected: boolean;
    isConnecting: boolean;
    connectionStatus: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';
    reconnectCount: number;
  }>({
    data: null,
    error: null,
    isConnected: false,
    isConnecting: false,
    connectionStatus: 'idle',
    reconnectCount: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManuallyDisconnected = useRef(false);

  const sdk = useACubeSDK(); // Would need to be implemented

  const connect = useCallback(() => {
    if (!sdk || !enabled) return;

    setState(prev => ({
      ...prev,
      isConnecting: true,
      connectionStatus: 'connecting',
      error: null,
    }));

    try {
      // Create WebSocket connection
      const wsUrl = getWebSocketUrl(sdk, subscriptionKey);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          connectionStatus: 'connected',
          error: null,
          reconnectCount: 0,
        }));
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const rawData = JSON.parse(event.data);
          const processedData = transform ? transform(rawData) : rawData;
          
          // Apply filter if provided
          if (filter && !filter(processedData)) {
            return;
          }

          setState(prev => ({
            ...prev,
            data: processedData,
            error: null,
          }));

          onData?.(processedData);
        } catch (error) {
          const err = error instanceof Error ? error : new Error('Failed to parse message');
          setState(prev => ({ ...prev, error: err }));
          onError?.(err);
        }
      };

      ws.onclose = (event) => {
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          connectionStatus: event.wasClean ? 'disconnected' : 'error',
        }));

        onDisconnect?.();

        // Attempt reconnection if not manually disconnected
        if (!isManuallyDisconnected.current && reconnect && state.reconnectCount < maxReconnectAttempts) {
          const delay = reconnectDelay * Math.pow(2, state.reconnectCount);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setState(prev => ({
              ...prev,
              reconnectCount: prev.reconnectCount + 1,
            }));
            connect();
          }, delay) as unknown as NodeJS.Timeout;
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        const err = new Error('WebSocket connection error');
        setState(prev => ({
          ...prev,
          error: err,
          isConnecting: false,
          connectionStatus: 'error',
        }));
        onError?.(err);
      };

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to create WebSocket connection');
      setState(prev => ({
        ...prev,
        error: err,
        isConnecting: false,
        connectionStatus: 'error',
      }));
      onError?.(err);
    }
  }, [sdk, enabled, subscriptionKey, reconnect, reconnectDelay, maxReconnectAttempts, onConnect, onDisconnect, onData, onError, filter, transform, state.reconnectCount]);

  const disconnect = useCallback(() => {
    isManuallyDisconnected.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      connectionStatus: 'disconnected',
      reconnectCount: 0,
    }));
  }, []);

  const send = useCallback((message: any) => {
    if (wsRef.current && state.isConnected) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, [state.isConnected]);

  const subscribe = useCallback(() => {
    isManuallyDisconnected.current = false;
    connect();
  }, [connect]);

  const unsubscribe = useCallback(() => {
    disconnect();
  }, [disconnect]);

  // Auto-connect when enabled
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    isError: state.connectionStatus === 'error',
    subscribe,
    unsubscribe,
    send,
  };
}

// Helper function to get WebSocket URL
function getWebSocketUrl(sdk: ACubeSDK, subscriptionKey: string): string {
  // This would be implemented based on SDK configuration
  const config = sdk.getConfig();
  const baseUrl = config.baseUrls?.api || 'wss://ereceipts-it-sandbox.acubeapi.com';
  const wsUrl = baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
  return `${wsUrl}/ws/${subscriptionKey}`;
}

// Placeholder for SDK context hook
function useACubeSDK(): ACubeSDK {
  throw new Error('useACubeSDK must be used within ACubeProvider');
}