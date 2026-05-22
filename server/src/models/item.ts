export type ItemType = 'core_fragment' | 'echo_core' | 'relic';
export type ItemTier = 1 | 2 | 3 | 4 | 5;

export interface ItemDefinition {
  itemType: ItemType;
  tier: ItemTier;
  bpValue: number;
  displayName: string;
}

export const ITEM_DEFINITIONS: Record<string, ItemDefinition> = {
  core_fragment_t1: { itemType: 'core_fragment', tier: 1, bpValue: 10, displayName: 'Core Fragment I' },
  core_fragment_t2: { itemType: 'core_fragment', tier: 2, bpValue: 25, displayName: 'Core Fragment II' },
  core_fragment_t3: { itemType: 'core_fragment', tier: 3, bpValue: 60, displayName: 'Core Fragment III' },
  echo_core_t1:     { itemType: 'echo_core',     tier: 1, bpValue: 30, displayName: 'Echo Core I' },
  echo_core_t2:     { itemType: 'echo_core',     tier: 2, bpValue: 80, displayName: 'Echo Core II' },
  echo_core_t3:     { itemType: 'echo_core',     tier: 3, bpValue: 200, displayName: 'Echo Core III' },
  relic_t1:         { itemType: 'relic',         tier: 1, bpValue: 50, displayName: 'Relic I' },
  relic_t2:         { itemType: 'relic',         tier: 2, bpValue: 150, displayName: 'Relic II' },
  relic_t3:         { itemType: 'relic',         tier: 3, bpValue: 400, displayName: 'Relic III' },
};

export const MAX_EQUIPPED_CORE_FRAGMENTS = 5;
export const MAX_EQUIPPED_ECHO_CORES = 3;
export const MAX_EQUIPPED_RELICS = 2;

export function computeBP(
  equippedFragmentIds: string[],
  equippedCoreIds: string[],
  equippedRelicIds: string[]
): number {
  let bp = 100;

  for (const id of equippedFragmentIds) {
    const def = ITEM_DEFINITIONS[id];
    if (def) bp += def.bpValue;
  }

  const relicCount = equippedRelicIds.length;
  const coreMultiplier = 1 + 0.05 * relicCount;

  for (const id of equippedCoreIds) {
    const def = ITEM_DEFINITIONS[id];
    if (def) bp += def.bpValue * coreMultiplier;
  }

  for (const id of equippedRelicIds) {
    const def = ITEM_DEFINITIONS[id];
    if (def) bp += def.bpValue;
  }

  return Math.floor(bp);
}

export interface MissionTemplate {
  missionId: string;
  type: 'walk_distance' | 'defeat_echoes' | 'capture_zone' | 'patrol_waypoint';
  targetValue: number;
  description: string;
  rewardItemId: string;
  rewardQuantity: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const MISSION_TEMPLATES: MissionTemplate[] = [
  { missionId: 'walk_1km',   type: 'walk_distance',  targetValue: 1000, description: 'Walk 1 km',  rewardItemId: 'core_fragment_t1', rewardQuantity: 3, difficulty: 'easy' },
  { missionId: 'walk_3km',   type: 'walk_distance',  targetValue: 3000, description: 'Walk 3 km',  rewardItemId: 'core_fragment_t2', rewardQuantity: 2, difficulty: 'medium' },
  { missionId: 'walk_5km',   type: 'walk_distance',  targetValue: 5000, description: 'Walk 5 km',  rewardItemId: 'echo_core_t1',     rewardQuantity: 1, difficulty: 'hard' },
  { missionId: 'defeat_3c',  type: 'defeat_echoes',  targetValue: 3,    description: 'Defeat 3 Common Echoes', rewardItemId: 'core_fragment_t1', rewardQuantity: 5, difficulty: 'easy' },
  { missionId: 'defeat_1e',  type: 'defeat_echoes',  targetValue: 1,    description: 'Defeat 1 Elite Echo',   rewardItemId: 'echo_core_t1',     rewardQuantity: 1, difficulty: 'medium' },
  { missionId: 'capture_1',  type: 'capture_zone',   targetValue: 1,    description: 'Capture a zone',        rewardItemId: 'core_fragment_t2', rewardQuantity: 3, difficulty: 'medium' },
];
