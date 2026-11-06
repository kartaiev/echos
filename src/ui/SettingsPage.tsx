import type { PitchSettings, PitchState } from "../core/practice/PracticeSession";
import { MAX_FINE_ADJUSTMENT_HZ, NI_NOTE_CHOICES, REGISTERS, soundingNote } from "../core/practice/pitchSettings";
import type { NoteName } from "../core/theory/westernPitch";
import { noteLabel, t } from "../i18n/translations";

interface SettingsPageProps {
  pitch: PitchState;
  onChange: (change: Partial<PitchSettings>) => void;
  onPlayNi: () => void;
}

export function SettingsPage({ pitch, onChange, onPlayNi }: SettingsPageProps) {
  const { referencePitch, register } = pitch;
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
              onClick={() => onChange({ register: r })}
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
            onChange={(e) => onChange({ referencePitch: { note: e.target.value as NoteName, fineHz: fine } })}
          >
            {choices.map((note) => (
              <option key={note} value={note}>
                {noteLabel(soundingNote(note, register))}
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
          min={-MAX_FINE_ADJUSTMENT_HZ}
          max={MAX_FINE_ADJUSTMENT_HZ}
          step={0.1}
          value={fine}
          aria-label={t("settings.fineTune")}
          onChange={(e) => onChange({ referencePitch: { note: referencePitch.note, fineHz: Number(e.target.value) } })}
        />
        {fine !== 0 && (
          <button type="button" className="link-button" onClick={() => onChange({ referencePitch: { ...referencePitch, fineHz: 0 } })}>
            {t("settings.resetFine")}
          </button>
        )}
      </fieldset>

      <div className="settings__result">
        <p>{t("settings.niSoundsAt", { hz: pitch.niHz.toFixed(2) })}</p>
        <button type="button" className="primary-button" onClick={onPlayNi}>
          {t("settings.playNi")}
        </button>
      </div>
    </section>
  );
}
