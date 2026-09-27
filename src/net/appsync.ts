import { parseMessage } from './protocol';
import type { NetMessage, Transport } from './protocol';

/**
 * Minimal browser client for the AWS AppSync Events WebSocket protocol
 * (https://docs.aws.amazon.com/appsync/latest/eventapi/event-api-websocket-protocol.html).
 * Every tab publishes to and subscribes to one channel, e.g. /game/lobby.
 */
export interface AppSyncConfig {
  httpHost: string; // xxxx.appsync-api.<region>.amazonaws.com
  realtimeHost: string; // xxxx.appsync-realtime-api.<region>.amazonaws.com
  apiKey: string; // da2-...
  channel: string; // /game/lobby
}

const base64Url = (value: object) =>
  btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

export function createAppSyncTransport(
  config: AppSyncConfig,
  onMessage: (message: NetMessage) => void,
): Transport {
  const auth = { host: config.httpHost, 'x-api-key': config.apiKey };
  const subscriptionId = crypto.randomUUID();
  let socket: WebSocket | null = null;
  let ready = false;
  let closed = false;
  let attempt = 0;
  let keepAliveTimer = 0;
  let reconnectTimer = 0;
  let timeoutMs = 300_000;

  function connect() {
    if (closed) return;
    ready = false;
    socket = new WebSocket(`wss://${config.realtimeHost}/event/realtime`, [
      'aws-appsync-event-ws',
      `header-${base64Url(auth)}`,
    ]);
    // Also bound the initial handshake/subscription wait.
    keepAliveTimer = window.setTimeout(() => socket?.close(), 15_000);
    socket.onopen = () =>
      socket?.send(JSON.stringify({ type: 'connection_init' }));
    socket.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }
      if (!msg || typeof msg !== 'object') return;
      switch (msg.type) {
        case 'connection_ack':
          timeoutMs = msg.connectionTimeoutMs ?? timeoutMs;
          armKeepAlive();
          socket?.send(
            JSON.stringify({
              type: 'subscribe',
              id: subscriptionId,
              channel: config.channel,
              authorization: auth,
            }),
          );
          break;
        case 'subscribe_success':
          if (msg.id !== subscriptionId) break;
          ready = true;
          attempt = 0;
          onMessage({ type: 'hello', id: '__connected__' }); // lets the caller announce itself
          break;
        case 'ka':
          armKeepAlive();
          break;
        case 'data': {
          if (!ready || msg.id !== subscriptionId) break;
          // "event" is documented as JSON text; accept a single string or an array of them.
          const events = Array.isArray(msg.event) ? msg.event : [msg.event];
          for (const raw of events) {
            const parsed = parseMessage(raw);
            if (parsed) onMessage(parsed);
          }
          break;
        }
        case 'subscribe_error':
          socket?.close();
          break;
        case 'publish_error':
        case 'broadcast_error':
        case 'error':
          console.warn('[multiplayer] AppSync request failed:', msg.type);
          break;
      }
    };
    socket.onclose = () => {
      ready = false;
      clearTimeout(keepAliveTimer);
      if (closed) return;
      // Jittered exponential backoff, as the AppSync protocol guide recommends.
      const delay =
        Math.min(30_000, 1000 * 2 ** attempt++) * (0.5 + Math.random() / 2);
      reconnectTimer = window.setTimeout(connect, delay);
    };
  }
  function armKeepAlive() {
    clearTimeout(keepAliveTimer);
    keepAliveTimer = window.setTimeout(() => socket?.close(), timeoutMs);
  }
  connect();

  return {
    send(message) {
      if (!ready || socket?.readyState !== WebSocket.OPEN) return;
      socket.send(
        JSON.stringify({
          type: 'publish',
          id: crypto.randomUUID(),
          channel: config.channel,
          events: [JSON.stringify(message)],
          authorization: auth,
        }),
      );
    },
    close() {
      closed = true;
      clearTimeout(reconnectTimer);
      clearTimeout(keepAliveTimer);
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({ type: 'unsubscribe', id: subscriptionId }),
        );
      }
      socket?.close();
    },
  };
}
