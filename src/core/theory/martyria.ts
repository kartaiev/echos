import { degreeIndex, type DegreePosition } from "./scale";
import type { DegreeName, GenusId, SourcedValue } from "./tuningSystems";

/** The sign written with a Degree's letter in a Martyria; it tells the Genus and the place in it. */
export const ROOT_SIGNS = [
  "zo",
  "delta",
  "alpha",
  "legetos",
  "nana",
  "delta-dotted",
  "alpha-dotted",
  "hard-chromatic-pa",
  "hard-chromatic-di",
  "soft-chromatic-di",
  "soft-chromatic-ke",
] as const;
export type RootSign = (typeof ROOT_SIGNS)[number];

/** A Fthora written beside the letter; only the Enharmonic uses one on the chart. */
export type MartyriaFthora = "enharmonic";

/** How a Degree is marked in the score: its letter, the sign that goes with it, and a Fthora where there is one. */
export interface Martyria {
  /**
   * Which set of letters the Degree is written with: low Ke and below take the low letters, the Zo above Ke and
   * higher take the high ones (with a prime), the Degrees from the Zo below Ni to Ke the plain ones.
   */
  letterOctave: -1 | 0 | 1;
  rootSign: RootSign;
  /** Written above the letter instead of below it, as for low Ke and below. */
  rootSignAbove: boolean;
  fthora: MartyriaFthora | null;
}

type Entry = [name: DegreeName, octave: number, rootSign: RootSign, fthora?: MartyriaFthora];

const TRISAGION_SCALES_MARTYRIA =
  'Trisagion School of Byzantine Music, "The Scales" chart (Free Resources, trisagionschool.org), Martyria';

/**
 * Read off the chart from low Ke to high Ga. The chart prints low Zo to Ni' (Diatonic), low Ke to Vou' (Hard
 * Chromatic), Ni to Pa' (Soft Chromatic) and Ni to Vou' (Enharmonic); the Degrees beyond follow its own pattern
 * (marked *): the octave's sign in the Diatonic, alternation in the Chromatic Genera, the three-Degree cycle above
 * Ga and the Diatonic below Ni in the Enharmonic. Unreviewed until the project's reviewer checks them.
 */
const TABLES: Record<GenusId, Entry[]> = {
  diatonic: [
    ["Ke", -1, "alpha"], // *
    ["Zo", -1, "zo"],
    ["Ni", 0, "delta"],
    ["Pa", 0, "alpha"],
    ["Vou", 0, "legetos"],
    ["Ga", 0, "nana"],
    ["Di", 0, "delta-dotted"],
    ["Ke", 0, "alpha-dotted"],
    ["Zo", 0, "legetos"],
    ["Ni", 1, "nana"],
    ["Pa", 1, "alpha"], // *
    ["Vou", 1, "legetos"], // *
    ["Ga", 1, "nana"], // *
  ],
  "hard-chromatic": [
    ["Ke", -1, "hard-chromatic-di"],
    ["Zo", -1, "hard-chromatic-pa"],
    ["Ni", 0, "hard-chromatic-di"],
    ["Pa", 0, "hard-chromatic-pa"],
    ["Vou", 0, "hard-chromatic-di"],
    ["Ga", 0, "hard-chromatic-pa"],
    ["Di", 0, "hard-chromatic-di"],
    ["Ke", 0, "hard-chromatic-pa"],
    ["Zo", 0, "hard-chromatic-di"],
    ["Ni", 1, "hard-chromatic-pa"],
    ["Pa", 1, "hard-chromatic-di"],
    ["Vou", 1, "hard-chromatic-pa"],
    ["Ga", 1, "hard-chromatic-di"], // *
  ],
  "soft-chromatic": [
    ["Ke", -1, "soft-chromatic-di"], // *
    ["Zo", -1, "soft-chromatic-ke"], // *
    ["Ni", 0, "soft-chromatic-di"],
    ["Pa", 0, "soft-chromatic-ke"],
    ["Vou", 0, "soft-chromatic-di"],
    ["Ga", 0, "soft-chromatic-ke"],
    ["Di", 0, "soft-chromatic-di"],
    ["Ke", 0, "soft-chromatic-ke"],
    ["Zo", 0, "soft-chromatic-di"],
    ["Ni", 1, "soft-chromatic-ke"],
    ["Pa", 1, "soft-chromatic-di"],
    ["Vou", 1, "soft-chromatic-ke"], // *
    ["Ga", 1, "soft-chromatic-di"], // *
  ],
  enharmonic: [
    ["Ke", -1, "alpha"], // *
    ["Zo", -1, "zo"], // *
    ["Ni", 0, "delta"],
    ["Pa", 0, "alpha"],
    ["Vou", 0, "legetos"],
    ["Ga", 0, "nana", "enharmonic"],
    ["Di", 0, "delta-dotted"],
    ["Ke", 0, "alpha-dotted"],
    ["Zo", 0, "nana", "enharmonic"],
    ["Ni", 1, "delta-dotted"],
    ["Pa", 1, "alpha-dotted"],
    ["Vou", 1, "nana", "enharmonic"],
    ["Ga", 1, "delta-dotted"], // *
  ],
};

