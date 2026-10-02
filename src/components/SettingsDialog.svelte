<script lang="ts">
  import { i18n, LOCALES, t, type Locale } from '../lib/i18n/i18n.svelte';
  import { installState } from '../lib/pwa/install.svelte';
  import { searchPrefs } from '../lib/search/prefs.svelte';
  import { themeState } from '../lib/theme/theme.svelte';
  import { themes } from '../themes';
  import Icon from './Icon.svelte';

  let { onoffline, onprivacy }: { onoffline: () => void; onprivacy: () => void } = $props();
  let dialog: HTMLDialogElement;

  export function open() {
    dialog.showModal();
  }

  // Close on a click on the backdrop (outside the dialog box).
  function onclick(e: MouseEvent) {
    const r = dialog.getBoundingClientRect();
    const inside =
      e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) dialog.close();
  }

  const themeOptions = $derived([
    { id: 'auto', label: t('settings.themeAuto') },
    ...themes.map((th) => ({ id: th.id, label: th.name[i18n.locale] })),
  ]);
  const localeOptions = $derived([
    { id: 'auto' as const, label: t('settings.languageAuto') },
    ...LOCALES.map((l) => ({ id: l.id, label: l.name })),
  ]);
</script>

<dialog
  class="sheet-dialog glass glass-panel"
  bind:this={dialog}
  aria-labelledby="settings-title"
  {onclick}
>
  <header>
    <h2 id="settings-title">{t('settings.title')}</h2>
    <button
      class="glass icon-btn"
      type="button"
      aria-label={t('common.close')}
      onclick={() => dialog.close()}
    >
      <Icon name="close" />
    </button>
  </header>

  <fieldset>
    <legend class="section-title">{t('settings.theme')}</legend>
    <div class="segmented">
      {#each themeOptions as option (option.id)}
        <label class="segment">
          <input
            type="radio"
            name="theme"
            value={option.id}
            checked={themeState.choice === option.id}
            onchange={() => themeState.choose(option.id)}
          />
          {option.label}
        </label>
      {/each}
    </div>
  </fieldset>

  <fieldset>
    <legend class="section-title">{t('settings.language')}</legend>
    <div class="segmented">
      {#each localeOptions as option (option.id)}
        <label class="segment">
          <input
            type="radio"
            name="locale"
            value={option.id}
            checked={i18n.choice === option.id}
            onchange={() => i18n.choose(option.id as 'auto' | Locale)}
          />
          {option.label}
        </label>
      {/each}
    </div>
  </fieldset>

  <fieldset>
    <legend class="section-title">{t('settings.search')}</legend>
    <div class="list-group">
      <label class="list-row">
        <span class="grow">{t('settings.searchOnEnter')}</span>
        <input
          class="switch"
          type="checkbox"
          role="switch"
          checked={searchPrefs.onEnter}
          onchange={(e) => searchPrefs.setOnEnter(e.currentTarget.checked)}
        />
      </label>
      <label class="list-row">
        <span class="grow">
          {t('settings.searchBias')}
          <span class="hint">{t('settings.searchBiasHint')}</span>
        </span>
        <input
          class="switch"
          type="checkbox"
          role="switch"
          checked={searchPrefs.bias}
          onchange={(e) => searchPrefs.setBias(e.currentTarget.checked)}
        />
      </label>
    </div>
  </fieldset>

  <section aria-labelledby="settings-app">
    <h3 id="settings-app" class="section-title">{t('settings.app')}</h3>
    <div class="list-group">
      <button
        class="list-row"
        type="button"
        onclick={() => {
          dialog.close();
          onoffline();
        }}
      >
        <span class="grow">{t('offline.open')}</span>
        <Icon name="chevron" />
      </button>
      <button
        class="list-row"
        type="button"
        onclick={() => {
          dialog.close();
          onprivacy();
        }}
      >
        <span class="grow">{t('privacy.open')}</span>
        <Icon name="chevron" />
      </button>
      {#if installState.standalone}
        <p class="list-row">{t('pwa.installed')}</p>
      {:else if installState.canPrompt}
        <button class="list-row accent" type="button" onclick={() => installState.install()}>
          <span class="grow">
            {t('pwa.install')}
            <span class="hint">{t('pwa.installHint')}</span>
          </span>
          <Icon name="download" />
        </button>
      {:else}
        <p class="list-row">
          <span class="grow">
            {installState.ios ? t('pwa.iosHint') : t('pwa.otherHint')}
            <span class="hint">{t('pwa.installHint')}</span>
          </span>
        </p>
      {/if}
    </div>
  </section>
</dialog>

<style>
  fieldset,
  section {
    margin: 14px 0 0;
    padding: 0;
    border: 0;
  }

  legend {
    padding: 0;
  }

  p.list-row {
    margin: 0;
  }

  .accent {
    color: var(--color-accent);
  }

  .list-row :global(.icon) {
    width: 18px;
    height: 18px;
    color: var(--color-text-muted);
  }

  .accent :global(.icon) {
    color: var(--color-accent);
  }
</style>
