export type FactionType = 'veil' | 'surge' | 'null_faction';

export interface GPSSample {
  lat: number;
  lng: number;
  accuracy: number;
  timestampMs: number;
  speedKmh: number;
}

export interface EquippedItems {
  coreFragmentIds: string[];
  echoCoreIds: string[];
  relicIds: string[];
}

export interface ViolationFlags {
  speedViolations: number;
  mockViolations: number;
  teleportViolations: number;
  lastViolationTimestamp: number;
  isSuspended: boolean;
  suspendedUntil: number;
}

export interface PlayerProfile {
  userId: string;
  displayName: string;
  bp: number;
  faction: FactionType | null;
  walkDistanceTodayMeters: number;
  totalWalkDistanceMeters: number;
  lastLoginTimestamp: number;
  accountCreatedTimestamp: number;
  equippedItems: EquippedItems;
  violationFlags: ViolationFlags;
  cooldownUntil: number;
  cumulativeDistanceM: number;
  nextEncounterThresholdM: number;
  lastPosition: GPSSample | null;
}

export interface InventorySlot {
  itemId: string;
  itemType: 'core_fragment' | 'echo_core' | 'relic';
  quantity: number;
  tier: 1 | 2 | 3 | 4 | 5;
  bpValue: number;
  acquiredTimestamp: number;
}

export interface PlayerInventory {
  userId: string;
  slots: Record<string, InventorySlot>;
}

export interface GPSHistoryRecord {
  userId: string;
  samples: GPSSample[];
}

export function defaultPlayerProfile(userId: string, displayName: string): PlayerProfile {
  return {
    userId,
    displayName,
    bp: 100,
    faction: null,
    walkDistanceTodayMeters: 0,
    totalWalkDistanceMeters: 0,
    lastLoginTimestamp: Date.now(),
    accountCreatedTimestamp: Date.now(),
    equippedItems: { coreFragmentIds: [], echoCoreIds: [], relicIds: [] },
    violationFlags: {
      speedViolations: 0,
      mockViolations: 0,
      teleportViolations: 0,
      lastViolationTimestamp: 0,
      isSuspended: false,
      suspendedUntil: 0,
    },
    cooldownUntil: 0,
    cumulativeDistanceM: 0,
    nextEncounterThresholdM: 100 + Math.random() * 400,
    lastPosition: null,
  };
}

export function defaultInventory(userId: string): PlayerInventory {
  return { userId, slots: {} };
}
