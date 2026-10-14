'use strict';
/* ============================================================
   Einheit 2 — Zweistimmiges Diktat
   Two voices on the white keys (C-Dur or a-Moll), 4/4. In every half bar the voices either move
   together (1:1) or one has two quarters against a half note of the other (2:1) – nothing else.
   Both first notes are given. Per half bar you pick the rhythm, then write the notes:
   treble staff = upper voice, bass staff = lower voice.
   ============================================================ */
const DUR_Q = { 1: 'q', 2: 'h', 4: 'w' };
const onsetsQ = durs => { let t0 = 0; return durs.map(d => { const o = t0; t0 += d; return o; }); };
const TWO_RANGE = { u: [24, 44], l: [8, 32] };

/* grand staff for two voices; segs: [{pat|null, up: [note|null], lo: [...]}] (null pattern = rhythm still open)
   spec: {key, segs, sel, color(v, s, k), given(s, k)} – returns tap targets like renderLines */
function renderDuo(host, spec) {
  const segs = spec.segs, sig = spec.key.sig;
  const bars = [];
  let cur = [], q = 0;
  segs.forEach((sg, s) => { cur.push(s); q += sg.pat === 'W' ? 4 : 2; if (q >= 4) { bars.push(cur); cur = []; q = 0; } });
  if (cur.length) bars.push(cur);
  const scale = autoScale(host.clientWidth);
  const Wfull = Math.max(260, host.clientWidth) / scale, avail = Wfull - 16;
  const probe = new VF.Stave(0, 0, 300).addClef('treble').addKeySignature(spec.key.vf).addTimeSignature('4/4');
  const extra = probe.getNoteStartX() - new VF.Stave(0, 0, 300).getNoteStartX() + 8;
  const nb = bars.length;
  let mpl = clamp(Math.floor((avail - extra) / (Wfull < 440 ? 118 : 150)), 1, 4);
  mpl = Math.ceil(nb / Math.ceil(nb / mpl));
  const lines = [];
  for (let i = 0; i < nb; i += mpl) lines.push(bars.slice(i, i + mpl));
  const rowH = 232;
  const { ctx, svg } = vfSurface(host, lines.length * rowH + 6, scale);
  const hit = { rows: [] };
  const mw = (avail - extra) / (lines.length === 1 ? nb : mpl);
  lines.forEach((ls, li) => {
    const y0 = 2 + li * rowH;
    let x = 8, trTop = 0, bsTop = 0, midY = 0, bsBot = 0;
    const slotsT = [], slotsB = [];
    ls.forEach((segIdx, mi) => {
      const bi = li * mpl + mi, w = mi === 0 ? mw + extra : mw;
      const tr = new VF.Stave(x, y0, w), bs = new VF.Stave(x, y0 + 100, w);
      if (mi === 0) {
        tr.addClef('treble').addKeySignature(spec.key.vf); bs.addClef('bass').addKeySignature(spec.key.vf);
        if (li === 0) { tr.addTimeSignature('4/4'); bs.addTimeSignature('4/4'); }
      }
      if (bi === nb - 1) { tr.setEndBarType(VF.BarlineType.END); bs.setEndBarType(VF.BarlineType.END); }
      const ns = Math.max(tr.getNoteStartX(), bs.getNoteStartX());
      tr.setNoteStartX(ns); bs.setNoteStartX(ns);
      tr.setContext(ctx).draw(); bs.setContext(ctx).draw();
      if (mi === 0) ['brace', 'singleLeft'].forEach(tp => new VF.StaveConnector(tr, bs).setType(tp).setContext(ctx).draw());
      new VF.StaveConnector(tr, bs).setType('singleRight').setContext(ctx).draw();
      if (mi === 0 && li > 0) svg.appendChild(svgEl('text', { x: x + 1, y: tr.getYForLine(0) - 14, class: 'mnum' }, String(bi + 1)));
      const evT = [], evB = [], ghosts = [];
      segIdx.forEach(s => {
        const sg = segs[s];
        if (!sg.pat) { ghosts.push({ s, i: evT.length }); evT.push({ dur: 'h', note: null }); evB.push({ dur: 'h', note: null }); return; }
        const [du, dl] = TWO_DURS[sg.pat];
        du.forEach((d, k) => evT.push({ dur: DUR_Q[d], note: sg.up[k], ph: sg.up[k] ? null : 'note', slot: 'u' + s + '.' + k, color: spec.color('u', s, k), locked: spec.given(s, k) }));
        dl.forEach((d, k) => evB.push({ dur: DUR_Q[d], note: sg.lo[k], ph: sg.lo[k] ? null : 'note', slot: 'l' + s + '.' + k, color: spec.color('l', s, k), locked: spec.given(s, k) }));
      });
      markAccidentals(evT, sig); markAccidentals(evB, sig);
      const nT = evT.map(e => mkNote(e, 'treble')), nB = evB.map(e => mkNote(e, 'bass'));
      const V = notes => new VF.Voice({ num_beats: 4, beat_value: 4 }).setMode(VF.Voice.Mode.SOFT).addTickables(notes);
      const vT = V(nT), vB = V(nB);
      new VF.Formatter().joinVoices([vT]).joinVoices([vB]).format([vT, vB], Math.max(40, tr.getNoteEndX() - ns - 14));
      vT.draw(ctx, tr); vB.draw(ctx, bs);
      trTop = tr.getYForLine(0); bsTop = bs.getYForLine(0); midY = (tr.getYForLine(4) + bsTop) / 2; bsBot = bs.getYForLine(4);
      const gT = slotGeometry(tr, evT, nT), gB = slotGeometry(bs, evB, nB);
      const slots = (evs, geo, top, list) => evs.forEach((e, i) => {
        if (!e.slot) return;
        const g = geo[i];
        list.push({ id: e.slot, x0: g.x0, x1: g.x1, cx: g.cx, locked: !!e.locked });
        if (e.ph === 'note') svg.appendChild(svgEl('circle', { cx: g.cx, cy: top + 20, r: 6, class: 'ph-note' + (spec.sel === e.slot ? ' on' : '') }));
        if (spec.sel === e.slot) behind(svg, svgEl('rect', { x: g.x0 + 1, y: top - 30, width: Math.max(6, g.x1 - g.x0 - 2), height: 100, rx: 8, class: 'sel' }));
      });
      slots(evT, gT, trTop, slotsT);
      slots(evB, gB, bsTop, slotsB);
      // a half bar whose rhythm is being changed: one band over both staves
      if (spec.selSeg != null && segIdx.includes(spec.selSeg) && segs[spec.selSeg].pat) {
        const mine = slotsT.concat(slotsB).filter(sl => sl.id.slice(1).split('.')[0] === String(spec.selSeg));
        const a = Math.min(...mine.map(sl => sl.x0)), b = Math.max(...mine.map(sl => sl.x1));
        behind(svg, svgEl('rect', { x: a + 1, y: trTop - 24, width: Math.max(8, b - a - 2), height: bsBot - trTop + 48, rx: 10, class: 'sel' }));
      }
      ghosts.forEach(({ s, i }) => {
        const g = gT[i], on = spec.selSeg === s, x0 = g.x0 + 3, x1 = Math.max(g.x0 + 16, g.x1 - 3);
        svg.appendChild(svgEl('rect', { x: x0, y: trTop - 4, width: x1 - x0, height: bsBot - trTop + 8, rx: 9, class: 'ph-beat' + (on ? ' on' : '') }));
        svg.appendChild(svgEl('text', { x: (x0 + x1) / 2, y: midY + 6, class: 'ph-plus' + (on ? ' on' : '') }, '+'));
        const slot = { id: 's' + s, x0: g.x0, x1: g.x1, cx: (g.x0 + g.x1) / 2, ghost: true };
        slotsT.push(slot); slotsB.push(slot);
      });
      x += w;
    });
    hit.rows.push({ topY: trTop, topDia: 38, half: 5, yMin: li === 0 ? -100 : y0 - 10, yMax: midY, minDia: 24, maxDia: 44, slots: slotsT, clef: 'treble' });
    hit.rows.push({ topY: bsTop, topDia: 26, half: 5, yMin: midY, yMax: y0 + rowH - 6, minDia: 8, maxDia: 32, slots: slotsB, clef: 'bass' });
  });
  return hit;
}
/* the four rhythms of a half bar as small pictures: upper voice above, lower voice below */
function renderDuoMini(host, pat, w = 76, scale = 0.8) {
  host.innerHTML = '';
  const r = new VF.Renderer(host, VF.Renderer.Backends.SVG);
  r.resize(Math.round(w * scale), Math.round(98 * scale));
  const ctx = r.getContext();
  ctx.scale(scale, scale);
  ctx.setFillStyle('currentColor'); ctx.setStrokeStyle('currentColor');
  // like a duet on one staff: upper voice stems up on the top line, lower voice stems down on the bottom line
  TWO_DURS[pat].forEach((durs, row) => {
    const st = new VF.Stave(2, row ? 18 : 0, w - 4, { num_lines: 1 });
    st.setContext(ctx).draw();
    const notes = durs.map(d => new VF.StaveNote({ keys: ['f/5'], duration: DUR_Q[d], stem_direction: row ? -1 : 1 }));
    const v = new VF.Voice({ num_beats: 2, beat_value: 4 }).setMode(VF.Voice.Mode.SOFT).addTickables(notes);
    new VF.Formatter().joinVoices([v]).format([v], w - 26);
    v.draw(ctx, st);
  });
  host.querySelector('svg').setAttribute('class', 'mini-svg');
}

