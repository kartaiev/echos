import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { Ladder as LadderModel } from "../core/practice/PracticeSession";
import { degreeLabel, t } from "../i18n/translations";
import { martyriaGlyphs } from "./martyriaGlyphs";

/** How long a Degree must be held to count as a long press instead of a tap. */
const LONG_PRESS_MS = 500;
/** A finger that slides further than this is not holding the Degree. */
const MOVE_TOLERANCE_PX = 10;
/**
 * The horizontal keyboard is never narrower than this many pixels per moria, so that Degrees on the same side
 * (at least 16 moria apart in the current tables) leave room for a key with its "Dominant" mark. Where the
 * screen is narrower, the keyboard scrolls inside its own strip.
 */
const MIN_PX_PER_MORIA = 4.6;
/** Room at both ends of the keyboard for half a key. */
const KEYBOARD_PAD_PX = 40;
/** The ring that answers a tap; it fades on its own, so it never stays on the last Degree like a state. */
const STRIKE_MS = 650;

/** A ring that grows out of the key and fades: the Degree was struck, nothing more. */
function strike(key: HTMLElement) {
  const style = getComputedStyle(key);
  const ink = style.getPropertyValue("--cinnabar").trim();
  const soft = style.getPropertyValue("--cinnabar-soft").trim();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    key.animate([{ backgroundColor: soft }, {}], { duration: STRIKE_MS / 2 });
    return;
  }
  key.animate(
    [
      { outline: `3px solid ${ink}`, outlineOffset: "0px", backgroundColor: soft },
      { outline: "3px solid transparent", outlineOffset: "10px" },
    ],
    { duration: STRIKE_MS, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
  );
}

/** Vertical like a Parallage chart, or horizontal like a keyboard. */
export const LADDER_LAYOUTS = ["vertical", "horizontal"] as const;
export type LadderLayout = (typeof LADDER_LAYOUTS)[number];

interface LadderProps {
  ladder: LadderModel;
  layout: LadderLayout;
  isonDegreeId: string | null;
  onPlayDegree: (degreeId: string) => void;
  onLongPress: (degreeId: string) => void;
}

/**
 * The Scale ladder, distances in proportion to moria: vertical with the lowest Degree at the bottom, or
 * horizontal with the lowest on the left. Degrees alternate on both sides of the rail so that small intervals
 * (4 moria) still leave room to tap. A tap plays a Degree; a long press is reported separately (it sets or
 * stops the Ison).
 */
