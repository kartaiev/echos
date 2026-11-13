/**
 * The pitch of a sung sound, by the McLeod Pitch Method (McLeod & Wyvill, "A Smarter Way to Find Pitch", 2005):
 * the normalised square difference of the sound with itself shifted, whose first high peak is one period. It finds
 * the fundamental of a voice even where an overtone is louder, which plain autocorrelation and spectrum peaks miss.
 */

/** The lowest and highest pitch looked for: a bass's low Ke to a soprano's high Ga'. */
const LOWEST_HZ = 60;
const HIGHEST_HZ = 1100;
/** Quieter than this (root mean square, full scale 1) is a quiet room, not a voice. */
const SILENCE_RMS = 0.01;
/** A peak this high (1 is a perfectly periodic sound) is a pitch; noise stays far below. */
const CLARITY = 0.8;
/** The first peak at least this share of the highest is the period; later, higher peaks are its multiples. */
const PEAK_SHARE = 0.9;

/** The pitch in hertz of a frame of sound, or null where there is none (silence, noise, a breath). */
export function detectPitch(samples: Float32Array, sampleRate: number): number | null {
  const n = samples.length;
  let energy = 0;
  for (let i = 0; i < n; i++) energy += samples[i]! * samples[i]!;
  if (Math.sqrt(energy / n) < SILENCE_RMS) return null;

  const maxLag = Math.min(Math.ceil(sampleRate / LOWEST_HZ), Math.floor(n / 2));
  const minLag = Math.floor(sampleRate / HIGHEST_HZ);
  const nsdf = new Float32Array(maxLag + 1);
  for (let lag = 0; lag <= maxLag; lag++) {
    let acf = 0;
    let sum = 0;
    for (let i = 0; i < n - lag; i++) {
      const a = samples[i]!;
      const b = samples[i + lag]!;
      acf += a * b;
      sum += a * a + b * b;
    }
    nsdf[lag] = sum > 0 ? (2 * acf) / sum : 0;
  }

  // The highest point of each stretch above zero, after the first stretch (around no shift at all).
  const peaks: number[] = [];
  let lag = 1;
  while (lag <= maxLag && nsdf[lag]! > 0) lag++;
  while (lag <= maxLag) {
    while (lag <= maxLag && nsdf[lag]! <= 0) lag++;
    let best = -1;
    while (lag <= maxLag && nsdf[lag]! > 0) {
      if (best < 0 || nsdf[lag]! > nsdf[best]!) best = lag;
      lag++;
    }
    if (best > 0 && lag <= maxLag) peaks.push(best);
  }
  if (peaks.length === 0) return null;

  const highest = Math.max(...peaks.map((p) => nsdf[p]!));
  if (highest < CLARITY) return null;
  const period = peaks.find((p) => nsdf[p]! >= PEAK_SHARE * highest && p >= minLag);
  if (period === undefined) return null;

  // Between samples: the top of the parabola through the peak and its neighbours.
  const [left, middle, right] = [nsdf[period - 1]!, nsdf[period]!, nsdf[period + 1]!];
  const bend = left - 2 * middle + right;
  const exact = bend === 0 ? period : period + (left - right) / (2 * bend);
  return sampleRate / exact;
}
