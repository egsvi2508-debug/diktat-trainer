'use strict';
/* ============================================================
   Exercise 2a — Rhythmus-Lexikon (every way to fill 3 eighths)
   Exercise 2b — Melodiediktat in 6/8
   ============================================================ */
const DUR_VF = { 1: '16', 2: '8', 3: '8d', 4: 'q', 6: 'qd' };

const RHY = (() => {
  const all = [];
  (function rec(rem, acc) {
    if (!rem) { all.push(acc.slice()); return; }
    for (const p of [6, 4, 3, 2, 1]) if (p <= rem) { acc.push(p); rec(rem - p, acc); acc.pop(); }
  })(6, []);
  const BASIC = ['6', '4-2', '2-4', '2-2-2', '3-1-2', '1-1-2-2', '2-2-1-1', '2-1-1-2'];
  const COMMON = ['4-1-1', '1-1-4', '3-3', '1-1-1-1-2', '2-1-1-1-1', '1-1-2-1-1', '1-1-1-1-1-1', '3-1-1-1', '2-3-1'];
  const list = all.map(durs => {
    const id = durs.join('-');
    return { id, durs, tier: BASIC.includes(id) ? 0 : COMMON.includes(id) ? 1 : 2 };
  });
  list.sort((a, b) => a.durs.length - b.durs.length || a.tier - b.tier || BASIC.indexOf(a.id) - BASIC.indexOf(b.id));
  return { list, BASIC, byId: Object.fromEntries(list.map(p => [p.id, p])) };
})();
const onsets = id => { let t0 = 0; return id.split('-').map(Number).map(u => { const o = t0; t0 += u; return o; }); };

function patternName(p) {
  const names = LANG === 'de'
    ? { 1: 'Sechzehntel', 2: 'Achtel', 3: 'punkt. Achtel', 4: 'Viertel', 6: 'punkt. Viertel' }
    : { 1: '16th', 2: '8th', 3: 'dotted 8th', 4: 'quarter', 6: 'dotted quarter' };
  const runs = [];
  p.durs.forEach(u => { const r = runs[runs.length - 1]; if (r && r.u === u) r.n++; else runs.push({ u, n: 1 }); });
  return runs.map(r => (r.n > 1 ? r.n + '× ' : '') + names[r.u]).join(' · ');
}

/* small rhythm picture on a one-line staff */
function renderRhythmMini(host, durs, w = 120, scale = 1) {
  host.innerHTML = '';
  const r = new VF.Renderer(host, VF.Renderer.Backends.SVG);
  r.resize(Math.round(w * scale), Math.round(58 * scale));
  const ctx = r.getContext();
  ctx.scale(scale, scale);
  ctx.setFillStyle('currentColor'); ctx.setStrokeStyle('currentColor');
  const st = new VF.Stave(2, 2, w - 4, { num_lines: 1 });
  st.setContext(ctx).draw();
  const notes = durs.map(u => {
    const n = new VF.StaveNote({ keys: ['f/5'], duration: DUR_VF[u], stem_direction: 1 });
    if (u === 3 || u === 6) VF.Dot.buildAndAttach([n], { all: true });
    return n;
  });
  const beams = VF.Beam.generateBeams(notes, { groups: [new VF.Fraction(3, 8)], stem_direction: 1 });
  const v = new VF.Voice({ num_beats: 3, beat_value: 8 }).setMode(VF.Voice.Mode.SOFT).addTickables(notes);
  new VF.Formatter().joinVoices([v]).format([v], w - 34);
  v.draw(ctx, st);
  beams.forEach(b => b.setContext(ctx).draw());
  host.querySelector('svg').setAttribute('class', 'mini-svg');
}
function onsetGrid(durs) {
  const g = el('div', { class: 'rc-grid', 'aria-hidden': 'true' });
  durs.forEach(u => {
    g.append(el('span', { class: 'on' }));
    for (let i = 1; i < u; i++) g.append(el('span', { class: 'hold' }));
  });
  return g;
}
/* a rhythm group played on one piano key, the way a teacher would tap it out */
function rhythmEvents(durs, tempo, opts = {}) {
  const six = 60 / tempo / 6;
  const ev = [];
  let t0 = 0;
  if (opts.countIn) { for (let i = 0; i < 6; i++) ev.push({ t: i * 2 * six, click: true, accent: i % 3 === 0 }); t0 = 12 * six; }
  const reps = opts.reps || 2;
  for (let r = 0; r < reps; r++) {
    ev.push({ t: t0, click: true, accent: r === 0 });
    let pos = 0;
    durs.forEach((u, k) => {
      const vel = k === 0 ? (r === 0 ? 0.84 : 0.76) : pos % 2 === 0 ? 0.64 : 0.56;
      ev.push({ t: t0, midi: 67, dur: u * six * 0.97, vel });
      t0 += u * six; pos += u;
    });
  }
  return ev;
}

