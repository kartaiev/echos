import { isIsonVoice, type IsonVoice } from "../core/practice/isonVoice";
import { isModeVariantKey, type ModeVariantKey } from "../core/theory/modeVariants";
import { isPitchSettings, type PitchSettings } from "../core/practice/pitchSettings";
import { isLanguage, type Language } from "../i18n/translations";
import { isTheme, type Theme } from "./theme";
import { isMetronomeSettings, type MetronomeSettings } from "../core/practice/metronomeSettings";

const PITCH_KEY = "echos.pitchSettings.v1";
const ISON_VOICE_KEY = "echos.isonVoice.v1";
const MODE_VARIANT_KEY = "echos.modeVariant.v1";
const METRONOME_KEY = "echos.metronome.v1";
const LANGUAGE_KEY = "echos.language.v1";
const THEME_KEY = "echos.theme.v1";

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
/** null is saved when the student leaves the Mode Variant; it loads as no Mode Variant. */
export const loadModeVariant = () => load(MODE_VARIANT_KEY, isModeVariantKey);
export const saveModeVariant = (key: ModeVariantKey | null) => save(MODE_VARIANT_KEY, key);
export const loadMetronomeSettings = () => load(METRONOME_KEY, isMetronomeSettings);
export const saveMetronomeSettings = (settings: MetronomeSettings) => save(METRONOME_KEY, settings);
export const loadLanguage = () => load(LANGUAGE_KEY, isLanguage);
export const saveLanguage = (language: Language) => save(LANGUAGE_KEY, language);
export const loadTheme = () => load(THEME_KEY, isTheme);
export const saveTheme = (theme: Theme) => save(THEME_KEY, theme);