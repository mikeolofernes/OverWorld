import { GPSSample, PlayerProfile, GPSHistoryRecord } from '../models/player';

export const GPS_SPEED_FLAG_KMH = 30;
export const GPS_SPEED_BLOCK_KMH = 100;
export const GPS_MAX_ACCURACY_METERS = 50;
export const GPS_VIOLATION_SUSPEND_AT = 5;
export const GPS_TIMESTAMP_DRIFT_MS = 30000;
export const GPS_ENCOUNTER_TOKEN_TTL_MS = 60000;

export type ValidationStatus = 'valid' | 'rejected_imprecise' | 'rejected_speed_flag' |
  'rejected_speed_block' | 'rejected_teleport' | 'rejected_mock' |
  'rejected_timestamp_drift' | 'rejected_static_spoof' | 'rejected_suspended';

export interface GPSValidationResult {
  status: ValidationStatus;
  speedKmh?: number;
  distanceM?: number;
}

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function validateGPSSample(
  sample: GPSSample,
  profile: PlayerProfile,
  history: GPSHistoryRecord,
  isMockLocation: boolean
): GPSValidationResult {
  if (profile.violationFlags.isSuspended && Date.now() < profile.violationFlags.suspendedUntil) {
    return { status: 'rejected_suspended' };
  }

  if (sample.accuracy > GPS_MAX_ACCURACY_METERS) {
    return { status: 'rejected_imprecise' };
  }

  if (isMockLocation) {
    return { status: 'rejected_mock' };
  }

  const drift = Math.abs(sample.timestampMs - Date.now());
  if (drift > GPS_TIMESTAMP_DRIFT_MS) {
    return { status: 'rejected_timestamp_drift' };
  }

  if (profile.lastPosition !== null) {
    const last = profile.lastPosition;
    const distM = haversineMeters(last.lat, last.lng, sample.lat, sample.lng);
    const dtSeconds = Math.max((sample.timestampMs - last.timestampMs) / 1000, 0.001);
    const speedKmh = (distM / dtSeconds) * 3.6;

    if (speedKmh > GPS_SPEED_BLOCK_KMH) {
      return { status: 'rejected_speed_block', speedKmh, distanceM: distM };
    }

    const dtMinutes = dtSeconds / 60;
    if (distM > dtMinutes * 666) {
      return { status: 'rejected_teleport', distanceM: distM };
    }

    if (speedKmh > GPS_SPEED_FLAG_KMH) {
      return { status: 'rejected_speed_flag', speedKmh, distanceM: distM };
    }
  }

  const recent = history.samples.slice(-5);
  if (recent.length >= 4) {
    const uniqueCoords = new Set(
      recent.map((s) => `${s.lat.toFixed(6)},${s.lng.toFixed(6)}`)
    );
    if (uniqueCoords.size === 1) {
      return { status: 'rejected_static_spoof' };
    }
  }

  return { status: 'valid' };
}

export function applyViolation(
  profile: PlayerProfile,
  violationType: 'speed' | 'mock' | 'teleport'
): void {
  const flags = profile.violationFlags;
  flags.lastViolationTimestamp = Date.now();

  if (violationType === 'speed') flags.speedViolations++;
  else if (violationType === 'mock') flags.mockViolations++;
  else if (violationType === 'teleport') flags.teleportViolations++;

  const total = flags.speedViolations + flags.teleportViolations;
  if (flags.mockViolations >= 1 || total >= GPS_VIOLATION_SUSPEND_AT) {
    flags.isSuspended = true;
    flags.suspendedUntil = Date.now() + 24 * 60 * 60 * 1000;
  }
}
