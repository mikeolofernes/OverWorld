export const LEADERBOARD_GLOBAL_BP       = 'global_bp';
export const LEADERBOARD_FACTION_TERRITORY = 'faction_territory';

export function initLeaderboards(nk: nkruntime.Runtime): void {
  try {
    nk.leaderboardCreate(LEADERBOARD_GLOBAL_BP, false, 'desc', 'set', undefined, true);
    nk.leaderboardCreate(LEADERBOARD_FACTION_TERRITORY, false, 'desc', 'set', undefined, true);
  } catch (_) {
    // already exist
  }
}

export function updateBPScore(nk: nkruntime.Runtime, userId: string, bp: number): void {
  nk.leaderboardRecordWrite(LEADERBOARD_GLOBAL_BP, userId, bp, 0, undefined, undefined);
}

export function updateFactionTerritoryScore(nk: nkruntime.Runtime, faction: string, score: number): void {
  nk.leaderboardRecordWrite(LEADERBOARD_FACTION_TERRITORY, faction, score, 0, undefined, undefined);
}

export function getTopPlayers(
  nk: nkruntime.Runtime,
  userId: string,
  limit: number = 100
): object {
  const records = nk.leaderboardRecordsList(LEADERBOARD_GLOBAL_BP, [], limit, undefined, 0);
  return { records: records.records, ownerRecords: records.ownerRecords };
}
