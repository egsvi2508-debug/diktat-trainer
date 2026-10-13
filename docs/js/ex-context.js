'use strict';
/* ============================================================
   Einheit 2 — Hören im Kontext
     Ton: the tonic triad of a random key (5/3, 6 or 6/4), then one note – which one?
     Zweiklang: the triad, then two notes at once – which two?
     Dreiklang: the triad, then a major or minor triad of another key – which one?
   The context chord is shown, the answer is tapped on a keyboard (every spelling counts).
   Chord tones come up rarely. A quiet stopwatch runs from the moment the answer sounds;
   after a right answer the next one follows by itself.
   ============================================================ */

/* chords in columns on a grand staff (whole notes), each column its own bar; a column without
   notes is drawn as a "?" box. cols: [{notes: [{d,a}], colors?: [..], label}] */
function renderChordCols(host, cols, key) {
  const scale = autoScale(host.clientWidth) * 1.08;
  const W = Math.max(260, host.clientWidth) / scale;
  const top = -6;
  const { ctx, svg } = vfSurface(host, 238 + top, scale);
  const probe = new VF.Stave(0, 0, 300).addClef('treble').addKeySignature(key.vf);
  const extra = probe.getNoteStartX() - new VF.Stave(0, 0, 300).getNoteStartX();
  const colW = Math.min(118, (W - 24 - extra) / cols.length);
  const total = extra + colW * cols.length;
  let x = Math.max(8, (W - total) / 2);
  cols.forEach((c, ci) => {
    const w = ci === 0 ? colW + extra : colW;
    const tr = new VF.Stave(x, top, w), bs = new VF.Stave(x, top + 108, w);
    if (ci === 0) { tr.addClef('treble').addKeySignature(key.vf); bs.addClef('bass').addKeySignature(key.vf); }
    if (ci === cols.length - 1) { tr.setEndBarType(VF.BarlineType.END); bs.setEndBarType(VF.BarlineType.END); }
    const ns = Math.max(tr.getNoteStartX(), bs.getNoteStartX());
    tr.setNoteStartX(ns); bs.setNoteStartX(ns);
    tr.setContext(ctx).draw(); bs.setContext(ctx).draw();
    if (ci === 0) ['brace', 'singleLeft'].forEach(tp => new VF.StaveConnector(tr, bs).setType(tp).setContext(ctx).draw());
    new VF.StaveConnector(tr, bs).setType('singleRight').setContext(ctx).draw();
    const notes = (c.notes || []).map((n, i) => ({ n, color: c.colors ? c.colors[i] : c.color })).sort((a, b) => a.n.d - b.n.d);
    const mk = (list, clef) => {
      if (!list.length) return new VF.GhostNote({ duration: 'w' });
      const sn = new VF.StaveNote({ keys: list.map(o => Note.vfKey(o.n)), duration: 'w', clef });
      list.forEach((o, i) => {
        const want = key.sig[mod(o.n.d, 7)];
        if (o.n.a !== want) sn.addModifier(new VF.Accidental(ACC_VF[o.n.a]), i);
        if (o.color && o.color !== 'currentColor') sn.setKeyStyle(i, { fillStyle: o.color, strokeStyle: o.color });
      });
      const cs = list.map(o => o.color).filter(Boolean);
      if (cs.length && cs.every(cc => cc === cs[0]) && cs[0] !== 'currentColor') styleNote(sn, cs[0]);
      return sn;
    };
    const nT = mk(notes.filter(o => o.n.d >= 28), 'treble'), nB = mk(notes.filter(o => o.n.d < 28), 'bass');
    const vT = new VF.Voice({ num_beats: 4, beat_value: 4 }).setMode(VF.Voice.Mode.SOFT).addTickables([nT]);
    const vB = new VF.Voice({ num_beats: 4, beat_value: 4 }).setMode(VF.Voice.Mode.SOFT).addTickables([nB]);
    new VF.Formatter().joinVoices([vT]).joinVoices([vB]).format([vT, vB], Math.max(30, tr.getNoteEndX() - ns - 10));
    vT.draw(ctx, tr); vB.draw(ctx, bs);
    const cx = ns + (tr.getNoteEndX() - ns) / 2 - 4;
    if (!notes.length) {
      const tTop = tr.getYForLine(0), bBot = bs.getYForLine(4);
      svg.appendChild(svgEl('rect', { x: cx - 18, y: tTop - 6, width: 36, height: bBot - tTop + 12, rx: 9, class: 'ph-beat' + (c.on ? ' on' : '') }));
      svg.appendChild(svgEl('text', { x: cx, y: (tTop + bBot) / 2 + 6, class: 'ph-plus' + (c.on ? ' on' : '') }, '?'));
    }
    if (c.label) svg.appendChild(svgEl('text', { x: cx, y: bs.getYForLine(4) + 34, class: 'cc-lbl' }, c.label));
    x += w;
  });
}

