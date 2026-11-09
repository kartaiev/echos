import type { FthoraChoice, FthoraSign, FthoraState, LadderDegree } from "../core/practice/PracticeSession";
import type { DegreeName } from "../core/theory/tuningSystems";
import { degreeLabel, t } from "../i18n/translations";
import { fthoraGlyph } from "./martyriaGlyphs";
import { Segmented } from "./Segmented";

/** Where the student is in placing a Fthora: picking the Degree, then the Genus for it. */
export type FthoraPlacing = { step: "degree" } | { step: "genus"; degreeId: string };

interface FthoraBarProps {
  placing: FthoraPlacing | null;
  fthora: FthoraState | null;
  degrees: readonly LadderDegree[];
  choices: readonly FthoraChoice[];
  onChoose: (sign: FthoraSign) => void;
  onCancel: () => void;
  onShow: (shown: boolean) => void;
  onRemove: () => void;
}

const COMPARE = ["before", "after"] as const;

/** A Degree's id ("Ni'", "Ke,") read back into its name and octave, for a key that may now carry another name. */
function labelOfId(id: string) {
  const octave = (id.match(/'/g)?.length ?? 0) - (id.match(/,/g)?.length ?? 0);
  return degreeLabel(id.replace(/[',]/g, "") as DegreeName, octave);
}

/**
 * The line above the Ladder for the Fthora: what to tap while placing one, the Fthores to choose from with their
 * signs (a Diatonic one for each Degree the key can become, then the Chromatic Genera), and once placed, the last
 * Fthora with Before and After to compare the Scales before and after it.
 */
export function FthoraBar({ placing, fthora, degrees, choices, onChoose, onCancel, onShow, onRemove }: FthoraBarProps) {
  const labelOf = (id: string) => {
    const d = degrees.find((x) => x.id === id);
    return d ? degreeLabel(d.name, d.octave) : labelOfId(id);
  };
  const diatonic = choices.filter((c) => c.genus === "diatonic");
  const chromatic = choices.filter((c) => c.genus !== "diatonic");

  if (placing?.step === "degree") {
    return (
      <div className="fthora-bar" role="status">
        <span className="fthora-bar__text">{t("fthora.choose")}</span>
        <button type="button" className="fthora-bar__action" onClick={onCancel}>
          {t("fthora.cancel")}
        </button>
      </div>
    );
  }

  if (placing?.step === "genus") {
    return (
      <div className="fthora-bar fthora-bar--choose" role="group" aria-label={t("fthora.chooseGenus", { degree: labelOf(placing.degreeId) })}>
        <span className="fthora-bar__text">{t("fthora.chooseGenus", { degree: labelOf(placing.degreeId) })}</span>
        <div className="fthora-bar__groups">
          <div className="fthora-bar__group" role="group" aria-label={t("genus.diatonic")}>
            <span className="fthora-bar__group-label" aria-hidden="true">
              {t("genus.diatonic")}
            </span>
            <div className="fthora-bar__choices fthora-bar__choices--degrees">
              {diatonic.map(({ degree, sign }) => (
                <button key={sign} type="button" className="fthora-bar__choice" onClick={() => onChoose(sign)}>
                  <span className="fthora-sign" aria-hidden="true">
                    {fthoraGlyph(sign)}
                  </span>
                  <span>{t(`degree.${degree}`)}</span>
                </button>
              ))}
            </div>
          </div>
          {chromatic.length > 0 && (
            <div className="fthora-bar__choices">
              {chromatic.map(({ genus, sign }) => (
                <button key={sign} type="button" className="fthora-bar__choice" onClick={() => onChoose(sign)}>
                  <span className="fthora-sign" aria-hidden="true">
                    {fthoraGlyph(sign)}
                  </span>
                  <span>{t(`genus.${genus}`)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" className="fthora-bar__action" onClick={onCancel}>
          {t("fthora.cancel")}
        </button>
      </div>
    );
  }

  if (!fthora) return null;
  const pivot = degrees.find((d) => d.id === fthora.degreeId);
  const renamed = pivot !== undefined && fthora.degreeId !== fthora.placedOn;
  const status = renamed
    ? t("fthora.statusRenamed", { genus: t(`genus.${fthora.genus}`), name: t(`degree.${pivot.name}`), degree: labelOf(fthora.placedOn) })
    : t("fthora.status", { genus: t(`genus.${fthora.genus}`), degree: labelOf(fthora.placedOn) });
  return (
    <div className="fthora-bar" role="group" aria-label={t("fthora.mark")}>
      <span className="fthora-bar__status">
        <span className="fthora-sign" aria-hidden="true">
          {fthoraGlyph(fthora.sign)}
        </span>
        <span>{status}</span>
      </span>
      <Segmented
        className="segmented segmented--compare"
        options={COMPARE}
        value={fthora.shown ? "after" : "before"}
        label={t("fthora.compare")}
        wrap={false}
        render={(o) => t(`fthora.${o}`)}
        onChange={(o) => onShow(o === "after")}
      />
      <button type="button" className="fthora-bar__action" onClick={onRemove}>
        {t("fthora.remove")}
      </button>
    </div>
  );
}
