import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { followCharacter } from '../../src/world/camera';

describe('third-person follow camera', () => {
  it('tracks a moving character without changing the chosen orbit or zoom', () => {
    const camera = new Vector3(0, 5.5, 21.5);
    const target = new Vector3(0, 1.65, 14);
    const offset = camera.clone().sub(target);
    for (let frame = 0; frame < 180; frame++)
      followCharacter(camera, target, { x: 8, z: -4 }, 1 / 60);
    expect(target.distanceTo(new Vector3(8, 1.65, -4))).toBeLessThan(0.001);
    expect(camera.clone().sub(target).distanceTo(offset)).toBeLessThan(0.001);
  });
  it('follows at the same speed across frame rates and stays put while paused', () => {
    const a = new Vector3(0, 5.5, 21.5),
      ta = new Vector3(0, 1.65, 14);
    const b = a.clone(),
      tb = ta.clone();
    for (let i = 0; i < 30; i++) followCharacter(a, ta, { x: 5, z: 8 }, 1 / 30);
    for (let i = 0; i < 120; i++)
      followCharacter(b, tb, { x: 5, z: 8 }, 1 / 120);
    expect(a.distanceTo(b)).toBeLessThan(0.001);
    const previous = a.clone();
    followCharacter(a, ta, { x: 20, z: 20 }, 0);
    expect(a.equals(previous)).toBe(true);
  });
});
