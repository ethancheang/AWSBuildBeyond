import type { ConversationStage, Lesson, OrderPrompt } from '../content/types';
import { GLOSS } from '../content/lessons';
import { infoFor } from '../art/food.js';

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

const has = (q: string, re: RegExp) => re.test(q);
const words = (phrase: string) =>
  new RegExp(`\\b${phrase.toLowerCase().replace(/\s+/g, '\\s+')}\\b`);
const dishName = (t: string) =>
  dishOf([t])
    .toLowerCase()
    .replace(/\s*satu$/, '');

// Wording a hawker would read as a choice. Negated forms are listed first so
// "no chili" or "no extra egg" is not mistaken for the positive choice.
const W = {
  iced: /\b(iced|ice|icy|cold|chilled|peng|cool(ing)?|cool (down|off))\b/,
  hot: /\b(warm|warming|warmth)\b|\bhot\b(?!\s+(day|afternoon|morning|evening|night|weather|outside|sun|out))/,
  noSugar:
    /\b(no|zero|without|skip(ping)? the|hold the) sugar\b|\bsugar[- ]free\b|\bunsweetened\b|\bkosong\b/,
  lessSugar:
    /\b(less|a little|little|bit of|half|reduced|lower) (sugar|sweet)|\bnot (so|too) sweet\b|\bcutting down\b|\bsiew dai\b/,
  extraSugar:
    /\b(extra|more|double) (sugar|sweet)|\bsweet tooth\b|\bvery sweet\b|\bga dai\b/,
  noMilk:
    /\b(no|without|skip the|hold the) milk\b|\bblack (coffee|tea|kopi|teh)\b|\bmilk[- ]free\b/,
  anyMilk: /\bmilky\b|\bwith milk\b/,
  evap: /\bevaporated\b|\bcarnation\b/,
  condensed: /\bcondensed\b/,
  // Gao/po strength has no chip, so a hawker could not serve "strong" as asked.
  strength: /\b(strong|gao|kao|thick|weak|po|diluted)\b/,
  soup: /\bin (a |the )?(\w+ )?(bowl of )?(soup|broth)\b|\bsoupy\b|\bsoup noodles?\b/,
  dry: /\bdry\b|\btossed\b/,
  noChili:
    /\b(no|without|skip the|hold the|don'?t want|zero) (chili|spice)\b|\bno spic|\bnot spicy\b|\bmild\b|\bcan(not|'?t) take spice\b|\bbo hiam\b|\bnon-spicy\b/,
  chili:
    /\bwith (\w+ )?chili\b|\badd chili\b|\b(plenty|lots|extra) of chili\b|\bspicy\b|\bkick\b/,
  takeaway:
    /\btake ?away\b|\bto go\b|\bbungkus\b|\bpack(ed)?\b(?!\s+(it\s+)?separately)|\bbring (it |one )?(home|back)\b|\bbuy (it |one )?back\b|\bda ?bao\b|\bta ?pau\b/,
  eatHere:
    /\beat (it )?here\b|\bdine in\b|\bmakan sini\b|\beat at the (stall|hawker|table)\b|\bsit (here|with)\b/,
  noSambal: /\b(no|without|skip the|hold the) sambal\b|\btak nak sambal\b/,
  sepSambal: /\bseparate(ly)?\b|\bon the side\b|\baside\b|\basing\b/,
  littleSambal:
    /\b(a little|little|a bit of|bit of|light|less|small|sikit)\b[^.,;]{0,12}\bsambal\b|\bsambal (a little|sikit)\b/,
  // Sambal sikit is a smaller portion, not a milder recipe, so spice level has no chip.
  sambalHeat: /\b(mild|less spicy|not (so |too )?spicy)\b/,
  noEgg: /\bno (extra )?egg\b|\bwithout (an )?(extra )?egg\b|\btak nak telur\b/,
  addEgg:
    /\b(extra|add(ed)?|one more|another) (an |one )?egg\b|\btambah telur\b/,
  noChicken: /\b(no|without) (fried )?chicken\b/,
  chicken: /\bchicken\b|\bayam\b/,
  // Meta text the model echoes from the request, and hedges that leave a choice open.
  meta: /[()@#]|\btag\s*:|\bfriend\s*:/,
  hedge: /\bmaybe\b|\bperhaps\b|\bif (it'?s |they have )?available\b/,
};

/**
 * Reject scenarios whose wording names a different choice than the answer,
 * e.g. "something warming" with Peng, or "no sugar" with Siew Dai.
 */
export function wordingOk(lv: Lesson, rawQ: string, a: string[]): boolean {
  const q = rawQ.toLowerCase().replace(/[‘’]/g, "'");
  if (has(q, W.meta) || has(q, W.hedge)) return false;
  // Another option in the same slot (e.g. "tea" for a Kopi answer) must not be named.
  const pool = chipPool(lv);
  for (const cat of ['base', 'noodle', 'meal']) {
    const pick = a.find((t) => GLOSS[t]?.cat === cat);
    for (const t of pool) {
      if (GLOSS[t]?.cat !== cat || !pick) continue;
      const name = cat === 'meal' ? dishName(t) : t.toLowerCase();
      if (name === (cat === 'meal' ? dishName(pick) : pick.toLowerCase()))
        continue;
      const short = GLOSS[t].short.replace(/^one /i, '').split(' (')[0];
      if (has(q, words(name)) || has(q, words(short))) return false;
    }
  }
  const any = (...ts: string[]) => ts.some((t) => a.includes(t));
  if (lv.id === 'drinks') {
    if (has(q, W.strength)) return false;
    if (any('Peng') ? has(q, W.hot) : has(q, W.iced)) return false;
    const sugar = {
      Kosong: W.noSugar,
      'Siew Dai': W.lessSugar,
      'Ga Dai': W.extraSugar,
    };
    for (const [t, re] of Object.entries(sugar))
      if (!a.includes(t) && has(q, re)) return false;
    if (
      any('O') &&
      (has(q, W.evap) || has(q, W.condensed) || has(q, W.anyMilk))
    )
      return false;
    if (!any('O') && has(q, W.noMilk)) return false;
    if (any('C') ? has(q, W.condensed) : has(q, W.evap)) return false;
  }
  if (lv.id === 'noodles') {
    if (any('Dry') ? has(q, W.soup) : has(q, W.dry)) return false;
    if (any('Chili') && has(q, W.noChili)) return false;
    if (any('No Chili') && has(q, W.chili) && !has(q, W.noChili)) return false;
  }
  if (lv.id === 'nasi') {
    if (has(q, W.sambalHeat)) return false;
    if (any('Makan sini') ? has(q, W.takeaway) : has(q, W.eatHere))
      return false;
    const sambal = {
      'Tak nak sambal': W.noSambal,
      'Sambal asing': W.sepSambal,
      'Sambal sikit': W.littleSambal,
    };
    for (const [t, re] of Object.entries(sambal))
      if (!a.includes(t) && has(q, re)) return false;
    if (dishOf(a) === 'Nasi lemak satu') {
      const addEgg = has(q, W.addEgg) && !has(q, W.noEgg);
      if (any('Tambah telur satu') ? !addEgg : addEgg) return false;
      const chicken = has(q, W.chicken) && !has(q, W.noChicken);
      if (any('Ayam goreng') !== chicken) return false;
    }
  }
  return true;
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
  // Drop metadata the model sometimes echoes into the scenario, e.g. "(friend tag: @amir)".
  const q = o.q.replace(/\s*\(friend tag:[^)]*\)/gi, '').trim();
  if (!q || q.length > MAX_Q || HARAM.test(q)) return null;
  const pool = chipPool(lv);
  if (!tokensOk(o.a, pool, lv.slots.length)) return null;
  const a = o.a.filter((t) => GLOSS[t]?.cat !== 'polite');
  if (!a.length || !slotOrderOk(lv, a) || !wordingOk(lv, q, a)) return null;
  // AI scenarios can be vague ("a strong iced coffee"), so spell out every choice
  // the answer expects, using the same wording as the "You wanted" card.
  const spec = String(infoFor(lv, a).cap)
    .split(/, | · /)
    .map((part, i) => (i ? part.toLowerCase() : part))
    .join(', ');
  const order: AiOrderPrompt = { q: `${q} Order: ${spec}.`, a, ai: true };
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
