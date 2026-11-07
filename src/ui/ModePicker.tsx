import { MELOS_IDS, MODE_IDS, type ModeId, type ModeVariantKey } from "../core/theory/modeVariants";
import { t } from "../i18n/translations";
import { Segmented } from "./Segmented";

interface ModePickerProps {
  choice: ModeVariantKey | null;
  onChoose: (choice: ModeVariantKey) => void;
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
        <Segmented
          options={MELOS_IDS}
          value={choice.melos}
          label={t("modePicker.melos")}
          render={(m) => t(`melos.${m}`)}
          onChange={(m) => onChoose({ mode: choice.mode, melos: m })}
        />
      )}
    </div>
  );
}
