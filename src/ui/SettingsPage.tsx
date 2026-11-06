import { REGISTER_OCTAVES, type PitchSettings, type Register } from "../core/practice/PracticeSession";
import { noteRange, transposeNote, type NoteName } from "../core/theory/westernPitch";
import { t } from "../i18n/translations";

/** Range offered for Ni in the male register; the female register shows the same notes an octave up. */
const NI_NOTE_CHOICES = noteRange("F2", "A3");
const REGISTERS: Register[] = ["male", "female"];
const FINE_HZ_LIMIT = 5;

interface SettingsPageProps {
  settings: PitchSettings & { niHz: number };
  onChange: (settings: PitchSettings) => void;
  onPlayNi: () => void;
}

export function noteLabel(note: NoteName): string {
  return note.replace("#", "♯");
}

export function SettingsPage({ settings, onChange, onPlayNi }: SettingsPageProps) {
  const { referencePitch, register } = settings;
  const octaveShift = REGISTER_OCTAVES[register];
  const choices = NI_NOTE_CHOICES.includes(referencePitch.note) ? NI_NOTE_CHOICES : [...NI_NOTE_CHOICES, referencePitch.note];
  const fine = referencePitch.fineHz;

  return (
    <section className="settings">
      <h2>{t("settings.title")}</h2>

      <fieldset className="settings__group">
        <legend>{t("settings.register")}</legend>
        <div className="segmented" role="radiogroup" aria-label={t("settings.register")}>
          {REGISTERS.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={register === r}
              className={register === r ? "is-selected" : ""}
              onClick={() => onChange({ referencePitch, register: r })}
            >
              {t(`register.${r}`)}
            </button>
          ))}
        </div>
        <p className="settings__help">{t("settings.registerHelp")}</p>
      </fieldset>

      <fieldset className="settings__group">
        <legend>{t("settings.referencePitch")}</legend>
        <label className="settings__row">
          <span>{t("settings.niNote")}</span>
          <select
            value={referencePitch.note}
            onChange={(e) => onChange({ register, referencePitch: { note: e.target.value as NoteName, fineHz: fine } })}
          >
            {choices.map((note) => (
              <option key={note} value={note}>
                {noteLabel(transposeNote(note, octaveShift))}
              </option>
            ))}
          </select>
        </label>

        <label className="settings__row">
          <span>{t("settings.fineTune")}</span>
          <output>{t("settings.fineHz", { hz: (fine > 0 ? "+" : "") + fine.toFixed(1) })}</output>
        </label>
        <input
          type="range"
          min={-FINE_HZ_LIMIT}
          max={FINE_HZ_LIMIT}
          step={0.1}
          value={fine}
          aria-label={t("settings.fineTune")}
          onChange={(e) => onChange({ register, referencePitch: { note: referencePitch.note, fineHz: Number(e.target.value) } })}
        />
        {fine !== 0 && (
          <button type="button" className="link-button" onClick={() => onChange({ register, referencePitch: { ...referencePitch, fineHz: 0 } })}>
            {t("settings.resetFine")}
          </button>
        )}
      </fieldset>

      <div className="settings__result">
        <p>{t("settings.niSoundsAt", { hz: settings.niHz.toFixed(2) })}</p>
        <button type="button" className="primary-button" onClick={onPlayNi}>
          {t("settings.playNi")}
        </button>
      </div>
    </section>
  );
}
