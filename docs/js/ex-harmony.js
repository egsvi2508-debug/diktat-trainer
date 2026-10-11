'use strict';
/* ============================================================
   Exercise 5 — Harmoniefolge: four-part progressions, find the bass
   ============================================================ */
const Harmony = (() => {
  // q: [major key, minor key]; null = not used in that mode
  const VOC = {
    I: { deg: 0, q: ['M', 'm'], inv: 0 },
    I6: { deg: 0, q: ['M', 'm'], inv: 1, need: ['inv'] },
    I64: { deg: 0, q: ['M', 'm'], inv: 2, need: ['inv'], cad: true },
    ii: { deg: 1, q: ['m', null], inv: 0 },
    ii6: { deg: 1, q: ['m', 'd'], inv: 1, need: ['inv'] },
    IV: { deg: 3, q: ['M', 'm'], inv: 0 },
    IV6: { deg: 3, q: ['M', 'm'], inv: 1, need: ['inv'] },
    V: { deg: 4, q: ['M', 'M'], inv: 0 },
    V6: { deg: 4, q: ['M', 'M'], inv: 1, need: ['inv'] },
    V7: { deg: 4, q: ['7', '7'], inv: 0, need: ['sev'] },
    V65: { deg: 4, q: ['7', '7'], inv: 1, need: ['inv', 'sev'] },
    V43: { deg: 4, q: ['7', '7'], inv: 2, need: ['inv', 'sev'] },
    V2: { deg: 4, q: ['7', '7'], inv: 3, need: ['inv', 'sev'] },
    vi: { deg: 5, q: ['m', 'M'], inv: 0 },
    vii6: { deg: 6, q: ['d', 'd'], inv: 1, need: ['inv'], rootAltMin: 1 },
    DD: { deg: 1, q: ['M', 'M'], inv: 0, need: ['dd'], sec: true },
    DD7: { deg: 1, q: ['7', '7'], inv: 0, need: ['dd', 'sev'], sec: true },
    DD65: { deg: 1, q: ['7', '7'], inv: 1, need: ['dd', 'sev', 'inv'], sec: true }
  };
  const NEXT = {
    I: { IV: 3, ii: 2, ii6: 2, vi: 2, V: 2, V7: 1, I6: 2, V6: 1, V43: 1, vii6: 1, IV6: 1, DD: 1, DD7: 0.7, DD65: 0.7 },
    I6: { IV: 3, ii: 1, ii6: 2, V: 1, V7: 1, vii6: 1, DD: 1, DD65: 0.6 },
    IV: { V: 3, V7: 2, I64: 2, I: 1, I6: 1, ii6: 0.6, vii6: 1, DD: 0.8, DD7: 0.6 },
    IV6: { V: 2, V7: 1, I64: 1 },
    ii: { V: 3, V7: 2, I64: 1.5, vii6: 1 },
    ii6: { V: 3, V7: 2, I64: 2, vii6: 1 },
    V: { I: 4, vi: 1, V7: 1.5, I6: 0.7 },
    V6: { I: 3 },
    V7: { I: 4, vi: 1 },
    V65: { I: 3 },
    V43: { I: 2, I6: 2 },
    V2: { I6: 3 },
    vi: { IV: 3, ii: 2, ii6: 2, IV6: 1, V: 1, I6: 1, DD: 1, DD7: 0.7 },
    vii6: { I: 2, I6: 2 },
    I64: { V: 2, V7: 2 },
    DD: { V: 2, V7: 1, I64: 1.5 },
    DD7: { V: 2, I64: 1.5 },
    DD65: { V: 2, I64: 1 }
  };
  const QIV = { M: [0, 4, 7], m: [0, 3, 7], d: [0, 3, 6], '7': [0, 4, 7, 10] };
  const RANGE = [[40, 62], [48, 67], [55, 74], [60, 79]]; // B T A S

  function chord(key, id) {
    const v = VOC[id], mi = key.minor ? 1 : 0, q = v.q[mi];
    const rootD = 28 + key.step + v.deg;
    const root = { d: rootD, a: key.sig[mod(rootD, 7)] + (mi && v.rootAltMin ? v.rootAltMin : 0) };
    const domPc = mod(key.pc + 7, 12), ltPc = mod(key.pc + 11, 12);
    const tones = QIV[q].map((semi, k) => {
      const d = rootD + 2 * k;
      const n = { d, a: key.sig[mod(d, 7)] };
      n.a += semi - (Note.midi(n) - Note.midi(root));
      const pc = mod(Note.midi(n), 12);
      let lt = null;
      if (!v.sec && (v.deg === 4 || v.deg === 6) && pc === ltPc) lt = key.pc;
      if (v.sec && k === 1) lt = domPc;
      return { n, pc, role: ['R', '3', '5', '7'][k], lt, sev: k === 3, chrom: n.a !== key.sig[mod(d, 7)] };
    });
    return { id, deg: v.deg, q, inv: v.inv, cad: !!v.cad, sec: !!v.sec, tones, key };
  }

  function doublingCost(ch, cnt) {
    if (!cnt[0] || !cnt[1]) return Infinity;
    for (let i = 0; i < ch.tones.length; i++) {
      const tn = ch.tones[i];
      if ((tn.lt != null || tn.sev || tn.chrom) && cnt[i] > 1) return Infinity;
    }
    if (ch.tones.length === 4) {
      if (!cnt[3]) return Infinity;
      if (!cnt[2]) return (ch.inv === 0 && cnt[0] === 2) ? 1.2 : Infinity;
      return 0;
    }
    if (!cnt[2]) return (ch.inv === 0 && cnt[0] === 3) ? 5 : Infinity;
    const dbl = cnt.findIndex(c => c === 2);
    if (ch.cad) return dbl === 2 ? 0 : 6;
    if (ch.inv === 0) return [0, ch.deg === 5 ? 1.5 : 3.5, 1.5][dbl];
    if (ch.deg === 6) return [Infinity, 0, 0.8][dbl];
    if (ch.deg === 1 || ch.deg === 3) return [0.6, 0, 0.8][dbl];
    return [0, 3.5, 0.6][dbl];
  }

  function voicings(ch) {
    const out = [];
    const cand = ([lo, hi]) => {
      const c = [];
      for (let m = lo; m <= hi; m++) { const ti = ch.tones.findIndex(tn => tn.pc === mod(m, 12)); if (ti >= 0) c.push([m, ti]); }
      return c;
    };
    const cB = cand(RANGE[0]).filter(([, ti]) => ti === ch.inv), cT = cand(RANGE[1]), cA = cand(RANGE[2]), cS = cand(RANGE[3]);
    for (const [b, tb] of cB) for (const [tn, tt] of cT) {
      if (tn <= b || tn - b > 24) continue;
      for (const [a, ta] of cA) {
        if (a < tn || a - tn > 12) continue;
        for (const [s, ts] of cS) {
          if (s <= a || s - a > 12) continue;
          const idx = [tb, tt, ta, ts];
          const cnt = ch.tones.map(() => 0);
          idx.forEach(i => { cnt[i]++; });
          const dc = doublingCost(ch, cnt);
          if (dc === Infinity) continue;
          // keep each voice near the middle of its range (tenor ≈ A3, alto ≈ E4, soprano ≈ B♭4)
          const reg = 0.12 * (Math.max(0, tn - 62) + Math.max(0, 50 - tn)) + 0.08 * (Math.max(0, a - 70) + Math.max(0, 57 - a))
            + 0.06 * (Math.max(0, s - 76) + Math.max(0, 64 - s)) + 0.05 * Math.max(0, tn - b - 15);
          out.push({ m: [b, tn, a, s], t: idx, cost: dc + reg + (a === tn ? 2 : 0) });
        }
      }
    }
    return out;
  }

  function trans(c1, v1, c2, v2) {
    const m1 = v1.m, m2 = v2.m;
    let cost = 0;
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
      if (m1[i] === m2[i] || m1[j] === m2[j]) continue;
      const i1 = mod(m1[j] - m1[i], 12), i2 = mod(m2[j] - m2[i], 12);
      if (i1 === i2 && (i1 === 0 || i1 === 7)) return Infinity;
    }
    const dB = m2[0] - m1[0], dS = m2[3] - m1[3];
    if (dB * dS > 0) { const iv = mod(m2[3] - m2[0], 12); if ((iv === 0 || iv === 7) && Math.abs(dS) > 2) cost += 4; }
    for (let i = 0; i < 3; i++) if (m2[i] > m1[i + 1] || m2[i + 1] < m1[i]) cost += 3;
    for (let i = 1; i < 4; i++) {
      const d = Math.abs(m2[i] - m1[i]);
      if (d > 12) return Infinity;
      cost += 0.35 * d + (d > 4 ? 1 : 0) + (d > 7 ? 3 : 0) + (d === 6 ? 3 : 0);
    }
    const ab = Math.abs(dB);
    cost += 0.06 * ab + (ab === 6 ? 4 : 0) + (ab === 10 || ab === 11 ? 3 : 0) + (ab > 12 ? 5 : 0) + (ab > 7 && ab !== 12 ? 1 : 0);
    if (dS === 0) cost += 0.3;
    const same = c1.deg === c2.deg && c1.q === c2.q;
    for (let i = 0; i < 4; i++) {
      const tn = c1.tones[v1.t[i]], d = m2[i] - m1[i];
      if (!same && tn.lt != null && c2.tones.some(x => x.pc === tn.lt) && d !== 1) cost += (i === 0 || i === 3) ? 14 : 3.5;
      if (!same && tn.sev && d !== -1 && d !== -2) cost += (c1.id === 'V43' && c2.id === 'I6' && (d === 1 || d === 2)) ? 1 : 14;
    }
    if (c1.cad) {
      if (m2[0] !== m1[0]) cost += 30;
      for (let i = 1; i < 4; i++) {
        const role = c1.tones[v1.t[i]].role, d = m2[i] - m1[i];
        if ((role === 'R' || role === '3') && d !== -1 && d !== -2) cost += 8;
      }
    }
    return cost;
  }

  function voiceProgression(key, ids) {
    const chords = ids.map(id => chord(key, id));
    const layers = chords.map(c => voicings(c).map(v => ({ ...v, cost: v.cost + Math.random() * 1.4 })));
    if (layers.some(l => !l.length)) return null;
    const last = chords.length - 1;
    let prev = layers[0].map(v => ({ c: v.cost + Math.abs(v.m[3] - 71) * 0.08, from: -1 }));
    const back = [prev];
    for (let i = 1; i < chords.length; i++) {
      const cur = layers[i].map(v2 => {
        let best = Infinity, from = -1;
        layers[i - 1].forEach((v1, k) => {
          if (prev[k].c === Infinity) return;
          const tot = prev[k].c + trans(chords[i - 1], v1, chords[i], v2);
          if (tot < best) { best = tot; from = k; }
        });
        let extra = v2.cost;
        if (i === last && mod(v2.m[3], 12) !== key.pc) extra += 2.5;
        return { c: best + extra, from };
      });
      back.push(cur); prev = cur;
    }
    let bi = -1, bc = Infinity;
    prev.forEach((p, k) => { if (p.c < bc) { bc = p.c; bi = k; } });
    if (bi < 0 || bc === Infinity || bc > 80) return null;
    const path = [];
    for (let i = last; i >= 0; i--) { path.unshift(layers[i][bi]); bi = back[i][bi].from; }
    // spell every voice
    const notes = path.map((v, i) => v.m.map((m, k) => {
      const tn = chords[i].tones[v.t[k]], step = mod(tn.n.d, 7);
      const o = Math.round((m - tn.n.a - STEP_PC[step]) / 12) - 1;
      return Note.spell(m, o * 7 + step);
    }));
    return { chords, notes };
  }

  /* one phrase: starts on I (or continues after the previous phrase's I), ends with a cadence:
     'auth' = (I6/4) V(7) I, 'half' = (I6/4) V. Chords already used get less likely, so phrases vary. */
  function genPhrase(S, key, len, end, used, cont) {
    const mi = key.minor ? 1 : 0;
    const allow = id => VOC[id].q[mi] && (VOC[id].need || []).every(f => S[f]);
    const midOk = id => allow(id) && id !== 'I64' && id !== 'V' && id !== 'V7';
    for (let tries = 0; tries < 800; tries++) {
      const tail = [];
      if (S.inv && len >= 5 && chance(0.4)) tail.push('I64');
      if (end === 'auth') tail.push(S.sev && chance(0.5) ? 'V7' : 'V', 'I'); else tail.push('V');
      const seq = [cont || 'I'];
      const mid = len - (cont ? 0 : 1) - tail.length;
      const count = { ...used };
      let ok = true;
      for (let i = 0; i < mid; i++) {
        const prev = seq[seq.length - 1];
        // root-position dominants are kept for cadences; look one step ahead so the walk never gets stuck
        const lastMid = i === mid - 1;
        const nexts = Object.entries(NEXT[prev]).filter(([id]) => midOk(id) && id !== prev
          && (lastMid ? !!NEXT[id][tail[0]] : Object.keys(NEXT[id]).some(nx => midOk(nx) && nx !== id)))
          .map(([id, w]) => [id, w * Math.pow(0.35, count[id] || 0)]);
        if (!nexts.length) { ok = false; break; }
        const id = wpick(nexts);
        seq.push(id); count[id] = (count[id] || 0) + 1;
      }
      if (!ok || !NEXT[seq[seq.length - 1]][tail[0]]) continue;
      const full = seq.concat(tail);
      if (full.some((id, i) => i > 0 && id === full[i - 1])) continue;
      return cont ? full.slice(1) : full;
    }
    return null;
  }
  /* up to 8 chords: one phrase. Longer: 8-chord phrases like a period – half cadence, then full cadences. */
  function genIds(S, key) {
    if (S.n <= 8) return genPhrase(S, key, S.n, 'auth', {}, null);
    const ids = [], used = {};
    for (let k = 0, left = S.n; left > 0; k++) {
      const len = left - 8 < 4 ? left : 8;
      const end = left === len ? 'auth' : (k % 2 === 0 ? 'half' : 'auth');
      const ph = genPhrase(S, key, len, end, used, ids[ids.length - 1] === 'I' ? 'I' : null);
      if (!ph) return null;
      ph.forEach(id => { used[id] = (used[id] || 0) + 1; });
      ids.push(...ph);
      left -= len;
    }
    return ids;
  }

  function generate(S) {
    for (let k = 0; k < 40; k++) {
      const key = randomKey(S.maxAcc, S.mode, 'har');
      const ids = genIds(S, key);
      if (!ids) continue;
      const res = voiceProgression(key, ids);
      if (res) return { key, ids, ...res };
    }
    return null;
  }

  /* ---------- labels ---------- */
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  function funcLabel(ch, prevId) {
    const mi = ch.key.minor;
    const T = mi ? 't' : 'T', Sx = mi ? 's' : 'S';
    switch (ch.id) {
      case 'I': return { base: T };
      case 'I6': return { base: T, sub: '3' };
      case 'I64': return { base: 'D', sup: '6', sub: '4' };
      case 'ii': return { base: 'Sp' };
      case 'ii6': return { base: Sx, sup: '6' };
      case 'IV': return { base: Sx };
      case 'IV6': return { base: Sx, sub: '3' };
      case 'V': return prevId === 'I64' ? { base: 'D', sup: '5', sub: '3' } : { base: 'D' };
      case 'V6': return { base: 'D', sub: '3' };
      case 'V7': return { base: 'D', sup: '7' };
      case 'V65': return { base: 'D', sup: '7', sub: '3' };
      case 'V43': return { base: 'D', sup: '7', sub: '5' };
      case 'V2': return { base: 'D', sup: '7', sub: '7' };
      case 'vi': return { base: mi ? 'tG' : 'Tp' };
      case 'vii6': return { base: 'D', slash: true, sup: '7', sub: '5' };
      case 'DD': return { base: 'DD' };
      case 'DD7': return { base: 'DD', sup: '7' };
      case 'DD65': return { base: 'DD', sup: '7', sub: '3' };
    }
    return { base: '?' };
  }
  function stufeLabel(ch) {
    const fig = ch.tones.length === 4
      ? [{ sup: '7' }, { sup: '6', sub: '5' }, { sup: '4', sub: '3' }, { sup: '2' }][ch.inv]
      : [{}, { sup: '6' }, { sup: '6', sub: '4' }][ch.inv];
    if (ch.sec) return { base: 'V', ...fig, suffix: '/V' };
    return { base: ROMAN[ch.deg], ...fig };
  }
  function figures(ch, prevId) {
    const sev = ch.tones.length === 4;
    let f = sev ? [['7'], ['6', '5'], ['4', '3'], ['4', '2']][ch.inv] : [[], ['6'], ['6', '4']][ch.inv];
    f = f.slice();
    if (!sev && ch.inv === 0 && prevId === 'I64') f = ['5', '3'];
    const bass = ch.tones[ch.inv];
    const sig = ch.key.sig;
    ch.tones.forEach(tn => {
      if (tn === bass) return;
      if (tn.n.a === sig[mod(tn.n.d, 7)]) return;
      const num = String(mod(Note.step(tn.n) - Note.step(bass.n), 7) + 1);
      const acc = ACC_TXT[tn.n.a];
      const at = f.indexOf(num);
      if (num === '3') { if (at >= 0) f[at] = acc; else f.push(acc); }
      else if (at >= 0) f[at] = acc + num;
      else f.push(acc + num);
    });
    const val = s => { const m = s.match(/\d/); return m ? +m[0] : 3; };
    return f.sort((a, b) => val(b) - val(a));
  }

  function voiceChords(key, ids) {
    for (let k = 0; k < 6; k++) { const r = voiceProgression(key, ids); if (r) return r.notes.map(ch => ch.map(Note.midi)); }
    return null;
  }

  return { generate, funcLabel, stufeLabel, figures, voiceChords };
})();

