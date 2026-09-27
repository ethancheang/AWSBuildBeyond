import { createAppSyncTransport } from './appsync';
import { createWsTransport } from './wsTransport';
import type { TransportFactory } from './protocol';

/**
 * Picks a transport from Vite env vars. With none set, the game stays single-player,
 * so `npm run dev`, unit tests and Playwright keep working unchanged.
 */
export function transportFromEnv(): TransportFactory | null {
  const env = import.meta.env;
  const params = new URLSearchParams(location.search);
  if (params.get('solo') === '1') return null;
  // Channel segments: letters, digits and dashes only (AppSync channel rules).
  const room =
    (params.get('room') ?? 'lobby')
      .replace(/[^A-Za-z0-9-]/g, '')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'lobby';
  const httpHost = env.VITE_APPSYNC_HTTP_HOST;
  const realtimeHost = env.VITE_APPSYNC_REALTIME_HOST;
  const apiKey = env.VITE_APPSYNC_API_KEY;
  if (httpHost && realtimeHost && apiKey) {
    return (onMessage) =>
      createAppSyncTransport(
        { httpHost, realtimeHost, apiKey, channel: `/game/${room}` },
        onMessage,
      );
  }
  const wsUrl = env.VITE_WS_URL;
  if (wsUrl) {
    return (onMessage) =>
      createWsTransport(`${wsUrl}?room=${encodeURIComponent(room)}`, onMessage);
  }
  return null;
}
