import { parseMessage } from './protocol';
import type { ConnectionStatus, NetMessage, Transport } from './protocol';

/** Optional local relay; AppSync is the default configured cloud transport. */
export function createWsTransport(
  url: string,
  onMessage: (m: NetMessage) => void,
  onReady: () => void,
  onStatus: (status: ConnectionStatus) => void = () => {},
): Transport {
  let socket: WebSocket | undefined;
  let closed = false,
    attempt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  function retry() {
    clearTimeout(deadline);
    if (closed) return;
    onStatus('reconnecting');
    const delay =
      Math.min(30_000, 1000 * 2 ** Math.min(attempt++, 5)) *
      (0.5 + Math.random() / 2);
    timer = setTimeout(connect, delay);
  }
  function connect() {
    if (closed) return;
    try {
      socket = new WebSocket(url);
    } catch {
      retry();
      return;
    }
    const current = socket;
    deadline = setTimeout(() => current.close(), 10_000);
    current.onopen = () => {
      if (closed) return;
      clearTimeout(deadline);
      attempt = 0;
      onStatus('connected');
      onReady();
    };
    current.onmessage = (event) => {
      if (closed) return;
      const parsed = parseMessage(event.data);
      if (parsed) onMessage(parsed);
    };
    current.onerror = () => current.close();
    current.onclose = retry;
  }
  onStatus('connecting');
  connect();
  return {
    send(message) {
      if (
        closed ||
        socket?.readyState !== WebSocket.OPEN ||
        socket.bufferedAmount > 16_384
      )
        return false;
      socket.send(JSON.stringify(message));
      return true;
    },
    close() {
      closed = true;
      clearTimeout(timer);
      clearTimeout(deadline);
      socket?.close();
    },
  };
}
