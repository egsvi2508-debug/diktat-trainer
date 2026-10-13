'use strict';
/* ============================================================
   Generators (no screen code), shared by Einheit 1 and 2:
     • church modes, transposed with the signature of the parent major key
     • step melodies – seconds or thirds – random but varied, no "double repetitions"
     • motif bars: orderings of four notes of a mode
     • modal sequences: a four-note figure moved step by step through a mode
     • two-part writing in 1:1 and 2:1 on the white keys
     • notes, intervals and triads heard against a context chord
   ============================================================ */

/* ---------- small helpers ---------- */
function wpickBy(items, weight) {
  let tot = 0;
  const ws = items.map(x => { const w = Math.max(0, weight(x)); tot += w; return w; });
  if (tot <= 0) return items[rnd(items.length)];
  let r = Math.random() * tot;
  for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r < 0) return items[i]; }
  return items[items.length - 1];
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// spellings that read easily: at most one ♯ or ♭, and no E♯, H♯, F♭, C♭
function plainSpelling(n) {
  const s = mod(n.d, 7);
  if (Math.abs(n.a) > 1) return false;
  if (n.a === 1 && (s === 2 || s === 6)) return false;
  if (n.a === -1 && (s === 3 || s === 0)) return false;
  return true;
}
// the note with this step and alteration that sounds as `midi`
function noteAt(midi, step, a) { return { d: 7 * ((midi - STEP_PC[step] - a) / 12 - 1) + step, a }; }

/* ---------- church modes ----------
   mode index = degree of the parent major scale (0 ionisch … 6 lokrisch); G-dorisch keeps the one flat of F-Dur */
const MODE_DE = ['ionisch', 'dorisch', 'phrygisch', 'lydisch', 'mixolydisch', 'äolisch', 'lokrisch'];
const MODE_EN = ['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian'];
function makeMode(m, fifths = 0) {
  const k = makeKey(fifths, false), step = mod(k.step + m, 7), alt = k.sig[step];
  return { ...k, mode: m, step, alt, pc: mod(STEP_PC[step] + alt, 12), minor: false };
}
function modeName(k) {
  return LANG === 'de' ? nameDE(k.step, k.alt) + '-' + MODE_DE[k.mode] : nameEN(k.step, k.alt) + ' ' + MODE_EN[k.mode];
}
const lastModes = {};
// m = 0…6, or -1 for any mode; maxAcc = 0 keeps the white-key position (D-dorisch, E-phrygisch …)
function randomMode(m, maxAcc, who) {
  for (let i = 0; i < 30; i++) {
    const k = makeMode(m < 0 ? rnd(7) : m, maxAcc ? rnd(2 * maxAcc + 1) - maxAcc : 0);
    const id = k.mode + ':' + k.fifths;
    if (id !== lastModes[who] || (m >= 0 && !maxAcc)) { lastModes[who] = id; return k; }
  }
  return makeMode(m < 0 ? 1 : m, 0);
}
// ranges in scale steps from the final: up to the 4th, 5th, 6th, octave, or plagal (4th below to 5th above)
const MODE_RANGES = { q4: [0, 3], q5: [0, 4], q6: [0, 5], q8: [0, 7], plag: [-3, 4] };
// diatonic index of the final so that the range [lo, hi] sits well on the staff (treble around G4/A4, bass around F3)
function placeFinal(k, lo, hi, clef) {
  const target = clef === 'bass' ? 23.5 : 32.5;
  let best = null;
  for (let o = 1; o <= 6; o++) {
    const f = o * 7 + k.step, c = f + (lo + hi) / 2;
    if (!best || Math.abs(c - target) < Math.abs(best.c - target) - 1e-9) best = { f, c };
  }
  return best.f;
}
function modeNote(k, f, off) { const d = f + off; return { d, a: k.sig[mod(d, 7)] }; }
// a mode's scale (up and down, from the final) for the info chip
function modeScaleEvents(k, f) {
  const ev = [], up = [0, 1, 2, 3, 4, 5, 6, 7], seq = up.concat(up.slice(0, -1).reverse());
  seq.forEach((o, i) => ev.push({ t: i * 0.36, midi: Note.midi(modeNote(k, f, o)), dur: i === seq.length - 1 ? 1.4 : 0.4, vel: i % 7 === 0 ? 0.7 : 0.6 }));
  return ev;
}

