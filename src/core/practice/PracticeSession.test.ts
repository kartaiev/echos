import { describe, expect, it } from "vitest";
import { createPracticeSession } from "./PracticeSession";
import { createRecordingAudioOutput } from "../../audio/recordingAudioOutput";

function setup() {
  const audio = createRecordingAudioOutput();
  const session = createPracticeSession({ audio });
  return { audio, session };
}

describe("Practice Session: Diatonic Scale, 72 moria (PMC 1881)", () => {
  it("plays Ni at the default Reference Pitch of 130.81 Hz", () => {
    const { audio, session } = setup();

    session.playDegree("Ni");

    expect(audio.sounds).toHaveLength(1);
    expect(audio.sounds[0]?.kind).toBe("degree");
    expect(audio.sounds[0]?.frequency).toBeCloseTo(130.81, 2);
  });

  // Expected frequencies: Ni = 130.81 Hz, positions 0-12-22-30-42-54-64-72 moria
  // (intervals 12, 10, 8, 12, 12, 10, 8), computed independently as 130.81 * 2^(moria/72).
  it.each([
    ["Ni", 130.81],
    ["Pa", 146.83],
    ["Vou", 161.67],
    ["Ga", 174.61],
    ["Di", 195.99],
    ["Ke", 220.0],
    ["Zo", 242.23],
    ["Ni'", 261.62],
  ])("plays %s at %f Hz", (degreeId, expectedHz) => {
    const { audio, session } = setup();

    session.playDegree(degreeId);

    expect(audio.sounds[0]?.frequency).toBeCloseTo(expectedHz, 2);
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
