import type { PlayingSound } from "./AudioOutput";

/**
 * The Ison's voice: a synthesizer vox, two thirds analog and one third choir, built live from Web Audio nodes so it
 * holds as long as the student wants, on any pitch, and needs no recordings.
 *
 * - The analog part is one oscillator, a saw mixed with a pulse whose width breathes slowly (the pulse is the saw
 *   minus itself delayed, so the width is a delay time), through a resonant low-pass and an "a"-like vowel peak.
 * - The choir part is five voices on "a", a few cents apart and drifting slowly, an octave above them quietly, and
 *   whispered air.
 * - Both go through a stereo chorus (two delay lines swung in opposite directions) and a small room.
 *
 * The analog oscillator sits exactly on the pitch and nothing moves it; the choir voices are spread evenly around
 * it, so what is heard is centred on the Degree.
 */

/** How much of the sound is the choir (the rest is the analog vox). */
const CHOIR = 0.35;
const ANALOG = 1 - CHOIR;
/** Choir voices, in cents from the pitch; spread evenly so their centre is the pitch itself. */
const CHOIR_DETUNE = [-7, -3, 0, 3, 7];
/** How far each choir voice drifts, in cents, and how slowly (Hz), each at its own pace. */
const CHOIR_DRIFT_CENTS = 1.5;
const CHOIR_DRIFT_HZ = [0.13, 0.19, 0.16, 0.22, 0.14];
const OCTAVE_LEVEL = 0.18;
const OCTAVE_DRIFT_CENTS = 2;

/** The vowel "a" of a man's voice: formant centre, half-width and level. */
const A_FORMANTS: Formant[] = [
  [700, 110, 1],
  [1150, 130, 0.6],
  [2500, 200, 0.3],
  [3300, 300, 0.18],
  [4200, 400, 0.1],
];
/** The analog vox's own vowel peaks. */
const ANALOG_FORMANTS: Formant[] = [
  [520, 140, 1],
  [950, 160, 0.7],
  [2400, 300, 0.12],
];
const ANALOG_CUTOFF_HZ = 1150;
const ANALOG_RESONANCE = 2.2;
/** The pulse share of the analog oscillator, and how its width moves. */
const PULSE = 0.45;
const PULSE_WIDTH = 0.5;
const PULSE_WIDTH_SWING = 0.35;
const PULSE_WIDTH_RATE_HZ = 0.35;

/** Whispered air: bands of noise, quietly. */
const AIR_BANDS: Band[] = [
  [2600, 1000, 1],
  [4200, 1400, 0.8],
  [7000, 3000, 0.5],
];
const AIR_LEVEL = 0.12 * CHOIR;

/** Chorus: delay time and swing in seconds, its rate, and how much of it is heard. */
const CHORUS_DELAY_S = 0.0035 + 0.0025 * CHOIR;
const CHORUS_SWING_S = 0.0017 + 0.0008 * CHOIR;
const CHORUS_RATE_HZ = 0.5 - 0.23 * CHOIR;
const CHORUS_DRY = 0.7;
const CHORUS_WET = 0.6 - 0.1 * CHOIR;
/** Room: length, how dark, how loud. */
const ROOM_S = 1.4 + 1.6 * CHOIR;
const ROOM_DARK_HZ = 3500 + 5500 * CHOIR;
const ROOM_LEVEL = 0.18 + 0.27 * CHOIR;

/**
 * The swell in: a long S-curve (sine squared), almost silent for the first moments and gathering slowly, so the
 * Ison comes in like a choir taking a breath rather than with a hit. The fade out is the same curve, shorter.
 */
const SWELL_S = 1.5;
const RELEASE_S = 0.6;
const CURVE_POINTS = 64;
/** Overall level, so the vox is about as loud as the soft tone and leaves room for a Degree and a click. */
const OUTPUT_GAIN = 0.28;
const VOLUME_GLIDE_S = 0.05;
/** Harmonics stop below this, well under what any device plays back. */
const TOP_HZ = 9000;

type Formant = [centre: number, halfWidth: number, level: number];
type Band = [centre: number, width: number, level: number];

function formant(hz: number, formants: Formant[], tilt = 0) {
  const peaks = formants.reduce((sum, [centre, halfWidth, level]) => sum + level / (1 + ((hz - centre) / halfWidth) ** 2), 0);
  return peaks * (Math.max(hz, 1) / 100) ** -tilt;
}

/** Amplitudes of harmonics 1, 2, 3, … of a tone at `hz`, shaped by `shape`, scaled to a root-mean-square of 1. */
function harmonics(hz: number, shape: (k: number, harmonicHz: number) => number) {
  const count = Math.max(1, Math.floor(TOP_HZ / hz));
  const amps = Array.from({ length: count }, (_, i) => shape(i + 1, (i + 1) * hz));
  const rms = Math.sqrt(amps.reduce((sum, a) => sum + a * a, 0) / 2) || 1;
  return amps.map((a) => a / rms);
}

