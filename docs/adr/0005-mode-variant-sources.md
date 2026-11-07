# Mode Variant data: Trisagion for Heirmologic, Melling for Sticheraric (supersedes ADR-0004 for Heirmologic)

**Heirmologic.** The Heirmologic Mode Variants follow the Trisagion School course chart ByzB-101 "Modal Theory Review", Heirmologic Genre, which is what the project's reviewer's school teaches. It gives the Genus, the Base, the "Structural Notes" (our Dominant Degrees) and the Intonation of each Mode. The chart draws each Intonation as coloured boxes: the height of a box is the Degree and its width is the length. We read the widths as half, one, one and a half or two chronoi, sung at Melling's Medium tempo of 100 chronoi a minute.

The chart differs from Melling for four Modes:

| Mode | Trisagion chart | Melling |
| --- | --- | --- |
| Plagal 1st | Base Pa; Structural Notes Pa, Ga | Base on the low Ke; Dominant Degrees Ke, Ni, Pa |
| Plagal 2nd | Base Di; Structural Notes Vou, Di, Zo | Base on Vou; Dominant Degrees Vou, Di |
| Grave | Structural Notes Pa, Ga, Di | Dominant Degrees Ga, Di, Zo |
| 4th | adds Pa to Di and Vou | Di and Vou |

**Sticheraric.** The chart covers only the Heirmologic Genre, so the Sticheraric Mode Variants come from David J. Melling, "Reading Psalmodia" (2000), §9. They have no Intonations yet.

Melling separates "Irmic and short Sticheric" melodies from "slow Sticheric" ones, so we take his slow Sticheric line. Where he gives alternatives, we take the first one:
- Plagal 1st: "Pa or Ke" gives Pa.
- Plagal 2nd: Hard Chromatic on Pa.
- Grave: Diatonic on the low Zo.
- Plagal 4th: Ni. He gives an Octave-System mode on Ni and a Tetrachordal one on Ga, both for all styles.

He gives the Enharmonic on Ga for both kinds of 3rd Mode melody, so the Diatonic 3rd mentioned in ADR-0002 is not in release 1.

**Licensing.** The first version of the spec ruled out material from Trisagion School and other paid courses. The project owner decided to follow the school instead, since it is the reviewer's school, and the spec now says so (#1). Every value taken from a Trisagion chart names that chart as its source. Note that the theory data is published under CC BY-SA 4.0, so permission from the school is worth having before a public release.

**Not yet in either source.** Neither source gives Cadences per Mode Variant, so the cards say so until one is found.

**Review.** Every Mode Variant stays `unreviewed` (ADR-0001) until a reviewer signs it off, and changing any of these choices is a data change only.
