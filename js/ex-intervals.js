'use strict';
/* ============================================================
   Exercise 1 — Intervalle: notate the missing note
   ============================================================ */
const ExInt = {
  id: 'int', no: '1', titleKey: 'intTitle', descKey: 'intDesc',
  S: Object.assign({ dir: 'alt', simple: true, compound: true, playMode: 'mix' }, store.get('int.s', {})),
  count: rnd(2), lastSemis: 0, task: null, ans: null, checked: false, result: null, cursor: 0, hit: null,

  save() { store.set('int.s', this.S); },

  build() {
    const P = this.P = panelShell(this);
    const S = this.S;
    P.settingsBody.append(
      segControl('int-dir', 'intDir', [['alt', t('intDirAlt')], ['up', t('intDirUp')], ['down', t('intDirDown')]], S.dir, v => { S.dir = v; this.save(); }),
      toggleGroup('intRange',
        toggleControl('int-simple', 'intSimple', S.simple, (v, inp) => { if (!v && !S.compound) { inp.checked = true; return; } S.simple = v; this.save(); }),
        toggleControl('int-comp', 'intCompound', S.compound, (v, inp) => { if (!v && !S.simple) { inp.checked = true; return; } S.compound = v; this.save(); })),
      segControl('int-play', 'intPlayMode', [['mix', t('intMix')], ['harm', t('intHarm')], ['mel', t('intMel')]], S.playMode, v => { S.playMode = v; this.save(); this.task.harm = this.pickHarm(); this.render(); })
    );
    this.playBtn = playButton('listen', () => this.events(), { primary: true });
    mainControls(this, P, this.playBtn);
    bindStaffInput(P.score, this);
    watchWidth(P.score, () => this.render());
    if (!this.task) this.newTask(false); else this.render();
  },

  newTask(autoplay) {
    this.count++;
    const S = this.S;
    const up = S.dir === 'up' ? true : S.dir === 'down' ? false : this.count % 2 === 1;
    const pool = [];
    if (S.simple) for (let s = 1; s <= 12; s++) pool.push(s);
    if (S.compound) for (let s = 13; s <= 24; s++) pool.push(s);
    const NUM = { 1: 2, 2: 2, 3: 3, 4: 3, 5: 4, 6: 0, 7: 5, 8: 6, 9: 6, 10: 7, 11: 7, 12: 8 };
    const LO = 40, HI = 84; // E2 .. C6
    for (let tries = 0; tries < 400; tries++) {
      const semis = pick(pool);
      if (semis === this.lastSemis && pool.length > 1) continue;
      const base = semis > 12 ? semis - 12 : semis;
      let num = NUM[base] || (chance(0.5) ? 4 : 5);
      if (semis > 12) num += 7;
      const step = rnd(7);
      const a = wpick([[0, 6], [1, 2], [-1, 2]]);
      if ((a === 1 && (step === 2 || step === 6)) || (a === -1 && (step === 3 || step === 0))) continue;
      const gm0 = STEP_PC[step] + a;
      const lo = up ? LO : LO + semis, hi = up ? HI - semis : HI;
      const octs = [];
      for (let o = 1; o <= 6; o++) { const m = 12 * (o + 1) + gm0; if (m >= lo && m <= hi) octs.push(o); }
      if (!octs.length) continue;
      const o = pick(octs);
      const given = { d: o * 7 + step, a };
      const tm = Note.midi(given) + (up ? semis : -semis);
      const target = Note.spell(tm, given.d + (up ? num - 1 : -(num - 1)));
      if (Math.abs(target.a) > 1) continue;
      this.task = { given, target, up, iv: intervalInfo(given, target), harm: this.pickHarm() };
      this.lastSemis = semis;
      break;
    }
    this.ans = null; this.checked = false; this.result = null;
    setFeedback(this.P.feedback, '', '');
    this.render();
    if (autoplay) this.playBtn.trigger();
  },

  events() {
    const g = Note.midi(this.task.given), x = Note.midi(this.task.target);
    if (this.task.harm) return [{ t: 0, midi: g, dur: 2.4, vel: 0.7 }, { t: 0, midi: x, dur: 2.4, vel: 0.7 }];
    return [{ t: 0, midi: g, dur: 1.25, vel: 0.72 }, { t: 1.4, midi: x, dur: 1.9, vel: 0.72 }];
  },

  hasInput() { return !!this.ans; },
  // together 7 times out of 10 (the default), or always one way
  pickHarm() { return this.S.playMode === 'harm' ? true : this.S.playMode === 'mel' ? false : Math.random() < 0.7; },

  /* sequence-editor interface (one slot) */
  isLocked() { return this.checked; },
  moveCursor() {},
  getNote() { return this.ans; },
  editable() { return !this.checked; },
  refNote() { return this.task.given; },
  defaultAlt(i, d) { return readAlt([this.task.given], d, NO_SIG); },
  diaRange() { return [14, 44]; },
  setNote(i, n) {
    this.ans = n;
    if (App.hearInput) Sound.note(Note.midi(n));
    this.render();
  },
  clearSlot() { this.ans = null; this.render(); },
  cmd(c, arg) {
    // a note name lands on the nearest such note above (or below) the given note; octave buttons go further
    if (c === 'letter' && !this.checked) {
      const g = this.task.given, gs = mod(g.d, 7);
      const d = this.task.up ? g.d + (mod(arg.step - gs, 7) || 7) : g.d - (mod(gs - arg.step, 7) || 7);
      this.setNote(0, { d, a: this.defaultAlt(0, d) });
      return;
    }
    SeqEdit.cmd(this, c, arg);
  },
  staffDown(r) {
    if (r.slot.id !== 'ans' || this.checked) return;
    this.setNote(0, { d: r.dia, a: this.defaultAlt(0, r.dia) });
  },
  staffDrag(id, r) { this.staffDown(r); },
  canPreview(slot) { return slot.id === 'ans' && !this.checked; },

  check() {
    if (this.checked) return;
    if (!this.ans) { this.reveal(); return; }
    const { given, target, up, iv } = this.task;
    const ok = Note.sameMidi(this.ans, target);
    const exact = Note.eq(this.ans, target);
    this.checked = true;
    this.result = { ok, exact };
    statAdd('int', ok ? 100 : 0);
    const dir = t(up ? 'dirUp' : 'dirDown');
    let msg;
    if (ok && exact) msg = t('intOk', { iv: intervalName(iv), dir, a: noteName(given), b: noteName(target) });
    else if (ok) msg = t('intOkEnh', { iv: intervalName(iv), b: noteName(target), u: noteName(this.ans) });
    else msg = t('intBad', { iv: intervalName(iv), dir, b: noteName(target), u: noteName(this.ans), uiv: intervalName(intervalInfo(given, this.ans)) });
    setFeedback(this.P.feedback, ok ? 'ok' : 'bad', fbIcon(ok ? 'ok' : 'bad') + `<span>${esc(msg)}</span>`);
    this.render();
  },
  reveal() {
    if (this.checked) return;
    const { given, target, up, iv } = this.task;
    this.checked = true;
    this.result = { ok: false, shown: true };
    setFeedback(this.P.feedback, 'info', fbIcon('info') + `<span>${esc(t('intShown', { iv: intervalName(iv), dir: t(up ? 'dirUp' : 'dirDown'), a: noteName(given), b: noteName(target) }))}</span>`);
    this.render();
  },

  render() {
    if (!this.P || !this.task) return;
    const P = this.P, C = notaColors();
    const { given, target, up } = this.task;
    P.info.replaceChildren(
      chip((up ? '↑ ' : '↓ ') + t(up ? 'intFindUpper' : 'intFindLower'), 'chip-strong'),
      soundChip(t('intGiven', { n: noteName(given) }), () => [{ t: 0, midi: Note.midi(given), dur: 1.6 }]),
      chip(t(this.task.harm ? 'intPlayedHarm' : 'intPlayedMel'), 'chip-muted'));
    const cols = [{ note: given, color: C.ink, slot: 'given', locked: true, label: t('colGiven') }];
    if (!this.checked) cols.push({ note: this.ans, color: C.user, slot: 'ans', label: t('colYours') });
    else if (this.result.shown) {
      if (this.ans) cols.push({ note: this.ans, color: C.user, slot: 'ans', locked: true, label: t('colYours') });
      cols.push({ note: target, color: C.ok, slot: 'sol', locked: true, label: t('colSolution') });
    } else {
      cols.push({ note: this.ans, color: this.result.ok ? C.ok : C.bad, slot: 'ans', locked: true, label: t('colYours') });
      if (!this.result.exact) cols.push({ note: target, color: C.ok, slot: 'sol', locked: true, label: t('colSolution') });
    }
    this.hit = renderGrand(P.score, cols, { sel: this.checked ? null : 'ans' });
    if (this.checked) dockHide(P);
    else dockNote(P, this, t('dockYourNote'), this.ans);
    syncControls(this);
  },

  onKey(e) {
    if (e.key === ' ') { this.playBtn.trigger(); return true; }
    if (e.key === 'Enter') { if (this.checked) this.newTask(true); else this.check(); return true; }
    return pitchKey(e, this);
  }
};

