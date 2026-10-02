import type { Flavor } from '@protomaps/basemaps';

/** Color set passed to `layers()` from @protomaps/basemaps. */
export type MapFlavor = Flavor;

/** Sprite sheets shipped by protomaps/basemaps-assets (public/assets/sprites/v4/). */
export type SpriteSheet = 'light' | 'dark' | 'white' | 'grayscale' | 'black';

/**
 * UI design tokens. Each leaf becomes a CSS custom property on :root,
 * e.g. color.surfaceRaised → --color-surface-raised, radius.md → --radius-md.
 * Components must use only these variables for colors, radii and shadows.
 */
export interface UiTokens {
  color: {
    /** Panels, sheets, popovers. */
    surface: string;
    /** Buttons and inputs placed on a surface or over the map. */
    surfaceRaised: string;
    surfaceHover: string;
    text: string;
    textMuted: string;
    border: string;
    accent: string;
    /** Text and icons drawn on `accent`. */
    onAccent: string;
    focus: string;
  };
  radius: { sm: string; md: string; lg: string; full: string };
  shadow: { sm: string; md: string; lg: string };
  font: { body: string };
}

export interface Theme {
  id: string;
  /** Display name per UI language; kept here so a new theme stays a single file. */
  name: { en: string; ru: string };
  scheme: 'light' | 'dark';
  ui: UiTokens;
  map: MapFlavor;
  sprite: SpriteSheet;
}
