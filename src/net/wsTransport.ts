import { parseMessage } from './protocol';
import type { NetMessage, Transport } from './protocol';

/** Alternative transport: a plain WebSocket relay (server/relay.js on EC2/Lightsail). */
export function createWsTransport(
  url: string,
  onMessage: (m: NetMessage) => void,
): Transport {
  let socket: WebSocket | null = null;
  let closed = false;
  let attempt = 0;
  let reconnectTimer = 0;
  function connect() {
    if (closed) return;
    socket = new WebSocket(url);
    socket.onopen = () => {
      attempt = 0;
      onMessage({ type: 'hello', id: '__connected__' });
    };
    socket.onmessage = (event) => {
      const parsed = parseMessage(event.data);
      if (parsed) onMessage(parsed);
    };
    socket.onclose = () => {
      if (closed) return;
      const delay =
        Math.min(30_000, 1000 * 2 ** attempt++) * (0.5 + Math.random() / 2);
      reconnectTimer = window.setTimeout(connect, delay);
    };
  }
  connect();
  return {
    send(message) {
      if (socket?.readyState === WebSocket.OPEN)
        socket.send(JSON.stringify(message));
    },
    close() {
      closed = true;
      clearTimeout(reconnectTimer);
      socket?.close();
    },
  };
}
