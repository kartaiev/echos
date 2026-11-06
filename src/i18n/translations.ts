import type { DegreeName } from "../core/theory/tuningSystems";

/** Every UI string goes through this table. Greek arrives in its own ticket. */
const en = {
  "app.title": "Echos",
  "app.tagline": "Byzantine chant practice",
  "genus.diatonic": "Diatonic",
  "ladder.label": "Scale ladder",
  "ladder.hint": "Tap a Degree to hear it.",
  "ladder.playDegree": "Play {degree}",
  "ladder.tuning": "Tuning System: {name}, {moria} moria per octave",
  "tuning.pmc-1881": "Patriarchal Music Committee 1881",
  "degree.Ni": "Ni",
  "degree.Pa": "Pa",
  "degree.Vou": "Vou",
  "degree.Ga": "Ga",
  "degree.Di": "Di",
  "degree.Ke": "Ke",
  "degree.Zo": "Zo",
} as const;

export type TranslationKey = keyof typeof en;

export function t(key: TranslationKey, params: Record<string, string | number> = {}): string {
  return en[key].replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}

export function degreeLabel(name: DegreeName, octave: number): string {
  return t(`degree.${name}`) + "′".repeat(octave);
}
