import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { MetronomeSettings, MetronomeState, TempoPreset, TempoPresetId } from "../core/practice/PracticeSession";
import { GROUPINGS, MAX_CHRONOI_PER_MINUTE, MIN_CHRONOI_PER_MINUTE } from "../core/practice/metronomeSettings";
import { t } from "../i18n/translations";

/** The count follows the audio clock: it is re-read every frame, not counted by a timer of its own. */
function useCount(running: boolean, readCount: () => number | null) {
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
  /** Reads the count from the session; called every frame while the metronome runs. */
  readCount: () => number | null;
  tempoOpen: boolean;
  tempoPanelId: string;
  onStart: () => void;
  onStop: () => void;
  onToggleTempo: () => void;
}

/** The metronome in the transport bar: the count, the tempo (which opens the tempo choices), Start and Stop. */
export function MetronomeLane({ metronome, readCount, tempoOpen, tempoPanelId, onStart, onStop, onToggleTempo }: MetronomeLaneProps) {
  const count = useCount(metronome.running, readCount);
  const { chronoiPerMinute: cpm, grouping, tempoPreset } = metronome;

  return (
    <div className={"transport__lane" + (metronome.running ? " is-active" : "")}>
      {/* Read aloud every chronos would drown the singer; the Start and Stop button tells the state. */}
      <span className="metronome-count" aria-hidden="true">
        <span className={"metronome-count__number" + (count === 1 ? " is-accent" : "")}>{count ?? ""}</span>
        <span className="metronome-count__dots">
          {Array.from({ length: grouping }, (_, i) => (
            <span key={i} className={"metronome-count__dot" + (i === 0 ? " is-first" : "") + (count === i + 1 ? " is-on" : "")} />
          ))}
        </span>
      </span>
      <button
        type="button"
        className="transport__more transport__tempo"
        aria-expanded={tempoOpen}
        aria-controls={tempoPanelId}
        onClick={onToggleTempo}
      >
        <span className="transport__tempo-value">{t("metronome.cpm", { n: cpm })}</span>
        <span className="transport__tempo-name">{tempoPreset ? t(`tempo.short.${tempoPreset}`) : t("metronome.tempo")}</span>
      </button>
      <button
        type="button"
        className="transport__action"
        aria-pressed={metronome.running}
        aria-label={`${t("metronome.title")}: ${metronome.running ? t("metronome.stop") : t("metronome.start")}`}
        onClick={metronome.running ? onStop : onStart}
      >
        {metronome.running ? t("metronome.stop") : t("metronome.start")}
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

  return (
    <>
      <div
        className="tempo-presets"
        role="radiogroup"
        aria-label={t("metronome.presets")}
        title={presets[0] && t("metronome.presetsSource", { source: presets[0].source })}
      >
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            role="radio"
            aria-checked={metronome.tempoPreset === preset.id}
            aria-label={`${t(`tempo.${preset.id}`)}, ${t("metronome.cpm", { n: rangeLabel(preset) })}`}
            className={"tempo-presets__preset" + (metronome.tempoPreset === preset.id ? " is-selected" : "")}
            onClick={() => onChoosePreset(preset.id)}
          >
            <span>{t(`tempo.short.${preset.id}`)}</span>
            <span className="tempo-presets__range">{rangeLabel(preset)}</span>
          </button>
        ))}
      </div>

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
        <div className="segmented segmented--grouping" role="radiogroup" aria-label={t("metronome.grouping")}>
          {GROUPINGS.map((g) => (
            <button
              key={g}
              type="button"
              role="radio"
              aria-checked={grouping === g}
              className={grouping === g ? "is-selected" : ""}
              onClick={() => onChange({ grouping: g })}
            >
              {t("metronome.groupOf", { n: g })}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
