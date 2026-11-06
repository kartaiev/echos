import type { DegreePosition } from "./scale";
import type { DegreeName, GenusId, SourcedValue } from "./tuningSystems";

export const MODE_IDS = [
  "first",
  "second",
  "third",
  "fourth",
  "plagal-first",
  "plagal-second",
  "grave",
  "plagal-fourth",
] as const;
export type ModeId = (typeof MODE_IDS)[number];

/** Release 1 has the Heirmologic and Sticheraric melos; Papadic comes later without a model change (ADR-0002). */
export const MELOS_IDS = ["heirmologic", "sticheraric"] as const;
export type MelosId = (typeof MELOS_IDS)[number];

/** Names one Mode Variant: a Mode as sung in one Melos. */
export interface ModeVariantKey {
  mode: ModeId;
  melos: MelosId;
}

/** One step of an Intonation: a Degree held for a number of chronoi. */
export interface IntonationStep {
  degree: DegreePosition;
  chronoi: number;
}

/** The short sung formula that announces a Mode Variant, with the syllables it is sung on. */
export interface Intonation {
  text: string;
  steps: readonly IntonationStep[];
}

/** Cadences (ADR-0002) arrive when a source for them is found. */
export interface ModeVariant {
  genus: GenusId;
  base: DegreePosition;
  /** Listed lowest first; the Base is one of them where the source names it. */
  dominants: readonly DegreePosition[];
  /** null where the source gives none. */
  intonation: Intonation | null;
}

const TRISAGION_101 = 'Trisagion School of Byzantine Music, ByzB-101 "Modal Theory Review", Heirmologic Genre';
const MELLING =
  'David J. Melling, "Reading Psalmodia: An introduction to modern Byzantine Notation" (2000), §9 Tones, Modes & Scales';

/** A Degree in the middle octave (Ni to Zo), or in the octave below with octave -1. */
const degree = (name: DegreeName, octave = 0): DegreePosition => ({ name, octave });

/** An Intonation from [Degree, chronoi] pairs, all in the middle octave. */
const sungAs = (text: string, steps: [DegreeName, number][]): Intonation => ({
  text,
  steps: steps.map(([name, chronoi]) => ({ degree: degree(name), chronoi })),
});

function sourcedVariant(
  source: string,
  genus: GenusId,
  base: DegreePosition,
  dominants: DegreePosition[],
  intonation: Intonation | null = null,
): SourcedValue<ModeVariant> {
  return { value: { genus, base, dominants, intonation }, source, reviewStatus: "unreviewed" };
}

/**
 * Mode Variants per Mode and Melos. Heirmologic follows the Trisagion chart: its "Structural Notes" are our
 * Dominant Degrees, and its Intonations are drawn as boxes whose width gives the length (half, one, one and a
 * half or two chronoi). Sticheraric follows Melling (ADR-0004), who gives no Intonations. See ADR-0005.
 */
export const MODE_VARIANTS: Record<ModeId, Record<MelosId, SourcedValue<ModeVariant>>> = {
  first: {
    heirmologic: sourcedVariant(TRISAGION_101, "diatonic", degree("Pa"), [degree("Pa"), degree("Di")],
      sungAs("Ah-nah-nes", [["Ni", 1.5], ["Pa", 0.5], ["Pa", 2]])),
    sticheraric: sourcedVariant(MELLING, "diatonic", degree("Pa"), [degree("Pa"), degree("Ga")]),
  },
  second: {
    heirmologic: sourcedVariant(TRISAGION_101, "hard-chromatic", degree("Pa"), [degree("Pa"), degree("Di")],
      sungAs("Neh-ah-nes", [["Ga", 1], ["Di", 1], ["Ga", 1], ["Vou", 1], ["Pa", 2]])),
    sticheraric: sourcedVariant(MELLING, "soft-chromatic", degree("Di"), [degree("Ni"), degree("Vou"), degree("Di")]),
  },
  third: {
    heirmologic: sourcedVariant(TRISAGION_101, "enharmonic", degree("Ga"), [degree("Pa"), degree("Ga"), degree("Ke")],
      sungAs("Na-na", [["Ni", 1], ["Ga", 1], ["Ga", 2]])),
    sticheraric: sourcedVariant(MELLING, "enharmonic", degree("Ga"), [degree("Pa"), degree("Ga"), degree("Ke")]),
  },
  fourth: {
    heirmologic: sourcedVariant(TRISAGION_101, "diatonic", degree("Vou"), [degree("Pa"), degree("Vou"), degree("Di")],
      sungAs("Leh-geh-tos", [["Di", 1], ["Ga", 1], ["Vou", 2]])),
    // Slow Sticheric.
    sticheraric: sourcedVariant(MELLING, "diatonic", degree("Pa"), [degree("Pa"), degree("Vou"), degree("Di")]),
  },
  "plagal-first": {
    heirmologic: sourcedVariant(TRISAGION_101, "diatonic", degree("Pa"), [degree("Pa"), degree("Ga")],
      sungAs("Ah-neh-ah-nes", [["Pa", 1], ["Ga", 1], ["Vou", 1], ["Pa", 1]])),
    // Slow styles: Melling gives "Pa or Ke"; the first is taken.
    sticheraric: sourcedVariant(MELLING, "diatonic", degree("Pa"), [degree("Pa"), degree("Di"), degree("Ke")]),
  },
  "plagal-second": {
    // Trisagion's Structural Note Zo' is the Zo above Ke.
    heirmologic: sourcedVariant(TRISAGION_101, "soft-chromatic", degree("Di"), [degree("Vou"), degree("Di"), degree("Zo")],
      sungAs("Neh-heh-ah-nes", [["Vou", 1], ["Di", 1.5], ["Ga", 1], ["Vou", 1.5], ["Ga", 0.5], ["Di", 2]])),
    // Slow Sticheric and Ornate.
    sticheraric: sourcedVariant(MELLING, "hard-chromatic", degree("Pa"), [degree("Pa"), degree("Di"), degree("Ke")]),
  },
  grave: {
    heirmologic: sourcedVariant(TRISAGION_101, "enharmonic", degree("Ga"), [degree("Pa"), degree("Ga"), degree("Di")],
      sungAs("Ah-nes", [["Ga", 1.5], ["Vou", 0.5], ["Ga", 2]])),
    // Diatonic modes on the low Zo (Melling's "Zo"); his lowered upper Zo is left to Attractions.
    sticheraric: sourcedVariant(MELLING, "diatonic", degree("Zo", -1), [degree("Pa"), degree("Ga"), degree("Di"), degree("Zo")]),
  },
  "plagal-fourth": {
    heirmologic: sourcedVariant(TRISAGION_101, "diatonic", degree("Ni"), [degree("Ni"), degree("Vou"), degree("Di")],
      sungAs("Neh-ah-yee-eh", [["Ni", 1], ["Pa", 1], ["Vou", 1], ["Ni", 1], ["Ni", 2]])),
    // Melling gives an Octave-System mode on Ni and a Tetrachordal one on Ga for all styles; Ni is taken.
    sticheraric: sourcedVariant(MELLING, "diatonic", degree("Ni"), [degree("Ni"), degree("Vou"), degree("Di")]),
  },
};

/** Guards a choice restored from the device. */
export function isModeVariantKey(value: unknown): value is ModeVariantKey {
  if (typeof value !== "object" || value === null) return false;
  const { mode, melos } = value as Record<string, unknown>;
  return MODE_IDS.includes(mode as ModeId) && MELOS_IDS.includes(melos as MelosId);
}
