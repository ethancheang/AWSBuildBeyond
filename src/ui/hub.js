import { $, $$, pick } from '../shared/dom.js';
import { LEVELS, HUB_TIPS } from '../content/lessons.ts';
import { artFor } from '../art/food.js';
import { save, levelSave } from '../state/progress.ts';
import { starsHTML } from './format.js';
import { modalOpen, toast } from './overlays.js';
import { createJoystick } from './joystick.js';
import { PLACEHOLDER_STALLS, STALLS } from '../content/stalls.ts';

export function createHub({ openLesson }) {
  let world,
    joystick,
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
    $('#joystick').hidden = true;
    $('#helpBtn').hidden = true;
    $('#helpPopup').hidden = true;
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
              $('#talkBtn').textContent = `Talk to ${LEVELS[index].npc}  ·  E`;
          },
          onUnavailable: fallback,
          playerName: () => $('#playerName').value,
          // Not shown on screen; announced to screen readers only.
          onMultiplayer: (status, count) => {
            $('#multiplayerStatus').textContent =
              status === 'connected'
                ? `Shared hall · ${count + 1} here`
                : status === 'connecting'
                  ? 'Joining shared hall…'
                  : 'Reconnecting…';
          },
        });
        $('#worldStatus').hidden = true;
        joystick ??= createJoystick($('#joystick'), (input) =>
          world?.setStick(input),
        );
        if (!helpSeen()) setHelp(true);
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
  // The controls popup shows once per browser; the ? button brings it back.
  const HELP_KEY = 'kopi-that-help-seen';
  function helpSeen() {
    try {
      return localStorage.getItem(HELP_KEY) === '1';
    } catch {
      return false;
    }
  }
  function setHelp(open) {
    $('#helpPopup').hidden = !open;
    $('#helpBtn').setAttribute('aria-expanded', String(open));
    if (open) return;
    try {
      localStorage.setItem(HELP_KEY, '1');
    } catch {
      // Storage may be blocked; the popup simply shows again next visit.
    }
  }
  $('#helpBtn').addEventListener('click', () =>
    setHelp($('#helpPopup').hidden),
  );
  $('#closeHelp').addEventListener('click', (event) => {
    setHelp(false);
    // Hand the keyboard back to the game, as the camera buttons do.
    if (event.detail) $('#world canvas')?.focus({ preventScroll: true });
    else $('#helpBtn').focus();
  });
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || $('#helpPopup').hidden || modalOpen) return;
    setHelp(false);
    if ($('#helpPopup').contains(document.activeElement)) $('#helpBtn').focus();
  });
  $('#talkBtn').addEventListener('click', () => {
    if (nearby >= 0) openLesson(nearby);
  });
  async function setView(view) {
    await loadWorld();
    if (unavailable) return;
    world.setView(view);
    $('#hub').dataset.camera = view;
    $('#followViewBtn').setAttribute('aria-pressed', String(view === 'follow'));
    $('#isoViewBtn').setAttribute('aria-pressed', String(view === 'isometric'));
  }
  // After a mouse click, hand the keyboard back to the game so Space jumps
  // instead of pressing the button again. Keyboard activation keeps focus.
  const viewButton = (view) => async (event) => {
    await setView(view);
    if (event.detail) $('#world canvas')?.focus({ preventScroll: true });
  };
  $('#cameraBtn').addEventListener('click', viewButton('follow'));
  $('#followViewBtn').addEventListener('click', viewButton('follow'));
  $('#isoViewBtn').addEventListener('click', viewButton('isometric'));
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
        <div class="lc-right"><span class="stars" aria-label="${progress.stars} of 3 stars">${starsHTML(progress.stars)}</span><span class="badge ${progress.done ? 'b-done' : ''}">${progress.done ? 'Completed' : '6 orders'}</span></div></button>`;
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
    stop: () => {
      joystick?.release();
      world?.stop();
    },
    dispose: () => {
      observer.disconnect();
      world?.dispose();
    },
  };
}
