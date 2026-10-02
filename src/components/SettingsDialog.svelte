<script lang="ts">
  import { i18n, LOCALES, t, type Locale } from '../lib/i18n/i18n.svelte';
  import { themeState } from '../lib/theme/theme.svelte';
  import { themes } from '../themes';
  import Icon from './Icon.svelte';

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
</script>

<dialog bind:this={dialog} aria-labelledby="settings-title" {onclick}>
  <header>
    <h2 id="settings-title">{t('settings.title')}</h2>
    <button
      class="close"
      type="button"
      aria-label={t('common.close')}
      onclick={() => dialog.close()}
    >
      <Icon name="close" />
    </button>
  </header>

  <fieldset>
    <legend>{t('settings.theme')}</legend>
    {#each [{ id: 'auto', label: t('settings.themeAuto') }, ...themes.map( (th) => ({ id: th.id, label: th.name[i18n.locale] }) )] as option (option.id)}
      <label>
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
  </fieldset>

  <fieldset>
    <legend>{t('settings.language')}</legend>
    {#each [{ id: 'auto', name: t('settings.languageAuto') }, ...LOCALES] as option (option.id)}
      <label>
        <input
          type="radio"
          name="locale"
          value={option.id}
          checked={i18n.choice === option.id}
          onchange={() => i18n.choose(option.id as 'auto' | Locale)}
        />
        {option.name}
      </label>
    {/each}
  </fieldset>
</dialog>

<style>
  dialog {
    width: min(360px, calc(100% - 32px));
    max-height: calc(100% - 32px);
    padding: 0 16px 16px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    color: var(--color-text);
    box-shadow: var(--shadow-lg);
  }

  dialog::backdrop {
    background: var(--color-scrim);
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  h2 {
    margin: 0;
    font-size: 18px;
  }

  .close {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    margin-right: -10px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-md);
    background: none;
    color: inherit;
    cursor: pointer;
  }

  .close:hover {
    background: var(--color-surface-hover);
  }

  fieldset {
    margin: 8px 0 0;
    padding: 0;
    border: 0;
  }

  legend {
    padding: 8px 0 4px;
    color: var(--color-text-muted);
    font-size: 14px;
  }

  label {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 44px;
    padding: 0 8px;
    border-radius: var(--radius-md);
    cursor: pointer;
  }

  label:hover {
    background: var(--color-surface-hover);
  }

  input {
    width: 18px;
    height: 18px;
    margin: 0;
    accent-color: var(--color-accent);
  }
</style>
