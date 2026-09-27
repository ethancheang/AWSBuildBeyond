import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createAppSyncTransport } from '../../src/net/appsync';
import { createWsTransport } from '../../src/net/wsTransport';
import { transportFromEnv } from '../../src/net';

class Socket {
  static OPEN = 1;
  static instances: Socket[] = [];
  readyState = 0;
  bufferedAmount = 0;
  sent: Record<string, unknown>[] = [];
  onopen?: () => void;
  onclose?: () => void;
  onerror?: () => void;
  onmessage?: (event: { data: string }) => void;
  constructor(
    public url: string,
    public protocols?: string[],
  ) {
    Socket.instances.push(this);
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  send(raw: string) {
    this.sent.push(JSON.parse(raw));
  }
  frame(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
  close() {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.onclose?.();
  }
}
const config = {
  httpHost: 'demo.appsync-api.ap-southeast-1.amazonaws.com',
  realtimeHost: 'demo.appsync-realtime-api.ap-southeast-1.amazonaws.com',
  apiKey: 'test-key',
  channel: '/game/test',
};
const hello = { type: 'hello', id: 'other' } as const;
beforeEach(() => {
  vi.useFakeTimers();
  Socket.instances = [];
  vi.stubGlobal('WebSocket', Socket);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function subscribe(socket: Socket) {
  socket.open();
  socket.frame({ type: 'connection_ack', connectionTimeoutMs: 300000 });
  const id = socket.sent.at(-1)!.id;
  socket.frame({ type: 'subscribe_success', id });
  return id;
}
it('uses AppSync auth/frames, waits for subscription, validates data and drops backpressure', () => {
  const receive = vi.fn(),
    ready = vi.fn();
  const transport = createAppSyncTransport(config, receive, ready);
  const socket = Socket.instances[0];
  expect(socket.url).toBe(`wss://${config.realtimeHost}/event/realtime`);
  expect(socket.protocols?.[0]).toBe('aws-appsync-event-ws');
  const header = socket
    .protocols![1].slice(7)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  expect(JSON.parse(atob(header))).toEqual({
    host: config.httpHost,
    'x-api-key': 'test-key',
  });
  expect(transport.send(hello)).toBe(false);
  const id = subscribe(socket);
  expect(ready).toHaveBeenCalledOnce();
  expect(socket.sent[0]).toEqual({ type: 'connection_init' });
  expect(socket.sent[1]).toMatchObject({
    type: 'subscribe',
    channel: '/game/test',
  });
  expect(transport.send(hello)).toBe(true);
  expect(socket.sent.at(-1)).toMatchObject({
    type: 'publish',
    events: [JSON.stringify(hello)],
  });
  socket.onmessage?.({ data: '{bad' });
  socket.frame(null);
  socket.frame({ type: 'data', id: 'wrong', event: [JSON.stringify(hello)] });
  socket.frame({ type: 'data', id, event: ['invalid', JSON.stringify(hello)] });
  expect(receive).toHaveBeenCalledExactlyOnceWith(hello);
  socket.bufferedAmount = 20000;
  expect(transport.send(hello)).toBe(false);
  socket.bufferedAmount = 0;
  transport.close();
  expect(socket.sent.at(-1)).toEqual({ type: 'unsubscribe', id });
  vi.advanceTimersByTime(60000);
  expect(Socket.instances).toHaveLength(1);
  expect(vi.getTimerCount()).toBe(0);
});
it.each([
  'subscribe_error',
  'connection_error',
  'publish_error',
  'broadcast_error',
])('reconnects after %s without queuing stale movement', (type) => {
  const ready = vi.fn();
  const transport = createAppSyncTransport(config, vi.fn(), ready);
  const first = Socket.instances[0];
  subscribe(first);
  first.frame({ type });
  expect(transport.send(hello)).toBe(false);
  vi.advanceTimersByTime(1000);
  expect(Socket.instances).toHaveLength(2);
  subscribe(Socket.instances[1]);
  expect(ready).toHaveBeenCalledTimes(2);
  transport.close();
  expect(vi.getTimerCount()).toBe(0);
});
it('times out a missing handshake and a missed keep-alive', () => {
  const transport = createAppSyncTransport(config, vi.fn(), vi.fn());
  vi.advanceTimersByTime(11000);
  expect(Socket.instances).toHaveLength(2);
  const socket = Socket.instances[1];
  subscribe(socket);
  vi.advanceTimersByTime(200000);
  socket.frame({ type: 'ka' });
  vi.advanceTimersByTime(299999);
  expect(socket.readyState).toBe(1);
  vi.advanceTimersByTime(1);
  expect(socket.readyState).toBe(3);
  transport.close();
  expect(vi.getTimerCount()).toBe(0);
});
it('the relay transport announces reconnects and cancels retries on close', () => {
  const ready = vi.fn();
  const transport = createWsTransport('ws://localhost', vi.fn(), ready);
  Socket.instances[0].open();
  expect(ready).toHaveBeenCalledOnce();
  Socket.instances[0].close();
  vi.advanceTimersByTime(1000);
  Socket.instances[1].open();
  expect(ready).toHaveBeenCalledTimes(2);
  Socket.instances[1].close();
  transport.close();
  vi.advanceTimersByTime(60000);
  expect(Socket.instances).toHaveLength(2);
  expect(vi.getTimerCount()).toBe(0);
});
it('stays solo without configuration, supports opt-out, and normalizes room after truncation', () => {
  for (const key of [
    'VITE_APPSYNC_HTTP_HOST',
    'VITE_APPSYNC_REALTIME_HOST',
    'VITE_APPSYNC_API_KEY',
    'VITE_WS_URL',
  ])
    vi.stubEnv(key, '');
  vi.stubGlobal('location', { search: '' });
  expect(transportFromEnv()).toBeNull();
  vi.stubEnv('VITE_WS_URL', 'ws://localhost:8080/?existing=1');
  vi.stubGlobal('location', { search: '?solo=1' });
  expect(transportFromEnv()).toBeNull();
  vi.stubGlobal('location', { search: `?room=${'a'.repeat(39)}-b` });
  const transport = transportFromEnv()!(vi.fn(), vi.fn());
  const url = new URL(Socket.instances[0].url);
  expect(url.searchParams.get('room')).toBe('a'.repeat(39));
  expect(url.searchParams.get('existing')).toBe('1');
  transport.close();
});
