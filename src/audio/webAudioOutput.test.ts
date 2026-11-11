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
}

class FakeNode {
  connect<T>(target: T): T {
    if (target instanceof FakeParam) target.modulatedBy.push(this);
    return target;
  }
  disconnect() {}
}

class FakeOscillator extends FakeNode {
  type = "sine";
  frequency = new FakeParam();
  detune = new FakeParam();
  wave: number[] | null = null;
  setPeriodicWave(wave: { harmonics: number[] }) {
    this.type = "custom";
    this.wave = wave.harmonics;
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
    return Object.assign(new FakeNode(), { gain: new FakeParam() });
  }
  createBiquadFilter() {
    return Object.assign(new FakeNode(), { type: "", frequency: new FakeParam(), Q: new FakeParam() });
  }
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
    // A few quiet overtones over the fundamental.
    expect(tone!.wave).toEqual([1, 0.3, 0.12, 0.05, 0.02]);
  });

  it("sounds the Ison the same way, whatever vowel the student chose", async () => {
    const { createWebAudioOutput } = await import("./webAudioOutput");

    createWebAudioOutput().playSound({ kind: "ison", frequency: 196, durationMs: null, vowel: "ou", volume: 0.6 });

    expect(oscillators).toHaveLength(1);
    expect(oscillators[0]!.wave).toEqual([1, 0.3, 0.12, 0.05, 0.02]);
    expect(oscillators[0]!.frequency.value).toBe(196);
  });
});
