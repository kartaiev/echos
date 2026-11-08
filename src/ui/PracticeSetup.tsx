import { useId, useState } from "react";
import type { Ladder, PitchState } from "../core/practice/PracticeSession";
import type { ModeVariantKey } from "../core/theory/modeVariants";
import { GENUS_IDS, type AttractionId, type GenusId } from "../core/theory/tuningSystems";
import { noteLabel, t } from "../i18n/translations";
import { LADDER_LAYOUTS, type LadderLayout } from "./Ladder";
import { ModePicker } from "./ModePicker";
import { Segmented } from "./Segmented";

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
  /** A Fthora is being placed or is on the Ladder. */
  fthoraActive: boolean;
  onFthora: () => void;
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
      <div className="setup__top">
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
        {/* Placing a Fthora starts here: then a Degree on the Ladder, then the Genus. */}
        <button type="button" className="setup__fthora" aria-pressed={props.fthoraActive} onClick={props.onFthora}>
          {t("fthora.button")}
        </button>
      </div>

      <div id={panelId} className="setup__panel" hidden={!open}>
        <ModePicker choice={modeVariant} onChoose={props.onChooseModeVariant} onLeave={() => props.onChooseModeVariant(null)} />
        {!modeVariant && (
          // The Mode Variant sets the Genus; "No Mode" brings back the Genus buttons.
          <Segmented
            className="segmented segmented--genus"
            options={GENUS_IDS}
            value={ladder.genus}
            label={t("ladder.genus")}
            render={(id) => t(`genus.${id}`)}
            onChange={props.onChangeGenus}
          />
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
          <Segmented
            className="segmented segmented--layout"
            options={LADDER_LAYOUTS}
            value={layout}
            label={t("ladder.layout")}
            render={(l) => t(`layout.${l}`)}
            onChange={props.onChangeLayout}
          />
        </div>
        <a className="setup__row setup__link" href={props.settingsHref}>
          <span className="setup__label">{t("settings.referencePitch")}</span>
          <span className="setup__value">{t("ladder.niPitch", { note: noteLabel(pitch.niNote), hz: pitch.niHz.toFixed(2) })}</span>
          <span className="setup__more">{t("nav.settings")} ›</span>
        </a>
      </div>
    </section>
  );
}
