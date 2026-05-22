import { MISSION_TEMPLATES, MissionTemplate } from '../models/item';
import { SeededRng, seedFromDailyMission } from '../utils/rng';
import { NOTIFICATION_MISSION_COMPLETE, sendNotification } from './notificationModule';
import { readInventory, writeInventory } from './playerModule';
import { applyLootToInventory } from './lootModule';

export const STORAGE_COLLECTION_MISSIONS = 'daily_missions';
export const DAILY_MISSION_COUNT = 3;

export interface DailyMission {
  missionId: string;
  type: string;
  targetValue: number;
  description: string;
  rewardItemId: string;
  rewardQuantity: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

export function getDailyMissions(nk: nkruntime.Runtime, userId: string): DailyMission[] {
  const today = getTodayDateStr();
  const key = `${userId}:${today}`;

  try {
    const stored = nk.storageRead([{ collection: STORAGE_COLLECTION_MISSIONS, key, userId }]);
    if (stored.length > 0) return JSON.parse(stored[0].value) as DailyMission[];
  } catch (_) {
    // generate new
  }

  const seed = seedFromDailyMission(userId, today);
  const rng = new SeededRng(seed);
  const selected: DailyMission[] = [];
  const pool = [...MISSION_TEMPLATES];

  for (let i = 0; i < DAILY_MISSION_COUNT && pool.length > 0; i++) {
    const idx = rng.nextIntInRange(0, pool.length - 1);
    const template = pool.splice(idx, 1)[0];
    selected.push({
      missionId: template.missionId,
      type: template.type,
      targetValue: template.targetValue,
      description: template.description,
      rewardItemId: template.rewardItemId,
      rewardQuantity: template.rewardQuantity,
      progress: 0,
      completed: false,
      claimed: false,
    });
  }

  nk.storageWrite([{
    collection: STORAGE_COLLECTION_MISSIONS,
    key,
    userId,
    value: JSON.stringify(selected),
    permissionRead: 1,
    permissionWrite: 0,
  }]);

  return selected;
}

export function claimMissionReward(
  nk: nkruntime.Runtime,
  userId: string,
  missionId: string
): { success: boolean; error?: string } {
  const today = getTodayDateStr();
  const key = `${userId}:${today}`;

  let missions: DailyMission[];
  try {
    const stored = nk.storageRead([{ collection: STORAGE_COLLECTION_MISSIONS, key, userId }]);
    if (stored.length === 0) return { success: false, error: 'NO_MISSIONS' };
    missions = JSON.parse(stored[0].value) as DailyMission[];
  } catch (_) {
    return { success: false, error: 'READ_FAILED' };
  }

  const mission = missions.find((m) => m.missionId === missionId);
  if (!mission) return { success: false, error: 'MISSION_NOT_FOUND' };
  if (!mission.completed) return { success: false, error: 'NOT_COMPLETED' };
  if (mission.claimed) return { success: false, error: 'ALREADY_CLAIMED' };

  mission.claimed = true;
  const inventory = readInventory(nk, userId);
  applyLootToInventory(inventory.slots, [{
    itemId: mission.rewardItemId,
    itemType: 'core_fragment',
    tier: 1,
    bpValue: 10,
    quantity: mission.rewardQuantity,
  }]);
  writeInventory(nk, userId, inventory);

  nk.storageWrite([{
    collection: STORAGE_COLLECTION_MISSIONS,
    key,
    userId,
    value: JSON.stringify(missions),
    permissionRead: 1,
    permissionWrite: 0,
  }]);

  sendNotification(nk, userId, NOTIFICATION_MISSION_COMPLETE, 'Mission Claimed', { missionId }, true);
  return { success: true };
}

export function updateMissionProgress(
  nk: nkruntime.Runtime,
  userId: string,
  progressType: 'walk_distance' | 'defeat_echoes' | 'capture_zone',
  value: number
): void {
  const today = getTodayDateStr();
  const key = `${userId}:${today}`;
  let missions: DailyMission[];
  try {
    const stored = nk.storageRead([{ collection: STORAGE_COLLECTION_MISSIONS, key, userId }]);
    if (stored.length === 0) return;
    missions = JSON.parse(stored[0].value) as DailyMission[];
  } catch (_) {
    return;
  }

  let changed = false;
  for (const m of missions) {
    if (!m.completed && m.type === progressType) {
      m.progress = Math.min(m.targetValue, m.progress + value);
      if (m.progress >= m.targetValue) m.completed = true;
      changed = true;
    }
  }

  if (changed) {
    nk.storageWrite([{
      collection: STORAGE_COLLECTION_MISSIONS,
      key,
      userId,
      value: JSON.stringify(missions),
      permissionRead: 1,
      permissionWrite: 0,
    }]);
  }
}
