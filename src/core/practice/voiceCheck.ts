/** Where a sung pitch falls on the Ladder: the nearest Degree and how far the voice is from it. */
export interface VoiceReading {
  /** Position of the voice in moria from Ni, as the Ladder draws Degrees. */
  moria: number;
  /** The Degree nearest the voice. */
  degreeId: string;
  /** Moria above (positive) or below (negative) that Degree. */
  offMoria: number;
}

interface PlacedDegree {
  id: string;
  moria: number;
}

/** A voice this far beyond the ends of the Ladder is read an octave nearer: the Degree matters, not the octave. */
const MARGIN_MORIA = 6;

/**
 * Reads a sung frequency against the Scale as it sounds now (Genus, Attractions, Fthores, Reference Pitch):
 * positions are in moria from Ni, so the reading speaks the Ladder's own units.
 */
export function readVoice(
  frequency: number,
  degrees: readonly PlacedDegree[],
  niHz: number,
  moriaPerOctave: number,
): VoiceReading | null {
  if (!(frequency > 0) || degrees.length === 0) return null;
  const lowest = degrees[0]!.moria - MARGIN_MORIA;
  const highest = degrees[degrees.length - 1]!.moria + MARGIN_MORIA;
  let moria = moriaPerOctave * Math.log2(frequency / niHz);
  while (moria > highest) moria -= moriaPerOctave;
  while (moria < lowest) moria += moriaPerOctave;
  let nearest = degrees[0]!;
  for (const degree of degrees) if (Math.abs(degree.moria - moria) < Math.abs(nearest.moria - moria)) nearest = degree;
  return { moria, degreeId: nearest.id, offMoria: moria - nearest.moria };
}
