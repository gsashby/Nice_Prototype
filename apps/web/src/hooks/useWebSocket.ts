'use client';
import { useEffect, useRef } from 'react';
import { createWebSocketClient, type WsMessage } from '@/lib/websocket-client';

export function useWebSocket(
  path: string,
  onMessage: (msg: WsMessage) => void,
  enabled = true
) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled) return;

    wsRef.current = createWebSocketClient(path, onMessage);

    return () => {
      wsRef.current?.close();
    };
  }, [path, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return wsRef;
}
