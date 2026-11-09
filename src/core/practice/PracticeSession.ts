import type { AudioOutput, PlayingClickTrack, PlayingSound } from "../../audio/AudioOutput";
import { MARTYRIA, martyriaAnywhere, martyriaOf, type Martyria } from "../theory/martyria";
import { cadencesOf, MODE_VARIANTS, type Cadence, type ModeVariant, type ModeVariantKey } from "../theory/modeVariants";
import { FTHORA_GENERA, FTHORES, fthoraSign, type FthoraGenus, type FthoraSign } from "../theory/fthora";
import { buildScale, degreeId, degreeIndex, nearestPosition, positionAt, type DegreePosition, type ScaleDegree } from "../theory/scale";
import {
  DEGREE_NAMES,
  GENUS_IDS,
  PMC_1881,
  type Attraction,
  type AttractionId,
  type DegreeName,
  type GenusId,
  type IntervalCycle,
  type ReviewStatus,
  type SourcedValue,
  type TuningSystemId,
} from "../theory/tuningSystems";
import { DEFAULT_PITCH_SETTINGS, niFrequency, soundingNote, type PitchSettings } from "./pitchSettings";
import type { NoteName } from "../theory/westernPitch";
import { DEFAULT_ISON_VOICE, type IsonVoice } from "./isonVoice";
import { TEMPO_PRESETS, tempoPreset, tempoPresetOf, type TempoPreset, type TempoPresetId } from "../theory/tempoPresets";
import { chronosMs, clampTempo, DEFAULT_METRONOME_SETTINGS, type MetronomeSettings } from "./metronomeSettings";

export type { PitchSettings, ReferencePitch, Register } from "./pitchSettings";
export type { IsonVoice } from "./isonVoice";
export type { Grouping, MetronomeSettings } from "./metronomeSettings";
export type { TempoPreset, TempoPresetId } from "../theory/tempoPresets";
export type { Martyria, MartyriaFthora, RootSign } from "../theory/martyria";
export type { AttractionId } from "../theory/tuningSystems";
export type { Cadence, CadenceKind } from "../theory/modeVariants";
export type { FthoraGenus, FthoraSign } from "../theory/fthora";
export { FTHORA_GENERA } from "../theory/fthora";

const DEGREE_DURATION_MS = 1200;
/** One Chronos of an Intonation or a sung Scale: Melling's Medium (Mesi) tempo, 100 chronoi a minute. */
const INTONATION_CHRONOS_MS = chronosMs(100);
/** Degrees and Intonations always sing "a" at full volume; only the Ison voice is adjustable. */
const SUNG_VOWEL = "a";
const SUNG_VOLUME = 1;

/** The ladder covers the range most Modes use: low Ke to high Ga'. */
const LADDER_LOWEST: DegreePosition = { name: "Ke", octave: -1 };
const LADDER_HIGHEST: DegreePosition = { name: "Ga", octave: 1 };
const LOWEST_INDEX = degreeIndex(LADDER_LOWEST);
const HIGHEST_INDEX = degreeIndex(LADDER_HIGHEST);

/**
 * A Fthora in the chain. It stands on a key of the Ladder (counted from the lowest), which becomes `position` of
 * `genus`; `placedOn` is the name the key had then.
 */
interface PlacedFthora {
  rung: number;
  position: DegreePosition;
  placedOn: string;
  genus: FthoraGenus;
  sign: FthoraSign;
}

/** A Scale on the Ladder's keys and the Genus it sounds in. */
interface LadderScale {
  degrees: ScaleDegree[];
  genus: GenusId;
}

/** Pitch settings plus what they mean in sound, for display. */
export interface PitchState extends PitchSettings {
  /** The note Ni sounds at in the current Register, before fine adjustment. */
  niNote: NoteName;
  niHz: number;
}

