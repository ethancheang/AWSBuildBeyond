export interface Point {
  x: number;
  z: number;
}
export interface Obstacle extends Point {
  radius: number;
}

export const STALL_POSITIONS: Point[] = [
  { x: -8, z: -4.4 },
  { x: 0, z: -4.4 },
  { x: 8, z: -4.4 },
];
export const TABLE_POSITIONS: Point[] = [
  { x: -8, z: 1.5 },
  { x: 8, z: 1.5 },
  { x: -8, z: 7 },
  { x: 8, z: 7 },
];
export const BOUNDS = { minX: -12, maxX: 12, minZ: -4.7, maxZ: 10 };
// Radii include the player's clearance and the stools around each table.
export const OBSTACLES: Obstacle[] = [
  ...TABLE_POSITIONS.map((p) => ({ ...p, radius: 2.25 })),
  { x: 0, z: 2.7, radius: 1.65 },
];

export function isWalkable(p: Point): boolean {
  return (
    p.x >= BOUNDS.minX &&
    p.x <= BOUNDS.maxX &&
    p.z >= BOUNDS.minZ &&
    p.z <= BOUNDS.maxZ &&
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
    for (let z = -4.5; z <= BOUNDS.maxZ; z += step) {
      const p = { x, z };
      if (isWalkable(p)) nodes.set(key(p), p);
    }
  }
  const nearest = [...nodes.values()]
    .filter((p) => clearPath(start, p))
    .sort(
      (a, b) =>
        Math.hypot(a.x - start.x, a.z - start.z) -
        Math.hypot(b.x - start.x, b.z - start.z),
    )[0];
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
