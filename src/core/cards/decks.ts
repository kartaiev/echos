import { FTHORA_GENERA, FTHORES, type FthoraGenus, type FthoraSign } from "../theory/fthora";
import { MARTYRIA, martyriaOf, type Martyria } from "../theory/martyria";
import { INTERVAL_NEUMES, NEUME_NAMES, type NeumeName, type NeumeSign } from "../theory/neumes";
import { degreeId, positionAt, type DegreePosition } from "../theory/scale";
import { GENUS_IDS, type GenusId } from "../theory/tuningSystems";

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

export type Card = NeumeCard | IntervalCard | FthoraCard | MartyriaCard;

export const DECK_IDS = ["neumes", "fthores", "martyries"] as const;
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

export const DECKS: Record<DeckId, Deck> = {
  neumes: { id: "neumes", cards: neumeCards, source: INTERVAL_NEUMES.source },
  fthores: { id: "fthores", cards: fthoraCards, source: FTHORES.source },
  martyries: { id: "martyries", cards: martyriaCards, source: MARTYRIA.diatonic.source },
};

export const cardsOf = (deck: DeckId): readonly Card[] => DECKS[deck].cards;
