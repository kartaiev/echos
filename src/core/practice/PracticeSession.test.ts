import { describe, expect, it } from "vitest";
import { createPracticeSession } from "./PracticeSession";
import { createRecordingAudioOutput } from "../../audio/recordingAudioOutput";
import { degreeId } from "../theory/scale";
import { MELOS_IDS, MODE_IDS } from "../theory/modeVariants";

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
    expect(ladder.source).toMatch(/Trisagion School/);
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
// C3 * 2^(moria/72), moria summed from the intervals of the Trisagion School "The Scales" chart, written out
// from low Ke to high Ga' (* = beyond the chart's printed range, continuing its repeating pattern):
// Diatonic        10* 8 | 12 10 8 12 12 10 8 | 12* 10* 8*
// Soft Chromatic  8* 12* | 8 14 8 12 8 14 8 | 12 8* 14*
// Hard Chromatic  20 4 | 12 6 20 4 12 6 20 | 4 12 6*
// Enharmonic      12* 6* | 12 12 6 12 12 6 12 | 12 6 12*
const LADDER_IDS = ["Ke,", "Zo,", "Ni", "Pa", "Vou", "Ga", "Di", "Ke", "Zo", "Ni'", "Pa'", "Vou'", "Ga'"];
const EXPECTED_HZ = {
  diatonic: [110.0, 121.12, 130.81, 146.83, 161.67, 174.61, 196.0, 220.0, 242.23, 261.63, 293.66, 323.34, 349.23],
  "soft-chromatic": [107.9, 116.54, 130.81, 141.29, 161.67, 174.61, 196.0, 211.69, 242.23, 261.63, 293.66, 317.18, 362.94],
  "hard-chromatic": [103.83, 125.87, 130.81, 146.83, 155.56, 188.59, 196.0, 220.0, 233.08, 282.57, 293.66, 329.63, 349.23],
  enharmonic: [110.0, 123.47, 130.81, 146.83, 164.81, 174.61, 196.0, 220.0, 233.08, 261.63, 293.66, 311.13, 349.23],
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
    expect(ladder.degrees.map((d) => d.moriaToNext)).toEqual([20, 4, 12, 6, 20, 4, 12, 6, 20, 4, 12, 6, null]);
    expect(ladder.totalMoria).toBe(126);
  });

  it("keeps one drawing range for every Genus, so a Degree that does not move stays in place", () => {
    const { session } = setup();

    const ranges = (["diatonic", "soft-chromatic", "hard-chromatic", "enharmonic"] as const).map((genus) => {
      session.setGenus(genus);
      return session.ladder().drawingRange;
    });

    // Lowest: Hard Chromatic low Ke, 24 moria below Ni; highest: Soft Chromatic Ga', 106 moria above Ni.
    expect(ranges).toEqual(Array(4).fill({ lowestMoria: -24, highestMoria: 106 }));
  });
});

// Diatonic frequencies from Ni = C3, as above: Ni 130.81, Vou 161.67, Di 196.00, Ke 220.00 Hz.
describe("Practice Session: Ison", () => {
  it("holds a sustained sound at the frequency of the chosen Degree", () => {
    const { audio, session } = setup();

    session.setIson("Di");

    expect(audio.sounds).toHaveLength(1);
    expect(audio.sounds[0]).toMatchObject({ kind: "ison", durationMs: null, stopped: false });
    expect(audio.sounds[0]?.frequency).toBeCloseTo(196.0, 2);
  });

  it("moves to another Degree: the old sound ends and the new one starts", () => {
    const { audio, session } = setup();

    session.setIson("Di");
    session.setIson("Ke");

    expect(audio.sounds.map((s) => [s.kind, s.stopped])).toEqual([["ison", true], ["ison", false]]);
    expect(audio.sounds[1]?.frequency).toBeCloseTo(220.0, 2);
  });

  it("keeps sounding while Degrees are played over it", () => {
    const { audio, session } = setup();

    session.setIson("Ni");
    session.playDegree("Pa");
    session.playDegree("Vou");

    expect(audio.sounds.map((s) => [s.kind, s.stopped])).toEqual([["ison", false], ["degree", true], ["degree", false]]);
  });

  it("stops, and reports which Degree it holds", () => {
    const { audio, session } = setup();

    session.setIson("Vou");
    const whileHeld = session.ison().degreeId;
    session.stopIson();

    expect(whileHeld).toBe("Vou");
    expect(session.ison().degreeId).toBeNull();
    expect(audio.sounds[0]).toMatchObject({ kind: "ison", stopped: true });
    expect(audio.sounds[0]?.frequency).toBeCloseTo(161.67, 2);
  });

  // Hard Chromatic Vou from the table above: 155.56 Hz; Ni = D3: 146.83 Hz.
  it("retunes to the new pitch of its Degree when the Genus or the Reference Pitch changes", () => {
    const { audio, session } = setup();

    session.setIson("Vou");
    session.setGenus("hard-chromatic");
    session.setIson("Ni");
    session.setPitchSettings({ referencePitch: { note: "D3", fineHz: 0 } });

    expect(audio.sounds.map((s) => s.stopped)).toEqual([true, true, true, false]);
    expect(audio.sounds.map((s) => s.frequency)).toEqual(
      [161.67, 155.56, 130.81, 146.83].map((hz) => expect.closeTo(hz, 2)),
    );
  });

  it("keeps sounding without a break when the new Genus leaves its Degree in place", () => {
    const { audio, session } = setup();

    session.setIson("Di");
    session.setGenus("soft-chromatic");
    session.setGenus("enharmonic");

    expect(audio.sounds).toHaveLength(1);
    expect(audio.sounds[0]?.stopped).toBe(false);
  });

  it("sings the chosen vowel at the chosen volume", () => {
    const { audio, session } = setup();

    session.setIsonVoice({ vowel: "o", volume: 0.4 });
    session.setIson("Ni");

    expect(audio.sounds[0]).toMatchObject({ kind: "ison", vowel: "o", volume: 0.4 });
  });

  it("changes the volume while it sounds, without restarting the sound", () => {
    const { audio, session } = setup();

    session.setIson("Ni");
    session.setIsonVoice({ volume: 0.25 });

    expect(audio.sounds).toHaveLength(1);
    expect(audio.sounds[0]).toMatchObject({ stopped: false, volume: 0.25 });
  });

  it("changes the vowel while it sounds by restarting the sound on the same Degree", () => {
    const { audio, session } = setup();

    session.setIson("Di");
    session.setIsonVoice({ vowel: "ou" });

    expect(audio.sounds.map((s) => [s.vowel, s.stopped])).toEqual([["a", true], ["ou", false]]);
    expect(audio.sounds[1]?.frequency).toBeCloseTo(196.0, 2);
  });

  it("starts from the vowel and volume restored from the device", () => {
    const audio = createRecordingAudioOutput();
    const session = createPracticeSession({ audio, isonVoice: { vowel: "e", volume: 0.5 } });

    session.setIson("Ni");

    expect(session.ison()).toEqual({ degreeId: "Ni", vowel: "e", volume: 0.5 });
    expect(audio.sounds[0]).toMatchObject({ vowel: "e", volume: 0.5 });
  });

  it("toggles: holding the Degree it already holds stops it, holding another Degree moves it there", () => {
    const { audio, session } = setup();

    session.toggleIson("Ni");
    session.toggleIson("Di");
    session.toggleIson("Di");

    expect(audio.sounds.map((s) => [s.kind, s.stopped])).toEqual([["ison", true], ["ison", true]]);
    expect(audio.sounds.map((s) => s.frequency)).toEqual([expect.closeTo(130.81, 2), expect.closeTo(196.0, 2)]);
    expect(session.ison().degreeId).toBeNull();
  });
});

