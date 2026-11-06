/**
 * Tuning Systems as sourced data (ADR-0001).
 * No interval size may be hard-coded anywhere else; code reads it from here.
 */

export type DegreeName = "Ni" | "Pa" | "Vou" | "Ga" | "Di" | "Ke" | "Zo";

export const DEGREE_NAMES: readonly DegreeName[] = ["Ni", "Pa", "Vou", "Ga", "Di", "Ke", "Zo"];

export type GenusId = "diatonic";

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

const PMC_SOURCE =
  "Patriarchal Music Committee (1881), Στοιχειώδης Διδασκαλία της Εκκλησιαστικής Μουσικής, Constantinople 1888";

export const PMC_1881: TuningSystem = {
  id: "pmc-1881",
  name: "Patriarchal Music Committee 1881",
  moriaPerOctave: 72,
  genera: {
    diatonic: { value: [12, 10, 8, 12, 12, 10, 8], source: PMC_SOURCE, reviewStatus: "unreviewed" },
  },
};
