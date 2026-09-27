import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import { onPublish } from '../aws/game-namespace-handlers.js';

/** Optional development relay. Room membership is in memory and socket-bound. */
export function createRelay({ origins = ['http://127.0.0.1:5173'] } = {}) {
  const rooms = new Map();
  const http = createServer((req, res) => {
    res.writeHead(req.url === '/health' ? 200 : 404, {
      'content-type': 'text/plain',
    });
    res.end(req.url === '/health' ? 'ok' : 'not found');
  });
  const wss = new WebSocketServer({
    server: http,
    maxPayload: 4096,
    verifyClient: ({ origin }) => origins.includes(origin),
  });
  function broadcast(room, message, except) {
    const data = JSON.stringify(message);
    for (const client of rooms.get(room) ?? [])
      if (
        client !== except &&
        client.readyState === WebSocket.OPEN &&
        client.bufferedAmount < 16_384
      )
        client.send(data);
  }
  wss.on('connection', (ws, req) => {
    const room =
      new URL(req.url ?? '/', 'http://localhost').searchParams.get('room') ??
      'lobby';
    if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38}[A-Za-z0-9])?$/.test(room)) {
      ws.close(1008, 'invalid room');
      return;
    }
    if (!rooms.has(room)) rooms.set(room, new Set());
    const members = rooms.get(room);
    if (members.size >= 30) {
      ws.close(1013, 'room full');
      return;
    }
    members.add(ws);
    ws.isAlive = true;
    let playerId,
      windowStart = Date.now(),
      count = 0;
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    ws.on('message', (buf) => {
      const now = Date.now();
      if (now - windowStart >= 1000) {
        windowStart = now;
        count = 0;
      }
      if (++count > 20) return;
      let payload;
      try {
        payload = JSON.parse(buf.toString());
      } catch {
        return;
      }
      const msg = onPublish({ events: [{ id: 'event', payload }] })[0]?.payload;
      if (!msg || (playerId && msg.id !== playerId)) return;
      if (
        !playerId &&
        [...members].some(
          (member) => member !== ws && member.playerId === msg.id,
        )
      ) {
        ws.close(1008, 'duplicate player');
        return;
      }
      playerId ??= msg.id;
      ws.playerId = playerId;
      broadcast(room, msg, ws);
    });
    ws.on('close', () => {
      members.delete(ws);
      if (playerId) broadcast(room, { type: 'leave', id: playerId });
      if (!members.size) rooms.delete(room);
    });
    ws.on('error', () => ws.terminate());
  });
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) ws.terminate();
      else {
        ws.isAlive = false;
        ws.ping();
      }
    }
  }, 30_000);
  return {
    http,
    close() {
      clearInterval(heartbeat);
      for (const ws of wss.clients) ws.terminate();
      wss.close();
      http.close();
    },
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const origins = (process.env.ALLOWED_ORIGINS ?? 'http://127.0.0.1:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const relay = createRelay({ origins });
  relay.http.listen(
    Number(process.env.PORT ?? 8080),
    process.env.HOST ?? '127.0.0.1',
    () =>
      console.log(`Relay listening on ${JSON.stringify(relay.http.address())}`),
  );
  process.on('SIGTERM', () => relay.close());
  process.on('SIGINT', () => relay.close());
}
