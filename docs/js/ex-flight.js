'use strict';
/* ============================================================
   Exercises 3 & 4 — Diktat im Flug (only seconds / only thirds)
   ============================================================ */
function makeFlight(kind) {
  const id = kind === 2 ? 'sec' : 'ter';
  return {
    id, kind, no: kind === 2 ? '3' : '4',
    titleKey: kind === 2 ? 'secTitle' : 'terTitle', descKey: kind === 2 ? 'secDesc' : 'terDesc',
    S: Object.assign({ bars: 4, mode: 'free', clef: 'treble', tempo: 40, limit: true, countIn: true }, store.get(id + '.s3', {})),
    task: null, ans: null, cursor: 1, checked: false, res: null, hit: null, playsLeft: 3,

    save() { store.set(this.id + '.s3', this.S); },

    build() {
      const P = this.P = panelShell(this);
      const S = this.S;
      P.settingsBody.append(
        segControl(id + '-mode', 'flMode', [['free', t('flFree')], ['key', t('flKey')]], S.mode, v => { S.mode = v; this.save(); this.newTask(); }),
        segControl(id + '-clef', 'clefLbl', [['treble', t('clefTreble')], ['bass', t('clefBass')]], S.clef, v => { S.clef = v; this.save(); this.newTask(); }),
        toggleGroup('options',
          toggleControl(id + '-limit', 'flLimit', S.limit, v => { S.limit = v; this.save(); this.render(); }),
          toggleControl(id + '-count', 'countIn', S.countIn, v => { S.countIn = v; this.save(); }))
      );
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

    newTask() {
      const S = this.S, L = S.bars * 4, step = this.kind - 1;
      const [lo, hi] = this.kind === 2 ? (S.clef === 'treble' ? [60, 81] : [40, 62]) : (S.clef === 'treble' ? [57, 84] : [36, 64]);
      const key = S.mode === 'key' ? randomKey(4, chance(0.7) ? 'maj' : 'min', this.id) : null;
      let first;
      if (key) {
        const T0 = (S.clef === 'treble' ? 28 : 14) + key.step;
        const opts = [0, 2, 4, 7].map(k => degNote(key, T0, k)).filter(n => Note.midi(n) >= lo && Note.midi(n) <= hi);
        first = pick(opts.length ? opts : [degNote(key, T0, 0)]);
      } else {
        const d = (S.clef === 'treble' ? 33 : 22) - 2 + rnd(5), st = mod(d, 7);
        let a = wpick([[0, 5], [1, 1], [-1, 1]]);
        if ((a === 1 && (st === 2 || st === 6)) || (a === -1 && (st === 0 || st === 3))) a = 0;
        first = { d, a };
      }
      const notes = [first];
      let dir = chance(0.5) ? 1 : -1;
      for (let i = 1; i < L; i++) {
        const prev = notes[i - 1], pm = Note.midi(prev);
        const zig = i >= 2 && Math.sign(notes[i - 1].d - notes[i - 2].d) === dir && i >= 3 && Math.sign(notes[i - 2].d - notes[i - 3].d) === -dir;
        if (chance(zig ? 0.15 : this.kind === 2 ? 0.35 : 0.33)) dir = -dir;
        const reach = this.kind === 2 ? 2 : 4;
        if (pm + reach > hi) dir = -1;
        if (pm - reach < lo) dir = 1;
        const d = prev.d + dir * step;
        let n;
        if (key) n = { d, a: key.sig[mod(d, 7)] };
        else {
          const semis = this.kind === 2 ? [1, 2] : [3, 4];
          const cands = semis.map(s => Note.spell(pm + dir * s, d)).filter(x => Math.abs(x.a) <= 1);
          n = pick(cands);
        }
        notes.push(n);
      }
      this.task = { notes, key };
      this.ans = notes.map((n, i) => i === 0 ? { ...n } : null);
      this.cursor = 1;
      this.checked = false; this.res = null; this.playsLeft = 3;
      if (this.P) {
        setFeedback(this.P.feedback, '', '');
        this.P.solWrap.hidden = true;
        this.render();
      }
    },

    /* slow, legato, with a light accent on each downbeat and a little ritardando at the very end */
    events(countIn) {
      const S = this.S, q = 60 / S.tempo, ev = [], N = this.task.notes.length;
      let t0 = 0;
      if (countIn && S.countIn) { for (let i = 0; i < 4; i++) ev.push({ t: i * q, click: true, accent: i === 0 }); t0 = 4 * q; }
      this.task.notes.forEach((n, i) => {
        const fromEnd = N - 1 - i, ioi = q * (fromEnd < 3 ? 1 + 0.06 * (3 - fromEnd) : 1);
        const vel = i === N - 1 ? 0.6 : i % 4 === 0 ? 0.74 : i % 4 === 2 ? 0.66 : 0.6;
        ev.push({ t: t0, midi: Note.midi(n), dur: i === N - 1 ? ioi * 2 : ioi * 1.03, vel });
        t0 += ioi;
      });
      return ev;
    },

    hasInput() { return this.ans.slice(1).some(Boolean); },

    /* sequence-editor interface */
    isLocked() { return this.checked; },
    moveCursor(d) { this.cursor = clamp(this.cursor + d, 1, this.ans.length - 1); this.render(); },
    getNote(i) { return this.ans[i]; },
    editable(i) { return i > 0 && !this.checked; },
    refNote(i) { for (let j = i - 1; j >= 0; j--) if (this.ans[j]) return this.ans[j]; return this.task.notes[0]; },
    defaultAlt(i, d) {
      const bar = Math.floor(i / 4), prev = [];
      for (let j = bar * 4; j < i; j++) prev.push(this.ans[j]);
      return readAlt(prev, d, this.task.key ? this.task.key.sig : NO_SIG);
    },
    diaRange() { return this.S.clef === 'treble' ? [24, 44] : [10, 32]; },
    setNote(i, n) {
      this.ans[i] = n;
      if (App.hearInput) Sound.note(Note.midi(n));
      this.render();
    },
    clearSlot(i) { if (i > 0) { this.ans[i] = null; this.render(); } },
    cmd(c, arg) {
      const before = this.cursor;
      SeqEdit.cmd(this, c, arg);
      // after entering a pitch by letter name, move on to the next note
      if (c === 'letter' && this.cursor === before && before < this.ans.length - 1 && !this.checked) { this.cursor++; this.render(); }
    },
    staffDown(r) {
      if (this.checked) return;
      const i = +r.slot.id.slice(1);
      if (i === 0) return;
      this.cursor = i;
      this.setNote(i, { d: r.dia, a: this.defaultAlt(i, r.dia) });
    },
    staffDrag(id, r) { this.staffDown(r); },
    canPreview(slot) { return !this.checked && slot.id !== 'n0'; },

    check() {
      if (this.checked) return;
      const filled = this.ans.slice(1).filter(Boolean).length;
      if (!filled) { this.reveal(); return; }
      let ok = 0, enh = 0;
      const marks = this.task.notes.map((sn, i) => {
        if (i === 0) return 'given';
        const u = this.ans[i];
        if (u && Note.sameMidi(u, sn)) { ok++; if (!Note.eq(u, sn)) enh++; return 'ok'; }
        return 'bad';
      });
      const n = this.task.notes.length - 1;
      const pct = Math.round(100 * ok / n);
      this.res = { marks };
      this.checked = true;
      statAdd(this.id, pct);
      const kind = pct === 100 ? 'ok' : pct >= 60 ? 'info' : 'bad';
      let msg = t('flRes', { ok, n });
      if (enh) msg += ' ' + t('flEnh', { n: enh });
      setFeedback(this.P.feedback, kind, fbIcon(kind) + `<span>${esc(msg)}</span>`);
      this.P.solWrap.hidden = false;
      this.render(); this.renderSolution();
    },
    reveal() {
      if (this.checked) return;
      this.checked = true;
      setFeedback(this.P.feedback, 'info', fbIcon('info') + `<span>${esc(t('solShown'))}</span>`);
      this.P.solWrap.hidden = false;
      this.render(); this.renderSolution();
    },

    measures(notes, colorFn, withSlots) {
      const out = [];
      for (let bar = 0; bar < this.S.bars; bar++) {
        const events = [];
        for (let k = 0; k < 4; k++) {
          const i = bar * 4 + k, n = notes[i];
          events.push({ dur: 'q', note: n, slot: withSlots ? 'n' + i : null, ph: !n && withSlots ? 'note' : null, color: colorFn(i), locked: i === 0 });
        }
        out.push({ events });
      }
      return out;
    },
    render() {
      if (!this.P || !this.task) return;
      const P = this.P, C = notaColors(), S = this.S;
      const first = this.task.notes[0];
      P.info.replaceChildren(
        this.task.key ? soundChip(keyName(this.task.key), () => cadenceEvents(this.task.key)) : chip(t('flFreeChip'), 'chip-strong'),
        soundChip(t('startChip', { n: noteName(first) }), () => [{ t: 0, midi: Note.midi(first), dur: 1.6 }]));
      P.opts.replaceChildren(lengthControl('lenBars', [2, 4, 8, 12], S.bars, v => { S.bars = v; this.save(); this.newTask(); }),
        tempoControl('tempoLbl', S.tempo, 30, 120, 2, v => '♩ = ' + v, v => { S.tempo = v; this.save(); }));
      const marks = this.res ? this.res.marks : null;
      const measures = this.measures(this.ans, i => i === 0 ? 'currentColor' : marks ? (marks[i] === 'ok' ? C.ok : C.bad) : C.user, true);
      this.hit = renderLines(P.score, {
        clef: S.clef, key: this.task.key, time: '4/4', beats: 4, beatValue: 4, measures,
        minMW: 130, maxMPL: 4, sel: this.checked ? null : 'n' + this.cursor, range: this.diaRange()
      });
      this.playBtn.disabled = !this.checked && S.limit && this.playsLeft <= 0;
      if (this.checked) dockHide(P);
      else {
        const lbl = t('dockNoteN', { i: this.cursor + 1, n: this.ans.length });
        dockNote(P, this, lbl, this.ans[this.cursor]);
      }
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
const ExSec = makeFlight(2);
const ExTer = makeFlight(3);
