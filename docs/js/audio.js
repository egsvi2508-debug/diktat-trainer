'use strict';
/* ============================================================
   Sound: sampled grand piano (Salamander Grand Piano, A. Holm, CC BY 3.0)
   with a synthesized fallback, a wood-block metronome and gentle humanizing
   ============================================================ */
const Sound = (() => {
  const SAMPLE_BASE = 'samples/';
  const NAMES = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];
  const SAMPLE_MIDIS = [];
  for (let m = 33; m <= 96; m += 3) SAMPLE_MIDIS.push(m);           // A1 … C7, every minor third
  const sampleName = m => NAMES[m % 12] + (Math.floor(m / 12) - 1);

  let ctx = null, mix = null, master = null, noiseBuf = null, current = null, unlocked = false;
  let volume = store.get('vol', 0.8);
  const raw = {}, buffers = {};
  let loading = null, loadedMidis = [];

  /* ---------- sample loading ---------- */
  function b64ToBuf(b64) {
    const bin = atob(b64), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  }
  function prefetch() {
    if (Object.keys(raw).length) return;
    const embedded = window.PIANO_SAMPLES || null;
    SAMPLE_MIDIS.forEach(m => {
      const n = sampleName(m);
      raw[m] = embedded && embedded[n]
        ? Promise.resolve(b64ToBuf(embedded[n]))
        : fetch(SAMPLE_BASE + n + '.mp3').then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); });
      raw[m].catch(() => {});
    });
  }
  function decode(ab) { return new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)); }
  function loadSamples() {
    if (loading) return loading;
    prefetch();
    loading = Promise.allSettled(SAMPLE_MIDIS.map(m => raw[m].then(decode).then(b => { buffers[m] = b; })))
      .then(() => { loadedMidis = SAMPLE_MIDIS.filter(m => buffers[m]); });
    return loading;
  }
  const hasSamples = () => loadedMidis.length >= 8;

  /* ---------- audio graph ---------- */
  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC({ latencyHint: 'interactive' });
    master = ctx.createGain(); master.gain.value = volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 3.5;
    comp.attack.value = 0.005; comp.release.value = 0.25;
    mix = ctx.createGain();
    const verb = ctx.createConvolver(); verb.buffer = impulse(2.2, 3.6);
    const wet = ctx.createGain(); wet.gain.value = 0.12;
    mix.connect(comp); mix.connect(verb); verb.connect(wet); wet.connect(comp);
    comp.connect(master); master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.08), ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    loadSamples();
  }
  function impulse(sec, decay) {
    const len = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }
  // iPhones mute Web Audio when the ring switch is on silent unless the page plays media
  function silentWav() {
    const n = 400, buf = new Uint8Array(44 + n), dv = new DataView(buf.buffer);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) buf[o + i] = s.charCodeAt(i); };
    w(0, 'RIFF'); dv.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt ');
    dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true);
    w(36, 'data'); dv.setUint32(40, n, true); buf.fill(128, 44);
    let s = ''; buf.forEach(b => { s += String.fromCharCode(b); });
    return 'data:audio/wav;base64,' + btoa(s);
  }
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* not supported */ }
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (iOS) {
      try {
        const a = document.createElement('audio');
        a.src = silentWav(); a.loop = true; a.setAttribute('playsinline', '');
        const p = a.play(); if (p && p.catch) p.catch(() => {});
      } catch (e) { /* ignore */ }
    }
  }
  function ready() {
    init();
    if (ctx.state !== 'running') ctx.resume();
    unlock();
    return ctx;
  }

  /* ---------- instruments ---------- */
  function pianoSample(out, t, midi, dur, vel, gain) {
    let sm = loadedMidis[0];
    for (const m of loadedMidis) if (Math.abs(m - midi) < Math.abs(sm - midi)) sm = m;
    const src = ctx.createBufferSource();
    src.buffer = buffers[sm];
    src.playbackRate.value = Math.pow(2, (midi - sm) / 12);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1400 + 9000 * vel * vel; lp.Q.value = 0.4;
    const g = ctx.createGain();
    const lvl = 0.95 * gain * (0.22 + 0.78 * vel * vel);
    const off = t + Math.max(0.05, dur);
    g.gain.setValueAtTime(lvl, t);
    g.gain.setValueAtTime(lvl, off);
    g.gain.setTargetAtTime(0, off, 0.1);   // damper
    src.connect(lp); lp.connect(g); g.connect(out);
    src.start(t); src.stop(off + 1.2);
  }
  const AMPS = [1, 0.52, 0.34, 0.24, 0.16, 0.11, 0.075, 0.05, 0.035, 0.025];
  function pianoSynth(out, t, midi, dur, vel, gain) {
    const f0 = 440 * Math.pow(2, (midi - 69) / 12);
    const v = ctx.createGain(); v.connect(out);
    const peak = 0.15 * vel * gain, body = 1.15 * Math.pow(2, -(midi - 60) / 22);
    v.gain.setValueAtTime(0, t);
    v.gain.linearRampToValueAtTime(peak, t + 0.006);
    v.gain.setTargetAtTime(peak * 0.5, t + 0.006, 0.1);
    v.gain.setTargetAtTime(0.0001, t + Math.min(0.22, dur), body);
    v.gain.setTargetAtTime(0, t + dur, 0.07);
    const parts = f0 < 130 ? 10 : f0 < 350 ? 8 : f0 < 900 ? 6 : 4;
    for (let k = 1; k <= parts; k++) {
      const fk = f0 * k * Math.sqrt(1 + 0.0003 * k * k);
      if (fk > 9000) break;
      const o = ctx.createOscillator(); o.frequency.value = fk;
      const g = ctx.createGain(), a = AMPS[k - 1] * (k === 1 ? 1 : 0.55 + 0.45 * Math.min(1, vel));
      g.gain.setValueAtTime(a, t);
      g.gain.setTargetAtTime(a * 0.12, t + 0.01, body / (0.6 + 0.5 * k));
      o.connect(g); g.connect(v); o.start(t); o.stop(t + dur + 0.6);
    }
  }
  function piano(out, t, midi, dur, vel = 0.75, gain = 1) {
    if (hasSamples()) pianoSample(out, t, midi, dur, vel, gain);
    else pianoSynth(out, t, midi, dur, vel, gain);
  }
  // wooden metronome "tock"
  function click(out, t, accent, soft) {
    const k = soft ? 0.45 : 1;   // softer while you sing along
    const ns = ctx.createBufferSource(); ns.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = accent ? 2500 : 1800; bp.Q.value = 7;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime((accent ? 1.5 : 0.95) * k, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    ns.connect(bp); bp.connect(ng); ng.connect(out); ns.start(t); ns.stop(t + 0.06);
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(accent ? 1180 : 880, t);
    o.frequency.exponentialRampToValueAtTime(accent ? 960 : 700, t + 0.04);
    const og = ctx.createGain();
    og.gain.setValueAtTime((accent ? 0.2 : 0.12) * k, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(og); og.connect(out); o.start(t); o.stop(t + 0.06);
  }

  /* ---------- playback ----------
     events: [{t, midi, dur, vel, gain}] or [{t, click: true, accent}]
     notes are humanized slightly (timing and loudness), chords stay together */
  function humanize(events) {
    const groups = {};
    return events.map(e => {
      if (e.click || e.exact) return e;
      const key = Math.round(e.t * 1000);
      if (!(key in groups)) groups[key] = e.t === 0 ? 0 : (Math.random() - 0.5) * 0.018;
      const spread = (Math.random() - 0.5) * 0.008;
      const vel = clamp((e.vel ?? 0.75) * (1 + (Math.random() - 0.5) * 0.08), 0.1, 1);
      return { ...e, t: Math.max(0, e.t + groups[key] + spread), vel };
    });
  }
  function play(events, opts = {}) {
    ready();
    stop();
    const pb = { opts, done: false, started: false };
    current = pb;
    const startNow = () => {
      if (pb.done) return;
      const bus = ctx.createGain(); bus.connect(mix);
      pb.bus = bus;
      const t0 = ctx.currentTime + 0.08;
      let total = 0.1;
      for (const e of humanize(events)) {
        if (e.click) click(bus, t0 + e.t, e.accent, e.soft);
        else piano(bus, t0 + e.t, e.midi, e.dur, e.vel, e.gain ?? 1);
        total = Math.max(total, e.t + (e.dur || 0.1));
      }
      pb.started = true;
      pb.t0 = t0;
      if (opts.onStart) opts.onStart(t0);   // audio-clock time of event t = 0 (the singing check lines up with it)
      const tick = () => {
        if (pb.done) return;
        const el = ctx.currentTime - t0;
        if (opts.onProgress) opts.onProgress(clamp(el / total, 0, 1));
        if (el >= total + 0.05) { finish(pb); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (hasSamples()) startNow();
    else {
      if (opts.onLoading) opts.onLoading();
      // wait for the piano (first time only); fall back to the synth after 8 s
      Promise.race([loadSamples(), new Promise(r => setTimeout(r, 8000))]).then(startNow);
    }
    return pb;
  }
  function finish(pb) {
    if (pb.done) return;
    pb.done = true;
    if (current === pb) current = null;
    if (pb.opts.onEnd) pb.opts.onEnd();
    setTimeout(() => { try { pb.bus.disconnect(); } catch (e) { /* gone */ } }, 2500);
  }
  function stop() {
    if (!current) return;
    const pb = current;
    current = null;
    pb.done = true;
    if (pb.bus) pb.bus.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
    if (pb.opts.onEnd) pb.opts.onEnd();
    setTimeout(() => { try { if (pb.bus) pb.bus.disconnect(); } catch (e) { /* gone */ } }, 500);
  }
  function note(midi, dur = 0.7) {
    ready();
    piano(mix, ctx.currentTime + 0.01, midi, dur, 0.65, 1);
  }
  /* a short bell when an answer is right – a little brighter when it came quickly */
  function chime(bright = 1) {
    ready();
    const t = ctx.currentTime + 0.02, base = 79 + rnd(5) + (bright >= 2 ? 3 : 0);
    const steps = bright >= 2 ? [0, 4, 7, 12] : bright >= 1 ? [0, 7, 12] : [0, 7];
    steps.forEach((st, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), tt = t + i * 0.062;
      o.type = 'triangle';
      o.frequency.value = 440 * Math.pow(2, (base + st - 69) / 12);
      g.gain.setValueAtTime(0, tt);
      g.gain.linearRampToValueAtTime(0.15, tt + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0008, tt + 0.45);
      o.connect(g); g.connect(mix); o.start(tt); o.stop(tt + 0.5);
    });
  }
  function setVolume(v) {
    volume = v; store.set('vol', v);
    if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
  }
  prefetch();
  return { play, stop, note, chime, ready, setVolume, get volume() { return volume; }, get playing() { return !!current; }, get engine() { return hasSamples() ? 'piano' : 'synth'; } };
})();

/* A play button with a progress bar; a second press stops playback */
function playButton(labelKey, getEvents, opts = {}) {
  const text = () => opts.labelFn ? opts.labelFn() : t(labelKey);
  const lab = el('span', { class: 'lbl' }, text());
  const bar = el('span', { class: 'prog' });
  const ico = el('span', { class: 'ico', html: ICON.play });
  const btn = el('button', { type: 'button', class: 'btn ' + (opts.primary ? 'btn-play' : 'btn-sec btn-sm'), title: t(labelKey) }, ico, lab, bar);
  let mine = false;
  const reset = () => { mine = false; btn.classList.remove('is-playing', 'is-loading'); bar.style.width = '0'; ico.innerHTML = ICON.play; lab.textContent = text(); };
  btn.addEventListener('click', () => {
    if (mine && Sound.playing) { Sound.stop(); return; }
    if (opts.allowed && !opts.allowed()) return;
    const evs = getEvents();
    if (!evs || !evs.length) return;
    if (opts.before) opts.before();
    Sound.play(evs, {
      onLoading: () => { btn.classList.add('is-loading'); lab.textContent = t('loadingPiano'); },
      onStart: () => { btn.classList.remove('is-loading'); lab.textContent = text(); },
      onProgress: p => { bar.style.width = (p * 100).toFixed(1) + '%'; },
      onEnd: () => { reset(); if (opts.after) opts.after(); }
    });
    mine = true;
    btn.classList.add('is-playing');
    ico.innerHTML = ICON.stop;
  });
  btn.trigger = () => btn.click();
  btn.refresh = () => { if (!btn.classList.contains('is-loading')) lab.textContent = text(); };
  return btn;
}
