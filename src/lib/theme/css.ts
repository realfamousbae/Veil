import type { Theme, UiTokens } from '../../themes/types';

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Flattens UI tokens into CSS custom properties: color.surfaceRaised → --color-surface-raised. */
export function tokensToCssVars(ui: UiTokens): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [group, values] of Object.entries(ui)) {
    for (const [name, value] of Object.entries(values as Record<string, string>)) {
      vars[`--${kebab(group)}-${kebab(name)}`] = value;
    }
  }
  return vars;
}

/** Applies a theme's UI tokens to the document root. */
export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  for (const [name, value] of Object.entries(tokensToCssVars(theme.ui))) {
    root.style.setProperty(name, value);
  }
  root.style.colorScheme = theme.scheme;
  root.dataset['theme'] = theme.id;
}
