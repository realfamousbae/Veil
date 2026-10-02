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
    },
    radius: { sm: '6px', md: '10px', lg: '16px', full: '999px' },
    shadow: {
      sm: '0 1px 2px rgb(0 0 0 / 0.12)',
      md: '0 1px 3px rgb(0 0 0 / 0.12), 0 4px 12px rgb(0 0 0 / 0.08)',
      lg: '0 2px 6px rgb(0 0 0 / 0.12), 0 12px 32px rgb(0 0 0 / 0.14)',
    },
    font: {
      body: 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif',
    },
  },
  map: namedFlavor('light'),
  sprite: 'light',
};

export default theme;