/* ---------------- 2a: Lexikon ---------------- */
const ExLex = {
  id: 'lex', no: '2a', titleKey: 'lexTitle', descKey: 'lexDesc',
  sel: new Set(store.get('lex.sel', RHY.BASIC)),
  quiz: null,

  selected() { const s = [...this.sel]; if (!s.includes('6')) s.push('6'); return s; },
  saveSel() {
    this.sel.add('6');
    store.set('lex.sel', [...this.sel]);
    this.updateCount();
    if (ExMel.P) ExMel.renderPalette();
  },

  build() {
    const root = this.root;
    root.innerHTML = '';
    this.P = { settingsBody: el('div', { class: 'set-list' }) };
    const preset = ids => { this.sel = new Set(ids); this.syncChecks(); this.saveSel(); };
    this.P.settingsBody.append(
      el('div', { class: 'field' }, el('span', { class: 'field-lbl' }, t('lexPresets')),
        el('div', { class: 'row' },
          btn('lexBasic', null, () => preset(RHY.BASIC)),
          btn('lexAll', null, () => preset(RHY.list.map(p => p.id))),
          btn('lexNone', null, () => preset(['6'])))),
      sliderControl('lex-tempo', 'tempoDQ', 36, 84, 2, ExMel.S.tempo, v => '♩. = ' + v, v => { ExMel.S.tempo = v; ExMel.save(); })
    );
    this.countEl = el('span', { class: 'lex-count' });
    this.quizBtn = btn('lexQuizStart', ICON.ear, () => this.toggleQuiz(), 'btn-play btn-big');
    this.quizBar = el('div', { class: 'quizbar', hidden: true });
    const groups = el('div', { class: 'lex-groups' });
    for (let n = 1; n <= 6; n++) {
      const pats = RHY.list.filter(p => p.durs.length === n);
      const grid = el('div', { class: 'lex-grid' });
      pats.forEach(p => grid.append(this.card(p)));
      groups.append(el('section', { class: 'lex-sec' },
        el('h3', {}, t(n === 1 ? 'lexOneNote' : 'lexNNotes', { n }), el('span', { class: 'lex-sec-n' }, String(pats.length))),
        grid));
    }
    root.append(el('p', { class: 'hint-line' }, t(this.descKey)),
      el('div', { class: 'row lex-bar' }, this.quizBtn, this.countEl),
      this.quizBar, groups);
    this.updateCount();
  },
  card(p) {
    const nota = el('div', { class: 'rc-nota' });
    renderRhythmMini(nota, p.durs, 120, 1);
    const on = this.sel.has(p.id) || p.id === '6';
    const play = el('button', { type: 'button', class: 'tb tb-small', title: t('lexPlay'), 'aria-label': t('lexPlay') + ': ' + patternName(p), html: ICON.play });
    play.addEventListener('click', ev => { ev.stopPropagation(); Sound.play(rhythmEvents(p.durs, ExMel.S.tempo)); });
    const card = el('div', { class: 'rcard t' + p.tier + (on ? ' on' : ''), 'data-id': p.id, role: 'button', tabindex: '0', 'aria-pressed': String(on), title: p.id === '6' ? t('lexAlways') : t('lexUse') },
      el('span', { class: 'rc-check', html: ICON.check, 'aria-hidden': 'true' }),
      el('div', { class: 'rc-top' }, nota, play),
      onsetGrid(p.durs),
      el('div', { class: 'rc-name' }, patternName(p)));
    const act = () => {
      if (this.quiz) { this.answerQuiz(p.id, card); return; }
      if (p.id === '6') return;
      if (this.sel.has(p.id)) this.sel.delete(p.id); else this.sel.add(p.id);
      this.syncChecks(); this.saveSel();
    };
    card.addEventListener('click', ev => { if (!ev.target.closest('button')) act(); });
    card.addEventListener('keydown', ev => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target === card) { ev.preventDefault(); act(); } });
    return card;
  },
  syncChecks() {
    $$('.rcard', this.root).forEach(c => {
      const on = this.sel.has(c.dataset.id) || c.dataset.id === '6';
      c.classList.toggle('on', on);
      c.setAttribute('aria-pressed', String(on));
    });
  },
  updateCount() { if (this.countEl) this.countEl.textContent = t('lexCount', { n: this.selected().length, total: RHY.list.length }); },
  render() {},

  toggleQuiz() {
    if (this.quiz) { this.quiz = null; this.quizBar.hidden = true; this.root.classList.remove('quizzing'); $('.lbl', this.quizBtn).textContent = t('lexQuizStart'); return; }
    this.quiz = { ok: 0, n: 0, cur: null, answered: false };
    this.root.classList.add('quizzing');
    $('.lbl', this.quizBtn).textContent = t('lexQuizStop');
    this.quizBar.hidden = false;
    this.nextQuiz();
  },
  nextQuiz() {
    const q = this.quiz;
    const pool = this.selected();
    let id = pick(pool);
    if (pool.length > 1) while (id === q.cur) id = pick(pool);
    q.cur = id; q.answered = false;
    $$('.rcard', this.root).forEach(c => c.classList.remove('qa-ok', 'qa-bad'));
    this.drawQuizBar();
    this.playQuiz();
  },
  playQuiz() { Sound.play(rhythmEvents(RHY.byId[this.quiz.cur].durs, ExMel.S.tempo, { countIn: true, reps: 2 })); },
  drawQuizBar(msg, kind) {
    const q = this.quiz;
    this.quizBar.innerHTML = '';
    this.quizBar.append(
      el('span', { class: 'qz-q' }, msg || t('lexQuizQ')),
      el('span', { class: 'chip ' + (kind === 'ok' ? 'chip-ok' : kind === 'bad' ? 'chip-bad' : 'chip-muted') }, t('lexQuizScore', { ok: q.ok, n: q.n })),
      el('span', { class: 'spacer' }),
      q.answered ? btn('nextTask', ICON.next, () => this.nextQuiz(), 'btn-play') : btn('again', ICON.play, () => this.playQuiz(), 'btn-sec'));
  },
  answerQuiz(id, card) {
    const q = this.quiz;
    if (q.answered) return;
    if (!this.selected().includes(id)) return;
    q.answered = true; q.n++;
    const ok = id === q.cur;
    if (ok) q.ok++;
    card.classList.add(ok ? 'qa-ok' : 'qa-bad');
    const right = $(`.rcard[data-id="${q.cur}"]`, this.root);
    if (right) right.classList.add('qa-ok');
    this.drawQuizBar(ok ? t('lexQuizOk') : t('lexQuizBad', { name: patternName(RHY.byId[q.cur]) }), ok ? 'ok' : 'bad');
    if (!ok && right) right.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  },
  onKey(e) {
    if (this.quiz && e.key === ' ') { this.playQuiz(); return true; }
    if (this.quiz && e.key === 'Enter') { this.nextQuiz(); return true; }
    return false;
  }
};

