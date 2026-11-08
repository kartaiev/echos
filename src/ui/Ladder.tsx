import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { Ladder as LadderModel } from "../core/practice/PracticeSession";
import { degreeLabel, t } from "../i18n/translations";
import { fthoraGlyph, martyriaGlyphs } from "./martyriaGlyphs";

/** How long a Degree must be held to count as a long press instead of a tap; the hold ring in styles.css matches it. */
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
  /** The chronos the metronome is on (1 is the accent), or null while it is stopped; the rail pulses with it. */
  beat: number | null;
  /** Length of a chronos, so a pulse fades before the next one. */
  chronosMs: number;
  onPlayDegree: (degreeId: string) => void;
  onLongPress: (degreeId: string) => void;
  /** Space on a Degree: the metronome's key everywhere on the practice view, here too. */
  onSpace: () => void;
  /** While a Fthora is being placed, a tap picks its Degree instead of playing it. */
  choosing: boolean;
  onChoose: (degreeId: string) => void;
}

/**
 * The Scale ladder, distances in proportion to moria: vertical with the lowest Degree at the bottom, or
 * horizontal with the lowest on the left. Degrees alternate on both sides of the rail so that small intervals
 * (4 moria) still leave room to tap. A tap plays a Degree; a long press is reported separately (it sets or
 * stops the Ison).
 */
