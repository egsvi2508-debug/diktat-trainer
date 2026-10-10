'use strict';
/* ============================================================
   Exercises 3 & 4 — Diktat im Flug (only seconds / only thirds)
   ============================================================ */
function makeFlight(kind) {
  const id = kind === 2 ? 'sec' : 'ter';
  return {
    id, kind, no: kind === 2 ? '3' : '4',
    titleKey: kind === 2 ? 'secTitle' : 'terTitle', descKey: kind === 2 ? 'secDesc' : 'terDesc',
    S: Object.assign({ bars: 4, mode: 'free', clef: 'treble', tempo: 84, limit: true }, store.get(id + '.s', {})),
    task: null, ans: null, cursor: 1, checked: false, res: null, hit: null, playsLeft: 3,

    save() { store.set(this.id + '.s', this.S); },

    build() {
      const P = this.P = panelShell(this);
      const S = this.S;
      P.settingsBody.append(
        segControl(id + '-bars', 'bars', [[4, '4'], [8, '8']], S.bars, v => { S.bars = v; this.save(); this.newTask(); }),
        segControl(id + '-mode', 'flMode', [['free', t('flFree')], ['key', t('flKey')]], S.mode, v => { S.mode = v; this.save(); this.newTask(); }),
        segControl(id + '-clef', 'clefLbl', [['treble', t('clefTreble')], ['bass', t('clefBass')]], S.clef, v => { S.clef = v; this.save(); this.newTask(); }),
        sliderControl(id + '-tempo', 'tempoQ', 50, 140, 2, S.tempo, v => '♩ = ' + v, v => { S.tempo = v; this.save(); }),
        el('div', { class: 'toggles' }, toggleControl(id + '-limit', 'flLimit', S.limit, v => { S.limit = v; this.save(); this.render(); }))
      );
      this.playBtn = playButton('playDictation', () => this.events(true), {
        primary: true,
        allowed: () => this.checked || !this.S.limit || this.playsLeft > 0,
        before: () => { if (!this.checked && this.S.limit) { this.playsLeft--; this.render(); } }
      });
      this.startBtn = playButton('playStart', () => [{ t: 0, midi: Note.midi(this.task.notes[0]), dur: 1.4 }]);
      this.checkBtn = btn('check', ICON.check, () => this.check(), 'btn-ink');
      this.solBtn = btn('showSolution', ICON.eye, () => this.reveal());
      this.nextBtn = btn('nextTask', ICON.next, () => this.newTask());
      this.tip = el('p', { class: 'tip' }, el('span', { class: 'tip-ico', html: ICON.ear }), el('span', {}, t('flTip')));
      this.solHost = el('div', { class: 'score' });
      this.solWrap = el('div', { class: 'sol-wrap', hidden: true }, el('h3', { class: 'sol-h' }, t('solution')), el('div', { class: 'sheet' }, this.solHost));
      P.controls.append(
        el('div', { class: 'row' }, this.playBtn, this.startBtn),
        this.tip,
        pitchToolbar(this),
        keyHelp(),
        el('div', { class: 'row actions' }, this.checkBtn, this.solBtn, this.nextBtn)
      );
      this.root.insertBefore(this.solWrap, P.stats);
      bindStaffInput(P.score, this);
      watchWidth(P.score, () => this.render());
      watchWidth(this.solHost, () => this.renderSolution());
      if (!this.task) this.newTask(); else this.render();
    },

    newTask() {
      const S = this.S, L = S.bars * 4, step = this.kind - 1;
      const [lo, hi] = this.kind === 2 ? (S.clef === 'treble' ? [60, 81] : [40, 62]) : (S.clef === 'treble' ? [57, 84] : [36, 64]);
      const key = S.mode === 'key' ? randomKey(4, chance(0.7) ? 'maj' : 'min') : null;
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
        this.solWrap.hidden = true;
        this.render();
      }
    },

    events(countIn) {
      const q = 60 / this.S.tempo, ev = [];
      let t0 = 0;
      if (countIn) { for (let i = 0; i < 4; i++) ev.push({ t: i * q, click: true, accent: i === 0 }); t0 = 4 * q; }
      this.task.notes.forEach((n, i) => ev.push({ t: t0 + i * q, midi: Note.midi(n), dur: q * 0.92, vel: i % 4 === 0 ? 0.9 : 0.76 }));
      return ev;
    },

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
      if (!filled) { setFeedback(this.P.feedback, 'info', fbIcon('info') + `<span>${esc(t('flEmpty'))}</span>`); return; }
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
      setFeedback(this.P.feedback, kind, fbIcon(kind) + `<span><b>${pct} %</b> · ${esc(msg)}</span>`);
      this.solWrap.hidden = false;
      this.render(); this.renderSolution();
    },
    reveal() {
      if (this.checked) return;
      this.checked = true;
      setFeedback(this.P.feedback, 'info', fbIcon('info') + `<span>${esc(t('solShown'))}</span>`);
      this.solWrap.hidden = false;
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
      P.taskbar.innerHTML = '';
      if (this.task.key) P.taskbar.append(chip(t('keyChip', { k: keyName(this.task.key) }), 'chip-strong'));
      else P.taskbar.append(chip(t('flFreeChip'), 'chip-strong'));
      P.taskbar.append(chip(t('startChip', { n: noteName(this.task.notes[0]) })),
        chip(t('barsChip', { n: S.bars }) + ' · ' + t('notesChip', { n: this.task.notes.length }), 'chip-muted'));
      if (S.limit && !this.checked) P.taskbar.append(chip(t('playsLeft', { n: this.playsLeft }), this.playsLeft ? 'chip-accent' : 'chip-bad'));
      const marks = this.res ? this.res.marks : null;
      const measures = this.measures(this.ans, i => i === 0 ? 'currentColor' : marks ? (marks[i] === 'ok' ? C.ok : C.bad) : C.user, true);
      this.hit = renderLines(P.score, {
        clef: S.clef, key: this.task.key, time: '4/4', beats: 4, beatValue: 4, measures,
        minMW: 130, maxMPL: 4, sel: this.checked ? null : 'n' + this.cursor, range: this.diaRange()
      });
      this.playBtn.disabled = !this.checked && S.limit && this.playsLeft <= 0;
      this.checkBtn.disabled = this.checked;
      this.solBtn.disabled = this.checked;
      this.nextBtn.classList.toggle('btn-ink', this.checked);
      this.nextBtn.classList.toggle('btn-sec', !this.checked);
      P.stats.textContent = statText(this.id);
    },
    renderSolution() {
      if (!this.checked || this.solWrap.hidden) return;
      renderLines(this.solHost, {
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
