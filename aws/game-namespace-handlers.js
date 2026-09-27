// AppSync Events handler code for the "game" channel namespace (APPSYNC_JS runtime).
// APPSYNC_JS is a restricted subset of JS: no regex literals, no try/catch/throw,
// no while or classic for loops, no ++/--, and a limited Math. Keep it simple.
const LIMIT = 18.5; // hall bounds from src/world/layout.ts

function clamp(v, lo, hi) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  return Math.min(hi, Math.max(lo, v));
}

function clean(p) {
  const ok =
    p &&
    typeof p === 'object' &&
    typeof p.id === 'string' &&
    p.id.length > 0 &&
    p.id.length <= 40 &&
    p.id !== '__connected__';
  if (!ok) return null;
  if (p.type === 'hello' || p.type === 'leave')
    return { type: p.type, id: p.id };
  if (p.type !== 'state') return null;
  return {
    type: 'state',
    id: p.id,
    name: typeof p.name === 'string' ? p.name.slice(0, 16) : 'Guest',
    color:
      typeof p.color === 'string' && p.color.length === 7 ? p.color : '#2E86DE',
    x: clamp(p.x, -LIMIT, LIMIT),
    z: clamp(p.z, -LIMIT, LIMIT),
    y: clamp(p.y, 0, 3),
    h: clamp(p.h, -100, 100),
    m: p.m === true,
    busy: p.busy === true,
  };
}

// Drop malformed events and strip unknown fields before broadcasting.
export function onPublish(ctx) {
  const out = [];
  for (const event of ctx.events) {
    const payload = clean(event.payload);
    if (payload) out.push({ id: event.id, payload });
  }
  return out;
}
