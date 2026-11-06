import { isIsonVoice, type IsonVoice } from "../core/practice/isonVoice";
import { isPitchSettings, type PitchSettings } from "../core/practice/pitchSettings";

const PITCH_KEY = "echos.pitchSettings.v1";
const ISON_VOICE_KEY = "echos.isonVoice.v1";

/** A value saved on this device, or undefined when there is none, it is invalid, or storage is unavailable. */
function load<T>(key: string, isValid: (value: unknown) => value is T): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    const value: unknown = JSON.parse(raw);
    return isValid(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or blocked storage: the setting simply isn't remembered.
  }
}

export const loadPitchSettings = () => load(PITCH_KEY, isPitchSettings);
export const savePitchSettings = (settings: PitchSettings) => save(PITCH_KEY, settings);
export const loadIsonVoice = () => load(ISON_VOICE_KEY, isIsonVoice);
export const saveIsonVoice = (voice: IsonVoice) => save(ISON_VOICE_KEY, voice);
