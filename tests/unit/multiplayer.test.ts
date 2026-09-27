import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { parseMessage, type StateMessage } from '../../src/net/protocol';
import { createAppSyncTransport } from '../../src/net/appsync';
import { createWsTransport } from '../../src/net/wsTransport';
import { createRemotePlayers } from '../../src/world/remotePlayers';

const state: StateMessage = {
  type: 'state',
  id: 'visitor',
  name: 'Visitor',
  color: '#2E86DE',
  x: 2,
  z: 3,
  y: 0,
  h: 0,
  m: false,
  busy: false,
};
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('rejects malformed messages and reserved ids; bounds positions and labels', () => {
  for (const value of [
    '{',
    null,
    {},
    { type: 'leave', id: '' },
    { type: 'hello', id: '__connected__' },
  ])
    expect(parseMessage(value)).toBeNull();
  expect(
    parseMessage({
      ...state,
      x: Infinity,
      z: -999,
      y: 99,
      name: 'a'.repeat(50),
      color: 'red',
    }),
  ).toMatchObject({
    x: 0,
    z: -18.5,
    y: 3,
    name: 'a'.repeat(16),
    color: '#2E86DE',
  });
});

it('smooths remote jumps, fades busy tags, expires presence and preserves shared resources', () => {
  vi.spyOn(performance, 'now').mockReturnValue(0);
  const scene = new THREE.Scene();
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshBasicMaterial();
  const dispose = vi.spyOn(geometry, 'dispose');
  const remotes = createRemotePlayers(scene, {
    character: () => {
      const person = new THREE.Group();
      person.add(new THREE.Mesh(geometry, material));
      return {
        person,
        left: new THREE.Object3D(),
        right: new THREE.Object3D(),
      };
    },
    label: () =>
      new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial()),
  });
  remotes.upsert(state);
  remotes.upsert({ ...state, x: 8, y: 2, busy: true });
  remotes.update(0.1, false, new THREE.PerspectiveCamera());
  const person = scene.children[0];
  expect(person.position.x).toBeGreaterThan(2);
  expect(person.position.x).toBeLessThan(8);
  expect(person.position.y).toBeGreaterThan(0);
  expect(
    ((person.children[1] as THREE.Mesh).material as THREE.MeshBasicMaterial)
      .opacity,
  ).toBe(0.55);
  vi.mocked(performance.now).mockReturnValue(7000);
  remotes.update(0.1, false);
  expect(remotes.count()).toBe(0);
  expect(dispose).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});

class FakeSocket {
  static OPEN = 1;
  static instances: FakeSocket[] = [];
  readyState = 1;
  sent: Record<string, unknown>[] = [];
  onopen?: () => void;
  onclose?: () => void;
  onmessage?: (event: { data: string }) => void;
  constructor(
    public url: string,
    public protocols?: string[],
  ) {
    FakeSocket.instances.push(this);
  }
  send(raw: string) {
    this.sent.push(JSON.parse(raw));
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  receive(value: unknown) {
    this.onmessage?.({ data: JSON.stringify(value) });
  }
}

describe('transports', () => {
  function setup() {
    vi.useFakeTimers();
    FakeSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeSocket);
    vi.stubGlobal('window', globalThis);
  }
  it('performs the AppSync handshake, subscribes, publishes, handles data and reconnects', () => {
    setup();
    const receive = vi.fn();
    const transport = createAppSyncTransport(
      {
        httpHost: 'test.appsync-api.example',
        realtimeHost: 'test.realtime.example',
        apiKey: 'test',
        channel: '/game/test',
      },
      receive,
    );
    const socket = FakeSocket.instances[0];
    socket.onopen?.();
    expect(socket.sent[0]).toEqual({ type: 'connection_init' });
    transport.send(state);
    expect(socket.sent).toHaveLength(1);
    socket.receive({ type: 'connection_ack', connectionTimeoutMs: 5000 });
    const subscription = socket.sent[1];
    expect(subscription).toMatchObject({
      type: 'subscribe',
      channel: '/game/test',
    });
    socket.receive({ type: 'subscribe_success', id: subscription.id });
    expect(receive).toHaveBeenCalledWith({
      type: 'hello',
      id: '__connected__',
    });
    transport.send(state);
    expect(socket.sent[2]).toMatchObject({
      type: 'publish',
      events: [JSON.stringify(state)],
    });
    socket.onmessage?.({ data: '{malformed' });
    socket.receive({
      type: 'data',
      id: subscription.id,
      event: [JSON.stringify(state)],
    });
    expect(receive).toHaveBeenCalledWith(state);
    vi.advanceTimersByTime(6100);
    expect(FakeSocket.instances).toHaveLength(2);
    transport.close();
    vi.advanceTimersByTime(60000);
    expect(FakeSocket.instances).toHaveLength(2);
  });
  it('reconnects the local relay and cancels retries when disposed', () => {
    setup();
    const receive = vi.fn();
    const transport = createWsTransport('ws://localhost:8080', receive);
    const socket = FakeSocket.instances[0];
    socket.onopen?.();
    socket.receive(state);
    expect(receive).toHaveBeenCalledWith(state);
    socket.close();
    vi.advanceTimersByTime(1100);
    expect(FakeSocket.instances).toHaveLength(2);
    FakeSocket.instances[1].close();
    transport.close();
    vi.advanceTimersByTime(60000);
    expect(FakeSocket.instances).toHaveLength(2);
  });
});