/* draw a label like D⁷₃ or V⁶₅/V centred at x */
function drawLabel(svg, x, y, lab, cls) {
  const g = svgEl('g', { class: 'lab ' + cls });
  svg.appendChild(g);
  const base = svgEl('text', { x: 0, y: 0, class: 'lab-base' }, lab.base);
  g.appendChild(base);
  let w = base.getComputedTextLength();
  if (lab.slash) g.appendChild(svgEl('line', { x1: -1, y1: 2, x2: w + 1, y2: -12, class: 'lab-slash' }));
  let sw = 0;
  if (lab.sup) { const s = svgEl('text', { x: w + 0.8, y: -6.5, class: 'lab-fig' }, lab.sup); g.appendChild(s); sw = Math.max(sw, s.getComputedTextLength()); }
  if (lab.sub) { const s = svgEl('text', { x: w + 0.8, y: 4, class: 'lab-fig' }, lab.sub); g.appendChild(s); sw = Math.max(sw, s.getComputedTextLength()); }
  if (sw) w += sw + 1;
  if (lab.suffix) { const s = svgEl('text', { x: w, y: 0, class: 'lab-base' }, lab.suffix); g.appendChild(s); w += s.getComputedTextLength(); }
  g.setAttribute('transform', `translate(${(x - w / 2).toFixed(1)} ${y})`);
}

