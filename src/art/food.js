import { uid } from '../shared/dom.js';
import { GLOSS } from '../content/lessons.js';
function nasiSVG(tokens) {
  const has = (t) => tokens.includes(t),
    packed = has('Bungkus'),
    sep = has('Sambal asing');
  const egg = (x, y) =>
    `<ellipse cx="${x}" cy="${y}" rx="15" ry="11" fill="#fff8df" stroke="#806b41"/><circle cx="${x}" cy="${y}" r="6" fill="#ffca36"/>`;
  return `<svg viewBox="0 0 220 170" aria-hidden="true">
 ${packed ? '<rect x="12" y="25" width="180" height="127" rx="10" fill="#c69b65" stroke="#322c22" stroke-width="3"/>' : '<ellipse cx="104" cy="91" rx="98" ry="65" fill="#fff5dd" stroke="#322c22" stroke-width="3"/>'}
 <path d="M26 55Q105 33 180 58L170 127Q99 149 27 121Z" fill="#3f8850"/>
 <path d="M53 106Q49 57 95 53Q133 58 135 107Z" fill="#fff8e2" stroke="#d8d0ad" stroke-width="2"/>
 ${egg(49, 115)}${has('Tambah telur satu') ? egg(92, 128) : ''}
 <g fill="#a1c962" stroke="#37754b" stroke-width="2"><circle cx="151" cy="114" r="12"/><circle cx="164" cy="105" r="12"/></g>
 <g fill="#a87332"><ellipse cx="37" cy="77" rx="5" ry="3"/><ellipse cx="39" cy="88" rx="5" ry="3"/><ellipse cx="29" cy="84" rx="5" ry="3"/></g>
 <path d="M35 99l13 -4m-16 8l14 -3" stroke="#815228" stroke-width="3"/>
 ${has('Ayam goreng') ? '<path d="M112 72Q113 41 143 47Q166 53 147 79L131 88Z" fill="#b7692a" stroke="#6e3e20" stroke-width="3"/>' : ''}
 ${sep ? '<rect x="178" y="117" width="35" height="29" rx="7" fill="#fff4d4" stroke="#322c22"/><ellipse cx="195" cy="131" rx="13" ry="9" fill="#b83123"/>' : has('Tak nak sambal') ? '' : has('Sambal sikit') ? '<ellipse cx="160" cy="80" rx="7" ry="5" fill="#b83123"/>' : has('Sambal biasa') ? '<ellipse cx="160" cy="80" rx="17" ry="11" fill="#b83123"/>' : ''}
 </svg>`;
}
function drinkParts(tokens) {
  return {
    base: tokens.find((t) => t === 'Kopi' || t === 'Teh'),
    milk: tokens.find((t) => t === 'O' || t === 'C'),
    sugar: tokens.find(
      (t) => t === 'Siew Dai' || t === 'Kosong' || t === 'Ga Dai',
    ),
    peng: tokens.includes('Peng'),
  };
}
function drinkSVG(tokens) {
  const id = uid(),
    { base, milk, peng } = drinkParts(tokens);
  const COL = {
    Kopi: { O: '#3a2214', C: '#8e5f39', _: '#a47248' },
    Teh: { O: '#a14d17', C: '#c8864f', _: '#d29a66' },
  };
  const col = base ? COL[base][milk || '_'] : null;
  let s = '';
  if (peng) {
    const glass = 'M34 20 L86 20 L80 104 Q60 110 40 104 Z';
    s += `<ellipse cx="60" cy="108" rx="30" ry="5" fill="rgba(0,0,0,.14)"/>`;
    s += `<defs><clipPath id="${id}"><path d="${glass}"/></clipPath></defs><g clip-path="url(#${id})">`;
    if (col) {
      s += `<rect x="20" y="30" width="80" height="90" fill="${col}"/>`;
      if (!milk)
        s += `<path d="M20 92 Q40 86 60 92 T100 92 V120 H20Z" fill="#f4e6c8" opacity=".9"/>`;
      if (milk === 'C')
        s += `<path d="M46 48 q12 12 0 24 q-12 12 4 24" stroke="#fff" stroke-width="5" fill="none" opacity=".45" stroke-linecap="round"/>`;
    }
    s += [
      [40, 32, -12],
      [60, 42, 10],
      [44, 58, 4],
      [64, 64, -8],
    ]
      .map(
        ([x, y, r]) =>
          `<rect x="${x}" y="${y}" width="17" height="17" rx="4" transform="rotate(${r} ${x + 8} ${y + 8})" fill="rgba(255,255,255,.55)" stroke="rgba(255,255,255,.95)" stroke-width="1.5"/>`,
      )
      .join('');
    s += `</g><path d="M68 4 L60 72" stroke="#e04b3a" stroke-width="5" stroke-linecap="round"/>`;
    s += `<path d="${glass}" fill="rgba(190,225,255,.22)" stroke="#1e2a24" stroke-width="2.5" stroke-linejoin="round"/>`;
    s += `<path d="M40 28 L38 92" stroke="#fff" stroke-width="3" opacity=".6" stroke-linecap="round"/>`;
  } else {
    s += `<ellipse cx="60" cy="102" rx="46" ry="11" fill="#fbf7ee" stroke="#1e2a24" stroke-width="2.5"/><ellipse cx="60" cy="100" rx="30" ry="6" fill="#e6dcc6"/>`;
    s += `<path d="M92 54 q22 0 16 20 q-5 12 -20 9" fill="none" stroke="#1e2a24" stroke-width="8" stroke-linecap="round"/><path d="M92 54 q22 0 16 20 q-5 12 -20 9" fill="none" stroke="#fbf7ee" stroke-width="3.5" stroke-linecap="round"/>`;
    s += `<path d="M25 46 Q27 98 60 99 Q93 98 95 46 Z" fill="#fbf7ee" stroke="#1e2a24" stroke-width="2.5" stroke-linejoin="round"/>`;
    s += `<path d="M29 64 Q60 76 91 64" stroke="#2f8f5b" stroke-width="3" fill="none"/>`;
    s += [
      [40, 68],
      [60, 71],
      [80, 68],
    ]
      .map(
        ([x, y]) =>
          `<circle cx="${x}" cy="${y}" r="3.4" fill="#e04b3a"/><circle cx="${x}" cy="${y}" r="1.2" fill="#ffc93c"/>`,
      )
      .join('');
    s += `<ellipse cx="60" cy="46" rx="35" ry="9" fill="#fbf7ee" stroke="#1e2a24" stroke-width="2.5"/>`;
    if (col) {
      s += `<ellipse cx="60" cy="47" rx="30" ry="6.5" fill="${col}"/><ellipse cx="54" cy="46" rx="12" ry="2.5" fill="#fff" opacity="${milk === 'O' ? 0.15 : 0.4}"/>`;
      s += `<g class="steam" stroke="#9aa3ab" stroke-width="3" fill="none" stroke-linecap="round"><path d="M50 34 q-6 -8 0 -15 q6 -8 0 -15"/><path d="M68 34 q-6 -8 0 -15 q6 -8 0 -15"/></g>`;
    }
  }
  if (!base)
    s += `<text x="60" y="${peng ? 74 : 54}" text-anchor="middle" font-size="24" font-weight="900" fill="#9d917a" font-family="system-ui,sans-serif">?</text>`;
  return `<svg viewBox="0 0 120 120" aria-hidden="true">${s}</svg>`;
}
function drinkInfo(tokens) {
  const { base, milk, sugar, peng } = drinkParts(tokens);
  if (!base) return { cap: 'Start with the drink: Kopi or Teh', sweet: null };
  const parts = [
    base === 'Kopi' ? 'Coffee' : 'Tea',
    milk === 'O'
      ? 'no milk'
      : milk === 'C'
        ? 'evaporated milk'
        : 'condensed milk',
    sugar === 'Siew Dai'
      ? 'less sugar'
      : sugar === 'Kosong'
        ? 'no sugar'
        : sugar === 'Ga Dai'
          ? 'extra sugar'
          : 'normal sugar',
    peng ? 'iced' : 'hot',
  ];
  return {
    cap: parts.join(', '),
    sweet:
      sugar === 'Kosong'
        ? 0
        : sugar === 'Siew Dai'
          ? 1
          : sugar === 'Ga Dai'
            ? 3
            : 2,
  };
}

