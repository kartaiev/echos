import { useEffect, useId, useRef, useState } from "react";
import type {
  IsonState,
  IsonVoice,
  LadderDegree,
  MetronomeSettings,
  MetronomeState,
  TempoPreset,
  TempoPresetId,
} from "../core/practice/PracticeSession";
import { t } from "../i18n/translations";
import { IsonLane, IsonVoicePanel } from "./IsonPanel";
import { MetronomeLane, TempoPanel } from "./MetronomePanel";

interface TransportBarProps {
  ison: IsonState;
  degrees: readonly LadderDegree[];
  metronome: MetronomeState;
  count: number | null;
  presets: readonly TempoPreset[];
  /** The device holds the sound back: say so, and offer the tap that brings it back. */
  soundHeld: boolean;
  onResumeSound: () => void;
  onSetIson: (degreeId: string) => void;
  onStopIson: () => void;
  onChangeVoice: (change: Partial<IsonVoice>) => void;
  onStartMetronome: () => void;
  onStopMetronome: () => void;
  onChangeMetronome: (change: Partial<MetronomeSettings>) => void;
  onChoosePreset: (id: TempoPresetId) => void;
}

type Sheet = "voice" | "tempo";

/**
 * What sounds while the singer sings, kept at the bottom of the screen under the thumb: the Ison and the
 * metronome, each on one line, with their less used choices folded above them. An open sheet gives the screen back
 * at the first touch anywhere else, so it never stands between the singer and the Ladder.
 */
export function TransportBar(props: TransportBarProps) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const bar = useRef<HTMLElement>(null);
  const voiceId = useId();
  const tempoId = useId();
  const toggle = (next: Sheet) => setSheet((open) => (open === next ? null : next));

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(null);
    const onPointer = (e: PointerEvent) => {
      if (!bar.current?.contains(e.target as Node)) setSheet(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer, { capture: true });
    };
  }, [sheet]);

  return (
    <section ref={bar} className="transport" aria-label={t("transport.label")}>
      {props.soundHeld && (
        <p className="transport__notice" role="status">
          <span>{t("sound.held")}</span>
          <button type="button" className="transport__resume" onClick={props.onResumeSound}>
            {t("sound.resume")}
          </button>
        </p>
      )}
      <div id={voiceId} className="transport__sheet" role="group" aria-label={t("ison.voice")} hidden={sheet !== "voice"}>
        <IsonVoicePanel ison={props.ison} onChangeVoice={props.onChangeVoice} />
      </div>
      <div id={tempoId} className="transport__sheet" role="group" aria-label={t("metronome.tempo")} hidden={sheet !== "tempo"}>
        <TempoPanel
          metronome={props.metronome}
          presets={props.presets}
          onChange={props.onChangeMetronome}
          onChoosePreset={props.onChoosePreset}
        />
      </div>
      <IsonLane
        ison={props.ison}
        degrees={props.degrees}
        voiceOpen={sheet === "voice"}
        voicePanelId={voiceId}
        onSetIson={props.onSetIson}
        onStop={props.onStopIson}
        onToggleVoice={() => toggle("voice")}
      />
      <MetronomeLane
        metronome={props.metronome}
        count={props.count}
        tempoOpen={sheet === "tempo"}
        tempoPanelId={tempoId}
        onStart={props.onStartMetronome}
        onStop={props.onStopMetronome}
        onToggleTempo={() => toggle("tempo")}
      />
    </section>
  );
}