/* four-part grand staff with analysis rows.
   opts.notes: chords to draw (voices may be null) · opts.color(i, v) · opts.sel: chord to highlight.
   Returns tap targets (one treble and one bass row per system) like renderLines. */
function renderChorale(host, task, show, opts = {}) {
  const chords = opts.notes || task.notes;
  const n = chords.length;
  const hit = { rows: [] };
  const scale = autoScale(host.clientWidth);
  const Wfull = Math.max(260, host.clientWidth) / scale, avail = Wfull - 16;
  const probe = new VF.Stave(0, 0, 300).addClef('bass').addKeySignature(task.key.vf);
  const extra = probe.getNoteStartX() - new VF.Stave(0, 0, 300).getNoteStartX() + 14;
  const nm = Math.ceil(n / 2);
  let mpl = clamp(Math.floor((avail - extra) / (Wfull < 440 ? 96 : 118)), 1, 4);
  mpl = Math.ceil(nm / Math.ceil(nm / mpl));   // even lines: 2+2, not 3+1
  const lines = [];
  for (let i = 0; i < nm; i += mpl) lines.push(Array.from({ length: Math.min(mpl, nm - i) }, (_, k) => i + k));
  const nRows = (show.G ? 1 : 0) + (show.S ? 1 : 0) + (show.F ? 1 : 0);
  const rowH = 228 + nRows * 24 + (show.G ? 14 : 0);
  const { ctx, svg } = vfSurface(host, lines.length * rowH + 6, scale);
  const sig = task.key.sig;
  const mw = (avail - extra) / (lines.length === 1 ? nm : mpl);
  lines.forEach((ms, li) => {
    const y0 = 2 + li * rowH;
    let x = 8;
    const slots = [];
    let trTop = 0, bsTop = 0, midY = 0;
    ms.forEach((mIdx, mi) => {
      const w = mi === 0 ? mw + extra : mw;
      const tr = new VF.Stave(x, y0, w), bs = new VF.Stave(x, y0 + 100, w);
      if (mi === 0) { tr.addClef('treble').addKeySignature(task.key.vf); bs.addClef('bass').addKeySignature(task.key.vf); }
      if (mIdx === nm - 1) { tr.setEndBarType(VF.BarlineType.END); bs.setEndBarType(VF.BarlineType.END); }
      const ns = Math.max(tr.getNoteStartX(), bs.getNoteStartX());
      tr.setNoteStartX(ns); bs.setNoteStartX(ns);
      tr.setContext(ctx).draw(); bs.setContext(ctx).draw();
      if (mi === 0) ['brace', 'singleLeft'].forEach(tp => new VF.StaveConnector(tr, bs).setType(tp).setContext(ctx).draw());
      new VF.StaveConnector(tr, bs).setType('singleRight').setContext(ctx).draw();
      const idx = [mIdx * 2, mIdx * 2 + 1].filter(i => i < n);
      const mk = (voice, clef, stem) => {
        const evs = idx.map(i => ({ dur: 'h', note: chords[i][voice], stem, color: opts.color ? opts.color(i, voice) : undefined }));
        if (idx.length === 1) evs.push({ dur: 'h', note: null });
        markAccidentals(evs, sig);
        return evs.map(e => mkNote(e, clef));
      };
      const nS = mk(3, 'treble', 1), nA = mk(2, 'treble', -1), nT = mk(1, 'bass', 1), nB = mk(0, 'bass', -1);
      const V = notes => new VF.Voice({ num_beats: 4, beat_value: 4 }).setMode(VF.Voice.Mode.SOFT).addTickables(notes);
      const vS = V(nS), vA = V(nA), vT = V(nT), vB = V(nB);
      new VF.Formatter().joinVoices([vS, vA]).joinVoices([vT, vB]).format([vS, vA, vT, vB], Math.max(40, tr.getNoteEndX() - ns - 14));
      vS.draw(ctx, tr); vA.draw(ctx, tr); vT.draw(ctx, bs); vB.draw(ctx, bs);
      trTop = tr.getYForLine(0); bsTop = bs.getYForLine(0); midY = (tr.getYForLine(4) + bsTop) / 2;
      const cxs = idx.map((i, k) => (nB[k].getNoteHeadBeginX() + nB[k].getNoteHeadEndX()) / 2);
      idx.forEach((i, k) => {
        const x0 = k === 0 ? ns - 6 : (cxs[k - 1] + cxs[k]) / 2, x1 = k === idx.length - 1 ? tr.getNoteEndX() : (cxs[k] + cxs[k + 1]) / 2;
        slots.push({ id: 'c' + i, x0, x1, cx: cxs[k], locked: i === 0 });
        if (opts.sel === i) behind(svg, svgEl('rect', { x: x0 + 2, y: trTop - 30, width: x1 - x0 - 4, height: bs.getYForLine(4) - trTop + 60, rx: 10, class: 'sel' }));
      });
      let ly = bs.getYForLine(4) + 36;
      idx.forEach((i, k) => {
        const cx = (nB[k].getNoteHeadBeginX() + nB[k].getNoteHeadEndX()) / 2;
        const prevId = i > 0 ? task.ids[i - 1] : null;
        let yy = ly;
        if (show.G) {
          const figs = Harmony.figures(task.chords[i], prevId);
          figs.forEach((f, j) => svg.appendChild(svgEl('text', { x: cx, y: yy + j * 11, class: 'gb' }, f)));
          yy += 3 * 11 + 6;
        }
        if (show.S) { drawLabel(svg, cx, yy, Harmony.stufeLabel(task.chords[i]), 'st'); yy += 24; }
        if (show.F) { drawLabel(svg, cx, yy, Harmony.funcLabel(task.chords[i], prevId), 'fn'); }
      });
      if (mi === 0) {
        let yy = ly;
        const lx = x + 2;
        const bands = [];
        if (show.G) bands.push([ly - 11, 39]);
        if (show.S) bands.push([ly - 11 + (show.G ? 39 : 0), 24]);
        if (show.F) bands.push([ly - 11 + (show.G ? 39 : 0) + (show.S ? 24 : 0), 24]);
        bands.forEach(([by, bh], j) => { if (j % 2 === 0) behind(svg, svgEl('rect', { x: 4, y: by, width: avail + 8, height: bh, rx: 6, class: 'band' })); });
        if (show.G) { svg.appendChild(svgEl('text', { x: lx, y: yy, class: 'row-lbl' }, 'GB')); yy += 39; }
        if (show.S) { svg.appendChild(svgEl('text', { x: lx, y: yy, class: 'row-lbl' }, t('rowStufeShort'))); yy += 24; }
        if (show.F) svg.appendChild(svgEl('text', { x: lx, y: yy, class: 'row-lbl' }, t('rowFuncShort')));
      }
      x += w;
    });
    hit.rows.push({ topY: trTop, topDia: 38, half: 5, yMin: li === 0 ? -100 : y0 - 10, yMax: midY, minDia: 24, maxDia: 44, slots, clef: 'treble' });
    hit.rows.push({ topY: bsTop, topDia: 26, half: 5, yMin: midY, yMax: y0 + rowH - 10, minDia: 12, maxDia: 34, slots, clef: 'bass' });
  });
  return hit;
}

