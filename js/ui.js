'use strict';
/* ============================================================
   UI building blocks shared by the exercise panels
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

/* modal sheet (bottom sheet on phones, card on desktop) */
function makeDialog(title) {
  const body = el('div', { class: 'dlg-body' });
  const d = el('dialog', { class: 'dlg' },
    el('div', { class: 'dlg-head' }, el('h3', {}, title), iconBtn(ICON.cross, 'close', () => d.close())),
    body,
    el('div', { class: 'dlg-foot' }, btn('done', ICON.check, () => d.close(), 'btn-ink')));
  d.addEventListener('click', e => { if (e.target === d) d.close(); });
  document.body.append(d);
  return { d, body, open: () => { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); } };
}

/* one button that is "Check" before and "Next" after checking */
function actionButton(ex) {
  const b = btn('check', ICON.check, () => { if (ex.checked) ex.newTask(true); else ex.check(); }, 'btn-ink btn-action');
  b.sync = checked => {
    $('.lbl', b).textContent = t(checked ? 'nextTask' : 'check');
    $('.ico', b).innerHTML = checked ? ICON.next : ICON.check;
    b.classList.toggle('btn-play', checked);
    b.classList.toggle('btn-ink', !checked);
  };
  return b;
}

function panelShell(ex) {
  const root = ex.root;
  root.innerHTML = '';
  if (ex.dlg) ex.dlg.d.remove();
  ex.dlg = makeDialog(t('settings') + ' · ' + t(ex.titleKey));
  const P = {
    settingsBody: ex.dlg.body,
    taskbar: el('div', { class: 'taskbar' }),
    score: el('div', { class: 'score', tabindex: '0', 'aria-label': t('scoreLabel') }),
    transport: el('div', { class: 'row transport' }),
    edit: el('div', { class: 'row editrow' }),
    feedback: el('div', { class: 'feedback', role: 'status', hidden: true }),
    solHost: el('div', { class: 'score' })
  };
  P.head = el('div', { class: 'panel-head' },
    el('span', { class: 'ph-num', 'aria-hidden': 'true' }, ex.no),
    el('div', { class: 'ph-text' }, el('h2', {}, t(ex.titleKey)), el('p', { class: 'ph-desc' }, t(ex.descKey))),
    iconBtn(ICON.sliders, 'settings', () => ex.dlg.open(), 'icon-btn-lg'));
  P.sheet = el('div', { class: 'sheet' }, P.score);
  P.solWrap = el('div', { class: 'sol-wrap', hidden: true }, el('h3', { class: 'sol-h' }, t('solution')), el('div', { class: 'sheet' }, P.solHost));
  root.append(P.head, P.taskbar, P.sheet, P.transport, P.edit, P.feedback, P.solWrap);
  return P;
}
/* the editing row: pitch strip on the left, "show solution" + Check/Next on the right */
function editRow(ex, P, toolbarOpts) {
  ex.tb = toolbarOpts === false ? null : pitchToolbar(ex, toolbarOpts);
  ex.solBtn = iconBtn(ICON.eye, 'showSolution', () => ex.reveal(), 'icon-btn-lg');
  ex.actBtn = actionButton(ex);
  P.edit.append(ex.tb || '', el('span', { class: 'spacer' }), ex.solBtn, ex.actBtn);
}
function syncEditRow(ex) {
  ex.actBtn.sync(ex.checked);
  ex.solBtn.hidden = ex.checked;
  if (ex.tb) ex.tb.classList.toggle('dim', ex.checked);
}
function statChip(id) {
  const s = store.get('stats:' + id, { n: 0, sum: 0 });
  if (!s.n) return '';
  return el('span', { class: 'chip chip-muted', title: statText(id) }, t('statChip', { avg: Math.round(s.sum / s.n), n: s.n }));
}
function setFeedback(box, kind, html) {
  box.className = 'feedback fb-' + kind;
  box.innerHTML = html || '';
  box.hidden = !html;
}
function fbIcon(kind) { return `<span class="fb-ico">${kind === 'ok' ? ICON.check : kind === 'bad' ? ICON.cross : ICON.ear}</span>`; }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
