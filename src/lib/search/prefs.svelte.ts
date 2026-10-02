import { getSetting, setSetting } from '../storage/settings';

/** Privacy-related search preferences (PRIVACY.md §5), stored on the device. */
class SearchPrefs {
  onEnter = $state(false);
  bias = $state(true);

  async init(): Promise<void> {
    [this.onEnter, this.bias] = await Promise.all([
      getSetting('searchOnEnter'),
      getSetting('searchBias'),
    ]);
  }

  async setOnEnter(value: boolean): Promise<void> {
    this.onEnter = value;
    await setSetting('searchOnEnter', value);
  }

  async setBias(value: boolean): Promise<void> {
    this.bias = value;
    await setSetting('searchBias', value);
  }
}

export const searchPrefs = new SearchPrefs();
