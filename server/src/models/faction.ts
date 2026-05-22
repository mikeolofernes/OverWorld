import { FactionType } from './player';
export type { FactionType };

export interface FactionStats {
  factionName: FactionType;
  totalZoneCount: number;
  totalMemberBP: number;
  memberCount: number;
  weeklyCaptures: number;
  bpBuffMultiplier: number;
  lootBonusPercent: number;
}

export interface FactionBuff {
  bpMultiplier: number;
  lootBonusPercent: number;
  zoneCount: number;
}

export const FACTION_BP_BUFF_PER_10_ZONES = 0.05;
export const FACTION_LOOT_BUFF_PER_10_ZONES = 0.02;
export const MAX_BP_BUFF = 0.25;
export const MAX_LOOT_BUFF = 0.10;

export function defaultFactionStats(factionName: FactionType): FactionStats {
  return {
    factionName,
    totalZoneCount: 0,
    totalMemberBP: 0,
    memberCount: 0,
    weeklyCaptures: 0,
    bpBuffMultiplier: 1.0,
    lootBonusPercent: 0,
  };
}

export function computeFactionBuff(zoneCount: number): FactionBuff {
  const steps = Math.floor(zoneCount / 10);
  const bpBonus = Math.min(steps * FACTION_BP_BUFF_PER_10_ZONES, MAX_BP_BUFF);
  const lootBonus = Math.min(steps * FACTION_LOOT_BUFF_PER_10_ZONES, MAX_LOOT_BUFF);
  return {
    bpMultiplier: 1 + bpBonus,
    lootBonusPercent: lootBonus,
    zoneCount,
  };
}
