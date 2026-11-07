import { useEffect, useState } from "react";
import type { MetronomeSettings, MetronomeState, TempoPreset, TempoPresetId } from "../core/practice/PracticeSession";
import { GROUPINGS, MAX_CHRONOI_PER_MINUTE, MIN_CHRONOI_PER_MINUTE } from "../core/practice/metronomeSettings";
import { t } from "../i18n/translations";

interface MetronomePanelProps {
  metronome: MetronomeState;
  presets: readonly TempoPreset[];
  /** Reads the count from the session; called every frame while the metronome runs. */
  readCount: () => number | null;
  onStart: () => void;
  onStop: () => void;
  onChange: (change: Partial<MetronomeSettings>) => void;
  onChoosePreset: (id: TempoPresetId) => void;
}

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

const rangeLabel = ({ value: { minChronoiPerMinute: min, maxChronoiPerMinute: max } }: TempoPreset) =>
  max === null ? `${min}+` : `${min}–${max}`;

export function MetronomePanel({ metronome, presets, readCount, onStart, onStop, onChange, onChoosePreset }: MetronomePanelProps) {
  const count = useCount(metronome.running, readCount);
  const { chronoiPerMinute: cpm, grouping } = metronome;

  return (
    <section className={"metronome" + (metronome.running ? " is-running" : "")} aria-label={t("metronome.title")}>
      <div className="metronome__row">
        <span className="metronome__title">{t("metronome.title")}</span>
        <output className="metronome__cpm">{t("metronome.cpm", { n: cpm })}</output>
        <button
          type="button"
          className="metronome__toggle"
          aria-pressed={metronome.running}
          onClick={metronome.running ? onStop : onStart}
        >
          {metronome.running ? t("metronome.stop") : t("metronome.start")}
        </button>
      </div>

      <div
        className="metronome__count"
        role="img"
        aria-label={count === null ? t("metronome.title") : t("metronome.count", { count, grouping })}
      >
        <span className={"metronome__number" + (count === 1 ? " is-accent" : "")}>{count ?? "·"}</span>
        <span className="metronome__dots" aria-hidden="true">
          {Array.from({ length: grouping }, (_, i) => (
            <span key={i} className={"metronome__dot" + (i === 0 ? " is-first" : "") + (count === i + 1 ? " is-on" : "")} />
          ))}
        </span>
      </div>

      <div className="metronome__row">
        <button
          type="button"
          className="metronome__step"
          aria-label={t("metronome.slower")}
          disabled={cpm <= MIN_CHRONOI_PER_MINUTE}
          onClick={() => onChange({ chronoiPerMinute: cpm - 1 })}
        >
          −
        </button>
        <input
          className="metronome__tempo"
          type="range"
          min={MIN_CHRONOI_PER_MINUTE}
          max={MAX_CHRONOI_PER_MINUTE}
          step={1}
          value={cpm}
          aria-label={t("metronome.tempo")}
          aria-valuetext={t("metronome.cpm", { n: cpm })}
          onChange={(e) => onChange({ chronoiPerMinute: Number(e.target.value) })}
        />
        <button
          type="button"
          className="metronome__step"
          aria-label={t("metronome.faster")}
          disabled={cpm >= MAX_CHRONOI_PER_MINUTE}
          onClick={() => onChange({ chronoiPerMinute: cpm + 1 })}
        >
          +
        </button>
      </div>

      <div
        className="metronome__presets"
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
            className={"metronome__preset" + (metronome.tempoPreset === preset.id ? " is-selected" : "")}
            onClick={() => onChoosePreset(preset.id)}
          >
            <span>{t(`tempo.${preset.id}`)}</span>
            <span className="metronome__range">{rangeLabel(preset)}</span>
          </button>
        ))}
      </div>

      <div className="metronome__row">
        <span className="metronome__label">{t("metronome.grouping")}</span>
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
    </section>
  );
}
