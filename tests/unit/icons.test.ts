import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Safari ignores <style> inside an external SVG sprite used via <use>, so every shape
// must carry its own presentation attributes, or icons render as black blobs (or vanish).
const sprite = readFileSync('public/assets/icons.svg', 'utf8');
const shapes = [...sprite.matchAll(/<(path|circle|rect|line|polyline|polygon|ellipse)\b[^>]*>/g)].map(
  (m) => m[0],
);

describe('icon sprite', () => {
  it('has no <style> block', () => {
    expect(sprite).not.toMatch(/<style/i);
  });

  it('styles every shape with attributes', () => {
    expect(shapes.length).toBeGreaterThan(10);
    for (const shape of shapes) {
      expect(shape, shape).toMatch(/\bfill="(none|currentColor)"/);
      expect(shape, shape).toMatch(/\bstroke="currentColor"/);
    }
  });
});
