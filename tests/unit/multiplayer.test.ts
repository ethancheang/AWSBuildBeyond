import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { parseMessage } from '../../src/net/protocol';
import type {
  NetMessage,
  StateMessage,
  TransportFactory,
} from '../../src/net/protocol';
import { createSession } from '../../src/net/session';
import { createRemotePlayers } from '../../src/world/remotePlayers';
import { onPublish } from '../../aws/game-namespace-handlers.js';

const state: StateMessage = {
  type: 'state',
  id: 'player-a',
  name: 'Alice',
  color: '#D32F2F',
  x: 0,
  z: 14,
  y: 0,
  h: 0,
  m: false,
  busy: false,
};
afterEach(() => vi.useRealTimers());

describe('untrusted movement validation', () => {
  it('rejects malformed data consistently in the browser and AWS handler', () => {
    const invalid = [
      null,
      [],
      {},
      { ...state, id: '' },
      { ...state, id: '../bad' },
      { ...state, x: NaN },
      { ...state, z: Infinity },
      { ...state, x: '0' },
      { ...state, x: 18, z: 18 },
      { ...state, y: 4 },
      { ...state, h: 101 },
      { ...state, m: 'true' },
      { ...state, type: 'lesson' },
    ];
    for (const payload of invalid) {
      expect(parseMessage(payload)).toBeNull();
      expect(onPublish({ events: [{ id: 'event', payload }] })).toEqual([]);
    }
    expect(parseMessage('{bad')).toBeNull();
  });
  it('agrees on the octagonal hall and strips unexpected fields', () => {
    for (let x = -20; x <= 20; x += 2)
      for (let z = -20; z <= 20; z += 2) {
        const payload = {
          ...state,
          x,
          z,
          name: 'A'.repeat(40),
          color: 'invalid',
          lesson: 'private',
        };
        const client = parseMessage(payload);
        const server =
          onPublish({ events: [{ id: 'event', payload }] })[0]?.payload ?? null;
        expect(client).toEqual(server);
        if (client?.type === 'state') expect(client.name).toHaveLength(16);
      }
    expect(parseMessage({ type: 'leave', id: 'player-a', secret: 1 })).toEqual({
      type: 'leave',
      id: 'player-a',
    });
  });
});

describe('presence independent of the render loop', () => {
  it('announces on connect, caps movement at 10Hz, heartbeats during lessons and cleans up', () => {
    vi.useFakeTimers();
    let read = { ...state };
    const sent: NetMessage[] = [];
    let receive!: (message: NetMessage) => void, ready!: () => void;
    const close = vi.fn(),
      upsert = vi.fn(),
      remove = vi.fn();
    const transport: TransportFactory = (onMessage, onReady) => {
      receive = onMessage;
      ready = onReady;
      return {
        send: (m) => {
          sent.push(m);
          return true;
        },
        close,
      };
    };
    const session = createSession({
      transport,
      read: () => read,
      upsert,
      remove,
      name: 'Alice',
    });
    ready();
    expect(sent.map((m) => m.type)).toEqual(['hello', 'state']);
    vi.advanceTimersByTime(1900);
    expect(sent).toHaveLength(2);
    vi.advanceTimersByTime(100);
    expect(sent).toHaveLength(3);
    const before = sent.length;
    for (let n = 0; n < 10; n++) {
      read = { ...read, x: n / 10, m: true, y: 0.5 };
      vi.advanceTimersByTime(100);
    }
    expect(sent).toHaveLength(before + 10);
    read = { ...read, busy: true, m: false, y: 0 };
    vi.advanceTimersByTime(100);
    expect(sent.at(-1)).toMatchObject({ busy: true, m: false });
    vi.advanceTimersByTime(6000);
    expect(sent.filter((m) => m.type === 'state' && m.busy)).toHaveLength(4);
    receive(sent[1]); // own echo
    expect(upsert).not.toHaveBeenCalled();
    receive({ ...state, id: 'other' });
    expect(upsert).toHaveBeenCalledOnce();
    receive({ type: 'hello', id: 'newcomer' });
    expect(sent.at(-1)?.type).toBe('state');
    receive({ type: 'leave', id: 'other' });
    expect(remove).toHaveBeenCalledWith('other');
    ready(); // reconnect: announce current state again
    expect(sent.at(-2)?.type).toBe('hello');
    session.close();
    session.close();
    expect(sent.at(-1)?.type).toBe('leave');
    expect(close).toHaveBeenCalledOnce();
    const size = sent.length;
    vi.advanceTimersByTime(10000);
    expect(sent).toHaveLength(size);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('remote avatars', () => {
  it('interpolates height and heading, fades and billboards tags, then disposes them on expiry', () => {
    vi.useFakeTimers();
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera();
    camera.rotation.y = 0.7;
    const shared = new THREE.BoxGeometry();
    const sharedDispose = vi.spyOn(shared, 'dispose');
    const factory = {
      character: () => {
        const person = new THREE.Group();
        person.add(new THREE.Mesh(shared));
        return {
          person,
          left: new THREE.Object3D(),
          right: new THREE.Object3D(),
        };
      },
      label: () =>
        new THREE.Mesh(
          new THREE.PlaneGeometry(),
          new THREE.MeshBasicMaterial({ map: new THREE.Texture() }),
        ),
    };
    const remotes = createRemotePlayers(scene, factory);
    remotes.upsert(state);
    const person = scene.children[0],
      tag = person.children[1] as THREE.Mesh<
        THREE.PlaneGeometry,
        THREE.MeshBasicMaterial
      >;
    const dispose = vi.spyOn(tag.material.map!, 'dispose');
    remotes.upsert({ ...state, x: 1, y: 1, h: 1, busy: true, m: true });
    remotes.update(0.1, false, camera);
    expect(person.position.x).toBeGreaterThan(0);
    expect(person.position.x).toBeLessThan(1);
    expect(person.position.y).toBeGreaterThan(0);
    expect(tag.material.opacity).toBe(0.55);
    const tagRotation = tag.getWorldQuaternion(new THREE.Quaternion());
    expect(tagRotation.angleTo(camera.quaternion)).toBeCloseTo(0);
    remotes.upsert({ ...state, busy: false });
    remotes.update(0.1, true, camera);
    expect(tag.material.opacity).toBe(1);
    vi.advanceTimersByTime(6000);
    remotes.prune(); // no frame needed while in a lesson
    expect(remotes.count()).toBe(0);
    expect(scene.children).toHaveLength(0);
    expect(dispose).toHaveBeenCalledOnce();
    expect(sharedDispose).not.toHaveBeenCalled();
    remotes.upsert(state);
    remotes.remove(state.id);
    remotes.clear();
    expect(remotes.count()).toBe(0);
  });
});
