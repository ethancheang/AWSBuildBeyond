import type {
  ConnectionStatus,
  StateMessage,
  Transport,
  TransportFactory,
} from './protocol';

type Snapshot = Omit<StateMessage, 'type' | 'id' | 'name' | 'color'>;
interface SessionOptions {
  transport: TransportFactory;
  read: () => Snapshot;
  upsert: (state: StateMessage) => void;
  remove: (id: string) => void;
  onStatus?: (status: ConnectionStatus) => void;
  name: string;
}

/** Presence has its own clock: lessons pause rendering, but not heartbeats. */
export function createSession(options: SessionOptions) {
  const id = crypto.randomUUID();
  const name = options.name.trim().slice(0, 16) || 'Guest';
  let previous = '',
    lastSent = -Infinity,
    closed = false;
  const state = (): StateMessage => ({
    ...options.read(),
    type: 'state',
    id,
    name,
    color: '#D32F2F',
  });
  function publish(force = false) {
    if (closed) return;
    const message = state();
    const serialized = JSON.stringify(message);
    const now = performance.now();
    if (force || serialized !== previous || now - lastSent >= 2000) {
      if (net.send(message)) {
        previous = serialized;
        lastSent = now;
      }
    }
  }
  const net: Transport = options.transport(
    (message) => {
      if (closed || message.id === id) return;
      if (message.type === 'hello') publish(true);
      else if (message.type === 'leave') options.remove(message.id);
      else options.upsert(message);
    },
    () => {
      net.send({ type: 'hello', id });
      publish(true);
    },
    options.onStatus,
  );
  const timer = setInterval(() => publish(), 100);
  return {
    publish,
    close() {
      if (closed) return;
      clearInterval(timer);
      net.send({ type: 'leave', id });
      closed = true;
      net.close();
    },
  };
}
