import { VOWELS, type Vowel } from "../../audio/AudioOutput";

export { VOWELS, type Vowel };

/** How the Ison sounds: the vowel it sings and its loudness from 0 to 1. */
export interface IsonVoice {
  vowel: Vowel;
  volume: number;
}

export const DEFAULT_ISON_VOICE: IsonVoice = { vowel: "a", volume: 0.6 };

/** Guards a voice restored from the device, which may be stale or hand-edited. */
export function isIsonVoice(value: unknown): value is IsonVoice {
  if (typeof value !== "object" || value === null) return false;
  const { vowel, volume } = value as Record<string, unknown>;
  return VOWELS.includes(vowel as Vowel) && typeof volume === "number" && volume >= 0 && volume <= 1;
}
