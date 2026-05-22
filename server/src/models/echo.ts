export type EchoType = 'common' | 'elite' | 'apex';

export interface EchoSpawnData {
  echoId: string;
  type: EchoType;
  bp: number;
  spawnLat: number;
  spawnLng: number;
  spawnedAt: number;
  expiresAt: number;
  encounterToken: string;
}

export interface PendingEncounter {
  userId: string;
  echoId: string;
  type: EchoType;
  echoBP: number;
  spawnLat: number;
  spawnLng: number;
  encounterToken: string;
  createdTimestamp: number;
}

export interface BattleResult {
  echoId: string;
  outcome: 'win' | 'lose';
  loot: LootItem[];
  xpGained: number;
  cooldownUntil: number;
  newBP: number;
}

export interface LootItem {
  itemId: string;
  itemType: 'core_fragment' | 'echo_core' | 'relic';
  tier: 1 | 2 | 3;
  bpValue: number;
  quantity: number;
}

export const ECHO_BP_RANGES: Record<EchoType, { min: number; max: number }> = {
  common: { min: 50, max: 150 },
  elite: { min: 200, max: 500 },
  apex: { min: 800, max: 2000 },
};

export const ECHO_TTL_MS: Record<EchoType, number> = {
  common: 5 * 60 * 1000,
  elite: 15 * 60 * 1000,
  apex: 15 * 60 * 1000,
};

export const ECHO_XP: Record<EchoType, number> = {
  common: 50,
  elite: 200,
  apex: 1000,
};

export const ECHO_COOLDOWN_MS: Record<EchoType, number> = {
  common: 30 * 1000,
  elite: 60 * 1000,
  apex: 120 * 1000,
};

export const ECHO_SPAWN_WEIGHTS: Array<{ type: EchoType; weight: number }> = [
  { type: 'common', weight: 0.70 },
  { type: 'elite', weight: 0.25 },
  { type: 'apex', weight: 0.05 },
];
