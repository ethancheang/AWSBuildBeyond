import { describe, expect, it } from 'vitest';
import {
  addTopic,
  canAutoEncounter,
  escapeHTML,
  fresh,
  historyFor,
  parseEncounter,
  practise,
  transition,
  validateReply,
  withOpening,
  OPENING,
} from '../../src/agents/officeWorker';
import {
  MARCUS_APPROACH,
  MARCUS_SPOT,
  MARCUS_START,
  MARCUS_TABLE,
  TRIGGER_RADIUS,
} from '../../src/world/officeWorker';
import { findPath, isWalkable, OBSTACLES, SPAWN } from '../../src/world/layout';
import {
  cleanMarcus,
  marcusMessages,
  validateMarcus,
} from '../../aws/ai-orders/index.mjs';

describe('Marcus memory', () => {
  it('follows the encounter state machine', () => {
    let e = fresh();
    expect(canAutoEncounter(e)).toBe(true);
    e = transition(e, 'open');
    expect(e.status).toBe('met');
    expect(canAutoEncounter(e)).toBe(false);
    expect(transition(e, 'decline').status).toBe('dismissed');
    expect(transition(transition(e, 'decline'), 'revisit').status).toBe('met');
    e = transition(e, 'save');
    expect(e.status).toBe('completed');
    expect(transition(e, 'revisit').status).toBe('completed');
    expect(transition(e, 'decline').status).toBe('completed');
    expect(transition(e, 'save').status).toBe('completed');
    expect(transition(e, 'clear')).toEqual(fresh());
  });
  it('dedupes topics, ignores none and keeps topics on practice', () => {
    let e = withOpening(transition(fresh(), 'open'));
    expect(e.turns[0]).toEqual({
      role: 'assistant',
      text: OPENING,
      source: 'scripted',
    });
    e = addTopic(addTopic(addTopic(e, 'chope'), 'chope'), 'none');
    expect(e.topics).toEqual(['chope']);
    const again = practise(e);
    expect(again.turns).toEqual([]);
    expect(again.topics).toEqual(['chope']);
  });
  it('parses stored data defensively', () => {
    expect(parseEncounter('nonsense')).toEqual(fresh());
    expect(parseEncounter('{"status":"hacked"}')).toEqual(fresh());
    const e = parseEncounter(
      JSON.stringify({
        status: 'completed',
        turns: [{ role: 'system', text: 'x', source: 'ai' }],
        topics: ['chope', 'chope', 'bogus'],
      }),
    );
    expect(e).toEqual({ status: 'completed', turns: [], topics: ['chope'] });
  });
  it('escapes HTML', () => {
    expect(escapeHTML(`<img src=x onerror="a">'&`)).toBe(
      '&lt;img src=x onerror=&quot;a&quot;&gt;&#39;&amp;',
    );
  });
});

describe('Marcus live dialogue validation', () => {
  const turns = Array.from({ length: 30 }, (_, i) => ({
    role: i % 2 ? 'user' : 'assistant',
    text: 'x'.repeat(900),
    source: 'scripted',
  }));
  it('bounds browser history to the server limits', () => {
    const h = historyFor(turns.slice(0, 29));
    expect(h).toHaveLength(23);
    expect(h.at(-1).role).toBe('assistant');
    expect(h.every((t) => t.text.length === 800)).toBe(true);
    expect(validateMarcus({ message: 'Hi', history: h })).toBeNull();
  });
  it('rejects bad requests', () => {
    const ok = [{ role: 'assistant', text: 'Hi' }];
    expect(validateMarcus({ message: '', history: ok })).toMatch(/message/);
    expect(validateMarcus({ message: 'x'.repeat(501), history: ok })).toMatch(
      /message/,
    );
    expect(
      validateMarcus({
        message: 'Hi',
        history: [{ role: 'system', text: 'x' }],
      }),
    ).toMatch(/roles/);
    expect(
      validateMarcus({
        message: 'Hi',
        history: [...ok, { role: 'assistant', text: 'again' }],
      }),
    ).toMatch(/alternate/);
    expect(
      validateMarcus({ message: 'Hi', history: [{ role: 'user', text: 'x' }] }),
    ).toMatch(/end with/);
    expect(
      validateMarcus({
        message: 'Hi',
        history: Array.from({ length: 24 }, (_, i) => ({
          role: i % 2 ? 'assistant' : 'user',
          text: 'x',
        })),
      }),
    ).toMatch(/23/);
    expect(
      validateMarcus({
        message: 'Hi',
        history: [{ role: 'assistant', text: 'x'.repeat(801) }],
      }),
    ).toMatch(/800/);
  });
  it('adds the trusted prompt and a scene-setting user turn', () => {
    const m = marcusMessages({
      message: ' Can I sit? ',
      history: [{ role: 'assistant', text: 'Hi' }],
    });
    expect(m.map((x) => x.role)).toEqual([
      'system',
      'user',
      'assistant',
      'user',
    ]);
    expect(m[0].content).toMatch(/never a legal right/);
    expect(m.at(-1).content).toBe('Can I sit?');
  });
  it('validates model and endpoint replies', () => {
    const out = (content) => ({ choices: [{ message: { content } }] });
    expect(cleanMarcus(out('{"reply":" Can! ","action":"sharing"}'))).toEqual({
      reply: 'Can!',
      action: 'sharing',
    });
    expect(cleanMarcus(out('{"reply":"x","action":"move"}'))).toBeNull();
    expect(cleanMarcus(out('not json'))).toBeNull();
    expect(validateReply({ reply: 'Hi', action: 'chope' })).toEqual({
      reply: 'Hi',
      action: 'chope',
    });
    expect(validateReply({ reply: 'Hi' })).toEqual({
      reply: 'Hi',
      action: 'none',
    });
    expect(validateReply({ reply: '', action: 'none' })).toBeNull();
    expect(validateReply({ reply: 'x'.repeat(801) })).toBeNull();
    expect(validateReply({ reply: 'Hi', action: 'reserve' })).toBeNull();
  });
});

describe('Marcus placement', () => {
  it('uses walkable points outside the table collision', () => {
    for (const p of [MARCUS_START, MARCUS_SPOT, MARCUS_APPROACH])
      expect(isWalkable(p)).toBe(true);
    const table = OBSTACLES.find(
      (o) => o.x === MARCUS_TABLE.x && o.z === MARCUS_TABLE.z,
    );
    expect(
      Math.hypot(MARCUS_SPOT.x - table.x, MARCUS_SPOT.z - table.z),
    ).toBeGreaterThan(table.radius);
  });
  it('is reachable for Marcus and the player', () => {
    expect(findPath(MARCUS_START, MARCUS_SPOT).length).toBeGreaterThan(0);
    expect(findPath(SPAWN, MARCUS_APPROACH).length).toBeGreaterThan(0);
  });
  it('triggers near the table but not at spawn', () => {
    const d = (p) => Math.hypot(p.x - MARCUS_TABLE.x, p.z - MARCUS_TABLE.z);
    expect(d(MARCUS_APPROACH)).toBeLessThan(TRIGGER_RADIUS);
    expect(d(SPAWN)).toBeGreaterThan(TRIGGER_RADIUS);
  });
});
