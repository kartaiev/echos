import { ATTRACTION_RULES, ATTRACTION_RULES_SOURCE, type AttractionRule, type AttractionRuleId, type AttractionScope, type PathNote } from "../theory/attractionRules";
import { FTHORA_GENERA, FTHORES, type FthoraGenus, type FthoraSign } from "../theory/fthora";
import { MARTYRIA, martyriaOf, type Martyria } from "../theory/martyria";
import { MODE_VARIANTS } from "../theory/modeVariants";
import { INTERVAL_NEUMES, NEUME_NAMES, type NeumeName, type NeumeSign } from "../theory/neumes";
import { buildScale, degreeId, positionAt, type DegreePosition } from "../theory/scale";
import { DEGREE_NAMES, GENUS_IDS, PMC_1881, type GenusId } from "../theory/tuningSystems";

/** A Fthora sign to name: its Genus and the Degree it makes of its pivot (with the others a chromatic sign stands for). */
export interface FthoraCard {
  kind: "fthora";
  id: string;
  sign: FthoraSign;
  genus: FthoraGenus;
  /** The Degree the sign is named after first, then the others it stands for in its Genus. */
  degrees: readonly DegreePosition[];
}

/** A Martyria to read: the Degree and the Genus it bears witness to. */
export interface MartyriaCard {
  kind: "martyria";
  id: string;
  genus: GenusId;
  degree: DegreePosition;
  martyria: Martyria;
}

/** A Neume to name. */
export interface NeumeCard {
  kind: "neume";
  id: string;
  neume: NeumeName;
}

/** A written interval to read: where the melody goes from the Degree before it. */
export interface IntervalCard {
  kind: "interval";
  id: string;
  sign: NeumeSign;
  steps: readonly number[];
  ornament: boolean;
}

/** A note of a Melody Path placed on the Scale of its Mode. */
export interface PathStep extends PathNote {
  /** Its place above Ni in the Genus of the Mode, before any Attraction moves it. */
  moria: number;
}

/** A situation in the melody: how the Degree in it is sung. */
export interface AttractionCard extends Omit<AttractionRule, "id" | "reviewStatus" | "paths"> {
  kind: "attraction";
  id: string;
  rule: AttractionRuleId;
  /** How the melody moves in the situation, each note at its place on the Scale. */
  paths: readonly (readonly PathStep[])[];
  /** For Zo, the one Attraction a source sizes: its place in moria above Ke, natural or lowered (ADR-0008). */
  aboveKe?: number;
}

export type Card = NeumeCard | IntervalCard | FthoraCard | MartyriaCard | AttractionCard;

export const DECK_IDS = ["neumes", "fthores", "martyries", "attractions"] as const;
export type DeckId = (typeof DECK_IDS)[number];

export interface Deck {
  id: DeckId;
  cards: readonly Card[];
  /** Where the answers come from: the same tables the Ladder draws from. */
  source: string;
}

/** The names first, so the signs the intervals are built from are known before the intervals come up. */
const neumeCards: (NeumeCard | IntervalCard)[] = [
  ...NEUME_NAMES.map((neume) => ({ kind: "neume" as const, id: `neume:${neume}`, neume })),
  ...INTERVAL_NEUMES.value.map(({ sign, steps, ornament }) => ({ kind: "interval" as const, id: `interval:${sign}`, sign, steps, ornament })),
];

const fthoraCards: FthoraCard[] = FTHORA_GENERA.flatMap((genus) =>
  (Object.entries(FTHORES.value[genus]) as [FthoraSign, readonly DegreePosition[]][]).map(([sign, degrees]) => ({
    kind: "fthora" as const,
    id: `fthora:${sign}`,
    sign,
    genus,
    degrees,
  })),
);

/** The octave from Ni to Ni', the one every Martyria table on the chart prints in full. */
const MIDDLE_OCTAVE = Array.from({ length: 8 }, (_, i) => positionAt(i));

const martyriaCards: MartyriaCard[] = GENUS_IDS.flatMap((genus) =>
  MIDDLE_OCTAVE.map((degree) => ({
    kind: "martyria" as const,
    id: `martyria:${genus}:${degreeId(degree)}`,
    genus,
    degree,
    martyria: martyriaOf(genus, degree)!,
  })),
);

/** Zo above Ke in the Diatonic, read off the Tuning System, and the Zo lowered by its Attraction. */
const DIATONIC = PMC_1881.genera.diatonic.value;
const NATURAL_ZO_ABOVE_KE = DIATONIC.intervals[DEGREE_NAMES.indexOf("Ke") - DEGREE_NAMES.indexOf(DIATONIC.from)]!;
const ZO_LOWERED_BY = PMC_1881.attractions.find(({ value }) => value.id === "zo-lowered")!.value.moria;

/** The Genus a rule's Melody Paths are drawn in: that of its Modes, or the Diatonic. */
function genusOf(where: AttractionScope): GenusId {
  if (where === "diatonic" || where === "ajem") return "diatonic";
  return MODE_VARIANTS[where.modes[0]!][where.melos ?? "heirmologic"].value.genus;
}

/** The Degrees from Ni to Ni' of a Genus, in moria above Ni. */
const scaleOf = (genus: GenusId) =>
  buildScale({ tuningSystem: PMC_1881, genus, referencePitchHz: 1, lowest: { name: "Ni", octave: 0 }, highest: { name: "Ni", octave: 1 } });

const attractionCards: AttractionCard[] = ATTRACTION_RULES.map(({ id, reviewStatus: _, paths, ...rule }) => ({
  kind: "attraction" as const,
  id: `attraction:${id}`,
  rule: id,
  ...rule,
  paths: paths.map((path) => {
    const scale = scaleOf(genusOf(rule.where));
    return path.map((note) => ({ ...note, moria: scale.find((d) => d.name === note.name && d.octave === note.octave)!.moria }));
  }),
  ...(rule.degree === "Zo" && { aboveKe: NATURAL_ZO_ABOVE_KE + (rule.turn === "lowered" ? ZO_LOWERED_BY : 0) }),
}));

export const DECKS: Record<DeckId, Deck> = {
  neumes: { id: "neumes", cards: neumeCards, source: INTERVAL_NEUMES.source },
  fthores: { id: "fthores", cards: fthoraCards, source: FTHORES.source },
  martyries: { id: "martyries", cards: martyriaCards, source: MARTYRIA.diatonic.source },
  attractions: { id: "attractions", cards: attractionCards, source: ATTRACTION_RULES_SOURCE },
};

export const cardsOf = (deck: DeckId): readonly Card[] => DECKS[deck].cards;
