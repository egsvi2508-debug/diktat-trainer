'use strict';
/* ============================================================
   Einheit 3 — Audiation
   The first note sounds. Then one note at a time appears on the staff, without sound:
   imagine it. The last one is sung and checked with the microphone (any octave).
   Folge: a set number of notes, then sing the last one.
   Frei: it never stops – every few notes one comes up to be sung, then it goes on.
   Steps: Sekunden · Terzen (with seconds) · Quarten und Quinten (with both) · Alle Intervalle.
   ============================================================ */
// [semitones, interval number] per step set; each set also uses the ones before it
const AUD_SETS = [
  ['sek', 'audSek', [[1, 2], [2, 2]]],
  ['ter', 'audTer', [[3, 3], [4, 3]]],
  ['qq', 'audQQ', [[5, 4], [7, 5]]],
  ['all', 'audAll', [[6, 4], [6, 5], [8, 6], [9, 6], [10, 7], [11, 7], [12, 8]]]
];
const AUD_EVERY = { few: [5, 9], mid: [3, 6], many: [2, 4] };   // free mode: notes between two sung ones
const AUD_LO = 57, AUD_HI = 79;   // a – g²
const AUD_STEADY = 8, AUD_SPREAD = 0.35, AUD_OK = 0.5;

function audPool(set) {
  const top = AUD_SETS.findIndex(s => s[0] === set), pool = [];
  AUD_SETS.slice(0, top + 1).forEach((s, i) => s[2].forEach(iv => pool.push({ iv, w: i === top ? 2 : 1 })));   // the newest steps come up more
  return pool;
}
// the next note: an interval up or down from prev, spelled as that interval (C → kleine Sekunde abwärts → H)
function audStep(prev, pool, lastIv) {
  const pm = Note.midi(prev);
  for (let g = 0; g < 80; g++) {
    const [st, num] = wpickBy(pool, o => o.w).iv, dir = chance(0.5) ? 1 : -1;
    const m = pm + dir * st;
    if (m < AUD_LO || m > AUD_HI) continue;
    const d = prev.d + dir * (num - 1), a = m - Note.natMidi(d), s = mod(d, 7);
    if (Math.abs(a) > 1 || (a === 1 && (s === 2 || s === 6)) || (a === -1 && (s === 0 || s === 3))) continue;   // no E♯ H♯ C♭ F♭
    if (lastIv === dir * st && chance(0.7)) continue;
    return { d, a, iv: dir * st };
  }
  const m = pm + (pm > 68 ? -2 : 2), sp = spellInKey(NO_KEY, mod(m, 12));
  return { ...noteAt(m, sp.step, sp.a), iv: m - pm };
}
function audStart() {
  const m = 62 + rnd(11), sp = spellInKey(NO_KEY, mod(m, 12));
  return noteAt(m, sp.step, sp.a);
}

/* one note on a treble staff, large */
function renderSoloNote(host, note, color) {
  const scale = autoScale(host.clientWidth) * 1.3;
  const { ctx, W } = vfSurface(host, 132, scale);
  const w = Math.min(W - 16, 190), x = (W - w) / 2;
  const st = new VF.Stave(x, 4, w).addClef('treble');
  st.setEndBarType(VF.BarlineType.NONE);
  st.setContext(ctx).draw();
  if (!note) return;
  const sn = new VF.StaveNote({ keys: [Note.vfKey(note)], duration: 'w', clef: 'treble' });
  if (note.a) sn.addModifier(new VF.Accidental(ACC_VF[note.a]), 0);
  if (color && color !== 'currentColor') styleNote(sn, color);
  const v = new VF.Voice({ num_beats: 4, beat_value: 4 }).setMode(VF.Voice.Mode.SOFT).addTickables([sn]);
  new VF.Formatter().joinVoices([v]).format([v], Math.max(20, st.getNoteEndX() - st.getNoteStartX() - 10));
  v.draw(ctx, st);
}
/* a row of labelled choices on the exercise screen */
function choiceControl(labelKey, pairs, value, onChange) {
  const seg = el('div', { class: 'seg seg-sm', role: 'radiogroup', 'aria-label': t(labelKey) },
    pairs.map(([v, txt]) => el('button', { type: 'button', class: 'seg-b', role: 'radio', 'aria-checked': String(v === value), onclick: () => { if (v !== value) onChange(v); } }, txt)));
  return el('div', { class: 'len' }, el('span', { class: 'len-lbl' }, t(labelKey)), seg);
}

