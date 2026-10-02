import { describe, expect, it } from 'vitest';
import { contrastRatio, mix, parseColor, tone } from '../../src/lib/color';

describe('color', () => {
  it('parses hex and rgb() colors', () => {
    expect(parseColor('#fff')).toEqual([255, 255, 255, 1]);
    expect(parseColor('#80deea')).toEqual([128, 222, 234, 1]);
    expect(parseColor('rgba(210, 239, 207, 0.5)')).toEqual([210, 239, 207, 0.5]);
    expect(parseColor('rgb(0 0 0 / 0.25)')).toEqual([0, 0, 0, 0.25]);
  });

  it('computes WCAG contrast', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1);
  });

  it('mixes colors', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('tones colors onto a ramp, keeping alpha', () => {
    expect(tone('#ffffff', '#000000', '#ff0000')).toBe('#ff0000');
    expect(tone('#000000', '#00ff00', '#ffffff')).toBe('#00ff00');
    expect(tone('rgba(255, 255, 255, 0.5)', '#000000', '#ff0000')).toBe('#ff000080');
  });
});
