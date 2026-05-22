import { EchoType, EchoSpawnData, ECHO_BP_RANGES, ECHO_TTL_MS, ECHO_SPAWN_WEIGHTS } from '../models/echo';
import { PlayerProfile, GPSSample, GPSHistoryRecord } from '../models/player';
import { validateGPSSample, haversineMeters, applyViolation } from './gpsAntiCheat';
import { signToken, buildEncounterTokenPayload } from '../utils/hmac';
import { SeededRng, seedFromUuid } from '../utils/rng';
import { latLngToH3, getNeighborHexes } from '../utils/h3Utils';

export const STORAGE_COLLECTION_ENCOUNTERS = 'pending_encounters';
export const STORAGE_COLLECTION_GPS_HISTORY = 'gps_history';
export const STORAGE_COLLECTION_PLAYERS = 'player_profiles';
export const ENCOUNTER_DISTANCE_MIN_M = 100;
export const ENCOUNTER_DISTANCE_MAX_M = 500;
export const ECHO_SPAWN_RADIUS_M = 50;

export interface EncounterRequest {
  lat: number;
  lng: number;
  accuracy: number;
  timestampMs: number;
  mockFlag: boolean;
}

export interface EncounterResponse {
  triggered: boolean;
  echo?: EchoSpawnData;
  distanceAccumulated: number;
  nextThresholdM: number;
  error?: string;
}

export function handleEncounterRequest(
  nk: nkruntime.Runtime,
  logger: nkruntime.Logger,
  userId: string,
  payload: EncounterRequest,
  profile: PlayerProfile,
  history: GPSHistoryRecord
): EncounterResponse {
  const sample: GPSSample = {
    lat: payload.lat,
    lng: payload.lng,
    accuracy: payload.accuracy,
    timestampMs: payload.timestampMs,
    speedKmh: 0,
  };

  const result = validateGPSSample(sample, profile, history, payload.mockFlag);

  if (result.status !== 'valid') {
    if (result.status === 'rejected_speed_flag' || result.status === 'rejected_speed_block') {
      applyViolation(profile, 'speed');
    } else if (result.status === 'rejected_mock') {
      applyViolation(profile, 'mock');
    } else if (result.status === 'rejected_teleport') {
      applyViolation(profile, 'teleport');
    }
    return {
      triggered: false,
      distanceAccumulated: profile.cumulativeDistanceM,
      nextThresholdM: profile.nextEncounterThresholdM,
      error: result.status,
    };
  }

  let distanceDelta = 0;
  if (profile.lastPosition !== null) {
    distanceDelta = haversineMeters(
      profile.lastPosition.lat,
      profile.lastPosition.lng,
      payload.lat,
      payload.lng
    );
    if (result.speedKmh !== undefined) {
      sample.speedKmh = result.speedKmh;
    }
  }

  profile.lastPosition = sample;
  profile.cumulativeDistanceM += distanceDelta;
  profile.walkDistanceTodayMeters += distanceDelta;
  profile.totalWalkDistanceMeters += distanceDelta;

  history.samples.push(sample);
  if (history.samples.length > 20) history.samples.shift();

  if (profile.cumulativeDistanceM < profile.nextEncounterThresholdM) {
    return {
      triggered: false,
      distanceAccumulated: profile.cumulativeDistanceM,
      nextThresholdM: profile.nextEncounterThresholdM,
    };
  }

  profile.cumulativeDistanceM = 0;

  const seedStr = nk.uuidv4();
  const rng = new SeededRng(seedFromUuid(seedStr));
  profile.nextEncounterThresholdM = rng.nextIntInRange(ENCOUNTER_DISTANCE_MIN_M, ENCOUNTER_DISTANCE_MAX_M);

  const echoType = spawnEchoType(rng);
  const echoId = nk.uuidv4();
  const bpRange = ECHO_BP_RANGES[echoType];
  const echoBP = rng.nextIntInRange(bpRange.min, bpRange.max);

  const offsetLat = (rng.nextFloat() - 0.5) * 0.0009;
  const offsetLng = (rng.nextFloat() - 0.5) * 0.0009;

  const now = Date.now();
  const tokenPayload = buildEncounterTokenPayload(userId, echoId, echoBP, now);
  const token = signToken(tokenPayload);

  const echo: EchoSpawnData = {
    echoId,
    type: echoType,
    bp: echoBP,
    spawnLat: payload.lat + offsetLat,
    spawnLng: payload.lng + offsetLng,
    spawnedAt: now,
    expiresAt: now + ECHO_TTL_MS[echoType],
    encounterToken: token,
  };

  return {
    triggered: true,
    echo,
    distanceAccumulated: 0,
    nextThresholdM: profile.nextEncounterThresholdM,
  };
}

function spawnEchoType(rng: SeededRng): EchoType {
  return rng.weightedChoice(
    ECHO_SPAWN_WEIGHTS.map((w) => ({ item: w.type, weight: w.weight }))
  );
}
