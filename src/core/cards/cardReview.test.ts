import { describe, expect, it } from "vitest";
import { deckStanding, isCardProgressRecord, localToday, shuffled, startReview, type CardProgress, type Grade } from "./cardReview";

const CARDS = ["a", "b", "c", "d", "e", "f"];
const inOrder = <T,>(items: readonly T[]) => [...items];

/** Answers every Card the Review shows with the same grade and lists them in the order they came. */
function answerAll(review: ReturnType<typeof startReview>, grade: Grade): string[] {
  const shown: string[] = [];
  for (let card = review.current(); card !== null; card = review.current()) {
    shown.push(card);
    review.answer(grade);
  }
  return shown;
}

describe("Card Review: what comes up", () => {
  it("brings new Cards, no more than the limit", () => {
    const review = startReview({ cards: CARDS, progress: {}, today: "2026-11-10", newLimit: 4, order: inOrder });

    expect(review.left()).toBe(4);
    expect(answerAll(review, "remembered")).toEqual(["a", "b", "c", "d"]);
  });

  it("brings the Cards that are due before new ones, and leaves those not due yet", () => {
    const progress: Record<string, CardProgress> = {
      c: { box: 2, due: "2026-11-10" },
      a: { box: 1, due: "2026-11-09" },
      b: { box: 3, due: "2026-11-11" },
    };
    const review = startReview({ cards: CARDS, progress, today: "2026-11-10", newLimit: 2, order: inOrder });

    expect(answerAll(review, "remembered")).toEqual(["a", "c", "d", "e"]);
  });

  it("shuffles what comes up, through the order it is given", () => {
    const review = startReview({ cards: CARDS, progress: {}, today: "2026-11-10", newLimit: 3, order: (ids) => [...ids].reverse() });

    expect(answerAll(review, "remembered")).toEqual(["c", "b", "a"]);
  });

  it("ignores progress kept for a Card the Deck no longer has", () => {
    const review = startReview({
      cards: ["a"],
      progress: { gone: { box: 1, due: "2026-11-01" } },
      today: "2026-11-10",
      order: inOrder,
    });

    expect(answerAll(review, "remembered")).toEqual(["a"]);
  });

  it("has nothing to show when nothing is due and no new Card is left", () => {
    const review = startReview({ cards: ["a"], progress: { a: { box: 2, due: "2026-11-12" } }, today: "2026-11-10" });

    expect(review.current()).toBeNull();
    expect(review.left()).toBe(0);
  });
});

describe("Card Review: the schedule", () => {
  // Leitner boxes: each Card remembered moves up a box and waits longer: 1, 3, 7, 16, 35, then 75 days.
  it.each([
    [undefined, 1, "2026-11-11"],
    [{ box: 1, due: "2026-11-10" }, 2, "2026-11-13"],
    [{ box: 2, due: "2026-11-10" }, 3, "2026-11-17"],
    [{ box: 3, due: "2026-11-10" }, 4, "2026-11-26"],
    [{ box: 4, due: "2026-11-10" }, 5, "2026-12-15"],
    [{ box: 5, due: "2026-11-10" }, 6, "2027-01-24"],
    [{ box: 6, due: "2026-11-10" }, 6, "2027-01-24"],
  ])("a Card remembered from %o goes to box %i, due %s", (before, box, due) => {
    const review = startReview({ cards: ["a"], progress: before ? { a: before } : {}, today: "2026-11-10" });

    review.answer("remembered");

    expect(review.progress().a).toEqual({ box, due });
  });

  it("a Card forgotten drops to the first box and comes back in this Review after three others", () => {
    const review = startReview({
      cards: CARDS,
      progress: { a: { box: 4, due: "2026-11-10" } },
      today: "2026-11-10",
      newLimit: 5,
      order: inOrder,
    });

    review.answer("forgot");
    expect(review.progress().a).toEqual({ box: 0, due: "2026-11-10" });
    expect(review.left()).toBe(6);

    const rest = answerAll(review, "remembered");

    expect(rest).toEqual(["b", "c", "d", "a", "e", "f"]);
    expect(review.progress().a).toEqual({ box: 1, due: "2026-11-11" });
  });

  it("a Card forgotten near the end comes back last", () => {
    const review = startReview({ cards: ["a", "b"], progress: {}, today: "2026-11-10", order: inOrder });

    review.answer("remembered");
    review.answer("forgot");

    expect(review.current()).toBe("b");
  });

  it("keeps the progress it was given for the Cards it does not show", () => {
    const kept = { box: 3, due: "2026-12-01" };
    const review = startReview({ cards: ["a", "b"], progress: { b: kept }, today: "2026-11-10" });

    review.answer("remembered");

    expect(review.progress().b).toEqual(kept);
  });

  it("does nothing when asked to grade with no Card left", () => {
    const review = startReview({ cards: [], progress: {}, today: "2026-11-10" });

    review.answer("remembered");

    expect(review.progress()).toEqual({});
  });
});

describe("Deck standing", () => {
  it("counts the Cards due, the new ones and the ones learned", () => {
    const progress: Record<string, CardProgress> = {
      a: { box: 1, due: "2026-11-10" },
      b: { box: 0, due: "2026-11-09" },
      c: { box: 4, due: "2026-11-30" },
      gone: { box: 2, due: "2026-11-01" },
    };

    expect(deckStanding(CARDS, progress, "2026-11-10")).toEqual({ due: 2, fresh: 3, learned: 1, total: 6, nextDue: "2026-11-30" });
  });

  it("has no next date when nothing waits", () => {
    expect(deckStanding(["a"], {}, "2026-11-10").nextDue).toBeNull();
  });
});

describe("Saved progress", () => {
  it.each([
    [{}, true],
    [{ a: { box: 2, due: "2026-11-10" } }, true],
    [{ a: { box: 9, due: "2026-11-10" } }, false],
    [{ a: { box: 1, due: "tomorrow" } }, false],
    [{ a: null }, false],
    [[], false],
    ["x", false],
  ])("%o is valid: %s", (value, valid) => {
    expect(isCardProgressRecord(value)).toBe(valid);
  });
});

describe("Days and order", () => {
  it("reads today in local time", () => {
    expect(localToday(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });

  it("shuffles without losing or repeating a Card", () => {
    const out = shuffled(CARDS, () => 0.5);

    expect([...out].sort()).toEqual(CARDS);
  });
});
