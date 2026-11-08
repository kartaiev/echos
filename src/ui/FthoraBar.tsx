import type { FthoraGenus, FthoraSign, FthoraState, LadderDegree } from "../core/practice/PracticeSession";
import { degreeLabel, t } from "../i18n/translations";
import { fthoraGlyph } from "./martyriaGlyphs";
import { Segmented } from "./Segmented";

/** Where the student is in placing a Fthora: picking the Degree, then the Genus for it. */
export type FthoraPlacing = { step: "degree" } | { step: "genus"; degreeId: string };

interface FthoraBarProps {
  placing: FthoraPlacing | null;
  fthora: FthoraState | null;
  degrees: readonly LadderDegree[];
  choices: readonly { genus: FthoraGenus; sign: FthoraSign }[];
  onChooseGenus: (genus: FthoraGenus) => void;
  onCancel: () => void;
  onShow: (shown: boolean) => void;
  onRemove: () => void;
}

const COMPARE = ["before", "after"] as const;

/**
 * The line above the Ladder for the Fthora: what to tap while placing one, the Genera to choose from with the sign
 * each would draw, and once placed, the Fthora itself with Before and After to compare the two Scales.
 */
export function FthoraBar({ placing, fthora, degrees, choices, onChooseGenus, onCancel, onShow, onRemove }: FthoraBarProps) {
  const labelOf = (id: string) => {
    const d = degrees.find((x) => x.id === id);
    return d ? degreeLabel(d.name, d.octave) : id;
  };

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
        <div className="fthora-bar__choices">
          {choices.map(({ genus, sign }) => (
            <button key={genus} type="button" className="fthora-bar__choice" onClick={() => onChooseGenus(genus)}>
              <span className="fthora-sign" aria-hidden="true">
                {fthoraGlyph(sign)}
              </span>
              <span>{t(`genus.${genus}`)}</span>
            </button>
          ))}
        </div>
        <button type="button" className="fthora-bar__action" onClick={onCancel}>
          {t("fthora.cancel")}
        </button>
      </div>
    );
  }

  if (!fthora) return null;
  return (
    <div className="fthora-bar" role="group" aria-label={t("fthora.mark")}>
      <span className="fthora-bar__status">
        <span className="fthora-sign" aria-hidden="true">
          {fthoraGlyph(fthora.sign)}
        </span>
        <span>{t("fthora.status", { genus: t(`genus.${fthora.genus}`), degree: labelOf(fthora.degreeId) })}</span>
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
