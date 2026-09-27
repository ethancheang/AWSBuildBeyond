// Self-contained APPSYNC_JS namespace handler: upload this file without bundling.
// Keep validation compatible with the restricted AWS runtime (no regex objects).
// The client parser and relay are checked against this handler in contract tests.
function allowed(value, alphabet, max) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= max &&
    value.split('').every((c) => alphabet.indexOf(c) >= 0)
  );
}
function finite(v) {
  return typeof v === 'number' && Number.isFinite(v);
}
function clean(p) {
  if (
    !p ||
    typeof p !== 'object' ||
    !allowed(
      p.id,
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-',
      40,
    )
  )
    return null;
  if (p.type === 'hello' || p.type === 'leave')
    return { type: p.type, id: p.id };
  if (
    p.type !== 'state' ||
    !finite(p.x) ||
    !finite(p.z) ||
    !finite(p.y) ||
    p.y < 0 ||
    p.y > 3 ||
    !finite(p.h) ||
    p.h < -100 ||
    p.h > 100 ||
    typeof p.m !== 'boolean' ||
    typeof p.busy !== 'boolean'
  )
    return null;
  // Same inset octagon as insideHall(): radius 19, clearance 0.45.
  const x = Math.max(p.x, -p.x),
    z = Math.max(p.z, -p.z);
  const sin = 0.3826834323650898,
    cos = 0.9238795325112867;
  if (
    sin * x + cos * z > 19 * cos - 0.45 ||
    cos * x + sin * z > 19 * cos - 0.45
  )
    return null;
  const color =
    typeof p.color === 'string' &&
    p.color.length === 7 &&
    p.color.startsWith('#') &&
    allowed(p.color.slice(1), '0123456789abcdefABCDEF', 6)
      ? p.color
      : '#2E86DE';
  return {
    type: 'state',
    id: p.id,
    name:
      typeof p.name === 'string'
        ? p.name.trim().slice(0, 16) || 'Guest'
        : 'Guest',
    color,
    x: p.x,
    z: p.z,
    y: p.y,
    h: p.h,
    m: p.m,
    busy: p.busy,
  };
}
export function onPublish(ctx) {
  const out = [];
  for (const event of ctx.events) {
    const payload = clean(event.payload);
    if (payload) out.push({ id: event.id, payload });
  }
  return out;
}
