// eslint-disable-next-line @typescript-eslint/no-var-requires
const jsSha256 = require('js-sha256') as { hmac: { create: (key: string) => { update: (msg: string) => { hex: () => string } } } };

// Nakama's V8 runtime has no process.env — set this via Nakama config runtime.env for production.
const SERVER_SECRET = 'overworld-local-key';

export function signToken(payload: string): string {
  return jsSha256.hmac.create(SERVER_SECRET).update(payload).hex();
}

export function verifyToken(payload: string, token: string): boolean {
  const expected = signToken(payload);
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}

export function buildEncounterTokenPayload(
  userId: string,
  echoId: string,
  echoBP: number,
  createdTimestamp: number
): string {
  return `${userId}:${echoId}:${echoBP}:${createdTimestamp}`;
}

export function buildLootTokenPayload(userId: string, battleId: string, timestamp: number): string {
  return `loot:${userId}:${battleId}:${timestamp}`;
}
