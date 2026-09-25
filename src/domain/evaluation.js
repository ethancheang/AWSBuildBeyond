import { GLOSS, CATS } from '../content/lessons.js';
import { tag } from '../ui/format.js';
function nasiCheck(tokens, expected) {
  const norm = (ts) =>
    ts
      .filter((t) => !['Kak', 'Saya nak'].includes(t))
      .map((t) => (t === 'Satu nasi lemak' ? 'Nasi lemak satu' : t));
  const actual = norm(tokens),
    answer = norm(expected);
  return (
    actual.length === answer.length &&
    new Set(actual).size === actual.length &&
    answer.every((t) => actual.includes(t))
  );
}
function evaluate(tokens, answer, lv) {
  if (
    tokens.length === answer.length &&
    tokens.every((t, i) => t === answer[i])
  )
    return { type: 'perfect' };
  if (
    tokens.length === answer.length &&
    answer.every((a) => tokens.includes(a))
  )
    return { type: 'order' };
  const catOf = (t) =>
    lv.slots.includes(GLOSS[t].cat) ? GLOSS[t].cat : 'stray';
  const low = (t) =>
    GLOSS[t].short.charAt(0).toLowerCase() + GLOSS[t].short.slice(1);
  const notes = [];
  for (const c of lv.slots) {
    const exp = answer.find((a) => catOf(a) === c);
    const got = tokens.filter((t) => catOf(t) === c);
    const wrong = got.filter((t) => t !== exp);
    if (exp && !got.includes(exp)) {
      if (wrong.length)
        wrong.forEach((w) =>
          notes.push(
            `You said ${tag(w)}, which means <b>${low(w)}</b>. This customer wanted ${tag(exp)}: <b>${low(exp)}</b>.`,
          ),
        );
      else
        notes.push(
          `Missing ${tag(exp)}, which means <b>${low(exp)}</b>. The customer asked for that.`,
        );
    } else if (wrong.length) {
      wrong.forEach((w) =>
        notes.push(
          exp
            ? `${tag(w)} means <b>${low(w)}</b>, but they only wanted ${tag(exp)} (${low(exp)}). One ${CATS[c].label.toLowerCase()} word per order.`
            : `${tag(w)} means <b>${low(w)}</b>. Not needed here: ${lv.none[c] || 'the customer didn’t ask for it'}.`,
        ),
      );
    }
  }
  tokens
    .filter((t) => catOf(t) === 'stray')
    .forEach((w) =>
      notes.push(GLOSS[w].stray || `${tag(w)} doesn’t belong in this order.`),
    );
  return { type: 'wrong', notes };
}

export { evaluate, nasiCheck };
