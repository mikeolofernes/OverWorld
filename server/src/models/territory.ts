import { FactionType } from './player';

export interface HexRecord {
  hexIndex: string;
  ownerFaction: FactionType | null;
  capturedAtTimestamp: number;
  defenseScore: number;
  capturedByUserId: string;
  centerLat: number;
  centerLng: number;
  boundary: Array<{ lat: number; lng: number }>;
}

export interface NearbyTerritoriesResponse {
  territories: HexRecord[];
}

export interface CaptureRequest {
  hexIndex: string;
  lat: number;
  lng: number;
  accuracy: number;
  timestampMs: number;
}

export interface CaptureResponse {
  success: boolean;
  newOwner: FactionType | null;
  hexIndex: string;
  reason?: string;
}

export const H3_TERRITORY_RESOLUTION = 8;
export const CAPTURE_PROXIMITY_METERS = 200;
