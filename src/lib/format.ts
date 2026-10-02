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