const sourced = (value: readonly Entry[]): SourcedValue<readonly Entry[]> => ({
  value,
  source: TRISAGION_SCALES_MARTYRIA,
  reviewStatus: "unreviewed",
});

export const MARTYRIA: Record<GenusId, SourcedValue<readonly Entry[]>> = {
  diatonic: sourced(TABLES.diatonic),
  "soft-chromatic": sourced(TABLES["soft-chromatic"]),
  "hard-chromatic": sourced(TABLES["hard-chromatic"]),
  enharmonic: sourced(TABLES.enharmonic),
};

/** Low Ke and below are the lowest letters; in each set the letters run from Zo up to Ke. */
function letterOctave({ name, octave }: DegreePosition): -1 | 0 | 1 {
  const shifted = name === "Zo" ? octave + 1 : octave;
  return shifted <= -1 ? -1 : shifted >= 1 ? 1 : 0;
}

/** The Martyria of a Degree in a Genus, or null for a Degree the table does not reach. */
export function martyriaOf(genus: GenusId, position: DegreePosition): Martyria | null {
  const entry = MARTYRIA[genus].value.find(([name, octave]) => name === position.name && octave === position.octave);
  if (!entry) return null;
  const [, , rootSign, fthora] = entry;
  const lettersFrom = letterOctave(position);
  return { letterOctave: lettersFrom, rootSign, rootSignAbove: lettersFrom === -1, fthora: fthora ?? null };
}

/**
 * How many Degrees on the same root sign repeats: the octave in the Diatonic (and the Enharmonic below Ga), every
 * other Degree in the Chromatic Genera.
 */
const SIGN_PERIOD: Record<GenusId, number> = { diatonic: 7, enharmonic: 7, "soft-chromatic": 2, "hard-chromatic": 2 };

/**
 * The Martyria of any Degree a Fthora can bring onto the Ladder. Beyond the chart, the chart's own pattern goes on
 * (as for the Degrees marked * above): the sign of the nearest Degree a period away, without the dots, which mark
 * the upper tetrachord of the chart's middle octave only. Unreviewed, like the rest of the extension.
 */
export function martyriaAnywhere(genus: GenusId, position: DegreePosition): Martyria {
  const exact = martyriaOf(genus, position);
  if (exact) return exact;
  const index = degreeIndex(position);
  const period = SIGN_PERIOD[genus];
  const [nearest] = MARTYRIA[genus].value
    .filter(([name, octave]) => (((degreeIndex({ name, octave }) - index) % period) + period) % period === 0)
    .sort(([a, ao], [b, bo]) => Math.abs(degreeIndex({ name: a, octave: ao }) - index) - Math.abs(degreeIndex({ name: b, octave: bo }) - index));
  if (!nearest) throw new Error(`No Martyria pattern for ${position.name} in ${genus}`);
  const rootSign = nearest[2].replace("-dotted", "") as RootSign;
  const lettersFrom = letterOctave(position);
  return { letterOctave: lettersFrom, rootSign, rootSignAbove: lettersFrom === -1, fthora: nearest[3] ?? null };
}
