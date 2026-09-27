// Minimal multiplayer relay for Kopi That! (alternative to AppSync Events).
// One process, rooms in memory, validates every message, broadcasts to the room.
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT ?? 8080);
// Comma-separated list, e.g. "https://main.d123.amplifyapp.com,http://127.0.0.1:5173"
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'http://127.0.0.1:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const LIMIT = 18.5; // hall bounds from src/world/layout.ts
const MAX_MSGS_PER_SEC = 20;
const MAX_PER_ROOM = 30;

const rooms = new Map(); // room -> Set<ws>
const clamp = (v, lo, hi) =>
  typeof v === 'number' && Number.isFinite(v)
    ? Math.min(hi, Math.max(lo, v))
    : 0;

function sanitize(p, boundId) {
  if (
    !p ||
    typeof p !== 'object' ||
    typeof p.id !== 'string' ||
    !p.id.length ||
    p.id === '__connected__' ||
    p.id.length > 40
  )
    return null;
  if (boundId && p.id !== boundId) return null; // a socket may only speak for itself
  if (p.type === 'hello' || p.type === 'leave')
    return { type: p.type, id: p.id };
  if (p.type !== 'state') return null;
  return {
    type: 'state',
    id: p.id,
    name: typeof p.name === 'string' ? p.name.slice(0, 16) : 'Guest',
    color:
      typeof p.color === 'string' && /^#[0-9a-f]{6}$/i.test(p.color)
        ? p.color
        : '#2E86DE',
    x: clamp(p.x, -LIMIT, LIMIT),
    z: clamp(p.z, -LIMIT, LIMIT),
    y: clamp(p.y, 0, 3),
    h: clamp(p.h, -100, 100),
    m: p.m === true,
    busy: p.busy === true,
  };
}
function broadcast(room, data, except) {
  for (const client of rooms.get(room) ?? []) {
    if (client !== except && client.readyState === client.OPEN)
      client.send(data);
  }
}

const http = createServer((req, res) => {
  res.writeHead(req.url === '/health' ? 200 : 404, {
    'content-type': 'text/plain',
  });
  res.end(req.url === '/health' ? 'ok' : 'not found');
});
const wss = new WebSocketServer({
  server: http,
  maxPayload: 4 * 1024,
  verifyClient: ({ origin }) => ALLOWED_ORIGINS.includes(origin), // browser CORS equivalent for WS
});

wss.on('connection', (ws, req) => {
  const url = new URL(req.url ?? '/', 'http://x');
  const room =
    (url.searchParams.get('room') ?? 'lobby')
      .replace(/[^A-Za-z0-9-]/g, '')
      .slice(0, 40) || 'lobby';
  if (!rooms.has(room)) rooms.set(room, new Set());
  const members = rooms.get(room);
  if (members.size >= MAX_PER_ROOM) return ws.close(1013, 'room full');
  members.add(ws);
  ws.isAlive = true;
  let playerId = null,
    windowStart = Date.now(),
    count = 0;

  ws.on('pong', () => (ws.isAlive = true));
  ws.on('message', (buf) => {
    const now = Date.now();
    if (now - windowStart > 1000) {
      windowStart = now;
      count = 0;
    }
    if (++count > MAX_MSGS_PER_SEC) return; // drop floods silently
    let parsed;
    try {
      parsed = JSON.parse(buf.toString());
    } catch {
      return;
    }
    const msg = sanitize(parsed, playerId);
    if (!msg) return;
    playerId ??= msg.id;
    broadcast(room, JSON.stringify(msg), ws);
  });
  ws.on('close', () => {
    members.delete(ws);
    if (playerId)
      broadcast(room, JSON.stringify({ type: 'leave', id: playerId }));
    if (!members.size) rooms.delete(room);
  });
});

// Drop dead connections (closed laptops, lost Wi-Fi) every 30 s.
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30_000);

http.listen(PORT, process.env.HOST ?? '127.0.0.1', () =>
  console.log(
    `relay listening on :${PORT}, origins: ${ALLOWED_ORIGINS.join(', ')}`,
  ),
);