// Mode Variants: Heirmologic after Trisagion School, ByzB-101 Modal Theory Review ("Heirmologic Genre": Base and
// Structural Notes); Sticheraric after Melling, "Reading Psalmodia" (2000), §9.
// Base frequencies from Ni = C3 in the Genus of the variant (worked out in Python, as above).
const MODE_VARIANT_TABLE = [
  ["first", "heirmologic", "diatonic", "Pa", 146.83, ["Pa", "Di"]],
  ["first", "sticheraric", "diatonic", "Pa", 146.83, ["Pa", "Ga"]],
  ["second", "heirmologic", "hard-chromatic", "Pa", 146.83, ["Pa", "Di"]],
  ["second", "sticheraric", "soft-chromatic", "Di", 196.0, ["Ni", "Vou", "Di"]],
  ["third", "heirmologic", "enharmonic", "Ga", 174.61, ["Pa", "Ga", "Ke"]],
  ["third", "sticheraric", "enharmonic", "Ga", 174.61, ["Pa", "Ga", "Ke"]],
  ["fourth", "heirmologic", "diatonic", "Vou", 161.67, ["Pa", "Vou", "Di"]],
  ["fourth", "sticheraric", "diatonic", "Pa", 146.83, ["Pa", "Vou", "Di"]],
  ["plagal-first", "heirmologic", "diatonic", "Pa", 146.83, ["Pa", "Ga"]],
  ["plagal-first", "sticheraric", "diatonic", "Pa", 146.83, ["Pa", "Di", "Ke"]],
  ["plagal-second", "heirmologic", "soft-chromatic", "Di", 196.0, ["Vou", "Di", "Zo"]],
  ["plagal-second", "sticheraric", "hard-chromatic", "Pa", 146.83, ["Pa", "Di", "Ke"]],
  ["grave", "heirmologic", "enharmonic", "Ga", 174.61, ["Pa", "Ga", "Di"]],
  ["grave", "sticheraric", "diatonic", "Zo,", 121.12, ["Pa", "Ga", "Di", "Zo"]],
  ["plagal-fourth", "heirmologic", "diatonic", "Ni", 130.81, ["Ni", "Vou", "Di"]],
  ["plagal-fourth", "sticheraric", "diatonic", "Ni", 130.81, ["Ni", "Vou", "Di"]],
] as const;

describe("Practice Session: Mode Variants", () => {
  it("Plagal 2nd Heirmologic gives the Soft Chromatic Scale and moves a sounding Ison to the Base", () => {
    const { audio, session } = setup();

    session.setIson("Ni");
    session.setModeVariant({ mode: "plagal-second", melos: "heirmologic" });
    session.playDegree("Pa");

    expect(session.ladder().genus).toBe("soft-chromatic");
    expect(audio.sounds.map((s) => [s.kind, s.stopped])).toEqual([["ison", true], ["ison", false], ["degree", false]]);
    // Ison from Ni 130.81 Hz to the Base Di 196.00 Hz; Soft Chromatic Pa 141.29 Hz.
    expect(audio.sounds.map((s) => s.frequency)).toEqual(
      [130.81, 196.0, 141.29].map((hz) => expect.closeTo(hz, 2)),
    );
  });

  it("Plagal 2nd Sticheraric gives the Hard Chromatic Scale", () => {
    const { audio, session } = setup();

    session.setModeVariant({ mode: "plagal-second", melos: "sticheraric" });
    session.playDegree("Ga");

    expect(session.ladder().genus).toBe("hard-chromatic");
    // Hard Chromatic Ga 188.59 Hz.
    expect(audio.sounds[0]?.frequency).toBeCloseTo(188.59, 2);
  });

  it("makes no sound when chosen while the Ison is silent", () => {
    const { audio, session } = setup();

    session.setModeVariant({ mode: "first", melos: "heirmologic" });

    expect(audio.sounds).toEqual([]);
    expect(session.ison().degreeId).toBeNull();
  });

  it.each(MODE_VARIANT_TABLE)(
    "%s %s: %s, Ison on the Base %s at %f Hz, Dominant Degrees %j",
    (mode, melos, genus, base, baseHz, dominants) => {
      const { audio, session } = setup();

      session.setIson("Ni");
      session.setModeVariant({ mode, melos });
      const ladder = session.ladder();
      const sounding = audio.sounds.filter((s) => !s.stopped);

      expect(ladder.genus).toBe(genus);
      expect(ladder.degrees.filter((d) => d.isBase).map((d) => d.id)).toEqual([base]);
      expect(ladder.degrees.filter((d) => d.isDominant).map((d) => d.id)).toEqual(dominants);
      expect(session.ison().degreeId).toBe(base);
      expect(sounding).toHaveLength(1);
      expect(sounding[0]?.kind).toBe("ison");
      expect(sounding[0]?.frequency).toBeCloseTo(baseHz, 2);
    },
  );

  it("moves a sounding Ison to the Base of the next Mode Variant", () => {
    const { audio, session } = setup();

    session.setIson("Di");
    session.setModeVariant({ mode: "third", melos: "heirmologic" });

    expect(audio.sounds.map((s) => s.stopped)).toEqual([true, false]);
    expect(audio.sounds[1]?.frequency).toBeCloseTo(174.61, 2);
    expect(session.ison().degreeId).toBe("Ga");
  });

  it("leaves the Mode Variant when a Genus is chosen by hand, and no Degree is marked any more", () => {
    const { session } = setup();

    session.setModeVariant({ mode: "first", melos: "heirmologic" });
    session.setGenus("enharmonic");

    expect(session.modeVariant()).toBeNull();
    expect(session.ladder().degrees.some((d) => d.isBase || d.isDominant)).toBe(false);
  });

  it("starts in the Mode Variant restored from the device, silently", () => {
    const audio = createRecordingAudioOutput();
    const session = createPracticeSession({ audio, modeVariant: { mode: "second", melos: "sticheraric" } });

    session.playDegree("Ke");

    expect(session.modeVariant()).toEqual({ mode: "second", melos: "sticheraric" });
    // Only the Degree sounds, no Ison: Soft Chromatic Ke 211.69 Hz.
    expect(audio.sounds.map((s) => s.kind)).toEqual(["degree"]);
    expect(audio.sounds[0]?.frequency).toBeCloseTo(211.69, 2);
  });

  it("can be left: the Genus stays, the Ison keeps sounding, no Degree is marked", () => {
    const { audio, session } = setup();

    session.setIson("Di");
    session.setModeVariant({ mode: "second", melos: "sticheraric" });
    session.leaveModeVariant();

    expect(session.modeVariant()).toBeNull();
    expect(session.ladder().genus).toBe("soft-chromatic");
    expect(session.ladder().degrees.some((d) => d.isBase || d.isDominant)).toBe(false);
    expect(audio.sounds.map((s) => [s.kind, s.stopped])).toEqual([["ison", false]]);
  });
});

