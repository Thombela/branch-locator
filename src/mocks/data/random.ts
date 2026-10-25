/** Small, fast, seedable PRNG (mulberry32) so the mock dataset is identical on every run. */
export function createRandom(seed: number) {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    between: (min: number, max: number) => min + (max - min) * next(),
    /** Skewed towards `min`: most purchases are small and a few are large. */
    skewed: (min: number, max: number) => min + (max - min) * next() ** 2,
    int: (min: number, max: number) => Math.floor(min + (max - min + 1) * next()),
    pick: <T>(items: readonly T[]): T => {
      const item = items[Math.floor(next() * items.length)];
      if (item === undefined) throw new Error('Cannot pick from an empty list');
      return item;
    },
  };
}

export type Random = ReturnType<typeof createRandom>;
