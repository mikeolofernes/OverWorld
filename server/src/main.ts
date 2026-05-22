import {
  handleEncounterRequest,
  EncounterRequest,
  STORAGE_COLLECTION_GPS_HISTORY,
} from './modules/encounterModule';
import { resolveBattle, BattleRequest } from './modules/battleModule';
import { applyLootToInventory } from './modules/lootModule';
import { handleCaptureTerritory, getNearbyTerritories } from './modules/territoryModule';
import { handleJoinFaction, updateFactionZoneCount } from './modules/factionModule';
import {
  readPlayerProfile,
  writePlayerProfile,
  readInventory,
  writeInventory,
  handleEquipItem,
  STORAGE_COLLECTION_PLAYERS,
} from './modules/playerModule';
import { getDailyMissions, claimMissionReward, updateMissionProgress } from './modules/missionModule';
import { initLeaderboards, updateBPScore, updateFactionTerritoryScore, getTopPlayers } from './modules/leaderboardModule';
import { verifyToken, buildLootTokenPayload } from './utils/hmac';
import { GPSHistoryRecord } from './models/player';
import { FactionType } from './models/player';
import { CaptureRequest } from './models/territory';

function rpcEncounterRequest(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Runtime,
  payload: string
): string {
  const req = JSON.parse(payload) as EncounterRequest;
  const userId = ctx.userId;

  let history: GPSHistoryRecord;
  try {
    const stored = nk.storageRead([{ collection: STORAGE_COLLECTION_GPS_HISTORY, key: userId, userId }]);
    history = stored.length > 0 ? JSON.parse(stored[0].value) as GPSHistoryRecord : { userId, samples: [] };
  } catch (_) {
    history = { userId, samples: [] };
  }

  const profile = readPlayerProfile(nk, userId, ctx.username ?? '');
  const response = handleEncounterRequest(nk, logger, userId, req, profile, history);

  writePlayerProfile(nk, userId, profile);
  nk.storageWrite([{
    collection: STORAGE_COLLECTION_GPS_HISTORY,
    key: userId,
    userId,
    value: JSON.stringify(history),
    permissionRead: 0,
    permissionWrite: 0,
  }]);

  if (response.triggered && response.echo) {
    updateMissionProgress(nk, userId, 'walk_distance', profile.walkDistanceTodayMeters);
  }

  return JSON.stringify(response);
}

function rpcBattleResolve(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Runtime,
  payload: string
): string {
  const req = JSON.parse(payload) as BattleRequest;
  const userId = ctx.userId;
  const profile = readPlayerProfile(nk, userId);
  const result = resolveBattle(nk, userId, req, profile);

  if ('error' in result) return JSON.stringify(result);

  writePlayerProfile(nk, userId, profile);
  updateBPScore(nk, userId, profile.bp);

  if (result.result.outcome === 'win') {
    updateMissionProgress(nk, userId, 'defeat_echoes', 1);
  }

  return JSON.stringify(result);
}

function rpcLootClaim(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Runtime,
  payload: string
): string {
  const { lootToken, battleId, timestamp, items } = JSON.parse(payload) as {
    lootToken: string;
    battleId: string;
    timestamp: number;
    items: Array<{ itemId: string; itemType: string; tier: number; bpValue: number; quantity: number }>;
  };
  const userId = ctx.userId;

  const tokenPayload = buildLootTokenPayload(userId, battleId, timestamp);
  if (!verifyToken(tokenPayload, lootToken)) {
    return JSON.stringify({ success: false, error: 'TOKEN_INVALID' });
  }

  if (Date.now() - timestamp > 120000) {
    return JSON.stringify({ success: false, error: 'TOKEN_EXPIRED' });
  }

  const inventory = readInventory(nk, userId);
  applyLootToInventory(inventory.slots, items as any);
  writeInventory(nk, userId, inventory);

  return JSON.stringify({ success: true });
}

