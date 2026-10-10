import './encounter.css';
import { $ } from '../shared/dom.js';
import {
  addTopic,
  canAutoEncounter,
  escapeHTML,
  historyFor,
  load,
  MAX_MESSAGE,
  NOTES,
  practise,
  PREVIEW,
  store,
  transition,
  validateReply,
  withOpening,
} from './officeWorker.ts';

const TIMEOUT_MS = 20_000;

/**
 * Marcus's invitation, conversation and People I Met journal.
 * The three suggested questions always use authored replies. When
 * VITE_AI_URL is configured, typed questions go to the AI Lambda.
 */
export function createOfficeEncounter({
  openModal,
  closeModal,
  aiUrl = import.meta.env.VITE_AI_URL,
}) {
  const live = Boolean(aiUrl);
  let enc = load(),
    view = null,
    pending = false,
    error = '',
    draft = '',
    typed = false,
    request;

  function updateCount() {
    $('#peopleCount').textContent = enc.status === 'completed' ? '1' : '0';
    $('#meetMarcus').textContent =
      enc.status === 'new' ? 'Meet Marcus' : 'Visit Marcus';
  }
  function save() {
    store(enc);
    updateCount();
  }
  function close() {
    view = null;
    request?.abort();
    closeModal();
  }

  /** Called after Marcus reaches his table, or directly without the 3D world. */
  function offer() {
    enc = load();
    enc = transition(enc, enc.status === 'new' ? 'open' : 'revisit');
    save();
    view = 'invite';
    error = '';
    openModal(
      `<p class="eyebrow">LUNCH RUSH</p>
      <h2>A tissue packet, a saved seat.</h2>
      <p>Marcus, an office worker on a short lunch break, has left a tissue packet on one seat at this table.</p>
      <div class="row-btns"><button class="btn ghost" data-act="close">Not now</button><button class="btn primary" data-act="talk" data-primary>Talk to Marcus</button></div>`,
      {
        close: () => {
          enc = transition(enc, 'decline');
          save();
          close();
        },
        talk: () => {
          enc = withOpening(enc);
          save();
          chat();
        },
      },
    );
  }

  function turnHTML(t) {
    const who =
      t.role === 'user'
        ? '<b>You</b>'
        : `<b>Marcus</b> <small class="marcus-source">source: ${t.source === 'ai' ? 'ai' : 'scripted'}</small>`;
    return `<li class="marcus-turn ${t.role}">${who}<p>${escapeHTML(t.text)}</p></li>`;
  }

  function chat() {
    view = 'chat';
    const asked = new Set(
      enc.turns.filter((t) => t.role === 'user').map((t) => t.text),
    );
    const next = PREVIEW.findIndex((p) => !asked.has(p.question));
    const choices = PREVIEW.map(
      (p, i) =>
        `<button class="btn ghost marcus-choice" data-act="ask${i}" ${pending ? 'disabled' : ''} ${i === next && !pending ? 'data-primary' : ''}>${escapeHTML(p.question)}</button>`,
    ).join('');
    openModal(
      `<p class="eyebrow">MARCUS · OFFICE WORKER</p>
      <h2>Lunch with Marcus</h2>
      <p class="marcus-mode">${live ? 'Pick a suggested question, or ask Marcus anything about hawker food, ordering or Singlish. Typed questions get live AI replies, which can be wrong.' : 'Scripted preview: choose a question.'}</p>
      <ol class="marcus-log" aria-live="polite">${enc.turns.map(turnHTML).join('')}${pending ? '<li class="marcus-turn assistant pending"><b>Marcus</b><p>Thinking…</p></li>' : ''}</ol>
      <div class="marcus-choices" role="group" aria-label="Suggested questions">${choices}</div>
      <form class="marcus-form" novalidate>
        <label for="marcusInput">${live ? 'Ask Marcus' : 'Typing is off in the scripted preview'}</label>
        <div><input id="marcusInput" placeholder="${live ? 'e.g. What does shiok mean?' : ''}" maxlength="${MAX_MESSAGE}" autocomplete="off" ${live && !pending ? '' : 'disabled'} value="${escapeHTML(draft)}" /><button class="btn" type="submit" data-act="send" ${live && !pending ? '' : 'disabled'}>Send</button></div>
      </form>
      <p class="marcus-error" role="alert">${escapeHTML(error)}</p>
      <div class="row-btns"><button class="btn ghost" data-act="close">Close</button><button class="btn primary" data-act="save" ${next < 0 && !pending ? 'data-primary' : ''}>Save to People I Met</button></div>`,
      {
        close,
        save: () => {
          if (pending) return;
          enc = transition(enc, 'save');
          save();
          journal();
        },
        send: () => {},
        ...Object.fromEntries(PREVIEW.map((_, i) => [`ask${i}`, () => ask(i)])),
      },
    );
    const log = $('#sheet .marcus-log');
    log.scrollTop = log.scrollHeight;
    const input = $('#marcusInput');
    // After a typed question, return focus to the box rather than a choice.
    if (typed && !input.disabled) setTimeout(() => input.focus(), 40);
    input.addEventListener('input', () => (draft = input.value));
    $('#sheet .marcus-form').addEventListener('submit', (event) => {
      event.preventDefault();
      send(input.value);
    });
  }

  function ask(i) {
    if (pending) return;
    typed = false;
    const p = PREVIEW[i];
    error = '';
    enc.turns.push(
      { role: 'user', text: p.question, source: 'player' },
      { role: 'assistant', text: p.reply, source: 'scripted' },
    );
    enc = addTopic(enc, p.topic);
    save();
    chat();
  }

  async function send(raw) {
    const message = raw.trim();
    if (!live || pending) return;
    typed = true;
    if (!message) {
      error = 'Type a question first.';
      return chat();
    }
    if (message.length > MAX_MESSAGE) {
      error = `Keep it under ${MAX_MESSAGE} characters.`;
      return chat();
    }
    pending = true;
    error = '';
    chat();
    const ctrl = new AbortController();
    request = ctrl;
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let result = null;
    try {
      const res = await fetch(aiUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'marcus',
          message,
          history: historyFor(enc.turns),
        }),
        signal: ctrl.signal,
      });
      if (res.ok) result = validateReply(await res.json());
    } catch {
      // Network error, timeout or invalid JSON: handled below.
    } finally {
      clearTimeout(timer);
      pending = false;
      if (request === ctrl) request = undefined;
    }
    if (result) {
      enc.turns.push(
        { role: 'user', text: message, source: 'player' },
        { role: 'assistant', text: result.reply, source: 'ai' },
      );
      enc = addTopic(enc, result.action);
      draft = '';
      save();
    } else
      error =
        "Marcus couldn't reply just now. Your conversation is kept; try again or pick a suggested question.";
    if (view === 'chat') chat();
  }

  function journal() {
    enc = load();
    view = 'journal';
    const met = enc.status === 'completed';
    const notes = enc.topics.length
      ? `<ul class="marcus-notes">${enc.topics.map((t) => `<li>${escapeHTML(NOTES[t])}</li>`).join('')}</ul>`
      : '<p class="marcus-muted">No learning notes yet. Ask Marcus about chope, sharing or courtesy to add some.</p>';
    const body = met
      ? `<article class="marcus-card">
          <h3>Marcus</h3>
          <p class="marcus-muted">Fictional office worker on a lunch break. He speaks for himself, not for all Singaporeans.</p>
          <h4>Learning notes</h4>${notes}
          <details><summary>Conversation (${enc.turns.length} lines)</summary><ol class="marcus-log">${enc.turns.map(turnHTML).join('')}</ol></details>
        </article>
        <div class="row-btns"><button class="btn ghost" data-act="clear">Clear journal</button><button class="btn ghost" data-act="practise">Practise again</button><button class="btn primary" data-act="close" data-primary>Close</button></div>`
      : `<p class="marcus-muted">No one yet. Marcus is saving a seat near the entrance.</p>
        <div class="row-btns"><button class="btn primary" data-act="close" data-primary>Close</button></div>`;
    openModal(`<p class="eyebrow">JOURNAL</p><h2>People I Met</h2>${body}`, {
      close,
      practise: () => {
        enc = withOpening(practise(enc));
        error = '';
        draft = '';
        save();
        chat();
      },
      clear: () => {
        enc = transition(enc, 'clear');
        save();
        journal();
      },
    });
  }

  const onPeople = () => journal();
  $('#peopleBtn').addEventListener('click', onPeople);
  updateCount();
  return {
    offer,
    journal,
    canEncounter: () => canAutoEncounter(load()),
    met: () => load().status !== 'new',
    dispose: () => {
      request?.abort();
      $('#peopleBtn').removeEventListener('click', onPeople);
    },
  };
}
