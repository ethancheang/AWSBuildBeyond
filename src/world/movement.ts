/** Third-person character motion: acceleration, facing, sprint and jump. */

export const RUN_SPEED = 5.5;
export const SPRINT_SPEED = 9;
const ACCELERATION = 11; // Exponential rate towards the target velocity.
const DECELERATION = 14;
const TURN_RATE = 13;
const JUMP_VELOCITY = 6.4;
const GRAVITY = 21;

export interface MotionInput {
  /** Desired world-space direction; length 0–1 scales the target speed. */
  x: number;
  z: number;
  sprint: boolean;
  jump: boolean;
}

export interface MotionState {
  vx: number;
  vz: number;
  heading: number;
  y: number;
  vy: number;
  grounded: boolean;
  /** Seconds since landing, used for a short squash. */
  landed: number;
}

export const createMotion = (heading = Math.PI): MotionState => ({
  vx: 0,
  vz: 0,
  heading,
  y: 0,
  vy: 0,
  grounded: true,
  landed: Infinity,
});

/** Signed shortest difference from one angle to another, in (-π, π]. */
export function angleDelta(from: number, to: number): number {
  const d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) return d - Math.PI * 2;
  if (d <= -Math.PI) return d + Math.PI * 2;
  return d;
}

/** Advance the motion state; returns the horizontal displacement to apply. */
export function stepMotion(state: MotionState, input: MotionInput, dt: number) {
  const magnitude = Math.min(1, Math.hypot(input.x, input.z));
  const speed = (input.sprint ? SPRINT_SPEED : RUN_SPEED) * magnitude;
  const tx = magnitude ? (input.x / Math.hypot(input.x, input.z)) * speed : 0;
  const tz = magnitude ? (input.z / Math.hypot(input.x, input.z)) * speed : 0;
  // Less control in the air, as in most action games.
  const rate =
    (magnitude ? ACCELERATION : DECELERATION) * (state.grounded ? 1 : 0.35);
  const blend = 1 - Math.exp(-rate * dt);
  state.vx += (tx - state.vx) * blend;
  state.vz += (tz - state.vz) * blend;
  if (!magnitude && Math.hypot(state.vx, state.vz) < 0.02)
    state.vx = state.vz = 0;

  if (magnitude)
    state.heading +=
      angleDelta(state.heading, Math.atan2(input.x, input.z)) *
      (1 - Math.exp(-TURN_RATE * dt));

  if (input.jump && state.grounded) {
    state.vy = JUMP_VELOCITY;
    state.grounded = false;
  }
  if (!state.grounded) {
    state.vy -= GRAVITY * dt;
    state.y += state.vy * dt;
    if (state.y <= 0) {
      state.y = 0;
      state.vy = 0;
      state.grounded = true;
      state.landed = 0;
    }
  } else state.landed += dt;

  return { dx: state.vx * dt, dz: state.vz * dt };
}

export const horizontalSpeed = (state: MotionState) =>
  Math.hypot(state.vx, state.vz);
