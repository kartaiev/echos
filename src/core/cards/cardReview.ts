/**
 * Spaced repetition by Leitner boxes (ADR-0013): a Card remembered moves up one box and waits longer before it
 * comes back; a Card forgotten drops to the first box and comes back in the same Review.
 */

/** Where a Card stands: its box (0 until it is first remembered) and the day it is due, as "YYYY-MM-DD". */
export interface CardProgress {
  box: number;
  due: string;
}

export type CardProgressRecord = Readonly<Record<string, CardProgress>>;

export type Grade = "forgot" | "remembered";

/** Days a Card waits after it is remembered into a box; box 0 is a Card not yet remembered. */
const BOX_DAYS = [0, 1, 3, 7, 16, 35, 75] as const;
const TOP_BOX = BOX_DAYS.length - 1;
/** A Card forgotten comes back after this many others, so the answer is not still in mind. */
const COME_BACK_AFTER = 3;
export const NEW_CARDS_PER_REVIEW = 10;

function addDays(day: string, days: number): string {
  const [year, month, date] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, date + days)).toISOString().slice(0, 10);
}

/** Today on this device, as "YYYY-MM-DD" in local time. */
export function localToday(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Fisher-Yates over a copy, so the Cards do not come up in the same order every time. */
export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export interface ReviewOptions {
  /** Card ids of the Deck, in the Deck's order. */
  cards: readonly string[];
  progress: CardProgressRecord;
  today: string;
  /** How many Cards never seen may come up in one Review. */
  newLimit?: number;
  /** Puts the Cards in the order they come up; shuffles by default. */
  order?: (ids: readonly string[]) => string[];
}

export interface CardReview {
  /** The Card to answer now, or null when the Review is over. */
  current(): string | null;
  answer(grade: Grade): void;
  /** Cards still to answer, a forgotten one counted again. */
  left(): number;
  /** The progress of the whole Deck after the answers so far, to be saved. */
  progress(): CardProgressRecord;
}

/** A Review of one Deck: the Cards due today (the most overdue first), then new Cards up to the limit. */
export function startReview({ cards, progress, today, newLimit = NEW_CARDS_PER_REVIEW, order = shuffled }: ReviewOptions): CardReview {
  const due = cards.filter((id) => progress[id] && progress[id].due <= today);
  // Days compare as text; within a day the given order decides.
  const byDue = new Map<string, string[]>();
  for (const id of order(due)) byDue.set(progress[id]!.due, [...(byDue.get(progress[id]!.due) ?? []), id]);
  const overdueFirst = [...byDue.keys()].sort().flatMap((day) => byDue.get(day)!);
  const fresh = order(cards.filter((id) => !progress[id]).slice(0, Math.max(0, newLimit)));
  const queue = [...overdueFirst, ...fresh];
  const record: Record<string, CardProgress> = { ...progress };

  return {
    current: () => queue[0] ?? null,
    left: () => queue.length,
    progress: () => ({ ...record }),
    answer(grade) {
      const id = queue.shift();
      if (id === undefined) return;
      if (grade === "forgot") {
        record[id] = { box: 0, due: today };
        queue.splice(Math.min(COME_BACK_AFTER, queue.length), 0, id);
        return;
      }
      const box = Math.min((record[id]?.box ?? 0) + 1, TOP_BOX);
      record[id] = { box, due: addDays(today, BOX_DAYS[box]!) };
    },
  };
}

export interface DeckStanding {
  /** Seen before and due today or earlier. */
  due: number;
  /** Never seen. */
  fresh: number;
  /** Remembered and not due yet. */
  learned: number;
  total: number;
  /** The first day after today a Card of the Deck is due, or null when none waits. */
  nextDue: string | null;
}

export function deckStanding(cards: readonly string[], progress: CardProgressRecord, today: string): DeckStanding {
  const seen = cards.map((id) => progress[id]).filter((p): p is CardProgress => p !== undefined);
  const waiting = seen.filter((p) => p.due > today).map((p) => p.due).sort();
  return {
    due: seen.filter((p) => p.due <= today).length,
    fresh: cards.length - seen.length,
    learned: waiting.length,
    total: cards.length,
    nextDue: waiting[0] ?? null,
  };
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Saved progress as read back from storage: a record of boxes and due days, anything else rejected. */
export function isCardProgressRecord(value: unknown): value is CardProgressRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.values(value).every(
    (p: unknown) =>
      typeof p === "object" &&
      p !== null &&
      Number.isInteger((p as CardProgress).box) &&
      (p as CardProgress).box >= 0 &&
      (p as CardProgress).box <= TOP_BOX &&
      typeof (p as CardProgress).due === "string" &&
      DAY.test((p as CardProgress).due),
  );
}