// Intonations from the Trisagion chart (ByzB-101, Heirmologic Genre), one Chronos = 600 ms (Melling's Medium tempo,
// 100 chronoi a minute). Frequencies from Ni = C3 in the Genus of the Mode Variant, as above.
describe("Practice Session: Intonations", () => {
  it("sings the 1st Mode Heirmologic Intonation Degree by Degree with its lengths, and reports its text", () => {
    const { audio, session } = setup();

    const played = session.playIntonation({ mode: "first", melos: "heirmologic" });

    expect(played).toEqual({ text: "Ah-nah-nes", greekText: "Ά-να-νες", durationMs: 2400 });
    expect(audio.sounds.map(({ kind, startMs, durationMs }) => ({ kind, startMs, durationMs }))).toEqual([
      { kind: "intonation", startMs: 0, durationMs: 900 },
      { kind: "intonation", startMs: 900, durationMs: 300 },
      { kind: "intonation", startMs: 1200, durationMs: 1200 },
    ]);
    // Ni, Pa, Pa.
    expect(audio.sounds.map((s) => s.frequency)).toEqual([130.81, 146.83, 146.83].map((hz) => expect.closeTo(hz, 2)));
  });

  it("sings in the Genus of its Mode Variant: Plagal 2nd Heirmologic in Soft Chromatic", () => {
    const { audio, session } = setup();

    session.playIntonation({ mode: "plagal-second", melos: "heirmologic" });

    // Vou 161.67, Di 196.00, Ga 174.61, Vou, Ga, Di; lengths 1, 1.5, 1, 1.5, 0.5, 2 chronoi.
    expect(audio.sounds.map((s) => s.frequency)).toEqual(
      [161.67, 196.0, 174.61, 161.67, 174.61, 196.0].map((hz) => expect.closeTo(hz, 2)),
    );
    expect(audio.sounds.map((s) => s.durationMs)).toEqual([600, 900, 600, 900, 300, 1200]);
  });

  it("leaves the Ison sounding and stops an Intonation still playing", () => {
    const { audio, session } = setup();

    session.setIson("Ga");
    session.playIntonation({ mode: "third", melos: "heirmologic" });
    session.playIntonation({ mode: "grave", melos: "heirmologic" });

    expect(audio.sounds.map((s) => [s.kind, s.stopped])).toEqual([
      ["ison", false],
      ["intonation", true],
      ["intonation", true],
      ["intonation", true],
      ["intonation", false],
      ["intonation", false],
      ["intonation", false],
    ]);
  });

  it("plays nothing for a Mode Variant whose source gives no Intonation", () => {
    const { audio, session } = setup();

    expect(session.playIntonation({ mode: "second", melos: "sticheraric" })).toBeNull();
    expect(audio.sounds).toEqual([]);
  });
});

// A Chronos lasts 60000 / (chronoi per minute) ms: 80 chronoi a minute is 750 ms, 120 is 500 ms.
describe("Practice Session: Metronome", () => {
  it("at 80 chronoi a minute in groups of three requests a click every 750 ms with an accent on every third", () => {
    const { audio, session } = setup();

    session.setMetronome({ chronoiPerMinute: 80, grouping: 3 });
    session.startMetronome();

    expect(audio.clickTracks).toHaveLength(1);
    expect(audio.clickTracks[0]).toMatchObject({ intervalMs: 750, accentEvery: 3, stopped: false });
    expect(session.metronome()).toMatchObject({ chronoiPerMinute: 80, grouping: 3, running: true });
  });

  it("starts at Melling's Medium tempo, 100 chronoi a minute, in groups of two, and makes no sound until started", () => {
    const { audio, session } = setup();

    expect(session.metronome()).toMatchObject({ chronoiPerMinute: 100, grouping: 2, running: false, count: null });
    expect(audio.clickTracks).toEqual([]);

    session.startMetronome();

    expect(audio.clickTracks[0]).toMatchObject({ intervalMs: 600, accentEvery: 2 });
  });

  it("stops the clicks", () => {
    const { audio, session } = setup();

    session.startMetronome();
    session.stopMetronome();

    expect(audio.clickTracks[0]?.stopped).toBe(true);
    expect(session.metronome()).toMatchObject({ running: false, count: null });
  });

  it("starting twice keeps one click track", () => {
    const { audio, session } = setup();

    session.startMetronome();
    session.startMetronome();

    expect(audio.clickTracks.map((c) => c.stopped)).toEqual([false]);
  });

  // At 80 chronoi a minute a Chronos lasts 750 ms: 0-749 ms is the 1st, 1500-2249 the 3rd, 2250 starts the next group.
  it.each([
    [0, 1],
    [749, 1],
    [750, 2],
    [1600, 3],
    [2250, 1],
  ])("counts the Chronos in the group from the clicks heard: at %i ms the count is %i", (elapsedMs, count) => {
    const { audio, session } = setup();

    session.setMetronome({ chronoiPerMinute: 80, grouping: 3 });
    session.startMetronome();
    audio.clickTracks[0]!.elapsedMs = elapsedMs;

    expect(session.metronome().count).toBe(count);
  });

  it("shows no count before the first click is heard", () => {
    const { audio, session } = setup();

    session.startMetronome();
    audio.clickTracks[0]!.elapsedMs = -20;

    expect(session.metronome().count).toBeNull();
  });

  it("changing tempo or grouping while it runs restarts the clicks from the first of the group", () => {
    const { audio, session } = setup();

    session.startMetronome();
    session.setMetronome({ chronoiPerMinute: 120 });
    session.setMetronome({ grouping: 4 });

    expect(audio.clickTracks.map(({ intervalMs, accentEvery, stopped }) => ({ intervalMs, accentEvery, stopped }))).toEqual([
      { intervalMs: 600, accentEvery: 2, stopped: true },
      { intervalMs: 500, accentEvery: 2, stopped: true },
      { intervalMs: 500, accentEvery: 4, stopped: false },
    ]);
  });

  it("changing tempo while stopped makes no sound", () => {
    const { audio, session } = setup();

    session.setMetronome({ chronoiPerMinute: 120, grouping: 4 });

    expect(audio.clickTracks).toEqual([]);
  });

  it.each([
    [10, 40],
    [300, 240],
    [87.6, 88],
  ])("keeps the tempo a whole number of chronoi a minute between 40 and 240: %f becomes %i", (asked, kept) => {
    const { session } = setup();

    session.setMetronome({ chronoiPerMinute: asked });

    expect(session.metronome().chronoiPerMinute).toBe(kept);
  });

  it("restores tempo and grouping saved on the device without sounding", () => {
    const audio = createRecordingAudioOutput();
    const session = createPracticeSession({ audio, metronome: { chronoiPerMinute: 120, grouping: 4 } });

    expect(audio.clickTracks).toEqual([]);
    session.startMetronome();

    expect(audio.clickTracks[0]).toMatchObject({ intervalMs: 500, accentEvery: 4 });
  });

  it("runs together with the Ison: neither starts, stops nor restarts the other", () => {
    const { audio, session } = setup();

    session.setIson("Ni");
    session.startMetronome();
    session.setIson("Di");
    session.setMetronome({ chronoiPerMinute: 120 });
    session.stopIson();
    session.stopMetronome();
    session.setIson("Pa");
    session.startMetronome();

    expect(audio.sounds.map((s) => [s.kind, s.stopped])).toEqual([["ison", true], ["ison", true], ["ison", false]]);
    expect(audio.clickTracks.map((c) => [c.intervalMs, c.stopped])).toEqual([[600, true], [500, true], [500, false]]);
  });
});

