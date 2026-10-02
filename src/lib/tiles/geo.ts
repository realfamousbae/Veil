/** [minLng, minLat, maxLng, maxLat] */
export type BBox = [number, number, number, number];

export const WORLD_BBOX: BBox = [-180, -85.0511, 180, 85.0511];

function tileLat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
}

/** Geographic bounds of a Web Mercator tile. */
export function tileBounds(z: number, x: number, y: number): BBox {
  const n = 2 ** z;
  return [(x / n) * 360 - 180, tileLat(y + 1, z), ((x + 1) / n) * 360 - 180, tileLat(y, z)];
}

export function intersects(a: BBox, b: BBox): boolean {
  return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
}

export function contains(b: BBox, lng: number, lat: number): boolean {
  return lng >= b[0] && lng <= b[2] && lat >= b[1] && lat <= b[3];
}
