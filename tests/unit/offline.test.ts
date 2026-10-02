import { describe, expect, it } from 'vitest';
import { formatBuildDate, formatBytes } from '../../src/lib/format';
import { isPmtilesV3 } from '../../src/lib/offline/protocol';

describe('formatting', () => {
  it('formats sizes in the UI language', () => {
    expect(formatBytes(572_000_000, 'en')).toBe('572 MB');
    expect(formatBytes(572_000_000, 'ru')).toBe('572 МБ');
    expect(formatBytes(1_500_000_000, 'en')).toBe('1.5 GB');
    expect(formatBytes(512, 'en')).toBe('512 byte');
  });

  it('formats planet build dates', () => {
    expect(formatBuildDate('20261002', 'en')).toBe('October 2, 2026');
    expect(formatBuildDate('20261002', 'ru')).toBe('2 октября 2026 г.');
  });
});

describe('isPmtilesV3', () => {
  it('checks the file signature', () => {
    expect(isPmtilesV3(new TextEncoder().encode('PMTiles\x03'))).toBe(true);
    expect(isPmtilesV3(new TextEncoder().encode('PMTiles\x02'))).toBe(false);
    expect(isPmtilesV3(new TextEncoder().encode('<html>  '))).toBe(false);
  });
});