// Tempo Presets after Melling, "Reading Psalmodia" (2000), §11 Rhythm & Tempo, in beats (chronoi) per minute:
// Slow (Bradeia) 80-100, Medium (Mesi) 100-120, Moderate (Metria) 120-160, Quick (Tacheia) 160-180,
// Very Quick (Tachytati) from 180. Speech tempo (Chyma) is unmetred and not a Tempo Preset.
describe("Practice Session: Tempo Presets", () => {
  it("lists the presets slowest first, with their ranges, source and review status", () => {
    const { session } = setup();

    const presets = session.tempoPresets();

    expect(presets.map((p) => [p.id, p.value.minChronoiPerMinute, p.value.maxChronoiPerMinute])).toEqual([
      ["bradeia", 80, 100],
      ["mesi", 100, 120],
      ["metria", 120, 160],
      ["tacheia", 160, 180],
      ["tachytati", 180, null],
    ]);
    expect(presets.every((p) => p.reviewStatus === "unreviewed" && /Melling/.test(p.source))).toBe(true);
  });

  it.each([
    ["bradeia", 80, 750],
    ["mesi", 100, 600],
    ["metria", 120, 500],
    ["tacheia", 160, 375],
    ["tachytati", 180, 333.33],
  ] as const)("choosing %s sets the slowest tempo of its range, %i chronoi a minute (%i ms)", (id, chronoiPerMinute, intervalMs) => {
    const { audio, session } = setup();

    session.chooseTempoPreset(id);
    session.startMetronome();

    expect(session.metronome()).toMatchObject({ chronoiPerMinute, tempoPreset: id });
    expect(audio.clickTracks[0]?.intervalMs).toBeCloseTo(intervalMs, 2);
  });

  it.each([
    [60, null],
    [99, "bradeia"],
    [100, "mesi"],
    [140, "metria"],
    [200, "tachytati"],
  ] as const)("names the preset a tempo set by hand falls in: %i is %s", (chronoiPerMinute, preset) => {
    const { session } = setup();

    session.setMetronome({ chronoiPerMinute });

    expect(session.metronome().tempoPreset).toBe(preset);
  });

  it("keeps the grouping when a preset is chosen", () => {
    const { session } = setup();

    session.setMetronome({ grouping: 3 });
    session.chooseTempoPreset("bradeia");

    expect(session.metronome().grouping).toBe(3);
  });
});

// Martyria read off the Trisagion School "The Scales" chart: the Degree's letter with a sign below it (above it for
// low Ke and lower), and in the Enharmonic the enharmonic Fthora beside Ga, Zo' and Vou'. The chart prints low Zo to
// Ni' (Diatonic), low Ke to Vou' (Hard Chromatic), Ni to Pa' (Soft Chromatic) and Ni to Vou' (Enharmonic); the
// Degrees outside that follow the chart's own pattern (marked * below).
describe("Practice Session: Martyria", () => {
  type Expected = [degreeId: string, rootSign: string, fthora?: "enharmonic"];
  const EXPECTED: Record<string, Expected[]> = {
    diatonic: [
      ["Ke,", "alpha"], // *
      ["Zo,", "zo"],
      ["Ni", "delta"],
      ["Pa", "alpha"],
      ["Vou", "legetos"],
      ["Ga", "nana"],
      ["Di", "delta-dotted"],
      ["Ke", "alpha-dotted"],
      ["Zo", "legetos"],
      ["Ni'", "nana"],
      ["Pa'", "alpha"], // *
      ["Vou'", "legetos"], // *
      ["Ga'", "nana"], // *
    ],
    "hard-chromatic": [
      ["Ke,", "hard-chromatic-di"],
      ["Zo,", "hard-chromatic-pa"],
      ["Ni", "hard-chromatic-di"],
      ["Pa", "hard-chromatic-pa"],
      ["Vou", "hard-chromatic-di"],
      ["Ga", "hard-chromatic-pa"],
      ["Di", "hard-chromatic-di"],
      ["Ke", "hard-chromatic-pa"],
      ["Zo", "hard-chromatic-di"],
      ["Ni'", "hard-chromatic-pa"],
      ["Pa'", "hard-chromatic-di"],
      ["Vou'", "hard-chromatic-pa"],
      ["Ga'", "hard-chromatic-di"], // *
    ],
    "soft-chromatic": [
      ["Ke,", "soft-chromatic-di"], // *
      ["Zo,", "soft-chromatic-ke"], // *
      ["Ni", "soft-chromatic-di"],
      ["Pa", "soft-chromatic-ke"],
      ["Vou", "soft-chromatic-di"],
      ["Ga", "soft-chromatic-ke"],
      ["Di", "soft-chromatic-di"],
      ["Ke", "soft-chromatic-ke"],
      ["Zo", "soft-chromatic-di"],
      ["Ni'", "soft-chromatic-ke"],
      ["Pa'", "soft-chromatic-di"],
      ["Vou'", "soft-chromatic-ke"], // *
      ["Ga'", "soft-chromatic-di"], // *
    ],
    enharmonic: [
      ["Ke,", "alpha"], // *
      ["Zo,", "zo"], // *
      ["Ni", "delta"],
      ["Pa", "alpha"],
      ["Vou", "legetos"],
      ["Ga", "nana", "enharmonic"],
      ["Di", "delta-dotted"],
      ["Ke", "alpha-dotted"],
      ["Zo", "nana", "enharmonic"],
      ["Ni'", "delta-dotted"],
      ["Pa'", "alpha-dotted"],
      ["Vou'", "nana", "enharmonic"],
      ["Ga'", "delta-dotted"], // *
    ],
  };

  it.each(Object.keys(EXPECTED))("gives every Degree of the %s ladder its Martyria", (genus) => {
    const { session } = setup();

    session.setGenus(genus as Parameters<typeof session.setGenus>[0]);

    expect(session.ladder().degrees.map((d) => [d.id, d.martyria.rootSign, ...(d.martyria.fthora ? [d.martyria.fthora] : [])])).toEqual(
      EXPECTED[genus],
    );
  });

  it("writes the sign above the letter for low Ke and below it for every higher Degree", () => {
    const { session } = setup();

    const above = session.ladder().degrees.filter((d) => d.martyria.rootSignAbove).map((d) => d.id);

    expect(above).toEqual(["Ke,"]);
  });

  it("follows the Genus of the chosen Mode Variant", () => {
    const { session } = setup();

    session.setModeVariant({ mode: "plagal-second", melos: "sticheraric" });

    expect(session.ladder().degrees.find((d) => d.id === "Pa")?.martyria.rootSign).toBe("hard-chromatic-pa");
  });

  it("names the source of the Martyria", () => {
    const { session } = setup();

    expect(session.ladder().martyriaSource).toMatch(/Trisagion School.*The Scales/);
  });
});

