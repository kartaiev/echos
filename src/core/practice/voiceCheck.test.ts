import { describe, expect, it } from "vitest";
import { createPracticeSession } from "./PracticeSession";
import { createRecordingAudioOutput } from "../../audio/recordingAudioOutput";

function setup() {
  return createPracticeSession({ audio: createRecordingAudioOutput() });
}

/** The frequency of a position in moria above Ni (C3 = 130.8128 Hz by default; 72 moria to the octave). */
const at = (moria: number) => 130.8128 * 2 ** (moria / 72);

// Diatonic, PMC 1881: Ni 0, Pa 12, Vou 22, Ga 30, Di 42, Ke 54, Zo 64, Ni' 72.
describe("Voice Check", () => {
  it("names the Degree the student sings when it is right on it", () => {
    const reading = setup().readVoice(at(12));

    expect(reading?.degreeId).toBe("Pa");
    expect(reading?.offMoria).toBeCloseTo(0, 3);
    expect(reading?.moria).toBeCloseTo(12, 3);
  });

  it("says how many moria above or below the nearest Degree the voice is", () => {
    const session = setup();

    expect(session.readVoice(at(14))).toMatchObject({ degreeId: "Pa" });
    expect(session.readVoice(at(14))?.offMoria).toBeCloseTo(2, 3);
    expect(session.readVoice(at(19))).toMatchObject({ degreeId: "Vou" });
    expect(session.readVoice(at(19))?.offMoria).toBeCloseTo(-3, 3);
  });

  it("follows the Genus on the Ladder", () => {
    const session = setup();
    // Hard Chromatic from Pa: Pa 12, Vou 18, Ga 38 (intervals 6, 20, 4).
    session.setGenus("hard-chromatic");

    const reading = session.readVoice(at(18));

    expect(reading?.degreeId).toBe("Vou");
    expect(reading?.offMoria).toBeCloseTo(0, 3);
  });

  it("follows an Attraction switched on", () => {
    const session = setup();
    session.setModeVariant({ mode: "first", melos: "heirmologic" });
    const zo = session.ladder().attractions.find((a) => a.degree === "Zo" && a.moria < 0)!;
    session.toggleAttraction(zo.id);

    // Zo lowered by 4 moria: 60 above Ni.
    expect(session.readVoice(at(60))).toMatchObject({ degreeId: "Zo" });
    expect(session.readVoice(at(60))?.offMoria).toBeCloseTo(0, 3);
  });

  it("reads a voice an octave away from the Ladder on the Ladder, by its Degree", () => {
    // Pa two octaves up: beyond high Ga', read as Pa' an octave lower.
    const reading = setup().readVoice(at(12 + 144));

    expect(reading?.degreeId).toBe("Pa'");
    expect(reading?.moria).toBeCloseTo(84, 3);
  });

  it("follows the Reference Pitch", () => {
    const session = setup();
    session.setPitchSettings({ referencePitch: { note: "D3", fineHz: 0 } });
    const d3 = 146.8324;

    expect(session.readVoice(d3)).toMatchObject({ degreeId: "Ni" });
    expect(session.readVoice(d3)?.offMoria).toBeCloseTo(0, 3);
  });
});
