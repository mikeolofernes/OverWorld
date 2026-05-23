import {
  echoBattlePower,
  echoInfluence,
  echoWeights,
  encounterDistanceRange,
  movementRules,
  upgradeCosts
} from "./tuning";
import type {
  BattleResult,
  Echo,
  FactionId,
  GameState,
  Inventory,
  LocationSample,
  MovementResult,
  Player,
  PlayerOpponent,
  PvPResult,
  TerritoryCell
} from "./types";
import { integerBetween, mulberry32, pickWeighted } from "./random";

const emptyLoot = (): Inventory => ({
  coreFragments: 0,
  echoCores: 0,
  relics: 0
});

export function createInitialTerritory(): TerritoryCell[] {
  return [
    createCell("cell-north", "Public Market", { verdant: 34, ember: 18, lumen: 26 }, 4),
    createCell("cell-market", "Bacoor Church", { verdant: 20, ember: 38, lumen: 22 }, 6),
    createCell("cell-river", "Baywalk Paseo", { verdant: 18, ember: 21, lumen: 41 }, 5),
    createCell("cell-station", "Fish Port", { verdant: 27, ember: 28, lumen: 24 }, 7),
    createCell("cell-park", "City Hall", { verdant: 44, ember: 13, lumen: 20 }, 3),
    createCell("cell-harbor", "Govt Center", { verdant: 16, ember: 35, lumen: 29 }, 8)
  ];
}

export function createInitialState(): GameState {
  const random = mulberry32(90817);

  return {
    walkState: "idle",
    player: {
      level: 1,
      xp: 0,
      baseBattlePower: 72,
      factionId: null,
      inventory: {
        coreFragments: 18,
        echoCores: 1,
        relics: 0
      }
    },
    playerCellId: "cell-market",
    territory: createInitialTerritory(),
    creditedDistanceMeters: 0,
    nextEncounterAtMeters: integerBetween(
      random,
      encounterDistanceRange.min,
      encounterDistanceRange.max
    ),
    currentEncounter: null,
    encounterLog: ["AETHER handshake ready. Choose a faction, then start walking."],
    cooldownUntilTick: null,
    tick: 0
  };
}

export function calculatePlayerBattlePower(player: Player) {
  const inventoryBoost =
    player.inventory.coreFragments * 0.7 +
    player.inventory.echoCores * 8 +
    player.inventory.relics * 16;

  return Math.round(player.baseBattlePower + player.level * 10 + inventoryBoost);
}

export function validateMovement(sample: LocationSample): MovementResult {
  if (sample.elapsedSeconds <= 0) {
    return {
      accepted: false,
      creditedMeters: 0,
      rejectedReason: "Bad timestamp"
    };
  }

  if (sample.accuracyMeters > movementRules.maxAccuracyMeters) {
    return {
      accepted: false,
      creditedMeters: 0,
      rejectedReason: "GPS accuracy too low"
    };
  }

  const speed = sample.distanceMeters / sample.elapsedSeconds;

  if (speed > movementRules.maxWalkingSpeedMps) {
    return {
      accepted: false,
      creditedMeters: 0,
      rejectedReason: "Movement too fast"
    };
  }

  return {
    accepted: true,
    creditedMeters: Math.min(sample.distanceMeters, movementRules.maxCreditPerSampleMeters)
  };
}

export function maybeCreateEncounter(state: GameState): Echo | null {
  if (state.currentEncounter || state.creditedDistanceMeters < state.nextEncounterAtMeters) {
    return null;
  }

  const random = mulberry32(state.tick * 991 + Math.round(state.creditedDistanceMeters) + 41);
  const type = pickWeighted(random, echoWeights);
  const [minBp, maxBp] = echoBattlePower[type];
  const level = integerBetween(random, Math.max(1, state.player.level - 1), state.player.level + 2);
  const battlePower = integerBetween(random, minBp, maxBp) + level * 8;

  return {
    id: `echo-${state.tick}-${Math.round(state.creditedDistanceMeters)}`,
    type,
    level,
    battlePower,
    cellId: state.playerCellId
  };
}

export function resolveBattle(player: Player, echo: Echo, seed: number): BattleResult {
  const random = mulberry32(seed);
  const playerBattlePower = calculatePlayerBattlePower(player);
  const enemyBattlePower = echo.battlePower;
  const winProbability = playerBattlePower / (playerBattlePower + enemyBattlePower);
  const won = random() <= winProbability;
  const loot = emptyLoot();

  if (won) {
    loot.coreFragments = echo.type === "Common" ? 12 : echo.type === "Elite" ? 24 : 48;
    loot.echoCores = echo.type === "Common" ? 1 : echo.type === "Elite" ? 2 : 4;
    loot.relics = echo.type === "Apex" && random() > 0.55 ? 1 : 0;
  }

  return {
    won,
    playerBattlePower,
    enemyBattlePower,
    winProbability,
    xp: won ? echo.level * 18 : 0,
    loot,
    influenceGain: won ? echoInfluence[echo.type] : 0
  };
}

