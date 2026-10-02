import { pointId, type Place } from '../providers/types';
import { getHashParam, setHashParam, withHashParam } from '../url-hash';

// The selected place is kept in the URL fragment next to the `map=` parameter:
//   #map=15/55.75/37.62&place=55.75123,37.62012,<base64url name>
// The name is base64url encoded to stay free of "&", "=" and "%".
// Opening such a link makes no network request.

const PARAM = 'place';

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(text: string): string {
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodePlace(place: Place): string {
  const coords = `${place.point.lat.toFixed(5)},${place.point.lng.toFixed(5)}`;
  return place.name ? `${coords},${toBase64Url(place.name)}` : coords;
}

export function decodePlace(value: string): Place | null {
  const [lat, lng, name] = value.split(',');
  const point = { lat: Number(lat), lng: Number(lng) };
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return null;
  if (Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180) return null;
  let decoded = '';
  try {
    decoded = name ? fromBase64Url(name) : '';
  } catch {
    // Malformed name: keep the point.
  }
  return { id: pointId(point), name: decoded, point };
}

export function readPlaceFromHash(hash = location.hash): Place | null {
  const value = getHashParam(PARAM, hash);
  return value ? decodePlace(value) : null;
}

/** Returns the fragment with the place set (or removed), other parameters untouched. */
export function withPlace(hash: string, place: Place | null): string {
  return withHashParam(hash, PARAM, place && encodePlace(place));
}

export function writePlaceToHash(place: Place | null): void {
  setHashParam(PARAM, place && encodePlace(place));
}
