'use strict';
/* ============================================================
   Singing check
   - Microphone pitch tracking with YIN (de Cheveigné & Kawahara), as in SmartEar: 2048-sample
     frames, cumulative mean normalised difference, first dip under 0.15, parabolic refinement.
     Browser noise suppression, echo cancellation and auto-gain are off – they bend the pitch.
   - Everything stays in the browser: nothing is sent or stored. The take can be played back once.
   - Singing in time: the first note sounds, one bar is counted in, every written quarter is sung
     on its beat. Each beat is judged on its own from the middle of the beat (12 % to 95 %).
   ============================================================ */
const Mic = (() => {
  let stream = null, src = null, an = null, buf = null, ctx = null;
  const MIN_HZ = 65, MAX_HZ = 1100, RMS_FLOOR = 0.008, THRESH = 0.15;

  const supported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && window.isSecureContext !== false;
  async function open() {
    ctx = Sound.ready();
    if (an) return ctx;
    try { if (navigator.audioSession) navigator.audioSession.type = 'play-and-record'; } catch (e) { /* not supported */ }
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    src = ctx.createMediaStreamSource(stream);
    an = ctx.createAnalyser();
    an.fftSize = 2048;
    src.connect(an);
    buf = new Float32Array(an.fftSize);
    if (ctx.state !== 'running') { try { await ctx.resume(); } catch (e) { /* ignore */ } }
    return ctx;
  }
  function close() {
    try { if (src) src.disconnect(); } catch (e) { /* gone */ }
    if (stream) stream.getTracks().forEach(tr => tr.stop());
    stream = src = an = null;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* not supported */ }
  }
  function yin(b, sr) {
    const n = b.length;
    let rms = 0;
    for (let i = 0; i < n; i++) rms += b[i] * b[i];
    rms = Math.sqrt(rms / n);
    if (rms < RMS_FLOOR) return { freq: null, rms };
    const W = n >> 1, tauMax = Math.min(W - 1, Math.floor(sr / MIN_HZ)), tauMin = Math.max(2, Math.floor(sr / MAX_HZ));
    const d = new Float32Array(tauMax + 1);
    for (let tau = 1; tau <= tauMax; tau++) {
      let sum = 0;
      for (let i = 0; i < W; i++) { const x = b[i] - b[i + tau]; sum += x * x; }
      d[tau] = sum;
    }
    const cm = new Float32Array(tauMax + 1);
    cm[0] = 1;
    let run = 0;
    for (let tau = 1; tau <= tauMax; tau++) { run += d[tau]; cm[tau] = run > 0 ? d[tau] * tau / run : 1; }
    let tau = -1;
    for (let k = tauMin; k <= tauMax; k++) {
      if (cm[k] < THRESH) { while (k + 1 <= tauMax && cm[k + 1] < cm[k]) k++; tau = k; break; }
    }
    if (tau < 0) return { freq: null, rms };
    let better = tau;
    if (tau > 1 && tau < tauMax) {
      const s0 = cm[tau - 1], s1 = cm[tau], s2 = cm[tau + 1], den = 2 * (2 * s1 - s2 - s0);
      if (den) better = tau + (s2 - s0) / den;
    }
    const freq = sr / better;
    return freq < MIN_HZ || freq > MAX_HZ ? { freq: null, rms } : { freq, rms };
  }
  // one frame now: t = audio-clock time of the middle of the analysed window, midi = fractional pitch or null
  function frame() {
    an.getFloatTimeDomainData(buf);
    const r = yin(buf, ctx.sampleRate);
    return { t: ctx.currentTime - buf.length / 2 / ctx.sampleRate, midi: r.freq ? 69 + 12 * Math.log2(r.freq / 440) : null, rms: r.rms };
  }
  // record the take (to listen back); stop() resolves to an object URL or null
  function recorder() {
    if (!stream || typeof MediaRecorder === 'undefined') return { stop: async () => null };
    let rec;
    try { rec = new MediaRecorder(stream); } catch (e) { return { stop: async () => null }; }
    const chunks = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    try { rec.start(); } catch (e) { return { stop: async () => null }; }
    return {
      stop: () => new Promise(res => {
        rec.onstop = () => res(chunks.length ? URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' })) : null);
        try { rec.stop(); } catch (e) { res(null); }
      })
    };
  }
  return { supported, open, close, frame, recorder, yin, get isOpen() { return !!an; }, get ctx() { return ctx; } };
})();

