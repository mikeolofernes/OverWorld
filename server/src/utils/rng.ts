export class SeededRng {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed;
  }

  nextFloat(): number {
    return this.next() / 0x100000000;
  }

  nextIntInRange(min: number, max: number): number {
    return min + Math.floor(this.nextFloat() * (max - min + 1));
  }

  weightedChoice<T>(choices: Array<{ item: T; weight: number }>): T {
    const total = choices.reduce((sum, c) => sum + c.weight, 0);
    let roll = this.nextFloat() * total;
    for (const choice of choices) {
      roll -= choice.weight;
      if (roll <= 0) return choice.item;
    }
    return choices[choices.length - 1].item;
  }
}

export function seedFromUuid(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    hash = ((hash << 5) - hash + uuid.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function seedFromDailyMission(userId: string, dateStr: string): number {
  const input = `${userId}:${dateStr}`;
  return seedFromUuid(input);
}
