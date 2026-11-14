import type { FthoraSign } from "./fthora";
import { MODE_IDS, type ModeId } from "./modeVariants";
import type { DegreePosition } from "./scale";
import type { SourcedValue } from "./tuningSystems";

/**
 * What a Modal Signature says after the sign of its Mode: the Base, and the Fthora that fixes the Scale of the
 * Base. The sign of the Mode itself is drawn from the Mode (see the Neanes glyphs in the UI).
 */
export interface ModalSignature {
  mode: ModeId;
  base: DegreePosition;
  fthora: FthoraSign;
}

const at = (name: DegreePosition["name"], octave = 0): DegreePosition => ({ name, octave });

/**
 * One Modal Signature per Mode, as the course shows them side by side; a Mode can be written with others, which
 * come with the courses on that Mode.
 */
const SIGNATURES: Record<ModeId, Omit<ModalSignature, "mode">> = {
  first: { base: at("Pa"), fthora: "diatonic-pa" },
  second: { base: at("Di"), fthora: "soft-chromatic-di" },
  third: { base: at("Ga"), fthora: "diatonic-ga" },
  fourth: { base: at("Di"), fthora: "diatonic-di" },
  "plagal-first": { base: at("Pa"), fthora: "diatonic-pa" },
  "plagal-second": { base: at("Pa"), fthora: "hard-chromatic-pa" },
  // The low Zo, written with the sign of the Diatonic Fthora of Pa.
  grave: { base: at("Zo", -1), fthora: "diatonic-pa" },
  "plagal-fourth": { base: at("Ni"), fthora: "diatonic-ni-low" },
};

export const MODAL_SIGNATURES: SourcedValue<readonly ModalSignature[]> = {
  value: MODE_IDS.map((mode) => ({ mode, ...SIGNATURES[mode] })),
  source: 'Trisagion School of Byzantine Music, Octoëchos 201: 1st Mode (2026), "Fthores, Part I: Establishing the Scale"',
  reviewStatus: "unreviewed",
};
