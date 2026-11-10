import { FTHORA_GENERA, FTHORES, type FthoraGenus, type FthoraSign } from "../theory/fthora";
import { MARTYRIA, martyriaOf, type Martyria } from "../theory/martyria";
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

export type Card = FthoraCard | MartyriaCard;

export const DECK_IDS = ["fthores", "martyries"] as const;
export type DeckId = (typeof DECK_IDS)[number];

export interface Deck {
  id: DeckId;
  cards: readonly Card[];
  /** Where the answers come from: the same tables the Ladder draws from. */
  source: string;
}

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
  fthores: { id: "fthores", cards: fthoraCards, source: FTHORES.source },
  martyries: { id: "martyries", cards: martyriaCards, source: MARTYRIA.diatonic.source },
};

export const cardsOf = (deck: DeckId): readonly Card[] => DECKS[deck].cards;
