'use strict';
/* ============================================================
   Einheit 2 — singing with a check
     Modi singen: four notes of a mode in ever new orderings, one 4/4 bar each
     Blattsingen: whole and half steps within a fifth
   The first note sounds, one bar is counted in, then you sing every quarter on its beat to a
   soft metronome. Each note is marked as soon as its beat is over; afterwards the whole take is
   lined up again and judged note by note (wrong note · out of tune · not heard).
   ============================================================ */
const RANGE_IDS = ['q4', 'q5', 'q6', 'q8', 'plag'];
const range = (a, b) => { const r = []; for (let x = a; x <= b; x++) r.push(x); return r; };

/* settings shared by the mode exercises: mode, position (white keys / transposed), range, motif */
function modeFields(ex, withRange) {
  const S = ex.S, id = ex.id, re = () => { ex.save(); ex.buildSettings(); ex.newTask(); };
  const names = LANG === 'de' ? MODE_DE : MODE_EN;
  const out = [
    segControl(id + '-mode', 'modeLbl2', names.map((n, i) => [i, n]).concat([[-1, t('modeAny')]]), S.mode, v => { S.mode = v; re(); }),
    segControl(id + '-pos', 'modePos', [[false, t('modeWhite')], [true, t('modeTransp')]], S.transp, v => { S.transp = v; re(); })];
  if (withRange) out.push(
    segControl(id + '-rng', 'rangeLbl', RANGE_IDS.map(r => [r, t('rg_' + r)]), S.range, v => {
      S.range = v;
      const [lo, hi] = MODE_RANGES[v];
      if (S.motif !== 'all' && S.motif.split(',').map(Number).some(o => o < lo || o > hi)) S.motif = 'all';
      ex.msel = null; re();
    }),
    motifPicker(ex));
  return out;
}
// the motif: "all combinations" or exactly four notes of the range, tapped one by one
function motifPicker(ex) {
  const S = ex.S, [lo, hi] = MODE_RANGES[S.range];
  if (!ex.msel) ex.msel = S.motif === 'all' ? [] : S.motif.split(',').map(Number);
  const sel = ex.msel;
  const named = S.mode >= 0 && !S.transp;
  const k = named ? makeMode(S.mode, 0) : null, f = named ? placeFinal(k, lo, hi, S.clef) : 0;
  const lab = o => named ? noteName(modeNote(k, f, o)) : o >= 0 ? String(o + 1) : (o + 8) + '↓';
  const hint = el('p', { class: 'hint motif-hint' });
  const field = el('div', { class: 'field motif-field' });
  const draw = () => {
    const all = S.motif === 'all' && !sel.length;
    const allB = el('button', { type: 'button', class: 'seg-b', 'aria-pressed': String(all), onclick: () => {
      sel.length = 0; S.motif = 'all'; ex.save(); draw(); ex.newTask();
    } }, t('motifAll'));
    const notes = range(lo, hi).map(o => el('button', { type: 'button', class: 'seg-b', 'aria-pressed': String(sel.includes(o)), onclick: () => {
      const i = sel.indexOf(o);
      if (i >= 0) sel.splice(i, 1);
      else if (sel.length < 4) sel.push(o);
      else { hint.textContent = t('motifMax'); return; }
      if (sel.length === 4) { S.motif = sel.slice().sort((x, y) => x - y).join(','); ex.save(); ex.newTask(); }
      draw();
    } }, lab(o)));
    hint.textContent = sel.length && sel.length < 4 ? t('motifMore', { n: 4 - sel.length }) : t(S.motif === 'all' ? 'motifAllInfo' : 'motifFixedInfo');
    field.replaceChildren(el('span', { class: 'field-lbl' }, t('motifLbl')), el('div', { class: 'seg seg-multi' }, allB, ...notes), hint);
  };
  draw();
  return field;
}
// a task for the motif exercises: mode, final, range and the bars
function motifTask(ex) {
  const S = ex.S;
  const k = randomMode(S.mode, S.transp ? 3 : 0, ex.id);
  const [lo, hi] = MODE_RANGES[S.range];
  const f = placeFinal(k, lo, hi, S.clef);
  let pool = S.motif === 'all' ? range(lo, hi) : S.motif.split(',').map(Number).filter(o => o >= lo && o <= hi);
  if (pool.length < 4) pool = range(lo, hi);
  const bars = motifBars(pool, S.bars);
  return { key: k, f, lo, hi, pool, fixed: S.motif !== 'all', notes: bars.flat().map(o => modeNote(k, f, o)) };
}
function motifChips(task, first) {
  const chips = [soundChip(modeName(task.key), () => modeScaleEvents(task.key, task.f))];
  const c = soundChip(t('startChip', { n: noteName(first) }), () => [{ t: 0, midi: Note.midi(first), dur: 1.8 }]);
  c.classList.add('chip-first');
  chips.push(c);
  const span = noteName(modeNote(task.key, task.f, task.lo)) + '–' + noteName(modeNote(task.key, task.f, task.hi));
  chips.push(settingsChip(task.fixed ? t('motifChip', { m: task.pool.map(o => noteName(modeNote(task.key, task.f, o))).join(' ') }) : t('rangeChip', { r: span })));
  return chips;
}

