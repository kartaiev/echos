import { useEffect, useRef, useState } from "react";
import { listenToVoice } from "../audio/microphone";
import type { VoiceReading } from "../core/practice/PracticeSession";

/** Readings the shown pitch is the median of: a steady hand on a voice that wavers and cracks. */
const SMOOTHING = 5;
/** Readings without a pitch in a row (at 20 a second) before the voice counts as stopped. */
const QUIET_READINGS = 4;

export type VoiceCheckProblem = "refused" | "unavailable";

/**
 * Voice Check while `active`: listens to the microphone and reads the voice against the Ladder as it sounds now.
 * The reading is null between notes; a problem says why listening could not start.
 */
export function useVoiceCheck(active: boolean, read: (hz: number) => VoiceReading | null) {
  const [reading, setReading] = useState<VoiceReading | null>(null);
  const [problem, setProblem] = useState<VoiceCheckProblem | null>(null);
  /** The browser's own name for what went wrong, shown with the problem so a report from a phone says it. */
  const [problemName, setProblemName] = useState("");
  const latestRead = useRef(read);
  latestRead.current = read;

  useEffect(() => {
    if (!active) return;
    setProblem(null);
    let stopped = false;
    let stop = () => {};
    const recent: number[] = [];
    let quiet = 0;
    listenToVoice((hz) => {
      if (hz === null) {
        if (++quiet >= QUIET_READINGS && recent.length > 0) {
          recent.length = 0;
          setReading(null);
        }
        return;
      }
      quiet = 0;
      recent.push(hz);
      if (recent.length > SMOOTHING) recent.shift();
      const sorted = [...recent].sort((a, b) => a - b);
      const next = latestRead.current(sorted[Math.floor(sorted.length / 2)]!);
      setReading((shown) => (shown && next && sameReading(shown, next) ? shown : next));
    }).then(
      (listening) => {
        if (stopped) listening.stop();
        else stop = () => listening.stop();
      },
      (error: unknown) => {
        if (stopped) return;
        const name = error instanceof Error ? error.name : String(error);
        const refused = name === "NotAllowedError" || name === "SecurityError";
        setProblemName(name);
        setProblem(refused ? "refused" : "unavailable");
      },
    );
    return () => {
      stopped = true;
      stop();
      setReading(null);
    };
  }, [active]);

  return { reading, problem, problemName };
}

/** Close enough that redrawing would not move anything the eye can see. */
function sameReading(a: VoiceReading, b: VoiceReading) {
  return a.degreeId === b.degreeId && Math.round(a.offMoria) === Math.round(b.offMoria) && Math.abs(a.moria - b.moria) < 0.2;
}
