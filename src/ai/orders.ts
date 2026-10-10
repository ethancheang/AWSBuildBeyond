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
  nasi: "Halal Malay stall; never mention pork, lard or alcohol. Answer order: one meal term, then for 'Nasi lemak satu' only an optional 'Ayam goreng' and an optional egg term, then exactly one sambal term, then exactly one dining term. Mee rebus, mee soto and lontong never take chicken or egg terms. No greetings or thanks in the answer.",
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

/** Answers must follow the lesson's slot order (e.g. Kopi, milk, sugar, then ice), one per slot. */
function slotOrderOk(lv: Lesson, a: string[]): boolean {
  let last = -1;
  for (const t of a) {
    const cat = GLOSS[t]?.cat;
    if (cat === 'polite') continue;
    const i = lv.slots.indexOf(cat);
    if (i <= last) return false;
    last = i;
  }
  return true;
}

const dishOf = (tokens: string[]) =>
  tokens.map((t) => (t === 'Satu nasi lemak' ? 'Nasi lemak satu' : t))[0];

/**
 * Build the Malay conversation from the AI's answer using an authored flow for the
 * same dish, so only nasi lemak asks about chicken and egg. The AI's own stages are ignored.
 */
function stagesFor(lv: Lesson, a: string[]): ConversationStage[] | null {
  for (const p of lv.prompts) {
    const flow = p.stages ?? [];
    if (flow.reduce((n, st) => n + st.a.length, 0) !== a.length) continue;
    if (dishOf(flow[0]?.a ?? []) !== dishOf(a)) continue;
    let i = 0;
    const stages = flow.map((st) => {
      const part = a.slice(i, (i += st.a.length));
      return part.every((t) => st.chips.includes(t))
        ? { q: st.q, chips: st.chips.slice(), a: part }
        : null;
    });
    if (stages.every(Boolean)) return stages as ConversationStage[];
  }
  return null;
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
  const a = o.a.filter((t) => GLOSS[t]?.cat !== 'polite');
  if (!a.length || !slotOrderOk(lv, a)) return null;
  const order: AiOrderPrompt = { q, a, ai: true };
  if (lv.id === 'nasi') {
    const stages = stagesFor(lv, a);
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
  // ?orders=all plays every authored order in its written order (used by browser tests).
  if (fixedOrders()) return lv.prompts.slice();
  const authored: AiOrderPrompt[] = [];
  while (lv.prompts.length && authored.length < count)
    authored.push(...shuffle(lv.prompts));
  authored.length = Math.min(authored.length, Math.max(count, 0));
  return authored;
}

function fixedOrders(): boolean {
  return (
    typeof location !== 'undefined' &&
    new URLSearchParams(location.search).get('orders') === 'all'
  );
}

/** Valid AI cravings for this lesson, or none when unconfigured or on any failure. */
export async function aiOrders(
  lv: Lesson,
  url = import.meta.env.VITE_AI_URL,
): Promise<AiOrderPrompt[]> {
  return url && !fixedOrders() ? fetchAiOrders(lv, url) : [];
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