// Attraction of Zo' in the Diatonic, from the Trisagion School course Octoëchos 201 ("1st Mode Sticheraric –
// Theoretical Overview"): Ke to Zo' is 10 moria natural and 6 when Zo' is flat, so the flat Zo' is 4 moria lower.
// Our "Zo" is their Zo': the Zo above Ke. Ni = C3 = 130.8128 Hz; Zo at 64 moria is 242.23 Hz, at 60 moria 233.08 Hz.
describe("Practice Session: Attractions", () => {
  it("offers Zo lowered by 4 moria in the Diatonic, off at first, with its source", () => {
    const { session } = setup();

    expect(session.ladder().attractions).toEqual([
      { id: "zo-lowered", degreeId: "Zo", moria: -4, active: false, source: expect.stringMatching(/Trisagion.*Octoëchos 201/), reviewStatus: "unreviewed" },
    ]);
  });

  it("with Zo lowered, playing Zo requests the altered frequency; switching it off restores the regular one", () => {
    const { audio, session } = setup();

    session.toggleAttraction("zo-lowered");
    session.playDegree("Zo");
    session.toggleAttraction("zo-lowered");
    session.playDegree("Zo");

    expect(audio.sounds.map((s) => s.frequency)).toEqual([expect.closeTo(233.08, 2), expect.closeTo(242.23, 2)]);
  });

  it("marks the lowered Degree and moves it on the ladder: Ke to Zo becomes 6 moria, Zo to Ni' 12", () => {
    const { session } = setup();

    session.toggleAttraction("zo-lowered");
    const ladder = session.ladder();
    const zo = ladder.degrees.find((d) => d.id === "Zo")!;
    const ke = ladder.degrees.find((d) => d.id === "Ke")!;

    expect(zo).toMatchObject({ moria: 60, moriaToNext: 12, attraction: -4 });
    expect(ke.moriaToNext).toBe(6);
    expect(ladder.degrees.filter((d) => d.attraction !== null).map((d) => d.id)).toEqual(["Zo"]);
    expect(ladder.attractions[0]?.active).toBe(true);
  });

  it("moves a sounding Ison on Zo with the Attraction", () => {
    const { audio, session } = setup();

    session.setIson("Zo");
    session.toggleAttraction("zo-lowered");

    expect(audio.sounds.map((s) => [s.frequency, s.stopped])).toEqual([
      [expect.closeTo(242.23, 2), true],
      [expect.closeTo(233.08, 2), false],
    ]);
  });

  it.each([
    ["choosing a Mode Variant", (s: ReturnType<typeof setup>["session"]) => s.setModeVariant({ mode: "first", melos: "heirmologic" })],
    ["leaving the Mode Variant", (s: ReturnType<typeof setup>["session"]) => s.leaveModeVariant()],
    ["choosing a Genus", (s: ReturnType<typeof setup>["session"]) => s.setGenus("diatonic")],
  ])("resets the Attractions on %s", (_, change) => {
    const { audio, session } = setup();

    session.toggleAttraction("zo-lowered");
    change(session);
    session.playDegree("Zo");

    expect(session.ladder().attractions.every((a) => !a.active)).toBe(true);
    expect(audio.sounds[0]?.frequency).toBeCloseTo(242.23, 2);
  });

  it("offers no Attraction in a Genus the source does not cover", () => {
    const { session } = setup();

    session.setGenus("soft-chromatic");

    expect(session.ladder().attractions).toEqual([]);
    expect(() => session.toggleAttraction("zo-lowered")).toThrow(/zo-lowered/);
  });
});

