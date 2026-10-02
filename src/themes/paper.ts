import { namedFlavor, type Flavor } from '@protomaps/basemaps';
import { tone } from '../lib/color';
import type { Theme } from './types';

// An old printed map: every color of the light flavor is re-toned onto a sepia
// ramp, then a few features get their own inks.
const INK = '#3b2a1a';
const PAPER = '#f7efdc';

function sepia(flavor: Flavor): Flavor {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flavor)) {
    if (typeof value === 'string' && key !== 'regular' && key !== 'bold' && key !== 'italic') {
      out[key] = tone(value, INK, PAPER, 0.15);
    } else if (value && typeof value === 'object') {
      out[key] = Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, tone(v as string, INK, PAPER, 0.3)]),
      );
    } else {
      out[key] = value;
    }
  }
  return out as unknown as Flavor;
}

const map: Flavor = {
  ...sepia(namedFlavor('light')),
  background: '#e9dcc0',
  earth: '#f4ead3',
  water: '#b9cfc8',
  ocean_label: '#4f6e66',
  park_a: '#e2e2c4',
  park_b: '#c9d1a6',
  wood_a: '#e0e0c2',
  wood_b: '#c4cd9f',
  buildings: '#e2d3b4',
  highway: '#f0c98f',
  highway_casing_early: '#b98a55',
  highway_casing_late: '#b98a55',
  major: '#fbf3df',
  major_casing_early: '#c9b48e',
  major_casing_late: '#c9b48e',
  railway: '#8a7258',
  boundaries: '#9b7f63',
  city_label: '#3b2a1a',
  city_label_halo: '#f4ead3',
  roads_label_major: '#5c4630',
  roads_label_minor: '#6e5840',
};

const theme: Theme = {
  id: 'paper',
  name: { en: 'Paper', ru: 'Бумажная' },
  scheme: 'light',
  ui: {
    color: {
      surface: '#f7f0de',
      surfaceRaised: '#ede3c9',
      surfaceHover: '#e2d5b5',
      text: '#33261a',
      textMuted: '#62503c',
      border: '#c7b691',
      accent: '#8a3b12',
      onAccent: '#fbf6ea',
      focus: '#8a3b12',
    },
    radius: { sm: '2px', md: '3px', lg: '4px', full: '999px' },
    shadow: {
      sm: '0 1px 1px rgb(59 42 26 / 0.18)',
      md: '0 1px 2px rgb(59 42 26 / 0.2), 0 3px 8px rgb(59 42 26 / 0.12)',
      lg: '0 2px 4px rgb(59 42 26 / 0.2), 0 10px 24px rgb(59 42 26 / 0.18)',
    },
    font: {
      body: 'Charter, "Bitstream Charter", "Iowan Old Style", Georgia, Cambria, "Times New Roman", serif',
    },
  },
  map,
  sprite: 'light',
};

export default theme;
