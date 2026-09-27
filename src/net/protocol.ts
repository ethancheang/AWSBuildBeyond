import { insideHall } from '../world/layout';

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
  /** False means disconnected/backpressured; stale movement is never queued. */
  send(message: NetMessage): boolean;
  close(): void;
}
export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting';
export type TransportFactory = (
  onMessage: (message: NetMessage) => void,
  onReady: () => void,
  onStatus?: (status: ConnectionStatus) => void,
) => Transport;

const finite = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

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
    !/^[A-Za-z0-9-]{1,40}$/.test(p.id)
  )
    return null;
  if (p.type === 'hello' || p.type === 'leave')
    return { type: p.type, id: p.id };
  if (p.type !== 'state') return null;
  if (
    !finite(p.x) ||
    !finite(p.z) ||
    !insideHall({ x: p.x, z: p.z }) ||
    !finite(p.y) ||
    p.y < 0 ||
    p.y > 3 ||
    !finite(p.h) ||
    Math.abs(p.h) > 100 ||
    typeof p.m !== 'boolean' ||
    typeof p.busy !== 'boolean'
  )
    return null;
  return {
    type: 'state',
    id: p.id,
    name:
      typeof p.name === 'string'
        ? p.name.trim().slice(0, 16) || 'Guest'
        : 'Guest',
    color:
      typeof p.color === 'string' && /^#[0-9a-f]{6}$/i.test(p.color)
        ? p.color
        : '#2E86DE',
    x: p.x,
    z: p.z,
    y: p.y,
    h: p.h,
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