function makeSing(kind) {
  const isMode = kind === 'mode', id = isMode ? 'msing' : 'blatt';
  const defaults = isMode
    ? { mode: 1, transp: false, range: 'q5', motif: 'all', bars: 8, tempo: 60, clef: 'treble', metro: true }
    : { pool: 'free', span: 7, chroma: false, bars: 4, tempo: 60, clef: 'treble', metro: true };
  return {
    id, kind, titleKey: isMode ? 'msTitle' : 'blTitle', descKey: isMode ? 'msDesc' : 'blDesc',
    how: [isMode ? 'msHow1' : 'blHow1', 'singHow2', 'singHow3', 'singHow4'], howTitle: isMode ? 'msHowTitle' : 'blHowTitle', howNote: 'singPrivacy',
    S: Object.assign({}, defaults, store.get(id + '.s', {})),
    task: null, phase: 'ready', marks: null, res: null, cur: -99, ctl: null, url: null, msel: null, abort: false,
    get checked() { return this.phase === 'done'; },
    save() { store.set(this.id + '.s', this.S); },

    build() {
      const P = this.P = panelShell(this);
      this.buildSettings();
      this.startBtn = playButton('playStart', () => this.task ? [{ t: 0, midi: Note.midi(this.task.notes[0]), dur: 2 }] : null);
      this.startBtn.classList.add('btn-big');
      this.againBtn = btn('singAgain', ICON.mic, () => this.startTake(), 'btn-sec btn-big');
      this.singBtn = el('button', { type: 'button', class: 'btn btn-big btn-play btn-action' }, el('span', { class: 'ico' }), el('span', { class: 'lbl' }));
      this.singBtn.addEventListener('click', () => this.mainAction());
      P.controls.append(this.startBtn, this.againBtn, this.singBtn);
      this.melBtn = playButton('playMelody', () => this.melodyEvents());
      this.takeBtn = btn('playTake', ICON.play, () => this.playTake(), 'btn-sec btn-sm');
      const tu = this.tu = { lbl: el('span', { class: 'tu-lbl' }), tgt: el('span', { class: 'tu-tgt' }), dot: el('span', { class: 'tu-dot', hidden: true }), val: el('span', { class: 'tu-val' }) };
      tu.box = el('div', { class: 'tuner' }, tu.lbl, tu.tgt, el('span', { class: 'tu-track' }, el('span', { class: 'tu-mid' }), tu.dot), tu.val);
      watchWidth(P.score, () => this.render());
      if (!this.task) this.newTask(); else this.render();
    },

    /* ---------- settings (⚙) ---------- */
    buildSettings() {
      const S = this.S, B = this.P.settingsBody, re = () => { this.save(); this.buildSettings(); this.newTask(); };
      B.replaceChildren(howField(this));
      if (isMode) B.append(...modeFields(this, true));
      else {
        B.append(
          segControl(id + '-pool', 'flMode', [['free', t('flFree')], ['key', t('flKey')]], S.pool, v => { S.pool = v; re(); }),
          segControl(id + '-span', 'rangeLbl', [[5, t('rg_q4')], [7, t('rg_q5')], [9, t('rg_q6')]], S.span, v => { S.span = v; re(); }),
          toggleGroup('options', toggleControl(id + '-chr', 'blChroma', S.chroma, v => { S.chroma = v; this.save(); this.newTask(); })));
      }
      B.append(
        segControl(id + '-clef', 'clefLbl', [['treble', t('clefTreble')], ['bass', t('clefBass')]], S.clef, v => { S.clef = v; re(); }),
        toggleGroup('sound', toggleControl(id + '-metro', 'singMetro', S.metro, v => { S.metro = v; this.save(); })));
    },
    /* ---------- a new task ---------- */
    newTask() {
      this.stopTake(true);
      const S = this.S;
      if (isMode) this.task = motifTask(this);
      else {
        const key = S.pool === 'key' ? randomKey(4, 'both', this.id) : null;
        const [L, H] = S.clef === 'bass' ? [41, 64] : [57, 79];
        let start;
        if (key) start = degNote(key, (S.clef === 'bass' ? 21 : 28) + key.step, 0);
        else {
          do {
            start = { d: (S.clef === 'bass' ? 21 : 30) + rnd(4), a: wpick([[0, 6], [1, 1.5], [-1, 1.5]]) };
          } while (!plainSpelling(start));
        }
        const notes = stepMelody({ n: S.bars * 4, size: 2, lo: L, hi: H, key, start, ambitus: S.span, chroma: !key && S.chroma, endTonic: !!key });
        this.task = { key, notes };
      }
      this.phase = 'ready'; this.marks = null; this.res = null; this.cur = -99;
      if (this.url) { URL.revokeObjectURL(this.url); this.url = null; }
      if (this.P) { setFeedback(this.P.feedback, '', ''); this.render(); }
    },

    melodyEvents() {
      const q = 60 / this.S.tempo;
      return this.task.notes.map((n, i) => ({ t: i * q, midi: Note.midi(n), dur: q * 1.02, vel: i % 4 === 0 ? 0.72 : 0.62 }));
    },
    playTake() {
      if (!this.url) return;
      Sound.stop();
      try { const a = new Audio(this.url); const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* not supported */ }
    },

    /* ---------- singing ---------- */
    mainAction() {
      if (this.phase === 'count' || this.phase === 'sing') { if (this.ctl) this.ctl.stop(); return; }
      if (this.phase === 'done') { this.newTask(); return; }
      this.startTake();
    },
    async startTake() {
      if (this.ctl) return;
      if (!Mic.supported()) { this.micFail('micNo'); return; }
      try { await Mic.open(); }
      catch (e) { this.micFail(e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'micDenied' : 'micNo'); return; }
      if (this.url) { URL.revokeObjectURL(this.url); this.url = null; }
      this.marks = this.task.notes.map(() => null);
      this.res = null; this.cur = -99; this.abort = false;
      this.phase = 'count';
      this.loading = false;
      setFeedback(this.P.feedback, '', '');
      this.render();
      this.ctl = singTake({
        targets: this.task.notes.map(Note.midi), ref: Note.midi(this.task.notes[0]), tempo: this.S.tempo, metro: this.S.metro, beats: 4,
        onLoading: () => { this.loading = true; this.drawTuner({ k: -9 }); },
        onStart: () => { this.loading = false; },
        onLive: s => this.onLive(s),
        onBeat: (k, n) => { if (this.marks) this.marks[k] = n; },
        onEnd: (r, url) => this.endTake(r, url)
      });
    },
    stopTake(silent) {
      if (!this.ctl) return;
      this.abort = !!silent;
      this.ctl.stop();
    },
    micFail(key) {
      this.phase = 'ready';
      setFeedback(this.P.feedback, 'bad', fbIcon('bad') + `<span>${esc(t(key))}</span>`);
      this.render();
    },
    onLive(s) {
      if (s.k !== this.cur) {
        this.cur = s.k;
        this.phase = s.k < 0 ? 'count' : 'sing';
        this.render();
      }
      this.drawTuner(s);
    },
    drawTuner(s) {
      const tu = this.tu;
      tu.dot.hidden = true; tu.val.textContent = ''; tu.box.classList.remove('tu-ok', 'tu-warn', 'tu-bad');
      if (this.loading || s.k < -4) { tu.lbl.textContent = t('loadingPiano'); tu.tgt.textContent = ''; return; }
      if (s.k < 0) { tu.lbl.textContent = t('countInLbl'); tu.tgt.textContent = String(5 + s.k); return; }
      const k = Math.min(s.k, this.task.notes.length - 1);
      tu.lbl.textContent = t('barBeat', { bar: Math.floor(k / 4) + 1, beat: k % 4 + 1 });
      tu.tgt.textContent = noteName(this.task.notes[k]);
      if (s.midi == null || s.target == null) { tu.val.textContent = '–'; return; }
      const c = Math.round(foldOct(s.midi - s.target) * 100);
      const cl = clamp(c, -100, 100);
      tu.dot.hidden = false;
      tu.dot.style.left = (50 + cl / 2) + '%';
      tu.val.textContent = (c > 0 ? '+' : c < 0 ? '−' : '±') + Math.abs(c);
      tu.box.classList.add(Math.abs(c) <= 40 ? 'tu-ok' : Math.abs(c) <= 70 ? 'tu-warn' : 'tu-bad');
    },
    endTake(r, url) {
      this.ctl = null;
      if (this.abort) { this.abort = false; if (url) URL.revokeObjectURL(url); return; }
      this.url = url;
      if (!r) {
        this.phase = 'ready'; this.marks = null; this.cur = -99;
        setFeedback(this.P.feedback, 'info', fbIcon('info') + `<span>${esc(t('singCancelled'))}</span>`);
        this.render();
        return;
      }
      this.res = r; this.phase = 'done'; this.cur = -99;
      const n = r.notes.length - r.skip, right = r.ok + r.tune;
      const parts = [t('singRes', { r: right, n })];
      if (r.tune) parts.push(t('singResTune', { n: r.tune }));
      if (r.wrong) parts.push(t('singResWrong', { n: r.wrong }));
      if (r.miss) parts.push(t('singResMiss', { n: r.miss }));
      if (r.skip) parts.push(t('singStopped', { b: Math.ceil(n / 4) }));
      let tip = '';
      if (r.miss > n / 2) tip = t('singQuiet');
      else if (r.ok === n && !r.skip) tip = t('singClean');
      else if (Math.abs(r.drift) >= 25) tip = t(r.drift < 0 ? 'singDriftDown' : 'singDriftUp', { c: Math.abs(r.drift) });
      else if (Math.abs(r.mean) >= 15) tip = t(r.mean < 0 ? 'singFlat' : 'singSharp', { c: Math.abs(r.mean) });
      const kind = r.ok === n ? 'ok' : right / Math.max(1, n) >= 0.7 ? 'info' : 'bad';
      setFeedback(this.P.feedback, kind, fbIcon(kind) + `<span>${esc(parts.join(' '))}${tip ? '<br>' + esc(tip) : ''}</span>`, this.melBtn, this.url ? this.takeBtn : null);
      if (right === n && !r.skip) Sound.chime(r.ok === n ? 2 : 1);
      Backend.exerciseDone(this.id);
      this.render();
    },
    onHide() { this.stopTake(true); Mic.close(); },

    /* ---------- drawing ---------- */
    render() {
      if (!this.P || !this.task) return;
      const P = this.P, C = notaColors(), S = this.S, task = this.task, run = this.phase === 'count' || this.phase === 'sing';
      const first = task.notes[0];
      const chips = [];
      if (isMode) chips.push(...motifChips(task, first));
      else {
        chips.push(task.key ? soundChip(keyName(task.key), () => cadenceEvents(task.key)) : chip(t('flFreeChip'), 'chip-strong'));
        const c = soundChip(t('startChip', { n: noteName(first) }), () => [{ t: 0, midi: Note.midi(first), dur: 1.8 }]); c.classList.add('chip-first'); chips.push(c);
        chips.push(settingsChip(t('blSpanChip', { r: t(S.span === 5 ? 'rg_q4' : S.span === 9 ? 'rg_q6' : 'rg_q5') })));
      }
      P.info.replaceChildren(...chips);
      if (run) P.info.querySelectorAll('button').forEach(b => { b.disabled = true; });
      P.opts.replaceChildren(
        lengthControl('lenBars', isMode ? [4, 8, 16, 24] : [2, 4, 8], S.bars, v => { S.bars = v; this.save(); this.newTask(); }),
        tempoControl('tempoLbl', S.tempo, 40, 120, 4, v => '♩ = ' + v, v => { S.tempo = v; this.save(); }));
      if (run) P.opts.querySelectorAll('button').forEach(b => { b.disabled = true; });
      const st = this.res ? this.res.notes : this.marks;
      const color = s => !s ? 'currentColor' : s.status === 'ok' ? C.ok : s.status === 'tune' ? C.warn : s.status === 'wrong' ? C.bad : s.status === 'miss' ? C.muted : 'currentColor';
      const measures = [];
      for (let b = 0; b < task.notes.length / 4; b++) {
        const events = [];
        for (let k = 0; k < 4; k++) {
          const i = b * 4 + k, s = st ? st[i] : null;
          events.push({ dur: 'q', note: task.notes[i], slot: 'n' + i, color: color(s), mark: this.res ? markFor(s) : '', markCls: s ? 'nm-' + s.status : '' });
        }
        measures.push({ events });
      }
      this.hit = renderLines(P.score, {
        clef: S.clef, key: task.key, time: '4/4', beats: 4, beatValue: 4, measures, minMW: 130, maxMPL: 4,
        sel: this.phase === 'sing' && this.cur >= 0 && this.cur < task.notes.length ? 'n' + this.cur : null, rowH: this.res ? 146 : 130
      });
      // dock: what happens now
      P.dock.hidden = false;
      if (run) { P.dock.replaceChildren(this.tu.box); }
      else if (this.phase === 'done') {
        const dot = (cls, key) => el('span', { class: 'lg-i' }, el('span', { class: 'lg-dot ' + cls }), t(key));
        P.dock.replaceChildren(el('div', { class: 'legend' }, dot('lg-ok', 'lgOk'), dot('lg-warn', 'lgTune'), dot('lg-bad', 'lgWrong'), dot('lg-miss', 'lgMiss')),
          el('span', { class: 'dock-hint' }, t('lgMarks')));
      } else dockHint(P, t('singReadyLbl'), t(S.metro ? 'singReady' : 'singReadyNoMetro'));
      // buttons
      this.startBtn.hidden = this.phase === 'done';
      this.againBtn.hidden = this.phase !== 'done';
      this.startBtn.disabled = run;
      const lbl = $('.lbl', this.singBtn), ico = $('.ico', this.singBtn);
      if (run) { lbl.textContent = t('singStop'); ico.innerHTML = ICON.stop; }
      else if (this.phase === 'done') { lbl.textContent = t('nextTask'); ico.innerHTML = ICON.next; }
      else { lbl.textContent = t('singGo'); ico.innerHTML = ICON.mic; }
      this.singBtn.classList.toggle('is-playing', run);
    },
    onKey(e) {
      if (e.key === ' ') { if (this.phase === 'done') this.startTake(); else this.mainAction(); return true; }
      if (e.key === 'Enter') { this.mainAction(); return true; }
      return false;
    }
  };
}
const ExModeSing = makeSing('mode');
const ExBlatt = makeSing('steps');
