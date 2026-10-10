import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ordersFor,
  validateOrder,
  buildRequest,
  wordingOk,
} from '../../src/ai/orders';
import { LEVELS } from '../../src/content/lessons';

const drinks = LEVELS.find((l) => l.id === 'drinks')!;
const nasi = LEVELS.find((l) => l.id === 'nasi')!;
const noodles = LEVELS.find((l) => l.id === 'noodles')!;
const URL = 'https://ai.example/orders';

function mockFetch(body: unknown) {
  const fn = vi.fn(
    async () => new Response(JSON.stringify(body), { status: 200 }),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('ordersFor', () => {
  it('returns count shuffled authored prompts without AI', async () => {
    const out = await ordersFor(drinks, 6, '');
    expect(out).toHaveLength(6);
    for (const o of out) expect(drinks.prompts).toContain(o);
    const firsts = new Set<string>();
    for (let i = 0; i < 30; i++)
      firsts.add((await ordersFor(drinks, 6, ''))[0].q);
    expect(firsts.size).toBeGreaterThan(1);
  });

  it('puts valid AI orders first and drops invalid ones', async () => {
    const fn = mockFetch({
      orders: [
        {
          q: 'Hot coffee, condensed milk, less sweet.',
          a: ['Kopi', 'Siew Dai'],
          friend: { name: 'Mei', tag: 'colleague' },
        },
        { q: 'Bad token', a: ['Kopi', 'Latte'] },
        { q: 'Duplicate', a: ['Kopi', 'Kopi'] },
      ],
    });
    const out = await ordersFor(drinks, 6, URL);
    expect(out).toHaveLength(6);
    expect(out[0]).toMatchObject({ ai: true, a: ['Kopi', 'Siew Dai'] });
    expect(out[0].friend?.av).toBeTruthy();
    expect(out.filter((o) => o.ai)).toHaveLength(1);
    const body = JSON.parse(
      (fn.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body).toMatchObject({ lessonId: 'drinks', count: 2 });
    expect(body.vocabulary[0]).toHaveProperty('meaning');
    expect(body.examples).toHaveLength(2);
  });

  it('rejects haram words, long q and too many tokens', () => {
    expect(
      validateOrder(drinks, { q: 'Kopi with a beer', a: ['Kopi'] }),
    ).toBeNull();
    expect(
      validateOrder(nasi, {
        q: 'Nasi lemak with bacon',
        a: ['Nasi lemak satu'],
      }),
    ).toBeNull();
    expect(
      validateOrder(drinks, { q: 'x'.repeat(301), a: ['Kopi'] }),
    ).toBeNull();
    expect(validateOrder(drinks, { q: '', a: ['Kopi'] })).toBeNull();
    expect(
      validateOrder(drinks, {
        q: 'ok',
        a: [...drinks.chips].slice(0, drinks.slots.length + 1),
      }),
    ).toBeNull();
  });

  it('builds nasi stages from the authored flow for the same dish', () => {
    const src = nasi.prompts[0];
    // AI stages are ignored; the conversation comes from the lesson's own flow.
    const ok = validateOrder(nasi, {
      q: 'Basic set please',
      a: src.a,
      stages: [{ q: 'made up', a: ['Terima kasih'], chips: [] }],
    });
    expect(ok?.stages?.map((s) => s.q)).toEqual(src.stages!.map((s) => s.q));
    // Egg questions belong to nasi lemak only.
    expect(
      validateOrder(nasi, {
        q: 'Lontong with egg',
        a: ['Lontong satu', 'Tambah telur satu', 'Sambal biasa', 'Makan sini'],
      }),
    ).toBeNull();
    expect(buildRequest(nasi).vocabulary.length).toBeGreaterThan(0);
  });

  it('spells out every expected choice after a vague AI scenario', () => {
    const o = validateOrder(drinks, {
      q: 'You need an iced coffee to wake up.',
      a: ['Kopi', 'C', 'Siew Dai', 'Peng'],
    });
    expect(o?.q).toMatch(/evaporated milk/i);
    expect(o?.q).toMatch(/less sugar/i);
  });

  it('rejects answers out of slot order', () => {
    expect(
      validateOrder(drinks, {
        q: 'Iced',
        a: ['Kopi', 'O', 'Peng', 'Siew Dai'],
      }),
    ).toBeNull();
    expect(
      validateOrder(drinks, {
        q: 'Iced',
        a: ['Kopi', 'O', 'Siew Dai', 'Peng'],
      }),
    ).not.toBeNull();
  });

  it('falls back to authored prompts on timeout', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_u: string, init: RequestInit) =>
          new Promise((_r, rej) =>
            init.signal!.addEventListener('abort', () =>
              rej(new Error('aborted')),
            ),
          ),
      ),
    );
    const p = ordersFor(drinks, 4, URL);
    await vi.advanceTimersByTimeAsync(20000);
    const out = await p;
    expect(out).toHaveLength(4);
    expect(out.every((o) => !o.ai)).toBe(true);
  });
});

