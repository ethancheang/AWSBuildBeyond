const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
let _uid = 0;
const uid = () => 'u' + ++_uid;
const shuffle = (a) => {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pick = (a) => a[(Math.random() * a.length) | 0];

export { $, $$, uid, shuffle, pick };
