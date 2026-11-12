import type { AttractionTurn } from "../core/theory/attractionRules";
import type { PathStep } from "../core/cards/decks";
import { degreeLabel, t } from "../i18n/translations";

/** Pixels a moria, so the unequal steps of the Scale show as on the Ladder. */
const PX_PER_MORIA = 3.4;
const STEP_X = 40;
const LABEL_W = 36;
const PAD_Y = 14;
/** How far a moved Degree is drawn off its place: the picture shows which way it goes, not by how much. */
const MOVE_PX = 12;
const DOT_R = 4;
const ASKED_R = 5.5;
const ARROW_LENGTH = 7;
const ARROW_HALF_WIDTH = 4;

interface MelodyPathProps {
  path: readonly PathStep[];
  /** How the Degree asked about is sung here. */
  turn: AttractionTurn;
}

/**
 * The melody of an Attraction Card as a little drawing: the Degrees it touches as lines, the notes in order joined by
 * arrows, and the Degree asked about in cinnabar, moved off its place (marked by a dashed ring) when it is sung
 * lower or higher. A bar after the last note ends the phrase.
 */
export function MelodyPath({ path, turn }: MelodyPathProps) {
  const top = Math.max(...path.map((s) => s.moria));
  const bottom = Math.min(...path.map((s) => s.moria));
  const width = LABEL_W + STEP_X * path.length + 8;
  const height = (top - bottom) * PX_PER_MORIA + PAD_Y * 2;
  const yOf = (moria: number) => PAD_Y + (top - moria) * PX_PER_MORIA;
  const shift = turn === "lowered" ? MOVE_PX : turn === "raised" ? -MOVE_PX : 0;

  // Each Degree between the lowest and highest note once, by its place.
  const lines = [...new Map(path.map((s) => [`${s.name}${s.octave}`, s])).values()];
  const notes = path.map((step, i) => {
    const home = yOf(step.moria);
    return { ...step, x: LABEL_W + STEP_X * (i + 0.5), home, y: step.asked ? home + shift : home };
  });

  const said = notes.map((n) => {
    const degree = degreeLabel(n.name, n.octave);
    const named = n.asked && turn !== "natural" ? t(turn === "lowered" ? "cards.melodyLowered" : "cards.melodyRaised", { degree }) : degree;
    return n.ends ? t("cards.melodyEnds", { degree: named }) : named;
  });

  return (
    <svg className="melody-path" viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={t("cards.melody", { notes: said.join(", ") })}>
      {lines.map((s) => (
        <g key={`${s.name}${s.octave}`}>
          <line className="melody-path__degree" x1={LABEL_W} x2={width} y1={yOf(s.moria)} y2={yOf(s.moria)} />
          <text className="melody-path__label" x={LABEL_W - 6} y={yOf(s.moria) + 4} textAnchor="end">
            {degreeLabel(s.name, s.octave)}
          </text>
        </g>
      ))}
      {notes.slice(1).map((to, i) => {
        const from = notes[i]!;
        const length = Math.hypot(to.x - from.x, to.y - from.y);
        const [ux, uy] = [(to.x - from.x) / length, (to.y - from.y) / length];
        const start = (from.asked ? ASKED_R : DOT_R) + 3;
        const tip = (to.asked ? ASKED_R : DOT_R) + 3;
        const [tx, ty] = [to.x - ux * tip, to.y - uy * tip];
        const [bx, by] = [tx - ux * ARROW_LENGTH, ty - uy * ARROW_LENGTH];
        return (
          <g key={i}>
            <line className="melody-path__step" x1={from.x + ux * start} y1={from.y + uy * start} x2={bx} y2={by} />
            <polygon
              className="melody-path__arrow"
              points={`${tx},${ty} ${bx - uy * ARROW_HALF_WIDTH},${by + ux * ARROW_HALF_WIDTH} ${bx + uy * ARROW_HALF_WIDTH},${by - ux * ARROW_HALF_WIDTH}`}
            />
          </g>
        );
      })}
      {notes.map((n, i) => (
        <g key={i}>
          {n.y !== n.home && (
            <>
              <circle className="melody-path__home" cx={n.x} cy={n.home} r={DOT_R + 0.5} />
              <line className="melody-path__move" x1={n.x} x2={n.x} y1={n.home} y2={n.y} />
            </>
          )}
          <circle className={n.asked ? "melody-path__note melody-path__note--asked" : "melody-path__note"} cx={n.x} cy={n.y} r={n.asked ? ASKED_R : DOT_R} />
          {n.ends && <line className="melody-path__end" x1={n.x + 12} x2={n.x + 12} y1={n.y - 9} y2={n.y + 9} />}
        </g>
      ))}
    </svg>
  );
}
