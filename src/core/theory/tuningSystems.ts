/**
 * Tuning Systems as sourced data (ADR-0001).
 * No interval size may be hard-coded anywhere else; code reads it from here.
 */

export type DegreeName = "Ni" | "Pa" | "Vou" | "Ga" | "Di" | "Ke" | "Zo";

export const DEGREE_NAMES: readonly DegreeName[] = ["Ni", "Pa", "Vou", "Ga", "Di", "Ke", "Zo"];

export const GENUS_IDS = ["diatonic", "soft-chromatic", "hard-chromatic", "enharmonic"] as const;

export type GenusId = (typeof GENUS_IDS)[number];

export type TuningSystemId = "pmc-1881";

export type ReviewStatus = "unreviewed" | "reviewed";

export interface SourcedValue<T> {
  value: T;
  source: string;
  reviewStatus: ReviewStatus;
}

/**
 * How a Genus spaces the Degrees: a cycle of intervals in moria that repeats up and down the Scale,
 * starting on a given Degree. Ni is always at 0 moria. A cycle need not span an octave: the chromatic
 * Genera repeat a tetrachord plus a tone (42 moria), the Enharmonic every three Degrees (30 moria),
 * so their upper Ni can differ from an octave above Ni.
 */
export interface IntervalCycle {
  /** The Degree whose interval to the next Degree up is `intervals[0]`, in the octave of Ni. */
  from: DegreeName;
  intervals: readonly number[];
}

/** A Degree raised or lowered by a neighbouring structural Degree, by a fixed number of moria. */
export const ATTRACTION_IDS = ["zo-lowered"] as const;
export type AttractionId = (typeof ATTRACTION_IDS)[number];

export interface Attraction {
  id: AttractionId;
  genus: GenusId;
  /** The Degree that moves, in every octave: the rule goes with the name, so it follows a Fthora that renames. */
  degree: DegreeName;
  /** Negative lowers the Degree. */
  moria: number;
}

export interface TuningSystem {
  id: TuningSystemId;
  name: string;
  /** Moria that make a frequency ratio of 2:1. */
  moriaPerOctave: number;
  genera: Record<GenusId, SourcedValue<IntervalCycle>>;
  /** Only Attractions whose size a source gives; most are left to oral tradition and have none. */
  attractions: readonly SourcedValue<Attraction>[];
}

/**
 * Trisagion School of Byzantine Music, "The Scales" chart. Values are read off the chart; Degrees beyond
 * its printed range follow the chart's own repeating pattern. Unreviewed until the project's reviewer
 * checks them.
 */
const TRISAGION_SCALES =
  "Trisagion School of Byzantine Music, \"The Scales\" chart (Free Resources, trisagionschool.org)";

/**
 * The course says Zo' (the Zo above Ke) is natural going up, 10 moria above Ke, and flat coming down, 6 moria
 * above Ke, in every Diatonic Mode. Other Attractions it describes (Vou in the 1st Mode, Pa in the Plagal 4th) are
 * "slight" and, by the school's own choice, given no size.
 */
const TRISAGION_OCTOECHOS_201 =
  'Trisagion School of Byzantine Music, Octoëchos 201: 1st Mode (2026), "1st Mode Sticheraric – Theoretical Overview", Melodic Attractions';

export const PMC_1881: TuningSystem = {
  id: "pmc-1881",
  name: "Patriarchal Music Committee 1881",
  moriaPerOctave: 72,
  genera: {
    diatonic: { value: { from: "Ni", intervals: [12, 10, 8, 12, 12, 10, 8] }, source: TRISAGION_SCALES, reviewStatus: "unreviewed" },
    "soft-chromatic": { value: { from: "Ni", intervals: [8, 14, 8, 12] }, source: TRISAGION_SCALES, reviewStatus: "unreviewed" },
    "hard-chromatic": { value: { from: "Pa", intervals: [6, 20, 4, 12] }, source: TRISAGION_SCALES, reviewStatus: "unreviewed" },
    enharmonic: { value: { from: "Ni", intervals: [12, 12, 6] }, source: TRISAGION_SCALES, reviewStatus: "unreviewed" },
  },
  attractions: [
    {
      value: { id: "zo-lowered", genus: "diatonic", degree: "Zo", moria: -4 },
      source: TRISAGION_OCTOECHOS_201,
      reviewStatus: "unreviewed",
    },
  ],
};
