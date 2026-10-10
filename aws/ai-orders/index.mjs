// Kopi That! AI craving orders. Lambda (Node.js 22, ESM) behind a Function URL.
import Anthropic from '@anthropic-ai/sdk';

// Reads ANTHROPIC_API_KEY from the Lambda environment.
const client = new Anthropic();
const MODEL_ID = process.env.MODEL_ID || 'claude-haiku-5-5';
const ALLOWED = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const LESSONS = new Set(['drinks', 'noodles', 'nasi']);
const MAX_BODY = 16 * 1024;
const BANNED =
  /\b(pork|lard|bak|char\s*siu|siew\s*yuk|bacon|ham|beer|wine|alcohol|liquor|rum|whisky|stout|sake|soju|tiger|guinness|heineken)\b/i;

function cors(origin) {
  const h = { 'Content-Type': 'application/json', Vary: 'Origin' };
  if (origin && ALLOWED.includes(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'POST,OPTIONS';
    h['Access-Control-Allow-Headers'] = 'content-type';
    h['Access-Control-Max-Age'] = '600';
  }
  return h;
}
const reply = (status, body, origin) => ({
  statusCode: status,
  headers: cors(origin),
  body: JSON.stringify(body),
});

const str = (v, max) => typeof v === 'string' && v.length <= max;

function validate(b) {
  if (!b || typeof b !== 'object') return 'body must be a JSON object';
  if (!LESSONS.has(b.lessonId)) return 'unknown lessonId';
  if (!str(b.stall, 80) || !b.stall.trim())
    return 'stall must be a short string';
  if (!Number.isInteger(b.count) || b.count < 1 || b.count > 3)
    return 'count must be 1-3';
  if (b.brief !== undefined && !str(b.brief, 600)) return 'brief too long';
  if (
    !Array.isArray(b.vocabulary) ||
    !b.vocabulary.length ||
    b.vocabulary.length > 60
  )
    return 'vocabulary must have 1-60 items';
  for (const v of b.vocabulary) {
    if (!v || !str(v.term, 40) || !v.term.trim()) return 'bad vocabulary term';
    if (v.category !== undefined && !str(v.category, 40))
      return 'bad vocabulary category';
    if (v.meaning !== undefined && !str(v.meaning, 120))
      return 'bad vocabulary meaning';
  }
  if (b.examples !== undefined) {
    if (!Array.isArray(b.examples) || b.examples.length > 8)
      return 'examples must be an array of up to 8';
    for (const e of b.examples)
      if (!e || !str(e.q, 300) || !Array.isArray(e.a)) return 'bad example';
  }
  return null;
}

const ORDER_TOOL = {
  name: 'submit_orders',
  description: 'Return the generated hawker craving orders.',
  input_schema: {
    type: 'object',
    required: ['orders'],
    properties: {
      orders: {
        type: 'array',
        items: {
          type: 'object',
          required: ['q', 'a'],
          properties: {
            q: {
              type: 'string',
              description: 'Short warm second-person scenario, "You want..."',
            },
            a: {
              type: 'array',
              items: { type: 'string' },
              description: 'Exact vocabulary terms in ordering order',
            },
            stages: {
              type: 'array',
              items: {
                type: 'object',
                required: ['q', 'a', 'chips'],
                properties: {
                  q: { type: 'string' },
                  a: { type: 'array', items: { type: 'string' } },
                  chips: { type: 'array', items: { type: 'string' } },
                },
              },
            },
            friend: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                tag: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};

function systemPrompt(lessonId) {
  return [
    'You write short, warm second-person scenarios ("You want...") for a customer at a Singapore hawker stall in a language-learning game.',
    'Each order has q (the scenario, max 2 sentences) and a (the answer tokens).',
    'Answers MUST use only the exact vocabulary terms given, spelled exactly, in the conventional ordering order shown in the examples.',
    'If examples use stages, include stages with q, a and chips (chips = the a tokens plus 2-3 plausible distractors, all from the vocabulary).',
    'Vary the craving: mood, weather, time of day, errands for a friend (then set friend {name, tag}).',
    'Food and drinks must fit the stall. No brand names.',
    lessonId === 'nasi'
      ? 'Everything is halal: never pork, lard or alcohol.'
      : 'Never mention alcohol.',
    'Respond only by calling the submit_orders tool.',
  ].join(' ');
}

function parseOrders(out) {
  const content = out?.content || [];
  const tool = content.find((c) => c.type === 'tool_use')?.input;
  if (tool?.orders) return tool.orders;
  const text = content.map((c) => (c.type === 'text' ? c.text : '')).join('');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return [];
  try {
    return JSON.parse(m[0]).orders || [];
  } catch {
    return [];
  }
}

function cleanOrders(orders, vocab, lessonId, count) {
  const ok = (arr) =>
    Array.isArray(arr) &&
    arr.length > 0 &&
    arr.every((t) => typeof t === 'string' && vocab.has(t));
  const clean = [];
  for (const o of Array.isArray(orders) ? orders : []) {
    if (!o || typeof o.q !== 'string' || !o.q.trim() || !ok(o.a)) continue;
    const order = { q: o.q.trim().slice(0, 300), a: o.a };
    if (Array.isArray(o.stages) && o.stages.length) {
      const stages = o.stages.map((s) => ({
        q: String(s?.q || '').slice(0, 200),
        a: s?.a,
        chips: s?.chips,
      }));
      if (!stages.every((s) => s.q && ok(s.a) && ok(s.chips))) continue;
      order.stages = stages;
    }
    if (o.friend && typeof o.friend.name === 'string') {
      order.friend = {
        name: o.friend.name.slice(0, 30),
        tag: String(o.friend.tag || '').slice(0, 40),
      };
    }
    const all = JSON.stringify(order);
    if (BANNED.test(all)) continue;
    if (lessonId === 'nasi' && /\b(babi|khinzir)\b/i.test(all)) continue;
    clean.push(order);
    if (clean.length >= count) break;
  }
  return clean;
}

export const handler = async (event) => {
  const headers = Object.fromEntries(
    Object.entries(event?.headers || {}).map(([k, v]) => [k.toLowerCase(), v]),
  );
  const origin = headers.origin;
  const method =
    event?.requestContext?.http?.method || event?.httpMethod || 'POST';
  if (method === 'OPTIONS')
    return { statusCode: 204, headers: cors(origin), body: '' };
  if (method !== 'POST') return reply(405, { error: 'POST only' }, origin);
  if (!process.env.ANTHROPIC_API_KEY)
    return reply(500, { error: 'ANTHROPIC_API_KEY not set' }, origin);

  let raw = event?.body || '';
  if (event?.isBase64Encoded) raw = Buffer.from(raw, 'base64').toString('utf8');
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY)
    return reply(400, { error: 'body too large' }, origin);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return reply(400, { error: 'invalid JSON' }, origin);
  }
  const err = validate(body);
  if (err) return reply(400, { error: err }, origin);

  const vocab = new Set(body.vocabulary.map((v) => v.term));
  const user = JSON.stringify({
    stall: body.stall,
    count: body.count,
    brief: body.brief || '',
    vocabulary: body.vocabulary,
    examples: body.examples || [],
  });

  try {
    const out = await client.messages.create({
      model: MODEL_ID,
      max_tokens: 2000,
      system: systemPrompt(body.lessonId),
      messages: [
        {
          role: 'user',
          content: `Write ${body.count} new order(s) for this request:
${user}`,
        },
      ],
      tools: [ORDER_TOOL],
      tool_choice: { type: 'tool', name: 'submit_orders' },
    });
    const orders = cleanOrders(
      parseOrders(out),
      vocab,
      body.lessonId,
      body.count,
    );
    return reply(200, { orders }, origin);
  } catch (e) {
    console.error('anthropic error', e?.status, e?.message);
    return reply(502, { error: 'generation failed' }, origin);
  }
};
