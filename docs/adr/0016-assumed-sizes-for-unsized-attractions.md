# Assumed sizes for the Attractions the courses leave unsized

ADR-0008 kept off the Ladder every Attraction without a sourced size. The student asked to hear them anyway, and to settle the sizes with a teacher later. So the Ladder now also offers, as manual toggles:

- in the Diatonic: Vou lowered (towards Pa, 1st and Plagal 1st Modes), Vou raised (towards Ga, 1st Mode), Pa raised (towards Vou, 4th and Plagal 4th Modes);
- in the Enharmonic: Vou raised (towards Ga, 3rd Mode).

Each moves its Degree by 2 moria. No source gives that number: the courses say "slightly" and leave the size to oral tradition. 2 moria is our reading of "slightly", the smallest step that is clearly heard. Each of these Attractions carries `assumed: true` in the data, its source names the course and says the size is assumed, and its button reads "(assumed)". Zo lowered by 4 moria stays the only sourced size.

A Degree moves one way at a time: switching on Vou raised switches off Vou lowered, and the other way round.

When a reviewer gives a size, it replaces the 2 in `tuningSystems.ts`, `assumed` becomes false, and the "(assumed)" mark goes away. The Attraction Cards (ADR-0015) still give no number for these moves.