/* ---------- step melodies (seconds or thirds) ----------
   o: { n, size: 2 (seconds) | 3 (thirds), lo, hi (midi), key (null = free, any accidentals), start,
        ambitus (largest span in semitones, optional), chroma (also chromatic half steps c–cis; free seconds only),
        endTonic (key only) }
   Random but varied: never A-B-A-B, no figure repeated straight away, the same three or four notes not
   again soon, whole and half steps (minor and major thirds) in balance, no long runs in one direction or
   of one step size, plain spellings only (no double accidentals, no E♯/H♯/F♭/C♭). */
function stepCost(M, m, c, o, prev) {
  const n = M.length, last = M[n - 1], iv = m - last;
  let s = 0;
  if (n >= 3 && m === M[n - 2] && last === M[n - 3]) return 99;             // A-B-A-B
  if (n >= 2 && m === M[n - 2]) s += 1.3;                                     // straight back: A-B-A
  const ivs = [];
  for (let i = 1; i < n; i++) ivs.push(M[i] - M[i - 1]);
  ivs.push(iv);
  const L = ivs.length;
  for (const k of [2, 3, 4]) {                                                // the same figure twice in a row
    if (L >= 2 * k && ivs.slice(L - k).every((x, j) => x === ivs[L - 2 * k + j])) s += 2 + k;
  }
  const seq = M.concat([m]), N = seq.length;
  if (N >= 4) {                                                               // the same three notes again soon
    for (let j = N - 4; j >= 0 && j >= N - 15; j--) {
      if (seq[j] === seq[N - 3] && seq[j + 1] === seq[N - 2] && seq[j + 2] === seq[N - 1]) { s += N - 3 - j <= 6 ? 2.2 : 1; break; }
    }
  }
  if (N >= 5) {                                                               // the same four notes ever again
    for (let j = 0; j <= N - 5; j++) {
      if (seq[j] === seq[N - 4] && seq[j + 1] === seq[N - 3] && seq[j + 2] === seq[N - 2] && seq[j + 3] === seq[N - 1]) { s += 3; break; }
    }
  }
  let run = 0;
  for (let i = L - 1; i >= 0 && Math.sign(ivs[i]) === Math.sign(iv); i--) run++;
  if (run > 4) s += 1.6 * (run - 4);
  let size = 0;
  for (let i = L - 1; i >= 0 && Math.abs(ivs[i]) === Math.abs(iv); i--) size++;
  if (size > 3) s += 1.2 * (size - 3);
  let zig = 0;
  for (let i = L - 1; i >= 1 && Math.sign(ivs[i]) !== Math.sign(ivs[i - 1]); i--) zig++;
  if (zig >= 4) s += 0.8 * (zig - 3);
  if (L >= 6) {
    const small = ivs.filter(x => Math.abs(x) === (o.size === 3 ? 3 : 1)).length;
    s += Math.abs(small / L - 0.5) * 2.5;
  }
  if (!o.key && c.a !== 0) s += 0.3;
  if (c.d === prev.d) s += 1.1;                                               // chromatic half step (c–cis): now and then
  const mid = (o.lo + o.hi) / 2, half = Math.max(1, (o.hi - o.lo) / 2);
  s += Math.max(0, Math.abs(m - mid) / half - 0.6) * 1.5;
  return s;
}
function stepMelody(o) {
  const semis = o.size === 3 ? [3, 4] : [1, 2], dStep = o.size === 3 ? 2 : 1;
  const next = prev => {
    const out = [];
    for (const dir of [1, -1]) {
      const d = prev.d + dir * dStep;
      for (const a of o.key ? [o.key.sig[mod(d, 7)]] : [-1, 0, 1]) {
        const n = { d, a };
        if (semis.includes((Note.midi(n) - Note.midi(prev)) * dir) && (o.key || plainSpelling(n))) out.push(n);
      }
      if (o.chroma && !o.key && o.size !== 3) {
        const n = { d: prev.d, a: prev.a + dir };
        if (plainSpelling(n)) out.push(n);
      }
    }
    return out;
  };
  let best = null, bestCost = Infinity;
  for (let attempt = 0; attempt < 300; attempt++) {
    const notes = [o.start], M = [Note.midi(o.start)];
    let lo = M[0], hi = M[0], total = 0, ok = true;
    for (let i = 1; i < o.n; i++) {
      const list = [];
      for (const c of next(notes[i - 1])) {
        const m = Note.midi(c);
        if (m < o.lo || m > o.hi) continue;
        if (o.ambitus && Math.max(hi, m) - Math.min(lo, m) > o.ambitus) continue;
        const s = stepCost(M, m, c, o, notes[i - 1]);
        if (s < 50) list.push({ c, m, s });
      }
      if (!list.length) { ok = false; break; }
      const p = wpickBy(list, x => Math.exp(-1.15 * x.s) * (0.55 + Math.random()));
      notes.push(p.c); M.push(p.m); total += p.s;
      lo = Math.min(lo, p.m); hi = Math.max(hi, p.m);
    }
    if (!ok) continue;
    const endsWell = !o.endTonic || !o.key || mod(notes[notes.length - 1].d, 7) === o.key.step;
    if (endsWell && total / o.n < 1.2) return notes;
    const score = total / o.n + (endsWell ? 0 : 5);
    if (score < bestCost) { best = notes; bestCost = score; }
  }
  return best;
}

