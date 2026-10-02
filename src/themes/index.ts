import type { Theme } from './types';

// Every other module in this directory is a theme: adding a theme is adding one file.
const modules = import.meta.glob<{ default: Theme }>(['./*.ts', '!./index.ts', '!./types.ts'], {
  eager: true,
});

const ORDER = ['light', 'dark'];

/** All themes; built-in light and dark first, the rest alphabetically. */
export const themes: readonly Theme[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => {
    const ia = ORDER.indexOf(a.id);
    const ib = ORDER.indexOf(b.id);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
    return a.id.localeCompare(b.id);
  });

export function findTheme(id: string): Theme | undefined {
  return themes.find((t) => t.id === id);
}

/** Default theme for a color scheme: the theme with the same id, else the first match. */
export function defaultTheme(scheme: 'light' | 'dark'): Theme {
  const theme = findTheme(scheme) ?? themes.find((t) => t.scheme === scheme) ?? themes[0];
  if (!theme) throw new Error('No themes found in src/themes/');
  return theme;
}
