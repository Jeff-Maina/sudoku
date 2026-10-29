// src/lib/play-sound.ts

export interface FrequencyRamp {
  start: number;
  end: number;
  /** Defaults to the layer duration if omitted. */
  time?: number;
}

export interface FMModulation {
  ratio: number;
  depth: number;
}

export interface NoiseSource {
  type: 'noise';
  /** Defaults to "white". */
  color?: 'white' | 'pink' | 'brown';
}

export interface OscillatorSource {
  type: OscillatorType;
  frequency: number | FrequencyRamp;
  detune?: number;
  fm?: FMModulation;
}

export type SoundSource = NoiseSource | OscillatorSource;

export interface SoundEnvelope {
  attack?: number;
  /**
   * Optional at the type level (an attack-only blip is valid), but the
   * implementation defaults it to 0 rather than letting it become NaN in
   * `t + a + d`, which is what the old JS version would have done.
   */
  decay?: number;
  sustain?: number;
  release?: number;
  /** Only "ramp" is special-cased; any other value uses the linear/sustain path. */
  curve?: string;
}

export interface FilterEnvelope {
  attack?: number;
  peak: number;
  decay: number;
}

export interface SoundFilter {
  type: BiquadFilterType;
  frequency: number;
  Q?: number;
  /** Fallback for Q when Q is omitted. */
  resonance?: number;
  envelope?: FilterEnvelope;
}

export interface ReverbEffect {
  type: 'reverb';
  /** Defaults to 0.5. */
  decay?: number;
  /** Defaults to 0.3. */
  mix?: number;
  /** Defaults to 0. */
  damping?: number;
  /** Defaults to 1. */
  roomSize?: number;
  /** Defaults to 0. */
  preDelay?: number;
}

export interface DelayEffect {
  type: 'delay';
  delay: number;
  feedback: number;
  wet: number;
  /** Defaults to 4000. */
  lowpass?: number;
}

export type SoundEffect = ReverbEffect | DelayEffect;

export interface SoundLayer {
  source: SoundSource;
  /** Defaults to 0.5. */
  gain?: number;
  /** Defaults to 0. */
  delay?: number;
  envelope?: SoundEnvelope;
  filter?: SoundFilter | SoundFilter[];
  effects?: SoundEffect[];
}

export interface SoundPatch {
  layers: SoundLayer[];
}

interface FxNode {
  input: AudioNode;
  output: AudioNode;
}

interface PlaySoundFn {
  (patch: SoundPatch | SoundLayer, context?: AudioContext): void;
  /** Cached AudioContext reused across calls when no context is supplied. */
  ctx?: AudioContext;
}