/* ---------- motif bars ----------
   pool: scale steps (from the final) the bars are made of. Every bar holds four different notes – with a
   pool of exactly four a new ordering of the same four notes each time (24 orderings exist), with a
   larger pool any four of them. No bar twice, no note held over a bar line, neighbouring bars start on
   different notes and share few positions, the final opens the first bar and closes the last one (when it
   is in the pool), every note of the pool is used about equally often, big leaps are rare. */
function motifBars(pool, nBars) {
  const perms = [];
  (function rec(acc) {
    if (acc.length === 4) { perms.push(acc.slice()); return; }
    for (const x of pool) if (!acc.includes(x)) { acc.push(x); rec(acc); acc.pop(); }
  })([]);
  if (nBars > perms.length) nBars = perms.length;
  const hasFinal = pool.includes(0), big = pool.length > 4, key = p => p.join(',');
  const sorted = p => p.slice().sort((x, y) => x - y).join(',');
  for (let attempt = 0; attempt < 16; attempt++) {
    const relax = attempt >= 8;
    const bars = [], used = new Set(), cnt = new Map(pool.map(x => [x, 0]));
    let nodes = 0;
    const ok = (p, b) => {
      const prev = bars[b - 1];
      if (used.has(key(p))) return false;
      if (b === 0 && hasFinal && p[0] !== 0) return false;
      if (b === nBars - 1 && hasFinal && p[3] !== 0) return false;
      if (prev && p[0] === prev[3]) return false;
      if (prev && !relax && p[0] === prev[0]) return false;
      return true;
    };
    const cost = (p, b) => {
      const prev = bars[b - 1];
      let s = 0;
      if (prev) {
        for (let i = 0; i < 4; i++) if (p[i] === prev[i]) s += 1.1;
        if (big && sorted(p) === sorted(prev)) s += 1.4;
        s += Math.max(0, Math.abs(p[0] - prev[3]) - 5) * 0.8;
      }
      for (let i = 1; i < 4; i++) s += Math.max(0, Math.abs(p[i] - p[i - 1]) - 5) * 0.6;
      if (big) { const avg = b * 4 / pool.length; for (const x of p) s += Math.max(0, cnt.get(x) - avg) * 0.35; }
      return s;
    };
    const dfs = b => {
      if (b === nBars) return true;
      if (++nodes > 20000) return false;
      const cs = [];
      for (const p of perms) if (ok(p, b)) cs.push({ p, w: Math.exp(-cost(p, b)) * (0.35 + Math.random()) });
      cs.sort((x, y) => y.w - x.w);
      for (const { p } of cs.slice(0, 8)) {
        bars.push(p); used.add(key(p)); p.forEach(x => cnt.set(x, cnt.get(x) + 1));
        if (dfs(b + 1)) return true;
        bars.pop(); used.delete(key(p)); p.forEach(x => cnt.set(x, cnt.get(x) - 1));
      }
      return false;
    };
    if (dfs(0)) return bars;
  }
  // practically unreachable – plain random orderings
  return Array.from({ length: nBars }, () => shuffle(pool.slice()).slice(0, 4));
}
// every 4-note choice from a range (for the motif picker)
function motifChoices(lo, hi) {
  const out = [], r = [];
  for (let x = lo; x <= hi; x++) r.push(x);
  (function rec(i, acc) {
    if (acc.length === 4) { out.push(acc.slice()); return; }
    for (let j = i; j < r.length; j++) { acc.push(r[j]); rec(j + 1, acc); acc.pop(); }
  })(0, []);
  return out;
}

