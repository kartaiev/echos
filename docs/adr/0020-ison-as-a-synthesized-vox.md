# The Ison sings a synthesized vox

The Ison was the soft tone the Degrees use: exact, but thin under a held melody. We looked for a voice to hold it instead. A physically modelled singer (CHIMERA) sounded close to a person only on consonants, never on a held vowel. Free recordings of singers (VocalSet, Freesound) hold a note for two or three seconds and waver by 10 to 25 cents, so a held Ison has to be looped and retuned, and no recording of an actual Ison came under a licence we could ship. Factory sounds of GarageBand or of sample-based synthesizers may be played in music but not shipped as instruments.

So the Ison is a synthesizer vox, built live from Web Audio nodes (`src/audio/isonVox.ts`): seven male glottal voices spread symmetrically around the Degree's exact pitch across the stereo field (with subtle arrival-time offsets, independent harmonic phases, gentle pitch drift and staggered breathing), shaped through stereo male "o" formant resonators (F1, F2, F3) and a soft low-pass filter, then an opposing stereo chorus and a light stone room. Starting from silence swells in over a second and a half on a sine-squared curve so it never starts with a hit; switching directly from one Degree to another while sounding crossfades in 80 ms so the pitch follows quick tempi right on the beat.

- **Exact pitch.** The seven choir voices are spread symmetrically above and below the Degree's frequency (sum of detuning is 0 cents) with only slow micro-drift, so what is heard stays centred on the Degree.
- **No recordings.** It holds as long as the student wants, on any pitch of any Scale, and nothing needs a licence.
- **One vowel.** The vox sings a male "o"; the Ison Voice keeps the student's vowel, not offered until more voices or vowels are ready.
- **The Degrees and the intonation keep the soft tone**, where an exact, plain pitch matters more than warmth.
