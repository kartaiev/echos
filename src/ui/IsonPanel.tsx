import type { IsonState, IsonVoice, LadderDegree } from "../core/practice/PracticeSession";
import { VOWELS } from "../audio/AudioOutput";
import { degreeLabel, t } from "../i18n/translations";

interface IsonLaneProps {
  ison: IsonState;
  degrees: readonly LadderDegree[];
  voiceOpen: boolean;
  voicePanelId: string;
  onSetIson: (degreeId: string) => void;
  onStop: () => void;
  onToggleVoice: () => void;
}

/** The Ison in the transport bar; the Degree menu is also the way to set it without a long press. */
export function IsonLane({ ison, degrees, voiceOpen, voicePanelId, onSetIson, onStop, onToggleVoice }: IsonLaneProps) {
  const sounding = ison.degreeId !== null;
  return (
    <div className={"transport__lane" + (sounding ? " is-active" : "")}>
      <span className="transport__name">{t("ison.title")}</span>
      <select
        className="transport__select"
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
      <button
        type="button"
        className="transport__more"
        aria-expanded={voiceOpen}
        aria-controls={voicePanelId}
        onClick={onToggleVoice}
      >
        {t("ison.voice")}
      </button>
      <button type="button" className="transport__action" aria-pressed={sounding} disabled={!sounding} onClick={onStop}>
        {t("ison.stop")}
      </button>
    </div>
  );
}

interface IsonVoicePanelProps {
  ison: IsonState;
  onChangeVoice: (change: Partial<IsonVoice>) => void;
}

export function IsonVoicePanel({ ison, onChangeVoice }: IsonVoicePanelProps) {
  return (
    <>
      <div className="transport__row">
        <span className="transport__label">{t("ison.vowel")}</span>
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
      </div>
      <label className="transport__row">
        <span className="transport__label">{t("ison.volume")}</span>
        <input
          className="transport__range"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={ison.volume}
          onChange={(e) => onChangeVoice({ volume: Number(e.target.value) })}
        />
      </label>
    </>
  );
}
