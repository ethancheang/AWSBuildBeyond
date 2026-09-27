import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Point } from './layout';
import { angleDelta, RUN_SPEED } from './movement';

export type CameraView = 'follow' | 'isometric';

/** True isometric tilt: the camera looks down along a cube's diagonal. */
const ISO_POLAR = Math.acos(1 / Math.sqrt(3));
const ISO_OFFSET = new THREE.Vector3(18, 18, 18);

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
  controls.minDistance = 3;
  controls.maxDistance = 13;
  controls.minPolarAngle = 0.4;
  controls.maxPolarAngle = 1.35;
  let idle = Infinity,
    sprintBlend = 0;
  controls.addEventListener('start', () => (idle = -Infinity));
  controls.addEventListener('end', () => (idle = 0));
  const obstructionRay = new THREE.Raycaster();
  const direction = new THREE.Vector3();

  // Isometric: a parallel projection at the true isometric angle reads like a
  // diorama. It follows the player; right-drag rotates and left click walks.
  const iso = new THREE.OrthographicCamera(-12, 12, 12, -12, 0.1, 260);
  const isoOrbit = iso.clone();
  const isoControls = new OrbitControls(isoOrbit, canvas);
  isoControls.enablePan = false;
  isoControls.enableDamping = true;
  isoControls.mouseButtons.LEFT = null;
  isoControls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
  isoControls.minZoom = 0.6;
  isoControls.maxZoom = 2.5;
  isoControls.minPolarAngle = isoControls.maxPolarAngle = ISO_POLAR;
  isoControls.enabled = false;

  let view: CameraView = 'follow';
  let enabled = true;
  let width = 1,
    height = 1;
  const active = () => (view === 'follow' ? controls : isoControls);

  function resize(w: number, h: number) {
    width = w;
    height = h;
    orbit.aspect = w / h;
    orbit.fov = 58;
    orbit.setViewOffset(w, h, w > 1000 ? Math.min(110, w * 0.065) : 0, 0, w, h);
    orbit.updateProjectionMatrix();
    const halfHeight = 12 * Math.max(1, h / w);
    isoOrbit.left = (-halfHeight * w) / h;
    isoOrbit.right = (halfHeight * w) / h;
    isoOrbit.top = halfHeight;
    isoOrbit.bottom = -halfHeight;
    isoOrbit.updateProjectionMatrix();
  }

  function setView(next: CameraView, player: Point, heading = Math.PI) {
    // Flush damping before a preset so an unfinished drag cannot move it.
    for (const c of [controls, isoControls]) {
      c.enableDamping = false;
      c.update();
    }
    view = next;
    if (next === 'follow') {
      controls.target.set(player.x, 1.65, player.z);
      orbit.position.set(
        player.x - Math.sin(heading) * 8.5 - Math.cos(heading) * 1.2,
        4.4,
        player.z - Math.cos(heading) * 8.5 + Math.sin(heading) * 1.2,
      );
    } else {
      isoControls.target.set(player.x, 1.65, player.z);
      isoOrbit.position.copy(isoControls.target).add(ISO_OFFSET);
      isoOrbit.zoom = 1;
    }
    for (const c of [controls, isoControls]) {
      c.update();
      c.enableDamping = true;
    }
    setEnabled(enabled);
    resize(width, height);
  }

  /** Only the current view's controls listen to the pointer. */
  function setEnabled(next: boolean) {
    enabled = next;
    controls.enabled = next && view === 'follow';
    isoControls.enabled = next && view === 'isometric';
  }

  function update(
    dt: number,
    player: Point,
    obstacles: THREE.Object3D[],
    subject?: FollowSubject,
  ) {
    if (view === 'isometric') {
      followCharacter(
        isoOrbit.position,
        isoControls.target,
        player,
        dt,
        subject?.height,
      );
      isoControls.update();
      iso.copy(isoOrbit);
      iso.updateMatrixWorld();
      return;
    }
    idle += dt;
    sprintBlend +=
      (Number(!!subject?.sprinting && subject.speed > RUN_SPEED) -
        sprintBlend) *
      (1 - Math.exp(-4 * dt));
    followCharacter(
      orbit.position,
      controls.target,
      player,
      dt,
      subject?.height,
    );
    if (subject && idle > RECENTER_DELAY && subject.speed > 0.5)
      recenterAzimuth(orbit.position, controls.target, subject, dt);
    controls.update();
    camera.copy(orbit);
    // Sprinting widens the view and pulls the camera back a little.
    camera.fov = orbit.fov + SPRINT_FOV * sprintBlend;
    camera.updateProjectionMatrix();
    direction.copy(camera.position).sub(controls.target);
    const desiredDistance = direction.length() * (1 + SPRINT_ARM * sprintBlend);
    direction.normalize();
    obstructionRay.set(controls.target, direction);
    obstructionRay.far = desiredDistance;
    const hit = obstructionRay.intersectObjects(obstacles, true)[0];
    camera.position
      .copy(controls.target)
      .addScaledVector(
        direction,
        hit ? Math.max(0.45, hit.distance - 0.3) : desiredDistance,
      );
    camera.lookAt(controls.target);
    camera.updateMatrixWorld();
  }
  setView('follow', start);
  return {
    get view() {
      return view;
    },
    /** The camera to render and pick with for the current view. */
    get camera(): THREE.Camera {
      return view === 'follow' ? camera : iso;
    },
    get controls() {
      return active();
    },
    resize,
    update,
    setView,
    setEnabled,
    dispose: () => {
      controls.dispose();
      isoControls.dispose();
    },
  };
}
