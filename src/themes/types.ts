import type { Flavor } from '@protomaps/basemaps';

/** Color set passed to `layers()` from @protomaps/basemaps. */
export type MapFlavor = Flavor;

/**
 * Sprite sheets from protomaps/basemaps-assets (public/assets/sprites/v4/). Only these two
 * contain POI icons; the others (white, grayscale, black) have road shields only.
 */
export type SpriteSheet = 'light' | 'dark';

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
    /** Translucent overlay behind modal dialogs. */
    scrim: string;
    /** Knob of toggle switches (light in every theme, as on iOS). */
    thumb: string;
    /** The user's position dot, and its translucent accuracy circle. */
    location: string;
    locationAccuracy: string;
    /** Route line on the map (walking and driving legs; transit legs use line colors). */
    route: string;
    /** Outline under the route line, to lift it off the map. */
    routeCasing: string;
  };
  radius: { sm: string; md: string; lg: string; xl: string; full: string };
  /**
   * Liquid Glass material (technique after liquid-glass-svelte by Tozaburo, MIT): a sharp,
   * bright edge band around a more blurred center, plus a thin specular rim.
   */
  glass: {
    /** Tint of floating controls (search, map buttons): mostly clear. */
    tint: string;
    /** Tint of panels with text (sheet, dialogs): denser, for legibility. */
    panel: string;
    /** Tint of the edge band — the thickness of the glass. */
    edge: string;
    /** Grouped lists and segmented controls inside a glass panel. */
    group: string;
    /** Rim highlight + drop shadow of controls / of panels. */
    shadow: string;
    panelShadow: string;
    /** Backdrop blur of the center of controls / of panels, and of the edge band. */
    blur: string;
    panelBlur: string;
    edgeBlur: string;
    /** Width of the edge band. */
    edgeWidth: string;
    /** How much the glass intensifies the colors behind it, e.g. "180%". */
    saturate: string;
  };
  shadow: { sm: string; md: string; lg: string };
  font: { body: string; mono: string };
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