/* ---------- judging a take ----------
   targets: midi per beat · beat k starts at T0 + k·q (audio clock) · frames from Mic.frame().
   The beats are first lined up with the singer: the latency of loudspeaker + microphone (and a singer who
   is always a little late) is found by trying offsets and keeping the one that fits best.
   Then the octave the singer chose is taken as given (men read the treble clef an octave lower).
   Per note: ok (within ±40 cents) · tune (right note, out of tune: up to 70 cents, or the whole line has
   drifted and this note sits right within it) · wrong (another note) · miss (not sung). */
const SING_OK = 0.4, SING_TUNE = 0.7;
function beatPitch(frames, a, b, from) {
  let i = from, n = 0, voiced = [];
  while (i < frames.length && frames[i].t < a) i++;
  const first = i;
  for (; i < frames.length && frames[i].t <= b; i++) { n++; if (frames[i].midi != null) voiced.push(frames[i].midi); }
  if (!n || voiced.length < Math.max(2, 0.3 * n)) return { m: null, first };
  voiced.sort((x, y) => x - y);
  return { m: voiced[voiced.length >> 1], first };
}
const foldOct = x => { while (x > 6) x -= 12; while (x < -6) x += 12; return x; };
function sungPitches(frames, targets, T0, q, off, upTo) {
  const out = [];
  let from = 0;
  for (let k = 0; k < targets.length; k++) {
    if (upTo != null && k > upTo) { out.push(null); continue; }
    const s = T0 + k * q + off, r = beatPitch(frames, s + 0.12 * q, s + 0.95 * q, from);
    from = r.first;
    out.push(r.m);
  }
  return out;
}
function gradeTake(frames, targets, T0, q, lat, upTo) {
  // 1. line the beats up with the singer
  let best = null;
  for (let off = Math.max(-0.05, lat - 0.12); off <= lat + 0.42; off += 0.02) {
    const sung = sungPitches(frames, targets, T0, q, off, upTo);
    let cost = 0;
    sung.forEach((m, k) => { cost += m == null ? 1 : Math.min(1, Math.abs(foldOct(m - targets[k])) / 1.2); });
    cost += Math.abs(off - lat - 0.05) * 0.4;
    if (!best || cost < best.cost) best = { off, cost, sung };
  }
  const sung = best.sung;
  // 2. the singer's octave
  const votes = {};
  sung.forEach((m, k) => { if (m != null) { const o = Math.round((m - targets[k]) / 12); votes[o] = (votes[o] || 0) + 1; } });
  const oct = +(Object.keys(votes).sort((a, b) => votes[b] - votes[a])[0] || 0);
  const dev = sung.map((m, k) => m == null ? null : foldOct(m - targets[k] - 12 * oct));
  // 3. per note, against the written pitch and against the neighbours (to tell drift from a wrong note)
  const notes = dev.map((x, k) => {
    if (upTo != null && k > upTo) return { status: 'skip', dev: null };
    if (x == null) return { status: 'miss', dev: null };
    const near = [];
    for (let j = Math.max(0, k - 4); j <= Math.min(dev.length - 1, k + 4); j++) if (j !== k && dev[j] != null && Math.abs(dev[j]) < 0.8) near.push(dev[j]);
    near.sort((a, b) => a - b);
    const local = near.length >= 2 ? near[near.length >> 1] : 0;
    let status;
    if (Math.abs(x) <= SING_OK) status = 'ok';
    else if (Math.abs(x) <= SING_TUNE) status = 'tune';
    else if (Math.abs(x - local) <= 0.5 && Math.abs(local) > SING_OK) status = 'tune';
    else status = 'wrong';
    return { status, dev: x };
  });
  // 4. tendency and drift (cents), from the notes that were meant right
  const good = notes.map((n, k) => ({ n, k })).filter(o => o.n.status === 'ok' || o.n.status === 'tune');
  const med = arr => { if (!arr.length) return 0; const s = arr.slice().sort((a, b) => a - b); return s[s.length >> 1]; };
  const third = Math.max(3, Math.floor(good.length / 3));
  const mean = good.length ? good.reduce((t, o) => t + o.n.dev, 0) / good.length : 0;
  const drift = good.length >= 9 ? med(good.slice(-third).map(o => o.n.dev)) - med(good.slice(0, third).map(o => o.n.dev)) : 0;
  const count = s => notes.filter(n => n.status === s).length;
  return { notes, offset: best.off, octave: oct, mean: Math.round(mean * 100), drift: Math.round(drift * 100),
    ok: count('ok'), tune: count('tune'), wrong: count('wrong'), miss: count('miss'), skip: count('skip') };
}
const markFor = n => {
  if (!n || n.dev == null) return n && n.status === 'miss' ? '·' : '';
  if (n.status === 'tune') return (n.dev > 0 ? '+' : '−') + Math.round(Math.abs(n.dev) * 100);
  if (n.status === 'wrong') {
    const st = Math.round(Math.abs(n.dev)), tones = st / 2;
    return (n.dev > 0 ? '↑' : '↓') + (st === 1 ? '½' : Number.isInteger(tones) ? String(tones) : Math.floor(tones) + '½');
  }
  return '';
};

