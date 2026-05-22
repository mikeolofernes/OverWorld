import { validateGPSSample, haversineMeters, GPS_SPEED_BLOCK_KMH } from '../modules/gpsAntiCheat';
import { defaultPlayerProfile } from '../models/player';
import { GPSHistoryRecord, GPSSample } from '../models/player';

function makeSample(lat: number, lng: number, tsMs: number, accuracy = 10): GPSSample {
  return { lat, lng, accuracy, timestampMs: tsMs, speedKmh: 0 };
}

function emptyHistory(): GPSHistoryRecord {
  return { userId: 'u1', samples: [] };
}

describe('haversineMeters', () => {
  it('returns ~0 for identical points', () => {
    expect(haversineMeters(51.5, -0.1, 51.5, -0.1)).toBeCloseTo(0, 0);
  });

  it('calculates ~111km per degree latitude', () => {
    const dist = haversineMeters(0, 0, 1, 0);
    expect(dist).toBeGreaterThan(110000);
    expect(dist).toBeLessThan(112000);
  });
});

describe('GPS validation', () => {
  const now = Date.now();

  it('accepts a valid slow-walking sample', () => {
    const profile = defaultPlayerProfile('u1', 'Tester');
    profile.lastPosition = makeSample(51.5, -0.1, now - 5000);
    const sample = makeSample(51.5001, -0.1, now);
    const result = validateGPSSample(sample, profile, emptyHistory(), false);
    expect(result.status).toBe('valid');
  });

  it('rejects imprecise accuracy', () => {
    const profile = defaultPlayerProfile('u1', 'Tester');
    const sample = makeSample(51.5, -0.1, now, 100);
    const result = validateGPSSample(sample, profile, emptyHistory(), false);
    expect(result.status).toBe('rejected_imprecise');
  });

  it('rejects mock location', () => {
    const profile = defaultPlayerProfile('u1', 'Tester');
    const sample = makeSample(51.5, -0.1, now);
    const result = validateGPSSample(sample, profile, emptyHistory(), true);
    expect(result.status).toBe('rejected_mock');
  });

  it('rejects impossibly fast movement (teleport)', () => {
    const profile = defaultPlayerProfile('u1', 'Tester');
    profile.lastPosition = makeSample(51.5, -0.1, now - 2000);
    const farSample = makeSample(52.0, -0.1, now);
    const result = validateGPSSample(farSample, profile, emptyHistory(), false);
    expect(['rejected_speed_block', 'rejected_teleport']).toContain(result.status);
  });

  it('rejects static spoof (same coord repeated)', () => {
    const profile = defaultPlayerProfile('u1', 'Tester');
    const history: GPSHistoryRecord = {
      userId: 'u1',
      samples: [
        makeSample(51.5, -0.1, now - 20000),
        makeSample(51.5, -0.1, now - 15000),
        makeSample(51.5, -0.1, now - 10000),
        makeSample(51.5, -0.1, now - 5000),
      ],
    };
    const sample = makeSample(51.5, -0.1, now);
    const result = validateGPSSample(sample, profile, history, false);
    expect(result.status).toBe('rejected_static_spoof');
  });
});
