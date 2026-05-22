import { EchoType, LootItem } from '../models/echo';
import { SeededRng } from '../utils/rng';

interface LootEntry {
  itemId: string;
  itemType: 'core_fragment' | 'echo_core' | 'relic';
  tier: 1 | 2 | 3;
  bpValue: number;
  minQty: number;
  maxQty: number;
  weight: number;
}

const LOOT_TABLES: Record<EchoType, LootEntry[]> = {
  common: [
    { itemId: 'core_fragment_t1', itemType: 'core_fragment', tier: 1, bpValue: 10, minQty: 1, maxQty: 3, weight: 0.70 },
    { itemId: 'core_fragment_t2', itemType: 'core_fragment', tier: 2, bpValue: 25, minQty: 1, maxQty: 1, weight: 0.20 },
    { itemId: 'echo_core_t1',     itemType: 'echo_core',     tier: 1, bpValue: 30, minQty: 1, maxQty: 1, weight: 0.10 },
  ],
  elite: [
    { itemId: 'core_fragment_t2', itemType: 'core_fragment', tier: 2, bpValue: 25, minQty: 2, maxQty: 5, weight: 0.40 },
    { itemId: 'echo_core_t1',     itemType: 'echo_core',     tier: 1, bpValue: 30, minQty: 1, maxQty: 2, weight: 0.35 },
    { itemId: 'echo_core_t2',     itemType: 'echo_core',     tier: 2, bpValue: 80, minQty: 1, maxQty: 1, weight: 0.20 },
    { itemId: 'relic_t1',         itemType: 'relic',         tier: 1, bpValue: 50, minQty: 1, maxQty: 1, weight: 0.05 },
  ],
  apex: [
    { itemId: 'echo_core_t2',  itemType: 'echo_core', tier: 2, bpValue: 80,  minQty: 2, maxQty: 3, weight: 0.15 },
    { itemId: 'echo_core_t3',  itemType: 'echo_core', tier: 3, bpValue: 200, minQty: 1, maxQty: 1, weight: 0.15 },
    { itemId: 'relic_t1',      itemType: 'relic',     tier: 1, bpValue: 50,  minQty: 1, maxQty: 2, weight: 0.35 },
    { itemId: 'relic_t2',      itemType: 'relic',     tier: 2, bpValue: 150, minQty: 1, maxQty: 1, weight: 0.30 },
    { itemId: 'relic_t3',      itemType: 'relic',     tier: 3, bpValue: 400, minQty: 1, maxQty: 1, weight: 0.05 },
  ],
};

export function rollLoot(echoType: EchoType, rng: SeededRng): LootItem[] {
  const table = LOOT_TABLES[echoType];
  const entry = rng.weightedChoice(table.map((e) => ({ item: e, weight: e.weight })));
  const quantity = rng.nextIntInRange(entry.minQty, entry.maxQty);
  return [
    {
      itemId: entry.itemId,
      itemType: entry.itemType,
      tier: entry.tier,
      bpValue: entry.bpValue,
      quantity,
    },
  ];
}

export function applyLootToInventory(
  inventory: Record<string, { itemId: string; itemType: string; quantity: number; tier: number; bpValue: number; acquiredTimestamp: number }>,
  loot: LootItem[]
): void {
  for (const item of loot) {
    if (inventory[item.itemId]) {
      inventory[item.itemId].quantity += item.quantity;
    } else {
      inventory[item.itemId] = {
        itemId: item.itemId,
        itemType: item.itemType,
        quantity: item.quantity,
        tier: item.tier,
        bpValue: item.bpValue,
        acquiredTimestamp: Date.now(),
      };
    }
  }
}