/* ---------- one take ----------
   o: { targets: [midi], ref: midi (first note), tempo, metro, beats: 4,
        onStart(), onLive({k, midi, target}), onBeat(k, note), onEnd(result | null) }
   returns { stop() } */
function singTake(o) {
  const q = 60 / o.tempo, N = o.targets.length, CI = o.beats || 4;
  const ev = [{ t: 0, midi: o.ref, dur: q * 2.3, vel: 0.72 }];
  for (let i = 0; i < CI; i++) ev.push({ t: i * q, click: true, accent: i === 0 });
  if (o.metro) for (let i = 0; i < N; i++) ev.push({ t: (CI + i) * q, click: true, accent: i % CI === 0, soft: true });
  const ctx = Mic.ctx;
  const lat = clamp((ctx.outputLatency || ctx.baseLatency || 0.01) + 0.03, 0.02, 0.35);
  const live = lat + 0.05;
  const frames = [], recent = [];
  let T0 = null, timer = null, done = false, judged = -1, rec = null;
  const finish = async upTo => {
    if (done) return;
    done = true;
    clearInterval(timer);
    Sound.stop();
    const url = rec ? await rec.stop() : null;
    if (T0 == null || upTo === -1) { o.onEnd(null, url); return; }
    o.onEnd(gradeTake(frames, o.targets, T0, q, lat, upTo), url);
  };
  Sound.play(ev, {
    onLoading: o.onLoading,
    onStart: t0 => {
      if (done) return;
      T0 = t0 + CI * q;
      rec = Mic.recorder();
      if (o.onStart) o.onStart();
      timer = setInterval(() => {
        const f = Mic.frame();
        frames.push(f);
        const now = ctx.currentTime;
        const k = Math.floor((now - T0 - live) / q);
        if (f.midi != null) { recent.push(f.midi); if (recent.length > 5) recent.shift(); } else recent.length = 0;
        const sm = recent.length >= 3 ? recent.slice().sort((a, b) => a - b)[recent.length >> 1] : null;
        // judge each beat as soon as it is over (a first look; the final judgement lines the beats up again)
        while (judged + 1 < N && judged + 1 < k) {
          judged++;
          const s = T0 + judged * q + live, r = beatPitch(frames, s + 0.12 * q, s + 0.95 * q, 0);
          let st = 'miss', dev = null;
          if (r.m != null) {
            dev = foldOct(r.m - o.targets[judged]);
            st = Math.abs(dev) <= SING_OK ? 'ok' : Math.abs(dev) <= SING_TUNE ? 'tune' : 'wrong';
          }
          if (o.onBeat) o.onBeat(judged, { status: st, dev });
        }
        if (o.onLive) o.onLive({ k, midi: sm, target: k >= 0 && k < N ? o.targets[k] : null });
        if (now > T0 + N * q + live + 0.3) finish(null);
      }, 30);
    }
  });
  return {
    stop() {
      if (done) return;
      if (T0 == null) { finish(null); return; }
      const k = Math.floor((Mic.ctx.currentTime - T0 - live) / q);
      finish(k < 0 ? -1 : Math.min(N - 1, k));
    },
    get running() { return !done; }
  };
}