/* Grand staff with whole notes in columns (used by the interval exercise) */
function renderGrand(host, cols, opts = {}) {
  const scale = autoScale(host.clientWidth) * 1.12;
  const W = Math.max(260, host.clientWidth) / scale;
  const width = Math.min(W - 16, 150 + cols.length * (W > 600 ? 110 : 92));
  const x0 = (W - width) / 2;
  const top = 18;
  const { ctx, svg } = vfSurface(host, 262 + top, scale);
  const tr = new VF.Stave(x0, top, width).addClef('treble');
  const bs = new VF.Stave(x0, top + 120, width).addClef('bass');
  const ns = Math.max(tr.getNoteStartX(), bs.getNoteStartX());
  tr.setNoteStartX(ns); bs.setNoteStartX(ns);
  tr.setContext(ctx).draw(); bs.setContext(ctx).draw();
  ['brace', 'singleLeft', 'singleRight'].forEach(tp => new VF.StaveConnector(tr, bs).setType(tp).setContext(ctx).draw());
  const evT = cols.map(c => ({ dur: 'w', note: c.note && c.note.d >= 28 ? c.note : null, color: c.color, ph: !c.note && !c.locked ? 'note' : null }));
  const evB = cols.map(c => ({ dur: 'w', note: c.note && c.note.d < 28 ? c.note : null, color: c.color }));
  markAccidentals(evT, NO_SIG); markAccidentals(evB, NO_SIG);
  const nT = evT.map(e => mkNote(e, 'treble')), nB = evB.map(e => mkNote(e, 'bass'));
  const mkV = notes => new VF.Voice({ num_beats: 4 * cols.length, beat_value: 4 }).setMode(VF.Voice.Mode.SOFT).addTickables(notes);
  const vT = mkV(nT), vB = mkV(nB);
  new VF.Formatter().joinVoices([vT]).joinVoices([vB]).format([vT, vB], tr.getNoteEndX() - ns - 24);
  vT.draw(ctx, tr); vB.draw(ctx, bs);

  const xs = cols.map((c, i) => {
    if (!c.note) return nT[i].getAbsoluteX() + 8;
    const n = c.note.d >= 28 ? nT[i] : nB[i];
    return (n.getNoteHeadBeginX() + n.getNoteHeadEndX()) / 2;
  });
  const slots = cols.map((c, i) => ({
    id: c.slot, cx: xs[i], locked: !!c.locked,
    x0: i === 0 ? ns - 10 : (xs[i - 1] + xs[i]) / 2,
    x1: i === cols.length - 1 ? tr.getNoteEndX() + 10 : (xs[i] + xs[i + 1]) / 2
  }));
  const tTop = tr.getYForLine(0), bTop = bs.getYForLine(0), mid = (tr.getYForLine(4) + bTop) / 2;
  cols.forEach((c, i) => {
    if (c.label) svg.appendChild(svgEl('text', { x: xs[i], y: 252 + top, class: 'col-lbl' }, c.label));
    if (!c.note && !c.locked) {
      svg.appendChild(svgEl('rect', { x: xs[i] - 15, y: tTop - 6, width: 30, height: bs.getYForLine(4) - tTop + 12, rx: 8, class: 'ph-beat on' }));
      svg.appendChild(svgEl('text', { x: xs[i], y: mid + 6, class: 'ph-plus on' }, '?'));
    }
    if (opts.sel === c.slot) behind(svg, svgEl('rect', { x: slots[i].x0 + 4, y: tTop - 44, width: slots[i].x1 - slots[i].x0 - 8, height: bs.getYForLine(4) - tTop + 80, rx: 10, class: 'sel' }));
  });
  return {
    rows: [
      { topY: tTop, topDia: 38, half: 5, yMin: -100, yMax: mid, minDia: 26, maxDia: 44, slots },
      { topY: bTop, topDia: 26, half: 5, yMin: mid, yMax: 1000, minDia: 12, maxDia: 32, slots }
    ]
  };
}
