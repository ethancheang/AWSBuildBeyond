import { save } from '../state/progress.ts';
let actx = null;
function beep(freqs, dur = 0.09, type = 'triangle', gap = 0.07, vol = 0.07) {
  if (!save.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const t0 = actx.currentTime;
    freqs.forEach((f, i) => {
      const o = actx.createOscillator(),
        g = actx.createGain();
      o.type = type;
      o.frequency.value = f;
      const t = t0 + i * gap;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(actx.destination);
      o.start(t);
      o.stop(t + dur + 0.03);
    });
  } catch {
    /* Sound is optional; lessons remain usable without audio. */
  }
}
const SFX = {
  pop: () => beep([700], 0.06),
  undo: () => beep([420], 0.06),
  good: () => beep([523, 659, 784, 1047], 0.16, 'triangle', 0.09),
  bad: () => beep([330, 247], 0.2, 'sine', 0.15),
  star: () => beep([988, 1319], 0.12, 'square', 0.08, 0.04),
};

export { beep, SFX };
