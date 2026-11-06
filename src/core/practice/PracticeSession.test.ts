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

// Expected values were worked out separately in Python: Ni = C3 = 130.8128 Hz (A4 = 440 Hz), each Degree at
// C3 * 2^(moria/72), moria summed from the PMC 1881 interval tables as taught (unreviewed):
// Diatonic 12-10-8-12-12-10-8, Soft Chromatic 8-14-8-12-8-14-8, Hard Chromatic 4-6-20-4-12-6-20,
// Enharmonic 12-12-6-12-12-6-12.
const LADDER_IDS = ["Ke,", "Zo,", "Ni", "Pa", "Vou", "Ga", "Di", "Ke", "Zo", "Ni'", "Pa'", "Vou'", "Ga'"];
const EXPECTED_HZ = {
  diatonic: [110.0, 121.12, 130.81, 146.83, 161.67, 174.61, 196.0, 220.0, 242.23, 261.63, 293.66, 323.34, 349.23],
  "soft-chromatic": [105.84, 121.12, 130.81, 141.29, 161.67, 174.61, 196.0, 211.69, 242.23, 261.63, 282.57, 323.34, 349.23],
  "hard-chromatic": [101.85, 107.9, 130.81, 135.95, 144.03, 174.61, 181.47, 203.69, 215.8, 261.63, 271.9, 288.06, 349.23],
  enharmonic: [110.0, 116.54, 130.81, 146.83, 164.81, 174.61, 196.0, 220.0, 233.08, 261.63, 293.66, 329.63, 349.23],
} as const;

describe("Practice Session: the four Genera", () => {
  it.each(Object.keys(EXPECTED_HZ) as (keyof typeof EXPECTED_HZ)[])(
    "%s: plays every Degree from low Ke to high Ga' at the frequency of the source table",
    (genus) => {
      const { audio, session } = setup();

      session.setGenus(genus);
      for (const id of LADDER_IDS) session.playDegree(id);

      expect(audio.sounds.map((s) => s.frequency)).toEqual(EXPECTED_HZ[genus].map((hz) => expect.closeTo(hz, 2)));
    },
  );

  it("respaces the ladder for the chosen Genus", () => {
    const { session } = setup();

    session.setGenus("hard-chromatic");
    const ladder = session.ladder();

    expect(ladder.genus).toBe("hard-chromatic");
    expect(ladder.degrees.map((d) => d.moriaToNext)).toEqual([6, 20, 4, 6, 20, 4, 12, 6, 20, 4, 6, 20, null]);
    expect(ladder.totalMoria).toBe(128);
  });

  it("keeps one drawing range for every Genus, so a Degree that does not move stays in place", () => {
    const { session } = setup();

    const ranges = (["diatonic", "soft-chromatic", "hard-chromatic", "enharmonic"] as const).map((genus) => {
      session.setGenus(genus);
      return session.ladder().drawingRange;
    });

    // Lowest: Hard Chromatic low Ke at -26 moria from Ni; highest: Ga' at 102 in every Genus.
    expect(ranges).toEqual(Array(4).fill({ lowestMoria: -26, highestMoria: 102 }));
  });
});
