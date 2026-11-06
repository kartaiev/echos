import type { DegreeName } from "../core/theory/tuningSystems";
import type { NoteName } from "../core/theory/westernPitch";

/** Every UI string goes through this table. Greek arrives in its own ticket. */
const en = {
  "app.title": "Echos",
  "app.tagline": "Byzantine chant practice",
  "genus.diatonic": "Diatonic",
  "genus.soft-chromatic": "Soft Chromatic",
  "genus.hard-chromatic": "Hard Chromatic",
  "genus.enharmonic": "Enharmonic",
  "ladder.label": "Scale ladder",
  "ladder.hint": "Tap a Degree to hear it.",
  "ladder.genus": "Genus",
  "ladder.playDegree": "Play {degree}",
  "ladder.tuning": "Tuning System: {name}, {moria} moria per octave",
  "ladder.niPitch": "{note} · {hz} Hz",
  "ladder.changePitch": "Change",
  "tuning.pmc-1881": "Patriarchal Music Committee 1881",
  "nav.settings": "Settings",
  "nav.practice": "Practice",
  "settings.title": "Settings",
  "settings.register": "Voice register",
  "settings.registerHelp": "The female voice sounds one octave higher.",
  "register.male": "Male",
  "register.female": "Female",
  "settings.referencePitch": "Pitch of Ni",
  "settings.niNote": "Note",
  "settings.fineTune": "Fine adjustment",
  "settings.fineHz": "{hz} Hz",
  "settings.resetFine": "Reset fine adjustment",
  "settings.niSoundsAt": "Ni sounds at {hz} Hz",
  "settings.playNi": "Play Ni",
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

/** Degree name with an octave mark: "Ke͵" an octave below Ni, "Ni′" an octave above. */
export function degreeLabel(name: DegreeName, octave: number): string {
  return t(`degree.${name}`) + (octave < 0 ? "\u0375".repeat(-octave) : "\u2032".repeat(octave));
}

/** Western note for display, with a real sharp sign: "C#3" → "C♯3". */
export function noteLabel(note: NoteName): string {
  return note.replace("#", "\u266f");
}
