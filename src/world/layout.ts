import { STALLS } from '../content/stalls';
export interface Point {
  x: number;
  z: number;
}
export interface Obstacle extends Point {
  radius: number;
}

export const HALL_RADIUS = 19;
export const SPAWN: Point = { x: 0, z: 14 };
export const radial = (angle: number, radius: number): Point => ({
  x: Math.sin(angle) * radius,
  z: Math.cos(angle) * radius,
});
export const STALL_LAYOUT = STALLS.map((stall, index) => {
  const angle = ((index + 0.5) * Math.PI) / 4;
  return {
    ...stall,
    angle,
    position: radial(angle, 14.6),
    approach: radial(angle, 11.7),
    rotation: angle + Math.PI,
  };
});
export const STALL_POSITIONS: Point[] = STALL_LAYOUT.filter(
  (stall) => stall.lessonIndex !== undefined,
)
  .sort((a, b) => a.lessonIndex! - b.lessonIndex!)
  .map((stall) => stall.approach);
export const TABLE_POSITIONS: Point[] = Array.from({ length: 8 }, (_, i) =>
  radial(((i + 0.5) * Math.PI) / 4, 7.8),
);
export const BOUNDS = { minX: -18.5, maxX: 18.5, minZ: -18.5, maxZ: 18.5 };
// Radii include the player's clearance and the stools around each table.
export const OBSTACLES: Obstacle[] = [
  ...TABLE_POSITIONS.map((p) => ({ ...p, radius: 1.7 })),
  { x: 0, z: 0, radius: 3.25 },
  { x: -2.3, z: 16.4, radius: 0.9 },
];

/** Convex octagon boundary, inset by the avatar's radius. */
export function insideHall(p: Point): boolean {
  const apothem = HALL_RADIUS * Math.cos(Math.PI / 8) - 0.45;
  return STALL_LAYOUT.every(
    (stall) =>
      p.x * Math.sin(stall.angle) + p.z * Math.cos(stall.angle) <= apothem,
  );
}

function insideStall(p: Point): boolean {
  return STALL_LAYOUT.some((stall) => {
    const dx = p.x - stall.position.x,
      dz = p.z - stall.position.z;
    const tangent = dx * Math.cos(stall.angle) - dz * Math.sin(stall.angle);
    const depth = dx * Math.sin(stall.angle) + dz * Math.cos(stall.angle);
    return Math.abs(tangent) < 3.8 && Math.abs(depth) < 1.95;
  });
}

export function isWalkable(p: Point): boolean {
  return (
    p.x >= BOUNDS.minX &&
    p.x <= BOUNDS.maxX &&
    p.z >= BOUNDS.minZ &&
    p.z <= BOUNDS.maxZ &&
    insideHall(p) &&
    !insideStall(p) &&
    OBSTACLES.every((o) => Math.hypot(p.x - o.x, p.z - o.z) >= o.radius)
  );
}

export function moveWithCollision(
  position: Point,
  dx: number,
  dz: number,
): Point {
  // Substeps prevent tunnelling after a slow frame. Separate axes allow sliding.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.15));
  const next = { ...position };
  for (let i = 0; i < steps; i++) {
    if (isWalkable({ x: next.x + dx / steps, z: next.z })) next.x += dx / steps;
    if (isWalkable({ x: next.x, z: next.z + dz / steps })) next.z += dz / steps;
  }
  return next;
}

export function clearPath(a: Point, b: Point): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.15));
  for (let i = 1; i <= steps; i++) {
    if (
      !isWalkable({
        x: a.x + ((b.x - a.x) * i) / steps,
        z: a.z + ((b.z - a.z) * i) / steps,
      })
    )
      return false;
  }
  return true;
}

/** Bounded A* on the small static hall, followed by line-of-sight smoothing. */
export function findPath(start: Point, goal: Point): Point[] {
  if (!isWalkable(goal)) return [];
  if (clearPath(start, goal)) return [goal];
  const step = 0.5;
  const key = (p: Point) => `${p.x},${p.z}`;
  const nodes = new Map<string, Point>();
  for (let x = BOUNDS.minX; x <= BOUNDS.maxX; x += step) {
    for (let z = BOUNDS.minZ; z <= BOUNDS.maxZ; z += step) {
      const p = { x, z };
      if (isWalkable(p)) nodes.set(key(p), p);
    }
  }
  const nearest = [...nodes.values()]
    .sort(
      (a, b) =>
        Math.hypot(a.x - start.x, a.z - start.z) -
        Math.hypot(b.x - start.x, b.z - start.z),
    )
    .find((p) => clearPath(start, p));
  if (!nearest) return [];
  const first = key(nearest),
    open = new Set([first]);
  const cost = new Map([[first, 0]]),
    previous = new Map<string, string>();
  const heuristic = (p: Point) => Math.hypot(p.x - goal.x, p.z - goal.z);
  let end: string | undefined;
  while (open.size) {
    let current = first,
      best = Infinity;
    for (const id of open) {
      const score = cost.get(id)! + heuristic(nodes.get(id)!);
      if (score < best) {
        best = score;
        current = id;
      }
    }
    const p = nodes.get(current)!;
    if (heuristic(p) < 0.8 && clearPath(p, goal)) {
      end = current;
      break;
    }
    open.delete(current);
    for (const dx of [-step, 0, step])
      for (const dz of [-step, 0, step]) {
        if (!dx && !dz) continue;
        const n = { x: p.x + dx, z: p.z + dz },
          id = key(n);
        if (!nodes.has(id) || !clearPath(p, n)) continue;
        const score = cost.get(current)! + Math.hypot(dx, dz);
        if (score >= (cost.get(id) ?? Infinity)) continue;
        cost.set(id, score);
        previous.set(id, current);
        open.add(id);
      }
  }
  if (!end) return [];
  const path: Point[] = [goal];
  for (let id: string | undefined = end; id; id = previous.get(id))
    path.unshift(nodes.get(id)!);
  const smooth: Point[] = [];
  let anchor = start;
  while (path.length) {
    let farthest = path.length - 1;
    while (farthest > 0 && !clearPath(anchor, path[farthest])) farthest--;
    anchor = path[farthest];
    smooth.push(anchor);
    path.splice(0, farthest + 1);
  }
  return smooth;
}