// Cadences after the Trisagion School course Octoëchos 201 ("Melodic Formulas/Cadences"): a complete Cadence ends on
// the Base, an incomplete one on another structural note (our Dominant Degrees). Final Cadences end a piece; the
// course names no Degree for them, so they are not listed.
describe("Practice Session: Mode Variant cards", () => {
  it.each([
    ["first", "heirmologic", ["Pa"], ["Di"]],
    ["first", "sticheraric", ["Pa"], ["Ga"]],
    ["plagal-second", "heirmologic", ["Di"], ["Vou", "Zo"]],
    ["grave", "sticheraric", ["Zo,"], ["Pa", "Ga", "Di", "Zo"]],
    ["plagal-fourth", "heirmologic", ["Ni"], ["Vou", "Di"]],
  ] as const)("%s %s cadences completely on %j and incompletely on %j", (mode, melos, complete, incomplete) => {
    const { session } = setup();

    const { cadences } = session.describeModeVariant({ mode, melos });

    expect(cadences.value.filter((c) => c.kind === "complete").map((c) => degreeId(c.degree))).toEqual(complete);
    expect(cadences.value.filter((c) => c.kind === "incomplete").map((c) => degreeId(c.degree))).toEqual(incomplete);
    expect(cadences).toMatchObject({ source: expect.stringMatching(/Octoëchos 201.*Cadences/), reviewStatus: "unreviewed" });
  });

  it("describes a Mode Variant with its Genus, Base, Dominant Degrees and source", () => {
    const { session } = setup();

    expect(session.describeModeVariant({ mode: "plagal-fourth", melos: "sticheraric" })).toMatchObject({
      genus: "diatonic",
      base: { name: "Ni", octave: 0 },
      dominants: [{ name: "Ni" }, { name: "Vou" }, { name: "Di" }],
      source: expect.stringMatching(/Melling/),
      reviewStatus: "unreviewed",
    });
  });

  // The course: "1st Mode Heirmologic also has the same introductory intonation as 1st Mode Sticheraric".
  it("sings the 1st Mode Sticheraric Intonation like the Heirmologic one: Ni, Pa, Pa", () => {
    const heirmologic = setup();
    const sticheraric = setup();

    const played = sticheraric.session.playIntonation({ mode: "first", melos: "sticheraric" });
    heirmologic.session.playIntonation({ mode: "first", melos: "heirmologic" });

    expect(played).toMatchObject({ text: "Ah-nah-nes" });
    expect(sticheraric.audio.sounds).toEqual(heirmologic.audio.sounds);
    expect(sticheraric.session.describeModeVariant({ mode: "first", melos: "sticheraric" }).source).toMatch(/Melling.*Octoëchos 201/);
  });
});

// The Theory tables page lets the reviewer read and hear every Genus without changing the practice screen.
describe("Practice Session: Theory tables", () => {
  it.each(Object.keys(EXPECTED_HZ) as (keyof typeof EXPECTED_HZ)[])(
    "describes the %s Scale with every Degree, its frequency, Martyria and sources",
    (genus) => {
      const { session } = setup();

      const scale = session.describeScale(genus);

      expect(scale.degrees.map((d) => d.id)).toEqual(LADDER_IDS);
      expect(scale.degrees.map((d) => d.frequency)).toEqual(EXPECTED_HZ[genus].map((hz) => expect.closeTo(hz, 2)));
      expect(scale.degrees.every((d) => d.martyria.rootSign.length > 0)).toBe(true);
      expect(scale).toMatchObject({
        genus,
        intervals: { source: expect.stringMatching(/Trisagion/), reviewStatus: "unreviewed" },
        martyriaSource: expect.stringMatching(/Trisagion/),
      });
      expect(session.ladder().genus).toBe("diatonic");
    },
  );

  it("lists the sourced Attractions of a Genus with the Scale", () => {
    const { session } = setup();

    expect(session.describeScale("diatonic").attractions.map((a) => a.value.id)).toEqual(["zo-lowered"]);
    expect(session.describeScale("enharmonic").attractions).toEqual([]);
  });

  it("plays a Degree of any Genus without changing the practice screen", () => {
    const { audio, session } = setup();

    session.playDegreeIn("hard-chromatic", "Vou");

    expect(audio.sounds[0]).toMatchObject({ kind: "degree", frequency: expect.closeTo(155.56, 2) });
    expect(session.ladder().genus).toBe("diatonic");
  });

  it("plays a whole Scale from Ni up to Ni', one Degree after another, 600 ms each", () => {
    const { audio, session } = setup();

    const played = session.playScale("diatonic");

    expect(audio.sounds.map((s) => s.frequency)).toEqual(EXPECTED_HZ.diatonic.slice(2, 10).map((hz) => expect.closeTo(hz, 2)));
    expect(audio.sounds.map((s) => [s.startMs, s.durationMs])).toEqual([0, 1, 2, 3, 4, 5, 6, 7].map((i) => [i * 600, 600]));
    expect(played).toEqual({ durationMs: 4800 });
  });

  it("stops a Scale still playing when another one starts", () => {
    const { audio, session } = setup();

    session.playScale("diatonic");
    session.playScale("enharmonic");

    expect(audio.sounds.slice(0, 8).every((s) => s.stopped)).toBe(true);
    expect(audio.sounds.slice(8).every((s) => !s.stopped)).toBe(true);
  });
});

// Greek Intonation texts from the course's list: άνανες, νεανές, νανά, λέγετος, ανέανες, νεχέανες, άνες, νεάγιε.
describe("Practice Session: Intonations in Greek", () => {
  it("reports the Greek syllables of an Intonation with the Latin ones", () => {
    const { session } = setup();

    expect(session.playIntonation({ mode: "plagal-second", melos: "heirmologic" })).toMatchObject({
      text: "Neh-heh-ah-nes",
      greekText: "Νε-χέ-α-νες",
    });
  });

  it("has a Greek text for every Intonation, with as many syllables as the Latin one", () => {
    const { session } = setup();

    for (const mode of MODE_IDS)
      for (const melos of MELOS_IDS) {
        const intonation = session.describeModeVariant({ mode, melos }).intonation;
        if (intonation) expect(intonation.greekText.split("-")).toHaveLength(intonation.text.split("-").length);
      }
  });
});

describe("Practice Session: sound held back by the device", () => {
  it("says so when the device keeps the sound stopped, as Safari does after a call or an app switch", () => {
    const { audio, session } = setup();
    audio.running = false;

    session.setIson("Pa");

    expect(session.soundIsHeld()).toBe(true);
  });

  it("starts the Ison and the metronome again on request, so they sound once the device lets them", () => {
    const { audio, session } = setup();
    session.setIson("Pa");
    session.startMetronome();

    session.restartSound();

    const isons = audio.sounds.filter((s) => s.kind === "ison");
    expect(isons.map((s) => s.stopped)).toEqual([true, false]);
    expect(isons[1]?.frequency).toBeCloseTo(isons[0]!.frequency, 6);
    expect(audio.clickTracks.map((t) => t.stopped)).toEqual([true, false]);
    expect(session.ison().degreeId).toBe("Pa");
    expect(session.metronome().running).toBe(true);
  });

  it("restarts nothing that was not sounding", () => {
    const { audio, session } = setup();

    session.restartSound();

    expect(audio.sounds).toEqual([]);
    expect(audio.clickTracks).toEqual([]);
  });

  it("does not, while the sound can be heard", () => {
    const { session } = setup();

    session.setIson("Pa");

    expect(session.soundIsHeld()).toBe(false);
  });
});

