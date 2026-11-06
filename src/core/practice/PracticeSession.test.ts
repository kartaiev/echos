import { describe, expect, it } from "vitest";
import { createPracticeSession } from "./PracticeSession";
import { createRecordingAudioOutput } from "../../audio/recordingAudioOutput";

function setup() {
  const audio = createRecordingAudioOutput();
  const session = createPracticeSession({ audio });
  return { audio, session };
}

describe("Practice Session: Diatonic Scale, 72 moria (PMC 1881)", () => {
  it("plays Ni at the default Reference Pitch, C3 (130.81 Hz)", () => {
    const { audio, session } = setup();

    session.playDegree("Ni");

    expect(audio.sounds).toHaveLength(1);
    expect(audio.sounds[0]?.kind).toBe("degree");
    expect(audio.sounds[0]?.frequency).toBeCloseTo(130.81, 2);
  });

  // Expected frequencies: Ni = C3 = 130.8128 Hz (A4 = 440 Hz), positions 0-12-22-30-42-54-64-72 moria
  // (intervals 12, 10, 8, 12, 12, 10, 8), computed independently as C3 * 2^(moria/72).
  it.each([
    ["Ni", 130.81],
    ["Pa", 146.83],
    ["Vou", 161.67],
    ["Ga", 174.61],
    ["Di", 196.0],
    ["Ke", 220.0],
    ["Zo", 242.23],
    ["Ni'", 261.63],
  ])("plays %s at %f Hz", (degreeId, expectedHz) => {
    const { audio, session } = setup();

    session.playDegree(degreeId);

    expect(audio.sounds[0]?.frequency).toBeCloseTo(expectedHz, 2);
  });

  it("cuts off the previous Degree when another Degree is played, like a single voice", () => {
    const { audio, session } = setup();

    session.playDegree("Ni");
    session.playDegree("Pa");

    expect(audio.sounds.map((s) => s.stopped)).toEqual([true, false]);
  });

  it("describes the ladder from Ni to Ni' with the moria between neighbouring Degrees", () => {
    const { session } = setup();

    const ladder = session.ladder();

    expect(ladder.degrees.map((d) => d.id)).toEqual(["Ni", "Pa", "Vou", "Ga", "Di", "Ke", "Zo", "Ni'"]);
    expect(ladder.degrees.map((d) => d.moriaToNext)).toEqual([12, 10, 8, 12, 12, 10, 8, null]);
    expect(ladder.totalMoria).toBe(72);
  });

  it("names the Tuning System and the source of its values", () => {
    const { session } = setup();

    const ladder = session.ladder();

    expect(ladder.tuningSystemId).toBe("pmc-1881");
    expect(ladder.moriaPerOctave).toBe(72);
    expect(ladder.source).toMatch(/Patriarchal Music Committee/);
  });
});

// Expected values: equal temperament from A4 = 440 Hz (D3 = 146.83, C3 = 130.81, A2 = 110.00),
// Degrees at 2^(moria/72) above Ni; female register one octave up.
describe("Practice Session: Reference Pitch and register", () => {
  it("moves the whole Scale when Ni is set to another note", () => {
    const { audio, session } = setup();

    session.setReferencePitch({ note: "D3", fineHz: 0 });
    session.playDegree("Ni");
    session.playDegree("Di");

    expect(audio.sounds.map((s) => s.frequency)).toEqual([expect.closeTo(146.83, 2), expect.closeTo(220.0, 2)]);
  });

  it("adds the fine adjustment in hertz to the note", () => {
    const { audio, session } = setup();

    session.setReferencePitch({ note: "C3", fineHz: 1.5 });
    session.playDegree("Ni");
    session.playDegree("Pa");

    expect(audio.sounds.map((s) => s.frequency)).toEqual([expect.closeTo(132.31, 2), expect.closeTo(148.52, 2)]);
  });

  it("sounds one octave higher in the female register", () => {
    const { audio, session } = setup();

    session.setRegister("female");
    session.playDegree("Ni");
    session.playDegree("Ga");

    expect(audio.sounds.map((s) => s.frequency)).toEqual([expect.closeTo(261.63, 2), expect.closeTo(349.23, 2)]);
  });

  it("reports the settings and the frequency Ni sounds at", () => {
    const { session } = setup();

    session.setReferencePitch({ note: "A2", fineHz: 0 });
    session.setRegister("female");

    expect(session.pitchSettings()).toEqual({
      referencePitch: { note: "A2", fineHz: 0 },
      register: "female",
      niHz: expect.closeTo(220.0, 2),
    });
  });

  it("starts from settings restored from the device", () => {
    const audio = createRecordingAudioOutput();
    const session = createPracticeSession({
      audio,
      pitchSettings: { referencePitch: { note: "D3", fineHz: 0 }, register: "female" },
    });

    session.playDegree("Ni");

    expect(audio.sounds[0]?.frequency).toBeCloseTo(293.66, 2);
  });
});
