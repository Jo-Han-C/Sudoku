/** Seedad slumpgenerator (mulberry32). Ger tal i [0, 1). */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Heltal i [0, n). */
export const randInt = (rng: Rng, n: number): number => Math.floor(rng() * n);

/** Blandar en kopia av listan (Fisher–Yates). */
export function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Slumpat seed från plattformen, för när determinism inte behövs. */
export const randomSeed = (): number => (Math.random() * 2 ** 32) >>> 0;