describe("Practice Session: Fthora on a Degree", () => {
  const moriaOf = (session: ReturnType<typeof setup>["session"], ids: string[]) =>
    ids.map((id) => session.ladder().degrees.find((d) => d.id === id)!.moria);

  // Trisagion Octoëchos 201, "Fthores, Part II": the nenano Fthora on Di in a Diatonic 1st Mode.
  it("rebuilds the Scale around the pivot, as the hard chromatic Fthora of Di does in the lesson", () => {
    const { session } = setup();
    session.setModeVariant({ mode: "first", melos: "heirmologic" });

    session.placeFthora("Di", "hard-chromatic-di");

    expect(moriaOf(session, ["Pa", "Vou", "Ga", "Di", "Ke", "Zo", "Ni'", "Pa'"])).toEqual([12, 18, 38, 42, 54, 60, 80, 84]);
    expect(session.ladder().fthora).toEqual({
      degreeId: "Di",
      placedOn: "Di",
      genus: "hard-chromatic",
      sign: "hard-chromatic-di",
      shown: true,
    });
  });

  it("keeps the pivot at its pitch where the Genera place that Degree differently", () => {
    const { session } = setup();

    session.placeFthora("Pa", "soft-chromatic-ke");

    expect(moriaOf(session, ["Ni", "Pa", "Vou", "Ga"])).toEqual([4, 12, 26, 34]);
  });

  it.each([
    ["Ga", "hard-chromatic", "hard-chromatic-pa"],
    ["Ke", "hard-chromatic", "hard-chromatic-pa"],
    ["Ni", "hard-chromatic", "hard-chromatic-di"],
    ["Zo", "hard-chromatic", "hard-chromatic-di"],
    ["Vou", "soft-chromatic", "soft-chromatic-di"],
    ["Pa", "soft-chromatic", "soft-chromatic-ke"],
    ["Ni'", "soft-chromatic", "soft-chromatic-ke"],
    ["Ni", "diatonic", "diatonic-ni-low"],
    ["Ni'", "diatonic", "diatonic-ni-high"],
    ["Zo", "diatonic", "diatonic-zo"],
  ] as const)("on %s in the %s Genus draws the sign the lesson's table gives (%s)", (degree, genus, sign) => {
    const { session } = setup();
    session.setGenus(genus === "diatonic" ? "hard-chromatic" : "diatonic");
    const name = degree.replace("'", "");

    const choice = session.fthoraChoices(degree).find((c) => c.genus === genus && c.degree === name);

    expect(choice?.sign).toBe(sign);
  });

  it("writes the Martyries of the new Genus", () => {
    const { session } = setup();

    session.placeFthora("Di", "hard-chromatic-di");

    expect(session.ladder().degrees.find((d) => d.id === "Di")?.martyria.rootSign).toBe("hard-chromatic-di");
  });

  it("marks where each moved Degree was before the Fthora, and only those", () => {
    const { session } = setup();

    session.placeFthora("Di", "hard-chromatic-di");

    const byId = new Map(session.ladder().degrees.map((d) => [d.id, d]));
    expect(byId.get("Vou")?.before).toBe(22);
    expect(byId.get("Ga")?.before).toBe(30);
    expect(byId.get("Di")?.before).toBeNull();
    expect(byId.get("Pa")?.before).toBeNull();
  });

  it("switches between the Scale before and after the Fthora without losing it", () => {
    const { session } = setup();
    session.placeFthora("Di", "hard-chromatic-di");

    session.showFthora(false);
    expect(moriaOf(session, ["Vou", "Ga"])).toEqual([22, 30]);
    expect(session.ladder().fthora?.shown).toBe(false);
    expect(session.ladder().degrees.every((d) => d.before === null)).toBe(true);

    session.showFthora(true);
    expect(moriaOf(session, ["Vou", "Ga"])).toEqual([18, 38]);
  });

  it("keeps the Ison on its Degree, at the Degree's new pitch", () => {
    const { audio, session } = setup();
    session.setIson("Vou");

    session.placeFthora("Di", "hard-chromatic-di");

    const isons = audio.sounds.filter((s) => s.kind === "ison");
    expect(isons.map((s) => s.stopped)).toEqual([true, false]);
    expect(isons[1]?.frequency).toBeCloseTo(130.8128 * 2 ** (18 / 72), 2);
    expect(session.ison().degreeId).toBe("Vou");
  });

  it("is removed by choosing a Mode Variant or a Genus, or by hand", () => {
    const { session } = setup();
    session.placeFthora("Di", "hard-chromatic-di");
    session.setModeVariant({ mode: "first", melos: "heirmologic" });
    expect(session.ladder().fthora).toBeNull();

    session.placeFthora("Di", "hard-chromatic-di");
    session.setGenus("diatonic");
    expect(session.ladder().fthora).toBeNull();

    session.placeFthora("Di", "hard-chromatic-di");
    session.clearFthora();
    expect(session.ladder().fthora).toBeNull();
    expect(moriaOf(session, ["Vou"])).toEqual([22]);
  });

  it("applies an Attraction only in its own Genus", () => {
    const { session } = setup();
    session.toggleAttraction("zo-lowered");

    session.placeFthora("Di", "hard-chromatic-di");

    expect(moriaOf(session, ["Zo"])).toEqual([60]);
    expect(session.ladder().attractions).toEqual([]);
    session.showFthora(false);
    expect(moriaOf(session, ["Zo"])).toEqual([60]);
    expect(session.ladder().attractions[0]?.active).toBe(true);
  });

  it("widens the drawing range only while a Fthora moves Degrees beyond it", () => {
    const { session } = setup();
    session.setGenus("hard-chromatic");

    session.placeFthora("Ni'", "soft-chromatic-ke");
    const widened = session.ladder().drawingRange;
    const top = session.ladder().degrees.at(-1)!.moria;
    session.showFthora(false);

    expect(widened.highestMoria).toBe(Math.max(106, top));
    expect(session.ladder().drawingRange).toEqual({ lowestMoria: -24, highestMoria: 106 });
  });

  it("offers every Diatonic Fthora that changes the Degree, then the Chromatic ones of the other Genera", () => {
    const { session } = setup();

    expect(session.fthoraChoices("Pa")).toEqual([
      { genus: "diatonic", degree: "Ni", sign: "diatonic-ni-low" },
      { genus: "diatonic", degree: "Vou", sign: "diatonic-vou" },
      { genus: "diatonic", degree: "Ga", sign: "diatonic-ga" },
      { genus: "diatonic", degree: "Di", sign: "diatonic-di" },
      { genus: "diatonic", degree: "Ke", sign: "diatonic-ke" },
      { genus: "diatonic", degree: "Zo", sign: "diatonic-zo" },
      { genus: "soft-chromatic", degree: "Pa", sign: "soft-chromatic-ke" },
      { genus: "hard-chromatic", degree: "Pa", sign: "hard-chromatic-pa" },
    ]);
    session.setGenus("hard-chromatic");
    expect(session.fthoraChoices("Ga").map((c) => [c.genus, c.degree])).toEqual([
      ["diatonic", "Ni"],
      ["diatonic", "Pa"],
      ["diatonic", "Vou"],
      ["diatonic", "Ga"],
      ["diatonic", "Di"],
      ["diatonic", "Ke"],
      ["diatonic", "Zo"],
      ["soft-chromatic", "Ga"],
    ]);
  });

  it("draws the high Ni sign where the pivot becomes the Ni above", () => {
    const { session } = setup();

    expect(session.fthoraChoices("Ke").find((c) => c.degree === "Ni")?.sign).toBe("diatonic-ni-high");
  });

  it("cites the lesson for the Fthores", () => {
    const { session } = setup();
    session.placeFthora("Di", "hard-chromatic-di");

    expect(session.ladder().fthoraSource).toMatch(/Trisagion.*Fthores/);
  });
});

