import { useState } from "react";
import type { Ladder as LadderModel } from "../core/practice/PracticeSession";
import { degreeLabel, t } from "../i18n/translations";

interface LadderProps {
  ladder: LadderModel;
  onPlayDegree: (degreeId: string) => void;
}

/** Vertical Scale ladder: Ni at the bottom, distances in proportion to moria. */
export function Ladder({ ladder, onPlayDegree }: LadderProps) {
  const [lastPlayed, setLastPlayed] = useState<string | null>(null);
  const position = (moria: number) => `${(moria / ladder.totalMoria) * 100}%`;

  return (
    <div className="ladder" role="group" aria-label={t("ladder.label")}>
      <div className="ladder__rail" />
      {ladder.degrees.map((degree) => {
        const label = degreeLabel(degree.name, degree.octave);
        return (
          <div key={degree.id}>
            <button
              type="button"
              className={"ladder__degree" + (lastPlayed === degree.id ? " is-playing" : "")}
              style={{ bottom: position(degree.moria) }}
              aria-label={t("ladder.playDegree", { degree: label })}
              onClick={() => {
                setLastPlayed(degree.id);
                onPlayDegree(degree.id);
              }}
            >
              {label}
            </button>
            {degree.moriaToNext !== null && (
              <span className="ladder__interval" style={{ bottom: position(degree.moria + degree.moriaToNext / 2) }}>
                {degree.moriaToNext}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
