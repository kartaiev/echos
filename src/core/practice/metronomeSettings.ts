/** Chronoi are counted in twos, threes or fours, with an accent on the first of each group. */
export const GROUPINGS = [2, 3, 4] as const;
export type Grouping = (typeof GROUPINGS)[number];

export const MIN_CHRONOI_PER_MINUTE = 40;
export const MAX_CHRONOI_PER_MINUTE = 240;

/** The metronome's tempo and grouping, as remembered on the device. */
export interface MetronomeSettings {
  chronoiPerMinute: number;
  grouping: Grouping;
}

/** Melling's Medium (Mesi) tempo, the one Intonations are sung at, counted in twos. */
export const DEFAULT_METRONOME_SETTINGS: MetronomeSettings = { chronoiPerMinute: 100, grouping: 2 };

/** A whole number of chronoi a minute within the range the metronome offers. */
export function clampTempo(chronoiPerMinute: number): number {
  return Math.min(MAX_CHRONOI_PER_MINUTE, Math.max(MIN_CHRONOI_PER_MINUTE, Math.round(chronoiPerMinute)));
}

/** How long one Chronos lasts at this tempo. */
export const chronosMs = (chronoiPerMinute: number) => 60_000 / chronoiPerMinute;

/** Guards settings restored from the device, which may be stale or hand-edited. */
export function isMetronomeSettings(value: unknown): value is MetronomeSettings {
  if (typeof value !== "object" || value === null) return false;
  const { chronoiPerMinute, grouping } = value as Record<string, unknown>;
  return (
    typeof chronoiPerMinute === "number" &&
    clampTempo(chronoiPerMinute) === chronoiPerMinute &&
    GROUPINGS.includes(grouping as Grouping)
  );
}
