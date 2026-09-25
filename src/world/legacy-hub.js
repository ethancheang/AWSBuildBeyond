import { $, $$, pick, shuffle } from '../shared/dom.js';
import { LEVELS, HUB_TIPS } from '../content/lessons.js';
import { avatarInner } from '../art/avatar.js';
import { artFor, nasiSVG } from '../art/food.js';
import { save, levelSave, unlocked } from '../state/progress.js';
import { SFX } from '../audio/sound.js';
import { starsHTML } from '../ui/format.js';
import { modalOpen, toast } from '../ui/overlays.js';
export function createHub({ openLesson }) {
  const W = 800,
    H = 540;
  const STALLS = [
    { x: 20, w: 240 },
    { x: 280, w: 240 },
    { x: 540, w: 240 },
  ].map((s) => ({ ...s, cx: s.x + s.w / 2, standY: 205 }));
  const TABLES = [
    { x: 160, y: 300 },
    { x: 640, y: 300 },
    { x: 160, y: 440 },
    { x: 640, y: 440 },
  ];
  const OBST = [
    ...TABLES.map((t) => ({ x: t.x, y: t.y, r: 70 })),
    { x: 400, y: 317, r: 80 },
  ];
  const BOUNDS = { x0: 18, x1: 782, y0: 196, y1: 518 };
  const STOOL_COLS = ['#e04b3a', '#2e86de', '#1f8a5b', '#ffc93c'];

  function stallMarkup(st, i) {
    const lv = LEVELS[i],
      x = st.x,
      w = st.w,
      y = 36,
      cx = st.cx;
    let m = `<g class="stall" data-stall="${i}" tabindex="0" role="button" aria-label="${lv.stall}: talk to ${lv.npc}">`;
    m += `<g class="mat" id="mat${i}"><rect class="mat-bg" x="${cx - 50}" y="182" width="100" height="34" rx="7" fill="#c0392b" stroke="#1e2a24" stroke-width="2"/>`;
    m += `<rect class="mat-dash" x="${cx - 45}" y="186" width="90" height="26" rx="5" fill="none" stroke="#ffc93c" stroke-width="1.5" stroke-dasharray="4 3"/><text x="${cx}" y="203" text-anchor="middle" class="mat-t">ORDER HERE</text></g>`;
    m += `<rect x="${x}" y="${y}" width="${w}" height="140" rx="6" fill="url(#wt)" stroke="#1e2a24" stroke-width="3"/>`;
    // back shelf
    if (lv.kind === 'drink') {
      for (let k = 0; k < 3; k++)
        m += `<rect x="${x + 14 + k * 20}" y="${y + 70}" width="15" height="24" rx="3" fill="#6b3f1f" stroke="#1e2a24" stroke-width="1.5"/><rect x="${x + 14 + k * 20}" y="${y + 70}" width="15" height="6" rx="2" fill="#e04b3a" stroke="#1e2a24" stroke-width="1.5"/>`;
      for (let k = 0; k < 3; k++)
        m += `<rect x="${x + w - 72 + k * 20}" y="${y + 74}" width="15" height="20" rx="2" fill="#fff" stroke="#1e2a24" stroke-width="1.5"/><rect x="${x + w - 72 + k * 20}" y="${y + 80}" width="15" height="6" fill="#2e86de"/>`;
    } else if (lv.kind === 'nasi') {
      m += `<rect x="${x + 14}" y="${y + 67}" width="60" height="31" rx="4" fill="#287955" stroke="#1e2a24"/><text x="${x + 44}" y="${y + 87}" text-anchor="middle" fill="white" font-size="10">SELAMAT</text>`;
    } else {
      for (let k = 0; k < 3; k++)
        m += `<path d="M${x + 18 + k * 20} ${y + 68} q-4 10 0 22 q4 4 8 0 q4 -12 0 -22Z" fill="#f3c64f" stroke="#b98a1c" stroke-width="1.5"/>`;
      for (let k = 0; k < 3; k++)
        m += `<path d="M${x + w - 64 + k * 18} ${y + 66} v18" stroke="#8fa0aa" stroke-width="3"/><ellipse cx="${x + w - 64 + k * 18}" cy="${y + 88}" rx="6" ry="4" fill="#b7c2c9" stroke="#1e2a24" stroke-width="1.5"/>`;
    }
    m += `<g transform="translate(${cx - 27} ${y + 58}) scale(.54)">${avatarInner(lv.npcAv)}</g>`;
    m += `<rect x="${x}" y="${y + 104}" width="${w}" height="14" fill="url(#steel)" stroke="#1e2a24" stroke-width="2.5"/>`;
    m += `<rect x="${x}" y="${y + 118}" width="${w}" height="22" fill="#7f929c" stroke="#1e2a24" stroke-width="2.5"/><text x="${cx}" y="${y + 133}" text-anchor="middle" class="counter-t">${lv.type.toUpperCase()}</text>`;
    if (lv.kind === 'drink') {
      for (let k = 0; k < 3; k++) {
        const px = x + 26 + k * 28;
        m += `<ellipse cx="${px}" cy="${y + 112}" rx="11" ry="3.5" fill="#fbf7ee" stroke="#1e2a24" stroke-width="1.5"/><path d="M${px - 7} ${y + 100} Q${px - 7} ${y + 111} ${px} ${y + 111} Q${px + 7} ${y + 111} ${px + 7} ${y + 100}Z" fill="#fbf7ee" stroke="#1e2a24" stroke-width="1.5"/><ellipse cx="${px}" cy="${y + 100}" rx="7" ry="2.2" fill="#6b3f1f"/>`;
      }
      const kx = x + w - 48;
      m += `<path d="M${kx + 12} ${y + 104} L${kx + 30} ${y + 84}" stroke="#b7c2c9" stroke-width="4" stroke-linecap="round"/><path d="M${kx - 12} ${y + 110} Q${kx - 14} ${y + 90} ${kx} ${y + 88} Q${kx + 14} ${y + 90} ${kx + 12} ${y + 110}Z" fill="url(#steel)" stroke="#1e2a24" stroke-width="1.8"/><path d="M${kx - 8} ${y + 90} Q${kx} ${y + 78} ${kx + 8} ${y + 90}" fill="none" stroke="#1e2a24" stroke-width="2"/>`;
    } else if (lv.kind === 'nasi') {
      m += `<svg x="${x + w - 90}" y="${y + 51}" width="87" height="68">${nasiSVG(['Nasi lemak satu', 'Ayam goreng', 'Sambal biasa'])}</svg>`;
    } else {
      for (let k = 0; k < 3; k++) {
        const px = x + 28 + k * 30;
        m += `<path d="M${px - 11} ${y + 102} Q${px - 10} ${y + 113} ${px} ${y + 113} Q${px + 10} ${y + 113} ${px + 11} ${y + 102}Z" fill="#fbf7ee" stroke="#1e2a24" stroke-width="1.5"/><ellipse cx="${px}" cy="${y + 102}" rx="11" ry="3.2" fill="#fbf7ee" stroke="#1e2a24" stroke-width="1.5"/><path d="M${px - 10} ${y + 106} Q${px} ${y + 110} ${px + 10} ${y + 106}" stroke="#e04b3a" stroke-width="1.5" fill="none"/>`;
      }
      const pxo = x + w - 52;
      m += `<ellipse cx="${pxo}" cy="${y + 106}" rx="30" ry="11" fill="url(#steel)" stroke="#1e2a24" stroke-width="2"/><ellipse cx="${pxo}" cy="${y + 105}" rx="24" ry="7.5" fill="#f2d38f"/>`;
      [
        [-12, 104],
        [-3, 107],
        [7, 103],
        [15, 106],
        [0, 101],
      ].forEach(
        ([dx, yy]) =>
          (m += `<circle cx="${pxo + dx}" cy="${y + yy}" r="3.3" fill="#fffdf6" stroke="#bfb293" stroke-width="1"/>`),
      );
      m += `<g class="steam" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".9"><path d="M${pxo - 6} ${y + 96} q-4 -6 0 -12 q4 -6 0 -12"/><path d="M${pxo + 8} ${y + 96} q-4 -6 0 -12 q4 -6 0 -12"/></g>`;
    }
    const n = 10,
      sw = w / n,
      aw =
        i === 2
          ? ['#d9a53b', '#236952']
          : i === 0
            ? ['#e04b3a', '#fff']
            : ['#1f8a5b', '#fff'];
    for (let k = 0; k < n; k++)
      m += `<circle cx="${x + k * sw + sw / 2}" cy="${y + 20}" r="${sw / 2}" fill="${aw[k % 2]}" stroke="#1e2a24" stroke-width="1.5"/>`;
    for (let k = 0; k < n; k++)
      m += `<rect x="${x + k * sw}" y="${y}" width="${sw}" height="20" fill="${aw[k % 2]}"/>`;
    m += `<rect x="${x}" y="${y}" width="${w}" height="20" fill="none" stroke="#1e2a24" stroke-width="2.5"/>`;
    m += `<rect x="${x + 22}" y="${y + 29}" width="${w - 44}" height="29" rx="5" fill="${i === 0 ? '#ffc93c' : '#fff6d8'}" stroke="#1e2a24" stroke-width="2.5"/>`;
    m += `<text x="${cx}" y="${y + 43}" text-anchor="middle" class="sign-zh">${lv.stallZh}</text><text x="${cx}" y="${y + 54}" text-anchor="middle" class="sign-en">${lv.stall.toUpperCase()}</text>`;
    return m + '</g>';
  }

  function tableMarkup(t, i) {
    let m = '';
    const cols = shuffle(STOOL_COLS);
    [45, 135, 225, 315].forEach((a, k) => {
      const r = (a * Math.PI) / 180,
        sx = t.x + Math.cos(r) * 50,
        sy = t.y + Math.sin(r) * 50;
      m += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="13" fill="${cols[k]}" stroke="#1e2a24" stroke-width="2.5"/><circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="4.5" fill="rgba(0,0,0,.28)"/>`;
    });
    m += `<circle cx="${t.x}" cy="${t.y + 3}" r="36" fill="rgba(0,0,0,.12)"/><circle cx="${t.x}" cy="${t.y}" r="36" fill="#f6f4ee" stroke="#1e2a24" stroke-width="2.5"/><circle cx="${t.x}" cy="${t.y}" r="29" fill="none" stroke="#d8d2c4" stroke-width="2"/>`;
    if (i === 0 || i === 1 || i === 3)
      m += `<g class="chope" tabindex="0" role="button" aria-label="Tissue packet on the table"><title>A tissue packet: this seat is choped!</title><g transform="rotate(-14 ${t.x} ${t.y})"><rect x="${t.x - 13}" y="${t.y - 8}" width="26" height="16" rx="3" fill="#fff" stroke="#1e2a24" stroke-width="1.8"/><path d="M${t.x - 9} ${t.y - 3} h18 M${t.x - 9} ${t.y + 2} h18" stroke="#2e86de" stroke-width="2"/></g></g>`;
    return m;
  }

  function buildMap() {
    let s = `<defs>
    <pattern id="tiles" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" class="fa"/><rect width="20" height="20" class="fb"/><rect x="20" y="20" width="20" height="20" class="fb"/></pattern>
    <pattern id="wt" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#eaf5f0"/><path d="M14 0H0V14" fill="none" stroke="#cfe4db" stroke-width="1.5"/></pattern>
    <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef2f4"/><stop offset="1" stop-color="#b7c2c9"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#tiles)"/>
  <rect width="${W}" height="36" class="wallc"/>
  <rect x="272" y="5" width="256" height="26" rx="6" fill="#ffc93c" stroke="#1e2a24" stroke-width="2.5"/>
  <text x="400" y="23" text-anchor="middle" class="map-title">MAXWELL FOOD CENTRE</text>`;
    s += STALLS.map(stallMarkup).join('');
    // tray return
    s += `<g transform="translate(0 210)"><rect x="334" y="60" width="132" height="94" rx="8" fill="#2f6f55" stroke="#1e2a24" stroke-width="3"/><text x="400" y="82" text-anchor="middle" class="tray-t">TRAY RETURN</text>`;
    ['#e04b3a', '#2e86de', '#1f8a5b', '#ffc93c'].forEach(
      (c, k) =>
        (s += `<rect x="${360 + k * 3}" y="${96 + k * 11}" width="80" height="10" rx="3" fill="${c}" stroke="#1e2a24" stroke-width="1.5"/>`),
    );
    s += `</g>`;
    // entrance & plants
    s += `<rect x="340" y="522" width="120" height="18" fill="#2f6f55" stroke="#1e2a24" stroke-width="2"/><text x="400" y="535" text-anchor="middle" class="small-t">ENTRANCE</text>`;
    [
      [26, 516],
      [774, 516],
      [26, 214],
      [774, 214],
    ].forEach(
      ([x, y]) =>
        (s += `<circle cx="${x}" cy="${y}" r="15" fill="#b5651d" stroke="#1e2a24" stroke-width="2"/><circle cx="${x - 5}" cy="${y - 4}" r="9" fill="#3aa35b"/><circle cx="${x + 5}" cy="${y - 3}" r="9" fill="#2f8f4e"/><circle cx="${x}" cy="${y + 4}" r="8" fill="#48b86a"/>`),
    );
    s += TABLES.map(tableMarkup).join('');
    // player
    s += `<g id="player" transform="translate(400 500)" pointer-events="none"><ellipse cx="0" cy="3" rx="14" ry="5" fill="rgba(0,0,0,.22)"/><g id="pbody">
    <path d="M-12 1 Q-13 -21 0 -22 Q13 -21 12 1Z" fill="#f28c28" stroke="#1e2a24" stroke-width="2.5"/>
    <circle cx="0" cy="-31" r="11" fill="#f1c7a1" stroke="#1e2a24" stroke-width="2.5"/>
    <path d="M-11 -32 Q-11 -44 0 -44 Q11 -44 11 -32 Q5 -38 -2 -37 Q-7 -36 -11 -32Z" fill="#1e2a24"/>
    <circle cx="-4" cy="-30" r="1.7" fill="#1e2a24"/><circle cx="4" cy="-30" r="1.7" fill="#1e2a24"/></g>
    <g transform="translate(0 -54)"><rect x="-16" y="-8" width="32" height="14" rx="7" fill="#1e2a24"/><text y="2.5" text-anchor="middle" class="you-t">YOU</text></g></g>`;
    // ceiling fans (overhead)
    [
      [280, 372],
      [520, 372],
    ].forEach(
      ([x, y]) =>
        (s += `<g transform="translate(${x} ${y})" opacity=".2" pointer-events="none"><g class="spin">${[0, 120, 240].map((a) => `<ellipse cx="26" cy="0" rx="26" ry="6" transform="rotate(${a})" fill="#1e2a24"/>`).join('')}</g><circle r="7" fill="#1e2a24"/></g>`),
    );
    // markers + locks
    STALLS.forEach((st, i) => {
      s += `<g id="mk${i}" transform="translate(${st.cx + 38} 116)" pointer-events="none"><g class="bob"><circle r="12" fill="#ffc93c" stroke="#1e2a24" stroke-width="2.5"/><text y="5" text-anchor="middle" class="mk-t">!</text></g></g>`;
      s += `<g id="lock${i}" pointer-events="none"><rect x="${st.x}" y="36" width="${st.w}" height="140" rx="6" fill="rgba(20,28,24,.62)"/>
      <path d="M${st.cx - 10} 102 v-9 a10 10 0 0 1 20 0 v9" fill="none" stroke="#ffc93c" stroke-width="5"/>
      <rect x="${st.cx - 16}" y="100" width="32" height="24" rx="5" fill="#ffc93c" stroke="#1e2a24" stroke-width="2.5"/><circle cx="${st.cx}" cy="111" r="3.5" fill="#1e2a24"/>
      <text x="${st.cx}" y="146" text-anchor="middle" class="small-t" style="font-size:11px">Finish the kopi lesson first</text></g>`;
    });
    $('#map').innerHTML = s;
  }

  /* =========================================================
   HUB MOVEMENT
   ========================================================= */
  const P = { x: 400, y: 500 };
  const SPEED = 250;
  let target = null,
    bestD = Infinity,
    stuckT = 0,
    inZone = -1,
    last = performance.now();
  const keys = new Set();
  const hubLive = () => $('#hub').classList.contains('active') && !modalOpen;

  function setTarget(x, y, cb) {
    target = {
      x: Math.max(BOUNDS.x0, Math.min(BOUNDS.x1, x)),
      y: Math.max(BOUNDS.y0, Math.min(BOUNDS.y1, y)),
      cb,
    };
    bestD = Infinity;
    stuckT = 0;
  }
  function resolve() {
    for (const o of OBST) {
      const dx = P.x - o.x,
        dy = P.y - o.y,
        d = Math.hypot(dx, dy);
      if (d < o.r) {
        const n = d || 1;
        P.x = o.x + (dx / n) * o.r;
        P.y = o.y + (dy / n) * o.r;
      }
    }
    P.x = Math.max(BOUNDS.x0, Math.min(BOUNDS.x1, P.x));
    P.y = Math.max(BOUNDS.y0, Math.min(BOUNDS.y1, P.y));
  }
  function checkZone() {
    const z = STALLS.findIndex((st) => Math.abs(P.x - st.cx) < 62 && P.y < 232);
    if (z === inZone) return;
    inZone = z;
    STALLS.forEach((_, i) => {
      const m = $('#mat' + i);
      if (m) m.classList.toggle('active', i === z);
    });
    const b = $('#talkBtn');
    if (z < 0) {
      b.hidden = true;
      return;
    }
    const lv = LEVELS[z];
    b.hidden = false;
    if (unlocked(z)) {
      b.classList.remove('locked');
      b.innerHTML = `💬 Talk to ${lv.npc} <kbd>Enter</kbd>`;
    } else {
      b.classList.add('locked');
      b.textContent = `🔒 ${lv.npc} is busy. Learn kopi first!`;
    }
  }
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (hubLive()) {
      let vx = 0,
        vy = 0;
      if (keys.has('l')) vx -= 1;
      if (keys.has('r')) vx += 1;
      if (keys.has('u')) vy -= 1;
      if (keys.has('d')) vy += 1;
      if (vx || vy) {
        target = null;
        const m = Math.hypot(vx, vy);
        vx /= m;
        vy /= m;
      } else if (target) {
        const dx = target.x - P.x,
          dy = target.y - P.y,
          d = Math.hypot(dx, dy);
        if (d < 4) {
          P.x = target.x;
          P.y = target.y;
          const cb = target.cb;
          target = null;
          if (cb) cb();
        } else {
          vx = dx / d;
          vy = dy / d;
          if (d < bestD - 1) {
            bestD = d;
            stuckT = 0;
          } else if ((stuckT += dt) > 0.7) target = null;
        }
      }
      const moving = !!(vx || vy);
      if (moving) {
        P.x += vx * SPEED * dt;
        P.y += vy * SPEED * dt;
        resolve();
      }
      const pl = $('#player');
      if (pl) {
        pl.setAttribute(
          'transform',
          `translate(${P.x.toFixed(1)} ${P.y.toFixed(1)})`,
        );
        $('#pbody').classList.toggle('walking', moving);
      }
      checkZone();
    }
    requestAnimationFrame(tick);
  }
  function svgPoint(e) {
    const svg = $('#map'),
      pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }
  function goToStall(i) {
    if (!unlocked(i)) {
      toast(
        `🔒 ${LEVELS[i].npc}: “Aiyo, go learn kopi from ${LEVELS[i - 1].npc} first lah!”`,
      );
      SFX.undo();
      return;
    }
    const mw = $('.map-wrap').getBoundingClientRect();
    if (mw.top < 0 || mw.bottom > innerHeight)
      $('.map-wrap').scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTarget(STALLS[i].cx, STALLS[i].standY, () => openLesson(i));
  }
  $('#map').addEventListener('click', (e) => {
    const st = e.target.closest('.stall');
    if (st) {
      goToStall(+st.dataset.stall);
      return;
    }
    if (e.target.closest('.chope')) {
      toast(
        '🧻 Chope! A tissue packet on a table means someone has reserved that seat.',
      );
      return;
    }
    const p = svgPoint(e);
    setTarget(p.x, p.y);
  });
  $('#map').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const st = e.target.closest('.stall');
    if (st) {
      e.preventDefault();
      e.stopPropagation();
      goToStall(+st.dataset.stall);
    }
    if (e.target.closest('.chope')) {
      e.preventDefault();
      e.stopPropagation();
      toast(
        '🧻 Chope! A tissue packet on a table means someone has reserved that seat.',
      );
    }
  });
  $('#talkBtn').addEventListener('click', () => {
    if (inZone >= 0 && unlocked(inZone)) openLesson(inZone);
  });

  const KEYMAP = {
    ArrowLeft: 'l',
    a: 'l',
    A: 'l',
    ArrowRight: 'r',
    d: 'r',
    D: 'r',
    ArrowUp: 'u',
    w: 'u',
    W: 'u',
    ArrowDown: 'd',
    s: 'd',
    S: 'd',
  };
  function renderHub() {
    $('#lessonList').innerHTML = LEVELS.map((lv, i) => {
      const sv = levelSave(lv.id),
        un = unlocked(i),
        status = !un ? 'locked' : sv.done ? 'done' : 'new';
      return `<button class="lesson-card ${un ? '' : 'locked'}" data-li="${i}" aria-label="${lv.title} with ${lv.npc}, ${status}">
      <div class="lc-icon">${artFor(lv, lv.example.tokens)}</div>
      <div><div class="lc-stall">${lv.stall}</div><div class="lc-title">Lesson ${i + 1}: ${lv.title}</div><div class="lc-npc">with ${lv.npc}, ${lv.role}</div></div>
      <div class="lc-right"><div class="stars">${starsHTML(sv.stars)}</div><span class="badge b-${status}">${!un ? '🔒 Locked' : sv.done ? 'Done' : 'New'}</span></div>
    </button>`;
    }).join('');
    $$('.lesson-card').forEach((b) =>
      b.addEventListener('click', () => goToStall(+b.dataset.li)),
    );
    const totalStars = LEVELS.reduce((a, l) => a + levelSave(l.id).stars, 0);
    const pts = LEVELS.reduce((a, l) => a + levelSave(l.id).best, 0);
    $('#hubStars').textContent = `★ ${totalStars}/${LEVELS.length * 3}`;
    $('#hubPts').textContent = `${pts} pts`;
    $('#gradBanner').innerHTML = LEVELS.every((l) => levelSave(l.id).done)
      ? `<div class="card grad"><span>🏅</span><div><b>Maxwell regular</b>You can order kopi, fishball noodles and nasi lemak like a local. Replay to collect every star.</div></div>`
      : '';
    $('#hubTip').textContent = pick(HUB_TIPS);
    $('#soundBtn').textContent = save.sound ? '🔊' : '🔇';
    STALLS.forEach((_, i) => {
      const un = unlocked(i),
        done = levelSave(LEVELS[i].id).done;
      const lock = $('#lock' + i),
        mk = $('#mk' + i);
      if (!lock) return;
      lock.style.display = un ? 'none' : '';
      mk.style.display = un ? '' : 'none';
      mk.querySelector('circle').setAttribute(
        'fill',
        done ? '#1f8a5b' : '#ffc93c',
      );
      const t = mk.querySelector('text');
      t.textContent = done ? '★' : '!';
      t.setAttribute('fill', done ? '#fff' : '#1e2a24');
    });
    inZone = -2;
    checkZone();
  }

  addEventListener('keydown', (e) => {
    if (!hubLive()) return;
    if (KEYMAP[e.key]) {
      keys.add(KEYMAP[e.key]);
      e.preventDefault();
      return;
    }
    if (
      e.key === 'Enter' &&
      !e.target.closest('button, .stall, .chope') &&
      inZone >= 0
    ) {
      e.preventDefault();
      openLesson(inZone);
    }
  });
  addEventListener('keyup', (e) => {
    if (KEYMAP[e.key]) keys.delete(KEYMAP[e.key]);
  });
  addEventListener('blur', () => keys.clear());
  buildMap();
  renderHub();
  requestAnimationFrame((t) => {
    last = t;
    tick(t);
  });
  return {
    renderHub,
    stop: () => {
      keys.clear();
      target = null;
    },
  };
}
