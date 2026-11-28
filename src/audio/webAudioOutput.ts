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

/**
 * Everything the page plays goes through one bus per context: raised so a phone speaker carries it (about 7 dB for a
 * Degree, 11 dB for the Ison at its usual volume, measured offline), then a limiter, so the Ison at full volume, a
 * Degree and the clicks sounding together stay under full scale instead of clipping.
 */
const MASTER_GAIN = 2.5;
const LIMIT_DB = -9;
const buses = new WeakMap<BaseAudioContext, AudioNode>();

function outputOf(ctx: BaseAudioContext): AudioNode {
  let bus = buses.get(ctx);
  if (!bus) {
    const gain = ctx.createGain();
    gain.gain.value = MASTER_GAIN;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = LIMIT_DB;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.2;
    gain.connect(limiter).connect(ctx.destination);
    bus = gain;
    buses.set(ctx, bus);
  }
  return bus;
}

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
    // An iPhone can say a context runs while it plays nothing, its clock standing still: look each time.
    if (ctx === context && ctx.state === "running" && isSafari()) checkClock(ctx);
  };
}

/** The sound is known to have stopped: the notice shows, and the next gesture builds a fresh context. */
function markSilent(why: string) {
  if (!knownSilent) logSound(`silent: ${why}`);
  distrusted = true;
  knownSilent = true;
}

/** A context that says it runs while its clock stands still is silent: Safari tries to bring it back first. */
function checkClock(ctx: AudioContext) {
  const before = ctx.currentTime;
  setTimeout(() => {
    if (ctx !== context || ctx.state !== "running" || ctx.currentTime !== before) return;
    clockStood(ctx);
  }, CLOCK_CHECK_MS);
}

