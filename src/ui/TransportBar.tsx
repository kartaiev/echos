import { useEffect, useId, useState } from "react";
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
  presets: readonly TempoPreset[];
  readCount: () => number | null;
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
 * What sounds while the singer sings, kept at the bottom of the screen under the thumb and in sight of the
 * Ladder: the Ison and the metronome, each on one line, with their less used choices folded above them.
 */
export function TransportBar(props: TransportBarProps) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const voiceId = useId();
  const tempoId = useId();
  const toggle = (next: Sheet) => setSheet((open) => (open === next ? null : next));

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);

  return (
    <section className="transport" aria-label={t("transport.label")}>
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
        readCount={props.readCount}
        tempoOpen={sheet === "tempo"}
        tempoPanelId={tempoId}
        onStart={props.onStartMetronome}
        onStop={props.onStopMetronome}
        onToggleTempo={() => toggle("tempo")}
      />
    </section>
  );
}
