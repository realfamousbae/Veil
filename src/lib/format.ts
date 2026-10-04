/** "572 MB" / "572 МБ" in the UI language. */
export function formatBytes(bytes: number, locale: string): string {
  const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const;
  let value = bytes;
  let i = 0;
  while (value >= 1000 && i < units.length - 1) {
    value /= 1000;
    i++;
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: units[i],
    unitDisplay: 'short',
    maximumFractionDigits: value < 10 && i > 1 ? 1 : 0,
  }).format(value);
}

/** "20261002" → a localized date. */
export function formatBuildDate(build: string, locale: string): string {
  const date = new Date(Date.UTC(+build.slice(0, 4), +build.slice(4, 6) - 1, +build.slice(6, 8)));
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(date);
}

/** "1 ч 25 мин" / "1 hr 25 min"; under a minute counts as one. */
export function formatDuration(seconds: number, locale: string): string {
  const total = Math.max(1, Math.round(seconds / 60));
  const unit = (value: number, u: 'hour' | 'minute') =>
    new Intl.NumberFormat(locale, { style: 'unit', unit: u, unitDisplay: 'short' }).format(value);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return unit(m, 'minute');
  return m ? `${unit(h, 'hour')} ${unit(m, 'minute')}` : unit(h, 'hour');
}

/** "640 м" / "12,3 км" in the UI language. */
export function formatDistance(meters: number, locale: string): string {
  const km = meters >= 1000;
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: km ? 'kilometer' : 'meter',
    unitDisplay: 'short',
    maximumFractionDigits: km && meters < 10_000 ? 1 : 0,
  }).format(km ? meters / 1000 : Math.round(meters / 10) * 10);
}

/** Clock time, "10:24", in the device's time zone. */
export function formatClock(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
}