/* ---------------- 2b: Melodiediktat ---------------- */
const ExMel = {
  id: 'mel', no: '2b', titleKey: 'melTitle', descKey: 'melDesc',
  S: Object.assign({ bars: 4, mode: 'maj', maxAcc: 3, tempo: 50, rhythmOnly: false, metro: false, allPats: false, countIn: true }, store.get('mel.s', {})),
  task: null, ans: null, cur: { b: 0, k: -1 }, checked: false, res: null, hit: null,

  save() { store.set('mel.s', this.S); },

  build() {
    const P = this.P = panelShell(this);
    const S = this.S;
    P.settingsBody.append(
      segControl('mel-bars', 'bars', [[4, '4'], [8, '8'], [12, '12']], S.bars, v => { S.bars = v; this.save(); this.newTask(); }),
      segControl('mel-mode', 'modeLbl', [['maj', t('major')], ['min', t('minor')], ['both', t('both')]], S.mode, v => { S.mode = v; this.save(); }),
      segControl('mel-acc', 'maxAcc', [0, 1, 2, 3, 4, 5].map(n => [n, String(n)]), S.maxAcc, v => { S.maxAcc = v; this.save(); }),
      sliderControl('mel-tempo', 'tempoDQ', 36, 84, 2, S.tempo, v => '♩. = ' + v, v => { S.tempo = v; this.save(); }),
      toggleGroup('options',
        toggleControl('mel-ronly', 'rhythmOnly', S.rhythmOnly, v => { S.rhythmOnly = v; this.save(); this.newTask(); }),
        toggleControl('mel-count', 'countIn', S.countIn, v => { S.countIn = v; this.save(); }),
        toggleControl('mel-metro', 'metroOn', S.metro, v => { S.metro = v; this.save(); }),
        toggleControl('mel-allpats', 'palAll', S.allPats, v => { S.allPats = v; this.save(); this.renderPalette(); }))
    );
    this.playBtn = playButton('listen', () => this.events(this.task.beats, true), { primary: true });
    this.yoursBtn = playButton('playYours', () => this.events(this.ans.filter(b => b.pat), false));
    this.palette = el('div', { class: 'palette', role: 'group', 'aria-label': t('palLabel') });
    mainControls(this, P, this.playBtn);
    bindStaffInput(P.score, this);
    watchWidth(P.score, () => this.render());
    watchWidth(P.solHost, () => this.renderSolution());
    if (!this.task) this.newTask(); else { this.renderPalette(); this.render(); }
  },

  newTask() {
    const S = this.S;
    const key = S.rhythmOnly ? makeKey(0, false) : randomKey(S.maxAcc, S.mode);
    const nb = S.bars * 2;
    const beats = genRhythm(nb, ExLex.selected(), S.bars);
    const meta = [];
    beats.forEach((id, b) => id.split('-').forEach((_, k) => meta.push({ b, k, beatStart: k === 0, down: k === 0 && b % 2 === 0 })));
    const notes = S.rhythmOnly ? meta.map(() => ({ d: 34, a: 0 })) : genMelodyPitches(key, meta);
    let p = 0;
    this.task = { key, beats: beats.map(id => ({ pat: id, notes: id.split('-').map(() => notes[p++]) })), start: notes[0] };
    this.ans = beats.map(() => ({ pat: null, notes: [] }));
    this.cur = { b: 0, k: -1 };
    this.checked = false; this.res = null;
    if (this.P) {
      setFeedback(this.P.feedback, '', '');
      this.P.solWrap.hidden = true;
      this.renderPalette();
      this.render();
    }
  },

  /* played like a person: strong 1, lighter 4, soft inner notes, legato, a small ritardando into the last note */
  events(beats, countIn) {
    const S = this.S, six = 60 / S.tempo / 6, nb = beats.length, ev = [];
    let t0 = 0;
    if (countIn && S.countIn) { for (let i = 0; i < 6; i++) ev.push({ t: i * 2 * six, click: true, accent: i % 3 === 0 }); t0 = 12 * six; }
    beats.forEach((bt, b) => {
      if (S.metro) ev.push({ t: t0, click: true, accent: b % 2 === 0 });
      const stretch = b >= nb - 2 ? 1 + 0.05 * (b - nb + 3) : 1;
      let pos = 0;
      bt.pat.split('-').map(Number).forEach((u, k) => {
        const n = bt.notes[k], last = b === nb - 1;
        const vel = last ? 0.66 : k === 0 ? (b % 2 === 0 ? 0.8 : 0.7) : pos % 2 === 0 ? 0.6 : 0.54;
        const ioi = u * six * stretch;
        ev.push({ t: t0, midi: S.rhythmOnly ? 67 : Note.midi(n), dur: last ? ioi * 1.8 : S.rhythmOnly ? ioi * 0.92 : ioi * 1.04, vel });
        t0 += ioi; pos += u;
      });
    });
    return ev;
  },

  hasInput() { return this.ans.some(b => b.pat); },

  /* positions = notes plus empty beats, in order */
  positions() {
    const P = [];
    this.ans.forEach((bt, b) => { if (!bt.pat) P.push({ b, k: -1 }); else bt.notes.forEach((_, k) => P.push({ b, k })); });
    return P;
  },
  get cursor() { return this.positions().findIndex(p => p.b === this.cur.b && p.k === this.cur.k); },
  isLocked() { return this.checked; },
  moveCursor(d) {
    const P = this.positions();
    const i = clamp(this.cursor + d, 0, P.length - 1);
    this.cur = P[i]; this.render();
  },
  getNote(i) { const p = this.positions()[i]; return p && p.k >= 0 ? this.ans[p.b].notes[p.k] : null; },
  editable(i) { const p = this.positions()[i]; return !!p && p.k >= 0 && !this.checked && !this.S.rhythmOnly; },
  refNote(i) {
    for (let j = i - 1; j >= 0; j--) { const n = this.getNote(j); if (n) return n; }
    return this.task.start;
  },
  defaultAlt(i, d) {
    const p = this.positions()[i];
    const bar = Math.floor(p.b / 2), prev = [];
    for (let b = bar * 2; b <= p.b; b++) this.ans[b].notes.forEach((n, k) => { if (b < p.b || k < p.k) prev.push(n); });
    return readAlt(prev, d, this.task.key.sig);
  },
  diaRange() { return [26, 42]; },
  setNote(i, n) {
    const p = this.positions()[i];
    this.ans[p.b].notes[p.k] = n;
    if (App.hearInput) Sound.note(Note.midi(n));
    this.render();
  },
  clearSlot(i) {
    const p = this.positions()[i];
    if (!p || this.checked) return;
    this.ans[p.b] = { pat: null, notes: [] };
    this.cur = { b: p.b, k: -1 };
    this.render();
  },
  hintNoNote() {
    if (this.S.rhythmOnly) return;
    if (this.cur.k < 0) setFeedback(this.P.feedback, 'info', fbIcon('info') + `<span>${esc(t('melPickRhythm'))}</span>`);
  },
  cmd(c, arg) { SeqEdit.cmd(this, c, arg); },
  parseSlot(id) { const m = /^b(\d+)(?:n(\d+))?$/.exec(id); return m ? { b: +m[1], k: m[2] == null ? -1 : +m[2] } : null; },
  staffDown(r) {
    if (this.checked) return;
    const s = this.parseSlot(r.slot.id); if (!s) return;
    this.cur = s;
    if (s.k >= 0 && !this.S.rhythmOnly) {
      const i = this.cursor;
      this.setNote(i, { d: r.dia, a: this.defaultAlt(i, r.dia) });
    } else this.render();
  },
  staffDrag(id, r) {
    if (this.checked || this.S.rhythmOnly) return;
    const s = this.parseSlot(id); if (!s || s.k < 0) return;
    this.cur = s;
    const i = this.cursor;
    this.setNote(i, { d: r.dia, a: this.defaultAlt(i, r.dia) });
  },
  canPreview(slot) { return !this.checked && !this.S.rhythmOnly && /n\d+$/.test(slot.id); },

  applyPattern(id) {
    if (this.checked) return;
    const b = this.cur.b;
    const old = this.ans[b].notes;
    const ref = old[old.length - 1] || this.refNote(this.cursor) || this.task.start;
    const durs = id.split('-');
    const first = b === 0 && !old.length ? this.task.start : null;
    this.ans[b] = { pat: id, notes: durs.map((_, k) => ({ ...(old[k] || (k === 0 && first) || ref) })) };
    if (this.S.rhythmOnly) {
      const nb = Math.min(b + 1, this.ans.length - 1);
      this.cur = { b: nb, k: this.ans[nb].pat ? 0 : -1 };
    } else this.cur = { b, k: 0 };
    setFeedback(this.P.feedback, '', '');
    this.render();
  },

  renderPalette() {
    if (!this.palette) return;
    this.palette.innerHTML = '';
    const ids = this.S.allPats ? RHY.list.map(p => p.id) : ExLex.selected();
    RHY.list.filter(p => ids.includes(p.id)).forEach(p => {
      const box = el('span', { class: 'pal-nota' });
      const b = el('button', { type: 'button', class: 'pal-b', title: patternName(p), 'aria-label': patternName(p) }, box);
      renderRhythmMini(box, p.durs, 92, 0.78);
      b.addEventListener('click', () => this.applyPattern(p.id));
      this.palette.append(b);
    });
  },

  check() {
    if (this.checked) return;
    if (!this.hasInput()) { this.reveal(); return; }
    const ronly = this.S.rhythmOnly;
    let rOk = 0, pOk = 0, pTot = 0;
    const beats = this.task.beats.map((sb, b) => {
      const ub = this.ans[b];
      const rhythm = ub.pat === sb.pat;
      if (rhythm) rOk++;
      const sOn = onsets(sb.pat), uOn = ub.pat ? onsets(ub.pat) : [];
      const notes = uOn.map((o, k) => { const j = sOn.indexOf(o); return j >= 0 && (ronly || Note.sameMidi(ub.notes[k], sb.notes[j])); });
      sOn.forEach((o, j) => { pTot++; const k = uOn.indexOf(o); if (k >= 0 && (ronly || Note.sameMidi(ub.notes[k], sb.notes[j]))) pOk++; });
      return { rhythm, notes };
    });
    const nb = beats.length;
    const pct = ronly ? Math.round(100 * rOk / nb) : Math.round(50 * rOk / nb + 50 * pOk / pTot);
    this.res = { beats };
    this.checked = true;
    statAdd('mel', pct);
    const kind = pct === 100 ? 'ok' : pct >= 60 ? 'info' : 'bad';
    const line = ronly ? t('melResR', { r: rOk, nb }) : t('melRes', { r: rOk, nb, p: pOk, pt: pTot });
    setFeedback(this.P.feedback, kind, fbIcon(kind) + `<span><b>${pct} %</b> · ${esc(line)}</span>`, this.yoursBtn);
    this.P.solWrap.hidden = false;
    this.render(); this.renderSolution();
  },
  reveal() {
    if (this.checked) return;
    this.checked = true;
    setFeedback(this.P.feedback, 'info', fbIcon('info') + `<span>${esc(t('solShown'))}</span>`, this.hasInput() ? this.yoursBtn : null);
    this.P.solWrap.hidden = false;
    this.render(); this.renderSolution();
  },

  measuresFor(beatsArr, colorFn, withSlots) {
    const out = [];
    for (let bar = 0; bar < this.S.bars; bar++) {
      const events = [], groups = [];
      for (let bb = 0; bb < 2; bb++) {
        const b = bar * 2 + bb, bt = beatsArr[b];
        if (!bt.pat) { events.push({ dur: 'qd', note: null, slot: withSlots ? 'b' + b : null, ph: withSlots ? 'beat' : null, tint: colorFn(b, -1) === 'bad' ? 'bad' : null }); continue; }
        const g = [];
        bt.pat.split('-').map(Number).forEach((u, k) => {
          g.push(events.length);
          const c = colorFn(b, k);
          events.push({ dur: DUR_VF[u], note: bt.notes[k], slot: withSlots ? 'b' + b + 'n' + k : null, color: c.color, tint: c.tint });
        });
        groups.push(g);
      }
      out.push({ events, groups });
    }
    return out;
  },
  render() {
    if (!this.P || !this.task) return;
    const P = this.P, C = notaColors(), S = this.S, task = this.task;
    if (!S.rhythmOnly) P.info.replaceChildren(
      soundChip(keyName(task.key), () => cadenceEvents(task.key)),
      soundChip(t('startChip', { n: noteName(task.start) }), () => [{ t: 0, midi: Note.midi(task.start), dur: 1.6 }]));
    else P.info.replaceChildren(chip(t('rhythmOnly'), 'chip-strong'));
    const res = this.res;
    const measures = this.measuresFor(this.ans, (b, k) => {
      if (!res) return k < 0 ? null : { color: C.user };
      const r = res.beats[b];
      if (k < 0) return 'bad';
      return { color: r.notes[k] ? C.ok : C.bad, tint: r.rhythm ? null : 'bad' };
    }, true);
    const sel = this.checked ? null : (this.cur.k < 0 ? 'b' + this.cur.b : 'b' + this.cur.b + 'n' + this.cur.k);
    this.hit = renderLines(P.score, {
      clef: 'treble', key: S.rhythmOnly ? null : task.key, time: '6/8', beats: 6, beatValue: 8,
      measures, minMW: 150, maxMPL: 4, sel, range: this.diaRange()
    });
    const where = t('dockBeat', { bar: Math.floor(this.cur.b / 2) + 1, beat: this.cur.b % 2 + 1 });
    if (this.checked) dockHide(P);
    else if (this.cur.k < 0 || S.rhythmOnly) {
      dockHint(P, where, t(this.ans[this.cur.b].pat ? 'dockRhythmChange' : 'dockRhythm'));
      P.dock.append(this.palette);
    } else dockNote(P, this, where + ' · ' + (this.cur.k + 1) + '.', this.ans[this.cur.b].notes[this.cur.k], { clearKey: 'tbClearGroup' });
    syncControls(this);
  },
  renderSolution() {
    if (!this.P || !this.checked || this.P.solWrap.hidden) return;
    renderLines(this.P.solHost, {
      clef: 'treble', key: this.S.rhythmOnly ? null : this.task.key, time: '6/8', beats: 6, beatValue: 8,
      measures: this.measuresFor(this.task.beats, () => ({ color: 'currentColor' }), false), minMW: 150, maxMPL: 4
    });
  },
  onKey(e) {
    if (e.key === ' ') { this.playBtn.trigger(); return true; }
    if (e.key === 'Enter') { if (this.checked) this.newTask(); else this.check(); return true; }
    if (/^[1-9]$/.test(e.key) && !this.checked) {
      const ids = this.S.allPats ? RHY.list.map(p => p.id) : ExLex.selected();
      const list = RHY.list.filter(p => ids.includes(p.id));
      const p = list[+e.key - 1];
      if (p) { this.applyPattern(p.id); return true; }
    }
    return pitchKey(e, this);
  }
};

