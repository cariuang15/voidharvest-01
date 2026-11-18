// All sound is synthesised with WebAudio: no audio files, nothing to download.
// Short oscillator/noise bursts for the effects, and a slow two-oscillator pad
// with a wandering bass line for the music. Created lazily on the first user
// gesture, so autoplay rules never block it.
export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let musicTimer = null;
  let step = 0;

  // A minor-key drift: Am – F – C – G, one slow bar each.
  const CHORDS = [
    [110.0, 130.81, 164.81],
    [87.31, 130.81, 174.61],
    [130.81, 164.81, 196.0],
    [98.0, 146.83, 196.0],
  ];

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.14;
      musicGain.connect(master);
      startMusic();
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo, delay = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, filterFreq, delay = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  function startMusic() {
    if (musicTimer !== null) return;
    const barMs = 2400;
    const playBar = () => {
      if (!ctx || muted) return;
      const chord = CHORDS[step % CHORDS.length];
      step += 1;
      chord.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i === 0 ? 'triangle' : 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(i === 0 ? 0.5 : 0.22, ctx.currentTime + 0.4);
        gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + barMs / 1000);
        osc.connect(gain);
        gain.connect(musicGain);
        osc.start();
        osc.stop(ctx.currentTime + barMs / 1000 + 0.1);
      });
    };
    playBar();
    musicTimer = window.setInterval(playBar, barMs);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() {
      return muted;
    },
    shoot() {
      tone(880, 0.07, 'square', 0.05, 320);
    },
    hit() {
      noise(0.08, 0.12, 1800);
    },
    explode(big = false) {
      noise(big ? 0.5 : 0.28, big ? 0.35 : 0.22, big ? 700 : 1200);
      tone(big ? 160 : 220, big ? 0.45 : 0.25, 'sawtooth', 0.16, 40);
    },
    shard() {
      tone(1320, 0.09, 'sine', 0.09, 1980);
    },
    dash() {
      noise(0.16, 0.14, 3200);
      tone(300, 0.14, 'sine', 0.08, 720);
    },
    nova() {
      noise(0.5, 0.3, 900);
      tone(180, 0.5, 'sawtooth', 0.2, 1200);
      tone(90, 0.6, 'sine', 0.22, 45);
    },
    hurt() {
      tone(140, 0.25, 'sawtooth', 0.22, 55);
      noise(0.2, 0.18, 900);
    },
    wave() {
      tone(392, 0.18, 'triangle', 0.14, 392);
      tone(523, 0.22, 'triangle', 0.14, 523, 0.14);
      tone(659, 0.3, 'triangle', 0.14, 659, 0.28);
    },
    upgrade() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.12, f, i * 0.07));
    },
    boss() {
      tone(98, 0.7, 'sawtooth', 0.2, 49);
      tone(147, 0.7, 'sawtooth', 0.12, 73, 0.1);
      noise(0.6, 0.16, 500);
    },
    over() {
      [392, 311, 233, 175].forEach((f, i) => tone(f, 0.4, 'triangle', 0.14, f * 0.94, i * 0.22));
    },
  };
}
