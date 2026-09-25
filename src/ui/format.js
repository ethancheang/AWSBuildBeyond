import { CATS, GLOSS } from '../content/lessons.js';
const catColor = (t) => CATS[GLOSS[t].cat].color;
const tag = (t) => `<span class="mini" style="--cc:${catColor(t)}">${t}</span>`;
const phrase = (tokens) => tokens.join(' ');
const starsHTML = (n) =>
  [0, 1, 2].map((i) => `<span class="${i < n ? 'on' : ''}">★</span>`).join('');

export { catColor, tag, phrase, starsHTML };
