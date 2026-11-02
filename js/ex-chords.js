'use strict';
/* ============================================================
   Einheit 3 — four-part chords
     Lagen: the tonic triad of the shown key (c-Moll → c es g), in close or open position – write all four voices.
            Nothing is given and nothing sounds while writing.
     Basston (Dreiklänge / Septakkorde): one chord – which chord tone is in the bass?
   ============================================================ */

/* a chord: root {d, a} and its tones as [steps, semitones] above the root */
const CHORD_TYPES = {
  M: [[0, 0], [2, 4], [4, 7]], m: [[0, 0], [2, 3], [4, 7]], o: [[0, 0], [2, 3], [4, 6]], A: [[0, 0], [2, 4], [4, 8]],
  D7: [[0, 0], [2, 4], [4, 7], [6, 10]], m7: [[0, 0], [2, 3], [4, 7], [6, 10]], M7: [[0, 0], [2, 4], [4, 7], [6, 11]],
  h7: [[0, 0], [2, 3], [4, 6], [6, 10]], o7: [[0, 0], [2, 3], [4, 6], [6, 9]]
};
// the chord tone `iv` written at diatonic index d (d carries that tone's letter)
function chordTone(root, iv, d) { return { d, a: mod(Note.midi(root) + iv[1] - Note.natMidi(d) + 6, 12) - 6 }; }
const V4_RANGE = { B: [40, 55], T: [48, 67], A: [55, 74], S: [60, 79] };   // midi
const without = (arr, x) => { const i = arr.indexOf(x), c = arr.slice(); if (i >= 0) c.splice(i, 1); return c; };

/* four voices [B, T, A, S] with chord tone `inv` in the bass.
   lage: 'close' (soprano to tenor within an octave), 'open' (wider, neighbours a third to an octave apart),
   'any' (one of the two). Triads double the root (5/3, mostly 6) or the
   fifth (6/4); seventh chords are complete. Returns { notes, lage } or null. */
function fourPart(root, ivs, inv, lage) {
  const upper = ivs.length === 4 ? [0, 1, 2, 3].filter(k => k !== inv)
    : inv === 1 ? [0, 2, chance(0.7) ? 0 : 2] : [0, 1, 2];
  const toneAt = d => ivs.findIndex(iv => iv[0] === mod(d - root.d, 7));
  const inR = (n, v) => { const m = Note.midi(n); return m >= V4_RANGE[v][0] && m <= V4_RANGE[v][1]; };
  const basses = [];
  for (let d = 10; d <= 34; d++) if (toneAt(d) === inv) { const n = chordTone(root, ivs[inv], d); if (inR(n, 'B')) basses.push(n); }
  if (!basses.length) return null;
  const B = pick(basses);
  const out = [];
  for (let sd = 30; sd <= 44; sd++) {
    const sk = toneAt(sd);
    if (sk < 0 || !upper.includes(sk)) continue;
    const S = chordTone(root, ivs[sk], sd);
    if (!inR(S, 'S')) continue;
    const r1 = without(upper, sk);
    for (let ad = sd - 1; ad >= sd - 8; ad--) {
      const ak = toneAt(ad);
      if (ak < 0 || !r1.includes(ak)) continue;
      const A = chordTone(root, ivs[ak], ad);
      if (!inR(A, 'A')) continue;
      const tk = without(r1, ak)[0];
      for (let td = ad - 1; td >= ad - 8 && td > B.d; td--) {
        if (toneAt(td) !== tk) continue;
        const T = chordTone(root, ivs[tk], td);
        if (!inR(T, 'T') || Note.midi(T) - Note.midi(B) > 24) continue;
        // eng: soprano to tenor within an octave; weit: wider, every two neighbours a third to an octave apart
        const sm = Note.midi(S), am = Note.midi(A), tm = Note.midi(T);
        const kind = sm - tm <= 12 ? 'close'
          : sm - am >= 3 && sm - am <= 12 && am - tm >= 3 && am - tm <= 12 ? 'open' : null;
        if (!kind || (lage !== 'any' && kind !== lage)) continue;
        out.push({ notes: [B, T, A, S], lage: kind });
      }
    }
  }
  return out.length ? pick(out) : null;
}

