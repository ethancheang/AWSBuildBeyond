import * as THREE from 'three';
import type { StateMessage } from '../net/protocol';

type Character = {
  person: THREE.Group;
  left: THREE.Object3D;
  right: THREE.Object3D;
  leftArm?: THREE.Object3D;
  rightArm?: THREE.Object3D;
};
export interface AvatarFactory {
  character: (shirt: string, skin: string, hair: string) => Character;
  label: (
    text: string,
    subtitle: string,
    color: string,
    w: number,
    h: number,
  ) => THREE.Mesh;
}
interface Remote {
  avatar: Character;
  tag: THREE.Mesh;
  target: StateMessage;
  lastSeen: number;
  stride: number;
}

const STALE_MS = 6000; // no heartbeat for 6 s → treat as disconnected

/** Draws other players and smooths their movement between network updates. */
export function createRemotePlayers(
  scene: THREE.Scene,
  factory: AvatarFactory,
) {
  const remotes = new Map<string, Remote>();

  function upsert(state: StateMessage) {
    let r = remotes.get(state.id);
    if (!r) {
      if (remotes.size >= 30) return;
      // Bound the shared material cache even when a publisher cycles colours.
      const colors = [
        '#D32F2F',
        '#2E86DE',
        '#1F8A5B',
        '#E85D9C',
        '#F28C28',
        '#8E44AD',
      ];
      const avatar = factory.character(
        colors.includes(state.color) ? state.color : '#D32F2F',
        '#EDBD96',
        '#343934',
      );
      avatar.person.name = `remote-player:${state.id}`;
      avatar.person.position.set(state.x, state.y, state.z);
      avatar.person.rotation.y = state.h;
      const tag = factory.label(state.name, '', '#37474F', 1.6, 0.4);
      (tag.material as THREE.MeshBasicMaterial).transparent = true;
      tag.position.set(0, 2.3, 0);
      avatar.person.add(tag);
      scene.add(avatar.person);
      r = { avatar, tag, target: state, lastSeen: 0, stride: 0 };
      remotes.set(state.id, r);
    }
    r.target = state;
    r.lastSeen = performance.now();
  }

  function remove(id: string) {
    const r = remotes.get(id);
    if (!r) return;
    scene.remove(r.avatar.person);
    // Body meshes share cached geometry/materials with the hall; only the name tag is unique.
    const material = r.tag.material as THREE.MeshBasicMaterial;
    material.map?.dispose();
    material.dispose();
    r.tag.geometry.dispose();
    remotes.delete(id);
  }

  /** Call once per rendered frame. */
  function prune() {
    const now = performance.now();
    for (const [id, r] of remotes) if (now - r.lastSeen >= STALE_MS) remove(id);
  }
  const inverseRotation = new THREE.Quaternion();
  function update(dt: number, reducedMotion: boolean, camera: THREE.Camera) {
    prune();
    const blend = 1 - Math.exp(-12 * dt); // frame-rate independent smoothing
    for (const r of remotes.values()) {
      const p = r.avatar.person;
      const t = r.target;
      p.position.x += (t.x - p.position.x) * blend;
      p.position.z += (t.z - p.position.z) * blend;
      p.position.y += (t.y - p.position.y) * blend;
      let d = (t.h - p.rotation.y) % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      p.rotation.y += d * blend;
      r.stride += dt * 14;
      const swing = t.m && !reducedMotion ? Math.sin(r.stride) * 0.38 : 0;
      r.avatar.left.rotation.x = swing;
      r.avatar.right.rotation.x = -swing;
      if (r.avatar.leftArm) r.avatar.leftArm.rotation.x = -swing * 0.9;
      if (r.avatar.rightArm) r.avatar.rightArm.rotation.x = swing * 0.9;
      p.getWorldQuaternion(inverseRotation).invert();
      camera.getWorldQuaternion(r.tag.quaternion);
      r.tag.quaternion.premultiply(inverseRotation);
      r.tag.visible = true;
      (r.tag.material as THREE.MeshBasicMaterial).opacity = t.busy ? 0.55 : 1;
    }
  }

  function clear() {
    for (const id of [...remotes.keys()]) remove(id);
  }

  return { upsert, remove, update, prune, clear, count: () => remotes.size };
}
