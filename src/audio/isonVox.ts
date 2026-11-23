import type { PlayingSound } from "./AudioOutput";

/**
 * The Ison's voice: a seven-voice male choir singing "o", built live from Web Audio nodes so it holds as long
 * as the student wants, on any pitch, and needs no recordings.
 *
 * - Seven male glottal voices are spread symmetrically around the Degree's pitch across the stereo field (with
 *   subtle arrival-time offsets and independent harmonic phases), each drifting gently and breathing at its own
 *   slow pace, so the ensemble stays centred strictly on the Degree.
 * - The choir passes through stereo male "o" formant resonators (F1, F2, F3) and a soft low-pass filter, then
 *   an opposing stereo chorus and a light stone room.
 * - Starting from silence swells in gently over 1.5 s; switching directly from one Degree to another while the
 *   Ison is already sounding crossfades in 80 ms so the pitch changes cleanly right on the beat even at quick tempi.
 */

/** Gentle swell from silence; fast legato crossfade when moving to another Degree while sounding. */
const SWELL_S = 1.5;
const RELEASE_S = 0.6;
const LEGATO_CROSSFADE_S = 0.08;
/** A new Ison started within this window after the last one stopped is treated as a Degree switch. */
const LEGATO_HANDOFF_MS = 120;

const CURVE_POINTS = 64;
const VOLUME_GLIDE_S = 0.05;
const TOP_HZ = 5600;
const ROOM_SECONDS = 3.3;
const ROOM_DARK_HZ = 1750;
/** Overall level, calibrated so the Ison blends warmly under the Degrees and metronome clicks. */
const OUTPUT_GAIN = 0.36;

// Tuned by ear (vowel=48, brightness=75, breath=0, width=99, reverb=22, warmth=0).
const VOWEL = 0.48;
const BRIGHTNESS = 0.75;
const WIDTH = 0.99;
const REVERB = 0.22;
const WARMTH = 0.0;

interface SingerSpec {
  detuneCents: number;
  pan: number;
  haasDelayS: number;
  level: number;
  driftRate1: number;
  driftRate2: number;
  driftCents: number;
  tremorHz: number;
  tremorCents: number;
  breathRateHz: number;
  breathDepth: number;
  seed: number;
  isCenter?: boolean;
}

/** Seven male voices spread symmetrically around 0 cents (detune sum = 0). */
const SINGERS: readonly SingerSpec[] = [
  { detuneCents: -7.0, pan: -0.78, haasDelayS: 0.017, level: 0.82, driftRate1: 0.11, driftRate2: 0.27, driftCents: 1.25, tremorHz: 4.8, tremorCents: 0.38, breathRateHz: 0.095, breathDepth: 0.26, seed: 11 },
  { detuneCents: -4.2, pan: -0.48, haasDelayS: 0.01, level: 0.92, driftRate1: 0.15, driftRate2: 0.33, driftCents: 1.1, tremorHz: 5.1, tremorCents: 0.35, breathRateHz: 0.135, breathDepth: 0.22, seed: 23 },
  { detuneCents: -1.8, pan: -0.22, haasDelayS: 0.004, level: 1.0, driftRate1: 0.13, driftRate2: 0.31, driftCents: 0.9, tremorHz: 5.0, tremorCents: 0.3, breathRateHz: 0.165, breathDepth: 0.18, seed: 31 },
  { detuneCents: 0, pan: 0, haasDelayS: 0, level: 1.0, driftRate1: 0.09, driftRate2: 0.24, driftCents: 0.55, tremorHz: 4.9, tremorCents: 0.25, breathRateHz: 0.115, breathDepth: 0.14, seed: 37, isCenter: true },
  { detuneCents: 1.8, pan: 0.22, haasDelayS: 0.005, level: 1.0, driftRate1: 0.16, driftRate2: 0.36, driftCents: 0.9, tremorHz: 5.3, tremorCents: 0.3, breathRateHz: 0.145, breathDepth: 0.18, seed: 47 },
  { detuneCents: 4.2, pan: 0.48, haasDelayS: 0.011, level: 0.92, driftRate1: 0.14, driftRate2: 0.29, driftCents: 1.1, tremorHz: 5.2, tremorCents: 0.35, breathRateHz: 0.125, breathDepth: 0.22, seed: 53 },
  { detuneCents: 7.0, pan: 0.78, haasDelayS: 0.018, level: 0.82, driftRate1: 0.12, driftRate2: 0.34, driftCents: 1.25, tremorHz: 4.7, tremorCents: 0.38, breathRateHz: 0.105, breathDepth: 0.26, seed: 71 },
];