/* ================= Lagen ================= */
const LAGE_KEYS = { close: 'lgClose', open: 'lgOpen' };
const LG_VOICES = { 3: 'voiceS', 2: 'voiceA', 1: 'voiceT', 0: 'voiceB' };
const LG_RANGE = { 3: VOICE_RANGE[3], 2: VOICE_RANGE[2], 1: VOICE_RANGE[1], 0: [12, 28] };   // diatonic limits
const ExLagen = {
  id: 'lagen', titleKey: 'lgTitle', descKey: 'lgDesc',
  S: Object.assign({ mode: 'both', maxAcc: 3, inv: false, arp: false, dur: 2.4 }, store.get('lagen.s2', {})),
  task: null, up: null, vcur: { i: 0, v: 3 }, done: false, res: null, hit: null, last: null,
  save() { store.set('lagen.s2', this.S); },
  get checked() { return this.done; },

  build() {
    const P = this.P = panelShell(this), S = this.S;
    P.settingsBody.append(
      segControl('lg-mode', 'modeLbl', [['maj', t('major')], ['min', t('minor')], ['both', t('both')]], S.mode, v => { S.mode = v; this.save(); }),
      segControl('lg-acc', 'maxAcc', [0, 1, 2, 3, 4].map(n => [n, String(n)]), S.maxAcc, v => { S.maxAcc = v; this.save(); }),
      segControl('lg-arp', 'lgPlay', [[false, t('lgBlock')], [true, t('lgArp')]], S.arp, v => { S.arp = v; this.save(); }),
      toggleGroup('options', toggleControl('lg-inv', 'harInv', S.inv, v => { S.inv = v; this.save(); })));
    this.playBtn = playButton('listen', () => this.events(), { primary: true });
    mainControls(this, P, this.playBtn);
    bindStaffInput(P.score, this);
    watchWidth(P.score, () => this.render());
    watchWidth(P.solHost, () => this.renderSolution());
    if (!this.task) this.newTask(); else this.render();
  },

  newTask() {
    // always the tonic triad of the key; only its layout changes (not the same as last time)
    const S = this.S, key = randomKey(S.maxAcc, S.mode, this.id), chords = [];
    const c = { root: { d: 21 + key.step, a: key.alt }, ivs: CHORD_TYPES[key.minor ? 'm' : 'M'], ty: key.minor ? 'm' : 'M', deg: 0 };
    for (let g = 0; g < 300 && !chords.length; g++) {
      const inv = S.inv ? wpick([[0, 2], [1, 1], [2, 1]]) : 0;
      const v = fourPart(c.root, c.ivs, inv, chance(0.5) ? 'close' : 'open');
      if (!v) continue;
      const sig = v.notes.map(Note.midi).join();
      if (sig === this.last && g < 290) continue;
      this.last = sig;
      chords.push({ ...c, inv, notes: v.notes, lage: v.lage });
    }
    this.task = { key, chords, notes: chords.map(c => c.notes) };
    this.up = chords.map(() => [null, null, null, null]);
    this.vcur = { i: 0, v: 3 }; this.done = false; this.res = null;
    if (this.P) {
      setFeedback(this.P.feedback, '', '');
      this.P.solWrap.hidden = true;
      this.render();
    }
  },
  // block chords, or each chord broken from the bass up and then held
  events() {
    const d = this.S.dur, ev = [], arp = this.S.arp ? 0.42 : 0;
    let t0 = 0;
    this.task.notes.forEach(ch => {
      const end = t0 + 3 * arp + d;
      ch.forEach((n, k) => ev.push({ t: t0 + k * arp, midi: Note.midi(n), dur: end - t0 - k * arp, vel: 0.6 }));
      t0 = end + 0.25;
    });
    return ev;
  },

  /* ---------- sequence-editor interface: all four voices ---------- */
  positions() { const P = []; this.up.forEach((_, i) => [3, 2, 1, 0].forEach(v => P.push({ i, v }))); return P; },
  get cursor() { return this.positions().findIndex(p => p.i === this.vcur.i && p.v === this.vcur.v); },
  set cursor(x) { this.vcur = this.positions()[x]; },
  hasInput() { return this.up.some(ch => ch.some(Boolean)); },
  isLocked() { return this.done; },
  moveCursor(d) { this.cursor = clamp(this.cursor + d, 0, this.positions().length - 1); this.render(); },
  getNote(i) { const p = this.positions()[i]; return p ? this.up[p.i][p.v] : null; },
  editable() { return !this.done; },
  refNote(i) {
    const p = this.positions()[i];
    for (let j = p.i - 1; j >= 0; j--) if (this.up[j][p.v]) return this.up[j][p.v];
    const d = { 3: 33, 2: 30, 1: 26, 0: 21 }[p.v];
    return { d, a: this.task.key.sig[mod(d, 7)] };
  },
  defaultAlt(i, d) {
    const p = this.positions()[i], prev = [];
    for (let j = Math.floor(p.i / 2) * 2; j < p.i; j++) prev.push(this.up[j][p.v]);
    return readAlt(prev, d, this.task.key.sig);
  },
  diaRange() { return LG_RANGE[this.vcur.v]; },
  // no sound while writing – the chord is found by ear alone
  setNote(i, n) {
    const p = this.positions()[i];
    this.up[p.i][p.v] = n;
    this.render();
  },
  clearSlot(i) { const p = this.positions()[i]; this.up[p.i][p.v] = null; this.render(); },
  cmd(c, arg) {
    const before = this.cursor;
    SeqEdit.cmd(this, c, arg);
    if (c === 'letter' && this.cursor === before && before < this.positions().length - 1 && !this.done) { this.cursor = before + 1; this.render(); }
  },
  // a tap chooses the voice by where it lands: treble staff → soprano or alto, bass staff → tenor or bass
  pickVoice(i, row, dia) {
    if (row.clef === 'bass') {
      const T = this.up[i][1], B = this.up[i][0];
      if (T && dia === T.d) return 1;
      if (B && dia === B.d) return 0;
      if (T && B) return Math.abs(dia - T.d) <= Math.abs(dia - B.d) ? 1 : 0;
      if (T) return dia > T.d ? 1 : 0;
      if (B) return dia < B.d ? 0 : 1;
      return dia >= 23 ? 1 : 0;
    }
    const S = this.up[i][3], A = this.up[i][2];
    if (S && dia === S.d) return 3;
    if (A && dia === A.d) return 2;
    if (S && A) return Math.abs(dia - S.d) <= Math.abs(dia - A.d) ? 3 : 2;
    if (S) return dia > S.d ? 3 : 2;
    if (A) return dia < A.d ? 2 : 3;
    return dia >= 33 ? 3 : 2;
  },
  staffDown(r) {
    if (this.done) return;
    const i = +r.slot.id.slice(1), v = this.pickVoice(i, r.row, r.dia);
    this.vcur = { i, v };
    const [lo, hi] = LG_RANGE[v], d = clamp(r.dia, lo, hi);
    this.setNote(this.cursor, { d, a: this.defaultAlt(this.cursor, d) });
  },
  staffDrag(id, r) {
    if (this.done) return;
    const [lo, hi] = LG_RANGE[this.vcur.v], d = clamp(r.dia, lo, hi);
    this.setNote(this.cursor, { d, a: this.defaultAlt(this.cursor, d) });
  },
  canPreview() { return !this.done; },

  /* ---------- checking ---------- */
  check() {
    if (this.done) return;
    if (!this.hasInput()) { this.reveal(); return; }
    let ok = 0, n = 0;
    const marks = this.up.map((ch, i) => ch.map((u, v) => {
      n++;
      if (u && Note.sameMidi(u, this.task.notes[i][v])) { ok++; return 'ok'; }
      return 'bad';
    }));
    this.res = { marks };
    this.done = true;
    const kind = ok === n ? 'ok' : ok >= 0.6 * n ? 'info' : 'bad';
    const msg = t('lgRes', { ok, n });
    setFeedback(this.P.feedback, kind, fbIcon(kind) + `<span>${esc(msg)}</span>`);
    this.P.solWrap.hidden = false;
    this.render(); this.renderSolution();
  },
  reveal() {
    if (this.done) return;
    this.done = true;
    setFeedback(this.P.feedback, 'info', fbIcon('info') + `<span>${esc(t('solShown'))}</span>`);
    this.P.solWrap.hidden = false;
    this.render(); this.renderSolution();
  },

  /* ---------- drawing ---------- */
  render() {
    if (!this.P || !this.task) return;
    const P = this.P, C = notaColors(), task = this.task, S = this.S, res = this.res;
    // the key, large: the chord belongs to it (tap to hear the cadence)
    const kc = soundChip(t('keyChip', { k: keyName(task.key) }), () => cadenceEvents(task.key));
    kc.classList.add('chip-key');
    P.info.replaceChildren(kc);
    P.opts.replaceChildren(tempoControl('perChord', S.dur, 1, 4, 0.2, v => v.toFixed(1) + ' s', v => { S.dur = v; this.save(); }));
    this.hit = renderChorale(P.score, task, {}, {
      notes: this.up, lockFirst: false,
      sel: this.done ? null : this.vcur.i,
      color: (i, v) => res ? (res.marks[i][v] === 'ok' ? C.ok : C.bad) : C.user
    });
    if (this.done) { dockHide(P); syncControls(this); return; }
    const { i, v } = this.vcur, n = this.up[i][v];
    const voiceSeg = el('div', { class: 'seg seg-sm', role: 'radiogroup', 'aria-label': t('voiceLbl') },
      [3, 2, 1, 0].map(vv => el('button', { type: 'button', class: 'seg-b', role: 'radio', 'aria-checked': String(vv === v),
        onclick: () => { this.vcur = { i, v: vv }; this.render(); } }, t(LG_VOICES[vv]))));
    P.dock.hidden = false;
    P.dock.replaceChildren(
      voiceSeg,
      el('span', { class: 'dock-name' }, n ? noteName(n) : '–'),
      noteTools(this));
    syncControls(this);
  },
  renderSolution() {
    if (!this.P || !this.done || this.P.solWrap.hidden) return;
    renderChorale(this.P.solHost, this.task, {}, { lockFirst: false, labels: this.task.chords.map(c => ({ text: t(LAGE_KEYS[c.lage]) })) });
  },
  onKey(e) {
    if (e.key === ' ') { this.playBtn.trigger(); return true; }
    if (e.key === 'Enter') { if (this.done) this.newTask(); else this.check(); return true; }
    return pitchKey(e, this);
  }
};

