import { describe, expect, it } from "vitest";
import {
  applyBattleResult,
  calculatePlayerBattlePower,
  createInitialState,
  maybeCreateEncounter,
  normalizeOwner,
  resolveBattle,
  upgradePlayer,
  validateMovement
} from "./serverSimulator";
import type { Echo, Player, TerritoryCell } from "./types";

describe("movement validation", () => {
  it("credits plausible walking samples", () => {
    const result = validateMovement({
      distanceMeters: 60,
      elapsedSeconds: 30,
      accuracyMeters: 18
    });

    expect(result.accepted).toBe(true);
    expect(result.creditedMeters).toBe(60);
  });

  it("rejects impossible walking speed", () => {
    const result = validateMovement({
      distanceMeters: 300,
      elapsedSeconds: 20,
      accuracyMeters: 8
    });

    expect(result.accepted).toBe(false);
    expect(result.rejectedReason).toBe("Movement too fast");
  });

  it("rejects low-confidence GPS samples", () => {
    const result = validateMovement({
      distanceMeters: 30,
      elapsedSeconds: 20,
      accuracyMeters: 100
    });

    expect(result.accepted).toBe(false);
    expect(result.rejectedReason).toBe("GPS accuracy too low");
  });
});

describe("encounter and battle flow", () => {
  it("creates an encounter once credited distance reaches the threshold", () => {
    const state = {
      ...createInitialState(),
      creditedDistanceMeters: 500,
      nextEncounterAtMeters: 120,
      tick: 4
    };

    const encounter = maybeCreateEncounter(state);

    expect(encounter).not.toBeNull();
    expect(encounter?.battlePower).toBeGreaterThan(0);
    expect(encounter?.cellId).toBe(state.playerCellId);
  });

  it("uses the GDD battle probability formula", () => {
    const player: Player = {
      level: 1,
      xp: 0,
      baseBattlePower: 100,
      factionId: "verdant",
      inventory: {
        coreFragments: 0,
        echoCores: 0,
        relics: 0
      }
    };
    const echo: Echo = {
      id: "echo-test",
      type: "Common",
      level: 1,
      battlePower: 110,
      cellId: "cell-market"
    };

    const result = resolveBattle(player, echo, 12);

    expect(result.playerBattlePower).toBe(calculatePlayerBattlePower(player));
    expect(result.winProbability).toBeCloseTo(
      result.playerBattlePower / (result.playerBattlePower + result.enemyBattlePower),
      5
    );
  });

  it("applies winning battle rewards and faction influence", () => {
    const state = createInitialState();
    const result = {
      won: true,
      playerBattlePower: 120,
      enemyBattlePower: 80,
      winProbability: 0.6,
      xp: 25,
      loot: {
        coreFragments: 12,
        echoCores: 1,
        relics: 0
      },
      influenceGain: 8
    };

    const next = applyBattleResult(
      {
        ...state,
        player: {
          ...state.player,
          factionId: "verdant"
        }
      },
      result,
      "verdant"
    );

    const previousCell = state.territory.find((cell) => cell.id === state.playerCellId)!;
    const nextCell = next.territory.find((cell) => cell.id === state.playerCellId)!;

    expect(next.player.inventory.coreFragments).toBe(state.player.inventory.coreFragments + 12);
    expect(next.player.xp).toBe(state.player.xp + 25);
    expect(nextCell.influence.verdant).toBe(previousCell.influence.verdant + 8);
  });
});

describe("progression and territory", () => {
  it("spends items to upgrade battle power", () => {
    const state = createInitialState();
    const upgraded = upgradePlayer({
      ...state.player,
      inventory: {
        coreFragments: 24,
        echoCores: 2,
        relics: 0
      }
    });

    expect(upgraded.baseBattlePower).toBe(state.player.baseBattlePower + 14);
    expect(upgraded.inventory.coreFragments).toBe(0);
    expect(upgraded.inventory.echoCores).toBe(0);
  });

  it("assigns territory ownership when a faction has enough lead", () => {
    const cell: TerritoryCell = {
      id: "cell-test",
      label: "Test Cell",
      influence: {
        verdant: 42,
        ember: 26,
        lumen: 22
      },
      owner: null,
      activity: 1
    };

    expect(normalizeOwner(cell).owner).toBe("verdant");
  });
});
