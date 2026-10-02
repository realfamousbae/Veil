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
      location: '#7ab4ff',
      locationAccuracy: 'rgb(122 180 255 / 0.18)',
    },
    radius: { sm: '6px', md: '10px', lg: '16px', full: '999px' },
    shadow: {
      sm: '0 1px 2px rgb(0 0 0 / 0.4)',
      md: '0 1px 3px rgb(0 0 0 / 0.4), 0 4px 12px rgb(0 0 0 / 0.3)',
      lg: '0 2px 6px rgb(0 0 0 / 0.4), 0 12px 32px rgb(0 0 0 / 0.45)',
    },
    font: {
      body: 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif',
    },
  },
  map: namedFlavor('dark'),
  sprite: 'dark',
};

export default theme;
