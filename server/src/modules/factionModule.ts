import { FactionType, FactionStats, defaultFactionStats, computeFactionBuff } from '../models/faction';
import { PlayerProfile } from '../models/player';
import { NOTIFICATION_FACTION_WAR } from './notificationModule';

export const STORAGE_COLLECTION_FACTION_STATS = 'faction_stats';

export function handleJoinFaction(
  nk: nkruntime.Runtime,
  userId: string,
  profile: PlayerProfile,
  factionName: FactionType
): { success: boolean; error?: string } {
  if (profile.faction !== null) {
    return { success: false, error: 'ALREADY_IN_FACTION' };
  }

  profile.faction = factionName;

  let stats = readFactionStats(nk, factionName);
  stats.memberCount++;
  stats.totalMemberBP += profile.bp;
  writeFactionStats(nk, factionName, stats);

  return { success: true };
}

export function updateFactionZoneCount(
  nk: nkruntime.Runtime,
  factionName: FactionType,
  delta: number
): void {
  const stats = readFactionStats(nk, factionName);
  stats.totalZoneCount = Math.max(0, stats.totalZoneCount + delta);
  stats.weeklyCaptures += delta > 0 ? delta : 0;

  const buff = computeFactionBuff(stats.totalZoneCount);
  stats.bpBuffMultiplier = buff.bpMultiplier;
  stats.lootBonusPercent = buff.lootBonusPercent;

  writeFactionStats(nk, factionName, stats);
}

export function getFactionBuff(nk: nkruntime.Runtime, factionName: FactionType) {
  const stats = readFactionStats(nk, factionName);
  return computeFactionBuff(stats.totalZoneCount);
}

export function readFactionStats(nk: nkruntime.Runtime, factionName: FactionType): FactionStats {
  try {
    const stored = nk.storageRead([
      { collection: STORAGE_COLLECTION_FACTION_STATS, key: factionName, userId: '' },
    ]);
    if (stored.length > 0) return JSON.parse(stored[0].value) as FactionStats;
  } catch (_) {
    // fall through
  }
  return defaultFactionStats(factionName);
}

function writeFactionStats(nk: nkruntime.Runtime, factionName: FactionType, stats: FactionStats): void {
  nk.storageWrite([{
    collection: STORAGE_COLLECTION_FACTION_STATS,
    key: factionName,
    userId: '',
    value: JSON.stringify(stats),
    permissionRead: 2,
    permissionWrite: 0,
  }]);
}
