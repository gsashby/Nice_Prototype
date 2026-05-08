const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8080';

export type WsMessage = {
  type: string;
  payload: unknown;
};

export function createWebSocketClient(
  path: string,
  onMessage: (msg: WsMessage) => void,
  onError?: (err: Event) => void
): WebSocket {
  const ws = new WebSocket(`${WS_BASE}${path}`);

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string) as WsMessage;
      onMessage(msg);
    } catch {
      // ignore malformed messages
    }
  };

  if (onError) ws.onerror = onError;

  return ws;
}
