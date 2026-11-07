import { afterEach, describe, expect, it } from "vitest";
import { MODE_IDS } from "../core/theory/modeVariants";
import { LANGUAGES, TABLES, degreeLabel, setLanguage, t, tIn } from "./translations";

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("Translations", () => {
  afterEach(() => setLanguage("en"));

  it.each(LANGUAGES)("%s has every key, each with the same placeholders as English", (language) => {
    const english = TABLES.en;
    const other = TABLES[language] as Record<string, string>;

    expect(Object.keys(other).sort()).toEqual(Object.keys(english).sort());
    for (const [key, text] of Object.entries(english)) {
      expect({ key, placeholders: placeholders(other[key] ?? "") }).toEqual({ key, placeholders: placeholders(text) });
      expect(other[key]?.trim()).not.toBe("");
    }
  });

  it("switches the whole interface to Greek, Degree names included", () => {
    setLanguage("el");

    expect(t("ison.title")).toBe("Ίσον");
    expect(t("mode.plagal-first")).toBe("Πλάγιος του Α΄");
    expect(degreeLabel("Ni", 1)).toBe("Νη′");
    expect(t("metronome.cpm", { n: 100 })).toBe("100 χρόνοι / λεπτό");
  });

  it("gives the Greek Mode name in any language, for the cards in the English interface", () => {
    expect(MODE_IDS.map((mode) => tIn("el", `mode.${mode}`))).toEqual([
      "Ήχος Α΄",
      "Ήχος Β΄",
      "Ήχος Γ΄",
      "Ήχος Δ΄",
      "Πλάγιος του Α΄",
      "Πλάγιος του Β΄",
      "Βαρύς",
      "Πλάγιος του Δ΄",
    ]);
    expect(t("mode.grave")).toBe("Grave Mode");
  });
});
