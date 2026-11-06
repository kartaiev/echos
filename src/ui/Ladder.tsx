import { useRef, useState } from "react";
import type { Ladder as LadderModel } from "../core/practice/PracticeSession";
import { degreeLabel, t } from "../i18n/translations";

/** How long a Degree must be held to set the Ison instead of playing it. */
const LONG_PRESS_MS = 500;

interface LadderProps {
  ladder: LadderModel;
  isonDegreeId: string | null;
  onPlayDegree: (degreeId: string) => void;
  /** Sets the Ison, or stops it when held on the Degree it already holds. */
  onLongPress: (degreeId: string) => void;
}

/**
 * Vertical Scale ladder, lowest Degree at the bottom, distances in proportion to moria.
 * Degrees alternate left and right of the rail so that small intervals (4 moria) still leave room to tap.
 * A tap plays a Degree; a long press sets the Ison on it, or stops the Ison held there.
 */
export function Ladder({ ladder, isonDegreeId, onPlayDegree, onLongPress }: LadderProps) {
  const [lastPlayed, setLastPlayed] = useState<string | null>(null);
  const press = useRef<{ timer: number; longPressed: boolean } | null>(null);
  const { lowestMoria, highestMoria } = ladder.drawingRange;
  const position = (moria: number) => `${((moria - lowestMoria) / (highestMoria - lowestMoria)) * 100}%`;

  function startPress(degreeId: string) {
    cancelPress();
    const current = {
      longPressed: false,
      timer: window.setTimeout(() => {
        current.longPressed = true;
        navigator.vibrate?.(15);
        onLongPress(degreeId);
      }, LONG_PRESS_MS),
    };
    press.current = current;
  }

  function cancelPress() {
    if (press.current) window.clearTimeout(press.current.timer);
  }

  function click(degreeId: string) {
    // The click that ends a long press must not also play the Degree.
    if (press.current?.longPressed) {
      press.current = null;
      return;
    }
    cancelPress();
    press.current = null;
    setLastPlayed(degreeId);
    onPlayDegree(degreeId);
  }

  return (
    <div className="ladder" role="group" aria-label={t("ladder.label")}>
      <div className="ladder__rail" />
      {ladder.degrees.map((degree, index) => {
        const label = degreeLabel(degree.name, degree.octave);
        const isIson = degree.id === isonDegreeId;
        const classes = [
          "ladder__degree",
          index % 2 === 0 ? "is-left" : "is-right",
          lastPlayed === degree.id && "is-playing",
          isIson && "is-ison",
        ];
        return (
          <div key={degree.id}>
            <button
              type="button"
              className={classes.filter(Boolean).join(" ")}
              style={{ bottom: position(degree.moria) }}
              aria-label={t(isIson ? "ladder.playIsonDegree" : "ladder.playDegree", { degree: label })}
              onPointerDown={(e) => e.button === 0 && startPress(degree.id)}
              onPointerUp={cancelPress}
              onPointerLeave={cancelPress}
              onPointerCancel={cancelPress}
              onContextMenu={(e) => e.preventDefault()}
              onClick={() => click(degree.id)}
            >
              {label}
              {isIson && <span className="ladder__ison-mark">{t("ladder.isonMark")}</span>}
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
