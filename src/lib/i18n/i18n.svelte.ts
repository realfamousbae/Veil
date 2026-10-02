import { getSetting, setSetting } from '../storage/settings';
import en from './en.json';
import ru from './ru.json';

export type Locale = 'ru' | 'en';
export type MessageKey = keyof typeof en;

// `satisfies` makes the type checker fail if a dictionary misses a key.
const dictionaries = { en, ru } satisfies Record<Locale, Record<MessageKey, string>>;

export const LOCALES: { id: Locale; name: string }[] = [
  { id: 'ru', name: 'Русский' },
  { id: 'en', name: 'English' },
];

function browserLocale(): Locale {
  return navigator.languages.some((l) => l.toLowerCase().startsWith('ru')) ? 'ru' : 'en';
}

/** UI language: the manual choice if any, otherwise the browser's. Map labels follow it. */
class I18n {
  choice = $state<'auto' | Locale>('auto');
  locale: Locale = $derived(this.choice === 'auto' ? browserLocale() : this.choice);

  async init(): Promise<void> {
    this.choice = await getSetting('locale');
  }

  async choose(choice: 'auto' | Locale): Promise<void> {
    this.choice = choice;
    await setSetting('locale', choice);
  }

  /** Translates a key; `{name}` placeholders are filled from `params`. */
  t = (key: MessageKey, params?: Record<string, string | number>): string => {
    const text = dictionaries[this.locale][key];
    return params ? text.replace(/\{(\w+)\}/g, (m, k: string) => String(params[k] ?? m)) : text;
  };
}

export const i18n = new I18n();
export const t = i18n.t;
