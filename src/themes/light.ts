import { namedFlavor } from '@protomaps/basemaps';
import type { Theme } from './types';

const theme: Theme = {
  id: 'light',
  name: { en: 'Light', ru: 'Светлая' },
  scheme: 'light',
  ui: {
    color: {
      surface: '#ffffff',
      surfaceRaised: '#f3f4f6',
      surfaceHover: '#e5e7eb',
      text: '#1f2328',
      textMuted: '#57606a',
      border: '#d0d7de',
      accent: '#0b5fcc',
      onAccent: '#ffffff',
      focus: '#0b5fcc',
      scrim: 'rgb(0 0 0 / 0.32)',
      thumb: '#ffffff',
      location: '#1a73e8',
      locationAccuracy: 'rgb(26 115 232 / 0.16)',
    },
    radius: { sm: '10px', md: '14px', lg: '20px', xl: '30px', full: '999px' },
    glass: {
      tint: 'rgb(255 255 255 / 0.24)',
      panel: 'rgb(255 255 255 / 0.68)',
      edge: 'rgb(255 255 255 / 0.32)',
      group: 'rgb(255 255 255 / 0.6)',
      shadow:
        'inset 0 1px 0.5px rgb(255 255 255 / 0.95), inset 0 0 0 1px rgb(255 255 255 / 0.4), inset 0 -1px 0.5px rgb(255 255 255 / 0.35), 0 6px 20px rgb(15 23 42 / 0.16)',
      panelShadow:
        'inset 0 1px 0.5px rgb(255 255 255 / 0.95), inset 0 0 0 1px rgb(255 255 255 / 0.45), 0 16px 48px rgb(15 23 42 / 0.2)',
      blur: '8px',
      panelBlur: '28px',
      edgeBlur: '1.5px',
      edgeWidth: '5px',
      saturate: '180%',
    },
    shadow: {
      sm: '0 1px 2px rgb(0 0 0 / 0.12)',
      md: '0 1px 3px rgb(0 0 0 / 0.12), 0 4px 12px rgb(0 0 0 / 0.08)',
      lg: '0 2px 6px rgb(0 0 0 / 0.12), 0 12px 32px rgb(0 0 0 / 0.14)',
    },
    font: {
      body: '"JetBrains Mono Variable", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
      mono: '"JetBrains Mono Variable", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    },
  },
  map: namedFlavor('light'),
  sprite: 'light',
};

export default theme;
