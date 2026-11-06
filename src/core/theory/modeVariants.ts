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

/** Cadences and the Intonation (ADR-0002) arrive with the tickets that use them. */
export interface ModeVariant {
  genus: GenusId;
  base: DegreePosition;
  /** Listed lowest first; the Base is one of them where the source names it as dominant. */
  dominants: readonly DegreePosition[];
}

const MELLING =
  'David J. Melling, "Reading Psalmodia: An introduction to modern Byzantine Notation" (2000), §9 Tones, Modes & Scales';

/** A Degree in the middle octave (Ni to Zo), or in the octave below with octave -1. */
const degree = (name: DegreeName, octave = 0): DegreePosition => ({ name, octave });

function sourcedVariant(genus: GenusId, base: DegreePosition, dominants: DegreePosition[]): SourcedValue<ModeVariant> {
  return { value: { genus, base, dominants }, source: MELLING, reviewStatus: "unreviewed" };
}

/**
 * Mode Variants per Mode and Melos (ADR-0004 explains how Melling's melody types map onto the two Melos
 * and which alternative is taken where he gives two).
 */
export const MODE_VARIANTS: Record<ModeId, Record<MelosId, SourcedValue<ModeVariant>>> = {
  first: {
    heirmologic: sourcedVariant("diatonic", degree("Pa"), [degree("Pa"), degree("Di")]),
    sticheraric: sourcedVariant("diatonic", degree("Pa"), [degree("Pa"), degree("Ga")]),
  },
  second: {
    heirmologic: sourcedVariant("hard-chromatic", degree("Pa"), [degree("Pa"), degree("Di")]),
    sticheraric: sourcedVariant("soft-chromatic", degree("Di"), [degree("Ni"), degree("Vou"), degree("Di")]),
  },
  third: {
    heirmologic: sourcedVariant("enharmonic", degree("Ga"), [degree("Pa"), degree("Ga"), degree("Ke")]),
    sticheraric: sourcedVariant("enharmonic", degree("Ga"), [degree("Pa"), degree("Ga"), degree("Ke")]),
  },
  fourth: {
    // Legetos: Irmic and short Sticheric.
    heirmologic: sourcedVariant("diatonic", degree("Vou"), [degree("Vou"), degree("Di")]),
    // Slow Sticheric.
    sticheraric: sourcedVariant("diatonic", degree("Pa"), [degree("Pa"), degree("Vou"), degree("Di")]),
  },
  "plagal-first": {
    heirmologic: sourcedVariant("diatonic", degree("Ke", -1), [degree("Ke", -1), degree("Ni"), degree("Pa")]),
    // Slow styles: Melling gives "Pa or Ke"; the first is taken.
    sticheraric: sourcedVariant("diatonic", degree("Pa"), [degree("Pa"), degree("Di"), degree("Ke")]),
  },
  "plagal-second": {
    // Irmic and short Sticheric: Melling gives "Vu or Di"; the first is taken.
    heirmologic: sourcedVariant("soft-chromatic", degree("Vou"), [degree("Vou"), degree("Di")]),
    // Slow Sticheric and Ornate.
    sticheraric: sourcedVariant("hard-chromatic", degree("Pa"), [degree("Pa"), degree("Di"), degree("Ke")]),
  },
  grave: {
    // Short styles, Tetrachordal Enharmonic on Ga; Melling's lowered Zo is the Enharmonic Zo.
    heirmologic: sourcedVariant("enharmonic", degree("Ga"), [degree("Ga"), degree("Di"), degree("Zo")]),
    // Diatonic modes on the low Zo (Melling's "Zo"); his lowered upper Zo is left to Attractions.
    sticheraric: sourcedVariant("diatonic", degree("Zo", -1), [degree("Pa"), degree("Ga"), degree("Di"), degree("Zo")]),
  },
  "plagal-fourth": {
    // Melling gives an Octave-System mode on Ni and a Tetrachordal one on Ga for all styles; Ni is taken.
    heirmologic: sourcedVariant("diatonic", degree("Ni"), [degree("Ni"), degree("Vou"), degree("Di")]),
    sticheraric: sourcedVariant("diatonic", degree("Ni"), [degree("Ni"), degree("Vou"), degree("Di")]),
  },
};

/** Guards a choice restored from the device. */
export function isModeVariantKey(value: unknown): value is ModeVariantKey {
  if (typeof value !== "object" || value === null) return false;
  const { mode, melos } = value as Record<string, unknown>;
  return MODE_IDS.includes(mode as ModeId) && MELOS_IDS.includes(melos as MelosId);
}
