import { describe, expect, it, vi, afterEach } from 'vitest';
import { parseProgress, readProgress, persist } from '../../src/state/progress';
import { lessonStars, scoreOrder } from '../../src/domain/scoring';

afterEach(() => vi.unstubAllGlobals());
describe('progress compatibility and resilience', () => {
  it('preserves valid original saves and the sound preference', () => {
    const original = {
      levels: { drinks: { done: true, stars: 2, best: 540 } },
      sound: false,
    };
    expect(parseProgress(JSON.stringify(original))).toEqual(original);
  });
  it('recovers from corrupt or unexpected storage shapes', () => {
    for (const value of [null, '{', 'null', '[]', '"bad"', '{"levels":true}']) {
      expect(parseProgress(value)).toEqual({ levels: {}, sound: true });
    }
  });
  it('bounds scores, rejects invalid types and drops unknown lesson IDs', () => {
    expect(
      parseProgress(
        JSON.stringify({
          levels: {
            drinks: { done: 'yes', stars: 99, best: -5 },
            noodles: { done: true, stars: '3', best: 9999 },
            injected: { done: true },
          },
          sound: 'yes',
        }),
      ),
    ).toEqual({
      levels: {
        drinks: { done: false, stars: 3, best: 0 },
        noodles: { done: true, stars: 0, best: 600 },
      },
      sound: true,
    });
  });
  it('works in memory when the browser denies local storage', () => {
    vi.stubGlobal('localStorage', {
      getItem() {
        throw new Error('Denied');
      },
      setItem() {
        throw new Error('Denied');
      },
    });
    expect(readProgress()).toEqual({ levels: {}, sound: true });
    expect(persist()).toBe(false);
  });
});
describe('original score rules', () => {
  it('awards 100 for perfect, 60 for assisted/reordered and 40 for retry', () => {
    expect(scoreOrder(0, false)).toEqual({ star: true, points: 100 });
    expect(scoreOrder(0, true)).toEqual({ star: false, points: 60 });
    expect(scoreOrder(0, false, false)).toEqual({ star: false, points: 60 });
    expect(scoreOrder(1, false)).toEqual({ star: false, points: 40 });
    expect(scoreOrder(2, true)).toEqual({ star: false, points: 40 });
  });
  it('keeps the original six-customer star thresholds', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((n) => lessonStars(n, 6))).toEqual([
      1, 1, 1, 1, 2, 2, 3,
    ]);
  });
});
