import '@fontsource/permanent-marker/latin-400.css';
import '@fontsource/outfit/latin-400.css';
import '@fontsource/outfit/latin-500.css';
import '@fontsource/outfit/latin-600.css';
import '@fontsource/outfit/latin-700.css';
import './styles/base.css';
import './styles/experience.css';
import { $, $$ } from './shared/dom.js';
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
function show(id) {
  hideTip();
  document.body.dataset.screen = id;
  $('#world').inert = id !== 'hub';
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

document.body.dataset.screen = 'title';
$('#world').inert = true;
hub.renderHub();
hub.loadWorld();
