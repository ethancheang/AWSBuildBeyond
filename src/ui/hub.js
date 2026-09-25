import { $, $$, pick } from '../shared/dom.js';
import { LEVELS, HUB_TIPS } from '../content/lessons.ts';
import { artFor } from '../art/food.js';
import { save, levelSave } from '../state/progress.ts';
import { starsHTML } from './format.js';
import { modalOpen, toast } from './overlays.js';

export function createHub({ openLesson }) {
  let world,
    loading,
    unavailable = false,
    nearby = -1;
  function fallback() {
    unavailable = true;
    $('#worldStatus').hidden = false;
    $('#worldStatus').textContent =
      'The 3D view is unavailable on this device. Choose any stall to keep learning.';
    $('#worldMode').textContent = 'Lesson mode';
    $('#talkBtn').hidden = true;
  }
  async function loadWorld() {
    if (loading) return loading;
    if (world || unavailable) return;
    $('#worldStatus').hidden = false;
    loading = import('../world/scene.ts')
      .then(({ createWorld }) => {
        world = createWorld({
          container: $('#world'),
          isActive: () => $('#hub').classList.contains('active') && !modalOpen,
          onStall: openLesson,
          onTip: toast,
          onNearby: (index) => {
            nearby = index;
            $('#talkBtn').hidden = index < 0;
            if (index >= 0)
              $('#talkBtn').textContent =
                `Talk to ${LEVELS[index].npc}  ·  E / Enter`;
          },
          onUnavailable: fallback,
        });
        $('#worldStatus').hidden = true;
        world.setCompleted(LEVELS.map((l) => levelSave(l.id).done));
      })
      .catch((error) => {
        console.error('Unable to start 3D world:', error);
        fallback();
      });
    await loading;
  }
  async function visit(index) {
    if ($('#directLessons').checked || unavailable) {
      openLesson(index);
      return;
    }
    await loadWorld();
    if (unavailable) {
      openLesson(index);
      return;
    }
    world.goToStall(index);
    $('#world canvas')?.focus({ preventScroll: true });
    if (window.innerWidth < 900)
      $('#world').scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
        block: 'center',
      });
  }
  $('#talkBtn').addEventListener('click', () => {
    if (nearby >= 0) openLesson(nearby);
  });
  $('#cameraBtn').addEventListener('click', () => world?.resetCamera());
  function renderHub() {
    $('#lessonList').innerHTML = LEVELS.map((lv, i) => {
      const progress = levelSave(lv.id);
      return `<button class="lesson-card" data-li="${i}" aria-label="${lv.title} with ${lv.npc}, ${progress.done ? 'done' : 'new'}">
        <div class="lc-icon">${artFor(lv, lv.example.tokens)}</div>
        <div><div class="lc-stall">STALL 0${i + 1} · ${lv.type}</div><div class="lc-title">${lv.title}</div><div class="lc-npc">${lv.npc} <span aria-hidden="true">↗</span></div></div>
        <div class="lc-right"><span class="stars" aria-label="${progress.stars} of 3 stars">${starsHTML(progress.stars)}</span><span class="badge ${progress.done ? 'b-done' : ''}">${progress.done ? 'Completed' : '6 customers'}</span></div></button>`;
    }).join('');
    $$('.lesson-card').forEach((button) =>
      button.addEventListener('click', () => visit(Number(button.dataset.li))),
    );
    $('#hubStars').textContent =
      `★ ${LEVELS.reduce((n, l) => n + levelSave(l.id).stars, 0)}/9`;
    $('#hubPts').textContent =
      `${LEVELS.reduce((n, l) => n + levelSave(l.id).best, 0)} pts`;
    $('#gradBanner').innerHTML = LEVELS.every((l) => levelSave(l.id).done)
      ? '<div class="card grad"><span>🏅</span><div><b>Hawker regular</b>All three stalls completed. Replay to collect every star.</div></div>'
      : '';
    $('#hubTip').textContent = pick(HUB_TIPS);
    $('#soundBtn').textContent = save.sound ? '♫' : '♪';
    $('#soundBtn').setAttribute('aria-pressed', String(save.sound));
    $('#soundBtn').setAttribute(
      'aria-label',
      save.sound ? 'Mute sound' : 'Enable sound',
    );
    world?.setCompleted(LEVELS.map((l) => levelSave(l.id).done));
    world?.sync();
  }
  const observer = new MutationObserver(() => world?.sync());
  observer.observe($('#hub'), { attributes: true, attributeFilter: ['class'] });
  return {
    renderHub,
    loadWorld,
    stop: () => world?.stop(),
    dispose: () => {
      observer.disconnect();
      world?.dispose();
    },
  };
}
