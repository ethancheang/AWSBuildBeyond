/** Messages shared by every multiplayer transport (AppSync Events or a plain WebSocket server). */
export interface StateMessage {
  type: 'state';
  id: string; // random per browser tab
  name: string;
  color: string; // shirt colour, #RRGGBB
  x: number; // hall coordinates from src/world/layout.ts (metres)
  z: number;
  y: number; // jump height (0 on branches without jumping)
  h: number; // heading in radians (person.rotation.y)
  m: boolean; // moving → play walk swing
  busy: boolean; // in a lesson / dialog (hub not active)
}
export interface HelloMessage {
  type: 'hello'; // "I just joined, please send your state"
  id: string;
}
export interface LeaveMessage {
  type: 'leave';
  id: string;
}
export type NetMessage = StateMessage | HelloMessage | LeaveMessage;

export interface Transport {
  send(message: NetMessage): void;
  close(): void;
}
export type TransportFactory = (
  onMessage: (message: NetMessage) => void,
) => Transport;

const HALL_LIMIT = 18.5; // matches BOUNDS in src/world/layout.ts
const clamp = (v: unknown, lo: number, hi: number) =>
  typeof v === 'number' && Number.isFinite(v)
    ? Math.min(hi, Math.max(lo, v))
    : 0;

/** Never trust the network: validate everything before it touches the scene. */
export function parseMessage(raw: unknown): NetMessage | null {
  const p = (typeof raw === 'string' ? safeJson(raw) : raw) as Record<
    string,
    unknown
  > | null;
  if (
    !p ||
    typeof p !== 'object' ||
    typeof p.id !== 'string' ||
    !p.id.length ||
    p.id === '__connected__' ||
    p.id.length > 40
  )
    return null;
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
    x: clamp(p.x, -HALL_LIMIT, HALL_LIMIT),
    z: clamp(p.z, -HALL_LIMIT, HALL_LIMIT),
    y: clamp(p.y, 0, 3),
    h: clamp(p.h, -100, 100),
    m: p.m === true,
    busy: p.busy === true,
  };
}
function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