function wave(ctx: BaseAudioContext, amps: number[]) {
  const imag = new Float32Array([0, ...amps]);
  return ctx.createPeriodicWave(new Float32Array(imag.length), imag, { disableNormalization: true });
}

/** The analog oscillator's saw, already through its filter and vowel. */
function analogSaw(hz: number) {
  const lowPass = (f: number) => {
    const w = f / ANALOG_CUTOFF_HZ;
    return 1 / ((1 - w * w) ** 2 + (w / ANALOG_RESONANCE) ** 2);
  };
  return harmonics(hz, (k, f) => (1 / k) * lowPass(f) * (0.35 + formant(f, ANALOG_FORMANTS)) * (f > 90 ? 1 : 0.3));
}

const choirVoice = (hz: number) => harmonics(hz, (_, f) => formant(f, A_FORMANTS, 0.15));
const octaveVoice = (hz: number) => harmonics(hz, (_, f) => formant(f, A_FORMANTS, 0.4));

/** A slow sine that swings `param` by ±`depth` around its value. */
function sway(ctx: BaseAudioContext, param: AudioParam, rateHz: number, depth: number, at: number, nodes: AudioScheduledSourceNode[]) {
  const lfo = ctx.createOscillator();
  lfo.frequency.value = rateHz;
  const amount = ctx.createGain();
  amount.gain.value = depth;
  lfo.connect(amount).connect(param);
  lfo.start(at);
  nodes.push(lfo);
  return amount;
}

/** White noise, made once per context and looped. */
const noises = new WeakMap<BaseAudioContext, AudioBuffer>();
function noise(ctx: BaseAudioContext) {
  let buffer = noises.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noises.set(ctx, buffer);
  }
  return buffer;
}

/** White noise through bands, scaled so it comes out at a root-mean-square of about 1. */
function bandedNoise(ctx: BaseAudioContext, bands: Band[], output: AudioNode, at: number, nodes: AudioScheduledSourceNode[]) {
  const source = ctx.createBufferSource();
  source.buffer = noise(ctx);
  source.loop = true;
  const nyquist = ctx.sampleRate / 2;
  // Uniform noise has a root-mean-square of 1/√3; a band lets through about (π/2)·width/nyquist of its power.
  const power = bands.reduce((sum, [, width, level]) => sum + level * level * (Math.PI / 2) * (width / nyquist), 0);
  const scale = 1 / (Math.sqrt(power) / Math.sqrt(3));
  for (const [centre, width, level] of bands) {
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = centre;
    band.Q.value = centre / width;
    const gain = ctx.createGain();
    gain.gain.value = level * scale;
    source.connect(band).connect(gain).connect(output);
  }
  source.start(at);
  nodes.push(source);
}

/** A small room: stereo decaying noise, darkened, made once per context. */
const rooms = new WeakMap<BaseAudioContext, AudioBuffer>();
function room(ctx: BaseAudioContext) {
  let buffer = rooms.get(ctx);
  if (!buffer) {
    const length = Math.floor(ROOM_S * ctx.sampleRate);
    buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    const decay = ROOM_S / 6.9; // 60 dB down at the end
    const smooth = Math.exp((-2 * Math.PI * ROOM_DARK_HZ) / ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      let a = 0;
      let b = 0;
      for (let i = 0; i < length; i++) {
        // Two gentle low-pass steps darken it.
        a = smooth * a + (1 - smooth) * (Math.random() * 2 - 1);
        b = smooth * b + (1 - smooth) * a;
        data[i] = b * Math.exp(-i / ctx.sampleRate / decay);
      }
    }
    rooms.set(ctx, buffer);
  }
  return buffer;
}

/** A sine-squared curve from `from` to `to`: gentle at both ends. */
function sCurve(from: number, to: number) {
  return Float32Array.from({ length: CURVE_POINTS }, (_, i) => from + (to - from) * Math.sin(((i / (CURVE_POINTS - 1)) * Math.PI) / 2) ** 2);
}