/* ---------- modal sequences ----------
   A four-note figure (in scale steps) moved bar by bar through the mode – mostly by step, sometimes by
   a third, turning at the edges of the range. The half steps fall in a different place in every bar:
   that is what you listen for. The last note is the final. No bar comes back two bars later. */
const PATTERNS = [[0, 1, 2, 0], [0, 1, 2, 3], [0, 2, 1, 3], [0, 2, 1, 0], [0, -1, 1, 0], [0, 1, -1, 0], [0, 2, 4, 2],
  [0, 4, 2, 0], [0, 1, 3, 2], [0, 3, 2, 1], [0, 2, 3, 1], [0, 4, 3, 2], [0, -1, -2, -1], [0, -1, -2, -3]];
function patternBars(nBars, lo, hi, mixed) {
  const fits = (p, s) => p.every(x => s + x >= lo && s + x <= hi);
  let best = null;
  for (let attempt = 0; attempt < 800; attempt++) {
    const first = pick(PATTERNS);
    const startOpts = [0, 7, -7, 2, 4].filter(s => fits(first, s));
    if (!startOpts.length) continue;
    const bars = [{ pat: first, start: startOpts[0] }];
    let dir = chance(0.5) ? 1 : -1, run = 1, ok = true;
    for (let b = 1; b < nBars && ok; b++) {
      const prev = bars[b - 1];
      const pats = mixed ? PATTERNS.filter(p => p !== prev.pat) : [prev.pat];
      const opts = [];
      for (const p of pats) {
        for (const st of [1, 2]) for (const dd of [dir, -dir]) {
          const s = prev.start + dd * st;
          if (!fits(p, s)) continue;
          const back = bars[b - 2];
          if (back && back.start === s && back.pat === p) continue;           // no bar again two bars later
          let w = st === 1 ? 6 : 1;
          if (dd === dir) w *= run >= 4 ? 0.3 : 3; else w *= run <= 1 ? 0.15 : 1;
          if (mixed) w /= pats.length;
          opts.push({ p, s, dd, w });
        }
      }
      if (!opts.length) { ok = false; break; }
      const c = wpickBy(opts, x => x.w);
      if (c.dd === dir) run++; else { dir = c.dd; run = 1; }
      bars.push({ pat: c.p, start: c.s });
    }
    if (!ok) continue;
    const lastBar = bars[bars.length - 1];
    if (mod(lastBar.start + lastBar.pat[3], 7) === 0) return bars;
    if (!best) best = bars;
  }
  return best || Array.from({ length: nBars }, (_, b) => ({ pat: PATTERNS[0], start: b % 3 }));
}

/* ---------- two-part writing on the white keys ----------
   Upper voice in the treble, lower voice in the bass. Per half bar the voices either move together
   (two halves or four quarters, 1:1) or one voice has two quarters against a half note (2:1) – nothing
   else. The last bar is a whole note in both voices on the final, reached by 7–8 over 2–1 (or 2–1 over
   7–1). Every note struck together is consonant (3rds, 6ths, 5ths, octaves and their compounds);
   a dissonance appears only as a passing note on a weak quarter. No parallel or contrary fifths and
   octaves (also not from strong beat to strong beat), no hidden ones with a leap in the upper voice,
   mostly steps, leaps turned back by step, no tritone, no repeated notes. */
