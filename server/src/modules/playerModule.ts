import { PlayerProfile, PlayerInventory, defaultPlayerProfile, defaultInventory } from '../models/player';
import { computeBP, MAX_EQUIPPED_CORE_FRAGMENTS, MAX_EQUIPPED_ECHO_CORES, MAX_EQUIPPED_RELICS, ITEM_DEFINITIONS } from '../models/item';

export const STORAGE_COLLECTION_PLAYERS   = 'player_profiles';
export const STORAGE_COLLECTION_INVENTORY = 'inventories';

export function readPlayerProfile(nk: nkruntime.Runtime, userId: string, displayName: string = ''): PlayerProfile {
  try {
    const stored = nk.storageRead([{ collection: STORAGE_COLLECTION_PLAYERS, key: userId, userId }]);
    if (stored.length > 0) return JSON.parse(stored[0].value) as PlayerProfile;
  } catch (_) {
    // fall through to default
  }
  return defaultPlayerProfile(userId, displayName);
}

export function writePlayerProfile(nk: nkruntime.Runtime, userId: string, profile: PlayerProfile): void {
  nk.storageWrite([{
    collection: STORAGE_COLLECTION_PLAYERS,
    key: userId,
    userId,
    value: JSON.stringify(profile),
    permissionRead: 1,
    permissionWrite: 0,
  }]);
}

export function readInventory(nk: nkruntime.Runtime, userId: string): PlayerInventory {
  try {
    const stored = nk.storageRead([{ collection: STORAGE_COLLECTION_INVENTORY, key: userId, userId }]);
    if (stored.length > 0) return JSON.parse(stored[0].value) as PlayerInventory;
  } catch (_) {
    // fall through
  }
  return defaultInventory(userId);
}

export function writeInventory(nk: nkruntime.Runtime, userId: string, inventory: PlayerInventory): void {
  nk.storageWrite([{
    collection: STORAGE_COLLECTION_INVENTORY,
    key: userId,
    userId,
    value: JSON.stringify(inventory),
    permissionRead: 1,
    permissionWrite: 0,
  }]);
}

export function handleEquipItem(
  nk: nkruntime.Runtime,
  userId: string,
  itemId: string,
  equip: boolean
): { success: boolean; newBP: number; error?: string } {
  const def = ITEM_DEFINITIONS[itemId];
  if (!def) return { success: false, newBP: 0, error: 'ITEM_NOT_FOUND' };

  const profile = readPlayerProfile(nk, userId);
  const inventory = readInventory(nk, userId);

  if (equip && !inventory.slots[itemId]) {
    return { success: false, newBP: profile.bp, error: 'NOT_IN_INVENTORY' };
  }

  const equipped = profile.equippedItems;

  if (def.itemType === 'core_fragment') {
    if (equip) {
      if (equipped.coreFragmentIds.length >= MAX_EQUIPPED_CORE_FRAGMENTS)
        return { success: false, newBP: profile.bp, error: 'SLOT_FULL' };
      if (!equipped.coreFragmentIds.includes(itemId)) equipped.coreFragmentIds.push(itemId);
    } else {
      equipped.coreFragmentIds = equipped.coreFragmentIds.filter((id) => id !== itemId);
    }
  } else if (def.itemType === 'echo_core') {
    if (equip) {
      if (equipped.echoCoreIds.length >= MAX_EQUIPPED_ECHO_CORES)
        return { success: false, newBP: profile.bp, error: 'SLOT_FULL' };
      if (!equipped.echoCoreIds.includes(itemId)) equipped.echoCoreIds.push(itemId);
    } else {
      equipped.echoCoreIds = equipped.echoCoreIds.filter((id) => id !== itemId);
    }
  } else if (def.itemType === 'relic') {
    if (equip) {
      if (equipped.relicIds.length >= MAX_EQUIPPED_RELICS)
        return { success: false, newBP: profile.bp, error: 'SLOT_FULL' };
      if (!equipped.relicIds.includes(itemId)) equipped.relicIds.push(itemId);
    } else {
      equipped.relicIds = equipped.relicIds.filter((id) => id !== itemId);
    }
  }

  profile.bp = computeBP(equipped.coreFragmentIds, equipped.echoCoreIds, equipped.relicIds);
  writePlayerProfile(nk, userId, profile);

  return { success: true, newBP: profile.bp };
}
