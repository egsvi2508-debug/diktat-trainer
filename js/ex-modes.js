'use strict';
/* ============================================================
   Einheit 2 — writing modes down (same format as the singing: 4/4, quarter notes, one figure per bar)
     Modi-Diktat: orderings of four notes of a mode – you write what you hear
     Modale Muster: a four-note figure sequenced through a mode – you write it
   Only the first note is given. The notes of the range sit as buttons in the dock: tap = write.
   ============================================================ */
function makeModeDict(kind) {
  const isMotif = kind === 'motif', id = isMotif ? 'mdict' : 'mpat';
  const defaults = isMotif
    ? { mode: 1, transp: false, range: 'q5', bars: 8, tempo: 60, clef: 'treble', limit: false, countIn: true, help: false }
    : { mode: 1, transp: false, mixed: false, bars: 8, tempo: 66, clef: 'treble', limit: false, countIn: true, help: false };
  return {
    id, kind, titleKey: isMotif ? 'mdTitle' : 'mpTitle', descKey: isMotif ? 'mdDesc' : 'mpDesc',
    how: isMotif ? ['mdHow1', 'dictHow2', 'dictHow3', 'dictHow4'] : ['mpHow1', 'dictHow2', 'dictHow3', 'dictHow4'], howTitle: isMotif ? 'mdHowTitle' : 'mpHowTitle',
    S: Object.assign({}, defaults, store.get(id + '.s', {}), { limit: false }),
    task: null, ans: null, cursor: 1, checked: false, res: null, hit: null, playsLeft: 3,

    save() { store.set(this.id + '.s', this.S); },
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
      bindStaffInput(P.score, this);
      watchWidth(P.score, () => this.render());
      watchWidth(P.solHost, () => this.renderSolution());
      if (!this.task) this.newTask(); else this.render();
    },
    buildSettings() {
      const S = this.S, B = this.P.settingsBody, re = () => { this.save(); this.buildSettings(); this.newTask(); };
      B.replaceChildren(howField(this), ...modeFields(this, isMotif));
      if (!isMotif) B.append(segControl(id + '-mix', 'mpKind', [[false, t('mpOne')], [true, t('mpMixed')]], S.mixed, v => { S.mixed = v; re(); }));
      B.append(
        segControl(id + '-clef', 'clefLbl', [['treble', t('clefTreble')], ['bass', t('clefBass')]], S.clef, v => { S.clef = v; re(); }),
        toggleGroup('options',
          toggleControl(id + '-help', 'dictHelp', S.help, v => { S.help = v; this.save(); this.newTask(); }),
          toggleControl(id + '-count', 'countIn', S.countIn, v => { S.countIn = v; this.save(); })));
    },

    newTask() {
      const S = this.S;
      if (isMotif) this.task = motifTask(this);
      else {
        const k = randomMode(S.mode, S.transp ? 3 : 0, this.id), lo = -3, hi = 8;
        const f = placeFinal(k, lo, hi, S.clef);
        const bars = patternBars(S.bars, lo, hi, S.mixed);
        this.task = { key: k, f, lo, hi, bars, notes: bars.flatMap(b => b.pat.map(x => modeNote(k, f, b.start + x))) };
      }
      const t0 = this.task;
      this.pad = range(t0.lo, t0.hi).map(o => modeNote(t0.key, t0.f, o));
      this.ans = t0.notes.map((n, i) => this.isGiven(i) ? { ...n } : null);
      this.cursor = 1;
      this.checked = false; this.res = null; this.playsLeft = 3;
      if (this.P) { setFeedback(this.P.feedback, '', ''); this.P.solWrap.hidden = true; this.render(); }
    },
    events(countIn) {
      const S = this.S, q = 60 / S.tempo, ev = [], N = this.task.notes.length;
      let t0 = 0;
      if (countIn && S.countIn) { for (let i = 0; i < 4; i++) ev.push({ t: i * q, click: true, accent: i === 0 }); t0 = 4 * q; }
      this.task.notes.forEach((n, i) => {
        const fromEnd = N - 1 - i, ioi = q * (fromEnd < 3 ? 1 + 0.05 * (3 - fromEnd) : 1);
        const vel = i === N - 1 ? 0.6 : i % 4 === 0 ? 0.74 : i % 4 === 2 ? 0.66 : 0.6;
        ev.push({ t: t0, midi: Note.midi(n), dur: i === N - 1 ? ioi * 2 : ioi * 1.02, vel });
        t0 += ioi;
      });
      return ev;
    },
    // the first note – with the help switched on also the first note of every second bar
    isGiven(i) { return i === 0 || (this.S.help && i % 8 === 0); },
    hasInput() { return this.ans.some((n, i) => n && !this.isGiven(i)); },

    /* sequence-editor interface (as in Diktat im Flug) */
    isLocked() { return this.checked; },
    moveCursor(d) {
      let i = this.cursor + d;
      while (i > 0 && i < this.ans.length - 1 && this.isGiven(i)) i += Math.sign(d);
      this.cursor = clamp(i, 1, this.ans.length - 1);
      if (this.isGiven(this.cursor)) this.cursor = clamp(this.cursor - Math.sign(d), 1, this.ans.length - 1);
      this.render();
    },
    getNote(i) { return this.ans[i]; },
    editable(i) { return !this.isGiven(i) && !this.checked; },
    refNote(i) { for (let j = i - 1; j >= 0; j--) if (this.ans[j]) return this.ans[j]; return this.task.notes[0]; },
    defaultAlt(i, d) {
      const bar = Math.floor(i / 4), prev = [];
      for (let j = bar * 4; j < i; j++) prev.push(this.ans[j]);
      return readAlt(prev, d, this.task.key.sig);
    },
    diaRange() { return this.S.clef === 'treble' ? [22, 44] : [8, 32]; },
    setNote(i, n) {
      this.ans[i] = n;
      if (App.hearInput) Sound.note(Note.midi(n));
      this.render();
    },
    clearSlot(i) { if (!this.isGiven(i)) { this.ans[i] = null; this.render(); } },
    // a tap on a note button: write it and go on to the next note
    pickNote(n) {
      if (this.checked || !this.editable(this.cursor)) return;
      this.ans[this.cursor] = { ...n };
      if (App.hearInput) Sound.note(Note.midi(n));
      if (this.cursor < this.ans.length - 1) this.moveCursor(1); else this.render();
    },
    cmd(c, arg) {
      const before = this.cursor;
      SeqEdit.cmd(this, c, arg);
      if (c === 'letter' && this.cursor === before && before < this.ans.length - 1 && !this.checked) this.moveCursor(1);
    },
    staffDown(r) {
      if (this.checked) return;
      const i = +r.slot.id.slice(1);
      if (this.isGiven(i)) return;
      this.cursor = i;
      this.setNote(i, { d: r.dia, a: this.defaultAlt(i, r.dia) });
    },
    staffDrag(id2, r) { this.staffDown(r); },
    canPreview(slot) { return !this.checked && !slot.locked; },

    check() {
      if (this.checked) return;
      if (!this.hasInput()) { this.reveal(); return; }
      let ok = 0, enh = 0, n = 0, bars = 0;
      const marks = this.task.notes.map((sn, i) => {
        if (this.isGiven(i)) return 'given';
        n++;
        const u = this.ans[i];
        if (u && Note.sameMidi(u, sn)) { ok++; if (!Note.eq(u, sn)) enh++; return 'ok'; }
        return 'bad';
      });
      for (let b = 0; b < marks.length / 4; b++) if (marks.slice(b * 4, b * 4 + 4).every(m => m !== 'bad')) bars++;
      const pct = Math.round(100 * ok / n);
      this.res = { marks };
      this.checked = true;
      const kind = pct === 100 ? 'ok' : pct >= 60 ? 'info' : 'bad';
      let msg = t('flRes', { ok, n }) + ' ' + t('mdBars', { b: bars, n: marks.length / 4 });
      if (enh) msg += ' ' + t('flEnh', { n: enh });
      if (!isMotif) msg += ' ' + this.patternInfo();
      setFeedback(this.P.feedback, kind, fbIcon(kind) + `<span>${esc(msg)}</span>`);
      if (pct === 100) Sound.chime(2);
      this.P.solWrap.hidden = false;
      this.render(); this.renderSolution();
    },
    reveal() {
      if (this.checked) return;
      this.checked = true;
      setFeedback(this.P.feedback, 'info', fbIcon('info') + `<span>${esc(t('solShown') + (isMotif ? '' : ' ' + this.patternInfo()))}</span>`);
      this.P.solWrap.hidden = false;
      this.render(); this.renderSolution();
    },
    // e.g. "Muster 1-3-2-4, eine Sekunde weiter je Takt"
    patternInfo() {
      if (this.S.mixed) return t('mpMixedInfo');
      const p = this.task.bars[0].pat.map(x => x >= 0 ? x + 1 : (x + 8) + '↓').join('-');
      return t('mpInfo', { p });
    },

    measures(notes, colorFn, withSlots) {
      const out = [];
      for (let bar = 0; bar < notes.length / 4; bar++) {
        const events = [];
        for (let k = 0; k < 4; k++) {
          const i = bar * 4 + k, n = notes[i];
          events.push({ dur: 'q', note: n, slot: withSlots ? 'n' + i : null, ph: !n && withSlots ? 'note' : null, color: colorFn(i), locked: this.isGiven(i) });
        }
        out.push({ events });
      }
      return out;
    },
    render() {
      if (!this.P || !this.task) return;
      const P = this.P, C = notaColors(), S = this.S, task = this.task;
      const chips = motifChips(task, task.notes[0]);
      if (!isMotif) chips[2] = settingsChip(t('mpKind') + ': ' + t(S.mixed ? 'mpMixed' : 'mpOne'));
      P.info.replaceChildren(...chips);
      P.opts.replaceChildren(lengthControl('lenBars', [4, 8, 16], S.bars, v => { S.bars = v; this.save(); this.newTask(); }),
        tempoControl('tempoLbl', S.tempo, 40, 120, 2, v => '♩ = ' + v, v => { S.tempo = v; this.save(); }));
      const marks = this.res ? this.res.marks : null;
      this.hit = renderLines(P.score, {
        clef: S.clef, key: task.key, time: '4/4', beats: 4, beatValue: 4,
        measures: this.measures(this.ans, i => this.isGiven(i) ? 'currentColor' : marks ? (marks[i] === 'ok' ? C.ok : C.bad) : C.user, true),
        minMW: 130, maxMPL: 4, sel: this.checked ? null : 'n' + this.cursor, range: this.diaRange()
      });
      this.playBtn.disabled = !this.checked && S.limit && this.playsLeft <= 0;
      if (this.checked) dockHide(P);
      else dockScale(P, this, t('dockNoteN', { i: this.cursor + 1, n: this.ans.length }), this.ans[this.cursor], this.pad);
      this.playBtn.refresh();
      syncControls(this);
    },
    renderSolution() {
      if (!this.P || !this.checked || this.P.solWrap.hidden) return;
      renderLines(this.P.solHost, {
        clef: this.S.clef, key: this.task.key, time: '4/4', beats: 4, beatValue: 4,
        measures: this.measures(this.task.notes, () => 'currentColor', false), minMW: 130, maxMPL: 4
      });
    },
    onKey(e) {
      if (e.key === ' ') { this.playBtn.trigger(); return true; }
      if (e.key === 'Enter') { if (this.checked) this.newTask(); else this.check(); return true; }
      return pitchKey(e, this);
    }
  };
}
/* dock with the notes of the range as buttons (plus ← → and delete) */
function dockScale(P, ex, label, note, notes) {
  P.dock.hidden = false;
  const b = (html, key, fn, cls = '') => el('button', { type: 'button', class: 'icon-btn ' + cls, title: t(key), 'aria-label': t(key), html, onclick: fn });
  P.dock.replaceChildren(
    el('span', { class: 'dock-lbl' }, label),
    el('span', { class: 'dock-name' }, note ? noteName(note) : '–'),
    el('div', { class: 'entry' }, scalePad(notes, n => ex.pickNote(n)),
      el('div', { class: 'tools tools-3' }, b(ICON.left, 'tbPrev', () => ex.cmd('left')), b(ICON.right, 'tbNext', () => ex.cmd('right')),
        b(ICON.del, 'tbClear', () => ex.cmd('clear'), 'icon-del'))));
}
const ExModeDict = makeModeDict('motif');
