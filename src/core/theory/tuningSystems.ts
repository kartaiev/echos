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

export interface TuningSystem {
  id: TuningSystemId;
  name: string;
  moriaPerOctave: number;
  /** Interval sizes in moria for one octave, starting from Ni (Ni-Pa, Pa-Vou, ... Zo-Ni'). */
  genera: Record<GenusId, SourcedValue<readonly number[]>>;
}

/**
 * Where the PMC 1881 values in this file come from. They are the committee's intervals as printed in
 * teaching charts; nobody has checked them against the committee's own publication yet, which is why
 * every value stays "unreviewed" until the project's reviewer does.
 */
const PMC_SOURCE =
  "Patriarchal Music Committee (1881) intervals as given in teaching charts; not yet checked against " +
  "Στοιχειώδης Διδασκαλία της Εκκλησιαστικής Μουσικής, Constantinople 1888";

export const PMC_1881: TuningSystem = {
  id: "pmc-1881",
  name: "Patriarchal Music Committee 1881",
  moriaPerOctave: 72,
  genera: {
    diatonic: { value: [12, 10, 8, 12, 12, 10, 8], source: PMC_SOURCE, reviewStatus: "unreviewed" },
    "soft-chromatic": { value: [8, 14, 8, 12, 8, 14, 8], source: PMC_SOURCE, reviewStatus: "unreviewed" },
    "hard-chromatic": { value: [4, 6, 20, 4, 12, 6, 20], source: PMC_SOURCE, reviewStatus: "unreviewed" },
    enharmonic: { value: [12, 12, 6, 12, 12, 6, 12], source: PMC_SOURCE, reviewStatus: "unreviewed" },
  },
};
