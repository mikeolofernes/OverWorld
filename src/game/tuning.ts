import type { EchoType, Faction } from "./types";

export const factions: Faction[] = [
  {
    id: "verdant",
    name: "Verdant Accord",
    color: "#37d67a",
    motto: "The city breathes where we walk."
  },
  {
    id: "ember",
    name: "Ember Circuit",
    color: "#ff6b35",
    motto: "Pressure makes the map confess."
  },
  {
    id: "lumen",
    name: "Lumen Archive",
    color: "#67d4ff",
    motto: "Every street remembers a signal."
  }
];

export const echoWeights: Record<EchoType, number> = {
  Common: 72,
  Elite: 23,
  Apex: 5
};

export const echoBattlePower: Record<EchoType, [number, number]> = {
  Common: [45, 85],
  Elite: [90, 150],
  Apex: [160, 260]
};

export const echoInfluence: Record<EchoType, number> = {
  Common: 8,
  Elite: 18,
  Apex: 42
};

export const encounterDistanceRange = {
  min: 100,
  max: 500
};

export const movementRules = {
  maxWalkingSpeedMps: 4.2,
  maxAccuracyMeters: 45,
  maxCreditPerSampleMeters: 80
};

export const upgradeCosts = {
  coreFragments: 24,
  echoCores: 2
};