export interface PracticeSessionOptions {
  audio: AudioOutput;
  /** Settings restored from the device; defaults to Ni = C3, male register. */
  pitchSettings?: PitchSettings;
  /** Ison vowel and volume restored from the device. */
  isonVoice?: IsonVoice;
  /** The Mode Variant last chosen on this device; restoring it makes no sound. */
  modeVariant?: ModeVariantKey;
  /** Tempo and grouping restored from the device; restoring them makes no sound. */
  metronome?: MetronomeSettings;
}

export interface LadderDegree extends Omit<ScaleDegree, "frequency"> {
  /** Size of the interval to the Degree above, or null for the top Degree. */
  moriaToNext: number | null;
  /** The home Degree of the chosen Mode Variant. */
  isBase: boolean;
  /** A Degree of structural weight in the chosen Mode Variant. */
  isDominant: boolean;
  /** How the Degree is marked in the score in this Genus. */
  martyria: Martyria;
  /** Moria an active Attraction moves this Degree by, or null. */
  attraction: number | null;
  /** Where the Degree was before the Fthora moved it, in moria; null when it did not move or no Fthora shows. */
  before: number | null;
  /** The name this key has in the Scale before any Fthora, when a Fthora has given it another; else null. */
  formerName: DegreePosition | null;
}

/**
 * The last Fthora of the chain: the key it stands on (by its name now), the name that key had when the Fthora was
 * placed, the Genus it brings in, the sign drawn there, and whether its Scale shows.
 */
export interface FthoraState {
  degreeId: string;
  placedOn: string;
  genus: FthoraGenus;
  sign: FthoraSign;
  /** False while the student listens to the Scale before the Fthora; the Fthora stays placed. */
  shown: boolean;
}

/** An Attraction the student can switch on in the current Genus. */
export interface AttractionState {
  id: AttractionId;
  degreeId: string;
  moria: number;
  active: boolean;
  source: string;
  reviewStatus: ReviewStatus;
}

/** Positions in moria from Ni that the ladder is drawn between. */
export interface DrawingRange {
  lowestMoria: number;
  highestMoria: number;
}

export interface Ladder {
  degrees: LadderDegree[];
  genus: GenusId;
  /** Moria from the lowest to the highest Degree on the ladder in this Genus. */
  totalMoria: number;
  /**
   * The same for every Genus of the Tuning System, so that switching Genus moves only the Degrees that
   * change; a Fthora widens it only as far as it moves Degrees beyond. The UI draws the ladder between these.
   */
  drawingRange: DrawingRange;
  tuningSystemId: TuningSystemId;
  moriaPerOctave: number;
  /** Bibliographic citation of the interval values; shown as written, not translated. */
  source: string;
  /** Bibliographic citation of the Martyria. */
  martyriaSource: string;
  attractions: AttractionState[];
  fthora: FthoraState | null;
  /** Every Fthora that shapes the Scale now, in the order placed, with the key it stands on. */
  fthores: { degreeId: string; sign: FthoraSign }[];
  /** Bibliographic citation of the Fthores. */
  fthoraSource: string;
}

/** A Degree as the Theory tables show it: position, sound and Martyria in one Genus. */
export interface TableDegree extends ScaleDegree {
  moriaToNext: number | null;
  martyria: Martyria;
}

/** Everything the Theory tables show for one Genus of the Tuning System, with sources. */
export interface ScaleDescription {
  genus: GenusId;
  tuningSystemId: TuningSystemId;
  moriaPerOctave: number;
  intervals: SourcedValue<IntervalCycle>;
  degrees: TableDegree[];
  martyriaSource: string;
  attractions: readonly SourcedValue<Attraction>[];
}

/** What an Intonation shows while it plays. */
export interface PlayedIntonation {
  text: string;
  greekText: string;
  durationMs: number;
}

export interface MetronomeState extends MetronomeSettings {
  running: boolean;
  /** The preset whose range holds the tempo, or null below the slowest. */
  tempoPreset: TempoPresetId | null;
  /** Which Chronos of the group is sounding, from 1; null while stopped or before the first click is heard. */
  count: number | null;
}

/** Everything a Mode Variant card shows. */
export interface ModeVariantDescription extends ModeVariant {
  cadences: SourcedValue<Cadence[]>;
  source: string;
  reviewStatus: ReviewStatus;
}

