import type { SourcedValue } from "./tuningSystems";

/** The Neumes that have a name of their own on the chart, each a sign written alone. */
export const NEUME_NAMES = [
  "ison",
  "oligon",
  "kentima",
  "kentimata",
  "petasti",
  "apostrofos",
  "elafron",
  "yporroi",
  "chamili",
  "running-elafron",
] as const;
export type NeumeName = (typeof NEUME_NAMES)[number];

/** The written forms of the intervals, named as in the SBMuFL font layout (a Neume alone, or several written as one). */
export type NeumeSign =
  | NeumeName
  | "oligon-kentima-ypsili-middle"
  | "oligon-kentima-ypsili-right"
  | "oligon-ypsili-left"
  | "oligon-ypsili-right"
  | "oligon-kentima-above"
  | "oligon-kentima-middle"
  | "oligon-kentima-below"
  | "oligon-ison"
  | "oligon-apostrofos"
  | "elafron-apostrofos"
  | "chamili-apostrofos"
  | "chamili-elafron"
  | "chamili-elafron-apostrofos"
  | "oligon-kentimata-above"
  | "oligon-kentimata-below"
  | "oligon-apostrofos-kentimata"
  | "petasti-kentima-ypsili-middle"
  | "petasti-kentima-ypsili-right"
  | "petasti-ypsili-left"
  | "petasti-ypsili-right"
  | "petasti-kentima"
  | "petasti-oligon"
  | "petasti-ison"
  | "petasti-apostrofos"
  | "petasti-elafron"
  | "petasti-elafron-apostrofos"
  | "petasti-chamili"
  | "petasti-chamili-apostrofos"
  | "petasti-chamili-elafron"
  | "petasti-chamili-elafron-apostrofos";

/**
 * A written interval: the Degrees the melody moves by, one entry per note it sings (up positive, down negative,
 * 0 for the same Degree), and whether it is the Petasti form, an ornament the student may sing or not.
 */
export interface IntervalNeume {
  sign: NeumeSign;
  steps: readonly number[];
  ornament: boolean;
}

const plain = (sign: NeumeSign, ...steps: number[]): IntervalNeume => ({ sign, steps, ornament: false });
const ornament = (sign: NeumeSign, ...steps: number[]): IntervalNeume => ({ sign, steps, ornament: true });

/**
 * Trisagion School, ByzB 102, "Interval Symbols" handout, read from the top: up seven to down seven with the
 * alternative forms, then the two-note combinations, then the Petasti column ("optional ornament").
 */
const INTERVALS: readonly IntervalNeume[] = [
  plain("oligon-kentima-ypsili-middle", 7),
  plain("oligon-kentima-ypsili-right", 6),
  plain("oligon-ypsili-left", 5),
  plain("oligon-ypsili-right", 4),
  plain("oligon-kentima-above", 3),
  plain("oligon-kentima-middle", 2),
  plain("oligon-kentima-below", 2),
  plain("kentimata", 1),
  plain("oligon", 1),
  plain("oligon-ison", 0),
  plain("ison", 0),
  plain("oligon-apostrofos", -1),
  plain("apostrofos", -1),
  plain("elafron", -2),
  plain("elafron-apostrofos", -3),
  plain("chamili", -4),
  plain("chamili-apostrofos", -5),
  plain("chamili-elafron", -6),
  plain("chamili-elafron-apostrofos", -7),
  plain("oligon-kentimata-above", 1, 1),
  plain("oligon-kentimata-below", 1, 1),
  plain("oligon-apostrofos-kentimata", -1, 1),
  plain("running-elafron", -1, -1),
  plain("yporroi", -1, -1),
  ornament("petasti-kentima-ypsili-middle", 7),
  ornament("petasti-kentima-ypsili-right", 6),
  ornament("petasti-ypsili-left", 5),
  ornament("petasti-ypsili-right", 4),
  ornament("petasti-kentima", 3),
  ornament("petasti-oligon", 2),
  ornament("petasti", 1),
  ornament("petasti-ison", 0),
  ornament("petasti-apostrofos", -1),
  ornament("petasti-elafron", -2),
  ornament("petasti-elafron-apostrofos", -3),
  ornament("petasti-chamili", -4),
  ornament("petasti-chamili-apostrofos", -5),
  ornament("petasti-chamili-elafron", -6),
  ornament("petasti-chamili-elafron-apostrofos", -7),
];

const TRISAGION_INTERVAL_SYMBOLS =
  'Trisagion School of Byzantine Music, ByzB 102: Intro to Byzantine Notation, "Interval Symbols" handout';

export const INTERVAL_NEUMES: SourcedValue<readonly IntervalNeume[]> = {
  value: INTERVALS,
  source: TRISAGION_INTERVAL_SYMBOLS,
  reviewStatus: "unreviewed",
};
