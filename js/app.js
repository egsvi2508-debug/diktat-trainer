'use strict';
/* ============================================================
   App shell: header, tabs, keyboard, language, theme
   ============================================================ */
const App = {
  hearInput: store.get('hearInput', false),
  active: null,
  list: [
    { ex: ExInt, hash: 'intervalle', tab: 'tabInt' },
    { ex: ExLex, hash: 'rhythmus', tab: 'tabLex' },
    { ex: ExMel, hash: 'melodie', tab: 'tabMel' },
    { ex: ExSec, hash: 'sekunden', tab: 'tabSec' },
    { ex: ExTer, hash: 'terzen', tab: 'tabTer' },
    { ex: ExHar, hash: 'harmonie', tab: 'tabHar' }
  ],

  init() {
    document.documentElement.lang = LANG;
    if (!window.Vex || !window.Vex.Flow) {
      $('#panels').append(el('p', { class: 'feedback fb-bad' }, t('noVex')));
      return;
    }
    this.list.forEach(it => {
      it.ex.root = el('section', { class: 'panel', id: 'p-' + it.hash, role: 'tabpanel', 'aria-labelledby': 't-' + it.hash, hidden: true });
      $('#panels').append(it.ex.root);
    });
    this.buildChrome();
    const h = (location.hash || '').slice(1);
    const start = this.list.find(it => it.hash === h) || this.list.find(it => it.hash === store.get('tab')) || this.list[0];
    this.show(start.hash);
    window.addEventListener('hashchange', () => {
      const it = this.list.find(x => x.hash === location.hash.slice(1));
      if (it && it.ex !== this.active) this.show(it.hash);
    });

    document.addEventListener('keydown', e => {
      const tg = e.target;
      if (tg && tg.closest && tg.closest('input[type=range], input[type=text], textarea, select')) return;
      if ((e.key === ' ' || e.key === 'Enter') && tg && tg.closest && tg.closest('button, summary, input, a, label, [role=button]')) return;
      if (document.querySelector('dialog[open]')) return;
      const ex = this.active;
      if (ex && ex.onKey && ex.onKey(e)) e.preventDefault();
    });
    // mouse/touch clicks should not leave focus on a button, so Space/Enter stay shortcuts
    document.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('button');
      if (b && e.detail > 0) b.blur();
    });
    const rerender = () => {
      const ex = this.active;
      if (ex && ex.render) ex.render();
      if (ex && ex.renderSolution) ex.renderSolution();
    };
    try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', rerender); } catch (e) { /* old browser */ }
    new MutationObserver(rerender).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(rerender);
  },

  buildChrome() {
    // tabs
    const tabs = $('#tabs');
    tabs.innerHTML = '';
    this.list.forEach(it => {
      const b = el('button', { type: 'button', class: 'tab', role: 'tab', id: 't-' + it.hash, 'aria-controls': 'p-' + it.hash, 'aria-selected': 'false' },
        el('span', { class: 'n' }, it.ex.no), el('span', {}, t(it.tab)));
      b.addEventListener('click', () => this.show(it.hash));
      tabs.append(b);
    });
    tabs.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const i = this.list.findIndex(it => it.ex === this.active);
      const j = mod(i + (e.key === 'ArrowRight' ? 1 : -1), this.list.length);
      this.show(this.list[j].hash);
      $('#t-' + this.list[j].hash).focus();
      e.stopPropagation(); e.preventDefault();
    });
    // header: quick language switch + one menu for everything global
    const g = $('#gctl');
    g.innerHTML = '';
    const other = LANG === 'de' ? 'en' : 'de';
    g.append(
      el('button', { type: 'button', class: 'icon-btn lang-btn', title: t('langLbl'), 'aria-label': t('langLbl') + ': ' + other.toUpperCase(), onclick: () => this.setLang(other) }, other.toUpperCase()),
      iconBtn(ICON.menu, 'menu', () => this.menu.open(), 'icon-btn-lg'));
    if (this.menu) this.menu.d.remove();
    this.menu = makeDialog(t('menu'));
    const vol = sliderControl('g-vol', 'volume', 0, 1, 0.05, Sound.volume, v => Math.round(v * 100) + ' %', v => Sound.setVolume(v));
    const hear = toggleControl('g-hear', 'hearInput', this.hearInput, v => { this.hearInput = v; store.set('hearInput', v); });
    const reset = el('button', { type: 'button', class: 'btn btn-sec btn-sm' }, t('resetStats'));
    reset.addEventListener('click', () => {
      if (reset.dataset.armed) {
        try { Object.keys(localStorage).filter(k => k.startsWith('sdt:stats:')).forEach(k => localStorage.removeItem(k)); } catch (e) { /* blocked */ }
        reset.textContent = t('resetDone'); delete reset.dataset.armed;
        const ex = this.active; if (ex && ex.render) ex.render();
        return;
      }
      reset.dataset.armed = '1'; reset.textContent = t('resetConfirm');
      setTimeout(() => { if (reset.dataset.armed) { delete reset.dataset.armed; reset.textContent = t('resetStats'); } }, 4000);
    });
    const keys = el('dl', { class: 'keys' });
    t('keysList').split('|').forEach(line => { const [k, v] = line.split('='); keys.append(el('dt', {}, k), el('dd', {}, v)); });
    this.menu.body.append(
      segControl('g-lang', 'langLbl', [['de', 'Deutsch'], ['en', 'English']], LANG, v => { this.menu.d.close(); this.setLang(v); }),
      vol,
      toggleGroup('sound', hear, el('p', { class: 'hint' }, t('hearInputTip'))),
      el('div', { class: 'field keys-field' }, el('span', { class: 'field-lbl' }, t('keysTitle')), keys),
      el('div', { class: 'field' }, el('span', { class: 'field-lbl' }, t('statsTitle')), el('div', { class: 'row' }, reset)),
      el('div', { class: 'field about' }, el('span', { class: 'field-lbl' }, t('aboutTitle')), el('p', { class: 'hint' }, t('footer')), el('p', { class: 'hint' }, t('credits')))
    );
    $$('[data-i18n]').forEach(n => { n.textContent = t(n.dataset.i18n); });
  },

  show(hash) {
    const it = this.list.find(x => x.hash === hash) || this.list[0];
    Sound.stop();
    this.list.forEach(x => {
      x.ex.root.hidden = x !== it;
      const tb = $('#t-' + x.hash);
      if (tb) { tb.setAttribute('aria-selected', String(x === it)); tb.tabIndex = x === it ? 0 : -1; }
    });
    this.active = it.ex;
    if (!it.built) { it.built = true; it.ex.build(); }
    else {
      if (it.ex.render) it.ex.render();
      if (it.ex.renderSolution) it.ex.renderSolution();
    }
    const tb = $('#t-' + it.hash);
    if (tb && tb.scrollIntoView) tb.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    store.set('tab', it.hash);
    try { history.replaceState(null, '', '#' + it.hash); } catch (e) { /* sandboxed */ }
  },

  setLang(l) {
    if (l === LANG) return;
    LANG = l;
    store.set('lang', l);
    document.documentElement.lang = l;
    this.buildChrome();
    const cur = this.list.find(x => x.ex === this.active);
    this.list.forEach(x => { if (x.built) { if (x === cur) x.ex.build(); else x.built = false; } });
    this.show(cur.hash);
  }
};

App.init();
