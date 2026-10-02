import { getDb } from './db';

/** User preferences, stored locally in IndexedDB. */
export interface Settings {
  /** Theme id, or "auto" to follow prefers-color-scheme. */
  theme: string;
  /** UI language, or "auto" to follow the browser. */
  locale: 'auto' | 'ru' | 'en';
  /** Search only on Enter instead of as-you-type (PRIVACY.md §5). */
  searchOnEnter: boolean;
  /** Prefer results near the (rounded) map center. */
  searchBias: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  locale: 'auto',
  searchOnEnter: false,
  searchBias: true,
};

/** Reads a setting; falls back to the default if storage is unavailable (e.g. private mode). */
export async function getSetting<K extends keyof Settings>(key: K): Promise<Settings[K]> {
  try {
    const value = await (await getDb()).get('settings', key);
    return (value as Settings[K] | undefined) ?? DEFAULT_SETTINGS[key];
  } catch {
    return DEFAULT_SETTINGS[key];
  }
}

export async function setSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K],
): Promise<void> {
  try {
    await (await getDb()).put('settings', value, key);
  } catch {
    // Storage unavailable: the choice still applies for this session.
  }
}
