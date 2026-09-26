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
  camera: THREE.OrthographicCamera,
  canvas: HTMLCanvasElement,
  start: Point,
) {
  // Parallel projection keeps the 3D world reading like an isometric diorama.
  const orbit = camera.clone();
  const controls = new OrbitControls(orbit, canvas);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.mouseButtons.LEFT = null;
  controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
  controls.minZoom = 0.6;
  controls.maxZoom = 2.5;
  let view: CameraView = 'follow';
  let width = 1,
    height = 1;

  function resize(w: number, h: number) {
    width = w;
    height = h;
    const halfHeight = (view === 'follow' ? 12 : 29) * Math.max(1, h / w);
    orbit.left = (-halfHeight * w) / h;
    orbit.right = (halfHeight * w) / h;
    orbit.top = halfHeight;
    orbit.bottom = -halfHeight;
    orbit.updateProjectionMatrix();
  }

  function setView(next: CameraView, player: Point) {
    // Flush damping before a preset so an unfinished drag cannot move it.
    controls.enableDamping = false;
    controls.update();
    view = next;
    const angle = next === 'floor' ? 0.001 : Math.acos(1 / Math.sqrt(3));
    controls.minPolarAngle = angle;
    controls.maxPolarAngle = angle;
    orbit.zoom = 1;
    if (next === 'follow') {
      controls.target.set(player.x, 1.65, player.z);
      orbit.position.copy(controls.target).add(new THREE.Vector3(18, 18, 18));
    } else {
      controls.target.set(0, 0, 0);
      orbit.position.set(
        ...((next === 'floor' ? [0, 55, 0.1] : [35, 35, 35]) as [
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

  function update(dt: number, player: Point) {
    if (view === 'follow')
      followCharacter(orbit.position, controls.target, player, dt);
    controls.update();
    camera.copy(orbit);
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
