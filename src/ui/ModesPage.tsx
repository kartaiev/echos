import { useEffect, useRef, useState } from "react";
import type { CadenceKind, ModeVariantDescription, PlayedIntonation } from "../core/practice/PracticeSession";
import { MELOS_IDS, MODE_IDS, type ModeVariantKey } from "../core/theory/modeVariants";
import type { DegreePosition } from "../core/theory/scale";
import { degreeLabel, t } from "../i18n/translations";

interface ModesPageProps {
  describe: (key: ModeVariantKey) => ModeVariantDescription;
  onPlayIntonation: (key: ModeVariantKey) => PlayedIntonation | null;
  onPractise: (key: ModeVariantKey) => void;
}

const label = ({ name, octave }: DegreePosition) => degreeLabel(name, octave);
const Missing = () => <span className="mode-card__missing">{t("modes.noSource")}</span>;
const keyOf = ({ mode, melos }: ModeVariantKey) => `${mode}/${melos}`;

/** A card for every Mode Variant: its theory, its Intonation, and the way to practise it. */
export function ModesPage({ describe, onPlayIntonation, onPractise }: ModesPageProps) {
  // The card whose Intonation is sounding; its text is highlighted until the Intonation ends.
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function playIntonation(key: ModeVariantKey) {
    const played = onPlayIntonation(key);
    if (!played) return;
    window.clearTimeout(timer.current);
    setPlayingKey(keyOf(key));
    timer.current = window.setTimeout(() => setPlayingKey(null), played.durationMs);
  }

  return (
    <section className="modes">
      <h2>{t("modes.title")}</h2>
      {MODE_IDS.map((mode) => (
        <article key={mode} className="mode-card">
          <h3>{t(`mode.${mode}`)}</h3>
          {MELOS_IDS.map((melos) => {
            const key = { mode, melos };
            const variant = describe(key);
            const cadencesOf = (kind: CadenceKind) =>
              variant.cadences.value.filter((c) => c.kind === kind).map((c) => label(c.degree));
            const isPlaying = playingKey === keyOf(key);
            return (
              <div key={melos} className="mode-card__variant">
                <h4>{t(`melos.${melos}`)}</h4>
                <dl>
                  <dt>{t("modes.genus")}</dt>
                  <dd>{t(`genus.${variant.genus}`)}</dd>
                  <dt>{t("modes.base")}</dt>
                  <dd>{label(variant.base)}</dd>
                  <dt>{t("modes.dominants")}</dt>
                  <dd>{variant.dominants.map(label).join(", ")}</dd>
                  <dt>{t("modes.cadences")}</dt>
                  <dd title={variant.cadences.source}>
                    {(["complete", "incomplete"] as const).map((kind) =>
                      cadencesOf(kind).length > 0 ? (
                        <span key={kind} className="mode-card__cadence">
                          {t(`modes.cadence.${kind}`, { degrees: cadencesOf(kind).join(", ") })}
                        </span>
                      ) : null,
                    )}
                  </dd>
                  <dt>{t("modes.intonation")}</dt>
                  <dd>
                    {variant.intonation ? (
                      <span className={"mode-card__intonation" + (isPlaying ? " is-playing" : "")}>
                        {variant.intonation.text}
                      </span>
                    ) : (
                      <Missing />
                    )}
                  </dd>
                </dl>
                <div className="mode-card__actions">
                  {variant.intonation && (
                    <button type="button" className="secondary-button" onClick={() => playIntonation(key)}>
                      {t("modes.playIntonation")}
                    </button>
                  )}
                  <button type="button" className="primary-button" onClick={() => onPractise(key)}>
                    {t("modes.practise")}
                  </button>
                </div>
                <p className="mode-card__source">{variant.source}</p>
              </div>
            );
          })}
        </article>
      ))}
    </section>
  );
}
