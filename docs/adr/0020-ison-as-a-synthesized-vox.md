# The Ison sings a synthesized vox

The Ison was the soft tone the Degrees use: exact, but thin under a held melody. We looked for a voice to hold it instead. A physically modelled singer (CHIMERA) sounded close to a person only on consonants, never on a held vowel. Free recordings of singers (VocalSet, Freesound) hold a note for two or three seconds and waver by 10 to 25 cents, so a held Ison has to be looped and retuned, and no recording of an actual Ison came under a licence we could ship. Factory sounds of GarageBand or of sample-based synthesizers may be played in music but not shipped as instruments.

So the Ison is a synthesizer vox, built live from Web Audio nodes (`src/audio/isonVox.ts`): two thirds an analog vox (a saw and a slowly breathing pulse through a resonant low-pass and a vowel peak, in the manner of a Juno) and one third a choir pad (five voices on "a" a few cents apart, an octave above, whispered air, a breath at the start, in the manner of a D-50), through a stereo chorus and a small room. The student chose this blend by ear from prototypes.

- **Exact pitch.** The analog oscillator sits on the Degree's frequency and nothing moves it; the choir voices are spread evenly above and below it and drift by a cent or two, so what is heard is centred on the Degree.
- **No recordings.** It holds as long as the student wants, on any pitch of any Scale, and nothing needs a licence.
- **One vowel.** The vox sings "a"; the Ison Voice keeps the student's vowel, not offered until the vox can sing the others.
- **The Degrees and the intonation keep the soft tone**, where an exact, plain pitch matters more than warmth.
