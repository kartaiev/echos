# Modal Signature Cards, one per Mode

The Modal Signatures Deck asks which Mode a signature opens. Its data, in `src/core/theory/modalSignatures.ts`, is the Base and the Fthora of one signature per Mode, as the Trisagion School course (Octoëchos 201, "Fthores, Part I: Establishing the Scale") shows them side by side (ADR-0010):

| Mode | Base | Fthora |
| --- | --- | --- |
| 1st | Pa | Diatonic Pa |
| 2nd | Di | Soft Chromatic Di |
| 3rd | Ga | Diatonic Ga |
| 4th | Di | Diatonic Di |
| Plagal 1st | Pa | Diatonic Pa |
| Plagal 2nd | Pa | Hard Chromatic Pa |
| Grave | low Zo | the sign of the Diatonic Pa |
| Plagal 4th | Ni | Diatonic Ni |

A Mode is written with other signatures too (the 4th on Vou as Legetos, for one); each comes when a source for it does, as a Card of its own.

The face is the signature as a book prints it: the word Mode (Ήχος in Greek) and the Base in the letters of the interface, the sign of the Mode and the Fthora in the Neanes font. The sign of each Mode is its SBMuFL glyph ("modeFirst" to "modePlagalFourth"), the plagal Modes after the plagal sign, checked against the course by eye; the Grave sign is drawn a little differently in Neanes than in the course, the same sign in another hand.

The answer names the Mode, then the Base and the Fthora. It does not name a Genus: a signature's Fthora is not always the Genus the Mode is sung in (the 3rd Mode is written with the Diatonic Fthora of Ga and sung Enharmonic), and the Card says only what the signature says.

The signatures are not tied to the Mode Variants of the Practice view: the course gives one signature to both Melē of the 1st Mode, and some signatures stand on another Base than our Variants (the 4th on Di).
