const SAVE_KEY = 'hawker-lingo-v1';
let save = (() => {
  try {
    const r = localStorage.getItem(SAVE_KEY);
    if (r) {
      const s = JSON.parse(r);
      if (s && s.levels) return s;
    }
  } catch {
    /* Storage may be unavailable in private browsing. */
  }
  return { levels: {}, sound: true };
})();
const persist = () => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    /* Storage may be unavailable in private browsing. */
  }
};
const levelSave = (id) => save.levels[id] || { done: false, stars: 0, best: 0 };
const unlocked = () => true;

export { save, persist, levelSave, unlocked };
