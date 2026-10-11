'use strict';
/* ============================================================
   Notation: VexFlow rendering, staff click input, pitch toolbar
   ============================================================ */
const VF = window.Vex ? Vex.Flow : null;
const TOP_DIA = { treble: 38, bass: 26 };   // diatonic index of the top staff line (F5 / A3)
const SVGNS = 'http://www.w3.org/2000/svg';

const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>',
  stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill="currentColor"/></svg>',
  left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6 8.5 12l6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 14.5 6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9.5 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  octUp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 11 6-6 6 6M6 18l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  octDown: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 6 6 6-6M6 13l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  del: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h10a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 19 19H9l-6-7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m11.5 9.5 5 5m0-5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  cross: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13m-5-5.5L18.5 12 13 17.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  speaker: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4.9a7.5 7.5 0 0 0-2.6-1.5L14 2.4h-4l-.4 2.5A7.5 7.5 0 0 0 7 6.4l-2.4-.9-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-.9a7.5 7.5 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.5 7.5 0 0 0 2.6-1.5l2.4.9 2-3.4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  sliders: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9m4 0h3M4 17h3m4 0h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="15" cy="7" r="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="17" r="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  ear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9a5 5 0 0 1 10 0c0 3-3 3.5-3 6.5a2.5 2.5 0 0 1-5 .5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M10 9.5a2 2 0 0 1 4 0c0 1.2-1.4 1.6-1.4 2.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
};

function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#000'; }
function notaColors() {
  return { ink: 'currentColor', user: cssVar('--accent'), ok: cssVar('--ok'), bad: cssVar('--bad'), muted: cssVar('--muted') };
}
function autoScale(w) { return w < 440 ? 0.9 : w < 520 ? 1 : w < 820 ? 1.1 : 1.2; }

function vfSurface(host, hUnits, scale) {
  host.innerHTML = '';
  const wCss = Math.max(260, Math.floor(host.clientWidth));
  const r = new VF.Renderer(host, VF.Renderer.Backends.SVG);
  r.resize(wCss, Math.ceil(hUnits * scale));
  const ctx = r.getContext();
  ctx.scale(scale, scale);
  ctx.setFillStyle('currentColor');
  ctx.setStrokeStyle('currentColor');
  const svg = host.querySelector('svg');
  svg.setAttribute('class', 'score-svg');
  return { ctx, svg, W: wCss / scale };
}

function svgEl(tag, attrs, text) {
  const e = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
}
function behind(svg, node) { svg.insertBefore(node, svg.firstChild); }

function styleNote(sn, color) {
  if (!color || color === 'currentColor') return;
  const st = { fillStyle: color, strokeStyle: color };
  sn.setStyle(st);
  if (sn.setLedgerLineStyle) sn.setLedgerLineStyle(st);
  sn.getModifiers().forEach(m => { if (m.setStyle) m.setStyle(st); });
}

// ev: {dur, note|null, acc, color, stem}
function mkNote(ev, clef) {
  if (!ev.note) return new VF.GhostNote({ duration: ev.dur });
  const opts = { keys: [Note.vfKey(ev.note)], duration: ev.dur, clef };
  if (ev.stem) opts.stem_direction = ev.stem; else opts.auto_stem = true;
  const sn = new VF.StaveNote(opts);
  if (ev.acc != null) sn.addModifier(new VF.Accidental(ACC_VF[ev.acc]), 0);
  if (ev.dur.includes('d')) VF.Dot.buildAndAttach([sn], { all: true });
  styleNote(sn, ev.color);
  return sn;
}

function slotGeometry(stave, events, notes) {
  const L = [], R = [];
  notes.forEach((n, i) => {
    if (events[i].note) { L.push(n.getNoteHeadBeginX() - 2); R.push(n.getNoteHeadEndX() + 2); }
    else { const x = n.getAbsoluteX(); L.push(x - 6); R.push(x - 6); }
  });
  const bounds = [stave.getNoteStartX() - 4];
  for (let i = 1; i < notes.length; i++) {
    if (!events[i].note) bounds.push(L[i]);
    else if (!events[i - 1].note) bounds.push(L[i] - 6);
    else bounds.push((R[i - 1] + L[i]) / 2);
  }
  bounds.push(stave.getNoteEndX());
  return notes.map((n, i) => {
    const x0 = bounds[i], x1 = bounds[i + 1];
    const cx = events[i].note ? (L[i] + R[i]) / 2 : (x0 + x1) / 2;
    return { x0, x1, cx };
  });
}

