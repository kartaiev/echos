import { isPitchSettings, type PitchSettings } from "../core/practice/pitchSettings";

const KEY = "echos.pitchSettings.v1";

/** Settings saved on this device, or undefined when there are none, they are invalid, or storage is unavailable. */
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
