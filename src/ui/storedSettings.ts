import type { PitchSettings } from "../core/practice/PracticeSession";

const KEY = "echos.pitchSettings.v1";

/** Settings saved on this device, or undefined when there are none or storage is unavailable. */
export function loadPitchSettings(): PitchSettings | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return undefined;
    const value: unknown = JSON.parse(raw);
    return isPitchSettings(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function savePitchSettings(settings: PitchSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Private mode or blocked storage: the setting simply isn't remembered.
  }
}

function isPitchSettings(value: unknown): value is PitchSettings {
  if (typeof value !== "object" || value === null) return false;
  const { referencePitch, register } = value as Record<string, unknown>;
  if (register !== "male" && register !== "female") return false;
  if (typeof referencePitch !== "object" || referencePitch === null) return false;
  const { note, fineHz } = referencePitch as Record<string, unknown>;
  return typeof note === "string" && /^[A-G]#?\d$/.test(note) && typeof fineHz === "number" && Math.abs(fineHz) <= 10;
}