const TWO_PATS = ['HH', 'QQ', 'UQ', 'LQ'];
const TWO_UR = [28, 38], TWO_LR = [17, 27];
function twoPats(S) {
  for (let tries = 0; tries < 50; tries++) {
    const out = [];
    for (let s = 0; s < S - 1; s++) {
      let c = TWO_PATS.map(p => [p, p === 'HH' ? 0.8 : p === 'QQ' ? 0.9 : 1.4]);
      if (out.length >= 2 && out[out.length - 1] === out[out.length - 2]) c = c.filter(([p]) => p !== out[out.length - 1]);
      out.push(wpick(c));
    }
    out.push('HH');
    if (S < 6 || (out.includes('UQ') && out.includes('LQ'))) return out;
  }
  return Array(S).fill('HH');
}
function twoVoice(nBars, center) {
  const tonic = center === 'a' ? 5 : 0;
  const inR = (d, r) => d >= r[0] && d <= r[1];
  const semis = (a, b) => Note.natMidi(b) - Note.natMidi(a);
  const cls = h => mod(h, 7);
  const perfect = (l, u) => { const c = cls(u - l); return c === 0 || (c === 4 && mod(semis(l, u), 12) === 7); };
  const cons = (l, u) => { const c = cls(u - l); return c === 2 || c === 5 || perfect(l, u); };
  const finals = [];
  [14, 21, 28].map(d => d + tonic).filter(d => inR(d, TWO_LR)).forEach(l => [21, 28, 35, 42].map(d => d + tonic)
    .filter(u => inR(u, TWO_UR) && (u - l === 7 || u - l === 14)).forEach(u => finals.push([u, l])));
  const melOK = (A, n, R, pend) => {
    if (!inR(n, R)) return false;
    if (!A.length) return true;
    const p = A[A.length - 1], dd = n - p, ad = Math.abs(dd);
    if (ad === 0 || ad === 5 || ad === 6 || ad > 7) return false;
    if (Math.abs(semis(p, n)) === 6) return false;
    if (pend && dd !== pend) return false;
    if (A.length >= 2) {
      const pd = p - A[A.length - 2], apd = Math.abs(pd);
      if (apd >= 3 && !(ad === 1 && Math.sign(dd) === -Math.sign(pd))) return false;
      if (apd >= 2 && ad >= 2 && Math.sign(pd) === Math.sign(dd) && apd + ad > 4) return false;
      if (A.length >= 3 && Math.abs(A[A.length - 2] - A[A.length - 3]) >= 2 && apd >= 2 && ad >= 2) return false;
    }
    return true;
  };
  const melCost = (A, n) => {
    if (!A.length) return 0;
    let c = [0, 0, 0.45, 1.1, 1.5, 9, 9, 2.6][Math.abs(n - A[A.length - 1])];
    if (A.length >= 2 && n === A[A.length - 2]) c += 0.7;
    return c;
  };
  for (let attempt = 0; attempt < 80; attempt++) {
    const S = nBars * 2 - 2;
    const pats = attempt < 60 ? twoPats(S) : Array(S).fill('HH');
    const [fu, fl] = pick(finals);
    const cads = [[fu - 1, fl + 1], [fu + 1, fl - 1]].filter(([u, l]) => inR(u, TWO_UR) && inR(l, TWO_LR) && cons(l, u));
    if (!cads.length) continue;
    const cad = pick(cads);
    const lStart = pick([14, 21, 28].map(d => d + tonic).filter(d => inR(d, TWO_LR)));
    const uStarts = [];
    for (let u = TWO_UR[0]; u <= TWO_UR[1]; u++) { const h = u - lStart; if (h >= 7 && h <= 16 && [0, 2, 4].includes(cls(h)) && cons(lStart, u)) uStarts.push(u); }
    const uStart = wpickBy(uStarts, u => cls(u - lStart) === 0 ? 2 : 1);
    const levels = [];
    pats.forEach((p, s) => {
      levels.push({ s, k: 0, kind: 'both', strong: true });
      if (p === 'QQ') levels.push({ s, k: 1, kind: 'both', strong: false });
      if (p === 'UQ') levels.push({ s, k: 1, kind: 'up' });
      if (p === 'LQ') levels.push({ s, k: 1, kind: 'lo' });
    });
    levels[0].fixed = [uStart, lStart];
    levels[levels.length - 1].fixed = cad;
    levels.push({ s: S, k: 0, kind: 'both', strong: true, fixed: [fu, fl] });
    const UA = [], LA = [], V = [];
    const pend = { u: 0, l: 0 };
    let nodes = 0;
    const rec = i => {
      if (i === levels.length) return true;
      if (++nodes > 5000) return false;
      const lv = levels[i], prev = V[i - 1] || null;
      let lastStrong = null;
      for (let j = V.length - 1; j >= 0; j--) if (V[j].strong) { lastStrong = V[j]; break; }
      const mvU = lv.kind !== 'lo', mvL = lv.kind !== 'up';
      const opts = (A, R) => { const p = A[A.length - 1]; return [-7, -4, -3, -2, -1, 1, 2, 3, 4, 7].map(x => p + x).filter(d => inR(d, R)); };
      const uO = lv.fixed ? [lv.fixed[0]] : mvU ? opts(UA, TWO_UR) : [prev.u];
      const lO = lv.fixed ? [lv.fixed[1]] : mvL ? opts(LA, TWO_LR) : [prev.l];
      const cands = [];
      for (const u of uO) for (const l of lO) {
        if (mvU && !melOK(UA, u, TWO_UR, pend.u)) continue;
        if (mvL && !melOK(LA, l, TWO_LR, pend.l)) continue;
        const h = u - l;
        if (h < 2 || h > 16) continue;
        const c = cons(l, u);
        if (lv.kind === 'both' && !c) continue;
        if (lv.kind !== 'both' && !c) {
          // passing note: reached by step (and, checked later, left by step in the same direction)
          const A = mvU ? UA : LA, n = mvU ? u : l;
          if (Math.abs(n - A[A.length - 1]) !== 1) continue;
        }
        let s = (mvU ? melCost(UA, u) : 0) + (mvL ? melCost(LA, l) : 0);
        if (prev && mvU && mvL) {
          const du = u - prev.u, dl = l - prev.l;
          if (du && dl) {
            if (perfect(prev.l, prev.u) && perfect(l, u) && cls(prev.u - prev.l) === cls(h)) continue;
            if (perfect(l, u) && Math.sign(du) === Math.sign(dl) && Math.abs(du) > 1) continue;
            if (Math.sign(du) !== Math.sign(dl)) s -= 0.45;
            else {
              s += 0.35;
              let par = 0;
              for (let j = V.length - 1; j >= 1; j--) {
                const a = V[j], b = V[j - 1];
                if (a.u !== b.u && a.l !== b.l && Math.sign(a.u - b.u) === Math.sign(a.l - b.l)) par++; else break;
              }
              if (par >= 2) s += 2.5;
            }
          }
        }
        if (lastStrong && lv.strong && perfect(lastStrong.l, lastStrong.u) && perfect(l, u) && cls(lastStrong.u - lastStrong.l) === cls(h)) {
          const du = u - lastStrong.u, dl = l - lastStrong.l;
          if (du && dl && Math.sign(du) === Math.sign(dl)) continue;
        }
        if (lv.kind === 'both' && i > 0 && i < levels.length - 1) { if (cls(h) === 4) s += 0.8; else if (cls(h) === 0) s += 1.1; }
        if (lv.kind !== 'both' && !c) s += 0.35;
        if (h > 14) s += 0.5;
        if (h < 5) s += 0.6;
        s += Math.max(0, Math.abs(u - 33) - 3) * 0.25 + Math.max(0, Math.abs(l - 22) - 3) * 0.25;
        cands.push({ u, l, c, w: Math.exp(-s) * (0.4 + Math.random()) });
      }
      cands.sort((a, b) => b.w - a.w);
      for (const cd of cands.slice(0, 6)) {
        const old = { u: pend.u, l: pend.l };
        if (mvU) { pend.u = 0; UA.push(cd.u); }
        if (mvL) { pend.l = 0; LA.push(cd.l); }
        if (lv.kind === 'up' && !cd.c) pend.u = Math.sign(cd.u - UA[UA.length - 2]);
        if (lv.kind === 'lo' && !cd.c) pend.l = Math.sign(cd.l - LA[LA.length - 2]);
        V.push({ u: cd.u, l: cd.l, strong: !!lv.strong });
        if (rec(i + 1)) return true;
        V.pop();
        if (mvU) UA.pop();
        if (mvL) LA.pop();
        pend.u = old.u; pend.l = old.l;
      }
      return false;
    };
    if (!rec(0)) continue;
    const N = d => ({ d, a: 0 });
    const segs = pats.map((p, s) => {
      const lv = levels.map((x, i) => ({ x, v: V[i] })).filter(o => o.x.s === s);
      const up = [], lo = [];
      lv.forEach(({ x, v }) => { if (x.kind !== 'lo') up.push(N(v.u)); if (x.kind !== 'up') lo.push(N(v.l)); });
      return { pat: p, up, lo };
    });
    segs.push({ pat: 'W', up: [N(fu)], lo: [N(fl)] });
    return { key: makeKey(0, center === 'a'), segs };
  }
  return null;
}
// durations (in quarters) of a segment pattern for the upper and the lower voice
const TWO_DURS = { HH: [[2], [2]], QQ: [[1, 1], [1, 1]], UQ: [[1, 1], [2]], LQ: [[2], [1, 1]], W: [[4], [4]] };

