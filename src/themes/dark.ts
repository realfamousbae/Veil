import { namedFlavor } from '@protomaps/basemaps';
import type { Theme } from './types';

const theme: Theme = {
  id: 'dark',
  name: { en: 'Dark', ru: 'Тёмная' },
  scheme: 'dark',
  ui: {
    color: {
      surface: '#1c1f24',
      surfaceRaised: '#2a2e35',
      surfaceHover: '#363b43',
      text: '#e8eaed',
      textMuted: '#a9b0b9',
      border: '#3d434c',
      accent: '#7ab4ff',
      onAccent: '#0b1a2e',
      focus: '#7ab4ff',
      scrim: 'rgb(0 0 0 / 0.56)',
      thumb: '#f2f4f7',
      location: '#7ab4ff',
      locationAccuracy: 'rgb(122 180 255 / 0.18)',
    },
    radius: { sm: '10px', md: '14px', lg: '20px', xl: '30px', full: '999px' },
    glass: {
      tint: 'rgb(30 33 40 / 0.36)',
      panel: 'rgb(24 27 33 / 0.74)',
      edge: 'rgb(255 255 255 / 0.07)',
      group: 'rgb(255 255 255 / 0.07)',
      shadow:
        'inset 0 1px 0.5px rgb(255 255 255 / 0.32), inset 0 0 0 1px rgb(255 255 255 / 0.12), inset 0 -1px 0.5px rgb(255 255 255 / 0.08), 0 6px 20px rgb(0 0 0 / 0.45)',
      panelShadow:
        'inset 0 1px 0.5px rgb(255 255 255 / 0.28), inset 0 0 0 1px rgb(255 255 255 / 0.1), 0 16px 48px rgb(0 0 0 / 0.55)',
      blur: '8px',
      panelBlur: '28px',
      edgeBlur: '1.5px',
      edgeWidth: '5px',
      saturate: '160%',
    },
    shadow: {
      sm: '0 1px 2px rgb(0 0 0 / 0.4)',
      md: '0 1px 3px rgb(0 0 0 / 0.4), 0 4px 12px rgb(0 0 0 / 0.3)',
      lg: '0 2px 6px rgb(0 0 0 / 0.4), 0 12px 32px rgb(0 0 0 / 0.45)',
    },
    font: {
      body: '"JetBrains Mono Variable", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
      mono: '"JetBrains Mono Variable", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    },
  },
  map: namedFlavor('dark'),
  sprite: 'dark',
};

export default theme;
