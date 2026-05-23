import { mulberry32 } from "./random";
import type { FactionId } from "./types";

export interface CellGeo {
  cellId: string;
  lat: number;
  lng: number;
  radiusKm: number;
}

// Real coordinates — Poblacion, Bacoor, Cavite (matches game world cells)
export const CELL_GEO: Record<string, CellGeo> = {
  "cell-north":   { cellId: "cell-north",   lat: 14.4605, lng: 120.9342, radiusKm: 0.28 },
  "cell-market":  { cellId: "cell-market",  lat: 14.4575, lng: 120.9348, radiusKm: 0.25 },
  "cell-river":   { cellId: "cell-river",   lat: 14.4545, lng: 120.9370, radiusKm: 0.24 },
  "cell-station": { cellId: "cell-station", lat: 14.4600, lng: 120.9383, radiusKm: 0.22 },
  "cell-park":    { cellId: "cell-park",    lat: 14.4556, lng: 120.9318, radiusKm: 0.26 },
  "cell-harbor":  { cellId: "cell-harbor",  lat: 14.4530, lng: 120.9358, radiusKm: 0.23 },
};

// Cell labels mirror real Poblacion Bacoor landmarks
// cell-north   = Public Market      (14.4605, 120.9342)
// cell-market  = Bacoor Church      (14.4575, 120.9348)
// cell-river   = Baywalk Paseo      (14.4545, 120.9370)
// cell-station = Fish Port          (14.4600, 120.9383)
// cell-park    = City Hall          (14.4556, 120.9318)
// cell-harbor  = Govt Center        (14.4530, 120.9358)

export const MAP_CENTER: [number, number] = [120.9355, 14.457]; // [lng, lat]
export const MAP_ZOOM = 14.8;

// Deterministic scatter — same input always produces same positions
export function scatterPositions(
  cellId: string,
  factionId: FactionId,
  count: number
): Array<[number, number]> {
  const seed =
    cellId.split("").reduce((s, c) => s + c.charCodeAt(0), 0) * 31 +
    factionId.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const rng = mulberry32(seed * 137 + 7919);
  const geo = CELL_GEO[cellId];
  if (!geo) return [];

  return Array.from({ length: count }, () => {
    const angle = rng() * 2 * Math.PI;
    const r = Math.sqrt(rng()) * geo.radiusKm * 0.8; // sqrt for uniform disk distribution
    const dlat = (r / 110.574) * Math.sin(angle);
    const dlng = (r / (111.32 * Math.cos((geo.lat * Math.PI) / 180))) * Math.cos(angle);
    return [geo.lng + dlng, geo.lat + dlat] as [number, number]; // [lng, lat]
  });
}

// Approximate circle polygon for GeoJSON fill layers
export function circlePolygon(lat: number, lng: number, radiusKm: number, points = 48) {
  const coords: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dlng = (radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.cos(angle);
    const dlat = (radiusKm / 110.574) * Math.sin(angle);
    coords.push([lng + dlng, lat + dlat]);
  }
  return { type: "Polygon" as const, coordinates: [coords] };
}

// How many faction markers to show in a cell based on influence
export function markerCount(influence: number, activity: number): number {
  return Math.max(1, Math.min(10, Math.floor(influence / 5) + Math.floor(activity / 4)));
}

// ── GPS helpers ───────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return haversineKm(lat1, lng1, lat2, lng2) * 1000;
}

/** Returns cellId if player is inside that cell's radius, else null */
export function cellForPosition(lat: number, lng: number): string | null {
  for (const [cellId, geo] of Object.entries(CELL_GEO)) {
    if (haversineKm(lat, lng, geo.lat, geo.lng) <= geo.radiusKm) return cellId;
  }
  return null;
}

/** Always returns the nearest cellId (fallback when outside all radii) */
export function nearestCell(lat: number, lng: number): string {
  let best = "";
  let bestDist = Infinity;
  for (const [cellId, geo] of Object.entries(CELL_GEO)) {
    const d = haversineKm(lat, lng, geo.lat, geo.lng);
    if (d < bestDist) { bestDist = d; best = cellId; }
  }
  return best;
}