/* ---------- notes heard against a context chord ---------- */
// semitones above the tonic → [scale step, alteration against the major scale]: ♭2 ♭3 ♯4 ♭6 ♭7 as usual
const CHROMA_DEG = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];
function spellInKey(key, pc) {
  const step = mod(key.step + CHROMA_DEG[mod(pc - key.pc, 12)], 7);
  return { step, a: mod(pc - STEP_PC[step] + 6, 12) - 6 };
}
function triadPcs(root, minor) { return [0, minor ? 3 : 4, 7].map(x => mod(root + x, 12)); }
// the tonic triad of `key`: bass (root, third or fifth by inversion) between A2 and G♯3, then the next three chord tones above
function contextChord(key, inv) {
  const r0 = 21 + key.step, tones = [0, 2, 4];
  let bass = r0 + tones[inv];
  while (Note.midi({ d: bass, a: key.sig[mod(bass, 7)] }) > 56) bass -= 7;
  while (Note.midi({ d: bass, a: key.sig[mod(bass, 7)] }) < 45) bass += 7;
  const out = [];
  for (let d = bass; out.length < 4; d++) if ([0, 2, 4].includes(mod(d - r0, 7))) out.push({ d, a: key.sig[mod(d, 7)] });
  return out;
}
// weighted pitch class: chord tones are rare (1 against 4)
function pickContextPc(chordPcs, avoid) {
  const pcs = [];
  for (let pc = 0; pc < 12; pc++) if (!avoid.includes(pc)) pcs.push(pc);
  return wpickBy(pcs, pc => chordPcs.includes(pc) ? 1 : 4);
}
// spelling of a triad named after its root: fewer accidentals first, ties go the way of the context key
function spellTriad(rootPc, minor, keyFifths) {
  const opts = [];
  for (let step = 0; step < 7; step++) {
    const a = mod(rootPc - STEP_PC[step] + 6, 12) - 6;
    if (Math.abs(a) > 1) continue;
    const notes = [0, 2, 4].map((k, i) => {
      const s = mod(step + k, 7), pc = triadPcs(rootPc, minor)[i];
      return { step: s, a: mod(pc - STEP_PC[s] + 6, 12) - 6 };
    });
    if (notes.some(n => Math.abs(n.a) > 1)) continue;
    const acc = notes.reduce((t, n) => t + Math.abs(n.a), 0);
    const dir = notes.reduce((t, n) => t + n.a, 0);
    opts.push({ step, a, notes, acc, tie: keyFifths >= 0 ? -dir : dir });
  }
  opts.sort((x, y) => x.acc - y.acc || x.tie - y.tie);
  return opts[0];
}
