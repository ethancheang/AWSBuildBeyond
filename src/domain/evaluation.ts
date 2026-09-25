export type Evaluation = { type: 'perfect' | 'order' | 'wrong' };

/** Compare food words independently of the DOM or presentation markup. */
export function evaluate(tokens: string[], answer: string[]): Evaluation {
  if (
    tokens.length === answer.length &&
    tokens.every((token, i) => token === answer[i])
  )
    return { type: 'perfect' };
  if (
    tokens.length === answer.length &&
    answer.every((token) => tokens.includes(token))
  )
    return { type: 'order' };
  return { type: 'wrong' };
}

/** Malay greetings are optional; both supported orders of “one nasi lemak” count. */
export function nasiCheck(tokens: string[], expected: string[]): boolean {
  const normalize = (terms: string[]) =>
    terms
      .filter((term) => !['Kak', 'Saya nak'].includes(term))
      .map((term) => (term === 'Satu nasi lemak' ? 'Nasi lemak satu' : term));
  const actual = normalize(tokens),
    answer = normalize(expected);
  return (
    actual.length === answer.length &&
    new Set(actual).size === actual.length &&
    answer.every((term) => actual.includes(term))
  );
}