const NOODLE = {
  'Mee Pok': { n: 6, w: 4.5, c: '#efbd42', o: '#b98a1c', amp: 3, step: 12 },
  'Mee Kia': { n: 10, w: 2, c: '#f3c64f', o: '#c79a24', amp: 3.5, step: 6 },
  'Hor Fun': { n: 4, w: 8, c: '#fbf8f0', o: '#c9bfa9', amp: 2, step: 16 },
  'Bee Hoon': { n: 16, w: 1.1, c: '#fbf8f0', o: '#cfc5ae', amp: 2.5, step: 5 },
};
function strands(type, cx, cy, rx, ry) {
  const N = NOODLE[type];
  let out = '';
  for (let k = 0; k < N.n; k++) {
    const y =
      cy - ry + (k + 0.5) * ((2 * ry) / N.n) + (((k * 37) % 7) - 3) * 0.3;
    let x = cx - rx - 6,
      up = k % 2 ? 1 : -1,
      d = `M${x} ${y.toFixed(1)}`;
    while (x < cx + rx + 6) {
      const nx = x + N.step;
      d += ` Q${(x + N.step / 2).toFixed(1)} ${(y + up * N.amp * 2).toFixed(1)} ${nx.toFixed(1)} ${y.toFixed(1)}`;
      x = nx;
      up *= -1;
    }
    out += `<path d="${d}" stroke="${N.o}" stroke-width="${N.w + 1.6}" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${N.c}" stroke-width="${N.w}" fill="none" stroke-linecap="round"/>`;
  }
  return out;
}
function noodleParts(tokens) {
  return {
    nd: tokens.find((t) => NOODLE[t]),
    dry: tokens.includes('Dry'),
    soup: tokens.includes('Soup'),
    chili: tokens.includes('Chili'),
    noChili: tokens.includes('No Chili'),
  };
}
function noodleSVG(tokens) {
  const id = uid(),
    { nd, dry, soup, chili } = noodleParts(tokens);
  const balls = (pts) =>
    pts
      .map(
        ([x, y, r]) =>
          `<circle cx="${x}" cy="${y}" r="${r}" fill="#fffdf6" stroke="#bfb293" stroke-width="1.2"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.3}" fill="#fff"/>`,
      )
      .join('');
  const greens = (pts) =>
    pts
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.9" fill="#3aa35b"/>`)
      .join('');
  let s = '';
  if (dry) {
    s += `<path d="M78 42 Q80 62 96 62 Q112 62 114 42Z" fill="#fbf7ee" stroke="#1e2a24" stroke-width="2"/><ellipse cx="96" cy="42" rx="18" ry="6" fill="#fbf7ee" stroke="#1e2a24" stroke-width="2"/>`;
    s += `<ellipse cx="96" cy="42" rx="15" ry="4.5" fill="#f2d38f"/>${balls([
      [91, 41, 3.5],
      [100, 42, 3.5],
    ])}`;
    s += `<ellipse cx="54" cy="85" rx="48" ry="20" fill="rgba(0,0,0,.12)"/><ellipse cx="54" cy="80" rx="48" ry="20" fill="#fbf7ee" stroke="#1e2a24" stroke-width="2.5"/>`;
    s += `<ellipse cx="54" cy="80" rx="41" ry="15.5" fill="none" stroke="#2e86de" stroke-width="2" opacity=".6"/>`;
    if (nd) {
      s += `<defs><clipPath id="${id}"><ellipse cx="54" cy="78" rx="33" ry="12"/></clipPath></defs><g clip-path="url(#${id})">`;
      s += `<ellipse cx="54" cy="78" rx="33" ry="12" fill="#8a5a33" opacity=".35"/>${strands(nd, 54, 78, 33, 12)}`;
      if (chili)
        s +=
          `<ellipse cx="54" cy="78" rx="33" ry="12" fill="#e2542a" opacity=".4"/>` +
          [
            [42, 74],
            [58, 82],
            [66, 75],
            [50, 80],
            [70, 81],
            [36, 79],
          ]
            .map(
              ([x, y]) =>
                `<circle cx="${x}" cy="${y}" r="1.7" fill="#a51d0b"/>`,
            )
            .join('');
      s += `</g>${greens([
        [46, 74],
        [60, 80],
        [52, 84],
        [64, 73],
      ])}`;
    }
  } else {
    s += `<ellipse cx="60" cy="104" rx="36" ry="6" fill="rgba(0,0,0,.14)"/>`;
    s += `<path d="M14 54 Q18 104 60 104 Q102 104 106 54 Z" fill="#fbf7ee" stroke="#1e2a24" stroke-width="2.5" stroke-linejoin="round"/>`;
    s += `<path d="M19 72 Q60 88 101 72" stroke="#e04b3a" stroke-width="3" fill="none"/><path d="M22 79 Q60 94 98 79" stroke="#e04b3a" stroke-width="1.5" fill="none"/>`;
    s += `<ellipse cx="60" cy="54" rx="46" ry="13" fill="#fbf7ee" stroke="#1e2a24" stroke-width="2.5"/>`;
    s += `<ellipse cx="60" cy="55" rx="41" ry="10.5" fill="${soup ? '#f2d38f' : '#e8dfcb'}"/>`;
    if (nd) {
      s += `<defs><clipPath id="${id}"><ellipse cx="60" cy="55" rx="41" ry="10.5"/></clipPath></defs><g clip-path="url(#${id})">${strands(nd, 60, 55, 41, 10.5)}`;
      if (soup)
        s += `<ellipse cx="60" cy="55" rx="41" ry="10.5" fill="#f2d38f" opacity=".4"/>`;
      s += `</g>`;
    }
    if (soup) {
      s +=
        balls([
          [44, 53, 5],
          [58, 57, 5],
          [73, 52, 5],
        ]) +
        greens([
          [51, 50],
          [66, 58],
          [82, 55],
          [37, 57],
        ]);
      if (chili)
        s +=
          [
            [48, 59],
            [79, 57],
            [64, 50],
            [33, 54],
          ]
            .map(
              ([x, y]) =>
                `<circle cx="${x}" cy="${y}" r="2.3" fill="#e2542a"/>`,
            )
            .join('') +
          `<ellipse cx="102" cy="104" rx="13" ry="5" fill="#fbf7ee" stroke="#1e2a24" stroke-width="2"/><ellipse cx="102" cy="103" rx="8" ry="2.8" fill="#d8341c"/>`;
    }
  }
  if (!nd)
    s += `<text x="${dry ? 54 : 60}" y="${dry ? 86 : 62}" text-anchor="middle" font-size="22" font-weight="900" fill="#9d917a" font-family="system-ui,sans-serif">?</text>`;
  return `<svg viewBox="0 0 120 120" aria-hidden="true">${s}</svg>`;
}
function noodleInfo(tokens) {
  const { nd, dry, soup, chili, noChili } = noodleParts(tokens);
  if (!nd && !dry && !soup)
    return { cap: 'Start with the noodle', sweet: null };
  const parts = [
    nd ? GLOSS[nd].short : 'which noodle?',
    dry ? 'dry, soup on the side' : soup ? 'in soup' : 'dry or soup?',
    chili ? 'with chili' : noChili ? 'no chili' : 'chili or not?',
  ];
  return { cap: parts.join(', '), sweet: null };
}
const artFor = (lv, tokens) =>
  lv.kind === 'nasi'
    ? nasiSVG(tokens)
    : lv.kind === 'drink'
      ? drinkSVG(tokens)
      : noodleSVG(tokens);
const infoFor = (lv, tokens) =>
  lv.kind === 'nasi'
    ? {
        cap:
          tokens
            .filter((t) => GLOSS[t] && GLOSS[t].cat !== 'polite')
            .map((t) => GLOSS[t].short)
            .join(' · ') || 'Build your nasi lemak meal',
        sweet: null,
      }
    : lv.kind === 'drink'
      ? drinkInfo(tokens)
      : noodleInfo(tokens);

export { drinkSVG, noodleSVG, nasiSVG, artFor, infoFor };
