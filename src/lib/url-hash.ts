// App state lives in the URL fragment, which never reaches the server (PRIVACY.md §6):
//   #map=15/55.75/37.62&place=...
// Values are written as is (callers keep them free of "&" and "="), not percent-encoded.

function parts(hash: string): string[] {
  return hash.replace(/^#/, '').split('&').filter(Boolean);
}

export function getHashParam(name: string, hash = location.hash): string | null {
  const part = parts(hash).find((p) => p.startsWith(`${name}=`));
  return part === undefined ? null : part.slice(name.length + 1);
}

/** Returns the fragment with `name` set (in place) or removed; other parameters untouched. */
export function withHashParam(hash: string, name: string, value: string | null): string {
  const list = parts(hash);
  const i = list.findIndex((p) => p.startsWith(`${name}=`));
  const next = value === null ? null : `${name}=${value}`;
  if (i === -1) {
    if (next) list.push(next);
  } else if (next) {
    list[i] = next;
  } else {
    list.splice(i, 1);
  }
  return list.length ? `#${list.join('&')}` : '';
}

/** Updates one fragment parameter without adding a history entry. */
export function setHashParam(name: string, value: string | null): void {
  const hash = withHashParam(location.hash, name, value);
  if (hash === location.hash || (hash === '' && location.hash === '')) return;
  history.replaceState(history.state, '', `${location.pathname}${location.search}${hash}`);
}
