import { useEffect, useRef, useState } from "react";

/**
 * Keeps the screen on while something sounds: a phone on a music stand would otherwise dim and lock in the middle
 * of the Ison. The browser drops the lock when the page is hidden, so it is asked for again on return.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let released = false;
    const request = () => {
      if (document.visibilityState !== "visible") return;
      navigator.wakeLock
        .request("screen")
        .then((granted) => {
          if (released) void granted.release();
          else lock = granted;
        })
        // Refused (battery saver, an embedding page): the screen simply follows the device's own setting.
        .catch(() => {});
    };
    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", request);
      void lock?.release();
    };
  }, [active]);
}

/** How often the sound is checked while it should be heard, and how many checks in a row must find it held. */
const CHECK_EVERY_MS = 800;
const HELD_CHECKS = 2;

/**
 * Whether the device is holding the sound back while the singer expects to hear it. A resume in progress is not
 * reported: only a sound still held after two checks in a row.
 */
export function useSoundHeld(expectSound: boolean, soundIsHeld: () => boolean) {
  const [held, setHeld] = useState(false);
  const heldChecks = useRef(0);
  const latest = useRef(soundIsHeld);
  latest.current = soundIsHeld;

  useEffect(() => {
    if (!expectSound && !held) return;
    const timer = window.setInterval(() => {
      heldChecks.current = latest.current() ? heldChecks.current + 1 : 0;
      setHeld(heldChecks.current >= HELD_CHECKS);
    }, CHECK_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [expectSound, held]);

  /** After a single sung Degree, look once whether it was heard. */
  function checkSoon() {
    heldChecks.current = 0;
    window.setTimeout(() => {
      if (latest.current()) setHeld(true);
    }, CHECK_EVERY_MS * HELD_CHECKS);
  }

  function clear() {
    heldChecks.current = 0;
    setHeld(false);
  }

  return { held, checkSoon, clear };
}
