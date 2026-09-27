import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createRelay } from './relay.js';

test('relay isolates rooms, binds identities, validates messages and announces closed sockets', async (t) => {
  const relay = createRelay({ origins: ['http://localhost'] });
  t.after(() => relay.close());
  relay.http.listen(0, '127.0.0.1');
  await once(relay.http, 'listening');
  const sockets = [];
  async function connect(room, origin = 'http://localhost') {
    const ws = new WebSocket(
      `ws://127.0.0.1:${relay.http.address().port}/?room=${room}`,
      { origin },
    );
    sockets.push(ws);
    await once(ws, 'open');
    return ws;
  }
  t.after(() => sockets.forEach((ws) => ws.terminate()));
  const a = await connect('test'),
    b = await connect('test'),
    c = await connect('other');
  const received = [],
    isolated = [];
  b.on('message', (buf) => received.push(JSON.parse(buf.toString())));
  c.on('message', (buf) => isolated.push(JSON.parse(buf.toString())));
  const next = once(b, 'message');
  a.send(JSON.stringify({ type: 'hello', id: 'a' }));
  await next;
  assert.deepEqual(received, [{ type: 'hello', id: 'a' }]);
  a.send('bad json');
  a.send(JSON.stringify({ type: 'leave', id: 'b' }));
  a.send(JSON.stringify({ type: 'state', id: 'a', x: 999, z: 999 }));
  const left = once(b, 'message');
  a.close();
  await left;
  assert.deepEqual(received, [
    { type: 'hello', id: 'a' },
    { type: 'leave', id: 'a' },
  ]);
  assert.deepEqual(isolated, []);
  await assert.rejects(connect('test', 'http://untrusted.invalid'), /401/);
});
