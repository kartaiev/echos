import type { MelosId, ModeId } from "./modeVariants";
import type { DegreeName, ReviewStatus } from "./tuningSystems";

/** Where a rule holds: in some Modes (one Melos, if it names one), in every Diatonic Mode, or after an Ajem on Zo. */
export type AttractionScope = { modes: readonly ModeId[]; melos?: MelosId } | "diatonic" | "ajem";

/** How the Degree is sung in that situation. */
export type AttractionTurn = "natural" | "lowered" | "raised";

/** One note of a Melody Path: a Degree from Ni to Ni', whether it is the Degree the rule is about, and whether the phrase ends on it. */
export interface PathNote {
  name: DegreeName;
  octave: 0 | 1;
  asked: boolean;
  ends: boolean;
}

/** The notes the melody passes through in the situation, in order: a picture of the rule, not a melody from a book. */
export type MelodyPath = readonly PathNote[];

/**
 * One situation in which a Degree moves or stays, as the courses describe it, retold in our own words. Only the
 * Zo of the Diatonic has a size (ADR-0008); the courses leave the others to oral tradition, so a rule says only
 * which way the Degree goes and whether it is a little.
 */
export interface AttractionRule<Id extends string = string> {
  id: Id;
  where: AttractionScope;
  degree: DegreeName;
  turn: AttractionTurn;
  /** The course says the move is slight. */
  slightly: boolean;
  /** The course says some chanters make the move and others do not. */
  disputed: boolean;
  /** How the melody moves in the situation; two when the rule names two ways or holds both going up and coming down. */
  paths: readonly MelodyPath[];
  source: string;
  reviewStatus: ReviewStatus;
}

const SCHOOL = "Trisagion School of Byzantine Music";
const FIRST_MODE_OVERVIEW = `${SCHOOL}, Octoëchos 201: 1st Mode (2026), "1st Mode Sticheraric – Theoretical Overview", Melodic Attractions`;
const MODAL_THEORY = `${SCHOOL}, Octoëchos 201: 1st Mode (2026), "A Systematic Overview of Byzantine Modal Theory", Melodic Attractions`;
const PLAGAL_FIRST_REVIEW = `${SCHOOL}, ByzB 103: Byzantine Notation Fluency (2026), "Modal Theory Review: Plagal 1st Heirmologic"`;
const FOURTH_REVIEW = `${SCHOOL}, ByzB 103: Byzantine Notation Fluency (2026), "Modal Theory Review: 4th Mode Legetos"`;
const THIRD_REVIEW = `${SCHOOL}, ByzB 103: Byzantine Notation Fluency (2026), "Modal Theory Review: 3rd Mode"`;
const THIRD_OVERVIEW = `${SCHOOL}, Octoëchos 203: 3rd Mode (2026), "3rd Mode Theoretical Overview", Melodic Attractions`;
const FTHORES_INTRO = `${SCHOOL}, ByzB 103: Byzantine Notation Fluency (2026), "Introduction to Fthores"`;

/**
 * A Melody Path written as Degree names, lowest octave first: "Ni'" is the Ni above, a "*" marks the Degree the
 * rule is about, and a "|" after a note ends the phrase there. "Ga Vou* Pa" comes down from Ga through Vou to Pa.
 */
function path(notes: string): MelodyPath {
  return notes.split(" ").map((note) => {
    const ends = note.endsWith("|");
    const asked = note.replace("|", "").endsWith("*");
    const written = note.replace(/[*|]/g, "");
    const name = written.replace("'", "") as DegreeName;
    return { name, octave: written.endsWith("'") ? 1 : 0, asked, ends };
  });
}

const rule = <Id extends string>(
  id: Id,
  where: AttractionScope,
  degree: DegreeName,
  turn: AttractionTurn,
  source: string,
  paths: readonly string[],
  { slightly = false, disputed = false } = {},
): AttractionRule<Id> => ({ id, where, degree, turn, slightly, disputed, paths: paths.map(path), source, reviewStatus: "unreviewed" });

