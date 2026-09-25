import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Point } from './layout';

export type CameraView = 'follow' | 'hall' | 'floor';

/** Move the orbit and its target together, preserving the user's look direction. */
export function followCharacter(
  camera: THREE.Vector3,
  target: THREE.Vector3,
  player: Point,
  dt: number,
) {
  const destination = new THREE.Vector3(player.x, 1.65, player.z);
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
    controls.minPolarAngle = next === 'floor' ? 0.001 : 0.4;
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
      orbit.position.set(
        ...((next === 'floor' ? [0, 55, 0.1] : [19, 35, 43]) as [
          number,
          number,
          number,
        ]),
      );
    }
    controls.update();
    controls.enableDamping = true;
    resize(width, height);
  }

  function update(dt: number, player: Point, obstacles: THREE.Object3D[]) {
    if (view === 'follow')
      followCharacter(orbit.position, controls.target, player, dt);
    controls.update();
    camera.copy(orbit);
    if (view === 'follow') {
      direction.copy(camera.position).sub(controls.target);
      const desiredDistance = direction.length();
      direction.normalize();
      obstructionRay.set(controls.target, direction);
      obstructionRay.far = desiredDistance;
      const hit = obstructionRay.intersectObjects(obstacles, true)[0];
      if (hit)
        camera.position
          .copy(controls.target)
          .addScaledVector(direction, Math.max(0.45, hit.distance - 0.3));
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
