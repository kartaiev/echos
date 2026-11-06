import { MELOS_IDS, MODE_IDS, type ModeId, type ModeVariantChoice } from "../core/theory/modeVariants";
import { t } from "../i18n/translations";

interface ModePickerProps {
  choice: ModeVariantChoice | null;
  onChoose: (choice: ModeVariantChoice) => void;
  onLeave: () => void;
}

/** Mode and Melos; "no Mode" leaves the Genus to be chosen by hand. */
export function ModePicker({ choice, onChoose, onLeave }: ModePickerProps) {
  const melos = choice?.melos ?? "heirmologic";

  return (
    <div className="mode-picker">
      <select
        className="mode-picker__mode"
        value={choice?.mode ?? ""}
        aria-label={t("modePicker.mode")}
        onChange={(e) => (e.target.value ? onChoose({ mode: e.target.value as ModeId, melos }) : onLeave())}
      >
        <option value="">{t("modePicker.none")}</option>
        {MODE_IDS.map((mode) => (
          <option key={mode} value={mode}>
            {t(`mode.${mode}`)}
          </option>
        ))}
      </select>
      {choice && (
        <div className="segmented" role="radiogroup" aria-label={t("modePicker.melos")}>
          {MELOS_IDS.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={choice.melos === m}
              className={choice.melos === m ? "is-selected" : ""}
              onClick={() => onChoose({ mode: choice.mode, melos: m })}
            >
              {t(`melos.${m}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
