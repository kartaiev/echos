import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Just enough of the browser to open a microphone and play a Degree. */
class FakeParam {
  value = 0;
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
  setTargetAtTime() {}
  cancelScheduledValues() {}
}

class FakeNode {
  connect<T>(target: T): T {
    return target;
  }
  disconnect() {}
}

class FakeAudioContext {
  state = "running";
  currentTime = 0;
  sampleRate = 48000;
  outputLatency = 0;
  baseLatency = 0;
  destination = new FakeNode();
  createOscillator() {
    return Object.assign(new FakeNode(), {
      frequency: new FakeParam(),
      detune: new FakeParam(),
      setPeriodicWave() {},
      start() {},
      stop() {},
    });
  }
  createGain() {
    return Object.assign(new FakeNode(), { gain: new FakeParam() });
  }
  createPeriodicWave() {
    return {};
  }
  createAnalyser() {
    return Object.assign(new FakeNode(), { fftSize: 2048, getFloatTimeDomainData() {} });
  }
  createMediaStreamSource() {
    return new FakeNode();
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
}

/** The audio session as Safari exposes it: "playback" for a player, "play-and-record" to open a microphone. */
let audioSession: { type: string };
/** What the session was when the page asked for the microphone. */
let typeWhenAsked: string | null;
let refuse: Error | null;

describe("Microphone and the audio session", () => {
  beforeEach(() => {
    audioSession = { type: "auto" };
    typeWhenAsked = null;
    refuse = null;
    vi.stubGlobal("AudioContext", FakeAudioContext);
    vi.stubGlobal("window", { addEventListener() {}, setInterval: () => 0, clearInterval() {} });
    vi.stubGlobal("document", { addEventListener() {}, hidden: false });
    vi.stubGlobal("navigator", {
      audioSession,
      mediaDevices: {
        getUserMedia: async () => {
          typeWhenAsked = audioSession.type;
          if (refuse) throw refuse;
          return { getTracks: () => [{ stop() {} }] };
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("asks for the microphone with the session set to play and record", async () => {
    const { listenToVoice } = await import("./microphone");

    await listenToVoice(() => {});

    expect(typeWhenAsked).toBe("play-and-record");
  });

  it("keeps play and record while a Degree plays during listening", async () => {
    const { listenToVoice } = await import("./microphone");
    const { createWebAudioOutput } = await import("./webAudioOutput");
    await listenToVoice(() => {});

    createWebAudioOutput().playSound({ kind: "degree", frequency: 130.81, durationMs: 500, vowel: "a", volume: 1 });

    expect(audioSession.type).toBe("play-and-record");
  });

  it("goes back to playback when listening stops", async () => {
    const { listenToVoice } = await import("./microphone");
    const listening = await listenToVoice(() => {});

    listening.stop();

    expect(audioSession.type).toBe("playback");
  });

  it("goes back to playback when the microphone is refused", async () => {
    const { listenToVoice } = await import("./microphone");
    refuse = new Error("NotAllowedError");

    await expect(listenToVoice(() => {})).rejects.toThrow();

    expect(audioSession.type).toBe("playback");
  });
});

describe("Microphone on a device that cannot set it up as asked", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("opens the plain microphone instead", async () => {
    const asked: unknown[] = [];
    vi.stubGlobal("AudioContext", FakeAudioContext);
    vi.stubGlobal("window", { addEventListener() {}, setInterval: () => 0, clearInterval() {} });
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: async (constraints: { audio: unknown }) => {
          asked.push(constraints.audio);
          if (constraints.audio !== true) throw new Error("OverconstrainedError");
          return { getTracks: () => [] };
        },
      },
    });
    const { listenToVoice } = await import("./microphone");

    await listenToVoice(() => {});

    expect(asked.at(-1)).toBe(true);
  });
});
