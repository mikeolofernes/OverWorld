import { signToken, buildEncounterTokenPayload } from '../utils/hmac';
import { SeededRng } from '../utils/rng';
import { rollLoot } from '../modules/lootModule';

describe('Battle probability', () => {
  it('player with equal BP wins ~50% over many rolls', () => {
    let wins = 0;
    const trials = 10000;
    for (let i = 0; i < trials; i++) {
      const rng = new SeededRng(i * 7 + 13);
      const pWin = 100 / (100 + 100);
      if (rng.nextFloat() < pWin) wins++;
    }
    const winRate = wins / trials;
    expect(winRate).toBeGreaterThan(0.45);
    expect(winRate).toBeLessThan(0.55);
  });

  it('player with 4x BP wins ~80% of the time', () => {
    let wins = 0;
    const trials = 10000;
    for (let i = 0; i < trials; i++) {
      const rng = new SeededRng(i * 3 + 7);
      const pWin = 400 / (400 + 100);
      if (rng.nextFloat() < pWin) wins++;
    }
    const winRate = wins / trials;
    expect(winRate).toBeGreaterThan(0.75);
    expect(winRate).toBeLessThan(0.85);
  });
});

describe('Loot tables', () => {
  it('always returns at least one item on win', () => {
    for (let i = 0; i < 100; i++) {
      const rng = new SeededRng(i);
      const loot = rollLoot('common', rng);
      expect(loot.length).toBeGreaterThan(0);
    }
  });

  it('apex loot contains relics with reasonable frequency', () => {
    let relicCount = 0;
    const trials = 1000;
    for (let i = 0; i < trials; i++) {
      const rng = new SeededRng(i);
      const loot = rollLoot('apex', rng);
      if (loot.some((l) => l.itemType === 'relic')) relicCount++;
    }
    expect(relicCount / trials).toBeGreaterThan(0.65);
  });
});

describe('HMAC tokens', () => {
  it('verifies a correct token', () => {
    const payload = buildEncounterTokenPayload('user1', 'echo1', 200, 1700000000000);
    const token = signToken(payload);
    const { verifyToken } = require('../utils/hmac');
    expect(verifyToken(payload, token)).toBe(true);
  });

  it('rejects a tampered token', () => {
    const payload = buildEncounterTokenPayload('user1', 'echo1', 200, 1700000000000);
    const token = signToken(payload);
    const tampered = token.slice(0, -1) + (token[token.length - 1] === 'a' ? 'b' : 'a');
    const { verifyToken } = require('../utils/hmac');
    expect(verifyToken(payload, tampered)).toBe(false);
  });
});
