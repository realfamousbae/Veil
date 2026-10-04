import { describe, expect, it } from 'vitest';
import { formatDistance, formatDuration } from '../../src/lib/format';

describe('formatDuration', () => {
  it('shows minutes, or hours and minutes', () => {
    expect(formatDuration(20, 'en')).toBe('1 min');
    expect(formatDuration(25 * 60, 'en')).toBe('25 min');
    expect(formatDuration(85 * 60, 'en')).toBe('1 hr 25 min');
    expect(formatDuration(120 * 60, 'en')).toBe('2 hr');
    expect(formatDuration(85 * 60, 'ru')).toBe('1 ч 25 мин');
  });
});

describe('formatDistance', () => {
  it('rounds meters, shows km with one decimal under 10 km', () => {
    expect(formatDistance(643, 'en')).toBe('640 m');
    expect(formatDistance(1260, 'en')).toBe('1.3 km');
    expect(formatDistance(12_600, 'en')).toBe('13 km');
    expect(formatDistance(1260, 'ru')).toBe('1,3 км');
  });
});