const playSoundImpl: PlaySoundFn = (patch, context) => {
  const AudioContextCtor: typeof AudioContext =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  const ctx: AudioContext =
    context ||
    playSoundImpl.ctx ||
    (playSoundImpl.ctx = new AudioContextCtor());

  if (ctx.state === 'suspended') ctx.resume();
  const S = 0.0001;
  const t0 = ctx.currentTime;

  function noiseBuffer(
    seconds: number,
    color?: 'white' | 'pink' | 'brown',
  ): AudioBuffer {
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    if (color === 'pink') {
      let b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    } else if (color === 'brown') {
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    } else {
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  function reverb(o: ReverbEffect): FxNode {
    const decay = o.decay ?? 0.5;
    const mix = o.mix ?? 0.3;
    const damping = o.damping ?? 0;
    const input = ctx.createGain();
    const output = ctx.createGain();
    const dry = ctx.createGain();
    dry.gain.value = 1 - mix;
    input.connect(dry);
    dry.connect(output);
    const wet = ctx.createGain();
    wet.gain.value = mix;
    input.connect(wet);
    const wetOut = ctx.createGain();
    wetOut.connect(output);
    const len = Math.ceil(ctx.sampleRate * decay * (o.roomSize ?? 1));
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.28));
      }
      if (damping > 0) {
        const c = Math.min(damping, 0.99);
        let prev = 0;
        for (let i = 0; i < len; i++) {
          prev = d[i] * (1 - c) + prev * c;
          d[i] = prev;
        }
      }
    }
    const conv = ctx.createConvolver();
    conv.buffer = buf;
    const pre = o.preDelay ?? 0;
    if (pre > 0) {
      const pd = ctx.createDelay(Math.max(pre + 0.01, 1));
      pd.delayTime.value = pre;
      wet.connect(pd);
      pd.connect(conv);
    } else {
      wet.connect(conv);
    }
    conv.connect(wetOut);
    return { input, output };
  }

  function shimmer(o: DelayEffect): FxNode {
    const input = ctx.createGain();
    const output = ctx.createGain();
    input.connect(output);
    const delay = ctx.createDelay(1);
    delay.delayTime.value = o.delay;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = o.lowpass ?? 4000;
    const fb = ctx.createGain();
    fb.gain.value = o.feedback;
    const wet = ctx.createGain();
    wet.gain.value = o.wet;
    input.connect(delay);
    delay.connect(lp);
    lp.connect(fb);
    fb.connect(delay);
    lp.connect(wet);
    wet.connect(output);
    return { input, output };
  }

  const layers: SoundLayer[] = 'layers' in patch ? patch.layers : [patch];

  for (const layer of layers) {
    const t = t0 + (layer.delay ?? 0);
    const gain = layer.gain ?? 0.5;
    const env = layer.envelope;
    const a = env?.attack ?? 0;
    const d = env?.decay ?? 0;
    const sus = env?.sustain ?? 0;
    const rel = env?.release ?? 0;
    const dur = env ? a + d + rel : 0.5;

    const g = ctx.createGain();
    if (!env) {
      g.gain.setValueAtTime(gain, t);
      g.gain.setTargetAtTime(S, t, 0.15);
    } else if (env.curve === 'ramp') {
      const peak = Math.max(gain, S);
      g.gain.setValueAtTime(S, t);
      if (a > 0) g.gain.exponentialRampToValueAtTime(peak, t + a);
      else g.gain.setValueAtTime(peak, t);
      g.gain.exponentialRampToValueAtTime(S, t + a + d);
    } else {
      g.gain.setValueAtTime(S, t);
      if (a > 0) g.gain.linearRampToValueAtTime(gain, t + a);
      else g.gain.setValueAtTime(gain, t);
      if (sus > 0) {
        g.gain.setTargetAtTime(Math.max(sus * gain, S), t + a, d / 3);
        if (rel > 0) g.gain.setTargetAtTime(S, t + a + d, rel / 3);
      } else {
        g.gain.setTargetAtTime(S, t + a, d / 3);
      }
    }

    let src: AudioBufferSourceNode | OscillatorNode;
    const s = layer.source;
    if (s.type === 'noise') {
      const bs = ctx.createBufferSource();
      bs.buffer = noiseBuffer(dur + 0.1, s.color);
      src = bs;
    } else {
      const osc = ctx.createOscillator();
      osc.type = s.type;
      const f = s.frequency;
      if (typeof f === 'number') {
        osc.frequency.setValueAtTime(f, t);
      } else {
        osc.frequency.setValueAtTime(f.start, t);
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(f.end, 1),
          t + Math.min(f.time ?? dur, dur),
        );
      }
      if (s.detune) osc.detune.value = s.detune;
      if (s.fm) {
        const carrier = typeof f === 'number' ? f : f.start;
        const mod = ctx.createOscillator();
        mod.type = 'sine';
        mod.frequency.value = carrier * s.fm.ratio;
        const mg = ctx.createGain();
        mg.gain.value = s.fm.depth;
        mod.connect(mg);
        mg.connect(osc.frequency);
        mod.start(t);
        mod.stop(t + dur + 0.1);
      }
      src = osc;
    }
    src.start(t);
    src.stop(t + dur + 0.1);

    let node: AudioNode = src;
    const filters: SoundFilter[] = !layer.filter
      ? []
      : Array.isArray(layer.filter)
        ? layer.filter
        : [layer.filter];

    for (const f of filters) {
      const bq = ctx.createBiquadFilter();
      bq.type = f.type;
      bq.frequency.setValueAtTime(f.frequency, t);
      bq.Q.value = f.Q ?? f.resonance ?? 1;
      if (f.envelope) {
        const peakAt = t + (f.envelope.attack ?? 0);
        bq.frequency.linearRampToValueAtTime(f.envelope.peak, peakAt);
        bq.frequency.exponentialRampToValueAtTime(
          Math.max(f.frequency, 1),
          peakAt + f.envelope.decay,
        );
      }
      node.connect(bq);
      node = bq;
    }
    node.connect(g);

    let out: AudioNode = g;
    for (const fx of layer.effects ?? []) {
      const built: FxNode =
        fx.type === 'reverb' ? reverb(fx) : shimmer(fx);
      out.connect(built.input);
      out = built.output;
    }
    out.connect(ctx.destination);
  }
};

export const playSound = playSoundImpl;