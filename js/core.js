'use strict';
/* ============================================================
   Core: utilities, storage, language, pitch & key theory
   ============================================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const mod = (a, n) => ((a % n) + n) % n;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const chance = p => Math.random() < p;

function wpick(pairs) {
  let tot = 0;
  for (const p of pairs) tot += p[1];
  let r = Math.random() * tot;
  for (const p of pairs) { r -= p[1]; if (r < 0) return p[0]; }
  return pairs[pairs.length - 1][0];
}

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return e;
}

const store = {
  get(k, def) {
    try { const v = localStorage.getItem('sdt:' + k); return v == null ? def : JSON.parse(v); }
    catch (e) { return def; }
  },
  set(k, v) { try { localStorage.setItem('sdt:' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
};

/* ---------- language ---------- */
let LANG = store.get('lang', ((navigator.language || 'de').toLowerCase().startsWith('de') ? 'de' : 'en'));
function t(key, vars) {
  let s = (I18N[LANG] && I18N[LANG][key]) ?? I18N.de[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
  return s;
}

/* ---------- pitch ----------
   A note is {d, a}: d = diatonic index (octave*7 + step, C4 = 28), a = alteration (-2..2) */
const STEP_PC = [0, 2, 4, 5, 7, 9, 11];
const ACC_VF = { '-2': 'bb', '-1': 'b', '0': 'n', '1': '#', '2': '##' };
const ACC_TXT = { '-2': '♭♭', '-1': '♭', '0': '♮', '1': '♯', '2': '×' };

const Note = {
  step: n => mod(n.d, 7),
  oct: n => Math.floor(n.d / 7),
  natMidi: d => 12 * (Math.floor(d / 7) + 1) + STEP_PC[mod(d, 7)],
  midi: n => 12 * (Math.floor(n.d / 7) + 1) + STEP_PC[mod(n.d, 7)] + n.a,
  vfKey: n => 'cdefgab'[mod(n.d, 7)] + '/' + Math.floor(n.d / 7),
  eq: (x, y) => !!x && !!y && x.d === y.d && x.a === y.a,
  sameMidi: (x, y) => !!x && !!y && Note.midi(x) === Note.midi(y),
  // spell a midi number with a given diatonic index
  spell(m, d) { return { d, a: m - Note.natMidi(d) }; },
  // nearest diatonic index with the given step to a reference index
  nearestStep(step, refD) {
    const base = refD - mod(refD, 7) + step;
    return [base - 7, base, base + 7].reduce((b, c) => Math.abs(c - refD) < Math.abs(b - refD) ? c : b);
  }
};

function nameDE(step, a) {
  const base = 'CDEFGAH'[step];
  if (step === 6 && a < 0) return a === -1 ? 'B' : 'Heses';
  if (a > 0) return base + 'is'.repeat(a);
  if (a < 0) return (base === 'E' || base === 'A') ? base + 's' + 'es'.repeat(-a - 1) : base + 'es'.repeat(-a);
  return base;
}
function nameEN(step, a) {
  return 'CDEFGAB'[step] + ({ '-2': '♭♭', '-1': '♭', '0': '', '1': '♯', '2': '×' })[a];
}
// Helmholtz names in German (c¹, fis², B), scientific names in English (C4, F♯5)
function noteName(n, withOct = true) {
  const s = Note.step(n), o = Note.oct(n);
  if (LANG === 'de') {
    let nm = nameDE(s, n.a);
    if (!withOct) return nm;
    if (o <= 2) return o === 2 ? nm : nm + (o === 1 ? '₁' : '₂');
    nm = nm.toLowerCase();
    return o === 3 ? nm : nm + ['', '', '', '', '¹', '²', '³', '⁴'][o];
  }
  return nameEN(s, n.a) + (withOct ? o : '');
}

/* ---------- keys ---------- */
const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6];
const FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3];
const NO_SIG = [0, 0, 0, 0, 0, 0, 0];

