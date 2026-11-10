import { describe, expect, it } from "vitest";
import { DECKS, cardsOf } from "./decks";

describe("Decks", () => {
  it("has a Card for every Fthora sign, each with its Genus and the Degrees it names", () => {
    const fthores = cardsOf("fthores");

    expect(fthores).toHaveLength(12);
    expect(fthores.find((c) => c.id === "fthora:diatonic-ke")).toMatchObject({
      kind: "fthora",
      sign: "diatonic-ke",
      genus: "diatonic",
      degrees: [{ name: "Ke", octave: 0 }],
    });
    expect(fthores.find((c) => c.id === "fthora:diatonic-ni-high")).toMatchObject({ degrees: [{ name: "Ni", octave: 1 }] });
    expect(fthores.find((c) => c.id === "fthora:hard-chromatic-pa")).toMatchObject({
      genus: "hard-chromatic",
      degrees: [
        { name: "Pa", octave: 0 },
        { name: "Ga", octave: 0 },
        { name: "Ke", octave: 0 },
        { name: "Ni", octave: 1 },
      ],
    });
  });

  it("has a Martyria Card for every Degree from Ni to Ni' in every Genus", () => {
    const martyries = cardsOf("martyries");

    expect(martyries).toHaveLength(32);
    expect(martyries.find((c) => c.id === "martyria:enharmonic:Ga")).toMatchObject({
      kind: "martyria",
      genus: "enharmonic",
      degree: { name: "Ga", octave: 0 },
      martyria: { rootSign: "nana", fthora: "enharmonic" },
    });
    expect(martyries.find((c) => c.id === "martyria:diatonic:Ni'")).toMatchObject({
      degree: { name: "Ni", octave: 1 },
      martyria: { letterOctave: 1, rootSign: "nana" },
    });
  });

  it("has a Neume Card for every Neume with a name, first in the Deck", () => {
    const neumes = cardsOf("neumes").filter((c) => c.kind === "neume");

    expect(neumes.map((c) => c.neume)).toEqual([
      "ison",
      "oligon",
      "kentima",
      "kentimata",
      "petasti",
      "apostrofos",
      "elafron",
      "yporroi",
      "chamili",
      "running-elafron",
    ]);
    expect(cardsOf("neumes")[0]).toMatchObject({ kind: "neume", id: "neume:ison" });
  });

  it("has an Interval Card for every written form on the handout, with the steps it sings", () => {
    const intervals = cardsOf("neumes").filter((c) => c.kind === "interval");

    expect(intervals).toHaveLength(39);
    expect(intervals.find((c) => c.id === "interval:oligon-ypsili-right")).toMatchObject({ steps: [4], ornament: false });
    expect(intervals.find((c) => c.id === "interval:chamili-elafron-apostrofos")).toMatchObject({ steps: [-7] });
    expect(intervals.find((c) => c.id === "interval:oligon-apostrofos-kentimata")).toMatchObject({ steps: [-1, 1] });
    expect(intervals.find((c) => c.id === "interval:petasti-oligon")).toMatchObject({ steps: [2], ornament: true });
  });

  it("covers every interval from up seven to down seven, plainly written and with the Petasti", () => {
    const intervals = cardsOf("neumes").filter((c) => c.kind === "interval" && c.steps.length === 1);
    const reached = (ornament: boolean) =>
      [...new Set(intervals.filter((c) => c.kind === "interval" && c.ornament === ornament).map((c) => (c.kind === "interval" ? c.steps[0] : 0)))].sort(
        (a, b) => a! - b!,
      );

    const all = [-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7];
    expect(reached(false)).toEqual(all);
    expect(reached(true)).toEqual(all);
  });

  it("gives every Card an id of its own", () => {
    const ids = Object.values(DECKS).flatMap((deck) => deck.cards.map((c) => c.id));

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("names the source of every Deck", () => {
    for (const deck of Object.values(DECKS)) expect(deck.source).toMatch(/Trisagion/);
  });
});
