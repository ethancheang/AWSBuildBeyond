import { feedbackNotes } from '../ui/feedback.js';
import { $, $$, shuffle, pick } from '../shared/dom.js';
import { LEVELS, GLOSS, CATS, NASI_BASE } from '../content/lessons.ts';
import { avatarSVG } from '../art/avatar.js';
import { artFor, infoFor, nasiSVG } from '../art/food.js';
import { save, persist, levelSave } from '../state/progress.ts';
import { SFX } from '../audio/sound.js';
import { catColor, tag, phrase, starsHTML } from '../ui/format.js';
import {
  modalOpen,
  openModal,
  closeModal,
  showTip,
  hideTip,
} from '../ui/overlays.js';
import { evaluate, nasiCheck } from '../domain/evaluation.ts';
import { scoreOrder, lessonStars } from '../domain/scoring.ts';
export function createLessons({ show, backToHub, onEnter }) {
  function nasiStage() {
    return L.lv.prompts[L.idx].stages[L.stage];
  }
  function nasiTurn() {
    L.tokens = [];
    const st = nasiStage();
    setBubble(st.q);
    $('#chips').innerHTML = '';
    st.chips.forEach((t) => $('#chips').appendChild(makeChip(t)));
    $('.chips-label').textContent =
      'Answer this question. Hover or long-press for the English meaning. Optional greetings do not affect your score.';
    $('#orderBtn').textContent = 'Reply to Kak Aisyah';
    renderOrder();
  }
  function nasiSubmit() {
    hideTip();
    const st = nasiStage();
    if (!nasiCheck(L.tokens, st.a)) {
      L.tries++;
      SFX.bad();
      const wrong = L.tokens.filter((t) => !['Kak', 'Saya nak'].includes(t));
      openModal(
        `<h2>Let’s adjust that part</h2><p>You chose: ${wrong.length ? wrong.map((t) => `${tag(t)} — ${GLOSS[t].short}`).join('; ') : 'only a greeting'}.</p><p>The customer needs: ${st.a.map((t) => `${tag(t)} — ${GLOSS[t].short}`).join('; ')}.</p><p>Your earlier replies are kept.</p><button class="btn primary" data-act="retry" data-primary>Try again</button>`,
        {
          retry: () => {
            closeModal();
            nasiTurn();
          },
          close: () => {
            closeModal();
            nasiTurn();
          },
        },
      );
      return;
    }
    L.accepted.push(...st.a);
    L.stage++;
    SFX.pop();
    if (L.stage < L.lv.prompts[L.idx].stages.length) {
      nasiTurn();
      return;
    }
    const { star, points: pts } = scoreOrder(L.tries, L.hinted);
    L.score += pts;
    if (star) L.perfect++;
    L.results[L.idx] = star ? 'star' : 'ok';
    SFX.good();
    renderStats();
    const next = () => {
      closeModal();
      if (L.idx === L.lv.prompts.length - 1) finishLevel();
      else nextPrompt();
    };
    openModal(
      `<div class="center"><div class="served">${nasiSVG(L.accepted)}</div><h2>Swee! Order coming right up!</h2><p>Kak Aisyah: “Your meal is ready. Enjoy!”</p><p>${L.accepted.map((t) => GLOSS[t].short).join(' · ')}</p><div class="pts">+${pts} pts ${star ? '★ perfect' : ''}</div><p>Say thank you: <b>Terima kasih</b>. This does not affect your score.</p><div class="row-btns"><button class="btn primary" data-act="thanks" data-primary>Terima kasih — Thank you</button><button class="btn ghost" data-act="next">${L.idx === L.lv.prompts.length - 1 ? 'Finish lesson' : 'Next customer'}</button></div></div>`,
      { thanks: next, next, close: next },
    );
  }
  let L = null;

  function openLesson(li) {
    if (modalOpen) return;
    onEnter();
    const lv = LEVELS[li];
    L = {
      li,
      lv,
      idx: 0,
      tokens: [],
      tries: 0,
      hinted: false,
      score: 0,
      perfect: 0,
      results: [],
    };
    show('lesson');
    $('#lbStall').textContent = `${lv.stall} (${lv.stallZh})`;
    $('#lbTitle').textContent = `Lesson ${li + 1}: ${lv.title}`;
    $('#npcPortrait').innerHTML = avatarSVG(lv.npcAv);
    $('#npcName').textContent = lv.npc;
    $('#npcRole').textContent = lv.role;
    renderPrompt();
    showIntro();
  }

  function formulaHTML(lv) {
    return lv.formula
      .map(
        (f) =>
          `<div class="fslot" style="--cc:${CATS[f.cat].color}"><small>${CATS[f.cat].label}</small>${f.opts.map(tag).join(' ')}${f.blank ? `<span class="blank">or say nothing: ${f.blank}</span>` : ''}</div>`,
      )
      .join('<span class="farrow">›</span>');
  }

  function showIntro() {
    const lv = L.lv;
    openModal(
      `
    <div class="intro-head"><div class="portrait">${avatarSVG(lv.npcAv)}</div><div><small>${lv.stall} · ${lv.stallZh}</small><h2>${lv.npc}</h2><small>${lv.role}</small></div></div>
    <div class="speech">${lv.intro.map((t) => `<p>“${t}”</p>`).join('')}</div>
    <h3 style="margin-top:0">How the order goes</h3>
    <div class="formula">${formulaHTML(lv)}</div>
    <div class="example">${artFor(lv, lv.example.tokens)}<div><div class="said">“${phrase(lv.example.tokens)}”</div><p>means ${lv.example.meaning}</p></div></div>
    <div class="row-btns"><button class="btn primary" data-act="start" data-primary>Start taking orders</button></div>`,
      {
        start: () => {
          closeModal();
          SFX.pop();
        },
        close: () => {
          closeModal();
        },
      },
    );
  }

  function renderPrompt() {
    const lv = L.lv,
      p = lv.prompts[L.idx];
    L.tokens = [];
    L.tries = 0;
    L.hinted = false;
    L.stage = 0;
    L.accepted = [];
    $('#custPortrait').innerHTML = avatarSVG(p.c.av);
    $('#custName').textContent = p.c.name;
    $('#custTag').textContent = p.c.tag;
    $('#custQuote').textContent = `“${p.q}”`;
    const cc = $('#custCard');
    cc.classList.remove('enter');
    void cc.offsetWidth;
    cc.classList.add('enter');
    if (lv.kind === 'nasi') {
      $('#custQuote').textContent += ' ' + NASI_BASE;
      renderStats();
      nasiTurn();
      return;
    }
    $('.chips-label').textContent =
      'Tap chips in the order you’d say them. Hover or long-press for meaning.';
    $('#orderBtn').textContent = 'Place order';
    setBubble(lv.next[L.idx % lv.next.length]);
    const box = $('#chips');
    box.innerHTML = '';
    shuffle(lv.chips).forEach((t) => box.appendChild(makeChip(t)));
    renderStats();
    renderOrder();
  }

  function setBubble(t) {
    const b = $('#npcBubble');
    b.textContent = t;
    b.classList.remove('pop');
    void b.offsetWidth;
    b.classList.add('pop');
  }

  function renderStats() {
    const n = L.lv.prompts.length;
    $('#lbCount').textContent = `Customer ${Math.min(L.idx + 1, n)}/${n}`;
    $('#lbScore').textContent = `${L.score} pts`;
    $('#dots').innerHTML = L.lv.prompts
      .map(
        (_, i) =>
          `<i class="${L.results[i] || (i === L.idx ? 'cur' : '')}"></i>`,
      )
      .join('');
  }

  function makeChip(term) {
    const g = GLOSS[term],
      cat = CATS[g.cat];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.term = term;
    b.style.setProperty('--cc', cat.color);
    b.innerHTML = `<small>${cat.label}</small><span>${term}</span>`;
    b.setAttribute('aria-label', `${term}: ${g.short}`);
    let lpTimer = null,
      longPressed = false;
    b.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') showTip(b, term);
    });
    b.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') hideTip();
    });
    b.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      longPressed = false;
      clearTimeout(lpTimer);
      lpTimer = setTimeout(() => {
        longPressed = true;
        showTip(b, term);
        if (navigator.vibrate) navigator.vibrate(12);
      }, 420);
    });
    const end = () => {
      clearTimeout(lpTimer);
      if (longPressed) setTimeout(hideTip, 1600);
    };
    b.addEventListener('pointerup', end);
    b.addEventListener('pointercancel', end);
    b.addEventListener('pointermove', (e) => {
      if (
        e.pointerType !== 'mouse' &&
        !longPressed &&
        Math.abs(e.movementX) + Math.abs(e.movementY) > 8
      )
        clearTimeout(lpTimer);
    });
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    b.addEventListener('focus', () => {
      if (b.matches(':focus-visible')) showTip(b, term);
    });
    b.addEventListener('blur', hideTip);
    b.addEventListener('click', (e) => {
      if (longPressed) {
        longPressed = false;
        e.preventDefault();
        return;
      }
      addToken(term);
    });
    return b;
  }

  function addToken(t) {
    if (!L || modalOpen || L.tokens.includes(t)) return;
    L.tokens.push(t);
    SFX.pop();
    renderOrder();
  }
  function undo() {
    if (!L || !L.tokens.length || modalOpen) return;
    L.tokens.pop();
    SFX.undo();
    renderOrder();
  }
  function clearOrder() {
    if (!L || modalOpen) return;
    L.tokens = [];
    SFX.undo();
    renderOrder();
  }

  function renderOrder() {
    const lv = L.lv,
      ph = $('#phrase');
    ph.innerHTML = L.tokens.length
      ? L.tokens
          .map(
            (t, i) =>
              `<button class="tok" data-i="${i}" style="--cc:${catColor(t)}" aria-label="Remove ${t}">${t}<span aria-hidden="true">✕</span></button>`,
          )
          .join('')
      : `<span class="placeholder">Tap the chips below to build the order…</span>`;
    $('#sayLine').innerHTML = L.tokens.length
      ? `You say: <b>“${lv.honor}, one ${phrase(L.tokens)}!”</b>`
      : '&nbsp;';
    const shown = lv.kind === 'nasi' ? [...L.accepted, ...L.tokens] : L.tokens;
    if (lv.kind === 'nasi')
      $('#sayLine').textContent = L.tokens.length
        ? 'You say: “' + phrase(L.tokens) + '”'
        : 'Your turn to reply';
    $('#previewArt').innerHTML = artFor(lv, shown);
    const info = infoFor(lv, shown);
    $('#previewCap').textContent = info.cap;
    $('#previewSweet').innerHTML =
      info.sweet == null
        ? ''
        : `<div class="sweet">Sweet ${[0, 1, 2].map((i) => `<i class="${i < info.sweet ? 'on' : ''}"></i>`).join('')}${info.sweet > 2 ? '<i class="on"></i>' : ''}</div>`;
    $('#slots').innerHTML = lv.slots
      .map((c) => {
        const t = shown.find((x) => GLOSS[x].cat === c);
        return `<div class="slot ${t ? 'filled' : ''}" style="--cc:${CATS[c].color}"><small>${CATS[c].label}${lv.optional.includes(c) ? ' (optional)' : ''}</small><b>${t || '…'}</b></div>`;
      })
      .join('<span class="sarrow">›</span>');
    $$('.chip').forEach((c) => {
      const used = L.tokens.includes(c.dataset.term);
      c.classList.toggle('used', used);
      c.setAttribute('aria-disabled', used);
    });
    $('#orderBtn').disabled = !L.tokens.length;
    $('#undoBtn').disabled = !L.tokens.length;
    $('#clearBtn').disabled = !L.tokens.length;
  }
  $('#phrase').addEventListener('click', (e) => {
    const b = e.target.closest('.tok');
    if (!b || modalOpen) return;
    L.tokens.splice(+b.dataset.i, 1);
    SFX.undo();
    renderOrder();
  });

  function hint() {
    if (!L || modalOpen) return;
    if (L.lv.kind === 'nasi') {
      L.hinted = true;
      setBubble(
        'Try: ' +
          nasiStage().a.join(' · ') +
          ' — ' +
          nasiStage()
            .a.map((t) => GLOSS[t].short)
            .join(', '),
      );
      return;
    }
    const a = L.lv.prompts[L.idx].a;
    let k = 0;
    while (k < L.tokens.length && k < a.length && L.tokens[k] === a[k]) k++;
    if (k < L.tokens.length) {
      L.hinted = true;
      setBubble(
        `Hmm, “${L.tokens[k]}” doesn’t fit there. Remove it and try again.`,
      );
    } else if (k < a.length) {
      L.hinted = true;
      setBubble(`Psst… next word means “${GLOSS[a[k]].short.toLowerCase()}”.`);
      const c = $(`.chip[data-term="${a[k]}"]`);
      if (c) {
        c.classList.remove('glow');
        void c.offsetWidth;
        c.classList.add('glow');
      }
    } else setBubble('Looks complete. Place the order!');
  }

  function confettiHTML() {
    const cols = ['#e04b3a', '#ffc93c', '#2e86de', '#1f8a5b', '#e85d9c'];
    return `<div class="confetti" aria-hidden="true">${Array.from({ length: 22 }, (_, i) => `<i style="left:${(i * 4.6 + Math.random() * 3).toFixed(1)}%;background:${cols[i % 5]};animation-delay:${(Math.random() * 0.35).toFixed(2)}s"></i>`).join('')}</div>`;
  }

  function submit() {
    if (!L || modalOpen || !L.tokens.length) return;
    const lv = L.lv,
      p = lv.prompts[L.idx];
    if (lv.kind === 'nasi') {
      nasiSubmit();
      return;
    }
    const r = evaluate(L.tokens, p.a);
    const isLast = L.idx === lv.prompts.length - 1;
    if (r.type === 'wrong') {
      L.tries++;
      SFX.bad();
      const comfort = pick(lv.comfort);
      setBubble(comfort);
      openModal(
        `<div class="fb-bad">
      <h2>Aiyo, not quite!</h2>
      <p class="npc-say"><b>${lv.npc}:</b> “${comfort}”</p>
      <div class="compare"><div class="you"><small>You said</small><div class="said">“${phrase(L.tokens)}”</div></div>
      <div class="right"><small>Say this instead</small><div class="said">“${phrase(p.a)}”</div></div></div>
      <ul class="notes">${feedbackNotes(L.tokens, p.a, lv)
        .map((n) => `<li>${n}</li>`)
        .join('')}</ul>
      <div class="row-btns"><button class="btn primary" data-act="retry" data-primary>Try again</button></div></div>`,
        { retry: retry, close: retry },
      );
      return;
    }
    const first = L.tries === 0;
    const { star, points: pts } = scoreOrder(
      L.tries,
      L.hinted,
      r.type === 'perfect',
    );
    L.score += pts;
    if (star) L.perfect++;
    L.results[L.idx] = star ? 'star' : 'ok';
    SFX.good();
    if (star) setTimeout(SFX.star, 420);
    renderStats();
    const said = phrase(L.tokens);
    let note = '';
    if (r.type === 'order')
      note = `<p class="tip">${lv.honor} understood you, but locals say it as ${lv.orderNote}: <b>${phrase(p.a)}</b> (you said “${said}”).</p>`;
    else if (L.hinted && first)
      note = `<p class="tip">You used a hint, so no star this time. Try it solo on a replay!</p>`;
    else if (!first)
      note = `<p class="tip">Got it on the retry. That’s how the lingo sticks.</p>`;
    openModal(
      `<div class="fb-good center">${confettiHTML()}
      <div class="served">${artFor(lv, p.a)}</div>
      <h2 style="margin-top:.5em">Swee! Order coming right up!</h2>
      <p class="npc-say"><b>${lv.npc}:</b> “${pick(lv.praise)}”</p>
      <div class="said">“${phrase(p.a)}”</div>
      <div class="breakdown">${p.a.map((t) => `<span class="bd" style="--cc:${catColor(t)}"><b>${t}</b> ${GLOSS[t].short.toLowerCase()}</span>`).join('')}</div>
      ${note}
      <div class="pts">+${pts} pts ${star ? '<span class="st">★ perfect</span>' : ''}</div>
      <div class="row-btns"><button class="btn primary" data-act="next" data-primary>${isLast ? 'Finish lesson' : 'Next customer'}</button></div></div>`,
      { next: nextPrompt, close: nextPrompt },
    );
  }
  function retry() {
    closeModal();
    L.tokens = [];
    renderOrder();
    setBubble('Try again. Listen to what they want.');
  }
  function nextPrompt() {
    closeModal();
    L.idx++;
    if (L.idx >= L.lv.prompts.length) {
      finishLevel();
      return;
    }
    renderPrompt();
  }

  function finishLevel() {
    const lv = L.lv,
      n = lv.prompts.length,
      p = L.perfect;
    const stars = lessonStars(p, n);
    const prev = levelSave(lv.id);
    save.levels[lv.id] = {
      done: true,
      stars: Math.max(prev.stars, stars),
      best: Math.max(prev.best, L.score),
    };
    persist();
    const allDone = LEVELS.every((l) => levelSave(l.id).done);
    renderStats();
    SFX.good();
    openModal(
      `<div class="center">${confettiHTML()}
    <h2>Lesson complete!</h2>
    <div class="bigstars" aria-label="${stars} of 3 stars">${starsHTML(stars)}</div>
    <p style="font-weight:800;margin:.2em 0">${p}/${n} perfect first-try orders · ${L.score} pts</p>
    <p class="npc-say"><b>${lv.npc}:</b> “${lv.kind === 'nasi' ? 'Well done! Come back and practise any time.' : stars === 3 ? 'Wah, confirm local! Next time kopi on the house.' : stars === 2 ? 'Not bad at all! Practise a bit more, can be perfect.' : 'Steady progress. Come back tomorrow, try again!'}”</p>
    ${allDone ? `<div class="unlock">🏅 You’ve cleared all three stalls. You’re officially a hawker regular!</div>` : ''}
    <div class="row-btns"><button class="btn ghost" data-act="replay">Replay lesson</button><button class="btn primary" data-act="hub" data-primary>Back to the centre</button></div></div>`,
      {
        hub: backToHub,
        close: backToHub,
        replay: () => {
          closeModal();
          openLesson(L.li);
        },
      },
    );
  }

  /* glossary */
  function openGlossary() {
    openModal(
      `<button class="icon-btn x-close" data-act="close" aria-label="Close">✕</button>
    <h2>Lingo guide</h2>
    <p class="npc-say">In a lesson, hover or long-press any chip to see its meaning.</p>
    ${LEVELS.map(
      (
        lv,
      ) => `<h3>${lv.stall} (${lv.type.toLowerCase()})</h3><div class="formula">${formulaHTML(lv)}</div>
      <table class="gloss-table">${lv.chips
        .filter((t) => LEVELS.indexOf(lv) === 0 || t !== 'Peng')
        .map(
          (t) =>
            `<tr><td>${tag(t)}</td><td><b>${GLOSS[t].short}</b><div class="d">${GLOSS[t].long}</div></td></tr>`,
        )
        .join('')}</table>`,
    ).join('')}
    <div class="row-btns"><button class="btn primary" data-act="close" data-primary>Got it</button></div>`,
      { close: closeModal },
    );
  }

  $('#backBtn').addEventListener('click', backToHub);
  $('#undoBtn').addEventListener('click', undo);
  $('#clearBtn').addEventListener('click', clearOrder);
  $('#hintBtn').addEventListener('click', hint);
  $('#orderBtn').addEventListener('click', submit);
  $('#lbGloss').addEventListener('click', openGlossary);
  addEventListener('keydown', (e) => {
    if (modalOpen || !$('#lesson').classList.contains('active') || !L) return;
    if (e.key === 'Enter' && !e.target.closest('button')) {
      e.preventDefault();
      submit();
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      undo();
    }
  });
  return { openLesson, openGlossary };
}
