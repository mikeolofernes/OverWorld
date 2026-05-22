import { BattleResult, ECHO_XP, ECHO_COOLDOWN_MS, LootItem } from '../models/echo';
import { PlayerProfile } from '../models/player';
import { verifyToken, buildEncounterTokenPayload, buildLootTokenPayload, signToken } from '../utils/hmac';
import { SeededRng, seedFromUuid } from '../utils/rng';
import { rollLoot } from './lootModule';

export const ENCOUNTER_TOKEN_TTL_MS = 60000;

export interface BattleRequest {
  echoId: string;
  encounterToken: string;
  echoBP: number;
  echoType: 'common' | 'elite' | 'apex';
  spawnTimestamp: number;
}

export interface BattleResponse {
  result: BattleResult;
  lootToken: string;
  error?: string;
}

export function resolveBattle(
  nk: nkruntime.Runtime,
  userId: string,
  request: BattleRequest,
  profile: PlayerProfile
): BattleResponse | { error: string } {
  const now = Date.now();

  if (profile.cooldownUntil > 0 && now < profile.cooldownUntil) {
    return { error: `COOLDOWN:${profile.cooldownUntil}` };
  }

  if (now - request.spawnTimestamp > ENCOUNTER_TOKEN_TTL_MS) {
    return { error: 'TOKEN_EXPIRED' };
  }

  const tokenPayload = buildEncounterTokenPayload(
    userId,
    request.echoId,
    request.echoBP,
    request.spawnTimestamp
  );
  if (!verifyToken(tokenPayload, request.encounterToken)) {
    return { error: 'TOKEN_INVALID' };
  }

  const playerBP = profile.bp;
  const pWin = playerBP / (playerBP + request.echoBP);

  const seed = seedFromUuid(nk.uuidv4());
  const rng = new SeededRng(seed);
  const roll = rng.nextFloat();
  const won = roll < pWin;

  let loot: LootItem[] = [];
  let xpGained = 0;
  let cooldownUntil = 0;

  if (won) {
    loot = rollLoot(request.echoType, rng);
    xpGained = Math.floor(
      ECHO_XP[request.echoType] * Math.min(3, Math.max(0.5, request.echoBP / playerBP))
    );
  } else {
    cooldownUntil = now + ECHO_COOLDOWN_MS[request.echoType];
    profile.cooldownUntil = cooldownUntil;
    const consolation = rollConsolationLoot(rng);
    if (consolation) loot = [consolation];
    xpGained = Math.floor(ECHO_XP[request.echoType] * 0.1);
  }

  const battleId = nk.uuidv4();
  const lootTokenPayload = buildLootTokenPayload(userId, battleId, now);
  const lootToken = signToken(lootTokenPayload);

  return {
    result: {
      echoId: request.echoId,
      outcome: won ? 'win' : 'lose',
      loot,
      xpGained,
      cooldownUntil,
      newBP: profile.bp,
    },
    lootToken,
  };
}

function rollConsolationLoot(rng: SeededRng): LootItem | null {
  if (rng.nextFloat() > 0.3) return null;
  return {
    itemId: 'core_fragment_t1',
    itemType: 'core_fragment',
    tier: 1,
    bpValue: 10,
    quantity: 1,
  };
}
