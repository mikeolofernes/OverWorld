import { HexRecord, CaptureRequest, CaptureResponse, CAPTURE_PROXIMITY_METERS } from '../models/territory';
import { FactionType } from '../models/player';
import { haversineMeters } from './gpsAntiCheat';
import { latLngToH3, hexToCenter, hexToBoundary, getNeighborHexes } from '../utils/h3Utils';
import { NOTIFICATION_TERRITORY_UPDATE } from './notificationModule';

export const STORAGE_COLLECTION_TERRITORIES = 'territories';

export function handleCaptureTerritory(
  nk: nkruntime.Runtime,
  logger: nkruntime.Logger,
  userId: string,
  factionId: FactionType | null,
  request: CaptureRequest,
  playerBP: number
): CaptureResponse {
  if (!factionId) {
    return { success: false, newOwner: null, hexIndex: request.hexIndex, reason: 'NO_FACTION' };
  }

  const hexCenter = hexToCenter(request.hexIndex);
  const distToCenter = haversineMeters(request.lat, request.lng, hexCenter.lat, hexCenter.lng);
  if (distToCenter > CAPTURE_PROXIMITY_METERS) {
    return { success: false, newOwner: null, hexIndex: request.hexIndex, reason: 'TOO_FAR' };
  }

  const key = request.hexIndex;
  let hexRecord: HexRecord | null = null;

  try {
    const stored = nk.storageRead([
      { collection: STORAGE_COLLECTION_TERRITORIES, key, userId: '' },
    ]);
    if (stored.length > 0) {
      hexRecord = JSON.parse(stored[0].value) as HexRecord;
    }
  } catch (_) {
    // zone not yet claimed
  }

  if (!hexRecord) {
    hexRecord = {
      hexIndex: key,
      ownerFaction: null,
      capturedAtTimestamp: 0,
      defenseScore: 0,
      capturedByUserId: '',
      centerLat: hexCenter.lat,
      centerLng: hexCenter.lng,
      boundary: hexToBoundary(key),
    };
  }

  if (hexRecord.ownerFaction === factionId) {
    return { success: false, newOwner: factionId, hexIndex: key, reason: 'ALREADY_OWNED' };
  }

  if (playerBP <= hexRecord.defenseScore * 0.5) {
    return { success: false, newOwner: hexRecord.ownerFaction, hexIndex: key, reason: 'INSUFFICIENT_BP' };
  }

  hexRecord.ownerFaction = factionId;
  hexRecord.capturedAtTimestamp = Date.now();
  hexRecord.defenseScore = playerBP;
  hexRecord.capturedByUserId = userId;

  nk.storageWrite([{
    collection: STORAGE_COLLECTION_TERRITORIES,
    key,
    userId: '',
    value: JSON.stringify(hexRecord),
    permissionRead: 2,
    permissionWrite: 0,
  }]);

  nk.notificationsSend([{
    userId,
    subject: 'Zone Captured',
    content: { hexIndex: key, faction: factionId },
    code: NOTIFICATION_TERRITORY_UPDATE,
    sender: '',
    persistent: false,
  }]);

  return { success: true, newOwner: factionId, hexIndex: key };
}

export function getNearbyTerritories(
  nk: nkruntime.Runtime,
  lat: number,
  lng: number
): HexRecord[] {
  const hexes = getNeighborHexes(latLngToH3(lat, lng), 1);
  const records: HexRecord[] = [];

  for (const hexIndex of hexes) {
    try {
      const stored = nk.storageRead([
        { collection: STORAGE_COLLECTION_TERRITORIES, key: hexIndex, userId: '' },
      ]);
      if (stored.length > 0) {
        records.push(JSON.parse(stored[0].value) as HexRecord);
      } else {
        const center = hexToCenter(hexIndex);
        records.push({
          hexIndex,
          ownerFaction: null,
          capturedAtTimestamp: 0,
          defenseScore: 0,
          capturedByUserId: '',
          centerLat: center.lat,
          centerLng: center.lng,
          boundary: hexToBoundary(hexIndex),
        });
      }
    } catch (_) {
      // skip
    }
  }

  return records;
}
