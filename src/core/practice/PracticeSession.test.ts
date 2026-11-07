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

    expect(played).toEqual({ text: "Ah-nah-nes", durationMs: 2400 });
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

    expect(session.playIntonation({ mode: "first", melos: "sticheraric" })).toBeNull();
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
