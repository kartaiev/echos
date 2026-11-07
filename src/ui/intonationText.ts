import type { Intonation } from "../core/theory/modeVariants";
import { currentLanguage } from "../i18n/translations";

/** The Intonation's syllables in the interface language: Greek letters in Greek, Latin ones otherwise. */
export const intonationText = (intonation: Intonation) =>
  currentLanguage() === "el" ? intonation.greekText : intonation.text;