function genRhythm(nb, enabled, bars) {
  const pats = RHY.list.filter(p => enabled.includes(p.id));
  const out = [];
  for (let b = 0; b < nb; b++) {
    if (b === nb - 1) { out.push('6'); continue; }
    if (bars >= 8 && (b + 1) % 8 === 0) { out.push(chance(0.7) || !enabled.includes('4-2') ? '6' : '4-2'); continue; }
    let cand = pats.map(p => [p.id, p.id === '6' ? 0.6 : [3, 2, 1.3][p.tier]]);
    if (out.length >= 2 && out[out.length - 1] === out[out.length - 2]) cand = cand.filter(c => c[0] !== out[out.length - 1]);
    if (!cand.length) cand = pats.map(p => [p.id, 1]);
    out.push(wpick(cand));
  }
  return out;
}

/* tonal melody: mostly steps, leaps recovered, chord tones on strong beats, ends 2-1 or 7-1 */
function genMelodyPitches(key, meta) {
  const T = key.step <= 4 ? 28 + key.step : 21 + key.step;
  const lo = Math.max(26, T - 5) - T, hi = Math.min(40, T + 10) - T;
  const N = meta.length;
  const triad = r => [0, 2, 4].includes(mod(r, 7));
  const phraseEnd = new Set();
  meta.forEach((m, i) => {
    const lastOfBeat = i === N - 1 || meta[i + 1].b !== m.b;
    if (lastOfBeat && (m.b + 1) % 8 === 0 && i !== N - 1) phraseEnd.add(i);
  });
  const tonics = [0, 7].filter(r => r >= lo && r <= hi);
  let last = null;
  for (let attempt = 0; attempt < 600; attempt++) {
    const rel = [wpick([[0, 3], [4, 2], [2, 1.5], [7, 1], [-3, 1]].filter(([r]) => r >= lo && r <= hi))];
    let ok = true;
    for (let i = 1; i < N && ok; i++) {
      const prev = rel[i - 1], pm = i > 1 ? rel[i - 1] - rel[i - 2] : 0, m = meta[i];
      const cands = [];
      if (i === N - 1) {
        tonics.forEach(r => { if (Math.abs(r - prev) === 1) cands.push([r, 1]); });
      } else {
        for (let r = Math.max(lo, prev - 7); r <= Math.min(hi, prev + 7); r++) {
          const iv = Math.abs(r - prev), dir = Math.sign(r - prev);
          let w = [0.3, 7, 2.4, 0.8, 0.6, 0.15, 0.02, 0.12][iv];
          if (Math.abs(pm) >= 3) w *= (dir === -Math.sign(pm) && iv <= 2) ? 3 : dir === Math.sign(pm) ? 0.15 : 1;
          if (i >= 2 && r === rel[i - 2]) w *= (i >= 3 && prev === rel[i - 3]) ? 0.05 : 0.4;
          if (m.beatStart && triad(r)) w *= 1.7;
          if (m.down && triad(r)) w *= 1.4;
          if (mod(prev, 7) === 6) w *= r === prev + 1 ? 4 : r === prev - 1 ? 0.6 : 0.08;
          if (iv >= 3 && mod(r, 7) === 6) w *= 0.25;
          if (phraseEnd.has(i)) w *= (mod(r, 7) === 4 || mod(r, 7) === 1) ? 6 : 0.3;
          if (i === N - 2) w *= tonics.some(x => Math.abs(x - r) === 1) && (mod(r, 7) === 1 || mod(r, 7) === 6) ? 1 : 0;
          else if (i >= N - 7) { const dist = Math.min(...tonics.flatMap(x => [Math.abs(r - x - 1), Math.abs(r - x + 1)])); w *= 1 / (1 + 1.2 * dist); }
          if (w > 0) cands.push([r, w]);
        }
      }
      if (!cands.length) { ok = false; break; }
      rel.push(wpick(cands));
    }
    if (!ok) continue;
    const notes = rel.map(r => degNote(key, T, r));
    if (key.minor) {
      const raised = rel.map(() => false);
      for (let i = 0; i < N - 1; i++) if (mod(rel[i], 7) === 6 && rel[i + 1] === rel[i] + 1) { notes[i].a += 1; raised[i] = true; }
      for (let i = 0; i < N - 1; i++) if (mod(rel[i], 7) === 5 && rel[i + 1] === rel[i] + 1 && raised[i + 1]) notes[i].a += 1;
    }
    last = notes;
    let bad = false, repeats = 0;
    for (let i = 1; i < N; i++) {
      const iv = intervalInfo(notes[i - 1], notes[i]);
      if (!['P', 'M', 'm'].includes(iv.q)) { bad = true; break; }
      if (iv.num === 1) repeats++;
    }
    if (bad || repeats > N / 5) continue;
    return notes;
  }
  return last;
}

/* I – IV – V7 – I (or minor) as orientation */
function cadenceEvents(key) {
  const v = Harmony.voiceChords(key, ['I', 'IV', 'V7', 'I']);
  const ev = [];
  if (!v) return ev;
  v.forEach((ch, i) => ch.forEach(m => ev.push({ t: i * 0.95, midi: m, dur: i === 3 ? 1.8 : 0.92, vel: 0.62 })));
  return ev;
}
