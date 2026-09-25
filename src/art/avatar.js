function avatarInner(o) {
  const skin = o.skin || '#f1c7a1',
    hair = o.hair || '#2a211b',
    shirt = o.shirt || '#2e86de';
  let s = '';
  if (o.singlet) {
    s += `<path d="M12 100 Q14 72 50 70 Q86 72 88 100Z" fill="${skin}" stroke="#1e2a24" stroke-width="2.5"/>`;
    s += `<path d="M30 100 L33 76 Q50 86 67 76 L70 100Z" fill="#fff" stroke="#1e2a24" stroke-width="2.5"/>`;
  } else {
    s += `<path d="M12 100 Q14 72 50 70 Q86 72 88 100Z" fill="${shirt}" stroke="#1e2a24" stroke-width="2.5"/>`;
  }
  if (o.tie)
    s += `<path d="M50 74 L45 80 L50 100 L55 80Z" fill="${o.tie}" stroke="#1e2a24" stroke-width="1.5"/>`;
  if (o.apron)
    s += `<path d="M32 100 L35 80 L65 80 L68 100Z" fill="${o.apron}" stroke="#1e2a24" stroke-width="2"/><path d="M35 80 L40 72 M65 80 L60 72" stroke="${o.apron}" stroke-width="3"/>`;
  s += `<rect x="43" y="58" width="14" height="14" fill="${skin}"/>`;
  if (o.style === 'long')
    s += `<path d="M25 40 Q21 74 33 78 L67 78 Q79 74 75 40Z" fill="${hair}"/>`;
  if (o.style === 'ponytail')
    s += `<path d="M72 30 Q90 38 82 64 Q78 50 70 42Z" fill="${hair}"/>`;
  if (o.style === 'bun')
    s += `<circle cx="50" cy="15" r="10" fill="${hair}" stroke="#1e2a24" stroke-width="2"/>`;
  s += `<ellipse cx="28" cy="43" rx="4" ry="6" fill="${skin}" stroke="#1e2a24" stroke-width="2"/><ellipse cx="72" cy="43" rx="4" ry="6" fill="${skin}" stroke="#1e2a24" stroke-width="2"/>`;
  s += `<ellipse cx="50" cy="40" rx="22" ry="24" fill="${skin}" stroke="#1e2a24" stroke-width="2.5"/>`;
  switch (o.style) {
    case 'short':
      s += `<path d="M28 37 Q27 14 50 14 Q74 14 72 37 Q66 24 50 23 Q36 24 28 37Z" fill="${hair}"/>`;
      break;
    case 'bald':
      s += `<path d="M29 46 Q27 34 32 28" stroke="${hair}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M71 46 Q73 34 68 28" stroke="${hair}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
      break;
    case 'fringe':
      s += `<path d="M27 38 Q26 13 50 14 Q75 13 73 38 L67 29 L59 34 L51 27 L42 34 L34 29Z" fill="${hair}"/>`;
      break;
    case 'cap':
      s += `<path d="M28 40 Q27 30 30 26 L70 26 Q73 30 72 40 Q70 32 50 32 Q30 32 28 40Z" fill="${hair}"/>`;
      s += `<path d="M27 30 Q28 12 50 12 Q72 12 73 30Z" fill="${o.cap}" stroke="#1e2a24" stroke-width="2"/><path d="M48 28 Q76 25 84 31 Q70 34 48 32Z" fill="${o.cap}" stroke="#1e2a24" stroke-width="2"/>`;
      break;
    default:
      s += `<path d="M27 41 Q25 14 50 15 Q75 14 73 41 Q70 26 57 22 Q44 31 27 41Z" fill="${hair}"/>`;
  }
  if (o.visor)
    s += `<path d="M28 30 Q50 22 72 30 L72 35 Q50 27 28 35Z" fill="${o.visor}" stroke="#1e2a24" stroke-width="2"/>`;
  s += `<circle cx="42" cy="43" r="2.7" fill="#1e2a24"/><circle cx="58" cy="43" r="2.7" fill="#1e2a24"/>`;
  if (o.glasses)
    s += `<g fill="none" stroke="#1e2a24" stroke-width="2"><circle cx="42" cy="43" r="6.5"/><circle cx="58" cy="43" r="6.5"/><path d="M48.5 43h3"/></g>`;
  s += `<circle cx="35" cy="51" r="3.5" fill="#f28b82" opacity=".45"/><circle cx="65" cy="51" r="3.5" fill="#f28b82" opacity=".45"/>`;
  if (o.mustache)
    s += `<path d="M42 52 Q50 48 58 52 Q50 55 42 52Z" fill="${hair}"/>`;
  s += `<path d="M44 54 Q50 59 56 54" fill="none" stroke="#1e2a24" stroke-width="2.2" stroke-linecap="round"/>`;
  if (o.towel)
    s += `<path d="M22 74 Q32 70 38 74 L34 100 L24 100 Q28 86 20 80Z" fill="#fff" stroke="#1e2a24" stroke-width="2"/><path d="M25 84 L34 86 M24 90 L33 92" stroke="#2e86de" stroke-width="2"/>`;
  return s;
}
const avatarSVG = (o) =>
  `<svg viewBox="0 0 100 100" aria-hidden="true">${avatarInner(o)}</svg>`;

export { avatarInner, avatarSVG };
