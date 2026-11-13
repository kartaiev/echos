import type { AudioOutput, ClickTrackRequest, PlayingClickTrack, PlayingSound, SoundRequest } from "./AudioOutput";
import { applyAudioSession } from "./audioSession";

/**
 * The soft tone: a fundamental with a few overtones, with no vibrato or drift, so its pitch is exact and
 * intervals can be checked by ear. It sings no vowel; a sung voice comes later from recordings.
 */
const SOFT_TONE_HARMONICS = [1, 0.42, 0.24, 0.14, 0.08, 0.05, 0.03];

const ATTACK_S = 0.05;
const RELEASE_S = 0.15;
/** The wave is scaled to a peak of 1; the Ison, a Degree and a click may sound together without clipping. */
const PEAK_GAIN = 0.3;
/** Fade-out when a sound is cut off by the next one. */
const CUT_OFF_S = 0.03;
/** How quickly a volume change settles (time constant). */
const VOLUME_GLIDE_S = 0.05;

/** Clicks are short wooden-sounding blips; the accent is higher and louder. */
const CLICK_HZ = 1320;
const ACCENT_HZ = 1760;
const CLICK_GAIN = 0.3;
const ACCENT_GAIN = 0.55;
const CLICK_DECAY_S = 0.04;
/** The first click waits a moment so its attack is not cut off. */
const FIRST_CLICK_DELAY_S = 0.05;
/**
 * Clicks are placed on the audio clock a little ahead of time, from a timer that wakes every 25 ms; timers can
 * be late, the audio clock never is. Hidden pages wake their timers about once a second, so they look further ahead.
 */
const SCHEDULER_INTERVAL_MS = 25;
const LOOKAHEAD_S = 0.2;
const HIDDEN_LOOKAHEAD_S = 1.5;

/** One AudioContext for the whole page, created and resumed inside a user gesture, as browsers require. */
let context: AudioContext | null = null;

/**
 * When the context was asked to resume (by a gesture, or by the page coming back into view) and still is not
 * running a second later, iOS has left it stuck after an interruption; the next gesture then builds a fresh context.
 */
const STUCK_AFTER_MS = 1000;
/** When the current context was first asked to resume without success; null while it runs. */
let resumeAskedAt: number | null = null;

/**
 * Sounds that last until they are stopped (the Ison) and the metronome. A fresh context starts in silence, so each
 * of these is built again on it: the student hears what was sounding before the interruption.
 */
interface Lasting {
  moveTo(ctx: AudioContext): void;
}
const lasting = new Set<Lasting>();

/**
 * The page's AudioContext, started if it is not running. Safari stops it as "interrupted" when the student switches
 * to another app or takes a call, and as "suspended" before the first gesture; both resume here.
 */
function getContext(fromGesture = false) {
  // iPhones mute Web Audio when the ring/silent switch is on, unless the page says it plays media.
  applyAudioSession();
  const stuck = fromGesture && context !== null && context.state !== "running" && resumeAskedAt !== null
    && performance.now() - resumeAskedAt > STUCK_AFTER_MS;
  const replaced = context !== null && (stuck || context.state === "closed");
  if (stuck) void context!.close().catch(() => {});
  if (!context || replaced) {
    context = new AudioContext();
    resumeAskedAt = null;
    if (replaced) for (const sound of lasting) sound.moveTo(context);
  }
  const ctx = context;
  if (ctx.state === "running") {
    resumeAskedAt = null;
  } else {
    if (fromGesture) resumeAskedAt ??= performance.now();
    ctx.resume().then(
      () => {
        if (ctx === context && ctx.state === "running") resumeAskedAt = null;
      },
      () => {},
    );
  }
  return ctx;
}

let unlockListening = false;

/**
 * Touch browsers only let audio start inside a gesture, and a long press starts the Ison from a timer, outside one.
 * So every touch, click or key wakes the context: a sound started while it slept begins on the finger's lift, and
 * the first touch after returning from another app brings the sound back. Coming back to the page tries too.
 */
function listenForUnlock() {
  if (unlockListening) return;
  unlockListening = true;
  for (const type of ["pointerdown", "pointerup", "touchend", "keydown"]) {
    window.addEventListener(type, () => getContext(true), { capture: true });
  }
  // Coming back counts as asking: if the context is still stopped a second later, the next touch rebuilds it.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || !context) return;
    if (context.state !== "running") resumeAskedAt ??= performance.now();
    getContext();
  });
}

function scheduleClick(ctx: AudioContext, output: AudioNode, at: number, accent: boolean) {
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = accent ? ACCENT_HZ : CLICK_HZ;
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, at);
  envelope.gain.linearRampToValueAtTime(accent ? ACCENT_GAIN : CLICK_GAIN, at + 0.002);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + CLICK_DECAY_S);
  osc.connect(envelope).connect(output);
  osc.start(at);
  osc.stop(at + CLICK_DECAY_S + 0.01);
}

/**
 * The metronome: its own output node, so it never touches the voices that sound beside it. If the context is
 * replaced it starts again on the new one from the first of the group, as a tempo change does.
 */