const INV_KEYS = ['inv53', 'inv6', 'inv64'];
function makeContext(kind) {
  const id = { note: 'cton', iv: 'cint', tri: 'ctri' }[kind], K = { note: 'Note', iv: 'Iv', tri: 'Tri' }[kind];
  return {
    id, kind, titleKey: 'cx' + K + 'Title', descKey: 'cx' + K + 'Desc',
    how: ['cxHow1', 'cx' + K + 'How2', 'cxHow3', 'cxHow4'], howTitle: 'cx' + K + 'Title',
    S: Object.assign({ maxAcc: 4, mode: 'both', together: false, auto: true }, store.get(id + '.s', {})),
    task: null, phase: 'idle', picked: [], qual: null, res: null, answered: 0, wait: null, last: {},
    get checked() { return this.phase === 'done'; },
    save() { store.set(this.id + '.s', this.S); },

    build() {
      const P = this.P = panelShell(this);
      P.settingsBody.append(howField(this),
        segControl(id + '-mode', 'modeLbl', [['maj', t('major')], ['min', t('minor')], ['both', t('both')]], this.S.mode, v => { this.S.mode = v; this.save(); }),
        segControl(id + '-acc', 'maxAcc', [0, 1, 2, 3, 4, 5, 6].map(n => [n, String(n)]), this.S.maxAcc, v => { this.S.maxAcc = v; this.save(); }),
        kind === 'tri' ? '' : segControl(id + '-tog', 'cxPlay', [[false, t('cxAfter')], [true, t('cxWith')]], this.S.together, v => { this.S.together = v; this.save(); }),
        toggleGroup('options', toggleControl(id + '-auto', 'cxAuto', this.S.auto, v => { this.S.auto = v; this.save(); })));
      this.timer = makeTimer();
      this.keys = pianoKeys(pc => this.pickPc(pc));
      if (kind === 'tri') {
        this.qualSeg = el('div', { class: 'seg qual-seg', role: 'radiogroup', 'aria-label': t('cxQual') },
          [['M', 'major'], ['m', 'minor']].map(([q, key]) => el('button', { type: 'button', class: 'seg-b', role: 'radio', 'aria-checked': 'false', 'data-q': q, onclick: () => this.pickQual(q) }, t(key === 'major' ? 'cxMaj' : 'cxMin'))));
      }
      this.againBtn = btn('cxAgain', ICON.play, () => this.play(false), 'btn-sec btn-big');
      this.goBtn = el('button', { type: 'button', class: 'btn btn-big btn-play btn-action' }, el('span', { class: 'ico' }), el('span', { class: 'lbl' }));
      this.goBtn.addEventListener('click', () => this.mainAction());
      P.controls.append(this.againBtn, this.goBtn);
      watchWidth(P.score, () => this.render());
      if (!this.task) this.newTask(false); else this.render();
    },

    /* ---------- tasks ---------- */
    newTask(play) {
      clearTimeout(this.wait);
      const S = this.S;
      let key, inv;
      for (let i = 0; i < 20; i++) {
        key = randomKey(S.maxAcc, S.mode, this.id);
        inv = rnd(3);
        if (key.vf + inv !== this.last.ctx) break;
      }
      this.last.ctx = key.vf + inv;
      const chord = contextChord(key, inv), cPcs = triadPcs(key.pc, key.minor);
      const top = Math.max(...chord.map(Note.midi)), lowT = top + 2;
      const place = (pc, lo) => lo + mod(pc - lo, 12);
      const spellAt = (m, pc) => { const sp = spellInKey(key, pc); return noteAt(m, sp.step, sp.a); };
      let target, tri = null;
      if (kind === 'note') {
        const avoid = this.last.rel != null ? [mod(key.pc + this.last.rel, 12)] : [];
        const pc = pickContextPc(cPcs, avoid);
        this.last.rel = mod(pc - key.pc, 12);
        target = [spellAt(place(pc, lowT), pc)];
      } else if (kind === 'iv') {
        let pc1, pc2, size;
        for (let i = 0; i < 30; i++) {
          pc1 = pickContextPc(cPcs, []); pc2 = pickContextPc(cPcs, [pc1]);
          size = mod(pc2 - pc1, 12);
          if (cPcs.includes(pc1) && cPcs.includes(pc2) && chance(0.8)) continue;   // both chord tones: rarely
          if (size !== this.last.size) break;
        }
        this.last.size = size;
        const m1 = place(pc1, lowT - 2);
        target = [spellAt(m1, pc1), spellAt(m1 + size, pc2)];
      } else {
        const cands = [];
        const dia = [0, 2, 4, 5, 7, 9].map((x, i) => ({ pc: mod(key.pc + (key.minor ? [0, 2, 3, 5, 7, 8][i] : x), 12), minor: key.minor ? [true, false, false, true, true, false][i] : [false, true, true, false, false, true][i] }));
        for (let pc = 0; pc < 12; pc++) for (const minor of [false, true]) {
          if (pc === key.pc && minor === key.minor) continue;
          if (this.last.tri === pc + ':' + minor) continue;
          const isDia = dia.some(o => o.pc === pc && o.minor === minor);
          cands.push({ pc, minor, w: isDia ? 1 : 3 });
        }
        const c = wpickBy(cands, o => o.w);
        this.last.tri = c.pc + ':' + c.minor;
        const sp = spellTriad(c.pc, c.minor, key.fifths), tinv = rnd(3);
        const pcs = triadPcs(c.pc, c.minor);
        // close position from the inversion's bass, between G3 and F♯4
        const order = [0, 1, 2].map(i => (i + tinv) % 3);
        let m = place(pcs[order[0]], 55);
        target = order.map((ti, j) => {
          if (j) { m += mod(pcs[ti] - mod(m, 12), 12) || 12; }
          return noteAt(m, sp.notes[ti].step, sp.notes[ti].a);
        });
        tri = { root: c.pc, minor: c.minor, step: sp.step, alt: sp.a, inv: tinv };
      }
      this.task = { key, inv, chord, target, tri };
      this.phase = 'idle'; this.picked = []; this.qual = null; this.res = null;
      this.timer.reset();
      if (this.P) {
        setFeedback(this.P.feedback, '', '');
        this.render();
        if (play) this.play(true);
      }
    },
    events() {
      const S = this.S, together = S.together && kind !== 'tri';
      const ev = this.task.chord.map(n => ({ t: 0, midi: Note.midi(n), dur: together ? 3.1 : 1.3, vel: 0.55 }));
      const t1 = together ? 1.15 : 1.6;
      this.task.target.forEach(n => ev.push({ t: t1, midi: Note.midi(n), dur: 1.7, vel: kind === 'tri' ? 0.6 : 0.72 }));
      return { ev, t1 };
    },
    // play context + answer; the first time the stopwatch starts when the answer sounds
    play(first) {
      const { ev, t1 } = this.events();
      if (first) this.phase = 'listen';
      this.render();
      Sound.play(ev, {
        onStart: t0 => {
          if (!first) return;
          const ctx = Sound.ready(), ms = Math.max(0, (t0 + t1 - ctx.currentTime) * 1000);
          clearTimeout(this.wait);
          this.wait = setTimeout(() => {
            if (this.phase !== 'listen') return;
            this.phase = 'answer';
            this.timer.start();
            this.render();
          }, ms);
        }
      });
    },
    mainAction() {
      if (this.phase === 'idle') { this.play(true); return; }
      if (this.phase === 'done') { this.newTask(true); return; }
      if (this.phase === 'answer' || this.phase === 'listen') this.finish(true);
    },

    /* ---------- answering ---------- */
    pickPc(pc) {
      if (this.phase !== 'answer') return;
      if (kind === 'note') { this.picked = [pc]; this.finish(false); return; }
      if (kind === 'iv') {
        const i = this.picked.indexOf(pc);
        if (i >= 0) this.picked.splice(i, 1); else this.picked.push(pc);
        if (this.picked.length === 2) { this.finish(false); return; }
        this.render();
        return;
      }
      this.picked = [pc];
      if (this.qual) this.finish(false); else this.render();
    },
    pickQual(q) {
      if (this.phase !== 'answer') return;
      this.qual = q;
      if (this.picked.length) this.finish(false); else this.render();
    },
    finish(gaveUp) {
      clearTimeout(this.wait);
      const task = this.task, want = task.target.map(n => mod(Note.midi(n), 12));
      let right;
      if (gaveUp) right = false;
      else if (kind === 'tri') right = this.picked[0] === task.tri.root && (this.qual === 'm') === task.tri.minor;
      else right = this.picked.length === want.length && want.every(pc => this.picked.includes(pc));
      if (!this.timer.running && this.phase === 'listen') this.timer.start();
      const tm = this.timer.stop(right) || { s: 0, quicker: false };
      this.phase = 'done';
      this.res = { right, gaveUp };
      Sound.stop();
      if (right) Sound.chime(tm.quicker ? 2 : tm.s < 3 ? 1 : 0);
      this.answered++;
      if (this.answered % 10 === 1) Backend.exerciseDone(this.id);
      setFeedback(this.P.feedback, right ? 'ok' : gaveUp ? 'info' : 'bad', fbIcon(right ? 'ok' : gaveUp ? 'info' : 'bad') + `<span>${esc(this.explain(right, gaveUp))}</span>`);
      this.render();
      if (right && this.S.auto) this.wait = setTimeout(() => { if (this.phase === 'done' && App.active === this) this.newTask(true); }, tm.quicker ? 950 : 1250);
      else if (!right) this.wait = setTimeout(() => { if (this.phase === 'done' && App.active === this) this.play(false); }, 450);
    },
    // "Fis – übermäßige Quarte über C" / "As-Dur (Sextakkord)"
    explain(right, gaveUp) {
      const task = this.task, key = task.key;
      const pcName = pc => (LANG === 'de' ? PC_DE : PC_EN)[pc];
      const rel = n => {
        const dT = n.d - mod(n.d - key.step, 7), tonic = { d: dT, a: key.alt };
        return dT === n.d && n.a === key.alt ? t('cxTonic') : t('cxAbove', { iv: intervalName(intervalInfo(tonic, n)), t: noteName(tonic, false) });
      };
      if (kind === 'note') {
        const n = task.target[0], what = noteName(n, false) + ' (' + rel(n) + ')';
        if (right) return t('cxRight', { x: what });
        return gaveUp ? t('cxShown', { x: what }) : t('cxWrong', { x: what, u: pcName(this.picked[0]) });
      }
      if (kind === 'iv') {
        const [a, b] = task.target, iv = intervalName(intervalInfo(a, b));
        const what = t('cxPair', { a: noteName(a, false), b: noteName(b, false), iv });
        if (right) return t('cxRight', { x: what });
        return gaveUp ? t('cxShown', { x: what }) : t('cxWrong', { x: what, u: this.picked.map(pcName).join(' + ') || '–' });
      }
      const tr = task.tri, nm = keyName({ step: tr.step, alt: tr.alt, minor: tr.minor }) + ' (' + t(INV_KEYS[tr.inv]) + ')';
      if (right) return t('cxRight', { x: nm });
      let u = '–';
      if (this.picked.length && this.qual) {
        const sp = spellTriad(this.picked[0], this.qual === 'm', key.fifths);
        u = keyName({ step: sp.step, alt: sp.a, minor: this.qual === 'm' });
      } else if (this.picked.length) u = (LANG === 'de' ? PC_DE : PC_EN)[this.picked[0]];
      return gaveUp ? t('cxShown', { x: nm }) : t('cxWrong', { x: nm, u });
    },
    onHide() { clearTimeout(this.wait); if (this.phase === 'listen' || this.phase === 'answer') { this.phase = 'idle'; this.timer.reset(); } },

    /* ---------- drawing ---------- */
    render() {
      if (!this.P || !this.task) return;
      const P = this.P, C = notaColors(), task = this.task, key = task.key, done = this.phase === 'done';
      const invTxt = t(INV_KEYS[task.inv]), fn = ['I', 'I⁶', 'I⁶₄'][task.inv];
      P.info.replaceChildren(
        soundChip(keyName(key), () => cadenceEvents(key)),
        soundChip(t('cxChord', { f: fn, i: invTxt }), () => task.chord.map(n => ({ t: 0, midi: Note.midi(n), dur: 1.6, vel: 0.56 }))));
      const want = task.target.map(n => mod(Note.midi(n), 12));
      const cols = [{ notes: task.chord, label: fn }];
      if (done) {
        const ok = this.res.right;
        cols.push({ notes: task.target, color: ok ? C.ok : this.res.gaveUp ? C.user : C.bad, label: t('colSolution') });
      } else cols.push({ notes: [], on: this.phase === 'answer', label: '?' });
      renderChordCols(P.score, cols, key);
      // dock: stopwatch, keyboard (and Dur / Moll)
      this.keys.clear();
      this.keys.lock(this.phase !== 'answer');
      if (done && kind === 'tri') {
        const r = task.tri.root, p = this.picked[0];
        this.keys.mark(r, p === r ? 'ok' : 'want');
        if (p != null && p !== r) this.keys.mark(p, 'bad');
      } else if (done) {
        want.forEach(pc => this.keys.mark(pc, this.picked.includes(pc) ? 'ok' : 'want'));
        this.picked.forEach(pc => { if (!want.includes(pc)) this.keys.mark(pc, 'bad'); });
      } else this.picked.forEach(pc => this.keys.mark(pc, 'sel'));
      const head = el('div', { class: 'cx-top' + (this.qualSeg ? ' cx-top-2' : '') }, this.timer.el);
      const parts = [head, this.keys];
      if (this.qualSeg) {
        const wantQ = task.tri.minor ? 'm' : 'M';
        $$('.seg-b', this.qualSeg).forEach(b => {
          const q = b.dataset.q;
          b.setAttribute('aria-checked', String(q === this.qual));
          b.disabled = this.phase !== 'answer';
          b.classList.toggle('q-ok', done && q === wantQ);
          b.classList.toggle('q-bad', done && q === this.qual && q !== wantQ);
        });
        head.append(this.qualSeg);
      }
      P.dock.hidden = false;
      P.dock.replaceChildren(el('div', { class: 'cx-dock' }, ...parts));
      // buttons
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
      if (e.ctrlKey || e.metaKey || e.altKey) return false;
      const k = e.key.toLowerCase();
      if (kind === 'tri' && (e.key === '1' || e.key === '2')) { this.pickQual(e.key === '1' ? 'M' : 'm'); return true; }
      const nat = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, h: 11 };
      if (k === 'b') { this.pickPc(LANG === 'de' ? 10 : 11); return true; }
      if (k in nat) { this.pickPc(mod(nat[k] + (e.shiftKey ? 1 : 0), 12)); return true; }
      return false;
    }
  };
}
const ExCtxNote = makeContext('note');
const ExCtxIv = makeContext('iv');
const ExCtxTri = makeContext('tri');
