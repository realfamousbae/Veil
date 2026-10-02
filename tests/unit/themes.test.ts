import { LIGHT } from '@protomaps/basemaps';
import { describe, expect, it } from 'vitest';
import { contrastRatio, parseColor, toHex } from '../../src/lib/color';
import { defaultTheme, themes } from '../../src/themes';

// Text on backgrounds needs 4.5:1 (WCAG AA), non-text UI such as focus rings 3:1.
const TEXT_PAIRS = [
  ['text', 'surface'],
  ['text', 'surfaceRaised'],
  ['text', 'surfaceHover'],
  ['textMuted', 'surface'],
  ['textMuted', 'surfaceRaised'],
  ['onAccent', 'accent'],
] as const;
const UI_PAIRS = [
  ['focus', 'surface'],
  ['focus', 'surfaceRaised'],
  ['accent', 'surface'],
] as const;

describe('theme registry', () => {
  it('discovers every theme file, built-ins first', () => {
    expect(themes.map((t) => t.id)).toEqual(['light', 'dark', 'paper']);
  });

  it('has unique ids', () => {
    expect(new Set(themes.map((t) => t.id)).size).toBe(themes.length);
  });

  it('picks the default theme by color scheme', () => {
    expect(defaultTheme('light').id).toBe('light');
    expect(defaultTheme('dark').id).toBe('dark');
  });
});

describe.each(themes)('theme $id', (theme) => {
  it.each(TEXT_PAIRS)('%s on %s has contrast ≥ 4.5', (fg, bg) => {
    expect(contrastRatio(theme.ui.color[fg], theme.ui.color[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_PAIRS)('%s on %s has contrast ≥ 3', (fg, bg) => {
    expect(contrastRatio(theme.ui.color[fg], theme.ui.color[bg])).toBeGreaterThanOrEqual(3);
  });

  it('defines every map flavor color', () => {
    for (const key of Object.keys(LIGHT)) expect(theme.map).toHaveProperty(key);
  });

  it('names itself in every UI language', () => {
    expect(theme.name.en).toBeTruthy();
    expect(theme.name.ru).toBeTruthy();
  });
});

// Text sits on translucent glass over the map: check it against the glass tint composited
// over the theme's own map colors (blur only averages these, so this bounds the real case).
function over(top: string, bottom: string): string {
  const [r, g, b, a] = parseColor(top);
  const [br, bg, bb] = parseColor(bottom);
  const c = (f: number, bk: number) => Math.round(f * a + bk * (1 - a));
  return toHex([c(r, br), c(g, bg), c(b, bb), 1]);
}

describe.each(themes)('glass of theme $id', (theme) => {
  const backdrops = ['background', 'earth', 'water', 'buildings', 'park_b', 'wood_b'] as const;

  it.each(backdrops)('keeps panel text legible over map %s', (key) => {
    const bg = over(theme.ui.glass.panel, theme.map[key]);
    expect(contrastRatio(theme.ui.color.text, bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.ui.color.textMuted, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(backdrops)('keeps control icons visible over map %s', (key) => {
    const bg = over(theme.ui.glass.tint, theme.map[key]);
    expect(contrastRatio(theme.ui.color.text, bg)).toBeGreaterThanOrEqual(3);
  });
});
