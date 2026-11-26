import type { AudioOutput, ClickTrackRequest, PlayingClickTrack, PlayingSound, SoundRequest } from "./AudioOutput";
import { applyAudioSession, audioSession, renewAudioSession } from "./audioSession";
import { playIsonVox } from "./isonVox";
import { logSound } from "./soundLog";

/**
 * The soft tone of the Degrees and the intonation: a fundamental with a few overtones, with no vibrato or drift, so
 * its pitch is exact and intervals can be checked by ear. The Ison has a voice of its own (`isonVox.ts`).
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
 * An app switch on an iPhone interrupts the context, and on return iOS can report it "running" again while it stays
 * silent: nothing looks stopped, so neither the notice nor the rebuild above would happen. So a context that comes
 * back through an app switch is not trusted: the next gesture builds a fresh one and moves the lasting sounds to it.
 * - `distrusted`: the next gesture replaces the context.
 * - `knownSilent`: the context is known to have stopped (interrupted while away, or its clock stands still), so the
 *   sound counts as held back and the "No sound" notice shows until a gesture replaces it.
 */
let distrusted = false;
let knownSilent = false;
/** When the page was last hidden, and when the context last left "running"; null if it has not since. */
let hiddenAt: number | null = null;
let leftRunningAt: number | null = null;
/** An interruption this close before the page hides still belongs to the app switch. */
const AROUND_HIDING_MS = 1000;
/** How long after coming back the audio clock must have moved, if the context says it runs. */
const CLOCK_CHECK_MS = 500;

/** Safari (the only browser with navigator.audioSession) is where a context comes back silent. */
const isSafari = () => "audioSession" in navigator;

/** Contexts are numbered in the sound log, so a rebuild can be told apart from the context it replaced. */
const contextNumbers = new WeakMap<AudioContext, number>();
let contextsMade = 0;
const nameOf = (ctx: AudioContext) => `context ${contextNumbers.get(ctx) ?? "?"}`;

function watchState(ctx: AudioContext) {
  ctx.onstatechange = () => {
    logSound(`${nameOf(ctx)} ${ctx.state}`);
    if (ctx === context && ctx.state !== "running" && ctx.state !== "closed") leftRunningAt = performance.now();
  };
}

/** The sound is known to have stopped: the notice shows, and the next gesture builds a fresh context. */
function markSilent(why: string) {
  if (!knownSilent) logSound(`silent: ${why}`);
  distrusted = true;
  knownSilent = true;
}

/** A context that says it runs while its clock stands still is silent. */
function checkClock(ctx: AudioContext) {
  const before = ctx.currentTime;
  setTimeout(() => {
    if (ctx !== context || ctx.state !== "running" || ctx.currentTime !== before) return;
    markSilent(`${nameOf(ctx)} clock stands at ${before.toFixed(2)}`);
  }, CLOCK_CHECK_MS);
}

/**
 * The clock as last looked at while a lasting sound plays; each look compares it with the one before, so a context
 * that went silent while saying it runs is found whenever the notice asks, not only right after the page comes back.
 */
let clockSeen: { ctx: AudioContext; time: number; at: number } | null = null;
const CLOCK_LOOK_GAP_MS = 300;
function clockStandsStill(ctx: AudioContext) {
  const at = performance.now();
  const seen = clockSeen;
  clockSeen = { ctx, time: ctx.currentTime, at };
  return seen !== null && seen.ctx === ctx && at - seen.at >= CLOCK_LOOK_GAP_MS && ctx.currentTime === seen.time;
}

/**
 * A short silent clip played inside the gesture that rebuilds the sound. Starting a media element from a touch is
 * what an iPhone takes as the page wanting its sound back after another app took it; a new AudioContext alone may
 * keep playing into a session that stays interrupted.
 */
let silentClip: HTMLAudioElement | null = null;
function playSilentClip() {
  if (typeof Audio === "undefined" || typeof Blob === "undefined" || typeof URL?.createObjectURL !== "function") return;
  try {
    if (!silentClip) {
      silentClip = new Audio(URL.createObjectURL(new Blob([silentWav()], { type: "audio/wav" })));
      silentClip.setAttribute("playsinline", "");
    }
    silentClip.currentTime = 0;
    const playing = silentClip.play();
    playing?.then(
      () => logSound("silent clip played"),
      (error: unknown) => logSound(`silent clip refused: ${String(error)}`),
    );
  } catch (error) {
    logSound(`silent clip failed: ${String(error)}`);
  }
}