function rpcCaptureTerritory(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Runtime,
  payload: string
): string {
  const req = JSON.parse(payload) as CaptureRequest;
  const userId = ctx.userId;
  const profile = readPlayerProfile(nk, userId);
  const prevOwner = null;

  const response = handleCaptureTerritory(nk, logger, userId, profile.faction, req, profile.bp);

  if (response.success && response.newOwner) {
    updateFactionZoneCount(nk, response.newOwner, 1);
    if (prevOwner && prevOwner !== response.newOwner) {
      updateFactionZoneCount(nk, prevOwner as FactionType, -1);
    }
    updateMissionProgress(nk, userId, 'capture_zone', 1);
  }

  return JSON.stringify(response);
}

function rpcGetNearbyTerritories(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Runtime,
  payload: string
): string {
  const { lat, lng } = JSON.parse(payload) as { lat: number; lng: number };
  const territories = getNearbyTerritories(nk, lat, lng);
  return JSON.stringify({ territories });
}

function rpcJoinFaction(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Runtime,
  payload: string
): string {
  const { faction } = JSON.parse(payload) as { faction: FactionType };
  const userId = ctx.userId;
  const profile = readPlayerProfile(nk, userId, ctx.username ?? '');
  const result = handleJoinFaction(nk, userId, profile, faction);
  if (result.success) writePlayerProfile(nk, userId, profile);
  return JSON.stringify(result);
}

function rpcGetPlayerState(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Runtime,
  _payload: string
): string {
  const userId = ctx.userId;
  const profile = readPlayerProfile(nk, userId, ctx.username ?? '');
  const inventory = readInventory(nk, userId);
  return JSON.stringify({ profile, inventory });
}

function rpcEquipItem(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Runtime,
  payload: string
): string {
  const { itemId, equip } = JSON.parse(payload) as { itemId: string; equip: boolean };
  const result = handleEquipItem(nk, ctx.userId, itemId, equip);
  if (result.success) updateBPScore(nk, ctx.userId, result.newBP);
  return JSON.stringify(result);
}

function rpcGetDailyMissions(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Runtime,
  _payload: string
): string {
  const missions = getDailyMissions(nk, ctx.userId);
  return JSON.stringify({ missions });
}

function rpcClaimMissionReward(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Runtime,
  payload: string
): string {
  const { missionId } = JSON.parse(payload) as { missionId: string };
  return JSON.stringify(claimMissionReward(nk, ctx.userId, missionId));
}

function rpcGetLeaderboard(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Runtime,
  _payload: string
): string {
  return JSON.stringify(getTopPlayers(nk, ctx.userId));
}

// Must be a function declaration (not const) so esbuild keeps it at the top level
// and Nakama's goja runtime can find it via vm.Get("InitModule").
function InitModule(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Runtime,
  initializer: nkruntime.Initializer
): void {
  initLeaderboards(nk);

  initializer.registerRpc('rpc_encounter_request',    rpcEncounterRequest);
  initializer.registerRpc('rpc_battle_resolve',       rpcBattleResolve);
  initializer.registerRpc('rpc_loot_claim',           rpcLootClaim);
  initializer.registerRpc('rpc_capture_territory',    rpcCaptureTerritory);
  initializer.registerRpc('rpc_get_nearby_territories', rpcGetNearbyTerritories);
  initializer.registerRpc('rpc_join_faction',         rpcJoinFaction);
  initializer.registerRpc('rpc_get_player_state',     rpcGetPlayerState);
  initializer.registerRpc('rpc_equip_item',           rpcEquipItem);
  initializer.registerRpc('rpc_get_daily_missions',   rpcGetDailyMissions);
  initializer.registerRpc('rpc_claim_mission_reward', rpcClaimMissionReward);
  initializer.registerRpc('rpc_get_leaderboard',      rpcGetLeaderboard);

  logger.info('Overworld server runtime initialised — %d RPCs registered', 11);
};