/* Render a single-staff score broken into lines.
   spec: {clef, key, time, beats, beatValue, measures:[{events, groups}], minMW, maxMPL, sel, rowH, range}
   events: {dur, note, slot, color, locked, ph:'beat'|'note', tint} ; groups: arrays of event indices to beam */
function renderLines(host, spec) {
  const clef = spec.clef || 'treble';
  const sig = spec.key ? spec.key.sig : NO_SIG;
  const scale = autoScale(host.clientWidth);
  const Wfull = Math.max(260, host.clientWidth) / scale;
  const avail = Wfull - 16;
  const probe = new VF.Stave(0, 0, 300).addClef(clef);
  if (spec.key) probe.addKeySignature(spec.key.vf);
  if (spec.time) probe.addTimeSignature(spec.time);
  const extra = probe.getNoteStartX() - new VF.Stave(0, 0, 300).getNoteStartX();
  const minMW = spec.minMW * (Wfull < 440 ? 0.62 : 1);
  let mpl = clamp(Math.floor((avail - extra) / minMW), 1, spec.maxMPL || 4);
  mpl = Math.ceil(spec.measures.length / Math.ceil(spec.measures.length / mpl));   // even lines: 2+2, not 3+1
  const lines = [];
  for (let i = 0; i < spec.measures.length; i += mpl) lines.push(spec.measures.slice(i, i + mpl));
  const rowH = spec.rowH || 130;
  const { ctx, svg } = vfSurface(host, lines.length * rowH + 14, scale);
  const hit = { rows: [] };
  let mIndex = 0;
  const range = spec.range || [TOP_DIA[clef] - 14, TOP_DIA[clef] + 6];

  lines.forEach((ms, li) => {
    const y = 4 + li * rowH;
    const mw = (avail - extra) / (lines.length === 1 ? ms.length : mpl);
    let x = 8;
    const row = { slots: [], topDia: TOP_DIA[clef], half: 5, minDia: range[0], maxDia: range[1], clef };
    ms.forEach((m, mi) => {
      const w = mi === 0 ? mw + extra : mw;
      const st = new VF.Stave(x, y, w);
      if (mi === 0) {
        st.addClef(clef);
        if (spec.key) st.addKeySignature(spec.key.vf);
        if (spec.time && li === 0) st.addTimeSignature(spec.time);
      }
      if (mIndex === spec.measures.length - 1 && spec.finalBar !== false) st.setEndBarType(VF.BarlineType.END);
      st.setContext(ctx).draw();
      row.topY = st.getYForLine(0);
      if (mi === 0 && li > 0) svg.appendChild(svgEl('text', { x: x + 1, y: row.topY - 14, class: 'mnum' }, String(mIndex + 1)));

      markAccidentals(m.events, sig);
      const notes = m.events.map(ev => mkNote(ev, clef));
      const voice = new VF.Voice({ num_beats: spec.beats, beat_value: spec.beatValue }).setMode(VF.Voice.Mode.SOFT);
      voice.addTickables(notes);
      const beams = [];
      (m.groups || []).forEach(g => {
        const real = g.filter(i => m.events[i].note).map(i => notes[i]);
        if (real.length < 2) return;
        const bs = VF.Beam.generateBeams(real, { groups: [new VF.Fraction(3, 8)] });
        bs.forEach(b => {
          const c = m.events[g[0]].color;
          if (c && c !== 'currentColor' && g.every(i => m.events[i].color === c)) b.setStyle({ fillStyle: c, strokeStyle: c });
          beams.push(b);
        });
      });
      new VF.Formatter().joinVoices([voice]).format([voice], Math.max(40, st.getNoteEndX() - st.getNoteStartX() - 12));
      voice.draw(ctx, st);
      beams.forEach(b => b.setContext(ctx).draw());

      const geo = slotGeometry(st, m.events, notes);
      for (let i = 0; i < m.events.length; i++) {
        const tint = m.events[i].tint;
        if (!tint) continue;
        let j = i;
        while (j + 1 < m.events.length && m.events[j + 1].tint === tint) j++;
        behind(svg, svgEl('rect', { x: geo[i].x0 + 1, y: row.topY - 22, width: Math.max(4, geo[j].x1 - geo[i].x0 - 2), height: 84, rx: 6, class: 'tint-' + tint }));
        i = j;
      }
      m.events.forEach((ev, i) => {
        const g = geo[i];
        if (ev.ph === 'beat') {
          const active = spec.sel === ev.slot;
          svg.appendChild(svgEl('rect', { x: g.x0 + 4, y: row.topY - 3, width: Math.max(8, g.x1 - g.x0 - 8), height: 46, rx: 7, class: 'ph-beat' + (active ? ' on' : '') }));
          svg.appendChild(svgEl('text', { x: (g.x0 + g.x1) / 2, y: row.topY + 25, class: 'ph-plus' + (active ? ' on' : '') }, '+'));
        } else if (ev.ph === 'note') {
          svg.appendChild(svgEl('circle', { cx: g.cx, cy: row.topY + 20, r: 6, class: 'ph-note' + (spec.sel === ev.slot ? ' on' : '') }));
        }
        if (ev.slot != null) {
          if (spec.sel === ev.slot) behind(svg, svgEl('rect', { x: g.x0 + 1, y: row.topY - 30, width: Math.max(6, g.x1 - g.x0 - 2), height: 100, rx: 8, class: 'sel' }));
          row.slots.push({ id: ev.slot, x0: g.x0, x1: g.x1, cx: g.cx, ghost: !ev.note && ev.ph === 'beat', locked: !!ev.locked });
        }
      });
      x += w;
      mIndex++;
    });
    row.yMin = row.topY - 45;
    row.yMax = row.topY + 85;
    hit.rows.push(row);
  });
  return hit;
}

