import { $ } from '../shared/dom.js';
import { GLOSS } from '../content/lessons.ts';
let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 3200);
}

let modalOpen = false,
  modalActs = {};
let previousFocus;
function openModal(html, acts = {}) {
  hideTip();
  if (!modalOpen) previousFocus = document.activeElement;
  $('#sheet').innerHTML = html;
  modalActs = acts;
  modalOpen = true;
  $('#modal').hidden = false;
  document.querySelectorAll('.screen').forEach((screen) => {
    screen.inert = true;
  });
  const title = $('#sheet h2');
  if (title) {
    title.id = 'dialogTitle';
    $('#sheet').setAttribute('aria-labelledby', title.id);
  }
  const f = $('#sheet [data-primary]') || $('#sheet button');
  if (f) setTimeout(() => f.focus({ preventScroll: true }), 30);
}
function closeModal() {
  $('#modal').hidden = true;
  modalOpen = false;
  modalActs = {};
  document.querySelectorAll('.screen').forEach((screen) => {
    screen.inert = false;
  });
  if (previousFocus?.isConnected && previousFocus.getClientRects().length)
    previousFocus.focus({ preventScroll: true });
}
$('#sheet').addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  const controls = [
    ...$('#sheet').querySelectorAll(
      'button:not(:disabled), a[href], input, [tabindex="0"]',
    ),
  ];
  const first = controls[0],
    last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
});
$('#sheet').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (b && modalActs[b.dataset.act]) modalActs[b.dataset.act]();
});
$('#modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal' && modalActs.close) modalActs.close();
});

/* tooltip */
const tipEl = $('#tooltip');
function showTip(el, term) {
  const g = GLOSS[term];
  tipEl.innerHTML = `<b>${term}</b><em>${g.short}</em><small>${g.long}</small>`;
  tipEl.classList.add('show');
  const r = el.getBoundingClientRect(),
    tr = tipEl.getBoundingClientRect();
  let left = r.left + r.width / 2 - tr.width / 2;
  left = Math.max(8, Math.min(left, innerWidth - tr.width - 8));
  let top = r.top - tr.height - 10;
  if (top < 8) top = r.bottom + 10;
  tipEl.style.left = left + 'px';
  tipEl.style.top = top + 'px';
}
function hideTip() {
  tipEl.classList.remove('show');
}

export { toast, modalOpen, modalActs, openModal, closeModal, showTip, hideTip };
