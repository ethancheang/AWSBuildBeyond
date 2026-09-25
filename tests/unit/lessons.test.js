import { feedbackNotes } from '../../src/ui/feedback.js';
import { describe, expect, it } from 'vitest';
import { LEVELS, GLOSS, CATS } from '../../src/content/lessons.ts';
import { evaluate, nasiCheck } from '../../src/domain/evaluation.ts';

describe('original lesson coverage', () => {
  it('retains all three stalls and eighteen customers', () => {
    expect(LEVELS.map((level) => level.id)).toEqual([
      'drinks',
      'noodles',
      'nasi',
    ]);
    expect(LEVELS.map((level) => level.prompts.length)).toEqual([6, 6, 6]);
  });
  for (const level of LEVELS) {
    it(`${level.id}: every answer is available and has a glossary definition`, () => {
      for (const prompt of level.prompts) {
        for (const term of prompt.a) {
          expect(level.chips).toContain(term);
          expect(GLOSS[term].short).toBeTruthy();
          expect(CATS[GLOSS[term].cat]).toBeDefined();
        }
        if (level.kind === 'nasi') {
          for (const stage of prompt.stages) {
            expect(nasiCheck(stage.a, stage.a)).toBe(true);
            expect(stage.a.every((term) => stage.chips.includes(term))).toBe(
              true,
            );
          }
        } else {
          expect(evaluate(prompt.a, prompt.a).type).toBe('perfect');
        }
      }
    });
  }
});

describe('ordering feedback', () => {
  const drinks = LEVELS[0];
  it('accepts reordered words with guidance but no perfect score', () => {
    expect(evaluate(['Peng', 'O', 'Kopi'], ['Kopi', 'O', 'Peng']).type).toBe(
      'order',
    );
  });
  it('explains missing words and unwanted defaults', () => {
    expect(feedbackNotes(['Kopi'], ['Kopi', 'O'], drinks).join(' ')).toContain(
      'Missing',
    );
    expect(feedbackNotes(['Kopi', 'O'], ['Kopi'], drinks).join(' ')).toContain(
      'Not needed',
    );
  });
  it('rejects drink-only words at the noodle stall', () => {
    const result = evaluate(
      ['Mee Pok', 'Dry', 'Chili', 'Peng'],
      ['Mee Pok', 'Dry', 'Chili'],
    );
    expect(result.type).toBe('wrong');
    expect(
      feedbackNotes(
        ['Mee Pok', 'Dry', 'Chili', 'Peng'],
        ['Mee Pok', 'Dry', 'Chili'],
        LEVELS[1],
      ).join(' '),
    ).toContain('drink lingo');
  });
  it('accepts Malay word-order variants and optional greetings', () => {
    expect(
      nasiCheck(['Kak', 'Saya nak', 'Satu nasi lemak'], ['Nasi lemak satu']),
    ).toBe(true);
    expect(
      nasiCheck(
        ['Ayam goreng', 'Nasi lemak satu'],
        ['Nasi lemak satu', 'Ayam goreng'],
      ),
    ).toBe(true);
  });
  it('rejects greeting-only, duplicated and wrong Malay choices', () => {
    expect(nasiCheck(['Kak'], ['Nasi lemak satu'])).toBe(false);
    expect(
      nasiCheck(['Satu nasi lemak', 'Nasi lemak satu'], ['Nasi lemak satu']),
    ).toBe(false);
    expect(nasiCheck(['Sambal sikit'], ['Sambal asing'])).toBe(false);
  });
});
