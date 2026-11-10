import type { FthoraSign, Martyria, RootSign } from "../core/practice/PracticeSession";
import type { NeumeSign } from "../core/theory/neumes";
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

/** Fthora signs in the Neanes font (SBMuFL "fthora..." glyphs), drawn on their own. */
const FTHORA_SIGNS: Record<FthoraSign, number> = {
  "diatonic-ni-low": 0xe1d0,
  "diatonic-pa": 0xe1d1,
  "diatonic-vou": 0xe1d2,
  "diatonic-ga": 0xe1d3,
  "diatonic-di": 0xe1d4,
  "diatonic-ke": 0xe1d5,
  "diatonic-zo": 0xe1d6,
  "diatonic-ni-high": 0xe1d7,
  "hard-chromatic-pa": 0xe1d8,
  "hard-chromatic-di": 0xe1d9,
  "soft-chromatic-di": 0xe1da,
  "soft-chromatic-ke": 0xe1db,
};

export const fthoraGlyph = (sign: FthoraSign) => String.fromCodePoint(FTHORA_SIGNS[sign]);

/** Neume signs in the Neanes font (SBMuFL code points), each drawn as one glyph. */
const NEUME_SIGNS: Record<NeumeSign, number> = {
  ison: 0xe000,
  oligon: 0xe001,
  "oligon-kentima-middle": 0xe002,
  "oligon-kentima-below": 0xe003,
  "oligon-kentima-above": 0xe004,
  "oligon-ypsili-right": 0xe005,
  "oligon-ypsili-left": 0xe006,
  "oligon-kentima-ypsili-right": 0xe007,
  "oligon-kentima-ypsili-middle": 0xe008,
  "oligon-ison": 0xe010,
  "oligon-apostrofos": 0xe011,
  apostrofos: 0xe021,
  yporroi: 0xe023,
  elafron: 0xe024,
  "running-elafron": 0xe025,
  "elafron-apostrofos": 0xe026,
  chamili: 0xe027,
  "chamili-apostrofos": 0xe028,
  "chamili-elafron": 0xe029,
  "chamili-elafron-apostrofos": 0xe02a,
  "petasti-ison": 0xe040,
  petasti: 0xe041,
  "petasti-oligon": 0xe042,
  "petasti-kentima": 0xe043,
  "petasti-ypsili-right": 0xe044,
  "petasti-ypsili-left": 0xe045,
  "petasti-kentima-ypsili-right": 0xe046,
  "petasti-kentima-ypsili-middle": 0xe047,
  "petasti-apostrofos": 0xe060,
  "petasti-elafron": 0xe062,
  "petasti-elafron-apostrofos": 0xe064,
  "petasti-chamili": 0xe065,
  "petasti-chamili-apostrofos": 0xe066,
  "petasti-chamili-elafron": 0xe067,
  "petasti-chamili-elafron-apostrofos": 0xe068,
  kentima: 0xe080,
  kentimata: 0xe081,
  "oligon-kentimata-below": 0xe082,
  "oligon-kentimata-above": 0xe083,
  "oligon-apostrofos-kentimata": 0xe088,
};

export const neumeGlyph = (sign: NeumeSign) => String.fromCodePoint(NEUME_SIGNS[sign]);
