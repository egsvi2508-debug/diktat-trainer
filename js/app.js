'use strict';
/* ============================================================
   App shell: header, tabs, keyboard, language, theme
   ============================================================ */
const App = {
  hearInput: store.get('hearInput', false),
  active: null,
  hash: null,
  // every exercise: its screen, start-screen tile and list card
  list: [
    { ex: ExInt, hash: 'intervalle', nav: 'int', short: 'tabInt', card: 'cardInt', icon: 'interval', tint: 'blue' },
    { ex: ExLex, hash: 'rhythmus', nav: 'mel', short: 'tabLex', card: 'cardLex', icon: 'rhythm', tint: 'lilac', sub: 'subLex' },
    { ex: ExMel, hash: 'melodie', nav: 'mel', short: 'tabMel', card: 'cardMel', icon: 'melody', tint: 'sky', sub: 'subMel' },
    { ex: ExSec, hash: 'sekunden', nav: 'flug', short: 'tabSec', card: 'cardSec', icon: 'seconds', tint: 'sand', sub: 'subSec' },
    { ex: ExTer, hash: 'terzen', nav: 'flug', short: 'tabTer', card: 'cardTer', icon: 'thirds', tint: 'steel', sub: 'subTer' },
    { ex: ExHar, hash: 'harmonie', nav: 'har', short: 'tabHar', card: 'cardHar', icon: 'harmony', tint: 'mint' }
  ],
  // bottom bar: five places; Melodie and Im Flug each hold two exercises
  navs: [
    { id: 'start', icon: 'home', label: 'navHome' },
    { id: 'int', icon: 'interval', label: 'navInt' },
    { id: 'mel', icon: 'melody', label: 'navMel' },
    { id: 'flug', icon: 'flight', label: 'navFlug' },
    { id: 'har', icon: 'harmony', label: 'navHar' }
  ],

  init() {
    document.documentElement.lang = LANG;
    if (!window.Vex || !window.Vex.Flow) {
      $('#panels').append(el('p', { class: 'feedback fb-bad' }, t('noVex')));
      return;
    }
    this.home = el('section', { class: 'home', id: 'p-start', hidden: true });
    $('#panels').append(this.home);
    this.list.forEach(it => {
      it.ex.root = el('section', { class: 'panel', id: 'p-' + it.hash, hidden: true });
      $('#panels').append(it.ex.root);
    });
    this.buildChrome();
    // Android / Chrome / Edge: keep the browser's install prompt for our own button
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); this.installPrompt = e; if (!this.active) this.renderHome(); });
    window.addEventListener('appinstalled', () => { this.installPrompt = null; store.set('installHide', true); if (!this.active) this.renderHome(); });
    const h = (location.hash || '').slice(1);
    this.show(h === 'start' || this.list.some(it => it.hash === h) ? h : 'start');
    window.addEventListener('hashchange', () => {
      const hh = location.hash.slice(1);
      if (hh !== this.hash && (hh === 'start' || this.list.some(it => it.hash === hh))) this.show(hh);
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

  /* ---------- "install as app" card ---------- */
  installPrompt: null,
  installCard() {
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (standalone || location.protocol !== 'https:' && location.hostname !== 'localhost' || store.get('installHide', false)) return '';
    const ua = navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const inApp = /Instagram|FBAN|FBAV|WhatsApp|Line\/|Snapchat|TikTok/i.test(ua);
    const iosSafari = iOS && !/CriOS|FxiOS|EdgiOS/.test(ua) && !inApp;
    let body, action = null;
    if (this.installPrompt) {
      body = t('installAndroid');
      action = btn('installBtn', ICON.down, async () => {
        const pr = this.installPrompt; this.installPrompt = null;
        pr.prompt();
        try { await pr.userChoice; } catch (e) { /* dismissed */ }
        this.renderHome();
      }, 'btn-play btn-sm');
    } else if (iosSafari) body = t('installIOS');
    else if (iOS) body = t('installIOSOther');
    else body = t('installOther');
    const close = iconBtn(ICON.cross, 'close', () => { store.set('installHide', true); this.renderHome(); }, 'icon-btn-sm install-x');
    return el('div', { class: 'card install' },
      el('img', { class: 'install-ico', src: 'icons/icon-192.png', alt: '', width: 48, height: 48 }),
      el('div', { class: 'install-txt' }, el('h3', {}, t('installTitle')), el('p', { html: body })),
      action, close);
  },

  /* ---------- start screen ---------- */
  renderHome() {
    const go = hash => () => this.show(hash);
    const tiles = el('div', { class: 'tiles' }, this.list.map(it =>
      el('button', { type: 'button', class: 'tile t-' + it.tint, onclick: go(it.hash) },
        el('span', { class: 'tile-ico', html: ICON[it.icon] }), el('span', {}, t(it.short)))));
    const cards = el('div', { class: 'list' }, this.list.map(it => {
      return el('button', { type: 'button', class: 'card lcard', onclick: go(it.hash) },
        el('span', { class: 'thumb t-' + it.tint, html: ICON[it.icon] }),
        el('span', {}, el('h3', {}, t(it.ex.titleKey)), el('p', {}, t(it.card))),
        el('span', { class: 'circle', html: ICON.right }));
    }));
    this.home.replaceChildren(
      this.installCard(),
      el('div', { class: 'sec-h' }, el('h2', {}, t('secExercises'))), tiles,
      el('div', { class: 'sec-h' }, el('h2', {}, t('secAll'))), cards);
  },

  /* ---------- header + sub-switch for the current screen ---------- */
  renderBar() {
    const bar = $('#appbar');
    const gear = iconBtn(ICON.gear, 'settings', () => this.openSettings(), 'icon-btn-lg');
    if (!this.active) {
      bar.replaceChildren(el('span', { class: 'logo-chip', html: ICON.interval }),
        el('div', { class: 'appbar-text' }, el('h1', {}, t('greet')), el('p', {}, t('greetSub'))), gear);
    } else {
      bar.replaceChildren(iconBtn(ICON.left, 'back', () => this.show('start'), 'icon-btn-lg'),
        el('div', { class: 'appbar-text' }, el('h1', {}, t(this.navs.find(n => n.id === this.list.find(it => it.ex === this.active).nav).label)), el('p', {}, t(this.active.descKey))), gear);
    }
    const sub = $('#subtabs');
    const cur = this.list.find(it => it.ex === this.active);
    const sibs = cur ? this.list.filter(it => it.nav === cur.nav) : [];
    sub.hidden = sibs.length < 2;
    sub.replaceChildren(...(sibs.length < 2 ? [] : sibs.map(it =>
      el('button', { type: 'button', class: 'subtab', role: 'tab', 'aria-selected': String(it === cur), onclick: () => this.show(it.hash) }, t(it.sub)))));
    $$('.nav-b', $('#tabs')).forEach(b => b.setAttribute('aria-selected', String(b.dataset.nav === (cur ? cur.nav : 'start'))));
  },

  buildChrome() {
    // bottom bar
    const tabs = $('#tabs');
    tabs.replaceChildren(...this.navs.map(n => {
      const b = el('button', { type: 'button', class: 'nav-b', role: 'tab', 'data-nav': n.id, 'aria-selected': 'false' },
        el('span', { class: 'ico', html: ICON[n.icon] }), el('span', {}, t(n.label)));
      b.addEventListener('click', () => {
        if (n.id === 'start') { this.show('start'); return; }
        const last = store.get('last:' + n.id);
        const it = this.list.find(x => x.nav === n.id && x.hash === last) || this.list.find(x => x.nav === n.id);
        this.show(it.hash);
      });
      return b;
    }));
    // header: quick language switch + one menu for everything global
    if (this.menu) this.menu.d.remove();
    this.menu = makeDialog(t('settings'));
    this.exSection = el('section', { class: 'set-sec' });
    const vol = sliderControl('g-vol', 'volume', 0, 1, 0.05, Sound.volume, v => Math.round(v * 100) + ' %', v => Sound.setVolume(v));
    const hear = toggleControl('g-hear', 'hearInput', this.hearInput, v => { this.hearInput = v; store.set('hearInput', v); });
    const keys = el('ul', { class: 'keys' });
    t('keysList').split('|').forEach(line => { const [k, v] = line.split('='); keys.append(el('li', {}, el('kbd', {}, k), el('span', {}, v))); });
    this.menu.body.append(
      this.exSection,
      el('h4', { class: 'set-h' }, t('general')),
      segControl('g-lang', 'langLbl', [['de', 'Deutsch'], ['en', 'English']], LANG, v => { this.menu.d.close(); this.setLang(v); }),
      vol,
      segControl('g-sens', 'dragSens', [[1, t('sensFine')], [2, t('sensMid')], [3, t('sensFast')]], store.get('dragSens', 2), v => store.set('dragSens', v)),
      toggleGroup('sound', hear, el('p', { class: 'hint' }, t('hearInputTip'))),
      el('div', { class: 'field keys-field' }, el('span', { class: 'field-lbl' }, t('keysTitle')), keys),
      el('div', { class: 'field about' }, el('span', { class: 'field-lbl' }, t('aboutTitle')), el('p', { class: 'hint' }, t('footer')), el('p', { class: 'hint' }, t('credits')))
    );
    $$('[data-i18n]').forEach(n => { n.textContent = t(n.dataset.i18n); });
  },

  openSettings() {
    const ex = this.active;
    this.exSection.replaceChildren(...(ex ? [el('h4', { class: 'set-h' }, t(ex.titleKey)), ex.P ? ex.P.settingsBody : ''] : []));
    this.menu.open();
  },

  show(hash) {
    Sound.stop();
    const it = this.list.find(x => x.hash === hash);
    this.hash = it ? it.hash : 'start';
    this.home.hidden = !!it;
    this.list.forEach(x => { x.ex.root.hidden = x !== it; });
    this.active = it ? it.ex : null;
    this.renderBar();
    if (!it) this.renderHome();
    else {
      if (!it.built) { it.built = true; it.ex.build(); }
      else {
        if (it.ex.render) it.ex.render();
        if (it.ex.renderSolution) it.ex.renderSolution();
      }
      store.set('tab', it.hash);
      store.set('last:' + it.nav, it.hash);
    }
    window.scrollTo(0, 0);
    try { history.replaceState(null, '', '#' + this.hash); } catch (e) { /* sandboxed */ }
  },

  setLang(l) {
    if (l === LANG) return;
    LANG = l;
    store.set('lang', l);
    document.documentElement.lang = l;
    this.buildChrome();
    this.list.forEach(x => { if (x.built) { if (x.ex === this.active) x.ex.build(); else x.built = false; } });
    this.show(this.hash);
  }
};

App.init();