/** A Fthora the student can place on a Degree: the Degree it makes of it, its Genus and the sign drawn there. */
export interface FthoraChoice {
  genus: FthoraGenus;
  degree: DegreeName;
  sign: FthoraSign;
}

export interface IsonState extends IsonVoice {
  /** The Degree the Ison holds, or null when it is silent. */
  degreeId: string | null;
}

const variantOf = ({ mode, melos }: ModeVariantKey) => MODE_VARIANTS[mode][melos].value;

export type PracticeSession = ReturnType<typeof createPracticeSession>;

export function createPracticeSession({
  audio,
  pitchSettings = DEFAULT_PITCH_SETTINGS,
  isonVoice = DEFAULT_ISON_VOICE,
  modeVariant,
  metronome = DEFAULT_METRONOME_SETTINGS,
}: PracticeSessionOptions) {
  const tuningSystem = PMC_1881;
  let chosenVariant: ModeVariantKey | null = modeVariant ?? null;
  let genus: GenusId = chosenVariant ? variantOf(chosenVariant).genus : "diatonic";
  let settings = pitchSettings;
  let voice = isonVoice;
  let currentDegreeSound: PlayingSound | null = null;
  /** An Intonation or a Scale played as a sequence; starting another one stops it. */
  let phraseSounds: PlayingSound[] = [];
  let ison: { degreeId: string; frequency: number; sound: PlayingSound } | null = null;
  let activeAttractions = new Set<AttractionId>();
  let tempo = metronome;
  let clicks: PlayingClickTrack | null = null;
  /** The Fthores on the Ladder, each placed on the Scale the ones before it made. */
  let fthores: PlacedFthora[] = [];
  /** False while the student listens to the Scale before the last Fthora; it stays placed. */
  let lastShown = true;
  const appliedCount = () => (lastShown ? fthores.length : fthores.length - 1);

  const buildScaleIn = (g: GenusId) =>
    buildScale({ tuningSystem, genus: g, referencePitchHz: niFrequency(settings), lowest: LADDER_LOWEST, highest: LADDER_HIGHEST });
  const attractionsIn = (g: GenusId) => tuningSystem.attractions.filter((a) => a.value.genus === g);
  const shiftsIn = (g: GenusId) =>
    attractionsIn(g)
      .filter((a) => activeAttractions.has(a.value.id))
      .map(({ value: { degree, moria } }) => ({ degree, moria }));
  /** The Scale before any Fthora: the Genus of the Mode Variant or the one chosen by hand. */
  const buildBaseScale = () =>
    buildScale({
      tuningSystem,
      genus,
      referencePitchHz: niFrequency(settings),
      lowest: LADDER_LOWEST,
      highest: LADDER_HIGHEST,
      shifts: shiftsIn(genus),
    });
  /**
   * The Scale after the first `count` Fthores. Each lays its Genus around its pivot, which keeps the pitch it has
   * in the Scale before and takes the Fthora's name; the keys keep their places and take the names around it.
   */
  const scaleAfter = (count: number): LadderScale => {
    let current: LadderScale = { degrees: buildBaseScale(), genus };
    for (const f of fthores.slice(0, count)) {
      const shift = degreeIndex(f.position) - (LOWEST_INDEX + f.rung);
      current = {
        genus: f.genus,
        degrees: buildScale({
          tuningSystem,
          genus: f.genus,
          referencePitchHz: niFrequency(settings),
          lowest: positionAt(LOWEST_INDEX + shift),
          highest: positionAt(HIGHEST_INDEX + shift),
          shifts: shiftsIn(f.genus),
          pivot: { degree: f.position, moria: current.degrees[f.rung]!.moria },
        }),
      };
    }
    return current;
  };
  let { degrees: scale, genus: sounding } = scaleAfter(appliedCount());

  /** The Fthores a key can take, on the Scale it would be placed on. */
  function choicesOn(on: LadderScale, rung: number): (FthoraChoice & { position: DegreePosition })[] {
    const here = on.degrees[rung]!;
    const diatonic = DEGREE_NAMES.filter((name) => on.genus !== "diatonic" || name !== here.name).map((name) => {
      const position = nearestPosition(name, degreeIndex(here));
      return { genus: "diatonic" as const, degree: name, sign: fthoraSign(tuningSystem, "diatonic", position), position };
    });
    const chromatic = FTHORA_GENERA.filter((g) => g !== "diatonic" && g !== on.genus).map((g) => ({
      genus: g,
      degree: here.name,
      sign: fthoraSign(tuningSystem, g, here),
      position: { name: here.name, octave: here.octave },
    }));
    return [...diatonic, ...chromatic];
  }

  function rungOf(id: string) {
    const rung = scale.findIndex((d) => d.id === id);
    if (rung < 0) throw new Error(`Unknown Degree: ${id}`);
    return rung;
  }

  /** A Fthora on the key of the last one, or placed while the last is set aside, takes the last one's place. */
  const replacesLast = (rung: number) => fthores.length > 0 && (!lastShown || fthores.at(-1)!.rung === rung);

  function findDegree(degreeId: string) {
    const degree = scale.find((d) => d.id === degreeId);
    if (!degree) throw new Error(`Unknown Degree: ${degreeId}`);
    return degree;
  }

  /** Sing one Degree, cutting off the previous one like a single voice. */
  function singDegree(frequency: number) {
    currentDegreeSound?.stop();
    currentDegreeSound = audio.playSound({ kind: "degree", frequency, durationMs: DEGREE_DURATION_MS, vowel: SUNG_VOWEL, volume: SUNG_VOLUME });
  }

  /** Sing Degrees one after another, stopping any phrase still sounding; returns the total length. */
  function singPhrase(kind: "intonation" | "degree", steps: { frequency: number; durationMs: number }[]): number {
    phraseSounds.forEach((sound) => sound.stop());
    let startMs = 0;
    phraseSounds = steps.map(({ frequency, durationMs }) => {
      const sound = audio.playSound({ kind, frequency, startMs, durationMs, vowel: SUNG_VOWEL, volume: SUNG_VOLUME });
      startMs += durationMs;
      return sound;
    });
    return startMs;
  }

  function findIn(g: GenusId, degreeId: string) {
    const degree = buildScaleIn(g).find((d) => d.id === degreeId);
    if (!degree) throw new Error(`Unknown Degree: ${degreeId}`);
    return degree;
  }

  function holdIson(degreeId: string) {
    const { frequency } = findDegree(degreeId);
    ison?.sound.stop();
    const sound = audio.playSound({ kind: "ison", frequency, durationMs: null, vowel: voice.vowel, volume: voice.volume });
    ison = { degreeId, frequency, sound };
  }

  function startClicks() {
    clicks?.stop();
    clicks = audio.playClickTrack({ intervalMs: chronosMs(tempo.chronoiPerMinute), accentEvery: tempo.grouping });
  }

  function stopClicks() {
    clicks?.stop();
    clicks = null;
  }

  /** A running metronome starts again from the first of the group, so the count and the accent stay together. */
  function changeTempo(change: Partial<MetronomeSettings>) {
    const next = { ...tempo, ...change };
    tempo = { chronoiPerMinute: clampTempo(next.chronoiPerMinute), grouping: next.grouping };
    if (clicks) startClicks();
  }

  function currentCount(): number | null {
    if (!clicks) return null;
    const elapsed = clicks.elapsedMs();
    if (elapsed < 0) return null;
    return (Math.floor(elapsed / chronosMs(tempo.chronoiPerMinute)) % tempo.grouping) + 1;
  }

  function stopIson() {
    ison?.sound.stop();
    ison = null;
  }

  /** A new Genus or Mode Variant starts from the plain Scale: no Attraction, no Fthora. */
  function clearAttractions() {
    activeAttractions = new Set();
    fthores = [];
    lastShown = true;
  }

  /**
   * After the Scale changes, the Ison stays on its key, under the key's new name if a Fthora renamed it; it is
   * left alone if the key did not move.
   */
  function rebuildScale() {
    const isonRung = ison ? scale.findIndex((d) => d.id === ison!.degreeId) : -1;
    ({ degrees: scale, genus: sounding } = scaleAfter(appliedCount()));
    if (!ison) return;
    const key = scale[isonRung]!;
    if (key.frequency !== ison.frequency) holdIson(key.id);
    else ison = { ...ison, degreeId: key.id };
  }

  const allPositions = GENUS_IDS.flatMap((g) => buildScaleIn(g).map((d) => d.moria));
  const genusRange: DrawingRange = { lowestMoria: Math.min(...allPositions), highestMoria: Math.max(...allPositions) };
  /** The range of every Genus, widened only as far as a shown Fthora moves the Scale (or its ghosts) beyond it. */
  const drawingRangeFor = (...scales: readonly ScaleDegree[][]): DrawingRange => {
    const moria = scales.flatMap((sc) => sc.map((d) => d.moria));
    return {
      lowestMoria: Math.min(genusRange.lowestMoria, ...moria),
      highestMoria: Math.max(genusRange.highestMoria, ...moria),
    };
  };

  return {
    ladder(): Ladder {
      const variant = chosenVariant && variantOf(chosenVariant);
      const baseId = variant ? degreeId(variant.base) : null;
      const dominantIds = new Set(variant?.dominants.map(degreeId));
      const shifts = shiftsIn(sounding);
      const plain = buildBaseScale();
      const before = lastShown && fthores.length > 0 ? scaleAfter(fthores.length - 1).degrees : null;
      // Base and Dominant belong to keys: a Fthora that renames a key leaves its mark where it was.
      const degrees = scale.map(({ frequency: _, ...d }, i) => {
        const next = scale[i + 1];
        const former = plain[i]!;
        const earlier = before?.[i]?.moria ?? null;
        return {
          ...d,
          moriaToNext: next ? next.moria - d.moria : null,
          isBase: former.id === baseId,
          isDominant: dominantIds.has(former.id),
          martyria: martyriaAnywhere(sounding, d),
          attraction: shifts.find(({ degree }) => degree.name === d.name && degree.octave === d.octave)?.moria ?? null,
          before: earlier !== null && earlier !== d.moria ? earlier : null,
          formerName: former.id === d.id ? null : { name: former.name, octave: former.octave },
        };
      });
      const last = fthores.at(-1);
      return {
        degrees,
        genus,
        totalMoria: scale[scale.length - 1]!.moria - scale[0]!.moria,
        drawingRange: drawingRangeFor(scale, before ?? []),
        tuningSystemId: tuningSystem.id,
        moriaPerOctave: tuningSystem.moriaPerOctave,
        source: tuningSystem.genera[genus].source,
        martyriaSource: MARTYRIA[sounding].source,
        fthora: last
          ? { degreeId: scale[last.rung]!.id, placedOn: last.placedOn, genus: last.genus, sign: last.sign, shown: lastShown }
          : null,
        fthores: fthores.slice(0, appliedCount()).map((f) => ({ degreeId: scale[f.rung]!.id, sign: f.sign })),
        fthoraSource: FTHORES.source,
        attractions: attractionsIn(sounding).map(({ value: { id, degree, moria }, source, reviewStatus }) => ({
          id,
          degreeId: degreeId(degree),
          moria,
          active: activeAttractions.has(id),
          source,
          reviewStatus,
        })),
      };
    },
    pitchSettings(): PitchState {
      return { ...settings, niNote: soundingNote(settings.referencePitch.note, settings.register), niHz: niFrequency(settings) };
    },
    /** Change the Reference Pitch and/or Register; the next Degree played sounds at the new pitch. */
    setPitchSettings(change: Partial<PitchSettings>) {
      settings = { ...settings, ...change };
      rebuildScale();
    },
    /** Switch the Scale to another Genus by hand; this leaves the Mode Variant. */
    setGenus(next: GenusId) {
      chosenVariant = null;
      genus = next;
      clearAttractions();
      rebuildScale();
    },
    /**
     * Choose a Mode Variant: the Scale takes its Genus. A sounding Ison moves to the Base; a silent one stays
     * silent, so the student can look through Modes without sound.
     */
    setModeVariant(next: ModeVariantKey) {
      chosenVariant = next;
      const variant = variantOf(next);
      genus = variant.genus;
      clearAttractions();
      rebuildScale();
      const baseId = degreeId(variant.base);
      if (ison && ison.degreeId !== baseId) holdIson(baseId);
    },
    /**
     * Sing the Intonation of a Mode Variant in its Genus, without changing the practice screen. The Ison keeps
     * sounding; an Intonation still playing stops. Returns null where the source gives no Intonation.
     */
    playIntonation(key: ModeVariantKey): PlayedIntonation | null {
      const variant = variantOf(key);
      if (!variant.intonation) return null;
      const variantScale = buildScaleIn(variant.genus);
      const durationMs = singPhrase(
        "intonation",
        variant.intonation.steps.map(({ degree, chronoi }) => ({
          frequency: variantScale.find((d) => d.id === degreeId(degree))!.frequency,
          durationMs: chronoi * INTONATION_CHRONOS_MS,
        })),
      );
      return { text: variant.intonation.text, greekText: variant.intonation.greekText, durationMs };
    },
    /**
     * Place a Fthora on a Degree, by its sign. The Degree keeps its pitch and becomes the Fthora's Degree of its
     * Genus (a Chromatic Fthora keeps the name); the whole Scale follows, and every key takes its new name. It is
     * added to the Fthores already placed, unless it replaces the last (on the same key, or set aside). A
     * sounding Ison stays on its key.
     */
    placeFthora(id: string, sign: FthoraSign) {
      const rung = rungOf(id);
      if (replacesLast(rung)) fthores = fthores.slice(0, -1);
      lastShown = true;
      const on = scaleAfter(fthores.length);
      const choice = choicesOn(on, rung).find((c) => c.sign === sign);
      if (!choice) throw new Error(`No Fthora ${sign} on ${id}`);
      fthores = [...fthores, { rung, position: choice.position, placedOn: on.degrees[rung]!.id, genus: choice.genus, sign }];
      rebuildScale();
    },
    /**
     * The Fthores a Degree can take, each with the sign it draws: every Diatonic one that changes it, then the
     * Chromatic ones of the other Genera. On the key of the last Fthora, they replace it.
     */
    fthoraChoices(id: string): FthoraChoice[] {
      const rung = rungOf(id);
      const on = scaleAfter(replacesLast(rung) ? fthores.length - 1 : fthores.length);
      return choicesOn(on, rung).map(({ genus: g, degree, sign }) => ({ genus: g, degree, sign }));
    },
    /** Hear the Scale before the last Fthora (false) or with it (true); the Fthora stays where it is. */
    showFthora(shown: boolean) {
      if (fthores.length === 0 || lastShown === shown) return;
      lastShown = shown;
      rebuildScale();
    },
    /** Take the last Fthora off; the ones before it stay. */
    clearFthora() {
      if (fthores.length === 0) return;
      fthores = fthores.slice(0, -1);
      lastShown = true;
      rebuildScale();
    },
    /** Back to free practice: the Genus and the Ison stay as they are, nothing is marked, Attractions are off. */
    leaveModeVariant() {
      chosenVariant = null;
      clearAttractions();
      rebuildScale();
    },
    /** Switch an Attraction of the current Genus on or off; a sounding Ison on that Degree moves with it. */
    toggleAttraction(id: AttractionId) {
      if (!attractionsIn(sounding).some((a) => a.value.id === id)) throw new Error(`No Attraction ${id} in ${sounding}`);
      if (activeAttractions.has(id)) activeAttractions.delete(id);
      else activeAttractions.add(id);
      rebuildScale();
    },
    /** The theory of a Mode Variant for its card, without choosing it. */
    describeModeVariant({ mode, melos }: ModeVariantKey): ModeVariantDescription {
      const { value, source, reviewStatus } = MODE_VARIANTS[mode][melos];
      return { ...value, cadences: cadencesOf(value), source, reviewStatus };
    },
    modeVariant(): ModeVariantKey | null {
      return chosenVariant && { ...chosenVariant };
    },
    playDegree(degreeId: string) {
      singDegree(findDegree(degreeId).frequency);
    },
    /** For the Theory tables: a Genus with every Degree, its sound, Martyria and sources, as the source gives it. */
    describeScale(g: GenusId): ScaleDescription {
      const degrees = buildScaleIn(g);
      return {
        genus: g,
        tuningSystemId: tuningSystem.id,
        moriaPerOctave: tuningSystem.moriaPerOctave,
        intervals: tuningSystem.genera[g],
        degrees: degrees.map((d, i) => {
          const next = degrees[i + 1];
          return { ...d, moriaToNext: next ? next.moria - d.moria : null, martyria: martyriaOf(g, d)! };
        }),
        martyriaSource: MARTYRIA[g].source,
        attractions: attractionsIn(g),
      };
    },
    /** Play a Degree of any Genus, leaving the practice screen as it is. */
    playDegreeIn(g: GenusId, degreeId: string) {
      singDegree(findIn(g, degreeId).frequency);
    },
    /** Sing a Genus from Ni up to Ni', one Chronos at the Medium tempo per Degree. */
    playScale(g: GenusId): { durationMs: number } {
      const octave = buildScaleIn(g).filter((d) => d.octave === 0 || d.id === "Ni'");
      return { durationMs: singPhrase("degree", octave.map(({ frequency }) => ({ frequency, durationMs: INTONATION_CHRONOS_MS }))) };
    },
    /** Hold the Ison on a Degree; it keeps sounding while Degrees are played, until moved or stopped. */
    setIson: holdIson,
    stopIson,
    /** Stop the Ison if it already holds this Degree, otherwise hold it there (the long press on the ladder). */
    toggleIson(degreeId: string) {
      if (ison?.degreeId === degreeId) stopIson();
      else holdIson(degreeId);
    },
    ison(): IsonState {
      return { degreeId: ison?.degreeId ?? null, ...voice };
    },
    metronome(): MetronomeState {
      return {
        ...tempo,
        running: clicks !== null,
        tempoPreset: tempoPresetOf(tempo.chronoiPerMinute),
        count: currentCount(),
      };
    },
    /** Change tempo and/or grouping; the tempo is kept to a whole number of chronoi a minute from 40 to 240. */
    setMetronome: changeTempo,
    /** Set the tempo to the slowest of the preset's range; the grouping stays. */
    chooseTempoPreset(id: TempoPresetId) {
      changeTempo({ chronoiPerMinute: tempoPreset(id).value.minChronoiPerMinute });
    },
    tempoPresets(): readonly TempoPreset[] {
      return TEMPO_PRESETS;
    },
    /** Start the clicks; the Ison and any sung sound go on as they are. Starting it again changes nothing. */
    startMetronome() {
      if (!clicks) startClicks();
    },
    stopMetronome: stopClicks,
    /**
     * Start the Ison and the metronome again where they are, after the device has held the sound back: what was
     * requested before may be lost with it.
     */
    restartSound() {
      if (ison) holdIson(ison.degreeId);
      if (clicks) startClicks();
    },
    /** True when the device keeps the sound stopped, so what the session plays is not heard. */
    soundIsHeld(): boolean {
      return !audio.isRunning();
    },
    /** Change the Ison vowel and/or volume; a sounding Ison changes with it. */
    setIsonVoice(change: Partial<IsonVoice>) {
      const previous = voice;
      voice = { ...voice, ...change };
      if (!ison) return;
      if (voice.vowel !== previous.vowel) holdIson(ison.degreeId);
      else if (voice.volume !== previous.volume) ison.sound.setVolume(voice.volume);
    },
  };
}