const ExTwo = {
  id: 'two', titleKey: 'twTitle', descKey: 'twDesc',
  how: ['twHow1', 'twHow2', 'twHow3', 'twHow4'], howTitle: 'twHowTitle',
  S: Object.assign({ bars: 4, center: 'both', tempo: 63, rhythm: false, limit: false, countIn: true }, store.get('two.s', {}), { limit: false }),
  task: null, ans: null, cur: null, checked: false, res: null, hit: null, playsLeft: 3, lastV: 'u', pickFor: null,

  save() { store.set('two.s', this.S); },
  build() {
    const P = this.P = panelShell(this);
    this.buildSettings();
    this.playBtn = playButton('listen', () => this.events(true), {
      primary: true,
      labelFn: () => this.S.limit && !this.checked ? t('listenLeft', { n: this.playsLeft }) : t('listen'),
      allowed: () => this.checked || !this.S.limit || this.playsLeft > 0,
      before: () => { if (!this.checked && this.S.limit) { this.playsLeft--; this.render(); } }
    });
    mainControls(this, P, this.playBtn);
    this.palette = el('div', { class: 'palette duo-pal', role: 'group', 'aria-label': t('twPalLbl') });
    ['HH', 'QQ', 'UQ', 'LQ'].forEach(p => {
      const box = el('span', { class: 'pal-nota' });
      const b = el('button', { type: 'button', class: 'pal-b', title: t('twPat_' + p), 'aria-label': t('twPat_' + p) }, box);
      renderDuoMini(box, p);
      b.addEventListener('click', () => this.applyPat(p));
      this.palette.append(b);
    });
    bindStaffInput(P.score, this);
    watchWidth(P.score, () => this.render());
    watchWidth(P.solHost, () => this.renderSolution());
    if (!this.task) this.newTask(); else this.render();
  },
  buildSettings() {
    const S = this.S, B = this.P.settingsBody;
    B.replaceChildren(howField(this),
      segControl('two-center', 'twKey', [['C', t('twC')], ['a', t('twA')], ['both', t('both')]], S.center, v => { S.center = v; this.save(); this.newTask(); }),
      toggleGroup('options',
        toggleControl('two-rh', 'twRhythm', S.rhythm, v => { S.rhythm = v; this.save(); this.newTask(); }),
        toggleControl('two-count', 'countIn', S.countIn, v => { S.countIn = v; this.save(); })));
  },

  newTask() {
    const S = this.S;
    let r = null;
    for (let i = 0; i < 6 && !r; i++) r = twoVoice(S.bars, S.center === 'both' ? (chance(0.5) ? 'C' : 'a') : S.center);
    this.task = r;
    const last = r.segs.length - 1;
    this.ans = r.segs.map((sg, s) => S.rhythm || s === last ? this.emptySeg(sg.pat, s) : { pat: null, up: [], lo: [] });
    this.checked = false; this.res = null; this.playsLeft = 3; this.lastV = 'u'; this.pickFor = null;
    this.cur = null;
    this.cur = this.firstOpen();
    if (this.P) { setFeedback(this.P.feedback, '', ''); this.P.solWrap.hidden = true; this.render(); }
  },
  emptySeg(pat, s) {
    const [du, dl] = TWO_DURS[pat], g = this.task.segs[0];
    const sg = { pat, up: du.map(() => null), lo: dl.map(() => null) };
    if (s === 0) { sg.up[0] = { ...g.up[0] }; sg.lo[0] = { ...g.lo[0] }; }
    return sg;
  },
  isGiven(s, k) { return s === 0 && k === 0; },
  // stops for one voice in time order: a half bar without rhythm is one stop ({k: -1})
  stops(v) {
    const out = [];
    this.ans.forEach((sg, s) => {
      if (!sg.pat) { out.push({ s, v: null, k: -1 }); return; }
      sg[v === 'u' ? 'up' : 'lo'].forEach((_, k) => { if (!this.isGiven(s, k)) out.push({ s, v, k }); });
    });
    return out;
  },
  firstOpen() {
    for (const v of ['u', 'l']) {
      const st = this.stops(v).find(p => p.k < 0 || !this.ans[p.s][v === 'u' ? 'up' : 'lo'][p.k]);
      if (st) return st;
    }
    return this.stops('u')[0] || { s: 0, v: 'u', k: 0 };
  },
  hasInput() {
    return this.ans.some((sg, s) => sg.up.some((n, k) => n && !this.isGiven(s, k)) || sg.lo.some((n, k) => n && !this.isGiven(s, k)) || (sg.pat && s < this.ans.length - 1 && !this.S.rhythm));
  },
  events(countIn, only) {
    const q = 60 / this.S.tempo, ev = [];
    let t0 = 0;
    if (countIn && this.S.countIn) { for (let i = 0; i < 4; i++) ev.push({ t: i * q, click: true, accent: i === 0 }); t0 = 4 * q; }
    this.task.segs.forEach((sg, s) => {
      ['up', 'lo'].forEach((v, vi) => {
        if (only && only !== v) return;
        let beat = 2 * s;
        TWO_DURS[sg.pat][vi].forEach((d, k) => {
          const end = sg.pat === 'W';
          ev.push({ t: t0 + beat * q, midi: Note.midi(sg[v][k]), dur: d * q * (end ? 1.5 : 0.98), vel: beat % 4 === 0 ? 0.68 : 0.6 });
          beat += d;
        });
      });
    });
    return ev;
  },

  /* ---------- editing ---------- */
  get cursor() { return 0; },
  set cursor(x) { /* the position lives in this.cur */ },
  vKey(v) { return v === 'u' ? 'up' : 'lo'; },
  isLocked() { return this.checked; },
  getNote() { const c = this.cur; return c && c.v && c.k >= 0 ? this.ans[c.s][this.vKey(c.v)][c.k] : null; },
  diaRange() { return TWO_RANGE[this.cur && this.cur.v ? this.cur.v : this.lastV]; },
  refNote() {
    const c = this.cur, v = c.v, key = this.vKey(v);
    for (let s = c.s; s >= 0; s--) {
      const arr = this.ans[s][key];
      for (let k = (s === c.s ? c.k - 1 : arr.length - 1); k >= 0; k--) if (arr[k]) return arr[k];
    }
    return this.task.segs[0][key][0];
  },
  defaultAlt(d) {
    // accidentals hold to the end of the bar (white keys: mostly a natural)
    const c = this.cur, key = this.vKey(c.v), bar0 = c.s - (c.s % 2), prev = [];
    for (let s = bar0; s <= c.s; s++) this.ans[s][key].forEach((n, k) => { if (s < c.s || k < c.k) prev.push(n); });
    return readAlt(prev, d, this.task.key.sig);
  },
  setNote(n) {
    const c = this.cur;
    this.ans[c.s][this.vKey(c.v)][c.k] = n;
    if (n && App.hearInput) Sound.note(Note.midi(n));
    this.render();
  },
  moveCursor(d) {
    const v = this.cur && this.cur.v ? this.cur.v : this.lastV, list = this.stops(v);
    if (!list.length) return;
    let i = list.findIndex(p => p.s === this.cur.s && (p.k === this.cur.k || p.k < 0));
    if (i >= 0) i += d;
    else { i = list.findIndex(p => p.s >= this.cur.s); if (i < 0) i = list.length; if (d < 0) i -= 1; }
    this.cur = list[clamp(i, 0, list.length - 1)];
    this.pickFor = null;
    this.render();
  },
  advance() {
    const v = this.cur.v, list = this.stops(v), i = list.findIndex(p => p.s === this.cur.s && p.k === this.cur.k);
    if (i >= 0 && i < list.length - 1) this.cur = list[i + 1];
    else { const o = this.firstOpen(); if (o) this.cur = o; }
  },
  cmd(c, arg) {
    if (this.checked) return;
    if (c === 'left' || c === 'right') { this.moveCursor(c === 'left' ? -1 : 1); return; }
    const cur = this.cur;
    if (!cur || !cur.v || cur.k < 0 || this.isGiven(cur.s, cur.k)) return;
    const n = this.getNote(), rg = this.diaRange();
    const put = (d, a) => { d = clamp(d, rg[0], rg[1]); this.setNote({ d, a: a ?? this.defaultAlt(d) }); };
    switch (c) {
      case 'up': case 'down':
        if (!n) { const ref = this.refNote(); put(ref.d, ref.a); } else put(n.d + (c === 'up' ? 1 : -1));
        return;
      case 'octUp': case 'octDown': if (n) put(n.d + (c === 'octUp' ? 7 : -7), n.a); return;
      case 'acc': if (n) this.setNote({ d: n.d, a: arg }); return;
      case 'accUp': if (n) this.setNote({ d: n.d, a: Math.min(2, n.a + 1) }); return;
      case 'accDown': if (n) this.setNote({ d: n.d, a: Math.max(-2, n.a - 1) }); return;
      case 'letter': {
        const ref = n || this.refNote();
        const d = clamp(Note.nearestStep(arg.step, ref.d), rg[0], rg[1]);
        this.ans[cur.s][this.vKey(cur.v)][cur.k] = { d, a: arg.a ?? this.defaultAlt(d) };
        if (App.hearInput) Sound.note(Note.midi(this.ans[cur.s][this.vKey(cur.v)][cur.k]));
        this.advance();
        this.render();
        return;
      }
      case 'clear': this.setNote(null); return;
    }
  },
  applyPat(p) {
    const s = this.cur.s, old = this.ans[s], sg = this.emptySeg(p, s);
    if (old.pat) {
      ['up', 'lo'].forEach((v, vi) => {
        const on = onsetsQ(TWO_DURS[old.pat][vi]), nn = onsetsQ(TWO_DURS[p][vi]);
        nn.forEach((o, k) => { const j = on.indexOf(o); if (j >= 0 && old[v][j] && !this.isGiven(s, k)) sg[v][k] = old[v][j]; });
      });
    }
    this.ans[s] = sg;
    this.pickFor = null;
    // rhythm first, as in the melody dictation: straight on to the next half bar still without a rhythm;
    // once every half bar has one, on to the first empty note
    // (a changed rhythm stays in its half bar, on its first empty note)
    const open = this.ans.map((a, i) => i).filter(i => !this.ans[i].pat);
    const ns = old.pat ? null : open.find(i => i > s) ?? open[0];
    let next = null;
    if (ns == null && old.pat) {
      const order = this.lastV === 'l' ? ['l', 'u'] : ['u', 'l'];
      for (const v of order) { const k = sg[this.vKey(v)].findIndex((n, kk) => !n && !this.isGiven(s, kk)); if (k >= 0) { next = { s, v, k }; break; } }
    }
    this.cur = ns != null ? { s: ns, v: null, k: -1 } : next || this.firstOpen();
    setFeedback(this.P.feedback, '', '');
    this.render();
  },
  staffDown(r) {
    if (this.checked) return;
    const id = r.slot.id;
    if (r.slot.ghost) { this.cur = { s: +id.slice(1), v: null, k: -1 }; this.pickFor = null; this.render(); return; }
    if (r.slot.locked) return;
    const v = id[0], [s, k] = id.slice(1).split('.').map(Number);
    this.cur = { s, v, k }; this.lastV = v; this.pickFor = null;
    const [lo, hi] = TWO_RANGE[v], d = clamp(r.dia, lo, hi);
    this.setNote({ d, a: this.defaultAlt(d) });
  },
  staffDrag(id, r) {
    if (this.checked || !this.cur || !this.cur.v || this.isGiven(this.cur.s, this.cur.k)) return;
    const [lo, hi] = TWO_RANGE[this.cur.v], d = clamp(r.dia, lo, hi);
    this.setNote({ d, a: this.defaultAlt(d) });
  },
  canPreview(slot) { return !this.checked && !slot.locked; },

  /* ---------- checking ---------- */
  check() {
    if (this.checked) return;
    if (!this.hasInput()) { this.reveal(); return; }
    const T = this.task.segs, A = this.ans, last = T.length - 1;
    let rOk = 0, rN = 0, pOk = 0, pN = 0;
    const marks = A.map(() => ({ up: [], lo: [], pat: true }));
    T.forEach((tg, s) => {
      const ug = A[s];
      if (s < last) { rN++; if (ug.pat === tg.pat) rOk++; else marks[s].pat = false; }
      ['up', 'lo'].forEach((v, vi) => {
        const tOn = onsetsQ(TWO_DURS[tg.pat][vi]), uOn = ug.pat ? onsetsQ(TWO_DURS[ug.pat][vi]) : [];
        tOn.forEach((o, j) => {
          if (this.isGiven(s, j)) return;
          pN++;
          const k = uOn.indexOf(o);
          if (k >= 0 && ug[v][k] && Note.sameMidi(ug[v][k], tg[v][j])) pOk++;
        });
        uOn.forEach((o, k) => {
          const j = tOn.indexOf(o);
          marks[s][v][k] = this.isGiven(s, k) ? 'given' : j >= 0 && ug[v][k] && Note.sameMidi(ug[v][k], tg[v][j]) ? 'ok' : 'bad';
        });
      });
    });
    const pct = this.S.rhythm ? Math.round(100 * pOk / pN) : Math.round(50 * rOk / rN + 50 * pOk / pN);
    this.res = { marks };
    this.checked = true;
    const kind = pct === 100 ? 'ok' : pct >= 60 ? 'info' : 'bad';
    const line = this.S.rhythm ? t('twResP', { p: pOk, pt: pN }) : t('twRes', { r: rOk, rn: rN, p: pOk, pt: pN });
    setFeedback(this.P.feedback, kind, fbIcon(kind) + `<span>${esc(line)}</span>`, this.voiceBtns());
    if (pct === 100) Sound.chime(2);
    this.P.solWrap.hidden = false;
    this.render(); this.renderSolution();
  },
  reveal() {
    if (this.checked) return;
    this.checked = true;
    setFeedback(this.P.feedback, 'info', fbIcon('info') + `<span>${esc(t('solShown'))}</span>`, this.voiceBtns());
    this.P.solWrap.hidden = false;
    this.render(); this.renderSolution();
  },
  voiceBtns() {
    return el('span', { class: 'row' },
      playButton('twUpper', () => this.events(false, 'up')), playButton('twLower', () => this.events(false, 'lo')));
  },

  /* ---------- drawing ---------- */
  render() {
    if (!this.P || !this.task) return;
    const P = this.P, C = notaColors(), S = this.S, task = this.task;
    const g = task.segs[0], firsts = () => [{ t: 0, midi: Note.midi(g.up[0]), dur: 1.8 }, { t: 0, midi: Note.midi(g.lo[0]), dur: 1.8 }];
    const c = soundChip(t('twFirst', { u: noteName(g.up[0]), l: noteName(g.lo[0]) }), firsts);
    c.classList.add('chip-first');
    P.info.replaceChildren(soundChip(keyName(task.key), () => cadenceEvents(task.key)), c);
    P.opts.replaceChildren(lengthControl('lenBars', [2, 4, 6, 8], S.bars, v => { S.bars = v; this.save(); this.newTask(); }),
      tempoControl('tempoLbl', S.tempo, 40, 108, 3, v => '♩ = ' + v, v => { S.tempo = v; this.save(); }));
    const res = this.res;
    const color = (v, s, k) => {
      if (this.isGiven(s, k)) return 'currentColor';
      if (!res) return C.user;
      return res.marks[s][v === 'u' ? 'up' : 'lo'][k] === 'ok' ? C.ok : C.bad;
    };
    const cur = this.cur, picking = !!cur && (!cur.v || cur.k < 0 || this.pickFor === cur.s);
    this.hit = renderDuo(P.score, {
      key: task.key, segs: this.ans, color, given: (s, k) => this.isGiven(s, k),
      sel: this.checked || !cur || picking ? null : cur.v + cur.s + '.' + cur.k,
      selSeg: this.checked || !picking ? null : cur.s
    });
    if (this.checked) { dockHide(P); this.playBtn.refresh(); syncControls(this); return; }
    const where = t('twWhere', { bar: Math.floor(cur.s / 2) + 1, half: cur.s % 2 + 1 });
    if (picking) {
      const changing = !!this.ans[cur.s].pat;
      dockHint(P, where, t(cur.s === 0 && !changing ? 'twPickFirst' : changing ? 'dockRhythmChange' : 'twPick'));
      P.dock.append(this.palette);
      if (changing) P.dock.append(btn('backToNotes', ICON.left, () => { this.pickFor = null; this.render(); }, 'btn-sec btn-sm'));
    } else {
      const v = cur.v, n = this.getNote();
      const seg = el('div', { class: 'seg seg-sm', role: 'radiogroup', 'aria-label': t('voiceLbl') },
        [['u', 'twUp'], ['l', 'twLo']].map(([vv, key]) => el('button', { type: 'button', class: 'seg-b', role: 'radio', 'aria-checked': String(vv === v),
          onclick: () => { if (vv === v) return; const st = this.stops(vv).find(p => p.s >= cur.s) || this.stops(vv)[0]; this.lastV = vv; this.cur = st; this.render(); } }, t(key))));
      P.dock.hidden = false;
      P.dock.replaceChildren(el('span', { class: 'dock-lbl' }, where), seg, el('span', { class: 'dock-name' }, n ? noteName(n) : '–'), noteTools(this));
      if (cur.s < this.ans.length - 1 || !this.ans[cur.s].pat) P.dock.append(btn('changeRhythm', ICON.rhythm, () => { this.pickFor = cur.s; this.render(); }, 'btn-sec btn-sm change-rhythm'));
    }
    this.playBtn.disabled = !this.checked && S.limit && this.playsLeft <= 0;
    this.playBtn.refresh();
    syncControls(this);
  },
  renderSolution() {
    if (!this.P || !this.checked || this.P.solWrap.hidden) return;
    renderDuo(this.P.solHost, { key: this.task.key, segs: this.task.segs, sel: null, color: () => 'currentColor', given: () => false });
  },
  onKey(e) {
    if (e.key === ' ') { this.playBtn.trigger(); return true; }
    if (e.key === 'Enter') { if (this.checked) this.newTask(); else this.check(); return true; }
    if (/^[1-4]$/.test(e.key) && !this.checked && this.cur && (!this.cur.v || this.cur.k < 0 || this.pickFor === this.cur.s)) { this.applyPat(['HH', 'QQ', 'UQ', 'LQ'][+e.key - 1]); return true; }
    return pitchKey(e, this);
  }
};