/** Remembers the Ison that just stopped so an immediate Degree switch crossfades cleanly in 80 ms. */
interface FadingVoice {
  ctx: BaseAudioContext;
  stoppedAtMs: number;
  shortenRelease: () => void;
}
let lastStopped: FadingVoice | null = null;

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/** Deterministic per-singer harmonic phase so voices blend without synthetic phasing sweeps. */
function harmonicPhase(seed: number, k: number): number {
  const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453123;
  return (x - Math.floor(x)) * Math.PI * 2;
}

/** Glottal flow derivative harmonics scaled to an RMS of 1. */
function glottalWave(ctx: BaseAudioContext, fundamentalHz: number, seed: number): PeriodicWave {
  const count = Math.max(2, Math.min(52, Math.floor(TOP_HZ / fundamentalHz)));
  const amps = new Float64Array(count);
  let sumSq = 0;
  for (let i = 0; i < count; i++) {
    const k = i + 1;
    const f = k * fundamentalHz;
    const chest = k <= 2 ? 1.28 - 0.12 * k : 1;
    const returnRoll = 1 / Math.sqrt(1 + (f / 2500) ** 2);
    const lowTrim = f < 70 ? 0.65 + (0.35 * f) / 70 : 1;
    const amp = (chest / k ** 1.28) * returnRoll * lowTrim;
    amps[i] = amp;
    sumSq += amp * amp;
  }
  const rms = Math.sqrt(sumSq / 2) || 1;
  const real = new Float32Array(count + 1);
  const imag = new Float32Array(count + 1);
  for (let i = 0; i < count; i++) {
    const k = i + 1;
    const norm = amps[i]! / rms;
    const phi = harmonicPhase(seed, k);
    real[k] = norm * Math.cos(phi);
    imag[k] = norm * Math.sin(phi);
  }
  return ctx.createPeriodicWave(real, imag, { disableNormalization: true });
}

/** A slow sine that swings `param` by ±`depth` around its value. */
function sway(
  ctx: BaseAudioContext,
  param: AudioParam,
  rateHz: number,
  depth: number,
  at: number,
  nodes: AudioScheduledSourceNode[],
) {
  const lfo = ctx.createOscillator();
  lfo.frequency.value = rateHz;
  const amount = ctx.createGain();
  amount.gain.value = depth;
  lfo.connect(amount).connect(param);
  lfo.start(at);
  nodes.push(lfo);
}

/** A stone room: stereo early reflections and a warm darkened tail, made once per context. */
const rooms = new WeakMap<BaseAudioContext, AudioBuffer>();
function room(ctx: BaseAudioContext): AudioBuffer {
  let buffer = rooms.get(ctx);
  if (!buffer) {
    const sr = ctx.sampleRate;
    const length = Math.floor(ROOM_SECONDS * sr);
    buffer = ctx.createBuffer(2, length, sr);
    const decay = ROOM_SECONDS / 6.5;
    const smooth = Math.exp((-2 * Math.PI * ROOM_DARK_HZ) / sr);
    const tailFadeSamples = Math.floor(0.065 * sr);

    const earlyL: readonly [number, number][] = [
      [16, 0.24],
      [27, -0.21],
      [41, 0.18],
      [58, -0.15],
      [76, 0.12],
    ];
    const earlyR: readonly [number, number][] = [
      [19, 0.23],
      [32, -0.2],
      [46, 0.17],
      [64, -0.14],
      [84, 0.11],
    ];

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let a = 0;
      let b = 0;
      let c = 0;
      for (let i = 0; i < length; i++) {
        const t = i / sr;
        const n = Math.random() * 2 - 1;
        a = smooth * a + (1 - smooth) * n;
        b = smooth * b + (1 - smooth) * a;
        c = 0.88 * c + 0.12 * b;
        const env = Math.exp(-t / decay) * Math.min(1, i / tailFadeSamples);
        data[i] = (0.45 * b + 0.55 * c) * env;
      }
      const reflections = ch === 0 ? earlyL : earlyR;
      for (const [ms, amp] of reflections) {
        const idx = Math.floor((ms / 1000) * sr);
        if (idx + 2 < length) {
          data[idx] = (data[idx] ?? 0) + amp * 0.25;
          data[idx + 1] = (data[idx + 1] ?? 0) + amp * 0.5;
          data[idx + 2] = (data[idx + 2] ?? 0) + amp * 0.25;
        }
      }
    }
    rooms.set(ctx, buffer);
  }
  return buffer;
}

/** A sine-squared curve from `from` to `to`: gentle at both ends. */
function sCurve(from: number, to: number): Float32Array {
  return Float32Array.from(
    { length: CURVE_POINTS },
    (_, i) => from + (to - from) * Math.sin(((i / (CURVE_POINTS - 1)) * Math.PI) / 2) ** 2,
  );
}

