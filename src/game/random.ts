export function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function integerBetween(random: () => number, min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min;
}

export function pickWeighted<T extends string>(
  random: () => number,
  weights: Record<T, number>
) {
  const total = Object.values<number>(weights).reduce((sum, value) => sum + value, 0);
  let roll = random() * total;

  for (const [key, weight] of Object.entries(weights) as Array<[T, number]>) {
    roll -= weight;
    if (roll <= 0) {
      return key;
    }
  }

  return Object.keys(weights)[0] as T;
}
