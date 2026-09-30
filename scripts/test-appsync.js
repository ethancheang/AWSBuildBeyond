import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

// Opt-in live check: uses a unique room, sends synthetic data, and closes every
// socket. Credentials come from the environment and are never printed.
const httpHost = process.env.VITE_APPSYNC_HTTP_HOST;
const realtimeHost = process.env.VITE_APPSYNC_REALTIME_HOST;
const apiKey = process.env.VITE_APPSYNC_API_KEY;
if (!httpHost || !realtimeHost || !apiKey) {
  throw new Error('Set all three VITE_APPSYNC_* values in .env.local first.');
}
const authorization = { host: httpHost, 'x-api-key': apiKey };
const room = `/game/smoke-${randomUUID()}`;
const sockets = [];

function connect(channel) {
  const socket = new WebSocket(`wss://${realtimeHost}/event/realtime`, [
    'aws-appsync-event-ws',
    `header-${Buffer.from(JSON.stringify(authorization)).toString('base64url')}`,
  ]);
  sockets.push(socket);
  const frames = [];
  const events = [];
  const subscriptionId = randomUUID();
  const send = (frame) => socket.send(JSON.stringify(frame));
  socket.addEventListener('open', () => send({ type: 'connection_init' }));
  socket.addEventListener('error', () => frames.push({ type: 'socket_error' }));
  socket.addEventListener('close', () =>
    frames.push({ type: 'socket_closed' }),
  );
  socket.addEventListener('message', ({ data }) => {
    const frame = JSON.parse(data);
    frames.push(frame);
    if (frame.type === 'connection_ack') {
      send({ type: 'subscribe', id: subscriptionId, channel, authorization });
    }
    if (frame.type === 'data') {
      for (const event of Array.isArray(frame.event)
        ? frame.event
        : [frame.event]) {
        events.push(typeof event === 'string' ? JSON.parse(event) : event);
      }
    }
  });
  async function until(predicate, label) {
    const deadline = Date.now() + 15_000;
    while (!predicate()) {
      // Report only protocol types, never server frames or authorization values.
      const error = frames.find((frame) => /error|closed/.test(frame.type));
      if (error) throw new Error(`${label}: ${error.type}`);
      if (Date.now() > deadline) throw new Error(`${label}: timed out`);
      await delay(25);
    }
  }
  return {
    events,
    until,
    ready: () =>
      until(
        () => frames.some((frame) => frame.type === 'subscribe_success'),
        'subscribe',
      ),
    async publish(payloads) {
      const id = randomUUID();
      send({
        type: 'publish',
        id,
        channel,
        events: payloads.map((payload) => JSON.stringify(payload)),
        authorization,
      });
      await until(
        () => frames.some((frame) => frame.id === id),
        'publish acknowledgment',
      );
      const ack = frames.find((frame) => frame.id === id);
      assert.equal(ack.type, 'publish_success');
      assert.equal(ack.failed?.length ?? 0, 0, 'handler rejected the batch');
    },
  };
}

try {
  const a = connect(room);
  const b = connect(room);
  const isolated = connect(`${room}-other`);
  await Promise.all([a.ready(), b.ready(), isolated.ready()]);
  console.log('PASS: three authenticated subscriptions');

  const state = {
    type: 'state',
    id: randomUUID(),
    name: 'AppSync live smoke test',
    color: '#2E86DE',
    x: 1,
    z: 2,
    y: 0,
    h: 0,
    m: true,
    busy: false,
    unexpected: 'must be stripped',
  };
  await a.publish([state]);
  await b.until(
    () => b.events.some((event) => event.id === state.id),
    'A to B',
  );
  const received = b.events.find((event) => event.id === state.id);
  assert.deepEqual(received, {
    type: 'state',
    id: state.id,
    name: state.name.slice(0, 16),
    color: state.color,
    x: 1,
    z: 2,
    y: 0,
    h: 0,
    m: true,
    busy: false,
  });
  console.log('PASS: movement delivered and AWS handler sanitizes payloads');

  await b.publish([{ ...state, x: 3, y: 1, busy: true }]);
  await a.until(
    () =>
      a.events.some((event) => event.x === 3 && event.y === 1 && event.busy),
    'B to A busy/jump state',
  );
  console.log('PASS: reverse direction, jump and lesson presence');

  const invalidId = randomUUID();
  const markerId = randomUUID();
  await a.publish([
    { ...state, id: invalidId, x: 999 },
    { type: 'hello', id: markerId },
  ]);
  await b.until(
    () => b.events.some((event) => event.id === markerId),
    'valid event in filtered batch',
  );
  await delay(1000);
  assert.equal(
    b.events.some((event) => event.id === invalidId),
    false,
  );
  assert.equal(isolated.events.length, 0);
  console.log('PASS: out-of-bounds event filtered; rooms remain isolated');

  await a.publish([{ type: 'leave', id: state.id }]);
  await b.until(
    () => b.events.some((event) => event.type === 'leave'),
    'leave event',
  );
  console.log('PASS: departure delivered');
} catch (error) {
  console.error('Live AppSync check failed:', error.message);
  process.exitCode = 1;
} finally {
  for (const socket of sockets) socket.close();
  // AppSync can delay its close handshake. Give close frames time to flush,
  // then end this standalone check instead of leaving test connections alive.
  setTimeout(() => process.exit(process.exitCode ?? 0), 5000).unref();
}
