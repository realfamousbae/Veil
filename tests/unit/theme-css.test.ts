import { describe, expect, it } from 'vitest';
import { tokensToCssVars } from '../../src/lib/theme/css';
import light from '../../src/themes/light';

describe('tokensToCssVars', () => {
  const vars = tokensToCssVars(light.ui);

  it('maps nested camelCase tokens to kebab-case custom properties', () => {
    expect(vars['--color-surface-raised']).toBe(light.ui.color.surfaceRaised);
    expect(vars['--radius-md']).toBe(light.ui.radius.md);
    expect(vars['--shadow-lg']).toBe(light.ui.shadow.lg);
    expect(vars['--font-body']).toBe(light.ui.font.body);
  });

  it('emits one property per token', () => {
    const count = Object.values(light.ui).reduce((n, group) => n + Object.keys(group).length, 0);
    expect(Object.keys(vars)).toHaveLength(count);
  });
});
