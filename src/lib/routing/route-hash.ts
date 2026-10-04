import type { Place, RouteMode } from '../providers/types';
import { decodePlace, encodePlace } from '../search/place-hash';
import { getHashParam, setHashParam } from '../url-hash';

// The route form is kept in the URL fragment, like the selected place:
//   #map=…&route=walk~<from>~<to>
// Each end is a place encoded as in `place=`, empty when not chosen yet, or "me" for the
// user's position, whose coordinates never go into the address (PRIVACY.md §4).
// Opening such a link fills in the form; nothing is sent until "Build route" (§10).

const PARAM = 'route';
const MODES: RouteMode[] = ['walk', 'transit', 'car'];

/** One end of a route: a place, the user's position, or nothing yet. */
export type RouteEnd = { kind: 'place'; place: Place } | { kind: 'me' } | null;

export interface RouteForm {
  mode: RouteMode;
  from: RouteEnd;
  to: RouteEnd;
}

function encodeEnd(end: RouteEnd): string {
  if (!end) return '';
  return end.kind === 'me' ? 'me' : encodePlace(end.place);
}

function decodeEnd(value: string): RouteEnd {
  if (value === 'me') return { kind: 'me' };
  const place = value ? decodePlace(value) : null;
  return place && { kind: 'place', place };
}

export function encodeRoute(form: RouteForm): string {
  return [form.mode, encodeEnd(form.from), encodeEnd(form.to)].join('~');
}

export function decodeRoute(value: string): RouteForm | null {
  const [mode, from = '', to = ''] = value.split('~');
  if (!MODES.includes(mode as RouteMode)) return null;
  return { mode: mode as RouteMode, from: decodeEnd(from), to: decodeEnd(to) };
}

export function readRouteFromHash(hash = location.hash): RouteForm | null {
  const value = getHashParam(PARAM, hash);
  return value ? decodeRoute(value) : null;
}

export function writeRouteToHash(form: RouteForm | null): void {
  setHashParam(PARAM, form && encodeRoute(form));
}