/** Zo wherever it comes: passed going up, and coming down. */
const ZO_EITHER_WAY = ["Ke Zo* Ni'", "Ni' Zo* Ke"];

const FIRST = { modes: ["first"] } as const;
/** The course's 4th Mode Legetos, the 4th Mode Heirmologic on Vou here. */
const FOURTH_LEGETOS = { modes: ["fourth"], melos: "heirmologic" } as const;

/**
 * The Attractions the courses describe, in the order a student meets them: the 1st Mode, the Zo of every Diatonic
 * Mode, the other Diatonic Modes, then the 3rd Mode and the Ajem. The Vou of the Grave Mode is left out: the courses
 * set it a half step below Ga, which the Enharmonic Scale of the Grave Mode already does, so it is no Attraction here.
 */
export const ATTRACTION_RULES = [
  rule("first-vou-up", FIRST, "Vou", "natural", FIRST_MODE_OVERVIEW, ["Pa Vou* Ga Di"]),
  rule("first-vou-down-to-pa", FIRST, "Vou", "lowered", FIRST_MODE_OVERVIEW, ["Ga Vou* Pa"], { slightly: true }),
  rule("first-vou-around-ga", FIRST, "Vou", "raised", FIRST_MODE_OVERVIEW, ["Ga Vou* Ga"], { slightly: true }),
  rule("plagal-first-vou-down-to-pa", { modes: ["plagal-first"] }, "Vou", "lowered", PLAGAL_FIRST_REVIEW, ["Ga Vou* Pa"], { disputed: true }),
  rule("diatonic-zo-turns-back", "diatonic", "Zo", "lowered", FIRST_MODE_OVERVIEW, ["Di Ke Zo* Ke"]),
  rule("diatonic-zo-up-to-ni", "diatonic", "Zo", "natural", FTHORES_INTRO, ["Ke Zo* Ni'"]),
  rule("diatonic-zo-down-from-ni", "diatonic", "Zo", "lowered", FTHORES_INTRO, ["Ni' Zo* Ke"]),
  rule("diatonic-zo-ends-on-zo", "diatonic", "Zo", "natural", FIRST_MODE_OVERVIEW, ["Ke Zo* Ke Zo*|"]),
  rule("diatonic-zo-ends-above", "diatonic", "Zo", "natural", FIRST_MODE_OVERVIEW, ["Ke Zo* Ni'|"]),
  rule("first-sticheraric-zo", { modes: ["first"], melos: "sticheraric" }, "Zo", "lowered", FIRST_MODE_OVERVIEW, ZO_EITHER_WAY),
  rule("fourth-pa-down-to-ni", FOURTH_LEGETOS, "Pa", "raised", FOURTH_REVIEW, ["Vou Pa* Ni", "Vou Pa* Vou"]),
  rule("fourth-pa-ends-on-pa", FOURTH_LEGETOS, "Pa", "natural", FOURTH_REVIEW, ["Ga Vou Pa*|"]),
  rule("plagal-fourth-pa-to-vou", { modes: ["plagal-fourth"] }, "Pa", "raised", MODAL_THEORY, ["Ni Pa* Vou|"]),
  rule("third-vou-to-ga", { modes: ["third"] }, "Vou", "raised", THIRD_OVERVIEW, ["Pa Vou* Ga"]),
  rule("third-zo", { modes: ["third"] }, "Zo", "lowered", THIRD_REVIEW, ZO_EITHER_WAY),
  rule("ajem-zo", "ajem", "Zo", "lowered", FTHORES_INTRO, ["Ke Zo* Ni'"]),
] as const;

export type AttractionRuleId = (typeof ATTRACTION_RULES)[number]["id"];

/** Where the Deck as a whole comes from: the courses, retold. */
export const ATTRACTION_RULES_SOURCE = `${SCHOOL}, Octoëchos 201 and 203 and ByzB 103 courses, retold in our own words`;
