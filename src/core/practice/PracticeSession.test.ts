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

  it("describes the ladder from low Ke to high Ga' with the moria between neighbouring Degrees", () => {
    const { session } = setup();

    const ladder = session.ladder();

    // A comma marks the octave below Ni, an apostrophe the octave above.
    expect(ladder.degrees.map((d) => d.id)).toEqual(
      ["Ke,", "Zo,", "Ni", "Pa", "Vou", "Ga", "Di", "Ke", "Zo", "Ni'", "Pa'", "Vou'", "Ga'"],
    );
    expect(ladder.degrees.map((d) => d.moriaToNext)).toEqual([10, 8, 12, 10, 8, 12, 12, 10, 8, 12, 10, 8, null]);
    expect(ladder.totalMoria).toBe(120);
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

    session.setPitchSettings({ referencePitch: { note: "D3", fineHz: 0 } });
    session.playDegree("Ni");
    session.playDegree("Di");

    expect(audio.sounds.map((s) => s.frequency)).toEqual([expect.closeTo(146.83, 2), expect.closeTo(220.0, 2)]);
  });

  it("adds the fine adjustment in hertz to the note", () => {
    const { audio, session } = setup();

    session.setPitchSettings({ referencePitch: { note: "C3", fineHz: 1.5 } });
    session.playDegree("Ni");
    session.playDegree("Pa");

    expect(audio.sounds.map((s) => s.frequency)).toEqual([expect.closeTo(132.31, 2), expect.closeTo(148.52, 2)]);
  });

  it("sounds one octave higher in the female register", () => {
    const { audio, session } = setup();

    session.setPitchSettings({ register: "female" });
    session.playDegree("Ni");
    session.playDegree("Ga");

    expect(audio.sounds.map((s) => s.frequency)).toEqual([expect.closeTo(261.63, 2), expect.closeTo(349.23, 2)]);
  });

  it("adds the fine adjustment as heard, also in the female register", () => {
    const { audio, session } = setup();

    session.setPitchSettings({ referencePitch: { note: "C3", fineHz: 1.5 } });
    session.setPitchSettings({ register: "female" });
    session.playDegree("Ni");

    // C4 = 261.63 Hz, plus 1.5 Hz.
    expect(audio.sounds[0]?.frequency).toBeCloseTo(263.13, 2);
  });

  it("reports the settings and the frequency Ni sounds at", () => {
    const { session } = setup();

    session.setPitchSettings({ referencePitch: { note: "A2", fineHz: 0 } });
    session.setPitchSettings({ register: "female" });

    expect(session.pitchSettings()).toEqual({
      referencePitch: { note: "A2", fineHz: 0 },
      register: "female",
      niNote: "A3",
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

// Expected values: Ni = C3 = 130.8128 Hz, Degrees at C3 * 2^(moria/72), positions from the PMC 1881
// interval tables as taught (unreviewed): Soft Chromatic 8-14-8-12-8-14-8, Hard Chromatic 4-6-20-4-12-6-20,
// Enharmonic 12-12-6-12-12-6-12.
describe("Practice Session: the four Genera", () => {
  it.each([
    ["Ni", 130.81],
    ["Pa", 141.29],
    ["Vou", 161.67],
    ["Ga", 174.61],
    ["Di", 196.0],
    ["Ke", 211.69],
    ["Zo", 242.23],
    ["Ni'", 261.63],
  ])("Soft Chromatic: plays %s at %f Hz", (degreeId, expectedHz) => {
    const { audio, session } = setup();

    session.setGenus("soft-chromatic");
    session.playDegree(degreeId);

    expect(audio.sounds[0]?.frequency).toBeCloseTo(expectedHz, 2);
  });

  it.each([
    ["hard-chromatic", "Pa", 135.95],
    ["hard-chromatic", "Vou", 144.03],
    ["hard-chromatic", "Ga", 174.61],
    ["hard-chromatic", "Di", 181.47],
    ["hard-chromatic", "Ke", 203.69],
    ["hard-chromatic", "Zo", 215.8],
    ["enharmonic", "Pa", 146.83],
    ["enharmonic", "Vou", 164.81],
    ["enharmonic", "Ga", 174.61],
    ["enharmonic", "Di", 196.0],
    ["enharmonic", "Ke", 220.0],
    ["enharmonic", "Zo", 233.08],
  ] as const)("%s: plays %s at %f Hz", (genus, degreeId, expectedHz) => {
    const { audio, session } = setup();

    session.setGenus(genus);
    session.playDegree(degreeId);

    expect(audio.sounds[0]?.frequency).toBeCloseTo(expectedHz, 2);
  });

  it.each([
    ["diatonic", "Ke,", 110.0],
    ["diatonic", "Zo,", 121.12],
    ["diatonic", "Pa'", 293.66],
    ["diatonic", "Vou'", 323.34],
    ["diatonic", "Ga'", 349.23],
    ["hard-chromatic", "Ke,", 101.85],
    ["hard-chromatic", "Zo,", 107.9],
    ["hard-chromatic", "Pa'", 271.9],
    ["hard-chromatic", "Vou'", 288.06],
    ["hard-chromatic", "Ga'", 349.23],
  ] as const)("%s: plays %s, outside the middle octave, at %f Hz", (genus, degreeId, expectedHz) => {
    const { audio, session } = setup();

    session.setGenus(genus);
    session.playDegree(degreeId);

    expect(audio.sounds[0]?.frequency).toBeCloseTo(expectedHz, 2);
  });

  it("respaces the ladder for the chosen Genus", () => {
    const { session } = setup();

    session.setGenus("hard-chromatic");
    const ladder = session.ladder();

    expect(ladder.genus).toBe("hard-chromatic");
    expect(ladder.degrees.map((d) => d.moriaToNext)).toEqual([6, 20, 4, 6, 20, 4, 12, 6, 20, 4, 6, 20, null]);
    expect(ladder.totalMoria).toBe(128);
  });
});
