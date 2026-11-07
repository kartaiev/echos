import type { Martyria, RootSign } from "../core/practice/PracticeSession";
import type { DegreeName } from "../core/theory/tuningSystems";

/**
 * Code points of the Neanes font in the SBMuFL layout (github.com/neanes/sbmufl). Each set of letters runs
 * from Zo up to Ke; root signs are zero-width marks the font places under (or over) the letter before them.
 */
const LETTER_ORDER: readonly DegreeName[] = ["Zo", "Ni", "Pa", "Vou", "Ga", "Di", "Ke"];
const FIRST_LETTER = { [-1]: 0xe130, 0: 0xe137, 1: 0xe13e } as const;

const ROOT_SIGN_BELOW: Record<RootSign, number> = {
  zo: 0xe150,
  delta: 0xe151,
  alpha: 0xe152,
  legetos: 0xe153,
  nana: 0xe154,
  "delta-dotted": 0xe155,
  "alpha-dotted": 0xe156,
  "hard-chromatic-pa": 0xe157,
  "hard-chromatic-di": 0xe158,
  "soft-chromatic-di": 0xe159,
  "soft-chromatic-ke": 0xe15a,
};
/** The same signs drawn above the letter sit 0x20 further on. */
const ABOVE_OFFSET = 0x20;
const FTHORA_ENHARMONIC = 0xe1dc;

/** The Martyria of a Degree in the Neanes font: the letter with its sign, and any Fthora written beside it. */
export function martyriaGlyphs(name: DegreeName, { letterOctave, rootSign, rootSignAbove, fthora }: Martyria) {
  const letter = FIRST_LETTER[letterOctave] + LETTER_ORDER.indexOf(name);
  const sign = ROOT_SIGN_BELOW[rootSign] + (rootSignAbove ? ABOVE_OFFSET : 0);
  return {
    letterAndSign: String.fromCodePoint(letter, sign),
    fthora: fthora === "enharmonic" ? String.fromCodePoint(FTHORA_ENHARMONIC) : null,
  };
}
