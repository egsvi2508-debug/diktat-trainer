'use strict';
/* ============================================================
   Sound: a small synthesized piano (no samples, works offline)
   ============================================================ */
const Sound = (() => {
  let ctx = null, mix = null, master = null, noiseBuf = null, current = null, unlocked = false;
  let volume = store.get('vol', 0.8);
  const AMPS = [1, 0.52, 0.34, 0.24, 0.16, 0.11, 0.075, 0.05, 0.035, 0.025];

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC({ latencyHint: 'interactive' });
    master = ctx.createGain(); master.gain.value = volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4;
    comp.attack.value = 0.004; comp.release.value = 0.25;
    mix = ctx.createGain();
    const verb = ctx.createConvolver(); verb.buffer = impulse(1.7, 3.4);
    const wet = ctx.createGain(); wet.gain.value = 0.16;
    mix.connect(comp); mix.connect(verb); verb.connect(wet); wet.connect(comp);
    comp.connect(master); master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.06), ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
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

  function piano(out, t, midi, dur, vel = 0.8, gain = 1) {
    const f0 = 440 * Math.pow(2, (midi - 69) / 12);
    const v = ctx.createGain(); v.connect(out);
    const peak = 0.15 * vel * gain;
    const body = 1.15 * Math.pow(2, -(midi - 60) / 22);
    v.gain.setValueAtTime(0, t);
    v.gain.linearRampToValueAtTime(peak, t + 0.006);
    v.gain.setTargetAtTime(peak * 0.5, t + 0.006, 0.1);
    v.gain.setTargetAtTime(0.0001, t + Math.min(0.22, dur), body);
    v.gain.setTargetAtTime(0, t + dur, 0.07);
    const end = t + dur + 0.6;
    const parts = f0 < 130 ? 10 : f0 < 350 ? 8 : f0 < 900 ? 6 : 4;
    for (let k = 1; k <= parts; k++) {
      const fk = f0 * k * Math.sqrt(1 + 0.0003 * k * k);
      if (fk > 9000) break;
      const o = ctx.createOscillator(); o.frequency.value = fk;
      const g = ctx.createGain();
      const a = AMPS[k - 1] * (k === 1 ? 1 : 0.55 + 0.45 * Math.min(1, vel));
      g.gain.setValueAtTime(a, t);
      g.gain.setTargetAtTime(a * 0.12, t + 0.01, body / (0.6 + 0.5 * k));
      o.connect(g); g.connect(v); o.start(t); o.stop(end);
    }
    const ns = ctx.createBufferSource(); ns.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = Math.min(5000, f0 * 5); bp.Q.value = 1.2;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.22 * vel, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    ns.connect(bp); bp.connect(ng); ng.connect(v); ns.start(t); ns.stop(t + 0.05);
  }
  function click(out, t, accent) {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = accent ? 1900 : 1250;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(accent ? 0.45 : 0.28, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.07);
  }

  // events: [{t, midi, dur, vel, gain}] or [{t, click: true, accent}]
  function play(events, opts = {}) {
    ready();
    stop();
    const bus = ctx.createGain(); bus.connect(mix);
    const t0 = ctx.currentTime + 0.08;
    let total = 0.1;
    for (const e of events) {
      if (e.click) click(bus, t0 + e.t, e.accent);
      else piano(bus, t0 + e.t, e.midi, e.dur, e.vel ?? 0.8, e.gain ?? 1);
      total = Math.max(total, e.t + (e.dur || 0.1));
    }
    const pb = { bus, t0, total, opts, done: false };
    current = pb;
    const tick = () => {
      if (pb.done) return;
      const el = ctx.currentTime - t0;
      if (opts.onProgress) opts.onProgress(clamp(el / total, 0, 1));
      if (el >= total + 0.05) { finish(pb); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return pb;
  }
  function finish(pb) {
    if (pb.done) return;
    pb.done = true;
    if (current === pb) current = null;
    if (pb.opts.onEnd) pb.opts.onEnd();
    setTimeout(() => { try { pb.bus.disconnect(); } catch (e) { /* gone */ } }, 1500);
  }
  function stop() {
    if (!current) return;
    const pb = current;
    current = null;
    pb.bus.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    pb.done = true;
    if (pb.opts.onEnd) pb.opts.onEnd();
    setTimeout(() => { try { pb.bus.disconnect(); } catch (e) { /* gone */ } }, 400);
  }
  function note(midi, dur = 0.6) {
    ready();
    piano(mix, ctx.currentTime + 0.01, midi, dur, 0.7, 1);
  }
  function setVolume(v) {
    volume = v; store.set('vol', v);
    if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
  }
  return { play, stop, note, ready, setVolume, get volume() { return volume; }, get playing() { return !!current; } };
})();

/* A play button with a progress bar; a second press stops playback */
function playButton(labelKey, getEvents, opts = {}) {
  const lab = el('span', { class: 'lbl' }, t(labelKey));
  const bar = el('span', { class: 'prog' });
  const btn = el('button', { class: 'btn ' + (opts.primary ? 'btn-play' : 'btn-sec'), type: 'button' },
    el('span', { class: 'ico', html: ICON.play }), lab, bar);
  let mine = false;
  const reset = () => { mine = false; btn.classList.remove('is-playing'); bar.style.width = '0'; btn.querySelector('.ico').innerHTML = ICON.play; };
  btn.addEventListener('click', () => {
    if (mine && Sound.playing) { Sound.stop(); return; }
    if (opts.allowed && !opts.allowed()) return;
    const evs = getEvents();
    if (!evs || !evs.length) return;
    if (opts.before) opts.before();
    Sound.play(evs, {
      onProgress: p => { bar.style.width = (p * 100).toFixed(1) + '%'; },
      onEnd: () => { reset(); if (opts.after) opts.after(); }
    });
    mine = true;
    btn.classList.add('is-playing');
    btn.querySelector('.ico').innerHTML = ICON.stop;
  });
  btn.trigger = () => btn.click();
  return btn;
}
