'use strict';
/* ============================================================
   UI building blocks. Every exercise screen has the same shape:
     one instruction line · info chips (tap to hear) · staff with a small
     editing dock that appears only when needed · two big buttons
   All options live in the single ⚙ sheet (see app.js).
   ============================================================ */
function segControl(id, labelKey, options, value, onChange) {
  const lab = el('span', { class: 'field-lbl', id: id + '-l' }, t(labelKey));
  const seg = el('div', { class: 'seg', role: 'radiogroup', 'aria-labelledby': id + '-l' });
  options.forEach(([v, text]) => {
    const b = el('button', { type: 'button', class: 'seg-b', role: 'radio', 'aria-checked': String(v === value), id: id + '-' + v }, text);
    b.addEventListener('click', () => {
      $$('.seg-b', seg).forEach(x => x.setAttribute('aria-checked', 'false'));
      b.setAttribute('aria-checked', 'true');
      onChange(v);
    });
    seg.append(b);
  });
  return el('div', { class: 'field' }, lab, seg);
}
function toggleControl(id, labelKey, checked, onChange) {
  const inp = el('input', { type: 'checkbox', id, class: 'sw-in' });
  inp.checked = checked;
  inp.addEventListener('change', () => onChange(inp.checked, inp));
  return el('label', { class: 'toggle', for: id }, inp, el('span', { class: 'sw', 'aria-hidden': 'true' }), el('span', { class: 'toggle-lbl' }, t(labelKey)));
}
function toggleGroup(labelKey, ...toggles) {
  return el('div', { class: 'field' }, el('span', { class: 'field-lbl' }, t(labelKey)), el('div', { class: 'toggles' }, ...toggles));
}
function sliderControl(id, labelKey, min, max, step, value, fmt, onChange) {
  const out = el('output', { for: id, class: 'field-val' }, fmt(value));
  const inp = el('input', { type: 'range', id, min, max, step, value });
  inp.addEventListener('input', () => { out.textContent = fmt(+inp.value); onChange(+inp.value); });
  return el('div', { class: 'field' }, el('label', { class: 'field-lbl', for: id }, t(labelKey), out), inp);
}
function btn(labelKey, icon, onClick, cls = 'btn-sec', id) {
  return el('button', { type: 'button', class: 'btn ' + cls, onclick: onClick, id },
    icon ? el('span', { class: 'ico', html: icon }) : null, el('span', { class: 'lbl' }, t(labelKey)));
}
function iconBtn(icon, titleKey, onClick, cls = '') {
  return el('button', { type: 'button', class: 'icon-btn ' + cls, title: t(titleKey), 'aria-label': t(titleKey), html: icon, onclick: onClick });
}
function chip(text, cls = '') { return el('span', { class: 'chip ' + cls }, text); }
/* an info chip you can tap to hear something (key → cadence, first note → that note) */
function soundChip(text, getEvents) {
  const b = el('button', { type: 'button', class: 'chip chip-sound', title: t('tapToHear') },
    el('span', {}, text), el('span', { class: 'ico', html: ICON.speaker }));
  b.addEventListener('click', () => { const ev = getEvents(); if (ev && ev.length) Sound.play(ev); });
  return b;
}

/* modal sheet (bottom sheet on phones, card on desktop) */
function makeDialog(title) {
  const body = el('div', { class: 'dlg-body' });
  const h = el('h3', {}, title);
  const d = el('dialog', { class: 'dlg' },
    el('div', { class: 'dlg-head' }, h, iconBtn(ICON.cross, 'close', () => d.close())),
    body,
    el('div', { class: 'dlg-foot' }, btn('done', ICON.check, () => d.close(), 'btn-ink')));
  d.addEventListener('click', e => { if (e.target === d) d.close(); });
  document.body.append(d);
  return { d, body, h, open: () => { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); } };
}

function panelShell(ex) {
  const root = ex.root;
  root.innerHTML = '';
  const P = {
    hint: el('p', { class: 'hint-line' }, t(ex.descKey)),
    info: el('div', { class: 'info' }),
    score: el('div', { class: 'score', tabindex: '0', 'aria-label': t('scoreLabel') }),
    dock: el('div', { class: 'dock' }),
    controls: el('div', { class: 'controls' }),
    feedback: el('div', { class: 'feedback', role: 'status', hidden: true }),
    solHost: el('div', { class: 'score' }),
    settingsBody: el('div', { class: 'set-list' })
  };
  P.sheet = el('div', { class: 'sheet' }, P.score, P.dock);
  P.solWrap = el('div', { class: 'sol-wrap', hidden: true }, el('h3', { class: 'sol-h' }, t('solution')), el('div', { class: 'sheet' }, P.solHost));
  root.append(P.hint, P.info, P.sheet, P.controls, P.feedback, P.solWrap);
  return P;
}

/* the two big buttons: Listen + one smart button (Check · Show solution · Next) */
function mainControls(ex, P, playBtn) {
  const act = el('button', { type: 'button', class: 'btn btn-big btn-ink btn-action' }, el('span', { class: 'ico' }), el('span', { class: 'lbl' }));
  act.addEventListener('click', () => {
    if (ex.checked) ex.newTask(true);
    else if (ex.hasInput()) ex.check();
    else ex.reveal();
  });
  ex.actBtn = act;
  playBtn.classList.add('btn-big');
  P.controls.append(playBtn, act);
}
function syncControls(ex) {
  const b = ex.actBtn;
  if (!b) return;
  const mode = ex.checked ? 'next' : ex.hasInput() ? 'check' : 'reveal';
  $('.lbl', b).textContent = t(mode === 'next' ? 'nextTask' : mode === 'check' ? 'check' : 'showSolution');
  $('.ico', b).innerHTML = mode === 'next' ? ICON.next : mode === 'check' ? ICON.check : ICON.eye;
  b.classList.toggle('btn-play', mode === 'next');
  b.classList.toggle('btn-ink', mode === 'check');
  b.classList.toggle('btn-sec', mode === 'reveal');
}

/* the editing dock under the staff */
function dockHide(P) { P.dock.replaceChildren(); P.dock.hidden = true; }
function dockHint(P, label, text) {
  P.dock.hidden = false;
  P.dock.replaceChildren(label ? el('span', { class: 'dock-lbl' }, label) : '', el('span', { class: 'dock-hint' }, text));
}
function dockNote(P, ex, label, note, opts) {
  P.dock.hidden = false;
  P.dock.replaceChildren(
    el('span', { class: 'dock-lbl' }, label),
    el('span', { class: 'dock-name' }, note ? noteName(note) : '–'),
    noteTools(ex, opts));
}

function setFeedback(box, kind, html, ...extra) {
  box.className = 'feedback fb-' + kind;
  box.innerHTML = html || '';
  extra.forEach(x => { if (x) box.append(x); });
  box.hidden = !html;
}
function fbIcon(kind) { return `<span class="fb-ico">${kind === 'ok' ? ICON.check : kind === 'bad' ? ICON.cross : ICON.ear}</span>`; }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
