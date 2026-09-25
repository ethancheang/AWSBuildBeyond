import { describe, expect, it } from 'vitest';
import {
  clearPath,
  findPath,
  isWalkable,
  moveWithCollision,
  STALL_POSITIONS,
} from '../../src/world/layout';

describe('hall navigation', () => {
  it('routes from the entrance around tray return to every stall', () => {
    for (const stall of STALL_POSITIONS) {
      let previous = { x: 0, z: 9 };
      const path = findPath(previous, stall);
      expect(path.at(-1)).toEqual(stall);
      for (const point of path) {
        expect(clearPath(previous, point)).toBe(true);
        previous = point;
      }
    }
  });
  it('routes between all stalls and through both sides of the hall', () => {
    const points = [...STALL_POSITIONS, { x: -4, z: 8 }, { x: 4, z: 8 }];
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
    expect(findPath({ x: 0, z: 9 }, { x: 8, z: 7 })).toEqual([]);
    expect(findPath({ x: 0, z: 9 }, { x: 15, z: 3 })).toEqual([]);
  });
  it('prevents walking through tables, counters and walls even with large steps', () => {
    expect(isWalkable(moveWithCollision({ x: 0, z: 9 }, 0, -20))).toBe(true);
    expect(moveWithCollision({ x: 0, z: 9 }, 0, -20).z).toBeGreaterThan(4);
    expect(moveWithCollision({ x: 11, z: 9 }, 20, 0).x).toBeLessThanOrEqual(12);
  });
});
