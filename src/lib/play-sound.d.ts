// src/lib/play-sound.d.ts

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
	 * Required when `envelope` is present.
	 * The implementation does NOT default this (`t + a + d` becomes NaN if
	 * it's undefined), so we force callers to supply it.
	 */
	decay: number;
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
  
  export function playSound(
	patch: SoundPatch | SoundLayer,
	context?: AudioContext
  ): void;