/** Routes a mono voice into a stereo ChannelMerger with constant-power panning (-1..+1). */
function connectPanned(ctx: BaseAudioContext, source: AudioNode, merger: ChannelMergerNode, pan: number, gainValue = 1) {
  const angle = ((pan + 1) * Math.PI) / 4;
  const left = ctx.createGain();
  const right = ctx.createGain();
  left.gain.value = Math.cos(angle) * gainValue;
  right.gain.value = Math.sin(angle) * gainValue;
  source.connect(left).connect(merger, 0, 0);
  source.connect(right).connect(merger, 0, 1);
}

/** The Ison's vox on a given context, at `frequency`, held until stopped. */
export function playIsonVox(ctx: BaseAudioContext, frequency: number, volume: number, startMs = 0): PlayingSound {
  const start = ctx.currentTime + startMs / 1000;
  const sources: AudioScheduledSourceNode[] = [];

  // If the previous Ison stopped moments ago on this context, crossfade rapidly to the new Degree.
  let legato = false;
  if (lastStopped && lastStopped.ctx === ctx && nowMs() - lastStopped.stoppedAtMs <= LEGATO_HANDOFF_MS) {
    legato = true;
    lastStopped.shortenRelease();
  }
  lastStopped = null;

  const reg = frequency > 250 ? 1 + Math.min(0.14, (frequency - 250) / 1400) : 1;
  const f1 = (325 + VOWEL * 220) * reg;
  const f2 = (600 + VOWEL * 390) * reg;
  const f3 = (2200 + VOWEL * 320) * reg;
  const velvetHz = 680 * Math.pow(4200 / 680, BRIGHTNESS);
  const f3GainVal = 0.015 + BRIGHTNESS * BRIGHTNESS * 0.24;
  const centerLevel = 1.0 - WIDTH * 0.42;
  const outerLevel = WIDTH * 0.92;
  const chorusWet = WIDTH * 0.52;
  const roomWet = REVERB * 1.1;
  const roomDry = 1.0 - REVERB * 0.24;
  const chestShelfDb = -2.5 + WARMTH * 10.0;

  const centerBus = ctx.createChannelMerger(2);
  const outerBus = ctx.createChannelMerger(2);
  const centerGain = ctx.createGain();
  centerGain.gain.value = centerLevel;
  const outerGain = ctx.createGain();
  outerGain.gain.value = outerLevel;

  const outerNorm = 1 / Math.sqrt(SINGERS.filter((s) => !s.isCenter).reduce((s, v) => s + v.level * v.level, 0) || 1);

  for (const singer of SINGERS) {
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(glottalWave(ctx, frequency, singer.seed));
    osc.frequency.value = frequency;
    osc.detune.value = singer.detuneCents;

    sway(ctx, osc.detune, singer.driftRate1, singer.driftCents * 0.65, start, sources);
    sway(ctx, osc.detune, singer.driftRate2, singer.driftCents * 0.35, start, sources);
    sway(ctx, osc.detune, singer.tremorHz, singer.tremorCents, start, sources);

    const voiceGain = ctx.createGain();
    const baseLevel = singer.isCenter ? 1 : singer.level * outerNorm;
    voiceGain.gain.value = baseLevel;
    sway(ctx, voiceGain.gain, singer.breathRateHz, baseLevel * singer.breathDepth, start, sources);

    let chainEnd: AudioNode = osc.connect(voiceGain);
    if (singer.haasDelayS > 0) {
      const haas = ctx.createDelay(0.05);
      haas.delayTime.value = singer.haasDelayS;
      chainEnd = chainEnd.connect(haas);
    }
    connectPanned(ctx, chainEnd, singer.isCenter ? centerBus : outerBus, singer.pan, 1);
    osc.start(start);
    sources.push(osc);
  }

  const choirSum = ctx.createGain();
  centerBus.connect(centerGain).connect(choirSum);
  outerBus.connect(outerGain).connect(choirSum);

  // Male "o" vocal tract: parallel chest path and F1, F2, F3 formant resonators.
  const tractOut = ctx.createGain();

  const chestPath = ctx.createBiquadFilter();
  chestPath.type = "lowpass";
  chestPath.frequency.value = 290;
  chestPath.Q.value = 0.6;
  const chestGain = ctx.createGain();
  chestGain.gain.value = 0.52;
  choirSum.connect(chestPath).connect(chestGain).connect(tractOut);

  const f1Filter = ctx.createBiquadFilter();
  f1Filter.type = "bandpass";
  f1Filter.frequency.value = f1;
  f1Filter.Q.value = 3.1;
  const f1Gain = ctx.createGain();
  f1Gain.gain.value = 1.45;
  choirSum.connect(f1Filter).connect(f1Gain).connect(tractOut);

  const f2Filter = ctx.createBiquadFilter();
  f2Filter.type = "bandpass";
  f2Filter.frequency.value = f2;
  f2Filter.Q.value = 3.6;
  const f2Gain = ctx.createGain();
  f2Gain.gain.value = 0.92;
  choirSum.connect(f2Filter).connect(f2Gain).connect(tractOut);

  const f3Filter = ctx.createBiquadFilter();
  f3Filter.type = "bandpass";
  f3Filter.frequency.value = f3;
  f3Filter.Q.value = 5.5;
  const f3Gain = ctx.createGain();
  f3Gain.gain.value = f3GainVal;
  choirSum.connect(f3Filter).connect(f3Gain).connect(tractOut);

  const warmthShelf = ctx.createBiquadFilter();
  warmthShelf.type = "lowshelf";
  warmthShelf.frequency.value = 280;
  warmthShelf.gain.value = chestShelfDb;

  const velvetLP = ctx.createBiquadFilter();
  velvetLP.type = "lowpass";
  velvetLP.frequency.value = velvetHz;
  velvetLP.Q.value = 0.55;
  sway(ctx, velvetLP.frequency, 0.14, 30, start, sources);

  const loudness = ctx.createGain();
  loudness.gain.value = volume;

  const swell = ctx.createGain();
  swell.gain.value = 0;
  swell.gain.setValueCurveAtTime(sCurve(0, OUTPUT_GAIN), start, legato ? LEGATO_CROSSFADE_S : SWELL_S);

  // The fade out has a gain of its own, so stopping never has to cut into the swell's curve.
  const envelope = ctx.createGain();
  envelope.gain.value = 1;

  tractOut.connect(warmthShelf).connect(velvetLP).connect(loudness).connect(swell).connect(envelope);

  // Stereo-preserving opposing chorus.
  const splitter = ctx.createChannelSplitter(2);
  envelope.connect(splitter);
  const chorusOut = ctx.createChannelMerger(2);
  for (const [channel, direction] of [
    [0, 1],
    [1, -1],
  ] as const) {
    const drySide = ctx.createGain();
    drySide.gain.value = 0.85;
    splitter.connect(drySide, channel, 0);
    drySide.connect(chorusOut, 0, channel);

    const line = ctx.createDelay(0.05);
    line.delayTime.value = 0.0068;
    sway(ctx, line.delayTime, 0.26, 0.0023 * direction, start, sources);
    const wetSide = ctx.createGain();
    wetSide.gain.value = chorusWet;
    splitter.connect(line, channel, 0);
    line.connect(wetSide).connect(chorusOut, 0, channel);
  }

  // Light stone room behind the choir.
  const preDelay = ctx.createDelay(0.1);
  preDelay.delayTime.value = 0.03;
  const reverb = ctx.createConvolver();
  reverb.buffer = room(ctx);
  const wetGain = ctx.createGain();
  wetGain.gain.value = roomWet;
  const dryBus = ctx.createGain();
  dryBus.gain.value = roomDry;

  const output = ctx.createGain();
  chorusOut.connect(dryBus).connect(output);
  chorusOut.connect(preDelay).connect(reverb).connect(wetGain).connect(output);
  output.connect(ctx.destination);

  let stopped = false;
  let disconnectTimer: ReturnType<typeof setTimeout> | undefined;

  return {
    stop() {
      if (stopped) return;
      stopped = true;
      const now = ctx.currentTime;
      envelope.gain.cancelScheduledValues(now);
      envelope.gain.setValueCurveAtTime(sCurve(1, 0), now, RELEASE_S);
      for (const source of sources) source.stop(now + RELEASE_S);
      disconnectTimer = setTimeout(() => output.disconnect(), (RELEASE_S + ROOM_SECONDS + 0.2) * 1000);

      lastStopped = {
        ctx,
        stoppedAtMs: nowMs(),
        shortenRelease() {
          const t = ctx.currentTime;
          envelope.gain.cancelScheduledValues(t);
          envelope.gain.setValueCurveAtTime(sCurve(1, 0), t, LEGATO_CROSSFADE_S);
          if (disconnectTimer !== undefined) clearTimeout(disconnectTimer);
          disconnectTimer = setTimeout(() => output.disconnect(), (LEGATO_CROSSFADE_S + ROOM_SECONDS + 0.2) * 1000);
        },
      };
    },
    setVolume(next: number) {
      if (stopped) return;
      loudness.gain.setTargetAtTime(next, ctx.currentTime, VOLUME_GLIDE_S);
    },
  };
}
