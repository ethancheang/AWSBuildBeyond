import { parseMessage } from './protocol';
import type { ConnectionStatus, NetMessage, Transport } from './protocol';

export interface AppSyncConfig {
  httpHost: string;
  realtimeHost: string;
  apiKey: string;
  channel: string;
}
const base64Url = (value: object) =>
  btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/** AppSync Events protocol. Never buffers positions across a disconnect. */
export function createAppSyncTransport(
  config: AppSyncConfig,
  onMessage: (message: NetMessage) => void,
  onReady: () => void,
  onStatus: (status: ConnectionStatus) => void = () => {},
): Transport {
  const auth = { host: config.httpHost, 'x-api-key': config.apiKey };
  const subscriptionId = crypto.randomUUID();
  let socket: WebSocket | undefined;
  let ready = false,
    closed = false,
    attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let keepAlive: ReturnType<typeof setTimeout> | undefined;
  let timeoutMs = 300_000;
  const write = (message: object) => {
    if (socket?.readyState !== WebSocket.OPEN || socket.bufferedAmount > 16_384)
      return false;
    socket.send(JSON.stringify(message));
    return true;
  };
  const armKeepAlive = () => {
    clearTimeout(keepAlive);
    keepAlive = setTimeout(() => socket?.close(), timeoutMs);
  };
  function retry() {
    ready = false;
    clearTimeout(deadline);
    clearTimeout(keepAlive);
    if (closed) return;
    onStatus('reconnecting');
    const delay =
      Math.min(30_000, 1000 * 2 ** Math.min(attempt++, 5)) *
      (0.5 + Math.random() / 2);
    retryTimer = setTimeout(connect, delay);
  }
  function connect() {
    if (closed) return;
    ready = false;
    try {
      socket = new WebSocket(`wss://${config.realtimeHost}/event/realtime`, [
        'aws-appsync-event-ws',
        `header-${base64Url(auth)}`,
      ]);
    } catch {
      retry();
      return;
    }
    const current = socket;
    deadline = setTimeout(() => current.close(), 10_000);
    current.onopen = () => write({ type: 'connection_init' });
    current.onmessage = (event) => {
      if (closed || socket !== current) return;
      let msg;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }
      if (!msg || typeof msg !== 'object') return;
      switch (msg.type) {
        case 'connection_ack':
          if (
            Number.isFinite(msg.connectionTimeoutMs) &&
            msg.connectionTimeoutMs > 0
          )
            timeoutMs = Math.min(msg.connectionTimeoutMs, 300_000);
          armKeepAlive();
          write({
            type: 'subscribe',
            id: subscriptionId,
            channel: config.channel,
            authorization: auth,
          });
          break;
        case 'subscribe_success':
          if (msg.id !== subscriptionId || ready) return;
          clearTimeout(deadline);
          ready = true;
          attempt = 0;
          onStatus('connected');
          onReady();
          break;
        case 'ka':
          armKeepAlive();
          break;
        case 'data':
          if (!ready || msg.id !== subscriptionId) return;
          for (const raw of Array.isArray(msg.event)
            ? msg.event
            : [msg.event]) {
            const parsed = parseMessage(raw);
            if (parsed) onMessage(parsed);
          }
          break;
        case 'publish_success':
          if (Array.isArray(msg.failed) && msg.failed.length) current.close();
          break;
        case 'connection_error':
        case 'subscribe_error':
        case 'publish_error':
        case 'broadcast_error':
        case 'error':
          // Do not log frames: they may contain credentials or player data.
          ready = false;
          current.close();
          break;
      }
    };
    current.onerror = () => current.close();
    current.onclose = () => {
      if (socket === current) retry();
    };
  }
  onStatus('connecting');
  connect();
  return {
    send(message) {
      return (
        ready &&
        write({
          type: 'publish',
          id: crypto.randomUUID(),
          channel: config.channel,
          events: [JSON.stringify(message)],
          authorization: auth,
        })
      );
    },
    close() {
      closed = true;
      clearTimeout(retryTimer);
      clearTimeout(deadline);
      clearTimeout(keepAlive);
      if (ready) write({ type: 'unsubscribe', id: subscriptionId });
      ready = false;
      socket?.close();
    },
  };
}
