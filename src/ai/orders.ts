import type { ConversationStage, Lesson, OrderPrompt } from '../content/types';
import { GLOSS } from '../content/lessons';

export type AiOrderPrompt = OrderPrompt & { ai?: true };

const TIMEOUT_MS = 20000;
const AI_COUNT = 2;
const MAX_Q = 300;
const HARAM = /\b(pork|lard|babi|bacon|ham|beer|wine|alcohol)\b/i;

const BRIEFS: Record<string, string> = {
  drinks:
    'Kopi/teh stall drinks only (coffee and tea with milk, sugar and ice options). No food, no alcohol.',
  noodles:
    'Fishball noodle stall only (noodle type, dry or soup, chili). No other dishes.',
  nasi: 'Halal Malay hawker stall only: nasi lemak, mee rebus, mee soto or lontong, using the given vocabulary. Never mention pork, lard, alcohol or any non-halal food.',
};

function shuffle<T>(xs: readonly T[]): T[] {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function chipPool(lv: Lesson): Set<string> {
  const pool = new Set(lv.chips);
  for (const p of lv.prompts)
    for (const s of p.stages ?? []) s.chips.forEach((c) => pool.add(c));
  return pool;
}

function tokensOk(
  tokens: unknown,
  pool: Set<string>,
  max: number,
): tokens is string[] {
  if (!Array.isArray(tokens) || tokens.length === 0 || tokens.length > max)
    return false;
  if (new Set(tokens).size !== tokens.length) return false;
  return tokens.every(
    (t) => typeof t === 'string' && pool.has(t) && !!GLOSS[t],
  );
}

/** Rebuild AI stages from authored stages so q/chips always match the lesson's real flow. */
function validStages(
  lv: Lesson,
  raw: unknown,
  a: string[],
  pool: Set<string>,
): ConversationStage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const authored = lv.prompts.flatMap((p) => p.stages ?? []);
  const stages: ConversationStage[] = [];
  for (const s of raw) {
    if (!s || typeof s !== 'object') return null;
    const sa = (s as { a?: unknown }).a;
    if (!tokensOk(sa, pool, lv.slots.length)) return null;
    const chips = (s as { chips?: unknown }).chips;
    if (chips !== undefined && !tokensOk(chips, pool, pool.size)) return null;
    const match = authored.find(
      (st) =>
        st.a.length === sa.length && sa.every((t) => st.chips.includes(t)),
    );
    if (!match) return null;
    stages.push({ q: match.q, chips: match.chips.slice(), a: sa.slice() });
  }
  const seq = stages.map((s) => s.q).join('\n');
  const known = lv.prompts.some(
    (p) => (p.stages ?? []).map((s) => s.q).join('\n') === seq,
  );
  if (!known) return null;
  if (stages.flatMap((s) => s.a).join('\n') !== a.join('\n')) return null;
  return stages;
}

export function validateOrder(lv: Lesson, raw: unknown): AiOrderPrompt | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as {
    q?: unknown;
    a?: unknown;
    stages?: unknown;
    friend?: unknown;
  };
  if (typeof o.q !== 'string') return null;
  const q = o.q.trim();
  if (!q || q.length > MAX_Q || HARAM.test(q)) return null;
  const pool = chipPool(lv);
  if (!tokensOk(o.a, pool, lv.slots.length)) return null;
  const order: AiOrderPrompt = { q, a: o.a.slice(), ai: true };
  if (lv.id === 'nasi') {
    const stages = validStages(lv, o.stages, order.a, pool);
    if (!stages) return null;
    order.stages = stages;
  }
  const f = o.friend as { name?: unknown; tag?: unknown } | undefined;
  if (
    f &&
    typeof f.name === 'string' &&
    typeof f.tag === 'string' &&
    f.name.trim()
  ) {
    const avs = lv.prompts.flatMap((p) => (p.friend ? [p.friend.av] : []));
    if (avs.length) {
      order.friend = {
        name: f.name.trim().slice(0, 40),
        tag: f.tag.trim().slice(0, 80),
        av: avs[Math.floor(Math.random() * avs.length)],
      };
    }
  }
  return order;
}

export function buildRequest(lv: Lesson) {
  const terms = [...chipPool(lv)].filter((t) => GLOSS[t]);
  return {
    lessonId: lv.id,
    stall: lv.stall,
    count: AI_COUNT,
    brief:
      BRIEFS[lv.id] ??
      `${lv.stall} orders only. Halal-safe: no pork, lard or alcohol.`,
    vocabulary: terms.map((term) => ({
      term,
      category: GLOSS[term].cat,
      meaning: GLOSS[term].short,
    })),
    examples: shuffle(lv.prompts)
      .slice(0, 2)
      .map(({ q, a, stages }) => (stages ? { q, a, stages } : { q, a })),
  };
}

async function fetchAiOrders(
  lv: Lesson,
  url: string,
): Promise<AiOrderPrompt[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildRequest(lv)),
      signal: ctrl.signal,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { orders?: unknown };
    if (!Array.isArray(data?.orders)) return [];
    return data.orders
      .map((o) => validateOrder(lv, o))
      .filter((o): o is AiOrderPrompt => !!o)
      .slice(0, AI_COUNT);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** Shuffled authored prompts for one visit; repeats fresh shuffles if a lesson has fewer than `count`. */
export function authoredOrders(lv: Lesson, count = 6): AiOrderPrompt[] {
  const authored: AiOrderPrompt[] = [];
  while (lv.prompts.length && authored.length < count)
    authored.push(...shuffle(lv.prompts));
  authored.length = Math.min(authored.length, Math.max(count, 0));
  return authored;
}

/** Valid AI cravings for this lesson, or none when unconfigured or on any failure. */
export async function aiOrders(
  lv: Lesson,
  url = import.meta.env.VITE_AI_URL,
): Promise<AiOrderPrompt[]> {
  return url ? fetchAiOrders(lv, url) : [];
}

/** Orders for one visit: shuffled authored prompts, with valid AI cravings first when configured. */
export async function ordersFor(
  lv: Lesson,
  count = 6,
  url = import.meta.env.VITE_AI_URL,
): Promise<AiOrderPrompt[]> {
  const authored = authoredOrders(lv, count);
  const ai = await aiOrders(lv, url);
  return [...ai.slice(0, authored.length), ...authored.slice(ai.length)];
}
