import { $, $$, pick } from '../shared/dom.js';
import { LEVELS, HUB_TIPS } from '../content/lessons.ts';
import { artFor } from '../art/food.js';
import { save, levelSave } from '../state/progress.ts';
import { starsHTML } from './format.js';
import { modalOpen, toast } from './overlays.js';
import { PLACEHOLDER_STALLS, STALLS } from '../content/stalls.ts';

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
    loading = Promise.all([
      import('../world/scene.ts'),
      document.fonts.load('400 64px "Permanent Marker"'),
      document.fonts.load('500 28px Outfit'),
    ])
      .then(([{ createWorld }]) => {
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
    if (window.innerWidth <= 1000) setPanel(false);
  }
  $('#talkBtn').addEventListener('click', () => {
    if (nearby >= 0) openLesson(nearby);
  });
  async function setView(view) {
    await loadWorld();
    if (unavailable) return;
    world.setView(view);
    $('#hub').dataset.camera = view;
    $('#followViewBtn').setAttribute('aria-pressed', String(view === 'follow'));
    $('#hallViewBtn').setAttribute('aria-pressed', String(view === 'hall'));
    $('#floorViewBtn').setAttribute('aria-pressed', String(view === 'floor'));
  }
  $('#cameraBtn').addEventListener('click', () => setView('follow'));
  $('#followViewBtn').addEventListener('click', () => setView('follow'));
  $('#hallViewBtn').addEventListener('click', () => setView('hall'));
  $('#floorViewBtn').addEventListener('click', () => setView('floor'));
  function setPanel(open) {
    $('#hawkerPanel').hidden = !open;
    $('#hawkersToggle').setAttribute('aria-expanded', String(open));
    if (!open && $('#hawkerPanel').contains(document.activeElement))
      $('#hawkersToggle').focus();
  }
  $('#hawkersToggle').addEventListener('click', () =>
    setPanel($('#hawkerPanel').hidden),
  );
  $('#closeHawkers').addEventListener('click', () => setPanel(false));
  // A drawer on smaller screens leaves the world available for touch navigation.
  setPanel(window.innerWidth > 1000);
  $('#placeholderList').innerHTML = PLACEHOLDER_STALLS.map(
    (stall) =>
      `<li><span class="placeholder-dot" style="--stall-color:${stall.color}"></span><div><strong>${stall.name}</strong><small>${stall.cuisine} · Coming soon</small></div></li>`,
  ).join('');
  function renderHub() {
    $('#lessonList').innerHTML = LEVELS.map((lv, i) => {
      const progress = levelSave(lv.id);
      return `<button class="lesson-card" data-li="${i}" aria-label="${lv.title} with ${lv.npc}, ${progress.done ? 'done' : 'new'}">
        <div class="lc-icon">${artFor(lv, lv.example.tokens)}</div>
        <div><div class="lc-stall">STALL 0${STALLS.findIndex((stall) => stall.lessonIndex === i) + 1} · ${lv.type}</div><div class="lc-title">${lv.title}</div><div class="lc-npc">${lv.npc} <span aria-hidden="true">↗</span></div></div>
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