/* ---------- input: click/tap on the staff ---------- */
function locateHit(hit, p) {
  const row = hit.rows.find(r => p.y >= r.yMin && p.y < r.yMax);
  if (!row) return null;
  const slot = row.slots.find(s => p.x >= s.x0 && p.x < s.x1) || null;
  const dia = clamp(row.topDia - Math.round((p.y - row.topY) / row.half), row.minDia, row.maxDia);
  return { row, slot, dia };
}
function clearPreview(svg) { const g = svg.querySelector('g.preview'); if (g) g.remove(); }
function drawPreview(svg, ex, r) {
  clearPreview(svg);
  if (!r || !r.slot || r.slot.locked || r.slot.ghost || (ex.canPreview && !ex.canPreview(r.slot))) return;
  const { row, slot, dia } = r;
  const y = row.topY + (row.topDia - dia) * row.half;
  const g = svgEl('g', { class: 'preview' });
  const bottom = row.topDia - 8;
  for (let d = row.topDia + 2; d <= dia; d += 2) {
    const ly = row.topY + (row.topDia - d) * row.half;
    g.appendChild(svgEl('line', { x1: slot.cx - 10, x2: slot.cx + 10, y1: ly, y2: ly }));
  }
  for (let d = bottom - 2; d >= dia; d -= 2) {
    const ly = row.topY + (row.topDia - d) * row.half;
    g.appendChild(svgEl('line', { x1: slot.cx - 10, x2: slot.cx + 10, y1: ly, y2: ly }));
  }
  g.appendChild(svgEl('ellipse', { cx: slot.cx, cy: y, rx: 5.8, ry: 4.3, transform: `rotate(-20 ${slot.cx} ${y})` }));
  svg.appendChild(g);
}
function bindStaffInput(host, ex) {
  let dragId = null, lastDia = null;
  const pt = e => {
    const svg = host.querySelector('svg');
    if (!svg) return null;
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    return { svg, p: p.matrixTransform(m.inverse()) };
  };
  host.addEventListener('pointerdown', e => {
    if (e.button !== 0 || !ex.hit) return;
    const q = pt(e); if (!q) return;
    const r = locateHit(ex.hit, q.p);
    if (!r || !r.slot) return;
    e.preventDefault();
    ex.staffDown(r);
    if (e.pointerType === 'mouse' && !r.slot.ghost && !r.slot.locked) { dragId = r.slot.id; lastDia = r.dia; }
  });
  host.addEventListener('pointermove', e => {
    if (!ex.hit) return;
    const q = pt(e); if (!q) return;
    const r = locateHit(ex.hit, q.p);
    if (dragId != null && (e.buttons & 1)) {
      if (r && r.dia !== lastDia) { lastDia = r.dia; ex.staffDrag(dragId, r); }
      return;
    }
    if (e.pointerType === 'mouse') drawPreview(q.svg, ex, r);
  });
  const end = () => { dragId = null; };
  host.addEventListener('pointerup', end);
  host.addEventListener('pointercancel', end);
  host.addEventListener('pointerleave', () => { const svg = host.querySelector('svg'); if (svg) clearPreview(svg); });
}