/* ================= Basston: which chord tone is in the bass? ================= */
const BASS_TONES = ['bsRoot', 'bsThird', 'bsFifth', 'bsSeventh'];
const BASS_FIGS = { 3: [['5', '3'], ['6', ''], ['6', '4']], 4: [['7', ''], ['6', '5'], ['4', '3'], ['2', '']] };   // figured-bass numbers, top and bottom
const figText = f => f[0] + (f[1] ? '/' + f[1] : '');
// roots: C D♭ D E♭ E F F♯ G A♭ A B♭ H as [step, alteration]
const BASS_ROOTS = [[0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0], [3, 1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0]];
const NO_KEY = makeKey(0, false);
function chordName(ty, root) {
  const r = noteName(root, false);
  return t('cn' + ty, { r, rl: LANG === 'de' ? r.toLowerCase() : r });
}

function makeBass(kind) {
  const sev = kind === 'sev', id = sev ? 'bsev' : 'btri', nTones = sev ? 4 : 3;
  const TYPES = sev ? ['D7', 'm7', 'M7', 'h7', 'o7'] : ['M', 'm', 'o', 'A'];
  return {
    id, titleKey: sev ? 'bsSevTitle' : 'bsTriTitle', descKey: 'bsDesc',
    S: Object.assign({ types: sev ? ['D7', 'm7', 'M7', 'h7'] : ['M', 'm', 'o'], lage: 'any', auto: true }, store.get(id + '.s', {})),
    task: null, phase: 'idle', picked: null, res: null, answered: 0, wait: null, last: null,
    get checked() { return this.phase === 'done'; },
    save() { store.set(this.id + '.s', this.S); },

    build() {
      const P = this.P = panelShell(this), S = this.S;
      P.settingsBody.append(
        toggleGroup('bsTypes', ...TYPES.map(ty => toggleControl(id + '-t-' + ty, 'ct' + ty, S.types.includes(ty), (on, inp) => {
          const nt = on ? S.types.concat(ty) : S.types.filter(x => x !== ty);
          if (!nt.length) { inp.checked = true; return; }   // at least one kind of chord
          S.types = TYPES.filter(x => nt.includes(x)); this.save();
        }))),
        segControl(id + '-lage', 'lgLage', [['close', t('lgClose')], ['open', t('lgOpen')], ['any', t('both')]], S.lage, v => { S.lage = v; this.save(); }),
        toggleGroup('options', toggleControl(id + '-auto', 'cxAuto', S.auto, v => { S.auto = v; this.save(); })));
      this.timer = makeTimer();
      this.choices = el('div', { class: 'bs-choices bs-' + nTones, role: 'group', 'aria-label': t('bsAsk') },
        Array.from({ length: nTones }, (_, k) => el('button', { type: 'button', class: 'bs-b', 'data-k': k, onclick: () => this.answer(k) },
          el('span', { class: 'bs-n' }, t(BASS_TONES[k])), el('span', { class: 'bs-f' }, el('span', {}, BASS_FIGS[nTones][k][0]), el('span', {}, BASS_FIGS[nTones][k][1] || '\u00a0')))));
      this.againBtn = btn('cxAgain', ICON.play, () => this.play(false), 'btn-sec btn-big');
      this.goBtn = el('button', { type: 'button', class: 'btn btn-big btn-play btn-action' }, el('span', { class: 'ico' }), el('span', { class: 'lbl' }));
      this.goBtn.addEventListener('click', () => this.mainAction());
      P.controls.append(this.againBtn, this.goBtn);
      watchWidth(P.score, () => this.render());
      if (!this.task) this.newTask(false); else this.render();
    },

    newTask(go) {
      clearTimeout(this.wait);
      const S = this.S;
      let task = null;
      for (let g = 0; g < 200 && !task; g++) {
        const ty = pick(S.types), ivs = CHORD_TYPES[ty], r = pick(BASS_ROOTS), root = { d: 21 + r[0], a: r[1] };
        if (ivs.some(iv => Math.abs(chordTone(root, iv, root.d + iv[0]).a) > 1)) continue;   // no double sharps or flats
        const inv = rnd(ivs.length);
        if (this.last && this.last.inv === inv && chance(0.6)) continue;
        const v = fourPart(root, ivs, inv, S.lage);
        if (v) task = { ty, root, inv, notes: v.notes };
      }
      this.last = task;
      this.task = task;
      this.phase = 'idle'; this.picked = null; this.res = null;
      this.timer.reset();
      if (this.P) {
        setFeedback(this.P.feedback, '', '');
        this.render();
        if (go) this.play(true);
      }
    },
    events() { return this.task.notes.map(n => ({ t: 0, midi: Note.midi(n), dur: 2.2, vel: 0.6 })); },
    play(first) {
      if (first) this.phase = 'listen';
      this.render();
      Sound.play(this.events(), {
        onStart: () => {
          if (!first || this.phase !== 'listen') return;
          this.phase = 'answer';
          this.timer.start();
          this.render();
        }
      });
    },
    mainAction() {
      if (this.phase === 'idle') { this.play(true); return; }
      if (this.phase === 'done') { this.newTask(true); return; }
      this.finish(true);
    },
    answer(k) {
      if (this.phase !== 'answer' && this.phase !== 'listen') return;
      this.picked = k;
      this.finish(false);
    },
    finish(gaveUp) {
      clearTimeout(this.wait);
      const task = this.task, right = !gaveUp && this.picked === task.inv;
      if (!this.timer.running) this.timer.start();
      const tm = this.timer.stop(right) || { s: 0, quicker: false };
      this.phase = 'done';
      this.res = { right, gaveUp };
      Sound.stop();
      if (right) Sound.chime(tm.quicker ? 2 : tm.s < 3 ? 1 : 0);
      this.answered++;
      if (this.answered % 10 === 1) Backend.exerciseDone(this.id);
      const x = t('bsWhat', { b: t(BASS_TONES[task.inv]), c: chordName(task.ty, task.root), f: figText(BASS_FIGS[nTones][task.inv]) });
      const kind = right ? 'ok' : gaveUp ? 'info' : 'bad';
      const msg = right ? t('cxRight', { x }) : gaveUp ? t('cxShown', { x }) : t('bsWrong', { x, u: t(BASS_TONES[this.picked]) });
      setFeedback(this.P.feedback, kind, fbIcon(kind) + `<span>${esc(msg)}</span>`);
      this.render();
      if (right && this.S.auto) this.wait = setTimeout(() => { if (this.phase === 'done' && App.active === this) this.newTask(true); }, tm.quicker ? 950 : 1250);
      // otherwise: the bass alone, then the chord again
      else if (!right) this.wait = setTimeout(() => {
        if (this.phase !== 'done' || App.active !== this) return;
        Sound.play([{ t: 0, midi: Note.midi(task.notes[0]), dur: 1.2, vel: 0.7 }].concat(this.events().map(e => ({ ...e, t: 1.3 }))));
      }, 450);
    },
    onHide() { clearTimeout(this.wait); if (this.phase === 'listen' || this.phase === 'answer') { this.phase = 'idle'; this.timer.reset(); } },

    render() {
      if (!this.P || !this.task) return;
      const P = this.P, C = notaColors(), task = this.task, done = this.phase === 'done';
      P.info.replaceChildren();
      if (done) {
        const col = this.res.right ? C.ok : this.res.gaveUp ? C.user : C.bad;
        renderChordCols(P.score, [{ notes: task.notes, colors: [col, 'currentColor', 'currentColor', 'currentColor'], label: t(BASS_TONES[task.inv]) + ' (' + figText(BASS_FIGS[nTones][task.inv]) + ')' }], NO_KEY);
      } else renderChordCols(P.score, [{ notes: [], on: this.phase === 'answer', label: '?' }], NO_KEY);
      $$('.bs-b', this.choices).forEach(b => {
        const k = +b.dataset.k;
        b.disabled = this.phase !== 'answer' && this.phase !== 'listen';
        b.classList.toggle('q-ok', done && k === task.inv);
        b.classList.toggle('q-bad', done && k === this.picked && k !== task.inv);
      });
      P.dock.hidden = false;
      P.dock.replaceChildren(el('div', { class: 'cx-dock' }, el('div', { class: 'cx-top' }, this.timer.el), this.choices));
      this.againBtn.disabled = this.phase === 'idle';
      const lbl = $('.lbl', this.goBtn), ico = $('.ico', this.goBtn);
      if (this.phase === 'idle') { lbl.textContent = t('cxStart'); ico.innerHTML = ICON.play; }
      else if (done) { lbl.textContent = t('cxNext'); ico.innerHTML = ICON.next; }
      else { lbl.textContent = t('showSolution'); ico.innerHTML = ICON.eye; }
      this.goBtn.classList.toggle('btn-sec', !done && this.phase !== 'idle');
      this.goBtn.classList.toggle('btn-play', done || this.phase === 'idle');
    },
    onKey(e) {
      if (e.key === ' ') { if (this.phase === 'idle') this.mainAction(); else this.play(false); return true; }
      if (e.key === 'Enter') { this.mainAction(); return true; }
      const k = +e.key;
      if (k >= 1 && k <= nTones) { this.answer(k - 1); return true; }
      return false;
    }
  };
}
const ExBassTri = makeBass('tri');
const ExBassSev = makeBass('sev');
