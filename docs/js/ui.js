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
  return el('label', { class: 'field toggle', for: id }, inp, el('span', { class: 'sw', 'aria-hidden': 'true' }), el('span', { class: 'toggle-lbl' }, t(labelKey)));
}
function sliderControl(id, labelKey, min, max, step, value, fmt, onChange) {
  const out = el('output', { for: id, class: 'field-val' }, fmt(value));
  const inp = el('input', { type: 'range', id, min, max, step, value });
  inp.addEventListener('input', () => { out.textContent = fmt(+inp.value); onChange(+inp.value); });
  return el('div', { class: 'field field-range' }, el('label', { class: 'field-lbl', for: id }, t(labelKey), out), inp);
}
function btn(labelKey, icon, onClick, cls = 'btn-sec', id) {
  return el('button', { type: 'button', class: 'btn ' + cls, onclick: onClick, id },
    icon ? el('span', { class: 'ico', html: icon }) : null, el('span', { class: 'lbl' }, t(labelKey)));
}
function chip(text, cls = '') { return el('span', { class: 'chip ' + cls }, text); }

function panelShell(ex) {
  const root = ex.root;
  root.innerHTML = '';
  const settingsBody = el('div', { class: 'set-grid' });
  const det = el('details', { class: 'settings' },
    el('summary', {}, el('span', { class: 'sum-ico', html: ICON.sliders }), t('settings')),
    settingsBody);
  if (store.get('open:' + ex.id, false)) det.open = true;
  det.addEventListener('toggle', () => store.set('open:' + ex.id, det.open));
  const parts = {
    head: el('div', { class: 'panel-head' },
      el('span', { class: 'ph-num', 'aria-hidden': 'true' }, ex.no),
      el('div', { class: 'ph-text' }, el('h2', {}, t(ex.titleKey)), el('p', { class: 'ph-desc' }, t(ex.descKey)))),
    settingsBody,
    details: det,
    taskbar: el('div', { class: 'taskbar' }),
    score: el('div', { class: 'score', tabindex: '0', 'aria-label': t('scoreLabel') }),
    controls: el('div', { class: 'controls' }),
    feedback: el('div', { class: 'feedback', role: 'status', hidden: true }),
    stats: el('p', { class: 'stats' })
  };
  parts.sheet = el('div', { class: 'sheet' }, parts.score);
  root.append(parts.head, det, parts.taskbar, parts.sheet, parts.controls, parts.feedback, parts.stats);
  return parts;
}
function setFeedback(box, kind, html) {
  box.className = 'feedback fb-' + kind;
  box.innerHTML = html || '';
  box.hidden = !html;
}
function fbIcon(kind) { return `<span class="fb-ico">${kind === 'ok' ? ICON.check : kind === 'bad' ? ICON.cross : ICON.ear}</span>`; }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
