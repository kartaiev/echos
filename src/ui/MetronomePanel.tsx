import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { MetronomeSettings, MetronomeState, TempoPreset, TempoPresetId } from "../core/practice/PracticeSession";
import { GROUPINGS, MAX_CHRONOI_PER_MINUTE, MIN_CHRONOI_PER_MINUTE } from "../core/practice/metronomeSettings";
import { t } from "../i18n/translations";
import { Segmented } from "./Segmented";

/**
 * The chronos the metronome is on, 1 to the grouping, or null while it is stopped. It follows the audio clock: it
 * is re-read every frame, not counted by a timer of its own, and changes only when the next chronos is heard.
 */
export function useMetronomeCount(running: boolean, readCount: () => number | null) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!running) {
      setCount(null);
      return;
    }
    let frame = requestAnimationFrame(function tick() {
      setCount(readCount());
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [running, readCount]);
  return count;
}

interface MetronomeLaneProps {
  metronome: MetronomeState;
  count: number | null;
  tempoOpen: boolean;
  tempoPanelId: string;
  onStart: () => void;
  onStop: () => void;
  onToggleTempo: () => void;
}

/**
 * The metronome in the transport bar: the tempo, which opens the tempo choices, and one button that starts it and,
 * while it runs, shows the chronos and stops it. The beat itself is drawn on the Ladder.
 */
export function MetronomeLane({ metronome, count, tempoOpen, tempoPanelId, onStart, onStop, onToggleTempo }: MetronomeLaneProps) {
  const { chronoiPerMinute: cpm, tempoPreset, running } = metronome;
  const caption = [t("metronome.title"), tempoPreset && t(`tempo.short.${tempoPreset}`)].filter(Boolean).join(" · ");

  return (
    <div className={"transport__lane" + (running ? " is-active" : "")}>
      <button
        type="button"
        className="transport__more transport__tempo"
        aria-expanded={tempoOpen}
        aria-controls={tempoPanelId}
        onClick={onToggleTempo}
      >
        <span className="transport__tempo-name">{caption}</span>
        <span className="transport__tempo-value">{t("metronome.cpm", { n: cpm })}</span>
      </button>
      <button
        type="button"
        className={"transport__beat" + (running ? " is-running" : "") + (count === 1 ? " is-accent" : "")}
        aria-label={running ? t("metronome.stopLabel") : t("metronome.startLabel")}
        aria-keyshortcuts="Space"
        onClick={running ? onStop : onStart}
      >
        {running ? (
          <>
            {/* Read aloud every chronos would drown the singer; the label says what the button does. */}
            <span className="transport__beat-count" aria-hidden="true">
              {count ?? ""}
            </span>
            <span className="transport__beat-action" aria-hidden="true">
              {t("metronome.stop")}
            </span>
          </>
        ) : (
          t("metronome.start")
        )}
      </button>
    </div>
  );
}

/** How long a stepper must be held before it starts repeating, and how fast it then repeats. */
const REPEAT_AFTER_MS = 450;
const REPEAT_EVERY_MS = 70;

/** A stepper that steps once on a tap and keeps stepping while held. */
function useRepeatingStep(step: () => void, disabled: boolean) {
  const latest = useRef(step);
  latest.current = step;
  const timer = useRef<number | undefined>(undefined);
  const repeated = useRef(false);
  const stop = () => {
    window.clearTimeout(timer.current);
    window.clearInterval(timer.current);
  };
  useEffect(() => stop, []);
  // A disabled button gets no pointerup, so reaching the limit must end the repeat by itself.
  useEffect(() => {
    if (disabled) stop();
  }, [disabled]);

  return {
    onPointerDown: (e: PointerEvent) => {
      if (e.button !== 0) return;
      repeated.current = false;
      stop();
      timer.current = window.setTimeout(() => {
        repeated.current = true;
        latest.current();
        timer.current = window.setInterval(() => latest.current(), REPEAT_EVERY_MS);
      }, REPEAT_AFTER_MS);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
    // The click that ends a held press must not add one more step.
    onClick: () => {
      if (repeated.current) repeated.current = false;
      else latest.current();
    },
  };
}

const rangeLabel = ({ value: { minChronoiPerMinute: min, maxChronoiPerMinute: max } }: TempoPreset) =>
  max === null ? `${min}+` : `${min}–${max}`;

interface TempoPanelProps {
  metronome: MetronomeState;
  presets: readonly TempoPreset[];
  onChange: (change: Partial<MetronomeSettings>) => void;
  onChoosePreset: (id: TempoPresetId) => void;
}

/** A Tempo Preset for the usual tempi, the steppers for the exact number, and the grouping of chronoi. */
export function TempoPanel({ metronome, presets, onChange, onChoosePreset }: TempoPanelProps) {
  const { chronoiPerMinute: cpm, grouping } = metronome;
  const slower = useRepeatingStep(() => onChange({ chronoiPerMinute: cpm - 1 }), cpm <= MIN_CHRONOI_PER_MINUTE);
  const faster = useRepeatingStep(() => onChange({ chronoiPerMinute: cpm + 1 }), cpm >= MAX_CHRONOI_PER_MINUTE);
  const byId = new Map(presets.map((p) => [p.id, p]));

  return (
    <>
      <Segmented
        className="tempo-presets"
        optionClassName="tempo-presets__preset"
        options={presets.map((p) => p.id)}
        value={metronome.tempoPreset}
        label={t("metronome.presets")}
        wrap={false}
        optionLabel={(id) => `${t(`tempo.${id}`)}, ${t("metronome.cpm", { n: rangeLabel(byId.get(id)!) })}`}
        render={(id) => (
          <>
            <span>{t(`tempo.short.${id}`)}</span>
            <span className="tempo-presets__range">{rangeLabel(byId.get(id)!)}</span>
          </>
        )}
        onChange={onChoosePreset}
      />

      <div className="transport__row">
        <button
          type="button"
          className="tempo-step"
          aria-label={t("metronome.slower")}
          disabled={cpm <= MIN_CHRONOI_PER_MINUTE}
          {...slower}
        >
          −
        </button>
        <output className="tempo-step__value">{t("metronome.cpm", { n: cpm })}</output>
        <button
          type="button"
          className="tempo-step"
          aria-label={t("metronome.faster")}
          disabled={cpm >= MAX_CHRONOI_PER_MINUTE}
          {...faster}
        >
          +
        </button>
      </div>

      <div className="transport__row">
        <span className="transport__label">{t("metronome.grouping")}</span>
        <Segmented
          className="segmented segmented--grouping"
          options={GROUPINGS}
          value={grouping}
          label={t("metronome.grouping")}
          render={(n) => t("metronome.groupOf", { n })}
          onChange={(g) => onChange({ grouping: g })}
        />
      </div>
    </>
  );
}
