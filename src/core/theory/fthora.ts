import type { DegreePosition } from "./scale";
import { DEGREE_NAMES, type GenusId, type SourcedValue, type TuningSystem } from "./tuningSystems";

/**
 * The Genera a Fthora can switch to on the Ladder. The Enharmonic Fthora (ajem, on Zo') is left out until a source
 * example confirms how the pivot rule applies to it (issue #38).
 */
export const FTHORA_GENERA = ["diatonic", "soft-chromatic", "hard-chromatic"] as const;
export type FthoraGenus = (typeof FTHORA_GENERA)[number];

/** The signs of the Fthores, named as in the SBMuFL font layout. */
export type FthoraSign =
  | "diatonic-ni-low"
  | "diatonic-pa"
  | "diatonic-vou"
  | "diatonic-ga"
  | "diatonic-di"
  | "diatonic-ke"
  | "diatonic-zo"
  | "diatonic-ni-high"
  | "soft-chromatic-di"
  | "soft-chromatic-ke"
  | "hard-chromatic-pa"
  | "hard-chromatic-di";

type SignTable = Partial<Record<FthoraSign, readonly DegreePosition[]>>;

const at = (name: DegreePosition["name"], octave = 0): DegreePosition => ({ name, octave });

/**
 * Trisagion School, Octoëchos 201, "Introduction to Fthores", table of Fthores with their notes. A chromatic sign
 * stands for every Degree listed with it, since these Genera repeat every four Degrees: the Soft Chromatic Di
 * also for Ni, Vou and Zo', its Ni' (Ke in SBMuFL) also for Pa, Ga and Ke; the Hard Chromatic Pa also for Ga, Ke
 * and Ni', its Di ("nenano") also for Ni, Vou and Zo'. Zo' is the Zo above Ke, our octave 0.
 */
const FTHORA_TABLE: Record<FthoraGenus, SignTable> = {
  diatonic: {
    "diatonic-ni-low": [at("Ni")],
    "diatonic-pa": [at("Pa")],
    "diatonic-vou": [at("Vou")],
    "diatonic-ga": [at("Ga")],
    "diatonic-di": [at("Di")],
    "diatonic-ke": [at("Ke")],
    "diatonic-zo": [at("Zo")],
    "diatonic-ni-high": [at("Ni", 1)],
  },
  "soft-chromatic": {
    "soft-chromatic-di": [at("Di"), at("Ni"), at("Vou"), at("Zo")],
    "soft-chromatic-ke": [at("Ni", 1), at("Pa"), at("Ga"), at("Ke")],
  },
  "hard-chromatic": {
    "hard-chromatic-pa": [at("Pa"), at("Ga"), at("Ke"), at("Ni", 1)],
    "hard-chromatic-di": [at("Di"), at("Ni"), at("Vou"), at("Zo")],
  },
};

const TRISAGION_FTHORES =
  'Trisagion School of Byzantine Music, Octoëchos 201: 1st Mode (2026), "Introduction to Fthores" and "Fthores, Part II: Altering the Scale"';

export const FTHORES: SourcedValue<Record<FthoraGenus, SignTable>> = {
  value: FTHORA_TABLE,
  source: TRISAGION_FTHORES,
  reviewStatus: "unreviewed",
};

const indexOf = ({ name, octave }: DegreePosition) => octave * DEGREE_NAMES.length + DEGREE_NAMES.indexOf(name);
const mod = (n: number, m: number) => ((n % m) + m) % m;

/**
 * The sign of the Fthora of a Genus placed on a Degree. Diatonic signs belong to one Degree each (the high Ni to
 * every Ni above the octave of the Reference Pitch). A chromatic sign covers the Degrees that share a place in the
 * Genus's repeating cycle with one listed in the table.
 */
export function fthoraSign(tuningSystem: TuningSystem, genus: FthoraGenus, degree: DegreePosition): FthoraSign {
  const table = Object.entries(FTHORES.value[genus]) as [FthoraSign, readonly DegreePosition[]][];
  if (genus === "diatonic") {
    if (degree.name === "Ni") return degree.octave >= 1 ? "diatonic-ni-high" : "diatonic-ni-low";
    return table.find(([, listed]) => listed.some((p) => p.name === degree.name))![0];
  }
  const { from, intervals } = tuningSystem.genera[genus].value;
  const place = (p: DegreePosition) => mod(indexOf(p) - DEGREE_NAMES.indexOf(from), intervals.length);
  const found = table.find(([, listed]) => listed.some((p) => place(p) === place(degree)));
  if (!found) throw new Error(`No ${genus} Fthora for ${degree.name}`);
  return found[0];
}

/** Every Genus a Fthora can bring in, for checks over all placements. */
export const fthoraGenusOf = (genus: GenusId): genus is FthoraGenus => (FTHORA_GENERA as readonly string[]).includes(genus);
