import { latLngToCell, gridDisk, cellToBoundary, cellToLatLng } from 'h3-js';

export const TERRITORY_RESOLUTION = 8;

export function latLngToH3(lat: number, lng: number, resolution: number = TERRITORY_RESOLUTION): string {
  return latLngToCell(lat, lng, resolution);
}

export function getNeighborHexes(hexIndex: string, radius: number = 1): string[] {
  return gridDisk(hexIndex, radius);
}

export function hexToBoundary(hexIndex: string): Array<{ lat: number; lng: number }> {
  const boundary = cellToBoundary(hexIndex);
  return boundary.map(([lat, lng]) => ({ lat, lng }));
}

export function hexToCenter(hexIndex: string): { lat: number; lng: number } {
  const [lat, lng] = cellToLatLng(hexIndex);
  return { lat, lng };
}

export function getHexesInArea(lat: number, lng: number, radiusHexes: number = 1): string[] {
  const centerHex = latLngToH3(lat, lng);
  return gridDisk(centerHex, radiusHexes);
}