export function Ladder({ ladder, layout, isonDegreeId, onPlayDegree, onLongPress }: LadderProps) {
  // One Degree is in the Tab order; the arrow keys move between them.
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const press = useRef<{ timer: number; x: number; y: number; longPressed: boolean } | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  const { lowestMoria, highestMoria } = ladder.drawingRange;
  const horizontal = layout === "horizontal";
  const position = (moria: number): CSSProperties => {
    const share = (moria - lowestMoria) / (highestMoria - lowestMoria);
    return horizontal
      ? { left: `calc(${KEYBOARD_PAD_PX}px + (100% - ${2 * KEYBOARD_PAD_PX}px) * ${share})` }
      : { bottom: `${share * 100}%` };
  };
  const keyboardWidth = (highestMoria - lowestMoria) * MIN_PX_PER_MORIA + 2 * KEYBOARD_PAD_PX;

  // A keyboard wider than the screen opens on the Ison, else the Base, else Ni.
  const focusId = isonDegreeId ?? ladder.degrees.find((d) => d.isBase)?.id ?? "Ni";
  const tabbableId = ladder.degrees.some((d) => d.id === focusedId) ? focusedId : focusId;
  useLayoutEffect(() => {
    const scroller = strip.current;
    if (!horizontal || !scroller) return;
    const key = scroller.querySelector<HTMLElement>(`[data-degree="${CSS.escape(focusId)}"]`);
    if (!key) return;
    // Keys are centred on their position by a transform, which offsetLeft leaves out.
    const keyCentre = key.offsetLeft;
    const visible = keyCentre - scroller.scrollLeft;
    if (visible < 60 || visible > scroller.clientWidth - 60) scroller.scrollLeft = keyCentre - scroller.clientWidth / 2;
  }, [horizontal, focusId]);

  function startPress(degreeId: string, x: number, y: number) {
    cancelPress();
    const current = {
      x,
      y,
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

  /** The click that ends a long press arrives right after this; forget the press once it has been handled. */
  function endPress() {
    cancelPress();
    window.setTimeout(() => (press.current = null), 0);
  }

  function movePress(x: number, y: number) {
    if (press.current && Math.hypot(x - press.current.x, y - press.current.y) > MOVE_TOLERANCE_PX) cancelPress();
  }

  /** Up and Right go to the next higher Degree, Down and Left to the next lower; Home and End to the ends. */
  function moveFocus(e: KeyboardEvent) {
    const ids = ladder.degrees.map((d) => d.id);
    const from = ids.indexOf((e.target as HTMLElement).dataset.degree ?? "");
    if (from < 0) return;
    const to = { ArrowUp: from + 1, ArrowRight: from + 1, ArrowDown: from - 1, ArrowLeft: from - 1, Home: 0, End: ids.length - 1 }[
      e.key
    ];
    if (to === undefined) return;
    e.preventDefault();
    const id = ids[Math.max(0, Math.min(ids.length - 1, to))];
    if (id === undefined) return;
    setFocusedId(id);
    strip.current?.querySelector<HTMLElement>(`[data-degree="${CSS.escape(id)}"]`)?.focus();
  }

  function click(degreeId: string, key: HTMLElement) {
    // The click that ends a long press must not also play the Degree.
    if (press.current?.longPressed) {
      press.current = null;
      return;
    }
    cancelPress();
    press.current = null;
    setFocusedId(degreeId);
    strike(key);
    onPlayDegree(degreeId);
  }

  return (
    <div ref={strip} className={`ladder-strip ladder-strip--${layout}`}>
      <div
        className={`ladder ladder--${layout}`}
        role="group"
        aria-label={t("ladder.label")}
        onKeyDown={moveFocus}
        style={horizontal ? { minWidth: keyboardWidth } : undefined}
      >
        <div className="ladder__rail" />
        {ladder.degrees.map((degree, index) => {
          const label = degreeLabel(degree.name, degree.octave);
          const martyria = martyriaGlyphs(degree.name, degree.martyria);
          const isIson = degree.id === isonDegreeId;
          // Base outranks Dominant: the Base is often listed among the Dominant Degrees too.
          const marks = [
            degree.isBase ? t("ladder.baseMark") : degree.isDominant ? t("ladder.dominantMark") : null,
            degree.attraction === null ? null : degree.attraction < 0 ? t("ladder.loweredMark") : t("ladder.raisedMark"),
          ].filter((m): m is string => m !== null);
          // The Ison key is filled, so its mark is only read aloud.
          const spoken = isIson ? [...marks, t("ladder.isonMark")] : marks;
          const classes = [
            "ladder__degree",
            horizontal ? (index % 2 === 0 ? "is-below" : "is-above") : index % 2 === 0 ? "is-left" : "is-right",
            degree.isDominant && "is-dominant",
            degree.isBase && "is-base",
            isIson && "is-ison",
            degree.attraction !== null && "is-attracted",
          ];
          return (
            <div key={degree.id}>
              <button
                type="button"
                className={classes.filter(Boolean).join(" ")}
                style={position(degree.moria)}
                data-degree={degree.id}
                tabIndex={degree.id === tabbableId ? 0 : -1}
                aria-label={[t("ladder.playDegree", { degree: label }), ...spoken].join(", ")}
                onPointerDown={(e) => e.button === 0 && startPress(degree.id, e.clientX, e.clientY)}
                onPointerMove={(e) => movePress(e.clientX, e.clientY)}
                onPointerUp={endPress}
                onPointerLeave={endPress}
                onPointerCancel={endPress}
                onContextMenu={(e) => e.preventDefault()}
                onClick={(e) => click(degree.id, e.currentTarget)}
              >
                <span className="ladder__martyria" aria-hidden="true">
                  {martyria.letterAndSign}
                  {martyria.fthora && <span className="ladder__fthora">{martyria.fthora}</span>}
                </span>
                <span className="ladder__text">
                  <span className="ladder__name">{label}</span>
                  {marks.map((mark) => (
                    <span key={mark} className="ladder__marks">
                      {mark}
                    </span>
                  ))}
                </span>
              </button>
              {degree.moriaToNext !== null && (
                <span className="ladder__interval" style={position(degree.moria + degree.moriaToNext / 2)}>
                  {degree.moriaToNext}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
