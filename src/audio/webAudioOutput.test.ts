import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** A stand-in for the browser's AudioContext that records the nodes a sound is built from. */
class FakeParam {
  value = 0;
  modulatedBy: unknown[] = [];
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
  setTargetAtTime() {}
  cancelScheduledValues() {}
  curve: { values: number[]; at: number; duration: number } | null = null;
  curves: { values: number[]; at: number; duration: number }[] = [];
  setValueCurveAtTime(values: Float32Array, at: number, duration: number) {
    this.curve = { values: Array.from(values), at, duration };
    this.curves.push(this.curve);
  }
}

let gains: FakeParam[] = [];

class FakeNode {
  connect<T>(target: T): T {
    if (target instanceof FakeParam) target.modulatedBy.push(this);
    return target;
  }
  disconnect() {}
}

class FakeOscillator extends FakeNode {
  periodic: { harmonics: number[] } | null = null;
  type = "sine";
  frequency = new FakeParam();
  detune = new FakeParam();
  wave: number[] | null = null;
  setPeriodicWave(wave: { harmonics: number[] }) {
    this.type = "custom";
    this.wave = wave.harmonics;
    this.periodic = wave;
  }
  start() {}
  stop() {}
}

let oscillators: FakeOscillator[] = [];
let contexts: FakeAudioContext[] = [];

class FakeAudioContext {
  /** The state a new context starts in. */
  static startState = "running";
  state = FakeAudioContext.startState;
  resumes = 0;
  closed = false;
  onstatechange: (() => void) | null = null;
  constructor() {
    contexts.push(this);
  }
  /** The new context's clock moves with time, as a context that really plays does. */
  static startRendering = false;
  renders = FakeAudioContext.startRendering;
  suspends = 0;
  private time = 0;
  private since = Date.now();
  get currentTime() {
    return this.renders ? this.time + (Date.now() - this.since) / 1000 : this.time;
  }
  set currentTime(value: number) {
    this.time = value;
    this.since = Date.now();
  }
  outputLatency = 0;
  baseLatency = 0;
  destination = new FakeNode();
  createOscillator() {
    const osc = new FakeOscillator();
    oscillators.push(osc);
    return osc;
  }
  createGain() {
    const gain = new FakeParam();
    gains.push(gain);
    return Object.assign(new FakeNode(), { gain });
  }
  createBiquadFilter() {
    return Object.assign(new FakeNode(), { type: "", frequency: new FakeParam(), Q: new FakeParam(), gain: new FakeParam() });
  }
  createDelay() {
    return Object.assign(new FakeNode(), { delayTime: new FakeParam() });
  }
  createBuffer(channels: number, length: number, sampleRate: number) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { numberOfChannels: channels, length, sampleRate, getChannelData: (c: number) => data[c]! };
  }
  createBufferSource() {
    const source = Object.assign(new FakeNode(), { buffer: null, loop: false, started: 0, start() { this.started += 1; }, stop() {} });
    this.bufferSources.push(source);
    return source;
  }
  bufferSources: { started: number }[] = [];
  createConvolver() {
    return Object.assign(new FakeNode(), { buffer: null, normalize: true });
  }
  createChannelMerger() {
    return new FakeNode();
  }
  createChannelSplitter() {
    return new FakeNode();
  }
  sampleRate = 48000;
  createPeriodicWave(_real: Float32Array, imag: Float32Array) {
    return { harmonics: Array.from(imag, (a) => Math.round(a * 1000) / 1000).slice(1) };
  }
  resume() {
    this.resumes += 1;
    return Promise.resolve();
  }
  suspend() {
    this.suspends += 1;
    return Promise.resolve();
  }
  close() {
    this.closed = true;
    return Promise.resolve();
  }
}

