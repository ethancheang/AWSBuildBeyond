import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-900.css';
import './styles/base.css';
import './styles/experience.css';
import { $, $$ } from './shared/dom.js';
import { drinkSVG, noodleSVG } from './art/food.js';
import { save, persist } from './state/progress.ts';
import { beep, SFX } from './audio/sound.js';
import {
  modalOpen,
  modalActs,
  openModal,
  closeModal,
  hideTip,
  toast,
} from './ui/overlays.js';
import { createLessons } from './lessons/controller.js';
import { createHub } from './ui/hub.js';
$('#bunting').innerHTML = Array.from(
  { length: 16 },
  (_, i) =>
    `<i style="--c:${['#e04b3a', '#ffc93c', '#2e86de', '#fff'][i % 4]}"></i>`,
).join('');
const stoolSVG = (c) =>
  `<svg viewBox="0 0 60 60"><path d="M10 18 L16 58 M50 18 L44 58 M13 40 H47" stroke="${c}" stroke-width="6" stroke-linecap="round"/><ellipse cx="30" cy="16" rx="24" ry="8" fill="${c}" stroke="#1e2a24" stroke-width="2.5"/><ellipse cx="30" cy="15" rx="6" ry="2.4" fill="rgba(0,0,0,.3)"/></svg>`;
$('#heroArt').innerHTML =
  `<span class="stool">${stoolSVG('#e04b3a')}</span>${drinkSVG(['Kopi'])}${noodleSVG(['Mee Pok', 'Soup', 'Chili'])}${drinkSVG(['Teh', 'Peng'])}<span class="stool">${stoolSVG('#2e86de')}</span>`;

function show(id) {
  hideTip();
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  window.scrollTo(0, 0);
}
const lessons = createLessons({
  show,
  backToHub: () => {
    closeModal();
    show('hub');
    hub.renderHub();
  },
  onEnter: () => hub.stop(),
});
const hub = createHub({ openLesson: lessons.openLesson });
$('#startBtn').addEventListener('click', () => {
  beep([523, 784], 0.1);
  show('hub');
  hub.renderHub();
  hub.loadWorld();
});
$('#glossBtn').addEventListener('click', lessons.openGlossary);
$('#soundBtn').addEventListener('click', () => {
  save.sound = !save.sound;
  persist();
  hub.renderHub();
  if (save.sound) SFX.pop();
});
$('#resetBtn').addEventListener('click', () =>
  openModal(
    '<h2>Reset progress?</h2><p>This clears your stars and points for all three stalls.</p><div class="row-btns"><button class="btn ghost" data-act="close" data-primary>Keep progress</button><button class="btn primary" data-act="reset">Reset</button></div>',
    {
      close: closeModal,
      reset: () => {
        save.levels = {};
        persist();
        closeModal();
        hub.renderHub();
        toast('Progress reset. The hawkers are waiting!');
      },
    },
  ),
);
addEventListener('keydown', (e) => {
  if (modalOpen && e.key === 'Escape' && modalActs.close) modalActs.close();
});
addEventListener('scroll', hideTip, { passive: true });
if (import.meta.hot) import.meta.hot.dispose(() => hub.dispose());
