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
  setValueCurveAtTime(values: Float32Array, at: number, duration: number) {
    this.curve = { values: Array.from(values), at, duration };
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

class FakeAudioContext {
  state = "running";
  currentTime = 0;
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
    return Object.assign(new FakeNode(), { buffer: null, loop: false, start() {}, stop() {} });
  }
  createConvolver() {
    return Object.assign(new FakeNode(), { buffer: null, normalize: true });
  }
  createChannelMerger() {
    return new FakeNode();
  }
  sampleRate = 48000;
  createPeriodicWave(_real: Float32Array, imag: Float32Array) {
    return { harmonics: Array.from(imag, (a) => Math.round(a * 1000) / 1000).slice(1) };
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
}

describe("Web Audio output", () => {
  beforeEach(() => {
    oscillators = [];
    gains = [];
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

  it("sings the Ison as a vox whose pitch is exactly the Degree's: the voices around it are tuned evenly above and below", async () => {
    const { createWebAudioOutput } = await import("./webAudioOutput");

    createWebAudioOutput().playSound({ kind: "ison", frequency: 196, durationMs: null, vowel: "a", volume: 0.6 });

    const voices = oscillators.filter((o) => o.frequency.value === 196);
    // The analog oscillator, plus a small choir drifting a few cents either side of the same pitch.
    expect(voices.length).toBeGreaterThan(1);
    const [analog, ...choir] = voices;
    expect(analog!.detune.value).toBe(0);
    expect(analog!.detune.modulatedBy).toEqual([]);
    expect(analog!.frequency.modulatedBy).toEqual([]);
    expect(choir.reduce((sum, o) => sum + o.detune.value, 0)).toBe(0);
    for (const voice of choir) expect(Math.abs(voice.detune.value)).toBeLessThanOrEqual(10);
    // Only slow movements sway it: nothing near an audible rate touches the pitch.
    const sways = oscillators.filter((o) => o.frequency.value < 1);
    expect(sways.length).toBeGreaterThan(0);
    // An octave above shines over it, quietly.
    expect(oscillators.some((o) => o.frequency.value === 392)).toBe(true);
    // Every tone of the vox is richer than the soft tone.
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

  it("keeps the soft tone for the Degrees and the intonation", async () => {
    const { createWebAudioOutput } = await import("./webAudioOutput");

    createWebAudioOutput().playSound({ kind: "intonation", frequency: 146.83, durationMs: 800, vowel: "a", volume: 1 });

    expect(oscillators).toHaveLength(1);
    expect(oscillators[0]!.wave).toEqual([1, 0.42, 0.24, 0.14, 0.08, 0.05, 0.03]);
  });
});
