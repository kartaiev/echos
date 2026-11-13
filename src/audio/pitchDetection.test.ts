import { describe, expect, it } from "vitest";
import { detectPitch } from "./pitchDetection";

const SAMPLE_RATE = 48000;
/** What the microphone hands over at a time: about 43 ms at 48 kHz. */
const FRAME = 2048;

/** A steady tone with the given overtones (amplitude of the fundamental first). */
function tone(frequency: number, harmonics: number[] = [1], length = FRAME): Float32Array {
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let v = 0;
    harmonics.forEach((a, h) => (v += a * Math.sin((2 * Math.PI * frequency * (h + 1) * i) / SAMPLE_RATE + h)));
    samples[i] = 0.3 * v;
  }
  return samples;
}

/** Distance between two frequencies in cents. */
const cents = (a: number, b: number) => 1200 * Math.log2(a / b);

describe("Pitch detection", () => {
  it.each([82.41, 130.81, 196, 261.63, 440, 880])("finds a pure tone at %f Hz within 2 cents", (hz) => {
    const found = detectPitch(tone(hz), SAMPLE_RATE);

    expect(found).not.toBeNull();
    expect(Math.abs(cents(found!, hz))).toBeLessThan(2);
  });

  it("finds the fundamental of a sung vowel, not one of its overtones", () => {
    // A voice: the second and third harmonics are about as strong as the fundamental.
    const found = detectPitch(tone(146.83, [1, 0.9, 0.8, 0.5, 0.3, 0.2]), SAMPLE_RATE);

    expect(Math.abs(cents(found!, 146.83))).toBeLessThan(2);
  });

  it("finds the fundamental when it is weaker than its overtones", () => {
    const found = detectPitch(tone(110, [0.4, 1, 0.7, 0.4]), SAMPLE_RATE);

    expect(Math.abs(cents(found!, 110))).toBeLessThan(2);
  });

  it("hears nothing in silence", () => {
    expect(detectPitch(new Float32Array(FRAME), SAMPLE_RATE)).toBeNull();
  });

  it("hears nothing in a quiet room's hiss", () => {
    const hiss = Float32Array.from({ length: FRAME }, () => 0.002 * (Math.random() * 2 - 1));

    expect(detectPitch(hiss, SAMPLE_RATE)).toBeNull();
  });

  it("hears no pitch in loud noise", () => {
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
    const noise = Float32Array.from({ length: FRAME }, () => 0.3 * random());

    expect(detectPitch(noise, SAMPLE_RATE)).toBeNull();
  });
});