describe('wordingOk rejects scenarios that contradict the answer', () => {
  it('accepts every authored prompt', () => {
    for (const lv of LEVELS)
      for (const p of lv.prompts) expect(wordingOk(lv, p.q, p.a)).toBe(true);
  });
  it('drinks: hot or iced', () => {
    const iced = ['Kopi', 'Peng'];
    expect(wordingOk(drinks, 'Something warming, iced', iced)).toBe(false);
    expect(wordingOk(drinks, 'A hot coffee please', iced)).toBe(false);
    expect(wordingOk(drinks, 'A hot day, so iced coffee', iced)).toBe(true);
    expect(wordingOk(drinks, 'An iced coffee', ['Kopi'])).toBe(false);
  });
  it('drinks: sugar level', () => {
    expect(wordingOk(drinks, 'Coffee, no sugar', ['Kopi', 'Siew Dai'])).toBe(
      false,
    );
    expect(wordingOk(drinks, 'Coffee, less sugar', ['Kopi', 'Kosong'])).toBe(
      false,
    );
    expect(wordingOk(drinks, 'Coffee, extra sweet', ['Kopi'])).toBe(false);
    expect(wordingOk(drinks, 'Coffee, less sugar', ['Kopi', 'Ga Dai'])).toBe(
      false,
    );
  });
  it('drinks: milk, strength and the other drink', () => {
    expect(wordingOk(drinks, 'Coffee, no milk', ['Kopi'])).toBe(false);
    expect(wordingOk(drinks, 'Milky coffee', ['Kopi', 'O'])).toBe(false);
    expect(wordingOk(drinks, 'Coffee, condensed milk', ['Kopi', 'C'])).toBe(
      false,
    );
    expect(wordingOk(drinks, 'Coffee, evaporated milk', ['Kopi'])).toBe(false);
    expect(wordingOk(drinks, 'A strong coffee', ['Kopi'])).toBe(false);
    expect(wordingOk(drinks, 'A hot tea', ['Kopi'])).toBe(false);
  });
  it('noodles: dry or soup, chili, noodle type', () => {
    const a = ['Mee Pok', 'Dry', 'Chili'];
    expect(wordingOk(noodles, 'Mee pok in a bowl of soup', a)).toBe(false);
    expect(wordingOk(noodles, 'Mee pok tossed, soup on the side', a)).toBe(
      true,
    );
    expect(wordingOk(noodles, 'Mee pok tossed, hold the spice', a)).toBe(false);
    expect(
      wordingOk(noodles, 'Tossed dry, spicy', ['Mee Pok', 'Soup', 'Chili']),
    ).toBe(false);
    expect(
      wordingOk(noodles, 'In soup, spicy', ['Mee Pok', 'Soup', 'No Chili']),
    ).toBe(false);
    expect(
      wordingOk(noodles, 'Thin rice vermicelli, tossed dry, with chili', a),
    ).toBe(false);
  });
  it('nasi: dining, sambal, egg, chicken and dish', () => {
    const base = ['Nasi lemak satu', 'Sambal biasa', 'Makan sini'];
    expect(wordingOk(nasi, 'Nasi lemak to take away', base)).toBe(false);
    expect(
      wordingOk(nasi, 'Nasi lemak, eat here', [
        'Nasi lemak satu',
        'Sambal biasa',
        'Bungkus',
      ]),
    ).toBe(false);
    expect(wordingOk(nasi, 'Nasi lemak, sambal on the side', base)).toBe(false);
    expect(wordingOk(nasi, 'Nasi lemak, a little sambal', base)).toBe(false);
    expect(wordingOk(nasi, 'Nasi lemak, no sambal', base)).toBe(false);
    expect(wordingOk(nasi, 'Nasi lemak with an extra egg', base)).toBe(false);
    expect(wordingOk(nasi, 'Nasi lemak, no extra egg', base)).toBe(true);
    expect(
      wordingOk(nasi, 'Mee rebus with a mild sambal, eat here', [
        'Mee rebus satu',
        'Sambal sikit',
        'Makan sini',
      ]),
    ).toBe(false);
    expect(wordingOk(nasi, 'Nasi lemak with fried chicken', base)).toBe(false);
    expect(
      wordingOk(nasi, 'Nasi lemak, eat here', [
        'Nasi lemak satu',
        'Ayam goreng',
        'Sambal biasa',
        'Makan sini',
      ]),
    ).toBe(false);
    expect(
      wordingOk(nasi, 'One mee rebus, eat here', [
        'Lontong satu',
        'Sambal biasa',
        'Makan sini',
      ]),
    ).toBe(false);
  });
  it('rejects echoed metadata and hedges', () => {
    expect(wordingOk(drinks, 'For Mei (tag: friend), a coffee', ['Kopi'])).toBe(
      false,
    );
    expect(wordingOk(drinks, 'For Amir @amir, a coffee', ['Kopi'])).toBe(false);
    expect(
      wordingOk(nasi, 'Nasi lemak, maybe fried chicken, eat here', [
        'Nasi lemak satu',
        'Ayam goreng',
        'Sambal biasa',
        'Makan sini',
      ]),
    ).toBe(false);
  });
});
