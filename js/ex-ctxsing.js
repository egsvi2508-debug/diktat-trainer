'use strict';
/* ============================================================
   Einheit 2 — Ton singen im Kontext
   The tonic triad of a random key (5/3, 6 or 6/4) sounds, then a note is shown – sing it.
   The stopwatch runs from the moment the note appears. The microphone takes the first steady pitch
   (any octave) and judges it at once: right or wrong. Chord tones come up rarely, as in "Ton im Kontext".
   ============================================================ */
const CXS_STEADY = 8;        // frames (~30 ms each) that must agree before a pitch counts
const CXS_SPREAD = 0.35;     // semitones the steady frames may wander
const CXS_OK = 0.5;          // semitones from the target that still count as right
const ExCtxSing = {
  id: 'csing', titleKey: 'cxSingTitle', descKey: 'cxSingDesc',
  S: Object.assign({ maxAcc: 4, mode: 'both', auto: true }, store.get('csing.s', {})),
  task: null, phase: 'idle', res: null, answered: 0, wait: null, poll: null, mute: 0, recent: [], last: {}, heard: false,
  get checked() { return this.phase === 'done'; },
  save() { store.set('csing.s', this.S); },

  build() {
    const P = this.P = panelShell(this);
    // no instructions for this one
    P.settingsBody.append(
      segControl('csing-mode', 'modeLbl', [['maj', t('major')], ['min', t('minor')], ['both', t('both')]], this.S.mode, v => { this.S.mode = v; this.save(); }),
      segControl('csing-acc', 'maxAcc', [0, 1, 2, 3, 4, 5, 6].map(n => [n, String(n)]), this.S.maxAcc, v => { this.S.maxAcc = v; this.save(); }),
      toggleGroup('options', toggleControl('csing-auto', 'cxAuto', this.S.auto, v => { this.S.auto = v; this.save(); })));
    this.timer = makeTimer();
    this.againBtn = btn('cxAgain', ICON.play, () => this.playChord(), 'btn-sec btn-big');
    this.goBtn = el('button', { type: 'button', class: 'btn btn-big btn-play btn-action' }, el('span', { class: 'ico' }), el('span', { class: 'lbl' }));
    this.goBtn.addEventListener('click', () => this.mainAction());
    P.controls.append(this.againBtn, this.goBtn);
    watchWidth(P.score, () => this.render());
    if (!this.task) this.newTask(false); else this.render();
  },

  /* ---------- tasks ---------- */
  newTask(go) {
    clearTimeout(this.wait);
    this.stopListen();
    const S = this.S;
    let key, inv;
    for (let i = 0; i < 20; i++) {
      key = randomKey(S.maxAcc, S.mode, this.id);
      inv = rnd(3);
      if (key.vf + inv !== this.last.ctx) break;
    }
    this.last.ctx = key.vf + inv;
    const chord = contextChord(key, inv), cPcs = triadPcs(key.pc, key.minor);
    const avoid = this.last.rel != null ? [mod(key.pc + this.last.rel, 12)] : [];
    const pc = pickContextPc(cPcs, avoid);
    this.last.rel = mod(pc - key.pc, 12);
    const sp = spellInKey(key, pc), top = Math.max(...chord.map(Note.midi));
    const target = noteAt(top + 2 + mod(pc - top - 2, 12), sp.step, sp.a);
    this.task = { key, inv, chord, target };
    this.phase = 'idle'; this.res = null;
    this.timer.reset();
    if (this.P) {
      setFeedback(this.P.feedback, '', '');
      this.render();
      if (go) this.start();
    }
  },
  chordEvents() { return this.task.chord.map(n => ({ t: 0, midi: Note.midi(n), dur: 1.3, vel: 0.55 })); },

  /* ---------- running ---------- */
  async start() {
    if (!Mic.supported()) { this.micFail('micNo'); return; }
    try { await Mic.open(); }
    catch (e) { this.micFail(e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'micDenied' : 'micNo'); return; }
    this.phase = 'listen';
    this.render();
    // the chord, then the note appears: stopwatch and microphone start once the chord has died away
    Sound.play(this.chordEvents(), {
      onStart: t0 => {
        const ctx = Sound.ready(), ms = Math.max(0, (t0 + 1.55 - ctx.currentTime) * 1000);
        clearTimeout(this.wait);
        this.wait = setTimeout(() => {
          if (this.phase !== 'listen') return;
          this.phase = 'answer';
          this.timer.start();
          this.listen();
          this.render();
        }, ms);
      }
    });
  },
  // hear the chord again while answering (the microphone ignores it)
  playChord() {
    if (this.phase === 'idle') return;
    Sound.play(this.chordEvents(), { onStart: t0 => { this.mute = t0 + 1.7; this.recent = []; } });
    this.mute = Sound.ready().currentTime + 2;
  },
  listen() {
    this.stopListen();
    this.recent = []; this.heard = false;
    this.poll = setInterval(() => {
      if (this.phase !== 'answer' || !Mic.isOpen) return;
      const f = Mic.frame(), ctx = Mic.ctx;
      if (ctx.currentTime < this.mute || f.midi == null) { this.recent = []; this.setHeard(false); return; }
      this.recent.push(f.midi);
      if (this.recent.length > CXS_STEADY) this.recent.shift();
      this.setHeard(true);
      if (this.recent.length < CXS_STEADY) return;
      const s = this.recent.slice().sort((a, b) => a - b), med = s[s.length >> 1];
      if (this.recent.some(m => Math.abs(m - med) > CXS_SPREAD)) return;
      this.finish(med);
    }, 30);
  },
  stopListen() { clearInterval(this.poll); this.poll = null; },
  setHeard(on) { if (on !== this.heard) { this.heard = on; if (this.micDot) this.micDot.classList.toggle('on', on); } },
  micFail(k) {
    this.phase = 'idle';
    setFeedback(this.P.feedback, 'bad', fbIcon('bad') + `<span>${esc(t(k))}</span>`);
    this.render();
  },
  mainAction() {
    if (this.phase === 'idle') { this.start(); return; }
    if (this.phase === 'done') { this.newTask(true); return; }
    this.finish(null);
  },
  // sung = the steady pitch (fractional midi) or null when the solution was asked for
  finish(sung) {
    clearTimeout(this.wait);
    this.stopListen();
    const want = Note.midi(this.task.target);
    const right = sung != null && Math.abs(foldOct(sung - want)) <= CXS_OK;
    if (!this.timer.running) this.timer.start();
    const tm = this.timer.stop(right) || { s: 0, quicker: false };
    this.phase = 'done';
    this.res = { right, sung };
    Sound.stop();
    if (right) Sound.chime(tm.quicker ? 2 : tm.s < 3 ? 1 : 0);
    this.answered++;
    if (this.answered % 10 === 1) Backend.exerciseDone(this.id);
    const n = this.task.target, what = noteName(n, false);
    const pcName = m => (LANG === 'de' ? PC_DE : PC_EN)[mod(Math.round(m), 12)];
    const kind = right ? 'ok' : sung == null ? 'info' : 'bad';
    const msg = right ? t('cxRight', { x: what }) : sung == null ? t('cxShown', { x: what }) : t('cxSungWrong', { x: what, u: pcName(sung) });
    setFeedback(this.P.feedback, kind, fbIcon(kind) + `<span>${esc(msg)}</span>`);
    this.render();
    if (right && this.S.auto) this.wait = setTimeout(() => { if (this.phase === 'done' && App.active === this) this.newTask(true); }, tm.quicker ? 950 : 1250);
    // otherwise: let the right note sound against the chord
    else if (!right) this.wait = setTimeout(() => {
      if (this.phase !== 'done' || App.active !== this) return;
      Sound.play(this.chordEvents().concat([{ t: 1.2, midi: Note.midi(n), dur: 1.6, vel: 0.72 }]));
    }, 450);
  },
  onHide() {
    clearTimeout(this.wait); this.stopListen(); Mic.close();
    if (this.phase === 'listen' || this.phase === 'answer') { this.phase = 'idle'; this.timer.reset(); }
  },

  /* ---------- drawing ---------- */
  render() {
    if (!this.P || !this.task) return;
    const P = this.P, C = notaColors(), task = this.task, key = task.key, done = this.phase === 'done';
    const invTxt = t(INV_KEYS[task.inv]), fn = ['I', 'I⁶', 'I⁶₄'][task.inv];
    P.info.replaceChildren(
      soundChip(keyName(key), () => cadenceEvents(key)),
      soundChip(t('cxChord', { f: fn, i: invTxt }), () => this.chordEvents()));
    if (this.phase === 'listen' || this.phase === 'answer') P.info.querySelectorAll('button').forEach(b => { b.disabled = true; });
    // the note to sing appears with the stopwatch; after the answer it turns green or red
    const show = this.phase === 'answer' || done;
    const col = done ? (this.res.right ? C.ok : this.res.sung == null ? C.user : C.bad) : C.user;
    renderChordCols(P.score, [{ notes: task.chord, label: fn }, show ? { notes: [task.target], color: col } : { notes: [], label: '?' }], key);
    // dock: stopwatch, the note's name, a dot that lights up while the microphone hears you
    this.micDot = el('span', { class: 'cxs-mic' + (this.heard && this.phase === 'answer' ? ' on' : ''), html: ICON.mic, 'aria-hidden': 'true' });
    const name = el('span', { class: 'cxs-name' + (done ? (this.res.right ? ' ok' : ' bad') : '') }, show ? noteName(task.target, false) : '?');
    P.dock.hidden = false;
    P.dock.replaceChildren(el('div', { class: 'cx-dock' }, el('div', { class: 'cx-top cxs-top' }, this.timer.el, name, this.micDot)));
    // buttons
    this.againBtn.disabled = this.phase === 'idle';
    const lbl = $('.lbl', this.goBtn), ico = $('.ico', this.goBtn);
    if (this.phase === 'idle') { lbl.textContent = t('cxStart'); ico.innerHTML = ICON.mic; }
    else if (done) { lbl.textContent = t('cxNext'); ico.innerHTML = ICON.next; }
    else { lbl.textContent = t('showSolution'); ico.innerHTML = ICON.eye; }
    this.goBtn.classList.toggle('btn-sec', !done && this.phase !== 'idle');
    this.goBtn.classList.toggle('btn-play', done || this.phase === 'idle');
  },
  onKey(e) {
    if (e.key === ' ') { if (this.phase === 'idle') this.mainAction(); else this.playChord(); return true; }
    if (e.key === 'Enter') { this.mainAction(); return true; }
    return false;
  }
};
