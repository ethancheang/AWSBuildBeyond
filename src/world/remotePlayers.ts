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
      const avatar = factory.character(state.color, '#EDBD96', '#343934');
      avatar.person.position.set(state.x, state.y, state.z);
      avatar.person.rotation.y = state.h;
      const tag = factory.label(state.name, '', '#37474F', 1.4, 0.4);
      tag.position.set(0, 2.3, 0);
      avatar.person.add(tag);
      (tag.material as THREE.MeshBasicMaterial).transparent = true;
      (tag.material as THREE.MeshBasicMaterial).depthTest = false;
      tag.renderOrder = 10;
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
  function update(dt: number, reducedMotion: boolean, camera?: THREE.Camera) {
    const now = performance.now();
    const blend = 1 - Math.exp(-12 * dt); // frame-rate independent smoothing
    for (const [id, r] of remotes) {
      if (now - r.lastSeen > STALE_MS) {
        remove(id);
        continue;
      }
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
      if (r.avatar.leftArm) r.avatar.leftArm.rotation.x = -swing;
      if (r.avatar.rightArm) r.avatar.rightArm.rotation.x = swing;
      if (camera) {
        const worldRotation = camera.getWorldQuaternion(new THREE.Quaternion());
        r.tag.quaternion
          .copy(p.getWorldQuaternion(new THREE.Quaternion()).invert())
          .multiply(worldRotation);
      }
      r.tag.visible = true;
      (r.tag.material as THREE.MeshBasicMaterial).opacity = t.busy ? 0.55 : 1;
    }
  }

  function clear() {
    for (const id of [...remotes.keys()]) remove(id);
  }

  return { upsert, remove, update, clear, count: () => remotes.size };
}