/* ---------- pitch editing shared by all exercises ----------
   ex must provide: cursor, moveCursor(d), getNote(i), setNote(i, n), editable(i), refNote(i),
   defaultAlt(i, d), clearSlot(i), diaRange(), isLocked() */
const SeqEdit = {
  cmd(ex, c, arg) {
    if (ex.isLocked()) return;
    if (c === 'left' || c === 'right') { ex.moveCursor(c === 'left' ? -1 : 1); return; }
    const i = ex.cursor;
    if (i == null || !ex.editable(i)) { if (ex.hintNoNote) ex.hintNoNote(); return; }
    const n = ex.getNote(i);
    const rg = ex.diaRange();
    const put = (d, a) => { d = clamp(d, rg[0], rg[1]); ex.setNote(i, { d, a: a ?? ex.defaultAlt(i, d) }); };
    switch (c) {
      case 'up': case 'down':
        if (!n) { const ref = ex.refNote(i); if (ref) put(ref.d, ref.a); return; }
        put(n.d + (c === 'up' ? 1 : -1)); return;
      case 'octUp': case 'octDown':
        if (n) put(n.d + (c === 'octUp' ? 7 : -7), n.a); return;
      case 'acc': if (n) ex.setNote(i, { d: n.d, a: arg }); return;
      case 'accUp': if (n) ex.setNote(i, { d: n.d, a: Math.min(2, n.a + 1) }); return;
      case 'accDown': if (n) ex.setNote(i, { d: n.d, a: Math.max(-2, n.a - 1) }); return;
      case 'letter': {
        const ref = n || ex.refNote(i) || { d: Math.round((rg[0] + rg[1]) / 2) };
        put(Note.nearestStep(arg.step, ref.d), arg.a); return;
      }
      case 'clear': ex.clearSlot(i); return;
    }
  }
};
function pitchKey(e, ex) {
  const k = e.key;
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  if (k === 'ArrowUp') { ex.cmd(e.shiftKey ? 'octUp' : 'up'); return true; }
  if (k === 'ArrowDown') { ex.cmd(e.shiftKey ? 'octDown' : 'down'); return true; }
  if (k === 'ArrowLeft') { ex.cmd('left'); return true; }
  if (k === 'ArrowRight') { ex.cmd('right'); return true; }
  if (k === '+' || k === '#') { ex.cmd('accUp'); return true; }
  if (k === '-') { ex.cmd('accDown'); return true; }
  if (k === 'n' || k === 'N') { ex.cmd('acc', 0); return true; }
  if (k === 'Backspace' || k === 'Delete') { ex.cmd('clear'); return true; }
  const lk = k.length === 1 ? k.toLowerCase() : '';
  if (lk && 'abcdefgh'.includes(lk)) {
    if (lk === 'h') ex.cmd('letter', { step: 6 });
    else if (lk === 'b') ex.cmd('letter', LANG === 'de' ? { step: 6, a: -1 } : { step: 6 });
    else ex.cmd('letter', { step: 'cdefga'.indexOf(lk) });
    return true;
  }
  return false;
}

/* the small tools shown in the dock for the selected note: ▲ ▼ · ♭ ♮ ♯ · ✕
   ♭ and ♯ step the accidental, so pressing ♯ twice gives a double sharp */
function noteTools(ex, opts = {}) {
  const b = (html, titleKey, fn, cls = '') => el('button', { class: 'icon-btn ' + cls, type: 'button', title: t(titleKey), 'aria-label': t(titleKey), html, onclick: fn });
  const acc = (sym, titleKey, fn) => b(`<span class="acc">${sym}</span>`, titleKey, fn);
  return el('div', { class: 'tools', role: 'toolbar', 'aria-label': t('tbLabel') },
    b(ICON.up, 'tbUp', () => ex.cmd('up')),
    b(ICON.down, 'tbDown', () => ex.cmd('down')),
    acc('♭', 'tbFlat', () => ex.cmd('accDown')),
    acc('♮', 'tbNat', () => ex.cmd('acc', 0)),
    acc('♯', 'tbSharp', () => ex.cmd('accUp')),
    b(ICON.del, opts.clearKey || 'tbClear', () => ex.cmd('clear'), 'icon-del'));
}

/* Keep a score in sync with its container width */
function watchWidth(host, fn) {
  let w = 0, raf = 0;
  const ro = new ResizeObserver(() => {
    const nw = Math.floor(host.clientWidth);
    if (nw === w || nw === 0) return;
    w = nw;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(fn);
  });
  ro.observe(host);
}
