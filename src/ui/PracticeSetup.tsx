import { useId, useState } from "react";
import type { Ladder, PitchState } from "../core/practice/PracticeSession";
import type { ModeVariantKey } from "../core/theory/modeVariants";
import { GENUS_IDS, type AttractionId, type GenusId } from "../core/theory/tuningSystems";
import { noteLabel, t } from "../i18n/translations";
import { LADDER_LAYOUTS, type LadderLayout } from "./Ladder";
import { ModePicker } from "./ModePicker";

interface PracticeSetupProps {
  modeVariant: ModeVariantKey | null;
  ladder: Ladder;
  pitch: PitchState;
  layout: LadderLayout;
  settingsHref: string;
  onChooseModeVariant: (key: ModeVariantKey | null) => void;
  onChangeGenus: (genus: GenusId) => void;
  onToggleAttraction: (id: AttractionId) => void;
  onChangeLayout: (layout: LadderLayout) => void;
}

/**
 * What is being practised, read in one line above the Ladder; tapping it opens the choices. Setup is chosen once
 * per practice, so it stays folded and leaves the screen to the Ladder.
 */
export function PracticeSetup(props: PracticeSetupProps) {
  const { modeVariant, ladder, pitch, layout } = props;
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const activeAttractions = ladder.attractions.filter((a) => a.active).map((a) => t(`attraction.${a.id}`));
  const title = modeVariant
    ? `${t(`mode.${modeVariant.mode}`)} · ${t(`melos.${modeVariant.melos}`)}`
    : t("setup.noMode");
  const details = [t(`genus.${ladder.genus}`), t("setup.ni", { note: noteLabel(pitch.niNote) }), ...activeAttractions];

  return (
    <section className={"setup" + (open ? " is-open" : "")}>
      <button
        type="button"
        className="setup__summary"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        <span className="setup__text">
          <span className="setup__title">{title}</span>
          <span className="setup__details">{details.join(" · ")}</span>
        </span>
        <span className="setup__action">{open ? t("setup.close") : t("setup.change")}</span>
      </button>

      <div id={panelId} className="setup__panel" hidden={!open}>
        <ModePicker choice={modeVariant} onChoose={props.onChooseModeVariant} onLeave={() => props.onChooseModeVariant(null)} />
        {!modeVariant && (
          // The Mode Variant sets the Genus; "No Mode" brings back the Genus buttons.
          <div className="segmented segmented--genus" role="radiogroup" aria-label={t("ladder.genus")}>
            {GENUS_IDS.map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={ladder.genus === id}
                className={ladder.genus === id ? "is-selected" : ""}
                onClick={() => props.onChangeGenus(id)}
              >
                {t(`genus.${id}`)}
              </button>
            ))}
          </div>
        )}
        {ladder.attractions.length > 0 && (
          <div className="setup__row" role="group" aria-label={t("attractions.title")}>
            <span className="setup__label">{t("attractions.title")}</span>
            {ladder.attractions.map((a) => (
              <button
                key={a.id}
                type="button"
                className="setup__toggle"
                aria-pressed={a.active}
                onClick={() => props.onToggleAttraction(a.id)}
              >
                {t(`attraction.${a.id}`)}
              </button>
            ))}
          </div>
        )}
        <div className="setup__row">
          <span className="setup__label">{t("ladder.layout")}</span>
          <div className="segmented segmented--layout" role="radiogroup" aria-label={t("ladder.layout")}>
            {LADDER_LAYOUTS.map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={layout === l}
                className={layout === l ? "is-selected" : ""}
                onClick={() => props.onChangeLayout(l)}
              >
                {t(`layout.${l}`)}
              </button>
            ))}
          </div>
        </div>
        <a className="setup__row setup__link" href={props.settingsHref}>
          <span className="setup__label">{t("settings.referencePitch")}</span>
          <span className="setup__value">{t("ladder.niPitch", { note: noteLabel(pitch.niNote), hz: pitch.niHz.toFixed(2) })}</span>
          <span className="setup__more">{t("setup.change")}</span>
        </a>
        <p className="setup__source">
          {t("ladder.tuning", { name: t(`tuning.${ladder.tuningSystemId}`), moria: ladder.moriaPerOctave })}
          <br />
          {ladder.source}
        </p>
        {ladder.attractions.map((a) => (
          <p key={a.id} className="setup__source">
            {t(`attraction.${a.id}`)}: {a.source}
          </p>
        ))}
      </div>
    </section>
  );
}
