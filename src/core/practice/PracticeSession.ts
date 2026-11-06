import type { AudioOutput, PlayingSound } from "../../audio/AudioOutput";
import { MODE_VARIANTS, type ModeVariantKey } from "../theory/modeVariants";
import { buildScale, degreeId, type DegreePosition, type ScaleDegree } from "../theory/scale";
import { GENUS_IDS, PMC_1881, type GenusId, type TuningSystemId } from "../theory/tuningSystems";
import { DEFAULT_PITCH_SETTINGS, niFrequency, soundingNote, type PitchSettings } from "./pitchSettings";
import type { NoteName } from "../theory/westernPitch";
import { DEFAULT_ISON_VOICE, type IsonVoice } from "./isonVoice";

export type { PitchSettings, ReferencePitch, Register } from "./pitchSettings";
export type { IsonVoice } from "./isonVoice";

const DEGREE_DURATION_MS = 1200;
/** Degrees played on the ladder always sing "a" at full volume; only the Ison voice is adjustable. */
const DEGREE_VOWEL = "a";
const DEGREE_VOLUME = 1;

/** The ladder covers the range most Modes use: low Ke to high Ga'. */
const LADDER_LOWEST: DegreePosition = { name: "Ke", octave: -1 };
const LADDER_HIGHEST: DegreePosition = { name: "Ga", octave: 1 };

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
}

export interface LadderDegree extends Omit<ScaleDegree, "frequency"> {
  /** Size of the interval to the Degree above, or null for the top Degree. */
  moriaToNext: number | null;
  /** The home Degree of the chosen Mode Variant. */
  isBase: boolean;
  /** A Degree of structural weight in the chosen Mode Variant. */
  isDominant: boolean;
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
   * change; the UI draws the ladder between these positions.
   */
  drawingRange: DrawingRange;
  tuningSystemId: TuningSystemId;
  moriaPerOctave: number;
  /** Bibliographic citation of the interval values; shown as written, not translated. */
  source: string;
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
}: PracticeSessionOptions) {
  const tuningSystem = PMC_1881;
  let chosenVariant: ModeVariantKey | null = modeVariant ?? null;
  let genus: GenusId = chosenVariant ? variantOf(chosenVariant).genus : "diatonic";
  let settings = pitchSettings;
  let voice = isonVoice;
  let currentDegreeSound: PlayingSound | null = null;
  let ison: { degreeId: string; frequency: number; sound: PlayingSound } | null = null;

  const buildScaleIn = (g: GenusId) =>
    buildScale({ tuningSystem, genus: g, referencePitchHz: niFrequency(settings), lowest: LADDER_LOWEST, highest: LADDER_HIGHEST });
  const buildCurrentScale = () => buildScaleIn(genus);
  let scale = buildCurrentScale();

  function findDegree(degreeId: string) {
    const degree = scale.find((d) => d.id === degreeId);
    if (!degree) throw new Error(`Unknown Degree: ${degreeId}`);
    return degree;
  }

  function holdIson(degreeId: string) {
    const { frequency } = findDegree(degreeId);
    ison?.sound.stop();
    const sound = audio.playSound({ kind: "ison", frequency, durationMs: null, vowel: voice.vowel, volume: voice.volume });
    ison = { degreeId, frequency, sound };
  }

  function stopIson() {
    ison?.sound.stop();
    ison = null;
  }

  /** After the Scale changes, the Ison follows its Degree; it is left alone if that Degree did not move. */
  function rebuildScale() {
    scale = buildCurrentScale();
    if (ison && findDegree(ison.degreeId).frequency !== ison.frequency) holdIson(ison.degreeId);
  }

  const allPositions = GENUS_IDS.flatMap((g) => buildScaleIn(g).map((d) => d.moria));
  const drawingRange: DrawingRange = { lowestMoria: Math.min(...allPositions), highestMoria: Math.max(...allPositions) };

  return {
    ladder(): Ladder {
      const variant = chosenVariant && variantOf(chosenVariant);
      const baseId = variant ? degreeId(variant.base) : null;
      const dominantIds = new Set(variant?.dominants.map(degreeId));
      const degrees = scale.map(({ frequency: _, ...d }, i) => {
        const next = scale[i + 1];
        return { ...d, moriaToNext: next ? next.moria - d.moria : null, isBase: d.id === baseId, isDominant: dominantIds.has(d.id) };
      });
      return {
        degrees,
        genus,
        totalMoria: scale[scale.length - 1]!.moria - scale[0]!.moria,
        drawingRange,
        tuningSystemId: tuningSystem.id,
        moriaPerOctave: tuningSystem.moriaPerOctave,
        source: tuningSystem.genera[genus].source,
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
      rebuildScale();
    },
    /** Choose a Mode Variant: the Scale takes its Genus and the Ison sounds on its Base. */
    setModeVariant(next: ModeVariantKey) {
      chosenVariant = next;
      const variant = variantOf(next);
      genus = variant.genus;
      rebuildScale();
      holdIson(degreeId(variant.base));
    },
    /** Back to free practice: the Genus and the Ison stay as they are, nothing is marked. */
    leaveModeVariant() {
      chosenVariant = null;
    },
    modeVariant(): ModeVariantKey | null {
      return chosenVariant && { ...chosenVariant };
    },
    playDegree(degreeId: string) {
      const degree = findDegree(degreeId);
      currentDegreeSound?.stop();
      currentDegreeSound = audio.playSound({
        kind: "degree",
        frequency: degree.frequency,
        durationMs: DEGREE_DURATION_MS,
        vowel: DEGREE_VOWEL,
        volume: DEGREE_VOLUME,
      });
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