function makeKey(fifths, minor) {
  let step = mod(4 * fifths, 7), pc = mod(7 * fifths, 12);
  if (minor) { step = mod(step + 5, 7); pc = mod(pc - 3, 12); }
  const alt = mod(pc - STEP_PC[step] + 6, 12) - 6;
  const sig = NO_SIG.slice();
  if (fifths > 0) SHARP_ORDER.slice(0, fifths).forEach(s => { sig[s] = 1; });
  if (fifths < 0) FLAT_ORDER.slice(0, -fifths).forEach(s => { sig[s] = -1; });
  const vf = 'CDEFGAB'[step] + (alt > 0 ? '#' : alt < 0 ? 'b' : '') + (minor ? 'm' : '');
  return { fifths, minor, step, alt, pc, sig, vf };
}
function keyName(k) {
  if (LANG === 'de') {
    const nm = nameDE(k.step, k.alt);
    return k.minor ? nm.toLowerCase() + '-Moll' : nm + '-Dur';
  }
  return nameEN(k.step, k.alt) + (k.minor ? ' minor' : ' major');
}
const lastKeys = {};
function randomKey(maxAcc, modeSel, who = '') {
  for (let i = 0; i < 20; i++) {
    const minor = modeSel === 'min' ? true : modeSel === 'maj' ? false : chance(0.5);
    const k = makeKey(rnd(2 * maxAcc + 1) - maxAcc, minor);
    if (k.vf !== lastKeys[who] || maxAcc === 0 && modeSel !== 'both') { lastKeys[who] = k.vf; return k; }
  }
  return makeKey(0, false);
}
// scale-degree note: tonic diatonic index T, degree offset k (any integer)
function degNote(key, T, k) { const d = T + k; return { d, a: key.sig[mod(d, 7)] }; }

/* ---------- intervals ---------- */
function intervalInfo(n1, n2) {
  const steps = Math.abs(n2.d - n1.d), semis = Math.abs(Note.midi(n2) - Note.midi(n1));
  const simple = steps % 7, octs = Math.floor(steps / 7);
  const diff = semis - (STEP_PC[simple] + 12 * octs);
  const perfect = simple === 0 || simple === 3 || simple === 4;
  const q = perfect
    ? ({ '0': 'P', '1': 'A', '-1': 'd', '2': 'AA', '-2': 'dd' })[diff]
    : ({ '0': 'M', '-1': 'm', '1': 'A', '-2': 'd', '2': 'AA', '-3': 'dd' })[diff];
  return { num: steps + 1, q: q || '?', semis, up: n2.d > n1.d };
}
const IV_NUM_DE = ['', 'Prime', 'Sekunde', 'Terz', 'Quarte', 'Quinte', 'Sexte', 'Septime', 'Oktave',
  'None', 'Dezime', 'Undezime', 'Duodezime', 'Tredezime', 'Quartdezime', 'Doppeloktave'];
const IV_Q_DE = { P: 'reine', M: 'große', m: 'kleine', A: 'übermäßige', d: 'verminderte', AA: 'doppelt übermäßige', dd: 'doppelt verminderte' };
const IV_Q_EN = { P: 'perfect', M: 'major', m: 'minor', A: 'augmented', d: 'diminished', AA: 'doubly augmented', dd: 'doubly diminished' };
const ordinal = n => n + ((n % 10 === 1 && n !== 11) ? 'st' : (n % 10 === 2 && n !== 12) ? 'nd' : (n % 10 === 3 && n !== 13) ? 'rd' : 'th');
function intervalName(iv) {
  if (iv.q === '?') return LANG === 'de' ? 'ungewöhnliches Intervall' : 'unusual interval';
  if (LANG === 'de') return `${IV_Q_DE[iv.q]} ${IV_NUM_DE[iv.num] || iv.num + '.'}`;
  const num = iv.num === 1 ? 'unison' : iv.num === 8 ? 'octave' : iv.num === 15 ? 'double octave' : ordinal(iv.num);
  return `${IV_Q_EN[iv.q]} ${num}`;
}

/* ---------- measure accidentals ----------
   alteration a note at diatonic index d is read as, given earlier notes of the same measure */
function readAlt(prevNotes, d, sig) {
  let a = sig[mod(d, 7)];
  for (const n of prevNotes) if (n && n.d === d) a = n.a;
  return a;
}
// mark which events need a printed accidental (ev.acc), per measure
function markAccidentals(events, sig) {
  const state = {};
  for (const ev of events) {
    ev.acc = null;
    if (!ev.note) continue;
    const d = ev.note.d;
    const cur = d in state ? state[d] : sig[mod(d, 7)];
    if (ev.note.a !== cur) { ev.acc = ev.note.a; state[d] = ev.note.a; }
  }
}

/* No progress tracking: results are shown once and never stored. Remove anything older versions saved. */
function statAdd() {}
try { Object.keys(localStorage).filter(k => /^sdt:(stats:|day:)/.test(k)).forEach(k => localStorage.removeItem(k)); } catch (e) { /* storage blocked */ }
