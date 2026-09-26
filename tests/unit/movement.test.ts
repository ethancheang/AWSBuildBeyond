import { describe, expect, it } from 'vitest';
import {
  angleDelta,
  createMotion,
  horizontalSpeed,
  RUN_SPEED,
  SPRINT_SPEED,
  stepMotion,
} from '../../src/world/movement';

const idle = { x: 0, z: 0, sprint: false, jump: false };

describe('third-person character motion', () => {
  it('accelerates to run speed, sprints faster and glides to a stop', () => {
    const state = createMotion();
    stepMotion(state, { ...idle, x: 1 }, 1 / 60);
    expect(horizontalSpeed(state)).toBeLessThan(RUN_SPEED / 2);
    for (let i = 0; i < 120; i++) stepMotion(state, { ...idle, x: 1 }, 1 / 60);
    expect(horizontalSpeed(state)).toBeCloseTo(RUN_SPEED, 2);
    for (let i = 0; i < 120; i++)
      stepMotion(state, { ...idle, x: 1, sprint: true }, 1 / 60);
    expect(horizontalSpeed(state)).toBeCloseTo(SPRINT_SPEED, 2);
    for (let i = 0; i < 120; i++) stepMotion(state, idle, 1 / 60);
    expect(horizontalSpeed(state)).toBe(0);
  });

  it('turns smoothly along the shortest arc towards the movement direction', () => {
    const state = createMotion(Math.PI * 0.9);
    stepMotion(state, { ...idle, z: -1 }, 1 / 60);
    // Facing -z is ±π; from 0.9π the short way is upwards, not back through 0.
    expect(state.heading).toBeGreaterThan(Math.PI * 0.9);
    for (let i = 0; i < 60; i++) stepMotion(state, { ...idle, z: -1 }, 1 / 60);
    expect(Math.abs(angleDelta(state.heading, Math.PI))).toBeLessThan(0.01);
  });

  it('jumps once from the ground and lands back on the floor', () => {
    const state = createMotion();
    stepMotion(state, { ...idle, jump: true }, 1 / 60);
    expect(state.grounded).toBe(false);
    let peak = 0;
    for (let i = 0; i < 30; i++) {
      stepMotion(state, { ...idle, jump: true }, 1 / 60);
      peak = Math.max(peak, state.y);
    }
    expect(peak).toBeGreaterThan(0.8);
    expect(peak).toBeLessThan(1.1);
    for (let i = 0; i < 60 && !state.grounded; i++)
      stepMotion(state, idle, 1 / 60);
    expect(state.grounded).toBe(true);
    expect(state.y).toBe(0);
  });
});