/** The Ison's vox on a given context, at `frequency`, held until stopped. */
export function playIsonVox(ctx: BaseAudioContext, frequency: number, volume: number, startMs = 0): PlayingSound {
  const start = ctx.currentTime + startMs / 1000;
  const sources: AudioScheduledSourceNode[] = [];

  // Everything sounding meets here, before the chorus and the room.
  const dry = ctx.createGain();

  // The analog vox: the saw, and the pulse as the saw minus itself delayed by the pulse width.
  const analog = ctx.createOscillator();
  analog.setPeriodicWave(wave(ctx, analogSaw(frequency)));
  analog.frequency.value = frequency;
  const period = 1 / frequency;
  const widthDelay = ctx.createDelay(0.05);
  widthDelay.delayTime.value = PULSE_WIDTH * period;
  sway(ctx, widthDelay.delayTime, PULSE_WIDTH_RATE_HZ, PULSE_WIDTH_SWING * period, start, sources);
  const saw = ctx.createGain();
  const pulse = PULSE / Math.PI;
  saw.gain.value = ANALOG * (1 - PULSE + pulse);
  const delayed = ctx.createGain();
  delayed.gain.value = -ANALOG * pulse;
  analog.connect(saw).connect(dry);
  analog.connect(widthDelay).connect(delayed).connect(dry);
  analog.start(start);
  sources.push(analog);

  // The choir: voices spread around the pitch, each drifting a little on its own.
  const choirWave = wave(ctx, choirVoice(frequency));
  const choir = ctx.createGain();
  choir.gain.value = CHOIR / Math.sqrt(CHOIR_DETUNE.length);
  for (const [i, cents] of CHOIR_DETUNE.entries()) {
    const voice = ctx.createOscillator();
    voice.setPeriodicWave(choirWave);
    voice.frequency.value = frequency;
    voice.detune.value = cents;
    sway(ctx, voice.detune, CHOIR_DRIFT_HZ[i]!, CHOIR_DRIFT_CENTS, start, sources);
    voice.connect(choir);
    voice.start(start);
    sources.push(voice);
  }
  const octave = ctx.createOscillator();
  octave.setPeriodicWave(wave(ctx, octaveVoice(frequency * 2)));
  octave.frequency.value = frequency * 2;
  sway(ctx, octave.detune, 0.21, OCTAVE_DRIFT_CENTS, start, sources);
  const octaveLevel = ctx.createGain();
  octaveLevel.gain.value = OCTAVE_LEVEL * Math.sqrt(CHOIR_DETUNE.length);
  octave.connect(octaveLevel).connect(choir);
  octave.start(start);
  sources.push(octave);
  choir.connect(dry);

  // Air, swelling slowly.
  const air = ctx.createGain();
  air.gain.value = AIR_LEVEL * 0.8;
  sway(ctx, air.gain, 0.4, AIR_LEVEL * 0.2, start, sources);
  bandedNoise(ctx, AIR_BANDS, air, start, sources);
  air.connect(dry);

  // The student's volume, then the swell in and the fade out.
  const loudness = ctx.createGain();
  loudness.gain.value = volume;
  const swell = ctx.createGain();
  swell.gain.value = 0;
  swell.gain.setValueCurveAtTime(sCurve(0, OUTPUT_GAIN), start, SWELL_S);
  // The fade out has a gain of its own, so stopping never has to cut into the swell's curve.
  const envelope = ctx.createGain();
  envelope.gain.value = 1;
  dry.connect(loudness).connect(swell).connect(envelope);

  // Chorus: the dry sound in the middle, two swung delay lines left and right; the room behind.
  const merger = ctx.createChannelMerger(2);
  for (const [channel, direction] of [
    [0, 1],
    [1, -1],
  ] as const) {
    const side = ctx.createGain();
    side.gain.value = CHORUS_DRY;
    envelope.connect(side).connect(merger, 0, channel);
    const line = ctx.createDelay(0.05);
    line.delayTime.value = CHORUS_DELAY_S;
    sway(ctx, line.delayTime, CHORUS_RATE_HZ, CHORUS_SWING_S * direction, start, sources);
    const wet = ctx.createGain();
    wet.gain.value = CHORUS_WET;
    envelope.connect(line).connect(wet).connect(merger, 0, channel);
  }
  const reverb = ctx.createConvolver();
  reverb.buffer = room(ctx);
  const roomLevel = ctx.createGain();
  roomLevel.gain.value = ROOM_LEVEL;
  envelope.connect(reverb).connect(roomLevel);
  const output = ctx.createGain();
  merger.connect(output);
  roomLevel.connect(output);
  output.connect(ctx.destination);

  let stopped = false;
  return {
    stop() {
      if (stopped) return;
      stopped = true;
      const now = ctx.currentTime;
      envelope.gain.setValueCurveAtTime(sCurve(1, 0), now, RELEASE_S);
      for (const source of sources) source.stop(now + RELEASE_S);
      // Let the room ring out, then let go of the nodes.
      setTimeout(() => output.disconnect(), (RELEASE_S + ROOM_S + 0.1) * 1000);
    },
    setVolume(next: number) {
      if (stopped) return;
      loudness.gain.setTargetAtTime(next, ctx.currentTime, VOLUME_GLIDE_S);
    },
  };
}