describe("Practice Session: a Fthora of another Degree", () => {
  type Rung = [id: string, moria: number, formerly: string | null];
  const rungs = (session: ReturnType<typeof setup>["session"]): Rung[] =>
    session.ladder().degrees.map((d) => [d.id, d.moria, d.formerName && degreeId(d.formerName)]);

  // 1st Eothinon Doxasticon, "As the disciples were hastening": at "And they" the diatonic Fthora of Ke stands on Pa.
  // Pa keeps its pitch and is sung as Ke; every key of the Ladder takes its new name.
  it("sings the pivot under the Fthora's name and renames the whole Ladder", () => {
    const { session } = setup();
    session.setModeVariant({ mode: "first", melos: "heirmologic" });

    session.placeFthora("Pa", "diatonic-ke");

    expect(rungs(session)).toEqual([
      ["Vou,", -20, "Ke,"],
      ["Ga,", -12, "Zo,"],
      ["Di,", 0, "Ni"],
      ["Ke,", 12, "Pa"],
      ["Zo,", 22, "Vou"],
      ["Ni", 30, "Ga"],
      ["Pa", 42, "Di"],
      ["Vou", 52, "Ke"],
      ["Ga", 60, "Zo"],
      ["Di", 72, "Ni'"],
      ["Ke", 84, "Pa'"],
      ["Zo", 94, "Vou'"],
      ["Ni'", 102, "Ga'"],
    ]);
    expect(session.ladder().fthora).toEqual({ degreeId: "Ke,", placedOn: "Pa", genus: "diatonic", sign: "diatonic-ke", shown: true });
  });

  it("marks where the renamed Degrees were, and only those that moved", () => {
    const { session } = setup();

    session.placeFthora("Pa", "diatonic-ke");

    const before = new Map(session.ladder().degrees.map((d) => [d.id, d.before]));
    expect(before.get("Ga,")).toBe(-8);
    expect(before.get("Vou")).toBe(54);
    expect(before.get("Pa")).toBeNull();
  });

  it("writes the Martyria of the new name, also beyond the chart", () => {
    const { session } = setup();

    session.placeFthora("Pa", "diatonic-ke");

    const signs = new Map(session.ladder().degrees.map((d) => [d.id, d.martyria.rootSign]));
    expect(signs.get("Pa")).toBe("alpha");
    expect(signs.get("Vou,")).toBe("legetos");
  });

  // At "and learned" the melody goes up six Degrees to the new Ni', where the diatonic Fthora of Ga stands:
  // the old Ga'. The Scale is back where it started, in pitch and in name.
  it("chains a second Fthora on the renamed Ladder: Ga on the new Ni' brings the Scale back", () => {
    const { session } = setup();
    session.setModeVariant({ mode: "first", melos: "heirmologic" });
    const plain = rungs(session);

    session.placeFthora("Pa", "diatonic-ke");
    session.placeFthora("Ni'", "diatonic-ga");

    expect(rungs(session)).toEqual(plain);
    expect(session.ladder().fthora).toEqual({ degreeId: "Ga'", placedOn: "Ni'", genus: "diatonic", sign: "diatonic-ga", shown: true });
    expect(session.ladder().fthores).toEqual([
      { degreeId: "Pa", sign: "diatonic-ke" },
      { degreeId: "Ga'", sign: "diatonic-ga" },
    ]);
  });

  it("compares and removes the last Fthora of a chain", () => {
    const { session } = setup();
    session.placeFthora("Pa", "diatonic-ke");
    const renamed = rungs(session);
    session.placeFthora("Ni'", "diatonic-ga");

    session.showFthora(false);
    expect(rungs(session).map(([id, moria]) => [id, moria])).toEqual(renamed.map(([id, moria]) => [id, moria]));

    session.showFthora(true);
    session.clearFthora();
    expect(rungs(session)).toEqual(renamed);
    expect(session.ladder().fthora?.sign).toBe("diatonic-ke");

    session.clearFthora();
    expect(session.ladder().fthora).toBeNull();
    expect(session.ladder().degrees.every((d) => d.formerName === null)).toBe(true);
  });

  it("puts a Fthora placed on the last pivot in the place of the last one", () => {
    const { session } = setup();
    session.placeFthora("Pa", "diatonic-ke");

    session.placeFthora("Ke,", "diatonic-di");

    expect(session.ladder().fthores).toEqual([{ degreeId: "Di", sign: "diatonic-di" }]);
    expect(session.ladder().degrees.find((d) => d.id === "Di")?.moria).toBe(12);
  });

  it("drops a Fthora set aside with Before when another is placed", () => {
    const { session } = setup();
    session.placeFthora("Pa", "diatonic-ke");
    session.showFthora(false);

    session.placeFthora("Di", "hard-chromatic-di");

    expect(session.ladder().fthores).toEqual([{ degreeId: "Di", sign: "hard-chromatic-di" }]);
  });

  it("keeps the Ison on its key, which now has another name", () => {
    const { audio, session } = setup();
    session.setIson("Pa");

    session.placeFthora("Pa", "diatonic-ke");

    expect(session.ison().degreeId).toBe("Ke,");
    expect(audio.sounds.filter((s) => s.kind === "ison").map((s) => s.stopped)).toEqual([false]);
  });

  it("keeps the Base and Dominant marks on their keys", () => {
    const { session } = setup();
    session.setModeVariant({ mode: "first", melos: "heirmologic" });

    session.placeFthora("Pa", "diatonic-ke");

    expect(session.ladder().degrees.find((d) => d.isBase)?.id).toBe("Ke,");
  });

  it("offers the choices of the Scale before the last Fthora on its pivot", () => {
    const { session } = setup();
    session.placeFthora("Pa", "diatonic-ke");

    const diatonic = session.fthoraChoices("Ke,").filter((c) => c.genus === "diatonic").map((c) => c.degree);

    expect(diatonic).not.toContain("Pa");
    expect(diatonic).toContain("Ke");
  });
});
