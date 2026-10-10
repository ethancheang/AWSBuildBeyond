import * as THREE from 'three';
import { findPath, TABLE_POSITIONS } from './layout';
import type { Point } from './layout';
import type { AvatarFactory } from './remotePlayers';

// Table 7 sits just left of the entrance walkway and has no other tissue on
// it. Both points are outside the table's collision ring (see layout.ts) and
// are checked for reachability in tests/unit/marcus.test.js.
export const MARCUS_TABLE: Point = TABLE_POSITIONS[7];
export const MARCUS_START: Point = { x: 0, z: 11 };
export const MARCUS_SPOT: Point = {
  x: MARCUS_TABLE.x + 2.1,
  z: MARCUS_TABLE.z,
};
export const MARCUS_APPROACH: Point = {
  x: MARCUS_TABLE.x,
  z: MARCUS_TABLE.z + 2.3,
};
export const TRIGGER_RADIUS = 3.5;
const SPEED = 2.4;

/** Marcus: procedural office worker who walks to his table and leaves a tissue. */
export function createOfficeWorker(
  scene: THREE.Scene,
  factory: AvatarFactory,
  onArrival: () => void,
) {
  const avatar = factory.character('#E8EEF2', '#D9A57E', '#2B2522');
  const { person } = avatar;
  person.name = 'office-worker';
  person.userData.kind = 'office-worker';
  person.position.set(MARCUS_START.x, 0, MARCUS_START.z);
  person.rotation.y = Math.PI;
  // Own materials: these meshes are unique to Marcus and disposed by the scene.
  const own = (color: string) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const part = (
    geometry: THREE.BufferGeometry,
    color: string,
    p: [number, number, number],
    parent: THREE.Object3D = person,
  ) => {
    const mesh = new THREE.Mesh(geometry, own(color));
    mesh.position.set(...p);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  // Red lanyard, white badge and a brown shoulder bag.
  part(
    new THREE.TorusGeometry(0.2, 0.018, 6, 20),
    '#C62828',
    [0, 1.2, 0.12],
  ).rotation.set(Math.PI / 2.4, 0, 0);
  part(new THREE.BoxGeometry(0.13, 0.17, 0.02), '#FFFFFF', [0, 0.98, 0.27]);
  part(new THREE.BoxGeometry(0.1, 0.38, 0.32), '#7A4E2D', [0.47, 0.72, 0]);
  const tag = factory.label('MARCUS', 'Lunch break', '#37474F', 1.4, 0.36);
  tag.position.set(0, 2.3, 0);
  person.add(tag);
  scene.add(person);

  const tissue = new THREE.Group();
  tissue.name = 'marcus-tissue';
  tissue.userData.kind = 'office-worker';
  part(new THREE.BoxGeometry(0.4, 0.14, 0.24), '#2A9D8F', [0, 0, 0], tissue);
  part(
    new THREE.BoxGeometry(0.22, 0.02, 0.08),
    '#FFFFFF',
    [0, 0.08, 0],
    tissue,
  );
  // On the seat side of the table nearest Marcus.
  tissue.position.set(MARCUS_TABLE.x + 0.45, 1.22, MARCUS_TABLE.z);
  tissue.visible = false;
  scene.add(tissue);

  let route: Point[] = [],
    walking = false,
    arrived = false,
    stride = 0;
  const inverse = new THREE.Quaternion();

  function settle() {
    person.position.set(MARCUS_SPOT.x, 0, MARCUS_SPOT.z);
    // Face the table.
    person.rotation.y = Math.atan2(
      MARCUS_TABLE.x - MARCUS_SPOT.x,
      MARCUS_TABLE.z - MARCUS_SPOT.z,
    );
    avatar.left.rotation.x = avatar.right.rotation.x = 0;
    if (avatar.leftArm) avatar.leftArm.rotation.x = 0;
    if (avatar.rightArm) avatar.rightArm.rotation.x = 0;
    tissue.visible = true;
    walking = false;
    arrived = true;
  }
  function start() {
    if (walking) return;
    if (arrived) {
      onArrival();
      return;
    }
    route = findPath(
      { x: person.position.x, z: person.position.z },
      MARCUS_SPOT,
    );
    if (!route.length) {
      settle();
      onArrival();
      return;
    }
    walking = true;
  }
  function restore() {
    route = [];
    settle();
  }
  function update(dt: number, camera: THREE.Camera, animate: boolean) {
    if (walking && animate && dt > 0) {
      let budget = SPEED * dt;
      while (budget > 0 && route.length) {
        const next = route[0];
        const dx = next.x - person.position.x,
          dz = next.z - person.position.z;
        const d = Math.hypot(dx, dz);
        if (d <= budget) {
          person.position.x = next.x;
          person.position.z = next.z;
          budget -= d;
          route.shift();
        } else {
          person.position.x += (dx / d) * budget;
          person.position.z += (dz / d) * budget;
          person.rotation.y = Math.atan2(dx, dz);
          budget = 0;
        }
      }
      stride += dt * 9;
      const swing = Math.sin(stride) * 0.4;
      avatar.left.rotation.x = swing;
      avatar.right.rotation.x = -swing;
      if (avatar.leftArm) avatar.leftArm.rotation.x = -swing * 0.9;
      if (avatar.rightArm) avatar.rightArm.rotation.x = swing * 0.9;
      if (!route.length) {
        settle();
        onArrival();
      }
    }
    // Keep the name tag facing the camera, as remote players do.
    person.getWorldQuaternion(inverse).invert();
    camera.getWorldQuaternion(tag.quaternion);
    tag.quaternion.premultiply(inverse);
  }
  return {
    start,
    restore,
    update,
    picks: [person, tissue] as THREE.Object3D[],
    get arrived() {
      return arrived;
    },
  };
}
