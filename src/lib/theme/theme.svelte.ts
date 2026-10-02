import { defaultTheme, findTheme } from '../../themes';
import type { Theme } from '../../themes/types';
import { getSetting, setSetting } from '../storage/settings';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Current theme: the manual choice if any, otherwise one matching the system color scheme. */
class ThemeState {
  /** Theme id, or "auto". */
  choice = $state('auto');
  systemScheme = $state<'light' | 'dark'>('light');

  current: Theme = $derived(
    (this.choice !== 'auto' && findTheme(this.choice)) || defaultTheme(this.systemScheme),
  );

  /** Loads the saved choice and starts following the system scheme. */
  async init(): Promise<void> {
    const media = matchMedia(DARK_QUERY);
    this.systemScheme = media.matches ? 'dark' : 'light';
    media.addEventListener('change', (e) => (this.systemScheme = e.matches ? 'dark' : 'light'));
    this.choice = await getSetting('theme');
  }

  async choose(choice: string): Promise<void> {
    this.choice = choice;
    await setSetting('theme', choice);
  }
}

export const themeState = new ThemeState();
