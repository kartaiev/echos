import type { SourcedValue } from "./tuningSystems";

export const TEMPO_PRESET_IDS = ["bradeia", "mesi", "metria", "tacheia", "tachytati"] as const;
export type TempoPresetId = (typeof TEMPO_PRESET_IDS)[number];

/** A tempo range in chronoi per minute: from the minimum, up to but not including the maximum. */
export interface TempoRange {
  minChronoiPerMinute: number;
  /** null where the source gives no upper limit. */
  maxChronoiPerMinute: number | null;
}

export interface TempoPreset extends SourcedValue<TempoRange> {
  id: TempoPresetId;
}

const MELLING_TEMPO =
  'David J. Melling, "Reading Psalmodia: An introduction to modern Byzantine Notation" (2000), §11 Rhythm & Tempo';

const range = (minChronoiPerMinute: number, maxChronoiPerMinute: number | null): TempoRange => ({
  minChronoiPerMinute,
  maxChronoiPerMinute,
});

/**
 * Melling's table of tempo signs, which he calls "very approximate guidelines". He notes that Mesi and Metria
 * are sometimes swapped in use. The Speech tempo (Chyma) is chanted near a monotone without a beat, so it is not
 * a Tempo Preset. Unreviewed until the project's reviewer checks them.
 */
export const TEMPO_PRESETS: readonly TempoPreset[] = [
  { id: "bradeia", value: range(80, 100), source: MELLING_TEMPO, reviewStatus: "unreviewed" },
  // Printed as "100 - 100"; read as 100-120, up to where Metria begins.
  { id: "mesi", value: range(100, 120), source: MELLING_TEMPO, reviewStatus: "unreviewed" },
  { id: "metria", value: range(120, 160), source: MELLING_TEMPO, reviewStatus: "unreviewed" },
  { id: "tacheia", value: range(160, 180), source: MELLING_TEMPO, reviewStatus: "unreviewed" },
  { id: "tachytati", value: range(180, null), source: MELLING_TEMPO, reviewStatus: "unreviewed" },
];

/** The preset whose range holds this tempo, or null below the slowest. */
export function tempoPresetOf(chronoiPerMinute: number): TempoPresetId | null {
  const preset = TEMPO_PRESETS.find(
    ({ value: { minChronoiPerMinute: min, maxChronoiPerMinute: max } }) =>
      chronoiPerMinute >= min && (max === null || chronoiPerMinute < max),
  );
  return preset?.id ?? null;
}

export function tempoPreset(id: TempoPresetId): TempoPreset {
  return TEMPO_PRESETS.find((p) => p.id === id)!;
}
