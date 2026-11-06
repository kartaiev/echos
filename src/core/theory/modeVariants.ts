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

/** Which Mode Variant: a Mode as sung in one Melos. */
export interface ModeVariantChoice {
  mode: ModeId;
  melos: MelosId;
}

export interface ModeVariant {
  genus: GenusId;
  base: DegreePosition;
  /** Listed lowest first; the Base is one of them where the source names it as dominant. */
  dominants: readonly DegreePosition[];
}

const MELLING =
  'David J. Melling, "Reading Psalmodia: An introduction to modern Byzantine Notation" (2000), §9 Tones, Modes & Scales';

/** A Degree in the middle octave (Ni to Zo), or in the octave below with octave -1. */
const at = (name: DegreeName, octave = 0): DegreePosition => ({ name, octave });

function variant(genus: GenusId, base: DegreePosition, dominants: DegreePosition[]): SourcedValue<ModeVariant> {
  return { value: { genus, base, dominants }, source: MELLING, reviewStatus: "unreviewed" };
}

/**
 * Mode Variants per Mode and Melos (ADR-0004 explains how Melling's melody types map onto the two Melos
 * and which alternative is taken where he gives two).
 */
export const MODE_VARIANTS: Record<ModeId, Record<MelosId, SourcedValue<ModeVariant>>> = {
  first: {
    heirmologic: variant("diatonic", at("Pa"), [at("Pa"), at("Di")]),
    sticheraric: variant("diatonic", at("Pa"), [at("Pa"), at("Ga")]),
  },
  second: {
    heirmologic: variant("hard-chromatic", at("Pa"), [at("Pa"), at("Di")]),
    sticheraric: variant("soft-chromatic", at("Di"), [at("Ni"), at("Vou"), at("Di")]),
  },
  third: {
    heirmologic: variant("enharmonic", at("Ga"), [at("Pa"), at("Ga"), at("Ke")]),
    sticheraric: variant("enharmonic", at("Ga"), [at("Pa"), at("Ga"), at("Ke")]),
  },
  fourth: {
    // Legetos: Irmic and short Sticheric.
    heirmologic: variant("diatonic", at("Vou"), [at("Vou"), at("Di")]),
    // Slow Sticheric.
    sticheraric: variant("diatonic", at("Pa"), [at("Pa"), at("Vou"), at("Di")]),
  },
  "plagal-first": {
    heirmologic: variant("diatonic", at("Ke", -1), [at("Ke", -1), at("Ni"), at("Pa")]),
    // Slow styles: Melling gives "Pa or Ke"; the first is taken.
    sticheraric: variant("diatonic", at("Pa"), [at("Pa"), at("Di"), at("Ke")]),
  },
  "plagal-second": {
    // Irmic and short Sticheric: Melling gives "Vu or Di"; the first is taken.
    heirmologic: variant("soft-chromatic", at("Vou"), [at("Vou"), at("Di")]),
    // Slow Sticheric and Ornate.
    sticheraric: variant("hard-chromatic", at("Pa"), [at("Pa"), at("Di"), at("Ke")]),
  },
  grave: {
    // Short styles, Tetrachordal Enharmonic on Ga; Melling's flattened Zo is the Enharmonic Zo.
    heirmologic: variant("enharmonic", at("Ga"), [at("Ga"), at("Di"), at("Zo")]),
    // Diatonic modes on the low Zo (Melling's "Zo"); his flattened upper Zo is left to Attractions.
    sticheraric: variant("diatonic", at("Zo", -1), [at("Pa"), at("Ga"), at("Di"), at("Zo")]),
  },
  "plagal-fourth": {
    // Octave-system mode; Melling says melodies of all styles use it.
    heirmologic: variant("diatonic", at("Ni"), [at("Ni"), at("Vou"), at("Di")]),
    sticheraric: variant("diatonic", at("Ni"), [at("Ni"), at("Vou"), at("Di")]),
  },
};

/** Guards a choice restored from the device. */
export function isModeVariantChoice(value: unknown): value is ModeVariantChoice {
  if (typeof value !== "object" || value === null) return false;
  const { mode, melos } = value as Record<string, unknown>;
  return MODE_IDS.includes(mode as ModeId) && MELOS_IDS.includes(melos as MelosId);
}
