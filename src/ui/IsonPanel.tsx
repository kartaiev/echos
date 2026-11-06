import type { IsonState, IsonVoice, LadderDegree } from "../core/practice/PracticeSession";
import { VOWELS } from "../core/practice/isonVoice";
import { degreeLabel, t } from "../i18n/translations";

interface IsonPanelProps {
  ison: IsonState;
  degrees: readonly LadderDegree[];
  onSetIson: (degreeId: string) => void;
  onStop: () => void;
  onChangeVoice: (change: Partial<IsonVoice>) => void;
}

/** Ison controls; the Degree menu is also the way to set the Ison without a long press (keyboard, screen readers). */
export function IsonPanel({ ison, degrees, onSetIson, onStop, onChangeVoice }: IsonPanelProps) {
  return (
    <section className={"ison" + (ison.degreeId ? " is-sounding" : "")} aria-label={t("ison.title")}>
      <div className="ison__row">
        <span className="ison__title">{t("ison.title")}</span>
        <select
          className="ison__degree"
          value={ison.degreeId ?? ""}
          aria-label={t("ison.degree")}
          onChange={(e) => (e.target.value ? onSetIson(e.target.value) : onStop())}
        >
          <option value="">{t("ison.off")}</option>
          {[...degrees].reverse().map((d) => (
            <option key={d.id} value={d.id}>
              {degreeLabel(d.name, d.octave)}
            </option>
          ))}
        </select>
        <button type="button" className="ison__stop" onClick={onStop} disabled={!ison.degreeId}>
          {t("ison.stop")}
        </button>
      </div>
      <div className="ison__row">
        <div className="segmented segmented--vowel" role="radiogroup" aria-label={t("ison.vowel")}>
          {VOWELS.map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={ison.vowel === v}
              className={ison.vowel === v ? "is-selected" : ""}
              onClick={() => onChangeVoice({ vowel: v })}
            >
              {t(`vowel.${v}`)}
            </button>
          ))}
        </div>
        <input
          className="ison__volume"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={ison.volume}
          aria-label={t("ison.volume")}
          onChange={(e) => onChangeVoice({ volume: Number(e.target.value) })}
        />
      </div>
    </section>
  );
}
