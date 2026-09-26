import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Point } from './layout';
import { angleDelta, RUN_SPEED } from './movement';

export type CameraView = 'follow' | 'overview';

/** What the follow camera needs to know about the character each frame. */
export interface FollowSubject {
  heading: number;
  speed: number;
  sprinting: boolean;
  height: number;
}

const RECENTER_DELAY = 1.1; // Seconds after the last manual look.
const RECENTER_RATE = 1.7;
const SPRINT_FOV = 7;
const SPRINT_ARM = 0.14;

/**
 * Swing the camera behind a moving character, Genshin-style. Strong turns
 * towards the camera (running at it) are left alone rather than flipping.
 */
export function recenterAzimuth(
  camera: THREE.Vector3,
  target: THREE.Vector3,
  subject: FollowSubject,
  dt: number,
) {
  const azimuth = Math.atan2(camera.x - target.x, camera.z - target.z);
  const diff = angleDelta(azimuth, subject.heading + Math.PI);
  if (Math.abs(diff) > 2.3) return;
  const angle =
    diff *
    (1 - Math.exp(-RECENTER_RATE * dt)) *
    Math.min(1, subject.speed / RUN_SPEED);
  const offset = camera.clone().sub(target);
  offset.applyAxisAngle(THREE.Object3D.DEFAULT_UP, angle);
  camera.copy(target).add(offset);
}

/** Move the orbit and its target together, preserving the user's look direction. */
export function followCharacter(
  camera: THREE.Vector3,
  target: THREE.Vector3,
  player: Point,
  dt: number,
  height = 0,
) {
  // Follow jumps only partly so the view stays steady.
  const destination = new THREE.Vector3(
    player.x,
    1.65 + height * 0.45,
    player.z,
  );
  const delta = destination.sub(target).multiplyScalar(1 - Math.exp(-12 * dt));
  target.add(delta);
  camera.add(delta);
}

export function createCameraRig(
  camera: THREE.PerspectiveCamera,
  canvas: HTMLCanvasElement,
  start: Point,
) {
  // Keep the desired orbit separate from the rendered camera. Obstructions can
  // shorten the camera arm without changing the user's zoom or orbit settings.
  const orbit = camera.clone();
  const controls = new OrbitControls(orbit, canvas);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.rotateSpeed = 0.9;
  let idle = Infinity,
    sprintBlend = 0;
  controls.addEventListener('start', () => (idle = -Infinity));
  controls.addEventListener('end', () => (idle = 0));
  const obstructionRay = new THREE.Raycaster();
  const direction = new THREE.Vector3();
  let view: CameraView = 'follow';
  let width = 1,
    height = 1;

  function resize(w: number, h: number) {
    width = w;
    height = h;
    orbit.aspect = w / h;
    orbit.fov =
      view === 'follow'
        ? 58
        : THREE.MathUtils.radToDeg(
            2 *
              Math.atan(
                Math.tan(THREE.MathUtils.degToRad(43) / 2) *
                  Math.max(1, 1.35 / orbit.aspect),
              ),
          );
    orbit.setViewOffset(w, h, w > 1000 ? Math.min(110, w * 0.065) : 0, 0, w, h);
    orbit.updateProjectionMatrix();
  }

  function setView(next: CameraView, player: Point, heading = Math.PI) {
    // Flush damping before a preset so an unfinished drag cannot move it.
    controls.enableDamping = false;
    controls.update();
    view = next;
    controls.minDistance = next === 'follow' ? 3 : 22;
    controls.maxDistance = next === 'follow' ? 13 : 80;
    // The overview starts angled but can tilt down to a top-down floor plan.
    controls.minPolarAngle = next === 'overview' ? 0.001 : 0.4;
    controls.maxPolarAngle = next === 'follow' ? 1.35 : 1.15;
    if (next === 'follow') {
      controls.target.set(player.x, 1.65, player.z);
      orbit.position.set(
        player.x - Math.sin(heading) * 8.5 - Math.cos(heading) * 1.2,
        4.4,
        player.z - Math.cos(heading) * 8.5 + Math.sin(heading) * 1.2,
      );
    } else {
      controls.target.set(0, 0, 0);
      orbit.position.set(19, 35, 43);
    }
    controls.update();
    controls.enableDamping = true;
    resize(width, height);
  }

  function update(
    dt: number,
    player: Point,
    obstacles: THREE.Object3D[],
    subject?: FollowSubject,
  ) {
    idle += dt;
    sprintBlend +=
      (Number(!!subject?.sprinting && subject.speed > RUN_SPEED) -
        sprintBlend) *
      (1 - Math.exp(-4 * dt));
    if (view === 'follow') {
      followCharacter(
        orbit.position,
        controls.target,
        player,
        dt,
        subject?.height,
      );
      if (subject && idle > RECENTER_DELAY && subject.speed > 0.5)
        recenterAzimuth(orbit.position, controls.target, subject, dt);
    }
    controls.update();
    camera.copy(orbit);
    if (view === 'follow') {
      // Sprinting widens the view and pulls the camera back a little.
      camera.fov = orbit.fov + SPRINT_FOV * sprintBlend;
      camera.updateProjectionMatrix();
      direction.copy(camera.position).sub(controls.target);
      const desiredDistance =
        direction.length() * (1 + SPRINT_ARM * sprintBlend);
      direction.normalize();
      obstructionRay.set(controls.target, direction);
      obstructionRay.far = desiredDistance;
      const hit = obstructionRay.intersectObjects(obstacles, true)[0];
      if (hit)
        camera.position
          .copy(controls.target)
          .addScaledVector(direction, Math.max(0.45, hit.distance - 0.3));
      else
        camera.position
          .copy(controls.target)
          .addScaledVector(direction, desiredDistance);
      camera.lookAt(controls.target);
    }
    camera.updateMatrixWorld();
  }
  setView('follow', start);
  return {
    get view() {
      return view;
    },
    controls,
    resize,
    update,
    setView,
    dispose: () => controls.dispose(),
  };
}