export function Ladder(props: LadderProps) {
  const { ladder, layout, isonDegreeId, beat, chronosMs, onPlayDegree, onLongPress, onSpace, choosing, onChoose } = props;
  // The Degree being held: a ring closes in on it while the long press counts down.
  const [holdingId, setHoldingId] = useState<string | null>(null);
  const hintId = useId();
  // One Degree is in the Tab order; the arrow keys move between them.
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const press = useRef<{ timer: number; x: number; y: number; longPressed: boolean } | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const pulse = useRef<HTMLDivElement>(null);
  const { lowestMoria, highestMoria } = ladder.drawingRange;
  const horizontal = layout === "horizontal";
  const position = (moria: number): CSSProperties => {
    const share = (moria - lowestMoria) / (highestMoria - lowestMoria);
    return horizontal
      ? { left: `calc(${KEYBOARD_PAD_PX}px + (100% - ${2 * KEYBOARD_PAD_PX}px) * ${share})` }
      : { bottom: `${share * 100}%` };
  };
  const keyboardWidth = (highestMoria - lowestMoria) * MIN_PX_PER_MORIA + 2 * KEYBOARD_PAD_PX;

  /*
   * The metronome is seen where the eyes already are: with each chronos a wide band flashes along the rail and the
   * rail itself darkens, both fading before the next chronos. The accent is cinnabar and stronger, so the group
   * can be followed from the corner of the eye.
   */
  useEffect(() => {
    if (beat === null || !rail.current || !pulse.current) return;
    const accent = beat === 1;
    const style = getComputedStyle(rail.current);
    const color = style.getPropertyValue(accent ? "--cinnabar" : "--text").trim();
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrow = horizontal ? "scaleY(0.3)" : "scaleX(0.3)";
    const timing = { duration: Math.min(chronosMs * 0.75, 550), easing: "cubic-bezier(0.16, 1, 0.3, 1)" };
    pulse.current.animate(
      [
        { backgroundColor: color, opacity: accent ? 0.45 : 0.22, transform: "none" },
        { backgroundColor: color, opacity: 0, transform: still ? "none" : narrow },
      ],
      timing,
    );
    rail.current.animate([{ backgroundColor: color }, {}], timing);
  }, [beat, chronosMs, horizontal]);

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
        setHoldingId(null);
        navigator.vibrate?.(15);
        onLongPress(degreeId);
      }, LONG_PRESS_MS),
    };
    press.current = current;
    setHoldingId(degreeId);
  }

  function cancelPress() {
    if (press.current) window.clearTimeout(press.current.timer);
    setHoldingId(null);
  }

  /** The click that ends a long press arrives right after this; forget the press once it has been handled. */
  function endPress() {
    cancelPress();
    window.setTimeout(() => (press.current = null), 0);
  }

  function movePress(x: number, y: number) {
    if (press.current && Math.hypot(x - press.current.x, y - press.current.y) > MOVE_TOLERANCE_PX) cancelPress();
  }

  /**
   * Up and Right go to the next higher Degree, Down and Left to the next lower; Home and End to the ends. I sets or
   * stops the Ison on the Degree with the focus, as holding it does. Enter plays the Degree; Space is the
   * metronome's, as on the rest of the practice view.
   */
  function onKeys(e: KeyboardEvent) {
    const ids = ladder.degrees.map((d) => d.id);
    const from = ids.indexOf((e.target as HTMLElement).dataset.degree ?? "");
    if (from < 0) return;
    if (e.key === " ") {
      e.preventDefault();
      if (!e.repeat) onSpace();
      return;
    }
    if (e.code === "KeyI" && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      onLongPress(ids[from]!);
      return;
    }
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
    if (choosing) onChoose(degreeId);
    else onPlayDegree(degreeId);
  }

  return (
    <div ref={strip} className={`ladder-strip ladder-strip--${layout}`}>
      <div
        className={`ladder ladder--${layout}`}
        role="group"
        aria-label={t("ladder.label")}
        aria-describedby={hintId}
        onKeyDown={onKeys}
        // A button plays on the release of Space; the key belongs to the metronome here.
        onKeyUp={(e) => e.key === " " && e.preventDefault()}
        style={{
          ...(horizontal ? { minWidth: keyboardWidth } : {}),
          // The keys are sized to the closest pair on one side, which depends on how many moria the ladder spans.
          ["--moria-span" as string]: highestMoria - lowestMoria,
        }}
      >
        {/* How to play it, for those who cannot see the rings: a tap plays, a hold sets the Ison. */}
        <p id={hintId} className="visually-hidden">
          {t("ladder.hint")} {t("ladder.keysHint")}
        </p>
        <div ref={pulse} className="ladder__pulse" aria-hidden="true" />
        <div ref={rail} className="ladder__rail" />
        {ladder.degrees.map((degree, index) => {
          // Spoken with a word for the octave: screen readers say "͵" and "′" unpredictably.
          const spokenName =
            t(`degree.${degree.name}`) +
            (degree.octave < 0 ? ` ${t("degree.low")}` : degree.octave > 0 ? ` ${t("degree.high")}` : "");
          const martyria = martyriaGlyphs(degree.name, degree.martyria);
          const isIson = degree.id === isonDegreeId;
          // Base outranks Dominant: the Base is often listed among the Dominant Degrees too.
          const marks = [
            degree.isBase ? t("ladder.baseMark") : degree.isDominant ? t("ladder.dominantMark") : null,
            degree.attraction === null ? null : degree.attraction < 0 ? t("ladder.loweredMark") : t("ladder.raisedMark"),
          ].filter((m): m is string => m !== null);
          const isPivot = ladder.fthora?.shown === true && ladder.fthora.degreeId === degree.id;
          // The Ison key is filled, so its mark is only read aloud; so is the Fthora, drawn as its sign.
          const spoken = [...marks, ...(isIson ? [t("ladder.isonMark")] : []), ...(isPivot ? [t("fthora.mark")] : [])];
          const side = horizontal ? (index % 2 === 0 ? "is-below" : "is-above") : index % 2 === 0 ? "is-left" : "is-right";
          const classes = [
            "ladder__degree",
            side,
            degree.isDominant && "is-dominant",
            holdingId === degree.id && "is-holding",
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
                aria-label={[t("ladder.playDegree", { degree: spokenName }), ...spoken].join(", ")}
                aria-keyshortcuts="I"
                onPointerDown={(e) => e.button === 0 && !choosing && startPress(degree.id, e.clientX, e.clientY)}
                onPointerMove={(e) => movePress(e.clientX, e.clientY)}
                onPointerUp={endPress}
                onPointerLeave={endPress}
                onPointerCancel={endPress}
                onContextMenu={(e) => e.preventDefault()}
                onClick={(e) => click(degree.id, e.currentTarget)}
              >
                {isPivot && (
                  <span className="ladder__fthora-sign fthora-sign" aria-hidden="true">
                    {fthoraGlyph(ladder.fthora!.sign)}
                  </span>
                )}
                <span className="ladder__martyria" aria-hidden="true">
                  {martyria.letterAndSign}
                  {martyria.fthora && <span className="ladder__fthora">{martyria.fthora}</span>}
                </span>
                <span className="ladder__text">
                  <span className="ladder__name">{degreeLabel(degree.name, degree.octave)}</span>
                  {marks.map((mark) => (
                    <span key={mark} className="ladder__marks">
                      {mark}
                    </span>
                  ))}
                </span>
              </button>
              {/* Where the Degree was before the Fthora: a dashed stub on its side of the rail. */}
              {degree.before !== null && (
                <span className={`ladder__ghost ${side}`} style={position(degree.before)} aria-hidden="true" />
              )}
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