/* Step 1: notate the bass. Step 2 (optional): fill in tenor, alto and soprano. */
const VOICES = { 3: 'voiceS', 2: 'voiceA', 1: 'voiceT' };
const VOICE_RANGE = { 3: [30, 44], 2: [25, 40], 1: [17, 33] };   // diatonic limits for S, A, T

const ExHar = {
  id: 'har', no: '5', titleKey: 'harTitle',
  get descKey() { return this.stage === 2 ? 'harDesc2' : 'harDesc'; },
  S: Object.assign({ bars: 4, mode: 'both', maxAcc: 3, inv: true, sev: true, dd: false, dur: 1.8, boost: 2.4, F: true, St: true, G: true }, store.get('har.s', {})),
  task: null, ans: null, hit: null,
  stage: 1,            // 1 = bass, 2 = upper voices
  c1: 1, done1: false, res1: null,   // step 1 state
  up: null, vcur: { i: 1, v: 3 }, done2: false, res2: null,   // step 2 state

  save() { store.set('har.s', this.S); },
  get checked() { return this.stage === 1 ? this.done1 : this.done2; },

  build() {
    const P = this.P = panelShell(this);
    const S = this.S;
    const db = v => '+' + Math.round(20 * Math.log10(v)) + ' dB';
    P.settingsBody.append(
      segControl('har-mode', 'modeLbl', [['maj', t('major')], ['min', t('minor')], ['both', t('both')]], S.mode, v => { S.mode = v; this.save(); }),
      segControl('har-acc', 'maxAcc', [0, 1, 2, 3, 4].map(n => [n, String(n)]), S.maxAcc, v => { S.maxAcc = v; this.save(); }),
      toggleGroup('harChords',
        toggleControl('har-inv', 'harInv', S.inv, v => { S.inv = v; this.save(); }),
        toggleControl('har-sev', 'harSev', S.sev, v => { S.sev = v; this.save(); }),
        toggleControl('har-dd', 'harDD', S.dd, v => { S.dd = v; this.save(); })),
      sliderControl('har-boost', 'harBoost', 1, 4, 0.1, S.boost, db, v => { S.boost = v; this.save(); }),
      toggleGroup('harShow',
        toggleControl('har-sf', 'rowFunc', S.F, v => { S.F = v; this.save(); this.renderSolution(); }),
        toggleControl('har-ss', 'rowStufe', S.St, v => { S.St = v; this.save(); this.renderSolution(); }),
        toggleControl('har-sg', 'rowGB', S.G, v => { S.G = v; this.save(); this.renderSolution(); }))
    );
    this.playBtn = playButton('listen', () => this.events(false), { primary: true });
    this.bassBtn = playButton('playBassOnly', () => this.events(true));
    this.upperBtn = btn('upperStart', ICON.next, () => this.startUpper(), 'btn-sec btn-sm');
    mainControls(this, P, this.playBtn);
    bindStaffInput(P.score, this);
    watchWidth(P.score, () => this.render());
    watchWidth(P.solHost, () => this.renderSolution());
    if (!this.task) this.newTask(); else this.render();
  },

  newTask() {
    const task = Harmony.generate({ ...this.S, n: this.S.bars * 2 });   // two chords (half notes) per bar
    if (!task) return;
    this.task = task;
    this.ans = task.notes.map((ch, i) => i === 0 ? { ...ch[0] } : null);
    this.stage = 1; this.c1 = 1; this.done1 = false; this.res1 = null;
    this.up = null; this.done2 = false; this.res2 = null;
    if (this.P) {
      setFeedback(this.P.feedback, '', '');
      this.P.solWrap.hidden = true;
      if (App.active === this) App.renderBar();
      this.render();
    }
  },

  /* step 2: the bass and the whole first chord are given */
  startUpper() {
    this.stage = 2;
    this.up = this.task.notes.map((ch, i) => i === 0 ? ch.map(n => ({ ...n })) : [{ ...ch[0] }, null, null, null]);
    this.vcur = { i: 1, v: 3 };
    this.done2 = false; this.res2 = null;
    setFeedback(this.P.feedback, '', '');
    this.P.solWrap.hidden = true;
    if (App.active === this) App.renderBar();
    this.render();
    this.P.score.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  },

  events(bassOnly) {
    const d = this.S.dur, ev = [];
    this.task.notes.forEach((ch, i) => {
      const last = i === this.task.notes.length - 1;
      ch.forEach((n, k) => {
        if (bassOnly && k > 0) return;
        // the bass is louder only in step 1 (finding the bass); in step 2 all voices are balanced
        const boost = k === 0 && !bassOnly && this.stage === 1 ? this.S.boost : 1;
        ev.push({ t: i * d, midi: Note.midi(n), dur: last ? d * 1.8 : d * 1.01, vel: k === 0 ? 0.8 : last ? 0.5 : 0.6, gain: boost });
      });
    });
    return ev;
  },

  /* ---------- sequence-editor interface (both steps) ---------- */
  positions() {
    const P = [];
    for (let i = 1; i < this.up.length; i++) [3, 2, 1].forEach(v => P.push({ i, v }));
    return P;
  },
  get cursor() {
    if (this.stage === 1) return this.c1;
    return this.positions().findIndex(p => p.i === this.vcur.i && p.v === this.vcur.v);
  },
  set cursor(x) { if (this.stage === 1) this.c1 = x; else this.vcur = this.positions()[x]; },
  hasInput() {
    return this.stage === 1 ? this.ans.slice(1).some(Boolean) : this.up.slice(1).some(ch => ch[1] || ch[2] || ch[3]);
  },
  isLocked() { return this.checked; },
  moveCursor(d) {
    const max = this.stage === 1 ? this.ans.length - 1 : this.positions().length - 1;
    this.cursor = clamp(this.cursor + d, this.stage === 1 ? 1 : 0, max);
    this.render();
  },
  getNote(i) {
    if (this.stage === 1) return this.ans[i];
    const p = this.positions()[i];
    return p ? this.up[p.i][p.v] : null;
  },
  editable(i) { return !this.checked && (this.stage === 2 || i > 0); },
  refNote(i) {
    if (this.stage === 1) { for (let j = i - 1; j >= 0; j--) if (this.ans[j]) return this.ans[j]; return this.ans[0]; }
    const p = this.positions()[i];
    for (let j = p.i - 1; j >= 0; j--) if (this.up[j][p.v]) return this.up[j][p.v];
    return this.task.notes[0][p.v];
  },
  defaultAlt(i, d) {
    if (this.stage === 1) {
      const m = Math.floor(i / 2), prev = [];
      for (let j = m * 2; j < i; j++) prev.push(this.ans[j]);
      return readAlt(prev, d, this.task.key.sig);
    }
    const p = this.positions()[i], prev = [];
    for (let j = Math.floor(p.i / 2) * 2; j < p.i; j++) prev.push(this.up[j][p.v]);
    return readAlt(prev, d, this.task.key.sig);
  },
  diaRange() { return this.stage === 1 ? [12, 34] : VOICE_RANGE[this.vcur.v]; },
  setNote(i, n) {
    if (this.stage === 1) this.ans[i] = n;
    else { const p = this.positions()[i]; this.up[p.i][p.v] = n; }
    if (App.hearInput) Sound.note(Note.midi(n));
    this.render();
  },
  clearSlot(i) {
    if (this.stage === 1) { if (i > 0) this.ans[i] = null; }
    else { const p = this.positions()[i]; this.up[p.i][p.v] = null; }
    this.render();
  },
  cmd(c, arg) {
    const before = this.cursor;
    SeqEdit.cmd(this, c, arg);
    const last = this.stage === 1 ? this.ans.length - 1 : this.positions().length - 1;
    if (c === 'letter' && this.cursor === before && before < last && !this.checked) { this.cursor = before + 1; this.render(); }
  },
  /* in step 2 a tap chooses the voice by where you tap: bass staff → tenor, treble: high → soprano, lower → alto */
  pickVoice(i, row, dia) {
    if (row.clef === 'bass') return 1;
    const S = this.up[i][3], A = this.up[i][2];
    if (S && dia === S.d) return 3;
    if (A && dia === A.d) return 2;
    if (S && A) return Math.abs(dia - S.d) <= Math.abs(dia - A.d) ? 3 : 2;
    if (S) return dia > S.d ? 3 : 2;
    if (A) return dia < A.d ? 2 : 3;
    return dia >= 33 ? 3 : 2;
  },
  staffDown(r) {
    if (this.checked) return;
    const i = +r.slot.id.slice(1);
    if (i === 0) return;
    if (this.stage === 1) { this.c1 = i; this.setNote(i, { d: r.dia, a: this.defaultAlt(i, r.dia) }); return; }
    const v = this.pickVoice(i, r.row, r.dia);
    this.vcur = { i, v };
    const [lo, hi] = VOICE_RANGE[v], d = clamp(r.dia, lo, hi);
    this.setNote(this.cursor, { d, a: this.defaultAlt(this.cursor, d) });
  },
  staffDrag(id, r) {
    if (this.checked) return;
    if (this.stage === 1) { this.staffDown(r); return; }
    const [lo, hi] = VOICE_RANGE[this.vcur.v], d = clamp(r.dia, lo, hi);
    this.setNote(this.cursor, { d, a: this.defaultAlt(this.cursor, d) });
  },
  canPreview(slot) { return !this.checked && slot.id !== 'c0'; },

  /* ---------- checking ---------- */
  check() {
    if (this.checked) return;
    if (!this.hasInput()) { this.reveal(); return; }
    if (this.stage === 2) { this.checkUpper(); return; }
    let ok = 0, oct = 0;
    const marks = this.task.notes.map((ch, i) => {
      if (i === 0) return 'given';
      const u = this.ans[i], s = ch[0];
      if (u && mod(Note.midi(u) - Note.midi(s), 12) === 0) { ok++; if (Note.midi(u) !== Note.midi(s)) oct++; return 'ok'; }
      return 'bad';
    });
    const n = this.ans.length - 1, pct = Math.round(100 * ok / n);
    this.res1 = { marks };
    this.done1 = true;
    statAdd('har', pct);
    const kind = pct === 100 ? 'ok' : pct >= 60 ? 'info' : 'bad';
    let msg = t('harRes', { ok, n });
    if (oct) msg += ' ' + t('harOct', { n: oct });
    setFeedback(this.P.feedback, kind, fbIcon(kind) + `<span>${esc(msg)} ${esc(t('upperOffer'))}</span>`, this.bassBtn, this.upperBtn);
    this.P.solWrap.hidden = false;
    this.render(); this.renderSolution();
  },
  checkUpper() {
    let ok = 0, n = 0;
    const marks = this.up.map((ch, i) => ch.map((u, v) => {
      if (i === 0 || v === 0) return 'given';
      n++;
      if (u && Note.sameMidi(u, this.task.notes[i][v])) { ok++; return 'ok'; }
      return 'bad';
    }));
    const pct = Math.round(100 * ok / n);
    this.res2 = { marks };
    this.done2 = true;
    statAdd('har', pct);
    const kind = pct === 100 ? 'ok' : pct >= 60 ? 'info' : 'bad';
    setFeedback(this.P.feedback, kind, fbIcon(kind) + `<span>${esc(t('upperRes', { ok, n }))}</span>`);
    this.P.solWrap.hidden = false;
    this.render(); this.renderSolution();
  },
  reveal() {
    if (this.checked) return;
    if (this.stage === 1) {
      this.done1 = true;
      setFeedback(this.P.feedback, 'info', fbIcon('info') + `<span>${esc(t('solShown'))} ${esc(t('upperOffer'))}</span>`, this.bassBtn, this.upperBtn);
    } else {
      this.done2 = true;
      setFeedback(this.P.feedback, 'info', fbIcon('info') + `<span>${esc(t('solShown'))}</span>`);
    }
    this.P.solWrap.hidden = false;
    this.render(); this.renderSolution();
  },

  /* ---------- drawing ---------- */
  render() {
    if (!this.P || !this.task) return;
    const P = this.P, C = notaColors(), task = this.task, S = this.S;
    P.info.replaceChildren(
      soundChip(keyName(task.key), () => cadenceEvents(task.key)),
      this.stage === 1
        ? soundChip(t('harFirstBass', { n: noteName(task.notes[0][0]) }), () => [{ t: 0, midi: Note.midi(task.notes[0][0]), dur: 1.6 }])
        : chip(t('upperStep'), 'chip-strong'),
    );
    P.opts.replaceChildren(lengthControl('lenBars', [4, 8, 12], S.bars, v => { S.bars = v; this.save(); this.newTask(); }),
      tempoControl('perChord', S.dur, 0.8, 3.2, 0.2, v => v.toFixed(1) + ' s', v => { S.dur = v; this.save(); }));
    if (this.stage === 2) { this.renderUpper(); return; }
    const marks = this.res1 ? this.res1.marks : null;
    const measures = [];
    for (let m = 0; m < Math.ceil(this.ans.length / 2); m++) {
      const events = [];
      for (let k = 0; k < 2; k++) {
        const i = m * 2 + k;
        if (i >= this.ans.length) { events.push({ dur: 'h', note: null }); continue; }
        const color = i === 0 ? 'currentColor' : marks ? (marks[i] === 'ok' ? C.ok : C.bad) : C.user;
        events.push({ dur: 'h', note: this.ans[i], slot: 'c' + i, ph: this.ans[i] ? null : 'note', color, locked: i === 0 });
      }
      measures.push({ events });
    }
    this.hit = renderLines(P.score, {
      clef: 'bass', key: task.key, time: null, beats: 4, beatValue: 4, measures,
      minMW: 112, maxMPL: 4, sel: this.checked ? null : 'c' + this.c1, range: this.diaRange()
    });
    if (this.checked) dockHide(P);
    else {
      const lbl = t('dockChordN', { i: this.c1 + 1, n: this.ans.length });
      dockNote(P, this, lbl, this.ans[this.c1]);
    }
    syncControls(this);
  },
  renderUpper() {
    const P = this.P, C = notaColors();
    const marks = this.res2 ? this.res2.marks : null;
    this.hit = renderChorale(P.score, this.task, {}, {
      notes: this.up,
      sel: this.checked ? null : this.vcur.i,
      color: (i, v) => i === 0 || v === 0 ? 'currentColor' : marks ? (marks[i][v] === 'ok' ? C.ok : C.bad) : C.user
    });
    if (this.checked) { dockHide(P); syncControls(this); return; }
    const { i, v } = this.vcur;
    const voiceSeg = el('div', { class: 'seg seg-sm', role: 'radiogroup', 'aria-label': t('voiceLbl') },
      [3, 2, 1].map(vv => el('button', { type: 'button', class: 'seg-b', role: 'radio', 'aria-checked': String(vv === v),
        onclick: () => { this.vcur = { i, v: vv }; this.render(); } }, t(VOICES[vv]))));
    const n = this.up[i][v];
    P.dock.hidden = false;
    P.dock.replaceChildren(
      el('span', { class: 'dock-lbl' }, t('dockChordN', { i: i + 1, n: this.up.length })),
      voiceSeg,
      el('span', { class: 'dock-name' }, n ? noteName(n) : '–'),
      noteTools(this));
    syncControls(this);
  },
  renderSolution() {
    if (!this.P || !this.checked || this.P.solWrap.hidden) return;
    renderChorale(this.P.solHost, this.task, { F: this.S.F, S: this.S.St, G: this.S.G });
  },
  onKey(e) {
    if (e.key === ' ') { this.playBtn.trigger(); return true; }
    if (e.key === 'Enter') { if (this.checked) this.newTask(); else this.check(); return true; }
    return pitchKey(e, this);
  }
};
