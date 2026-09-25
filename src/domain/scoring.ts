export function scoreOrder(
  tries: number,
  hinted: boolean,
  correctOrder = true,
) {
  const star = tries === 0 && !hinted && correctOrder;
  return { star, points: tries > 0 ? 40 : star ? 100 : 60 };
}

export function lessonStars(perfect: number, total: number): number {
  return perfect === total ? 3 : perfect >= total - 2 ? 2 : 1;
}
