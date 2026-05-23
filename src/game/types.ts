export type EchoType = "Common" | "Elite" | "Apex";

export type FactionId = "verdant" | "ember" | "lumen";

export type EncounterStatus = "active" | "won" | "lost" | "expired";

export type WalkState = "idle" | "walking" | "cooldown";

export interface Faction {
  id: FactionId;
  name: string;
  color: string;
  motto: string;
}

export interface Echo {
  id: string;
  type: EchoType;
  level: number;
  battlePower: number;
  cellId: string;
}

export interface Inventory {
  coreFragments: number;
  echoCores: number;
  relics: number;
}

export interface Player {
  level: number;
  xp: number;
  baseBattlePower: number;
  factionId: FactionId | null;
  inventory: Inventory;
}

export interface TerritoryCell {
  id: string;
  label: string;
  influence: Record<FactionId, number>;
  owner: FactionId | null;
  activity: number;
}

export interface LocationSample {
  distanceMeters: number;
  elapsedSeconds: number;
  accuracyMeters: number;
}

export interface MovementResult {
  accepted: boolean;
  creditedMeters: number;
  rejectedReason?: string;
}

export interface BattleResult {
  won: boolean;
  playerBattlePower: number;
  enemyBattlePower: number;
  winProbability: number;
  xp: number;
  loot: Inventory;
  influenceGain: number;
}

export interface GameState {
  walkState: WalkState;
  player: Player;
  playerCellId: string;
  territory: TerritoryCell[];
  creditedDistanceMeters: number;
  nextEncounterAtMeters: number;
  currentEncounter: Echo | null;
  encounterLog: string[];
  cooldownUntilTick: number | null;
  tick: number;
}