/** A tenth of a second of silence as an 8 kHz, 8-bit mono WAV. */
function silentWav() {
  const rate = 8000;
  const samples = 800;
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const text = (at: number, value: string) => [...value].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  text(36, "data");
  view.setUint32(40, samples, true);
  bytes.fill(0x80, 44);
  return bytes;
}

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
  const untrusted = fromGesture && context !== null && distrusted;
  if (!context) makeContext("first sound");
  else if (stuck || untrusted || context.state === "closed") {
    replaceContext(stuck ? "stuck" : untrusted ? "after the page was away" : "closed", fromGesture);
  }
  const ctx = context!;
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

function makeContext(why: string) {
  const ctx = new AudioContext();
  context = ctx;
  contextNumbers.set(ctx, ++contextsMade);
  logSound(`${nameOf(ctx)} made (${why}), ${ctx.state}, session ${sessionState()}`);
  watchState(ctx);
  clockSeen = null;
  resumeAskedAt = null;
  distrusted = false;
  knownSilent = false;
  leftRunningAt = null;
  return ctx;
}

/** A fresh context in place of the current one, with the lasting sounds moved onto it. */
function replaceContext(why: string, inGesture: boolean) {
  const old = context;
  if (isSafari()) {
    // A fresh context does not help while the page's session stays interrupted: ask for the session again, and
    // inside a gesture start a media element too.
    renewAudioSession();
    if (inGesture) playSilentClip();
  }
  const ctx = makeContext(why);
  for (const sound of lasting) sound.moveTo(ctx);
  seeStarted(ctx, old);
  return ctx;
}

/** When a fresh context that has not started yet is asked again, counted from the one before. */
const ASK_AGAIN_AFTER_MS = [250, 500, 750, 1500];

/**
 * Sees a fresh context through to running. On an iPhone it can stay suspended after the first ask, even inside a
 * touch, so it is asked again a few times. The context it replaces is closed only once the fresh one runs (or the
 * asking ends): closing it first lets go of the iPhone's audio session just as the fresh one asks for it, and the
 * fresh one then never started without a second touch.
 */
function seeStarted(ctx: AudioContext, old: AudioContext | null) {
  let asked = 0;
  const look = () => {
    if (ctx.state === "running" || ctx !== context || asked >= ASK_AGAIN_AFTER_MS.length) {
      if (old && old.state !== "closed") void old.close().catch(() => {});
      return;
    }
    if (asked > 0) {
      logSound(`${nameOf(ctx)} still ${ctx.state}, asking again`);
      void ctx.resume().catch(() => {});
    }
    setTimeout(look, ASK_AGAIN_AFTER_MS[asked++]);
  };
  look();
}

/**
 * Brings a lasting sound back by itself when the singer returns from another app, so no touch is needed. First the
 * context that was already allowed to sound: stopping and starting it again makes Safari ask for the audio session
 * anew. If its clock still stands, a fresh context with the sounds moved onto it. Only if that stays silent too does
 * the notice ask for a touch. Meanwhile the notice waits.
 */
let reviving = false;
const REVIVE_CHECK_MS = 500;
const REVIVE_STEP_MS = 1000;

async function revive() {
  if (reviving || !context) return;
  reviving = true;
  try {
    const ctx = context;
    logSound(`reviving ${nameOf(ctx)} (${ctx.state} at ${ctx.currentTime.toFixed(2)})`);
    renewAudioSession();
    await settle(ctx.suspend());
    await settle(ctx.resume());
    if (await sounds(ctx)) return revived(ctx, "resumed");
    if (ctx !== context) return;
    const fresh = replaceContext("on return", false);
    await settle(fresh.resume());
    if (await sounds(fresh)) return revived(fresh, "rebuilt");
    if (fresh === context) markSilent("could not bring the sound back without a touch");
  } finally {
    reviving = false;
  }
}

/** Waits for a context's suspend or resume, but not forever: an interrupted one may never answer. */
function settle(promise: Promise<void>) {
  return Promise.race([promise.catch(() => {}), new Promise<void>((done) => setTimeout(done, REVIVE_STEP_MS))]);
}

/** Whether the context is still the page's and its clock moves. */
function sounds(ctx: AudioContext) {
  const before = ctx.currentTime;
  return new Promise<boolean>((done) =>
    setTimeout(() => done(ctx === context && ctx.state === "running" && ctx.currentTime !== before), REVIVE_CHECK_MS),
  );
}

