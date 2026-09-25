import { describe, expect, it } from 'vitest';
import {
  clearPath,
  findPath,
  isWalkable,
  moveWithCollision,
  STALL_POSITIONS,
  STALL_LAYOUT,
  TABLE_POSITIONS,
  SPAWN,
} from '../../src/world/layout';

describe('hall navigation', () => {
  it('routes from the entrance around tray return to every stall', () => {
    for (const stall of STALL_POSITIONS) {
      let previous = SPAWN;
      const path = findPath(previous, stall);
      expect(path.at(-1)).toEqual(stall);
      for (const point of path) {
        expect(clearPath(previous, point)).toBe(true);
        previous = point;
      }
    }
  });
  it('routes between all stalls and through both sides of the hall', () => {
    const points = STALL_LAYOUT.map((stall) => stall.approach);
    for (const a of points)
      for (const b of points) {
        const path = findPath(a, b);
        expect(path.at(-1)).toEqual(b);
        let previous = a;
        for (const p of path) {
          expect(clearPath(previous, p)).toBe(true);
          previous = p;
        }
      }
  });
  it('rejects table centres and out-of-bounds destinations', () => {
    for (const point of [
      ...TABLE_POSITIONS,
      ...STALL_LAYOUT.map((s) => s.position),
      { x: 0, z: 0 },
      { x: 16, z: 16 },
    ]) {
      expect(findPath(SPAWN, point)).toEqual([]);
    }
  });
  it('prevents walking through tables, counters and walls even with large steps', () => {
    const towardsTower = moveWithCollision(SPAWN, 0, -30);
    expect(isWalkable(towardsTower)).toBe(true);
    expect(towardsTower.z).toBeGreaterThanOrEqual(3.25);
    const towardsBoundary = moveWithCollision(SPAWN, 0, 30);
    expect(isWalkable(towardsBoundary)).toBe(true);
    expect(towardsBoundary.z).toBeLessThan(19);
  });
  it('keeps exactly three lesson destinations and five closed stalls', () => {
    expect(STALL_LAYOUT).toHaveLength(8);
    expect(STALL_POSITIONS).toHaveLength(3);
    expect(
      STALL_LAYOUT.filter((s) => s.lessonIndex === undefined),
    ).toHaveLength(5);
    expect(
      STALL_LAYOUT.flatMap((s) =>
        s.lessonIndex === undefined ? [] : [s.lessonIndex],
      ).sort(),
    ).toEqual([0, 1, 2]);
  });
});