describe("Web Audio output", () => {
  beforeEach(() => {
    oscillators = [];
    gains = [];
    contexts = [];
    vi.stubGlobal("AudioContext", FakeAudioContext);
    vi.stubGlobal("window", { addEventListener() {}, setInterval: () => 0 });
    vi.stubGlobal("document", { addEventListener() {}, hidden: false });
    vi.stubGlobal("navigator", {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("plays a soft tone at exactly the Degree's pitch, with nothing moving it", async () => {
    const { createWebAudioOutput } = await import("./webAudioOutput");

    createWebAudioOutput().playSound({ kind: "degree", frequency: 130.81, durationMs: 1200, vowel: "a", volume: 1 });

    expect(oscillators).toHaveLength(1);
    const [tone] = oscillators;
    expect(tone!.frequency.value).toBe(130.81);
    expect(tone!.frequency.modulatedBy).toEqual([]);
    expect(tone!.detune.modulatedBy).toEqual([]);
    // A few overtones over the fundamental, falling away.
    expect(tone!.wave).toEqual([1, 0.42, 0.24, 0.14, 0.08, 0.05, 0.03]);
  });

  it("sings the Ison as a male choir whose pitch is centred evenly on the Degree", async () => {
    const { createWebAudioOutput } = await import("./webAudioOutput");

    createWebAudioOutput().playSound({ kind: "ison", frequency: 196, durationMs: null, vowel: "a", volume: 0.6 });

    const voices = oscillators.filter((o) => o.frequency.value === 196);
    // Seven voices spread symmetrically around the Degree's exact pitch.
    expect(voices).toHaveLength(7);
    expect(voices.reduce((sum, o) => sum + o.detune.value, 0)).toBeCloseTo(0, 5);
    for (const voice of voices) expect(Math.abs(voice.detune.value)).toBeLessThanOrEqual(10);
    // Slow movements sway pitch and breath; nothing near an audible rate modulates the pitch.
    const sways = oscillators.filter((o) => o.frequency.value < 1);
    expect(sways.length).toBeGreaterThan(0);
    expect(oscillators.filter((o) => o.frequency.value !== 196).every((o) => o.frequency.value < 10)).toBe(true);
    // Every voice of the vox is richer than the soft tone.
    for (const voice of voices) expect(voice.wave!.length).toBeGreaterThan(7);
  });

  it("sings the Ison the same whatever vowel the student chose, while the vowel is not offered", async () => {
    const { createWebAudioOutput } = await import("./webAudioOutput");
    const output = createWebAudioOutput();

    output.playSound({ kind: "ison", frequency: 196, durationMs: null, vowel: "a", volume: 0.6 });
    const onA = oscillators.map((o) => [o.frequency.value, o.detune.value, o.wave]);
    oscillators = [];
    output.playSound({ kind: "ison", frequency: 196, durationMs: null, vowel: "ou", volume: 0.6 });

    expect(oscillators.map((o) => [o.frequency.value, o.detune.value, o.wave])).toEqual(onA);
  });

  it("brings the Ison in with a slow swell, almost silent at first, not with a hit", async () => {
    const { createWebAudioOutput } = await import("./webAudioOutput");

    createWebAudioOutput().playSound({ kind: "ison", frequency: 196, durationMs: null, vowel: "a", volume: 0.6 });

    const swells = gains.flatMap((g) => (g.curve ? [g.curve] : []));
    expect(swells).toHaveLength(1);
    const { values, duration } = swells[0]!;
    expect(duration).toBeGreaterThanOrEqual(1);
    const full = values[values.length - 1]!;
    expect(values[0]).toBe(0);
    // Every step is up: no jump, no dip.
    for (let i = 1; i < values.length; i++) expect(values[i]!).toBeGreaterThanOrEqual(values[i - 1]!);
    // Slow at first: a tenth of the way in it is still about 30 dB down.
    expect(values[Math.round(values.length / 10)]!).toBeLessThan(full * 0.04);
  });

  it("crossfades rapidly (~80 ms) when switching the Ison from one Degree to another while sounding", async () => {
    const { createWebAudioOutput } = await import("./webAudioOutput");
    const output = createWebAudioOutput();

    const first = output.playSound({ kind: "ison", frequency: 130.81, durationMs: null, vowel: "o", volume: 0.6 });
    first.stop();
    const gainsBeforeSecond = gains.length;
    const second = output.playSound({ kind: "ison", frequency: 146.83, durationMs: null, vowel: "o", volume: 0.6 });

    const firstReleases = gains
      .slice(0, gainsBeforeSecond)
      .flatMap((g) => g.curves)
      .filter((c) => c.values[0] === 1);
    expect(firstReleases[firstReleases.length - 1]!.duration).toBeLessThanOrEqual(0.1);

    const secondSwells = gains.slice(gainsBeforeSecond).flatMap((g) => g.curves);
    expect(secondSwells).toHaveLength(1);
    expect(secondSwells[0]!.duration).toBeLessThanOrEqual(0.1);
    expect(secondSwells[0]!.values[0]).toBe(0);
    second.stop();
  });

  it("keeps the soft tone for the Degrees and the intonation", async () => {
    const { createWebAudioOutput } = await import("./webAudioOutput");

    createWebAudioOutput().playSound({ kind: "intonation", frequency: 146.83, durationMs: 800, vowel: "a", volume: 1 });

    expect(oscillators).toHaveLength(1);
    expect(oscillators[0]!.wave).toEqual([1, 0.42, 0.24, 0.14, 0.08, 0.05, 0.03]);
  });
});

describe("Web Audio output after an app switch", () => {
  const ison = { kind: "ison", frequency: 130.81, durationMs: null, vowel: "o", volume: 0.6 } as const;
  let pageListeners: Record<string, () => void>;
  let windowListeners: Record<string, () => void>;
  let page: { visibilityState: string; hidden: boolean; addEventListener(type: string, listener: () => void): void };

  beforeEach(() => {
    oscillators = [];
    gains = [];
    contexts = [];
    pageListeners = {};
    windowListeners = {};
    vi.useFakeTimers();
    FakeAudioContext.startState = "running";
    FakeAudioContext.startRendering = false;
    vi.stubGlobal("AudioContext", FakeAudioContext);
    page = {
      visibilityState: "visible",
      hidden: false,
      addEventListener: (type, listener) => (pageListeners[type] = listener),
    };
    vi.stubGlobal("document", page);
    vi.stubGlobal("window", {
      addEventListener: (type: string, listener: () => void) => (windowListeners[type] = listener),
      setInterval: () => 0,
    });
    vi.stubGlobal("navigator", {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  function leave() {
    page.visibilityState = "hidden";
    page.hidden = true;
    pageListeners.visibilitychange!();
  }

  function comeBack() {
    page.visibilityState = "visible";
    page.hidden = false;
    pageListeners.visibilitychange!();
  }

  const touch = () => windowListeners.pointerdown!();

  it("rebuilds the Ison on the first touch when an interrupted context comes back saying it runs", async () => {
    const { createWebAudioOutput } = await import("./webAudioOutput");
    const output = createWebAudioOutput();
    output.playSound(ison);
    const [first] = contexts;

    leave();
    first!.state = "interrupted";
    first!.onstatechange!();
    first!.state = "running";
    comeBack();

    // iOS says it runs, but it went silent: the notice shows.
    expect(output.isRunning()).toBe(false);

    const voicesBefore = oscillators.length;
    touch();
    expect(contexts).toHaveLength(2);
    expect(first!.closed).toBe(true);
    expect(oscillators.length).toBeGreaterThan(voicesBefore);
    expect(output.isRunning()).toBe(true);
  });

  it("brings the metronome back on a fresh context the same way, with no Ison sounding", async () => {
    const { createWebAudioOutput } = await import("./webAudioOutput");
    const output = createWebAudioOutput();
    output.playClickTrack({ intervalMs: 750, accentEvery: 4 });
    const [first] = contexts;

    leave();
    first!.state = "interrupted";
    first!.onstatechange!();
    first!.state = "running";
    comeBack();
    expect(output.isRunning()).toBe(false);

    const clicksBefore = oscillators.length;
    touch();
    expect(contexts).toHaveLength(2);
    // The first click of the group is placed on the fresh context at once.
    expect(oscillators.length).toBeGreaterThan(clicksBefore);
    expect(oscillators[clicksBefore]!.frequency.value).toBe(1760);
    expect(output.isRunning()).toBe(true);
  });

  it("counts a context whose clock stands still after coming back as silent", async () => {
    const { createWebAudioOutput } = await import("./webAudioOutput");
    const output = createWebAudioOutput();
    output.playSound(ison);

    leave();
    comeBack();
    vi.advanceTimersByTime(500);

    expect(output.isRunning()).toBe(false);
    touch();
    expect(contexts).toHaveLength(2);
    expect(output.isRunning()).toBe(true);
  });

  it("keeps a context that ran through the app switch in other browsers", async () => {
    const { createWebAudioOutput } = await import("./webAudioOutput");
    const output = createWebAudioOutput();
    output.playSound(ison);

    leave();
    comeBack();
    contexts[0]!.currentTime = 0.5;
    vi.advanceTimersByTime(500);
    touch();

    expect(contexts).toHaveLength(1);
    expect(output.isRunning()).toBe(true);
  });

  it("does not rebuild for an interruption long before the app switch, which has already passed", async () => {
    const { createWebAudioOutput } = await import("./webAudioOutput");
    const output = createWebAudioOutput();
    output.playSound(ison);
    const [first] = contexts;

    first!.state = "interrupted";
    first!.onstatechange!();
    first!.state = "running";
    vi.advanceTimersByTime(5000);
    leave();
    comeBack();
    first!.currentTime = 0.5;
    vi.advanceTimersByTime(500);
    touch();

    expect(contexts).toHaveLength(1);
    expect(output.isRunning()).toBe(true);
  });
  /** An iPhone's navigator.audioSession that the test can interrupt. */
  function fakeSession() {
    const listeners: Record<string, () => void> = {};
    const types: string[] = [];
    const session = {
      state: "active",
      _type: "auto",
      get type() {
        return this._type;
      },
      set type(value: string) {
        this._type = value;
        types.push(value);
      },
      addEventListener: (type: string, listener: () => void) => (listeners[type] = listener),
    };
    const interrupt = () => {
      session.state = "interrupted";
      listeners.statechange!();
    };
    return { session, types, interrupt };
  }

  it("finds a context that says it runs while its clock stands still, without any app switch", async () => {
    const { createWebAudioOutput } = await import("./webAudioOutput");
    const output = createWebAudioOutput();
    output.playSound(ison);

    expect(output.isRunning()).toBe(true);
    vi.advanceTimersByTime(800);
    // The clock has not moved since the last look: the notice shows, and the next touch rebuilds.
    expect(output.isRunning()).toBe(false);
    touch();
    expect(contexts).toHaveLength(2);
    expect(output.isRunning()).toBe(true);
  });

  it("does not count a moving clock as silent", async () => {
    const { createWebAudioOutput } = await import("./webAudioOutput");
    const output = createWebAudioOutput();
    output.playSound(ison);

    output.isRunning();
    vi.advanceTimersByTime(800);
    contexts[0]!.currentTime = 0.8;
    expect(output.isRunning()).toBe(true);
  });

  it("in Safari, takes the audio session's interruption as silence and asks for the session again on the rebuild", async () => {
    const { session, types, interrupt } = fakeSession();
    vi.stubGlobal("navigator", { audioSession: session });
    const { createWebAudioOutput } = await import("./webAudioOutput");
    const output = createWebAudioOutput();
    output.playSound(ison);
    contexts[0]!.currentTime = 0.5;

    interrupt();
    expect(output.isRunning()).toBe(false);

    types.length = 0;
    touch();
    expect(contexts).toHaveLength(2);
    expect(types).toEqual(["auto", "playback"]);
  });

  it("in Safari, brings the sound back by itself on return by stopping and starting the context it had", async () => {
    vi.stubGlobal("navigator", { audioSession: { type: "playback" } });
    const { createWebAudioOutput } = await import("./webAudioOutput");
    const output = createWebAudioOutput();
    output.playSound(ison);
    const [first] = contexts;

    leave();
    comeBack();
    // Stopped and started again, it plays.
    first!.renders = true;
    expect(output.isRunning()).toBe(true);
    await vi.advanceTimersByTimeAsync(700);

    expect(first!.suspends).toBe(1);
    expect(contexts).toHaveLength(1);
    expect(output.isRunning()).toBe(true);
    // Heard again, it is trusted again: a touch does not restart the Ison.
    touch();
    expect(contexts).toHaveLength(1);
  });

  it("in Safari, closes the old context before it starts a fresh one, when restarting is not enough", async () => {
    vi.stubGlobal("navigator", { audioSession: { type: "playback" } });
    const { createWebAudioOutput } = await import("./webAudioOutput");
    const output = createWebAudioOutput();
    output.playSound(ison);
    const [first] = contexts;
    const voicesBefore = oscillators.length;

    leave();
    comeBack();
    FakeAudioContext.startRendering = true;
    await vi.advanceTimersByTimeAsync(700);
    // Its clock still stood: a fresh context takes the Ison over, the old one closed so nothing else plays.
    expect(contexts).toHaveLength(2);
    expect(first!.closed).toBe(true);
    expect(oscillators.length).toBeGreaterThan(voicesBefore);

    await vi.advanceTimersByTimeAsync(700);
    expect(contexts[1]!.suspends).toBe(1);
    expect(output.isRunning()).toBe(true);
    touch();
    expect(contexts).toHaveLength(2);
  });

  it("in Safari, asks for a touch only when nothing brings the sound back by itself", async () => {
    vi.stubGlobal("navigator", { audioSession: { type: "playback" } });
    const { createWebAudioOutput } = await import("./webAudioOutput");
    const output = createWebAudioOutput();
    output.playClickTrack({ intervalMs: 750, accentEvery: 4 });

    leave();
    comeBack();
    await vi.advanceTimersByTimeAsync(1500);

    expect(contexts).toHaveLength(2);
    expect(output.isRunning()).toBe(false);
    touch();
    expect(contexts).toHaveLength(3);
    expect(output.isRunning()).toBe(true);
  });

  it("in Safari, leaves the sound to its recovery when touched meanwhile", async () => {
    vi.stubGlobal("navigator", { audioSession: { type: "playback" } });
    const { createWebAudioOutput } = await import("./webAudioOutput");
    const output = createWebAudioOutput();
    output.playSound(ison);

    leave();
    comeBack();
    touch();
    expect(contexts).toHaveLength(1);
  });

  it("in Safari, brings back a context that says it runs while its clock stands, with no app switch and no notice", async () => {
    vi.stubGlobal("navigator", { audioSession: { type: "playback" } });
    const { createWebAudioOutput } = await import("./webAudioOutput");
    const output = createWebAudioOutput();
    output.playSound(ison);
    const [first] = contexts;

    expect(output.isRunning()).toBe(true);
    vi.advanceTimersByTime(800);
    expect(output.isRunning()).toBe(true);
    first!.renders = true;
    await vi.advanceTimersByTimeAsync(700);

    expect(first!.suspends).toBe(1);
    expect(contexts).toHaveLength(1);
    expect(output.isRunning()).toBe(true);
  });

  it("in Safari, counts losing focus as leaving when the page never says it was hidden", async () => {
    vi.stubGlobal("navigator", { audioSession: { type: "playback" } });
    const { createWebAudioOutput } = await import("./webAudioOutput");
    const { soundLogLines } = await import("./soundLog");
    const output = createWebAudioOutput();
    output.playSound(ison);

    windowListeners.blur!();
    windowListeners.focus!();

    const log = soundLogLines().join("\n");
    expect(log).toMatch(/page away \(blur\)/);
    expect(log).toMatch(/recovering context 1 \(back in the app\)/);
  });

  it("in Safari, makes the context once more on the lift of the same touch when the first one stays suspended", async () => {
    vi.stubGlobal("navigator", { audioSession: { type: "playback" } });
    FakeAudioContext.startState = "suspended";
    const { createWebAudioOutput } = await import("./webAudioOutput");
    createWebAudioOutput();

    windowListeners.pointerdown!();
    expect(contexts).toHaveLength(1);
    windowListeners.pointerup!();
    expect(contexts).toHaveLength(2);
    // Only once per touch.
    windowListeners.touchend!();
    windowListeners.click!();
    expect(contexts).toHaveLength(2);
  });

  it("in Safari, does not make the context again in the same touch when it starts", async () => {
    vi.stubGlobal("navigator", { audioSession: { type: "playback" } });
    const { createWebAudioOutput } = await import("./webAudioOutput");
    createWebAudioOutput();

    windowListeners.pointerdown!();
    windowListeners.pointerup!();
    windowListeners.click!();
    expect(contexts).toHaveLength(1);
  });

  it("on iPhone, ignores inactive pointerdown and starts on the first active lift without churning contexts", async () => {
    const userActivation = { isActive: false };
    vi.stubGlobal("navigator", { audioSession: { type: "playback" }, userActivation });
    FakeAudioContext.startState = "suspended";
    const { createWebAudioOutput } = await import("./webAudioOutput");
    createWebAudioOutput();

    // Touch pointerdown has no user activation on iOS: it must not create a doomed context.
    windowListeners.pointerdown!();
    expect(contexts).toHaveLength(0);

    // Lift carries real user activation: makes one context, nudges it, and touchend/click leave it alone.
    userActivation.isActive = true;
    windowListeners.pointerup!();
    expect(contexts).toHaveLength(1);
    expect(contexts[0]!.bufferSources).toHaveLength(1);
    expect(contexts[0]!.bufferSources[0]!.started).toBe(1);

    windowListeners.touchend!();
    windowListeners.click!();
    expect(contexts).toHaveLength(1);
  });

  it("on iPhone, tries starting on touchstart for a long press and replaces at once on the first active gesture if still suspended", async () => {
    const userActivation = { isActive: false };
    vi.stubGlobal("navigator", { audioSession: { type: "playback" }, userActivation });
    FakeAudioContext.startState = "suspended";
    const { createWebAudioOutput } = await import("./webAudioOutput");
    createWebAudioOutput();

    // Finger touches the screen: touchstart tries to unlock before a long-press timer runs.
    windowListeners.touchstart!();
    expect(contexts).toHaveLength(1);
    expect(contexts[0]!.resumes).toBe(1);
    expect(contexts[0]!.bufferSources[0]!.started).toBe(1);

    // Inactive pointerdown and an inactive long-press lift do not churn contexts.
    windowListeners.pointerdown!();
    windowListeners.pointerup!();
    windowListeners.touchend!();
    expect(contexts).toHaveLength(1);

    // The first truly active tap replaces the inactive context immediately (without waiting for STUCK_AFTER_MS).
    windowListeners.touchstart!();
    windowListeners.pointerdown!();
    expect(contexts).toHaveLength(1);
    userActivation.isActive = true;
    windowListeners.pointerup!();
    expect(contexts).toHaveLength(2);
    expect(contexts[0]!.closed).toBe(true);
    // touchend of that same lift does not kill the freshly created active context.
    windowListeners.touchend!();
    expect(contexts).toHaveLength(2);
  });

  it("on iPhone, keeps the context started on touchstart when it begins running immediately", async () => {
    const userActivation = { isActive: false };
    vi.stubGlobal("navigator", { audioSession: { type: "playback" }, userActivation });
    FakeAudioContext.startState = "suspended";
    const { createWebAudioOutput } = await import("./webAudioOutput");
    createWebAudioOutput();

    windowListeners.touchstart!();
    expect(contexts).toHaveLength(1);
    contexts[0]!.state = "running";

    userActivation.isActive = true;
    windowListeners.pointerup!();
    expect(contexts).toHaveLength(1);
    expect(contexts[0]!.closed).toBe(false);
  });

  it("on iPhone, unlocks on a select change event when a context was made outside a gesture", async () => {
    const userActivation = { isActive: false };
    vi.stubGlobal("navigator", { audioSession: { type: "playback" }, userActivation });
    FakeAudioContext.startState = "suspended";
    const { createWebAudioOutput } = await import("./webAudioOutput");
    const output = createWebAudioOutput();

    output.playSound(ison);
    expect(contexts).toHaveLength(1);

    userActivation.isActive = true;
    windowListeners.change!();
    expect(contexts).toHaveLength(2);
    expect(contexts[0]!.closed).toBe(true);
  });
});