function playClickTrack({ intervalMs, accentEvery }: ClickTrackRequest): PlayingClickTrack {
  const interval = intervalMs / 1000;
  let ctx!: AudioContext;
  let output!: GainNode;
  let first = 0;
  let index = 0;
  let timer = 0;

  function schedule() {
    const horizon = ctx.currentTime + (document.hidden ? HIDDEN_LOOKAHEAD_S : LOOKAHEAD_S);
    // Each click time is counted from the first, so small timer delays never add up to drift.
    for (let at = first + index * interval; at < horizon; at = first + index * interval) {
      scheduleClick(ctx, output, at, index % accentEvery === 0);
      index += 1;
    }
  }

  function startOn(next: AudioContext) {
    clearInterval(timer);
    ctx = next;
    first = ctx.currentTime + FIRST_CLICK_DELAY_S;
    output = ctx.createGain();
    output.connect(ctx.destination);
    index = 0;
    schedule();
    timer = window.setInterval(schedule, SCHEDULER_INTERVAL_MS);
  }

  const track: Lasting = { moveTo: startOn };
  startOn(getContext());
  lasting.add(track);
  let stopped = false;

  return {
    stop() {
      if (stopped) return;
      stopped = true;
      lasting.delete(track);
      clearInterval(timer);
      // Silence clicks already placed ahead, then let go of the node.
      const placed = output;
      const now = ctx.currentTime;
      placed.gain.setValueAtTime(placed.gain.value, now);
      placed.gain.linearRampToValueAtTime(0, now + 0.01);
      setTimeout(() => placed.disconnect(), (HIDDEN_LOOKAHEAD_S + 0.1) * 1000);
    },
    elapsedMs() {
      // What is heard now left the audio clock one output latency ago.
      const latency = ctx.outputLatency || ctx.baseLatency || 0;
      return (ctx.currentTime - latency - first) * 1000;
    },
  };
}

/** The soft tone's wave, made once per context. */
const softWaves = new WeakMap<AudioContext, PeriodicWave>();
function softWave(ctx: AudioContext) {
  let wave = softWaves.get(ctx);
  if (!wave) {
    const imag = new Float32Array([0, ...SOFT_TONE_HARMONICS]);
    wave = ctx.createPeriodicWave(new Float32Array(imag.length), imag);
    softWaves.set(ctx, wave);
  }
  return wave;
}

/** One sound on a given context: the soft tone under an envelope. */
function playTone(ctx: AudioContext, sound: SoundRequest): PlayingSound {
  const start = ctx.currentTime + (sound.startMs ?? 0) / 1000;
  const end = sound.durationMs === null ? null : start + sound.durationMs / 1000;

  const source = ctx.createOscillator();
  source.setPeriodicWave(softWave(ctx));
  source.frequency.value = sound.frequency;

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(PEAK_GAIN, start + ATTACK_S);
  if (end !== null) {
    envelope.gain.setValueAtTime(PEAK_GAIN, end);
    envelope.gain.linearRampToValueAtTime(0, end + RELEASE_S);
  }
  envelope.connect(ctx.destination);

  const loudness = ctx.createGain();
  loudness.gain.value = sound.volume;
  loudness.connect(envelope);

  source.connect(loudness);

  source.start(start);
  if (end !== null) source.stop(end + RELEASE_S);

  const finished = () => end !== null && ctx.currentTime >= end + RELEASE_S;
  let stopped = false;

  return {
    stop() {
      if (stopped || finished()) return;
      stopped = true;
      const now = ctx.currentTime;
      // Hold the current level, then fade out fast enough to avoid overlap but slow enough to avoid a click.
      envelope.gain.cancelScheduledValues(now);
      envelope.gain.setValueAtTime(envelope.gain.value, now);
      envelope.gain.linearRampToValueAtTime(0, now + CUT_OFF_S);
      source.stop(now + CUT_OFF_S);
    },
    setVolume(volume: number) {
      if (stopped || finished()) return;
      loudness.gain.setTargetAtTime(volume, ctx.currentTime, VOLUME_GLIDE_S);
    },
  };
}

/** Real sound in the browser. */
export function createWebAudioOutput(): AudioOutput {
  listenForUnlock();

  return {
    playClickTrack,
    // Before anything has been played there is nothing to hear yet, so nothing is held back either.
    isRunning: () => context === null || context.state === "running",
    playSound(sound: SoundRequest): PlayingSound {
      let current = sound;
      let voice = playTone(getContext(), current);
      // A sound held until stopped (the Ison) starts again on a fresh context; a timed one is over by then.
      const held: Lasting | null =
        sound.durationMs === null ? { moveTo: (ctx) => (voice = playTone(ctx, { ...current, startMs: 0 })) } : null;
      if (held) lasting.add(held);
      return {
        stop() {
          if (held) lasting.delete(held);
          voice.stop();
        },
        setVolume(volume: number) {
          current = { ...current, volume };
          voice.setVolume(volume);
        },
      };
    },
  };
}
