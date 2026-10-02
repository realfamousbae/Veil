import { expect, it } from 'vitest';
import en from '../../src/lib/i18n/en.json';
import ru from '../../src/lib/i18n/ru.json';

it('ru and en dictionaries have the same keys and no empty strings', () => {
  expect(Object.keys(ru).sort()).toEqual(Object.keys(en).sort());
  for (const value of [...Object.values(en), ...Object.values(ru)])
    expect(value.trim()).not.toBe('');
});
