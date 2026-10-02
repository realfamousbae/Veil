/** Minimal color helpers for theme definitions and contrast checks. */

export type Rgba = [r: number, g: number, b: number, a: number];

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_FN = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/i;

export function parseColor(input: string): Rgba {
  const hex = HEX.exec(input.trim());
  if (hex) {
    let h = hex[1] ?? '';
    if (h.length === 3) h = [...h].map((c) => c + c).join('');
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
  }
  const fn = RGB_FN.exec(input.trim());
  if (fn) {
    return [Number(fn[1]), Number(fn[2]), Number(fn[3]), fn[4] === undefined ? 1 : Number(fn[4])];
  }
  throw new Error(`Unsupported color: ${input}`);
}

export function toHex([r, g, b, a]: Rgba): string {
  const h = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v)))
      .toString(16)
      .padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}${a < 1 ? h(a * 255) : ''}`;
}

/** Linear mix of two colors; t = 0 gives `a`, t = 1 gives `b`. */
export function mix(a: string, b: string, t: number): string {
  const ca = parseColor(a);
  const cb = parseColor(b);
  return toHex(ca.map((v, i) => v + ((cb[i] ?? 0) - v) * t) as Rgba);
}

/** WCAG relative luminance. */
export function luminance(color: string): number {
  const [r, g, b] = parseColor(color).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as Rgba;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two opaque colors (1–21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Re-tints a color onto a two-tone ramp from `ink` (dark) to `paper` (light) by its
 * luminance, keeping `keep` (0–1) of the original hue. Alpha is preserved.
 */
export function tone(color: string, ink: string, paper: string, keep = 0): string {
  const [, , , alpha] = parseColor(color);
  const toned = mix(ink, paper, Math.sqrt(luminance(color)));
  const [r, g, b] = parseColor(mix(toned, color, keep));
  return toHex([r, g, b, alpha]);
}