function revived(ctx: AudioContext, how: string) {
  if (ctx !== context) return;
  distrusted = false;
  knownSilent = false;
  clockSeen = null;
  logSound(`sound back by itself (${how}), ${nameOf(ctx)} at ${ctx.currentTime.toFixed(2)}`);
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
  // Coming back from an interruption, or to a lasting sound in Safari, the next touch rebuilds it in any case.
  // An app opened from the home screen does not always say it was hidden, so losing focus counts as leaving too.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") wentAway("hidden");
    else cameBack("visible");
  });
  window.addEventListener("pagehide", () => wentAway("pagehide"));
  window.addEventListener("pageshow", () => cameBack("pageshow"));
  window.addEventListener("blur", () => wentAway("blur"));
  window.addEventListener("focus", () => cameBack("focus"));
  // The iPhone's own word that another app or a call took the sound.
  audioSession()?.addEventListener?.("statechange", () => {
    const state = sessionState();
    logSound(`session ${state}`);
    if (state.endsWith("/interrupted") && lasting.size > 0) markSilent("session interrupted");
  });
}

/** Whether the page has left and not come back yet. */
let away = false;

function wentAway(how: string) {
  if (!away) logSound(`page away (${how})${context ? `, ${nameOf(context)} ${context.state}` : ""}`);
  away = true;
  hiddenAt = performance.now();
}

function cameBack(how: string) {
  if (!away) return;
  away = false;
  const where = context ? `, ${nameOf(context)} ${context.state} at ${context.currentTime.toFixed(2)}` : "";
  logSound(`page back (${how})${where}, session ${sessionState()}`);
  if (!context) return;
  const interrupted = leftRunningAt !== null && hiddenAt !== null && leftRunningAt >= hiddenAt - AROUND_HIDING_MS;
  leftRunningAt = null;
  if (interrupted) markSilent("interrupted while away");
  if (lasting.size > 0 && sessionState().endsWith("/interrupted")) markSilent("session interrupted on return");
  // In Safari a context that comes back is not trusted until it is heard again: a touch before then rebuilds it.
  if (interrupted || isSafari()) distrusted = true;
  if (isSafari() && lasting.size > 0) {
    void revive();
    return;
  }
  if (context.state !== "running") resumeAskedAt ??= performance.now();
  const ctx = getContext();
  if (lasting.size > 0) checkClock(ctx);
}

/** The iPhone's audio session as "type/state", or "none" outside Safari. */
function sessionState() {
  const session = audioSession();
  return session ? `${session.type}/${session.state ?? "?"}` : "none";
}

/** One line on how the sound stands now, for the sound log in Settings. */
export function soundStatus(): string {
  const ctx = context ? `${nameOf(context)} ${context.state} at ${context.currentTime.toFixed(2)}` : "no context";
  const page = typeof document === "undefined" ? "?" : document.visibilityState;
  return `${ctx}; session ${sessionState()}; page ${page}; lasting ${lasting.size}; `
    + `distrusted ${distrusted}; silent ${knownSilent}`;
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

/** One sound on a given context: the Ison's vox, or the soft tone. */
function playVoice(ctx: AudioContext, sound: SoundRequest): PlayingSound {
  return sound.kind === "ison" ? playIsonVox(ctx, sound.frequency, sound.volume, sound.startMs) : playTone(ctx, sound);
}

/** Real sound in the browser. */
export function createWebAudioOutput(): AudioOutput {
  listenForUnlock();

  return {
    playClickTrack,
    // Before anything has been played there is nothing to hear yet, so nothing is held back either.
    isRunning: () => {
      if (context === null || reviving) return true;
      if (context.state === "running" && lasting.size > 0 && clockStandsStill(context)) {
        markSilent(`${nameOf(context)} clock stands at ${context.currentTime.toFixed(2)}`);
      }
      return context.state === "running" && !knownSilent;
    },
    playSound(sound: SoundRequest): PlayingSound {
      let current = sound;
      let voice = playVoice(getContext(), current);
      // A sound held until stopped (the Ison) starts again on a fresh context; a timed one is over by then.
      const held: Lasting | null =
        sound.durationMs === null ? { moveTo: (ctx) => (voice = playVoice(ctx, { ...current, startMs: 0 })) } : null;
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