export function applyBattleResult(
  state: GameState,
  result: BattleResult,
  factionId: FactionId | null
): GameState {
  const nextPlayer = {
    ...state.player,
    xp: state.player.xp + result.xp,
    inventory: {
      coreFragments: state.player.inventory.coreFragments + result.loot.coreFragments,
      echoCores: state.player.inventory.echoCores + result.loot.echoCores,
      relics: state.player.inventory.relics + result.loot.relics
    }
  };

  while (nextPlayer.xp >= nextPlayer.level * 100) {
    nextPlayer.xp -= nextPlayer.level * 100;
    nextPlayer.level += 1;
    nextPlayer.baseBattlePower += 8;
  }

  const territory = state.territory.map((cell) => {
    if (!factionId || cell.id !== state.playerCellId || result.influenceGain === 0) {
      return cell;
    }

    return normalizeOwner({
      ...cell,
      activity: Math.min(10, cell.activity + 1),
      influence: {
        ...cell.influence,
        [factionId]: cell.influence[factionId] + result.influenceGain
      }
    });
  });

  const random = mulberry32(state.tick * 17 + result.enemyBattlePower);

  return {
    ...state,
    player: nextPlayer,
    territory,
    currentEncounter: null,
    nextEncounterAtMeters:
      state.creditedDistanceMeters +
      integerBetween(random, encounterDistanceRange.min, encounterDistanceRange.max),
    walkState: result.won ? "walking" : "cooldown",
    cooldownUntilTick: result.won ? null : state.tick + 3,
    encounterLog: [
      result.won
        ? `Echo contained. +${result.xp} XP, +${result.loot.coreFragments} fragments, +${result.influenceGain} influence.`
        : "Echo overwhelmed you. Cooldown applied, no loot lost.",
      ...state.encounterLog
    ].slice(0, 6)
  };
}

export function upgradePlayer(player: Player): Player {
  if (
    player.inventory.coreFragments < upgradeCosts.coreFragments ||
    player.inventory.echoCores < upgradeCosts.echoCores
  ) {
    return player;
  }

  return {
    ...player,
    baseBattlePower: player.baseBattlePower + 14,
    inventory: {
      ...player.inventory,
      coreFragments: player.inventory.coreFragments - upgradeCosts.coreFragments,
      echoCores: player.inventory.echoCores - upgradeCosts.echoCores
    }
  };
}

export function normalizeOwner(cell: TerritoryCell): TerritoryCell {
  const leaders = Object.entries(cell.influence).sort((a, b) => b[1] - a[1]);
  const [winner, score] = leaders[0] as [FactionId, number];
  const second = leaders[1]?.[1] ?? 0;

  return {
    ...cell,
    owner: score >= 30 && score - second >= 4 ? winner : null
  };
}

// ── PvP / Faction-vs-Faction ──────────────────────────────────────

const OPPONENT_NAMES = [
  "Enzo_B", "Chloe_M", "Kian_R", "Dani_V", "Marco_P",
  "Lea_C", "Renz_G", "Ysabel_T", "Jed_N", "Mira_L",
  "Gab_S", "Trish_A", "Ivan_D", "Nova_F", "Rex_H"
];

export function generateOpponents(
  enemyFactionId: FactionId,
  playerLevel: number,
  seed: number
): PlayerOpponent[] {
  const rng = mulberry32(seed);
  return Array.from({ length: 4 }, (_, i) => {
    const level = integerBetween(rng, Math.max(1, playerLevel - 2), playerLevel + 3);
    const baseBp = integerBetween(rng, 55, 95) + level * 12;
    const nameIdx = Math.floor(rng() * OPPONENT_NAMES.length);
    return {
      id: `opp-${i}-${seed}`,
      name: OPPONENT_NAMES[nameIdx],
      factionId: enemyFactionId,
      level,
      battlePower: baseBp
    };
  });
}

export function resolvePvpBattle(myBp: number, enemyBp: number, seed: number): PvPResult {
  const rng = mulberry32(seed);
  const winProbability = myBp / (myBp + enemyBp);
  const won = rng() <= winProbability;
  return { won, myBp, enemyBp, winProbability, scoreGained: won ? enemyBp : 0 };
}

export function generateFvFScores(
  playerScore: number,
  playerFactionId: FactionId,
  enemyFactionId: FactionId,
  seed: number
): Record<FactionId, number> {
  const rng = mulberry32(seed);
  // 3 allied bots score between 40–220 each
  const allyExtra = Array.from({ length: 3 }, () => integerBetween(rng, 40, 220)).reduce((a, b) => a + b, 0);
  // 4 enemy players score between 40–220 each
  const enemyTotal = Array.from({ length: 4 }, () => integerBetween(rng, 40, 220)).reduce((a, b) => a + b, 0);
  const scores: Record<FactionId, number> = { verdant: 0, ember: 0, lumen: 0 };
  scores[playerFactionId] = playerScore + allyExtra;
  scores[enemyFactionId] = enemyTotal;
  return scores;
}

function createCell(
  id: string,
  label: string,
  influence: Record<FactionId, number>,
  activity: number
): TerritoryCell {
  return normalizeOwner({
    id,
    label,
    influence,
    owner: null,
    activity
  });
}