const ExAud = {
  id: 'aud', titleKey: 'audTitle', descKey: 'audDesc',
  S: Object.assign({ set: 'sek', free: false, n: 8, gap: 4, every: 'mid' }, store.get('aud.s', {})),
  phase: 'idle',        // idle · run (imagine) · sing · done (Folge) – the free mode goes run → sing → run …
  cur: null, count: 0, total: 0, toSing: 0, lastIv: null, res: null, prompt: 'audReady',
  wait: null, poll: null, mute: 0, recent: [], heard: false, answered: 0,
  get checked() { return this.phase === 'done'; },
  save() { store.set('aud.s', this.S); },

  build() {
    const P = this.P = panelShell(this), S = this.S;
    P.settingsBody.append(
      sliderControl('aud-n', 'audOwnN', 2, 30, 1, S.n, v => String(v), v => { S.n = v; this.save(); this.reset(); }),
      segControl('aud-every', 'audEvery', [['few', '5–9'], ['mid', '3–6'], ['many', '2–4']], S.every, v => { S.every = v; this.save(); }));
    this.goBtn = el('button', { type: 'button', class: 'btn btn-big btn-play btn-action btn-wide' }, el('span', { class: 'ico' }), el('span', { class: 'lbl' }));
    this.goBtn.addEventListener('click', () => this.mainAction());
    P.controls.append(this.goBtn);
    watchWidth(P.score, () => this.render());
    this.reset();
  },
  reset() {
    this.stopAll();
    this.phase = 'idle'; this.cur = null; this.res = null; this.prompt = 'audReady';
    if (this.P) { setFeedback(this.P.feedback, '', ''); this.render(); }
  },
  stopAll() { clearTimeout(this.wait); this.stopListen(); Sound.stop(); },

  /* ---------- running ---------- */
  async start() {
    if (!Mic.supported()) { this.micFail('micNo'); return; }
    try { await Mic.open(); }
    catch (e) { this.micFail(e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'micDenied' : 'micNo'); return; }
    setFeedback(this.P.feedback, '', '');
    this.pool = audPool(this.S.set);
    this.cur = audStart(); this.lastIv = null; this.res = null;
    this.count = 1; this.total = this.S.free ? 0 : this.S.n;
    this.toSing = this.newGap();
    this.phase = 'run'; this.prompt = 'audListen';
    this.render();
    this.sound(this.cur);
    this.next();
  },
  newGap() { const [a, b] = AUD_EVERY[this.S.every] || AUD_EVERY.mid; return a + rnd(b - a + 1); },
  // a note with sound; the microphone does not listen meanwhile
  sound(n, onEnd) {
    this.mute = Sound.ready().currentTime + 2.2;
    Sound.play([{ t: 0, midi: Note.midi(n), dur: 1.6, vel: 0.72 }], { onStart: t0 => { this.mute = t0 + 1.9; }, onEnd });
  },
  // after the gap (or `ms`): the next note appears
  next(ms = this.S.gap * 1000) {
    clearTimeout(this.wait);
    this.wait = setTimeout(() => this.advance(), ms);
  },
  advance() {
    if (this.phase !== 'run' || App.active !== this) return;
    const st = audStep(this.cur, this.pool, this.lastIv);
    this.lastIv = st.iv;
    this.cur = { d: st.d, a: st.a };
    this.count++;
    this.res = null;
    if (this.S.free) setFeedback(this.P.feedback, '', '');
    const sing = this.S.free ? --this.toSing <= 0 : this.count >= this.total;
    if (sing) {
      this.phase = 'sing'; this.prompt = 'audSing';
      this.render();
      this.listen();
    } else {
      this.prompt = 'audImagine';
      this.render();
      this.next();
    }
  },
  listen() {
    this.stopListen();
    this.recent = []; this.heard = false;
    const until = performance.now() + (this.S.free ? (this.S.gap + 5) * 1000 : Infinity);
    this.poll = setInterval(() => {
      if (this.phase !== 'sing' || !Mic.isOpen) return;
      if (performance.now() > until) { this.judge(null); return; }   // free mode: nothing sung in time
      const f = Mic.frame();
      if (Mic.ctx.currentTime < this.mute || f.midi == null) { this.recent = []; this.setHeard(false); return; }
      this.recent.push(f.midi);
      if (this.recent.length > AUD_STEADY) this.recent.shift();
      this.setHeard(true);
      if (this.recent.length < AUD_STEADY) return;
      const s = this.recent.slice().sort((a, b) => a - b), med = s[s.length >> 1];
      if (this.recent.some(m => Math.abs(m - med) > AUD_SPREAD)) return;
      this.judge(med);
    }, 30);
  },
  stopListen() { clearInterval(this.poll); this.poll = null; },
  setHeard(on) { if (on !== this.heard) { this.heard = on; if (this.micDot) this.micDot.classList.toggle('on', on); } },
  micFail(k) {
    this.phase = 'idle';
    setFeedback(this.P.feedback, 'bad', fbIcon('bad') + `<span>${esc(t(k))}</span>`);
    this.render();
  },
  // sung = steady pitch (fractional midi) or null (solution asked for / nothing sung)
  judge(sung) {
    this.stopListen();
    const n = this.cur, right = sung != null && Math.abs(foldOct(sung - Note.midi(n))) <= AUD_OK;
    this.res = { right, sung };
    this.answered++;
    if (this.answered % 10 === 1) Backend.exerciseDone(this.id);
    const what = noteName(n, false), pcName = m => (LANG === 'de' ? PC_DE : PC_EN)[mod(Math.round(m), 12)];
    const kind = right ? 'ok' : sung == null ? 'info' : 'bad';
    const msg = right ? t('cxRight', { x: what }) : sung == null ? t('cxShown', { x: what }) : t('cxSungWrong', { x: what, u: pcName(sung) });
    setFeedback(this.P.feedback, kind, fbIcon(kind) + `<span>${esc(msg)}</span>`);
    if (right) Sound.chime(1);
    if (!this.S.free) {
      this.phase = 'done'; this.prompt = '';
      this.render();
      if (!right) this.wait = setTimeout(() => { if (this.phase === 'done' && App.active === this) this.sound(n); }, 450);
      return;
    }
    // free mode: show the result for a moment (a wrong note sounds, so the ear finds its place again), then the next note
    this.phase = 'run'; this.prompt = right ? 'audGoOn' : 'audHear';
    this.toSing = this.newGap();
    this.render();
    if (right) { this.next(1100); return; }
    clearTimeout(this.wait);
    this.wait = setTimeout(() => {
      if (this.phase !== 'run' || App.active !== this) return;
      this.sound(n);
      this.next(2000);
    }, 500);
  },
  mainAction() {
    if (this.phase === 'idle' || this.phase === 'done') { this.start(); return; }
    if (this.S.free || this.phase === 'run') { this.reset(); return; }   // stop
    this.judge(null);                                                    // Folge, singing: show the note
  },
  onHide() { this.stopAll(); Mic.close(); if (this.phase !== 'done') this.reset(); },

  /* ---------- drawing ---------- */
  render() {
    if (!this.P) return;
    const P = this.P, C = notaColors(), S = this.S, idle = this.phase === 'idle' || this.phase === 'done';
    P.info.replaceChildren();
    P.opts.replaceChildren(
      Object.assign(choiceControl('audSteps', AUD_SETS.map(s => [s[0], t(s[1])]), S.set, v => { S.set = v; this.save(); this.reset(); }), { className: 'len aud-steps' }),
      choiceControl('audMode', [[false, t('audSeq')], [true, t('audFree')]], S.free, v => { S.free = v; this.save(); this.reset(); }),
      S.free ? '' : lengthControl('audN', [4, 8, 12], S.n, v => { S.n = v; this.save(); this.reset(); }),
      tempoControl('audGap', S.gap, 1, 10, 0.5, v => (LANG === 'de' ? String(v).replace('.', ',') : String(v)) + ' s', v => { S.gap = v; this.save(); }));
    // the note: blue while imagined, green / red once sung
    const r = this.res, shown = !!r && this.phase !== 'sing';
    const col = shown && r ? (r.right ? C.ok : r.sung == null ? C.user : C.bad) : this.phase === 'sing' ? C.user : 'currentColor';
    renderSoloNote(P.score, this.cur, col);
    this.micDot = el('span', { class: 'cxs-mic' + (this.heard && this.phase === 'sing' ? ' on' : ''), html: ICON.mic, 'aria-hidden': 'true' });
    const count = !S.free && this.cur ? el('span', { class: 'aud-count' }, `${this.count} / ${this.total}`) : '';
    const name = el('span', { class: 'cxs-name' }, this.cur ? noteName(this.cur, false) : '');
    P.dock.hidden = false;
    P.dock.replaceChildren(el('div', { class: 'cx-dock' },
      el('div', { class: 'aud-prompt' + (this.phase === 'sing' ? ' sing' : '') }, t(this.prompt)),
      el('div', { class: 'cx-top cxs-top' }, count, name, this.micDot)));
    const lbl = $('.lbl', this.goBtn), ico = $('.ico', this.goBtn);
    if (idle) { lbl.textContent = t(this.phase === 'done' ? 'cxNext' : 'cxStart'); ico.innerHTML = this.phase === 'done' ? ICON.next : ICON.mic; }
    else if (S.free || this.phase === 'run') { lbl.textContent = t('audStop'); ico.innerHTML = ICON.stop; }
    else { lbl.textContent = t('showSolution'); ico.innerHTML = ICON.eye; }
    this.goBtn.classList.toggle('btn-sec', !idle);
    this.goBtn.classList.toggle('btn-play', idle);
  },
  onKey(e) {
    if (e.key === ' ' || e.key === 'Enter') { this.mainAction(); return true; }
    return false;
  }
};
