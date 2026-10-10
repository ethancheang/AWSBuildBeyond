// Marcus, a fictional office worker on a lunch break. He represents one
// character, not all Singaporeans: chope is an informal custom, never a right.

export type Topic = 'chope' | 'sharing' | 'courtesy';
export type Action = Topic | 'none';
export type Source = 'player' | 'scripted' | 'ai';
export interface Turn {
  role: 'user' | 'assistant';
  text: string;
  source: Source;
}
export interface Encounter {
  status: 'new' | 'met' | 'dismissed' | 'completed';
  turns: Turn[];
  topics: Topic[];
}

export const STORAGE_KEY = 'kopi-that:marcus:v1';
export const MAX_MESSAGE = 500;
export const MAX_ENTRY = 800;
export const MAX_HISTORY = 23;
export const TOPICS: Topic[] = ['chope', 'sharing', 'courtesy'];

export const OPENING =
  "Hi, I'm Marcus. Just escaped the office for lunch! I left my tissue packet here to chope one seat. Have you seen people do that before?";

export const PREVIEW: { topic: Topic; question: string; reply: string }[] = [
  {
    topic: 'chope',
    question: 'Why leave tissues here?',
    reply:
      'Chope means reserve. Some diners leave a tissue packet to signal that a seat is taken while they get food. It is an informal custom, not a rule everyone follows. I only need this one seat.',
  },
  {
    topic: 'sharing',
    question: 'Can I sit here too?',
    reply:
      "Can! I'm saving just this seat, not the whole table. You can ask, 'Anyone sitting here?' before taking another seat. Sharing tables helps when lunch gets busy.",
  },
  {
    topic: 'courtesy',
    question: 'What if someone is already sitting?',
    reply:
      "Then I ask politely. A packet doesn't give me the right to move someone out of their seat. If there is a misunderstanding, we can talk it through or find another spot.",
  },
];

/** Fixed learning notes; never AI-written and not a comprehension score. */
export const NOTES: Record<Topic, string> = {
  chope:
    'Chope means reserve. A tissue packet on a seat is an informal sign that someone will be back with food.',
  sharing:
    "Tables are often shared at lunch. Ask 'Anyone sitting here?' before taking a free seat.",
  courtesy:
    'A packet is not a right. Never ask a seated person to move; talk it through politely or find another spot.',
};

export const fresh = (): Encounter => ({
  status: 'new',
  turns: [],
  topics: [],
});

function storage(): Storage | undefined {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

let memory: Encounter = fresh();

const isTopic = (v: unknown): v is Topic => TOPICS.includes(v as Topic);

/** Parse stored data defensively; anything malformed starts over. */
export function parseEncounter(raw: string | null | undefined): Encounter {
  try {
    const data = JSON.parse(raw ?? '');
    if (!['new', 'met', 'dismissed', 'completed'].includes(data?.status))
      return fresh();
    const turns = Array.isArray(data.turns)
      ? data.turns.filter(
          (t: Turn) =>
            (t?.role === 'user' || t?.role === 'assistant') &&
            typeof t.text === 'string' &&
            ['player', 'scripted', 'ai'].includes(t.source),
        )
      : [];
    const topics = Array.isArray(data.topics)
      ? [...new Set(data.topics.filter(isTopic))]
      : [];
    return { status: data.status, turns, topics } as Encounter;
  } catch {
    return fresh();
  }
}

export function load(): Encounter {
  const store = storage();
  if (!store) return structuredClone(memory);
  try {
    return parseEncounter(store.getItem(STORAGE_KEY));
  } catch {
    return structuredClone(memory);
  }
}

export function store(encounter: Encounter) {
  memory = structuredClone(encounter);
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(encounter));
  } catch {
    // Storage may be full or blocked; the encounter still works in memory.
  }
}

/** The state machine from the spec. Unknown transitions leave state as is. */
export function transition(
  e: Encounter,
  event: 'open' | 'decline' | 'save' | 'revisit' | 'clear',
): Encounter {
  if (event === 'clear') return fresh();
  const next = { ...e, turns: [...e.turns], topics: [...e.topics] };
  if (event === 'open' && e.status === 'new') next.status = 'met';
  else if (event === 'decline' && e.status === 'met') next.status = 'dismissed';
  else if (event === 'save' && e.status === 'met') next.status = 'completed';
  else if (event === 'revisit' && e.status === 'dismissed') next.status = 'met';
  return next;
}

/** Automatic introductions stop once the player has met or dismissed Marcus. */
export const canAutoEncounter = (e: Encounter) => e.status === 'new';

export function addTopic(e: Encounter, action: Action): Encounter {
  if (!isTopic(action) || e.topics.includes(action)) return e;
  return { ...e, topics: [...e.topics, action] };
}

/** "Practise again": clear the transcript, keep explored topics. */
export const practise = (e: Encounter): Encounter => ({ ...e, turns: [] });

export function withOpening(e: Encounter): Encounter {
  if (e.turns.length) return e;
  return {
    ...e,
    turns: [{ role: 'assistant', text: OPENING, source: 'scripted' }],
  };
}

/** Bounded history for the live endpoint: the last entries, alternating roles. */
export function historyFor(turns: Turn[]) {
  return turns
    .slice(-MAX_HISTORY)
    .map((t) => ({ role: t.role, text: t.text.slice(0, MAX_ENTRY) }));
}

export function validateReply(
  data: unknown,
): { reply: string; action: Action } | null {
  const d = data as { reply?: unknown; action?: unknown } | null;
  if (!d || typeof d.reply !== 'string') return null;
  const reply = d.reply.trim();
  if (!reply || reply.length > MAX_ENTRY) return null;
  const action = d.action ?? 'none';
  if (action !== 'none' && !isTopic(action)) return null;
  return { reply, action: action as Action };
}

export const escapeHTML = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
