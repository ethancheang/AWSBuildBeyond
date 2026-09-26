import * as THREE from 'three';
import { createCameraRig } from './camera';
import type { CameraView } from './camera';
import { buildEnvironment } from './environment';
import { findPath, moveWithCollision, STALL_POSITIONS, SPAWN } from './layout';
import type { Point } from './layout';
import {
  createMotion,
  horizontalSpeed,
  RUN_SPEED,
  SPRINT_SPEED,
  stepMotion,
} from './movement';

export interface WorldOptions {
  container: HTMLElement;
  isActive: () => boolean;
  onStall: (index: number) => void;
  onNearby: (index: number) => void;
  onTip: (text: string) => void;
  onUnavailable: () => void;
}

export function createWorld(options: WorldOptions) {
  const { container } = options;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#BFDCE5');
  scene.fog = new THREE.Fog('#BFDCE5', 90, 185);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 260);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute(
    'aria-label',
    '3D hawker centre. WASD or arrows to walk, Shift to sprint, Space to jump, E or Enter to talk. Drag to look around.',
  );
  canvas.setAttribute('aria-describedby', 'worldHelp');
  container.append(canvas);
  const rig = createCameraRig(camera, canvas, SPAWN);
  const controls = rig.controls;
  const setView = (view: CameraView) => {
    if (disposed) return;
    rig.setView(view, position, motion.heading);
    rig.update(0, position, environment.cameraObstacles);
    render();
  };
  const resetCamera = () => setView('follow');

  scene.add(new THREE.HemisphereLight('#fff6ec', '#748971', 1.8));
  const sun = new THREE.DirectionalLight('#fff5e8', 2.5);
  sun.position.set(-12, 24, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -22,
    right: 22,
    top: 22,
    bottom: -22,
    near: 1,
    far: 90,
  });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  const environment = buildEnvironment(scene);
  // Yaw first so the running lean tilts along the character's own forward axis.
  environment.player.person.rotation.order = 'YXZ';
  function render() {
    environment.city.setCutaway(camera.position, rig.view === 'hall');
    renderer.render(scene, camera);
  }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const keys = new Set<string>();
  const movementKeys = [
    'w',
    'a',
    's',
    'd',
    'arrowup',
    'arrowleft',
    'arrowdown',
    'arrowright',
  ];
  const abort = new AbortController();
  const signal = abort.signal;
  let route: Point[] = [],
    arrival: (() => void) | undefined;
  let position: Point = { ...SPAWN },
    nearby = -1,
    disposed = false,
    active = false;
  let previousTime = 0,
    elapsed = 0;
  let pointerStart = { x: 0, y: 0 };
  const motion = createMotion();
  let jumpQueued = false,
    stride = 0;

  function stop() {
    keys.clear();
    jumpQueued = false;
    Object.assign(motion, { vx: 0, vz: 0, y: 0, vy: 0, grounded: true });
    route = [];
    arrival = undefined;
  }
  function navigate(target: Point, callback?: () => void) {
    route = findPath(position, target);
    arrival = route.length ? callback : undefined;
    if (!route.length)
      options.onTip('That spot is occupied. Try a clear part of the walkway.');
  }
  function goToStall(index: number) {
    if (STALL_POSITIONS[index])
      navigate(STALL_POSITIONS[index], () => options.onStall(index));
  }
  function updateNearby() {
    const next = STALL_POSITIONS.findIndex(
      (p) => Math.hypot(p.x - position.x, p.z - position.z) < 1.9,
    );
    if (next !== nearby) {
      nearby = next;
      options.onNearby(next);
    }
  }
  const raycaster = new THREE.Raycaster(),
    pointer = new THREE.Vector2();
  canvas.addEventListener(
    'pointerdown',
    (event) => {
      pointerStart = { x: event.clientX, y: event.clientY };
    },
    { signal },
  );
  canvas.addEventListener(
    'pointerup',
    (event) => {
      if (
        !options.isActive() ||
        event.button !== 0 ||
        Math.hypot(
          event.clientX - pointerStart.x,
          event.clientY - pointerStart.y,
        ) > 6
      )
        return;
      canvas.focus({ preventScroll: true });
      const bounds = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        1 - ((event.clientY - bounds.top) / bounds.height) * 2,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(environment.picks, true)[0];
      if (!hit) return;
      let object: THREE.Object3D | null = hit.object;
      while (object) {
        if (typeof object.userData.stall === 'number') {
          goToStall(object.userData.stall);
          return;
        }
        if (object.userData.kind === 'placeholder') return;
        if (object.userData.kind === 'chope') {
          options.onTip(
            'Chope! A tissue packet means someone has reserved this seat.',
          );
          return;
        }
        if (object.userData.kind === 'tray') {
          options.onTip(
            'Return your tray after eating. Keep the table ready for the next diner.',
          );
          return;
        }
        object = object.parent;
      }
      if (hit.object === environment.floor)
        navigate({ x: hit.point.x, z: hit.point.z });
    },
    { signal },
  );
  window.addEventListener(
    'keydown',
    (event) => {
      if (!options.isActive() || event.ctrlKey || event.metaKey || event.altKey)
        return;
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"]'))
        return;
      const key = event.key.toLowerCase();
      if (movementKeys.includes(key)) {
        event.preventDefault();
        keys.add(key);
        route = [];
        arrival = undefined;
      }
      if (key === 'shift') keys.add(key);
      if (key === ' ' && !target.closest('button, a')) {
        event.preventDefault();
        if (!event.repeat) jumpQueued = true;
      }
      if (
        (key === 'e' || key === 'enter') &&
        !target.closest('button, a') &&
        nearby >= 0 &&
        !event.repeat
      ) {
        event.preventDefault();
        options.onStall(nearby);
      }
    },
    { signal },
  );
  window.addEventListener(
    'keyup',
    (event) => keys.delete(event.key.toLowerCase()),
    { signal },
  );
  window.addEventListener('blur', stop, { signal });
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) stop();
      sync();
    },
    { signal },
  );
  canvas.addEventListener(
    'webglcontextlost',
    (event) => {
      event.preventDefault();
      options.onUnavailable();
      dispose();
    },
    { signal },
  );

  const resize = new ResizeObserver(() => {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height || disposed) return;
    renderer.setSize(width, height);
    rig.resize(width, height);
    rig.update(0, position, environment.cameraObstacles);
    render();
  });
  resize.observe(container);
  const right = new THREE.Vector3(),
    forward = new THREE.Vector3();
  function frame(time: number) {
    if (disposed) return;
    // Collision movement uses small substeps. Accommodate slower devices without
    // making walking run in slow motion, while bounding work after a long stall.
    const dt = Math.min((time - previousTime) / 1000, 0.2);
    previousTime = time;
    elapsed += dt;
    if (options.isActive()) {
      let x =
        Number(keys.has('d') || keys.has('arrowright')) -
        Number(keys.has('a') || keys.has('arrowleft'));
      let z =
        Number(keys.has('s') || keys.has('arrowdown')) -
        Number(keys.has('w') || keys.has('arrowup'));
      if (x || z) {
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        right.crossVectors(forward, camera.up).normalize();
        const v = right
          .clone()
          .multiplyScalar(x)
          .addScaledVector(forward, -z)
          .normalize();
        x = v.x;
        z = v.z;
      } else if (route.length) {
        const next = route[0],
          distance = Math.hypot(next.x - position.x, next.z - position.z);
        const last = route.length === 1;
        if (distance < (last ? 0.09 : 0.35)) {
          if (last) {
            position = next;
            motion.vx = motion.vz = 0;
          }
          route.shift();
          if (!route.length) {
            const callback = arrival;
            arrival = undefined;
            callback?.();
          }
        } else {
          // Ease in to the final point so inertia cannot overshoot it.
          const step = last ? Math.min(1, distance / 1.2) : 1;
          x = ((next.x - position.x) / distance) * step;
          z = ((next.z - position.z) / distance) * step;
        }
      }
      const { dx, dz } = stepMotion(
        motion,
        { x, z, sprint: keys.has('shift'), jump: jumpQueued },
        dt,
      );
      jumpQueued = false;
      if (dx || dz) {
        const before = position;
        position = moveWithCollision(position, dx, dz);
        // Blocked axes lose their velocity so walls do not store momentum.
        if (dt) {
          motion.vx = (position.x - before.x) / dt;
          motion.vz = (position.z - before.z) / dt;
        }
      }
      const speed = horizontalSpeed(motion);
      const person = environment.player.person;
      person.rotation.y = motion.heading;
      person.position.set(position.x, motion.y, position.z);
      // Short landing squash, and a slight forward lean at speed.
      const squash =
        motion.landed < 0.18 && !reducedMotion.matches
          ? Math.sin((motion.landed / 0.18) * Math.PI) * 0.12
          : 0;
      person.scale.set(1 + squash * 0.5, 1 - squash, 1 + squash * 0.5);
      person.rotation.x = (speed / SPRINT_SPEED) * 0.14;
      stride += dt * (6 + speed * 1.6);
      const amplitude = reducedMotion.matches
        ? 0
        : motion.grounded
          ? Math.min(1, speed / RUN_SPEED) * (speed > RUN_SPEED ? 0.6 : 0.42)
          : 0;
      const swing = Math.sin(stride) * amplitude;
      const player = environment.player;
      player.left.rotation.x = motion.grounded ? swing : -0.5;
      player.right.rotation.x = motion.grounded ? -swing : 0.3;
      player.leftArm.rotation.x = motion.grounded ? -swing * 0.9 : -0.9;
      player.rightArm.rotation.x = motion.grounded ? swing * 0.9 : -0.9;
      updateNearby();
      if (!reducedMotion.matches) {
        environment.fans.forEach((fan) => (fan.rotation.y += dt * 2.5));
        environment.markers.forEach((marker, i) => {
          marker.position.y = 4.7 + Math.sin(elapsed * 2 + i) * 0.12;
          marker.rotation.y += dt;
        });
      }
    } else stop();
    controls.enabled = options.isActive();
    rig.update(dt, position, environment.cameraObstacles, {
      heading: motion.heading,
      speed: horizontalSpeed(motion),
      sprinting: keys.has('shift'),
      height: motion.y,
    });
    render();
  }
  function sync() {
    const next = !document.hidden && options.isActive();
    if (!document.hidden && !disposed) {
      rig.update(0, position, environment.cameraObstacles);
      render();
    }
    if (next === active || disposed) return;
    active = next;
    previousTime = performance.now();
    renderer.setAnimationLoop(next ? frame : null);
    if (!next) stop();
  }
  function setCompleted(completed: boolean[]) {
    environment.markers.forEach((marker, i) => {
      const material = marker.material as THREE.MeshStandardMaterial;
      material.color.set(completed[i] ? '#67af75' : '#e4b453');
      material.emissive.copy(material.color);
    });
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    abort.abort();
    resize.disconnect();
    rig.dispose();
    renderer.setAnimationLoop(null);
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>(),
      textures = new Set<THREE.Texture>();
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (object instanceof THREE.InstancedMesh) object.dispose();
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        materials.add(material);
        for (const value of Object.values(material))
          if (value instanceof THREE.Texture) textures.add(value);
      }
    });
    textures.forEach((t) => t.dispose());
    materials.forEach((m) => m.dispose());
    geometries.forEach((g) => g.dispose());
    sun.shadow.dispose();
    renderer.dispose();
    canvas.remove();
  }
  sync();
  return { goToStall, stop, sync, resetCamera, setView, setCompleted, dispose };
}
