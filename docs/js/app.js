'use strict';
/* ============================================================
   App shell: header, tabs, keyboard, language, theme
   ============================================================ */
const App = {
  hearInput: store.get('hearInput', false),
  active: null,
  hash: null,
  unit: null,
  // two units, each with its own page
  units: [
    { id: 'e1', hash: 'einheit-1', label: 'navE1', title: 'unit1', desc: 'unit1Desc', icon: 'unit1' },
    { id: 'e2', hash: 'einheit-2', label: 'navE2', title: 'unit2', desc: 'unit2Desc', icon: 'unit2' }
  ],
  // every exercise: its screen, unit, group (one group shares the switch at the top), tile and card
  list: [
    { ex: ExInt, hash: 'intervalle', unit: 'e1', nav: 'int', short: 'tabInt', card: 'cardInt', icon: 'interval', tint: 'blue' },
    { ex: ExLex, hash: 'rhythmus', unit: 'e1', nav: 'mel', short: 'tabLex', card: 'cardLex', icon: 'rhythm', tint: 'lilac', sub: 'subLex' },
    { ex: ExMel, hash: 'melodie', unit: 'e1', nav: 'mel', short: 'tabMel', card: 'cardMel', icon: 'melody', tint: 'sky', sub: 'subMel' },
    { ex: ExSec, hash: 'sekunden', unit: 'e1', nav: 'flug', short: 'tabSec', card: 'cardSec', icon: 'seconds', tint: 'sand', sub: 'subSec' },
    { ex: ExTer, hash: 'terzen', unit: 'e1', nav: 'flug', short: 'tabTer', card: 'cardTer', icon: 'thirds', tint: 'steel', sub: 'subTer' },
    { ex: ExHar, hash: 'harmonie', unit: 'e1', nav: 'har', short: 'tabHar', card: 'cardHar', icon: 'harmony', tint: 'mint' },
    { ex: ExModeSing, hash: 'modi-singen', unit: 'e2', nav: 'modi', short: 'tabMs', card: 'cardMs', icon: 'mic', tint: 'lilac', sub: 'subMs' },
    { ex: ExModeDict, hash: 'modi-diktat', unit: 'e2', nav: 'modi', short: 'tabMd', card: 'cardMd', icon: 'melody', tint: 'sky', sub: 'subMd' },
    { ex: ExModePat, hash: 'modi-muster', unit: 'e2', nav: 'modi', short: 'tabMp', card: 'cardMp', icon: 'pattern', tint: 'steel', sub: 'subMp' },
    { ex: ExBlatt, hash: 'blattsingen', unit: 'e2', nav: 'blatt', short: 'tabBl', card: 'cardBl', icon: 'sheet', tint: 'sand' },
    { ex: ExTwo, hash: 'zweistimmig', unit: 'e2', nav: 'zwei', short: 'tabTw', card: 'cardTw', icon: 'duo', tint: 'mint' },
    { ex: ExCtxNote, hash: 'kontext-ton', unit: 'e2', nav: 'ctx', short: 'tabCxNote', card: 'cardCxNote', icon: 'context', tint: 'blue', sub: 'subCxNote' },
    { ex: ExCtxIv, hash: 'kontext-zweiklang', unit: 'e2', nav: 'ctx', short: 'tabCxIv', card: 'cardCxIv', icon: 'context', tint: 'lilac', sub: 'subCxIv' },
    { ex: ExCtxTri, hash: 'kontext-dreiklang', unit: 'e2', nav: 'ctx', short: 'tabCxTri', card: 'cardCxTri', icon: 'context', tint: 'sky', sub: 'subCxTri' }
  ],
  // header title of each group
  groups: { int: 'navInt', mel: 'navMel', flug: 'navFlug', har: 'navHar', modi: 'navModi', blatt: 'navBlatt', zwei: 'navZwei', ctx: 'navCtx' },
  // bottom bar: start and the two units
  navs: [
    { id: 'start', icon: 'home', label: 'navHome' },
    { id: 'e1', icon: 'unit1', label: 'navE1' },
    { id: 'e2', icon: 'unit2', label: 'navE2' }
  ],

  init() {
    document.documentElement.lang = LANG;
    if (!window.Vex || !window.Vex.Flow) {
      $('#panels').append(el('p', { class: 'feedback fb-bad' }, t('noVex')));
      return;
    }
    this.home = el('section', { class: 'home', id: 'p-start', hidden: true });
    this.unitEl = el('section', { class: 'home unit-page', id: 'p-unit', hidden: true });
    $('#panels').append(this.home, this.unitEl);
    this.list.forEach(it => {
      it.ex.root = el('section', { class: 'panel', id: 'p-' + it.hash, hidden: true });
      $('#panels').append(it.ex.root);
    });
    this.buildChrome();
    // the install signal is caught by a tiny script at the very top of the page (see build_webapp.py)
    if (!('__installPrompt' in window)) { window.__installPrompt = null; addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__installPrompt = e; document.dispatchEvent(new Event('installready')); }); }
    window.addEventListener('appinstalled', () => { window.__installPrompt = null; store.set('installHide', true); if (!this.active) this.renderHome(); });
    Backend.appStarted();
    const known = h => h === 'start' || this.list.some(it => it.hash === h) || this.units.some(u => u.hash === h);
    const h = (location.hash || '').slice(1);
    this.show(known(h) ? h : 'start');
    window.addEventListener('hashchange', () => {
      const hh = location.hash.slice(1);
      if (hh !== this.hash && known(hh)) this.show(hh);
    });
    // leaving the app (other tab, phone locked): stop the microphone and any running question
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.active && this.active.onHide) this.active.onHide(); });

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

  /* ---------- "install as app" card ----------
     Android / Chrome / Edge: the button opens the browser's real install dialog.
     iPhone / iPad: Apple lets no website install itself, so the button opens a two-step guide. */
  installCard() {
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (standalone || location.protocol !== 'https:' && location.hostname !== 'localhost' || store.get('installHide', false)) return '';
    const go = btn('installBtn', ICON.down, () => this.install(), 'btn-play install-btn');
    const close = iconBtn(ICON.cross, 'close', () => { store.set('installHide', true); this.renderHome(); }, 'icon-btn-sm install-x');
    return el('div', { class: 'card install' },
      el('img', { class: 'install-ico', src: 'icons/icon-192.png', alt: '', width: 48, height: 48 }),
      el('div', { class: 'install-txt' }, el('h3', {}, t('installTitle')), el('p', {}, t('installLead'))),
      go, close);
  },
  async install() {
    const prompt = () => {
      const pr = window.__installPrompt;
      window.__installPrompt = null;
      pr.prompt();
      pr.userChoice.then(c => { if (c && c.outcome === 'accepted') { store.set('installHide', true); this.renderHome(); } }).catch(() => {});
    };
    if (window.__installPrompt) { prompt(); return; }
    const ua = navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!iOS) {
      // the browser may still be getting ready – wait a moment for it
      const ready = await new Promise(res => { const tm = setTimeout(() => res(false), 2500); document.addEventListener('installready', () => { clearTimeout(tm); res(true); }, { once: true }); });
      if (ready && window.__installPrompt) { prompt(); return; }
    }
    this.installGuide(iOS, ua);
  },
  installGuide(iOS, ua) {
    const inApp = /Instagram|FBAN|FBAV|WhatsApp|Line\/|Snapchat|TikTok/i.test(ua);
    const iosOther = iOS && (/CriOS|FxiOS|EdgiOS/.test(ua) || inApp);
    if (this.guide) this.guide.d.remove();
    const g = this.guide = makeDialog(t('installTitle'));
    const step = (n, html) => el('li', { class: 'guide-step' }, el('span', { class: 'guide-n' }, String(n)), el('span', { html }));
    const steps = iOS
      ? [iosOther ? step(1, t('guideIosSafari')) : null, step(iosOther ? 2 : 1, t('guideIosShare')), step(iosOther ? 3 : 2, t('guideIosAdd'))].filter(Boolean)
      : [inApp ? step(1, t('guideOpenChrome')) : null, step(inApp ? 2 : 1, t('guideMenu')), step(inApp ? 3 : 2, t('guideMenuAdd'))].filter(Boolean);
    g.body.append(el('ol', { class: 'guide' }, steps), el('p', { class: 'hint' }, t(iOS ? 'guideIosWhy' : 'guideDone')));
    g.open();
  },

  /* ---------- start screen: both units with their exercises as tiles ---------- */
  renderHome() {
    const go = hash => () => this.show(hash);
    const unitBlock = u => {
      const tiles = el('div', { class: 'tiles' }, this.list.filter(it => it.unit === u.id).map(it =>
        el('button', { type: 'button', class: 'tile t-' + it.tint, onclick: go(it.hash) },
          el('span', { class: 'tile-ico', html: ICON[it.icon] }), el('span', {}, t(it.short)))));
      return [el('div', { class: 'sec-h' }, el('h2', {}, t(u.title)),
        el('button', { type: 'button', class: 'linkish', onclick: go(u.hash) }, t('unitAll'))), tiles];
    };
    const paper = el('div', { class: 'card paper-tip' },
      el('span', { class: 'paper-ico', html: ICON.pencil }),
      el('p', {}, el('b', {}, t('paperTitle')), ' ', t('paperText')));
    const fb = Backend.on() ? el('button', { type: 'button', class: 'card feedback-card', onclick: () => this.openFeedback() },
      el('span', { class: 'paper-ico fb-tint', html: ICON.chat }),
      el('span', {}, el('b', {}, t('fbCardTitle')), el('span', { class: 'fb-card-sub' }, t('fbCardText'))),
      el('span', { class: 'circle', html: ICON.right })) : '';
    this.home.replaceChildren(
      paper,
      this.installCard(),
      ...this.units.flatMap(unitBlock),
      fb ? el('div', { class: 'sec-h' }, el('h2', {}, t('fbSection'))) : '', fb);
  },
  /* ---------- a unit's page: all its exercises as cards ---------- */
  renderUnit(u) {
    const cards = el('div', { class: 'list' }, this.list.filter(it => it.unit === u.id).map(it =>
      el('button', { type: 'button', class: 'card lcard', onclick: () => this.show(it.hash) },
        el('span', { class: 'thumb t-' + it.tint, html: ICON[it.icon] }),
        el('span', {}, el('h3', {}, t(it.ex.titleKey)), el('p', {}, t(it.card))),
        el('span', { class: 'circle', html: ICON.right }))));
    this.unitEl.replaceChildren(el('p', { class: 'unit-intro' }, t(u.title + 'Intro')), cards);
  },

  /* ---------- header + sub-switch for the current screen ---------- */
  renderBar() {
    const bar = $('#appbar');
    const gear = iconBtn(ICON.gear, 'settings', () => this.openSettings(), 'icon-btn-lg');
    const cur = this.list.find(it => it.ex === this.active);
    if (cur) {
      const u = this.units.find(x => x.id === cur.unit);
      bar.replaceChildren(iconBtn(ICON.left, 'back', () => this.show(u.hash), 'icon-btn-lg'),
        el('div', { class: 'appbar-text' }, el('h1', {}, t(this.groups[cur.nav])), el('p', {}, t(this.active.descKey))), gear);
    } else if (this.unit) {
      bar.replaceChildren(iconBtn(ICON.left, 'back', () => this.show('start'), 'icon-btn-lg'),
        el('div', { class: 'appbar-text' }, el('h1', {}, t(this.unit.title)), el('p', {}, t(this.unit.desc))), gear);
    } else {
      bar.replaceChildren(el('span', { class: 'logo-chip', html: ICON.interval }),
        el('div', { class: 'appbar-text' }, el('h1', {}, t('greet')), el('p', {}, t('greetSub'))), gear);
    }
    const sub = $('#subtabs');
    const sibs = cur ? this.list.filter(it => it.nav === cur.nav) : [];
    sub.hidden = sibs.length < 2;
    sub.replaceChildren(...(sibs.length < 2 ? [] : sibs.map(it =>
      el('button', { type: 'button', class: 'subtab', role: 'tab', 'aria-selected': String(it === cur), onclick: () => this.show(it.hash) }, t(it.sub)))));
    $$('.nav-b', $('#tabs')).forEach(b => b.setAttribute('aria-selected', String(b.dataset.nav === (this.unit ? this.unit.id : 'start'))));
  },

  buildChrome() {
    // bottom bar
    const tabs = $('#tabs');
    tabs.replaceChildren(...this.navs.map(n => {
      const b = el('button', { type: 'button', class: 'nav-b', role: 'tab', 'data-nav': n.id, 'aria-selected': 'false' },
        el('span', { class: 'ico', html: ICON[n.icon] }), el('span', {}, t(n.label)));
      b.addEventListener('click', () => this.show(n.id === 'start' ? 'start' : this.units.find(u => u.id === n.id).hash));
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
      Backend.on() ? el('div', { class: 'field' }, el('span', { class: 'field-lbl' }, t('fbSection')),
        el('div', { class: 'row' }, btn('fbCardTitle', ICON.chat, () => { this.menu.d.close(); this.openFeedback(); }, 'btn-sec btn-sm'))) : '',
      Backend.on() ? toggleGroup('privacy', toggleControl('g-stats', 'statsShare', store.get('shareStats', true), v => store.set('shareStats', v)),
        el('p', { class: 'hint' }, t('statsShareInfo'))) : '',
      el('div', { class: 'field keys-field' }, el('span', { class: 'field-lbl' }, t('keysTitle')), keys),
      el('div', { class: 'field about' }, el('span', { class: 'field-lbl' }, t('aboutTitle')), el('p', { class: 'hint' }, t('footer')), el('p', { class: 'hint' }, t('credits')))
    );
    $$('[data-i18n]').forEach(n => { n.textContent = t(n.dataset.i18n); });
  },

  /* feedback: idea / bug / praise + text, sent anonymously */
  openFeedback() {
    if (this.fbDlg) this.fbDlg.d.remove();
    const g = this.fbDlg = makeDialog(t('fbTitle'));
    let type = 'idea';
    const ta = el('textarea', { id: 'fb-text', rows: '6', maxlength: '2000', placeholder: t('fbPlaceholder'), class: 'fb-text' });
    const status = el('p', { class: 'hint fb-status', role: 'status' });
    const cur = this.active ? this.active.id : '';
    ta.addEventListener('input', () => { if (status.textContent === t('fbEmpty')) status.textContent = ''; });
    g.body.append(
      el('p', { class: 'hint' }, t('fbIntro')),
      segControl('fb-type', 'fbType', [['idea', t('fbIdea')], ['bug', t('fbBug')], ['praise', t('fbPraise')]], type, v => { type = v; }),
      el('div', { class: 'field' }, el('label', { class: 'field-lbl', for: 'fb-text' }, t('fbText')), ta),
      el('p', { class: 'hint' }, t('fbAnon')), status);
    const send = btn('fbSend', ICON.next, null, 'btn-ink');
    $('.dlg-foot', g.d).replaceChildren(send);
    send.onclick = async () => {
      const text = ta.value.trim();
      if (!text) { status.textContent = t('fbEmpty'); ta.focus(); return; }
      send.disabled = true; status.textContent = t('fbSending');
      try {
        await Backend.sendFeedback({ type, text, exercise: cur });
        g.body.replaceChildren(el('div', { class: 'fb-done' }, el('span', { class: 'fb-done-ico', html: ICON.check }), el('h4', {}, t('fbThanks')), el('p', { class: 'hint' }, t('fbThanksText'))));
        $('.lbl', send).textContent = t('done'); $('.ico', send).innerHTML = ICON.check;
        send.disabled = false; send.onclick = () => g.d.close();
      } catch (err) {
        send.disabled = false; status.textContent = t('fbError');
      }
    };
    g.open();
    setTimeout(() => ta.focus(), 50);
  },

  openSettings() {
    const ex = this.active;
    this.exSection.replaceChildren(...(ex ? [el('h4', { class: 'set-h' }, t(ex.titleKey)), ex.P ? ex.P.settingsBody : ''] : []));
    this.menu.open();
  },

  show(hash) {
    Sound.stop();
    const it = this.list.find(x => x.hash === hash);
    const unit = it ? null : this.units.find(u => u.hash === hash) || null;
    if (this.active && (!it || it.ex !== this.active) && this.active.onHide) this.active.onHide();
    this.hash = it ? it.hash : unit ? unit.hash : 'start';
    this.home.hidden = !!(it || unit);
    this.unitEl.hidden = !unit;
    this.list.forEach(x => { x.ex.root.hidden = x !== it; });
    this.active = it ? it.ex : null;
    this.unit = unit || (it ? this.units.find(u => u.id === it.unit) : null);
    this.renderBar();
    if (unit) this.renderUnit(unit);
    else if (!it) this.renderHome();
    else {
      if (!it.built) { it.built = true; it.ex.build(); }
      else if (it.ex.stale) {
        it.ex.stale = false;
        it.ex.newTask();
        setFeedback(it.ex.P.feedback, 'info', fbIcon('info') + `<span>${esc(t('newWithGroups'))}</span>`);
      } else {
        if (it.ex.render) it.ex.render();
        if (it.ex.renderSolution) it.ex.renderSolution();
      }
      if (it.ex.stale) it.ex.stale = false;
      store.set('tab', it.hash);
      store.set('last:' + it.nav, it.hash);
      if (it.ex === ExMel && !store.get('howMelHide', false)) ExMel.showHow();
      else if (it.ex.how && !it.ex.howSeen && !store.get('how:' + it.ex.id, false)) { it.ex.howSeen = true; howDialog(it.ex); }
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
