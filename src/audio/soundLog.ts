/**
 * A short record of what the sound went through: the page leaving and coming back, the AudioContext and the
 * iPhone's audio session changing state, and every rebuild. Shown in Settings so a singer can copy it when the
 * sound fails on a phone nobody else can debug.
 */

const KEEP = 80;
const lines: string[] = [];
const listeners = new Set<() => void>();
const startedAt = typeof performance === "undefined" ? 0 : performance.now();

export function logSound(text: string) {
  const at = ((performance.now() - startedAt) / 1000).toFixed(1);
  lines.push(`${at}s ${text}`);
  if (lines.length > KEEP) lines.shift();
  for (const listener of listeners) listener();
}

export function soundLogLines(): readonly string[] {
  return lines.slice();
}

export function onSoundLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
