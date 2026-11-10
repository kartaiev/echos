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

  it("gives every Card an id of its own", () => {
    const ids = Object.values(DECKS).flatMap((deck) => deck.cards.map((c) => c.id));

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("names the source of every Deck", () => {
    for (const deck of Object.values(DECKS)) expect(deck.source).toMatch(/Trisagion/);
  });
});
