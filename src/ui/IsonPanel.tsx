import type { IsonState, IsonVoice, LadderDegree } from "../core/practice/PracticeSession";
import { VOWELS } from "../audio/AudioOutput";
import { degreeLabel, t } from "../i18n/translations";
import { Segmented } from "./Segmented";

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
      {/* Only while the Ison sounds: an inert Stop would sit right above the metronome's button. */}
      {sounding && (
        <button type="button" className="transport__stop" aria-label={t("ison.stopLabel")} onClick={onStop}>
          {t("ison.stop")}
        </button>
      )}
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
        <Segmented
          className="segmented segmented--vowel"
          options={VOWELS}
          value={ison.vowel}
          label={t("ison.vowel")}
          render={(v) => t(`vowel.${v}`)}
          onChange={(vowel) => onChangeVoice({ vowel })}
        />
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
