// audio.js — procedural ambient music via Web Audio API
// All sound is synthesised at runtime. No audio files, no external libs.

class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.currentTrack = null;
    this.currentTrackId = null;
    this.muted = false;
    this.targetMasterGain = 0.7;
    this._cachedNoise = null;
  }

  // ───────────── Lifecycle ─────────────

  init() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : this.targetMasterGain;
    this.masterGain.connect(this.ctx.destination);
  }

  destroy() {
    this.stop();
    if (this.ctx && this.ctx.close) {
      try { this.ctx.close(); } catch {}
    }
    this.ctx = null;
    this.masterGain = null;
  }

  // ───────────── Mute ─────────────

  mute() {
    this.muted = true;
    if (!this.ctx) return;
    const g = this.masterGain.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + 0.3);
  }

  unmute() {
    this.muted = false;
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const g = this.masterGain.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(this.targetMasterGain, now + 0.3);
  }

  isMuted() { return this.muted; }

  // ───────────── Play / Stop ─────────────

  play(trackId, options = {}) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.currentTrackId === trackId) return;

    const now = this.ctx.currentTime;
    const gainMultiplier = options.gainMultiplier ?? 1;

    // Fade out current track
    if (this.currentTrack) {
      const old = this.currentTrack;
      old.disposed = true;
      const g = old.gainNode.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(0, now + 2.0);
      setTimeout(() => this._disposeTrack(old), 2200);
    }

    // Build new track
    const track = this._buildTrack(trackId, gainMultiplier);
    if (!track) return;
    const g = track.gainNode.gain;
    g.setValueAtTime(0, now);
    // Hold at 0 until halfway through crossfade, then ramp up
    g.setValueAtTime(0, now + 1.0);
    g.linearRampToValueAtTime(track.targetGain, now + 3.0);

    this.currentTrack = track;
    this.currentTrackId = trackId;
  }

  stop() {
    if (!this.ctx || !this.currentTrack) return;
    const old = this.currentTrack;
    old.disposed = true;
    const g = old.gainNode.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + 1.0);
    setTimeout(() => this._disposeTrack(old), 1100);
    this.currentTrack = null;
    this.currentTrackId = null;
  }

  _disposeTrack(track) {
    track.disposed = true;
    track.timers.forEach(id => clearTimeout(id));
    track.timers = [];
    track.nodes.forEach(n => {
      try { if (n.stop) n.stop(); } catch {}
      try { n.disconnect(); } catch {}
    });
    track.nodes = [];
    try { track.gainNode.disconnect(); } catch {}
  }

  // ───────────── Track building ─────────────

  _buildTrack(id, multiplier = 1) {
    const track = {
      id,
      gainNode: this.ctx.createGain(),
      targetGain: 1.0 * multiplier,
      nodes: [],
      timers: [],
      disposed: false,
    };
    track.gainNode.gain.value = 0;
    track.gainNode.connect(this.masterGain);

    switch (id) {
      case 'map':     this._buildMap(track); break;
      case 'tension': this._buildTension(track); break;
      case 'sorrow':  this._buildSorrow(track); break;
      case 'ancient': this._buildAncient(track); break;
      default: return null;
    }
    return track;
  }

  // ───────────── Helpers ─────────────

  _osc(type, freq, target, gain, track) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    osc.connect(g);
    g.connect(target);
    osc.start();
    track.nodes.push(osc, g);
    return { osc, gain: g };
  }

  _lfo(freq, depth, param, track) {
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = freq;
    const d = this.ctx.createGain();
    d.gain.value = depth;
    lfo.connect(d);
    d.connect(param);
    lfo.start();
    track.nodes.push(lfo, d);
  }

  _noiseBuffer() {
    if (this._cachedNoise) return this._cachedNoise;
    const size = Math.floor(this.ctx.sampleRate * 2);
    const buf = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    this._cachedNoise = buf;
    return buf;
  }

  _noise(target, gain, track) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer();
    src.loop = true;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    g.connect(target);
    src.start();
    track.nodes.push(src, g);
  }

  _playEnvNote(track, type, freq, target, peak, attack, sustain, release) {
    if (track.disposed) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = 0;
    osc.connect(g);
    g.connect(target);
    const t = ctx.currentTime;
    const endTime = t + attack + sustain + release;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    if (sustain > 0) {
      g.gain.setValueAtTime(peak, t + attack + sustain);
    }
    g.gain.linearRampToValueAtTime(0, endTime);
    osc.start(t);
    osc.stop(endTime + 0.1);
    track.nodes.push(osc, g);
    osc.onended = () => {
      try { osc.disconnect(); } catch {}
      try { g.disconnect(); } catch {}
    };
  }

  // ───────────── TRACK 1: 'map' ─────────────

  _buildMap(track) {
    const ctx = this.ctx;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    filter.connect(track.gainNode);
    track.nodes.push(filter);

    // Layer 1: drone 110Hz + slow gain LFO
    const drone = this._osc('sine', 110, filter, 0.08, track);
    this._lfo(0.3, 0.03, drone.gain.gain, track);

    // Layer 2: fifth 165Hz
    this._osc('sine', 165, filter, 0.04, track);

    // Layer 4: high shimmer 880Hz + freq LFO
    const shimmer = this._osc('sine', 880, filter, 0.015, track);
    this._lfo(0.1, 4, shimmer.osc.frequency, track);

    // Layer 3: pentatonic arpeggio (random order, every 3.5s)
    const notes = [110, 146.8, 164.8, 220, 261.6];
    const schedule = () => {
      if (track.disposed) return;
      const freq = notes[Math.floor(Math.random() * notes.length)];
      this._playEnvNote(track, 'triangle', freq, filter, 0.06, 0.3, 0.4, 1.2);
      const id = setTimeout(schedule, 3500);
      track.timers.push(id);
    };
    const firstId = setTimeout(schedule, 1500);
    track.timers.push(firstId);
  }

  // ───────────── TRACK 2: 'tension' ─────────────

  _buildTension(track) {
    const ctx = this.ctx;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    filter.connect(track.gainNode);
    track.nodes.push(filter);

    // Low pulse 73.4Hz + heartbeat LFO
    const low = this._osc('sine', 73.4, filter, 0.1, track);
    this._lfo(1.2, 0.06, low.gain.gain, track);

    // Dissonant minor second 77.8Hz
    this._osc('sine', 77.8, filter, 0.04, track);

    // Mid growl — saw 146.8 through bandpass Q=8 @ 200Hz
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 200;
    bp.Q.value = 8;
    bp.connect(filter);
    track.nodes.push(bp);
    this._osc('sawtooth', 146.8, bp, 0.025, track);

    // High creak 523Hz + slow freq wander
    const creak = this._osc('sine', 523, filter, 0.01, track);
    this._lfo(0.07, 15, creak.osc.frequency, track);
  }

  // ───────────── TRACK 3: 'sorrow' ─────────────

  _buildSorrow(track) {
    const ctx = this.ctx;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    filter.Q.value = 2;
    filter.connect(track.gainNode);
    track.nodes.push(filter);

    // Cello-like drone 82.4 triangle + very slow breath
    const drone = this._osc('triangle', 82.4, filter, 0.07, track);
    this._lfo(0.2, 0.025, drone.gain.gain, track);

    // Harmonic wash 329.6Hz
    this._osc('sine', 329.6, filter, 0.02, track);

    // Mournful 4-note phrase then 8s silence, repeats
    const notes = [246.9, 220, 196, 164.8];
    const NOTE_SPACING_MS = 1200;
    const PHRASE_GAP_MS = 8000;

    const playPhrase = () => {
      if (track.disposed) return;
      notes.forEach((freq, i) => {
        const id = setTimeout(() => {
          this._playEnvNote(track, 'sine', freq, filter, 0.05, 0.8, 1.0, 2.0);
        }, i * NOTE_SPACING_MS);
        track.timers.push(id);
      });
      const phraseDuration = notes.length * NOTE_SPACING_MS;
      const nextId = setTimeout(playPhrase, phraseDuration + PHRASE_GAP_MS);
      track.timers.push(nextId);
    };
    const firstId = setTimeout(playPhrase, 2000);
    track.timers.push(firstId);
  }

  // ───────────── TRACK 4: 'ancient' ─────────────

  _buildAncient(track) {
    const ctx = this.ctx;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.connect(track.gainNode);
    track.nodes.push(filter);

    // Subsonic presence 65.4Hz + tiny LFO
    const sub = this._osc('sine', 65.4, filter, 0.09, track);
    this._lfo(0.15, 0.04, sub.gain.gain, track);

    // Natural harmonic overtone stack
    this._osc('sine', 130.8, filter, 0.035, track);
    this._osc('sine', 196,   filter, 0.02,  track);
    this._osc('sine', 261.6, filter, 0.01,  track);

    // Faint wind hiss — noise through bandpass 400Hz Q=15
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 400;
    bp.Q.value = 15;
    bp.connect(filter);
    track.nodes.push(bp);
    this._noise(bp, 0.008, track);

    // Distant bell, irregular (12-20s)
    const scheduleBell = () => {
      if (track.disposed) return;
      this._playEnvNote(track, 'sine', 261.6, filter, 0.05, 0.01, 0, 6.0);
      const interval = 12000 + Math.random() * 8000;
      const id = setTimeout(scheduleBell, interval);
      track.timers.push(id);
    };
    const firstId = setTimeout(scheduleBell, 4000);
    track.timers.push(firstId);
  }
}

export const audioManager = new AudioManager();