function clockStood(ctx: AudioContext) {
  const why = `${nameOf(ctx)} clock stands at ${ctx.currentTime.toFixed(2)}`;
  // After a failed recovery the notice waits for a touch instead of trying again and again.
  if (isSafari() && !knownSilent) void recover(why);
  else markSilent(why);
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
function getContext(fromGesture = false, gesture: string | null = null) {
  // iPhones mute Web Audio when the ring/silent switch is on, unless the page says it plays media.
  applyAudioSession();
  const now = performance.now();
  const active = fromGesture && isUserActive();
  // On iPhone Safari, touch pointerdown never carries user activation (isActive is false); creating or replacing a
  // context there only makes a suspended one right before pointerup/touchend arrives with real activation.
  if (gesture === "pointerdown" && !active) {
    if (context && context.state !== "running") logSound(`${gesture}${activation()}: ${nameOf(context)} ${context.state}`);
    return context;
  }
  if (gesture && context && context.state !== "running") {
    logSound(`${gesture}${activation()}: ${nameOf(context)} ${context.state}`);
  }
  // touchstart fires at finger-down, before a long press timer can strip tap activation from touchend. Try starting
  // the first context there, without closing an existing one or marking it as an active attempt if it stays silent.
  if (gesture === "touchstart" && !active) {
    if (!context) makeContext("first sound", gesture, false);
    const ctx = context!;
    if (ctx.state !== "running") {
      nudge(ctx);
      askResume(ctx);
    }
    return ctx;
  }
  // A non-activating lift (such as the end of a long press on iOS) must not tear down and churn contexts; just ask
  // the current one to resume.
  if (fromGesture && !active) {
    if (context && context.state !== "running") {
      nudge(context);
      askResume(context);
    }
    return context;
  }
  const stuck = active && context !== null && context.state !== "running" && resumeAskedAt !== null
    && now - resumeAskedAt > STUCK_AFTER_MS;
  // A context made outside real user activation (on touchstart, from a long-press timer, or during recovery) can stay
  // suspended in Safari even when asked later: the first truly active gesture replaces it at once.
  const madeInactive = active && context !== null && context.state !== "running" && !madeActive && !recovering;
  // While the sound is being brought back, a touch leaves it to that.
  const untrusted = active && context !== null && distrusted && !recovering;
  // Where pointerdown is active (or userActivation is absent) and still leaves the context suspended, the lift of
  // the same touch makes it once more — never tearing down a context that a lift just created milliseconds earlier.
  const sameTouch = gesture !== null && active && isSafari() && context !== null && context.state !== "running"
    && madeIn !== null && (madeIn.gesture === "pointerdown" || madeIn.gesture === "touchstart")
    && madeIn.gesture !== gesture && !madeIn.again && now - madeIn.at < SAME_TOUCH_MS;
  if (!context) {
    makeContext("first sound", gesture, active);
  }
  else if (stuck || madeInactive || untrusted || sameTouch || context.state === "closed") {
    const why = stuck ? "stuck"
      : madeInactive ? "outside a gesture"
      : untrusted ? "after the page was away"
      : sameTouch ? "again in the same touch"
      : "closed";
    replaceContext(why, gesture, active);
    if ((sameTouch || madeInactive) && madeIn) madeIn.again = true;
  }
  const ctx = context!;
  if (ctx.state === "running") {
    resumeAskedAt = null;
  } else {
    if (active) {
      resumeAskedAt ??= now;
      nudge(ctx);
    }
    askResume(ctx);
  }
  return ctx;
}

function askResume(ctx: AudioContext) {
  ctx.resume().then(
    () => {
      if (ctx !== context) return;
      if (ctx.state === "running") resumeAskedAt = null;
      else logSound(`${nameOf(ctx)} resume answered, still ${ctx.state}`);
    },
    (error: unknown) => logSound(`${nameOf(ctx)} resume refused: ${String(error)}`),
  );
}

/** Plays a single silent sample: iOS Safari sometimes keeps a new context suspended until a source starts inside the gesture. */
function nudge(ctx: AudioContext) {
  try {
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate || 48000);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {
    // Closed or non-standard context; resume() still runs.
  }
}

/** The context made by a touch, and by which of its events; whether that touch has made one again already. */
let madeIn: { gesture: string; at: number; again: boolean } | null = null;
/** Whether the current context was created inside an activating user gesture. */
let madeActive = false;
/** Events this close to the one that made the context belong to the same touch. */
const SAME_TOUCH_MS = 700;

type UserActivationLike = { isActive: boolean };
function userActivation(): UserActivationLike | undefined {
  return (navigator as Navigator & { userActivation?: UserActivationLike }).userActivation;
}

/** Whether the browser counts this moment as an activating user gesture (true where the API is absent). */
function isUserActive(): boolean {
  const user = userActivation();
  return user ? user.isActive : true;
}

/** Whether the browser counts this moment as the user's own action, where it says so. */
function activation() {
  const user = userActivation();
  return user ? (user.isActive ? " (active)" : " (not active)") : "";
}

function makeContext(why: string, gesture: string | null = null, active = false) {
  const ctx = new AudioContext();
  context = ctx;
  madeActive = active;
  if (gesture) {
    if (!madeIn || madeIn.gesture === gesture || performance.now() - madeIn.at >= SAME_TOUCH_MS) {
      madeIn = { gesture, at: performance.now(), again: false };
    }
  } else madeIn = null;
  contextNumbers.set(ctx, ++contextsMade);
  const via = gesture ? ` via ${gesture}${activation()}` : "";
  logSound(`${nameOf(ctx)} made (${why}${via}), ${ctx.state}, session ${sessionState()}`);
  watchState(ctx);
  clockSeen = null;
  resumeAskedAt = null;
  distrusted = false;
  knownSilent = false;
  leftRunningAt = null;
  return ctx;
}

/** Contexts being closed; a recovery waits for them, so nothing holds the iPhone's sound while it starts again. */
const closing = new Set<Promise<void>>();

/** A fresh context in place of the current one, with the lasting sounds moved onto it. */
function replaceContext(why: string, gesture: string | null = null, active = false) {
  const old = context;
  if (old && old.state !== "closed") {
    const closed = old.close().catch(() => {});
    closing.add(closed);
    void closed.then(() => closing.delete(closed));
  }
  // Ask for the session afresh as well.
  if (isSafari()) renewAudioSession();
  const ctx = makeContext(why, gesture, active);
  for (const sound of lasting) sound.moveTo(ctx);
  if (active) seeStarted(ctx);
  return ctx;
}

/** When a fresh context that has not started yet is asked again, counted from the one before. */
const ASK_AGAIN_AFTER_MS = [250, 500, 750, 1500];

/** On an iPhone a fresh context can stay suspended after the first ask, so it is asked again a few times. */
function seeStarted(ctx: AudioContext) {
  let asked = 0;
  const look = () => {
    if (ctx.state === "running" || ctx !== context || asked >= ASK_AGAIN_AFTER_MS.length) return;
    if (asked > 0) {
      logSound(`${nameOf(ctx)} still ${ctx.state}, asking again`);
      void ctx.resume().catch(() => {});
    }
    setTimeout(look, ASK_AGAIN_AFTER_MS[asked++]);
  };
  look();
}

/**
 * Brings the sound back by itself, with no touch: on return from another app, and whenever a context says it runs
 * while its clock stands still. An iPhone hands the page its sound again only when the page goes from playing
 * nothing to playing: so every other context is closed first, and the context is stopped, left a moment, and
 * started again. That is what worked from the sound log; a fresh context started while the old one still ran stayed
 * silent, however often it was made. If the clock still stands, a fresh context (the old one closed first) takes
 * the sounds over. Only if that stays silent too does the notice ask for a touch. Meanwhile the notice waits.
 */
let recovering = false;
const RECOVER_CHECK_MS = 500;
const RECOVER_STEP_MS = 1000;
/** How long the context stays stopped, so the iPhone sees the page playing nothing. */
const STOPPED_FOR_MS = 150;

async function recover(why: string) {
  if (recovering || !context) return;
  recovering = true;
  try {
    const ctx = context;
    logSound(`recovering ${nameOf(ctx)} (${why}), ${ctx.state} at ${ctx.currentTime.toFixed(2)}`);
    if (await restart(ctx)) return recovered(ctx, "restarted");
    if (ctx !== context) return;
    const fresh = replaceContext("recovering");
    if (await restart(fresh)) return recovered(fresh, "rebuilt");
    if (fresh === context) markSilent("could not bring the sound back without a touch");
  } finally {
    recovering = false;
  }
}

/** Stops the context with nothing else left playing, starts it again, and says whether its clock then moves. */
async function restart(ctx: AudioContext) {
  await settle(Promise.all(closing).then(() => {}));
  renewAudioSession();
  await settle(ctx.suspend());
  await wait(STOPPED_FOR_MS);
  await settle(ctx.resume());
  return sounds(ctx);
}

const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

/** Waits for a context's suspend, resume or close, but not forever: an interrupted one may never answer. */
function settle(promise: Promise<void>) {
  return Promise.race([promise.catch(() => {}), wait(RECOVER_STEP_MS)]);
}

/** Whether the context is still the page's and its clock moves. */
function sounds(ctx: AudioContext) {
  const before = ctx.currentTime;
  return wait(RECOVER_CHECK_MS).then(() => ctx === context && ctx.state === "running" && ctx.currentTime !== before);
}

function recovered(ctx: AudioContext, how: string) {
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
  for (const type of ["touchstart", "pointerdown", "pointerup", "touchend", "click", "change", "keydown"]) {
    window.addEventListener(type, () => getContext(true, type), { capture: true });
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
  // In Safari a context that comes back is not trusted until it is heard again; it is brought back at once, so that
  // what plays next, lasting or not, is heard.
  if (interrupted || isSafari()) distrusted = true;
  if (isSafari()) {
    void recover("back in the app");
    return;
  }
  if (context.state !== "running") resumeAskedAt ??= performance.now();
  const ctx = getContext()!;
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
    output.connect(outputOf(ctx));
    index = 0;
    schedule();
    timer = window.setInterval(schedule, SCHEDULER_INTERVAL_MS);
  }

  const track: Lasting = { moveTo: startOn };
  const activeNow = Boolean(userActivation()?.isActive);
  startOn(getContext(activeNow, activeNow ? "play" : null)!);
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
  envelope.connect(outputOf(ctx));

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
  return sound.kind === "ison" ? playIsonVox(ctx, sound.frequency, sound.volume, sound.startMs, outputOf(ctx)) : playTone(ctx, sound);
}

/** Real sound in the browser. */
export function createWebAudioOutput(): AudioOutput {
  listenForUnlock();

  return {
    playClickTrack,
    // Before anything has been played there is nothing to hear yet, so nothing is held back either.
    isRunning: () => {
      if (context === null || recovering) return true;
      if (context.state === "running" && lasting.size > 0 && clockStandsStill(context)) clockStood(context);
      if (recovering) return true;
      return context.state === "running" && !knownSilent;
    },
    playSound(sound: SoundRequest): PlayingSound {
      let current = sound;
      const activeNow = Boolean(userActivation()?.isActive);
      let voice = playVoice(getContext(activeNow, activeNow ? "play" : null)!, current);
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
