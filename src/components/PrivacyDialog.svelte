<script lang="ts">
  import { t } from '../lib/i18n/i18n.svelte';
  import Icon from './Icon.svelte';

  /** Host names of this deployment, so the text stays true for self-hosted setups. */
  let { siteHost, geocoderHost }: { siteHost: string; geocoderHost: string } = $props();

  let dialog: HTMLDialogElement;

  export function open() {
    dialog.showModal();
  }

  function onclick(e: MouseEvent) {
    const r = dialog.getBoundingClientRect();
    const inside =
      e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) dialog.close();
  }
</script>

<dialog bind:this={dialog} aria-labelledby="privacy-title" {onclick}>
  <header>
    <h2 id="privacy-title">{t('privacy.title')}</h2>
    <button type="button" aria-label={t('common.close')} onclick={() => dialog.close()}>
      <Icon name="close" />
    </button>
  </header>

  <p class="lead">{t('privacy.intro')}</p>

  <h3>{t('privacy.deviceTitle')}</h3>
  <p>{t('privacy.device')}</p>

  <h3>{t('privacy.whoTitle')}</h3>
  <ul>
    <li>{t('privacy.hosting', { host: siteHost })}</li>
    <li>{t('privacy.search', { host: geocoderHost })}</li>
    <li>{t('privacy.location')}</li>
    <li>{t('privacy.links')}</li>
  </ul>

  <h3>{t('privacy.selfHostTitle')}</h3>
  <p>{t('privacy.selfHost')}</p>
</dialog>

<style>
  dialog {
    width: min(520px, calc(100% - 32px));
    max-height: calc(100% - 32px);
    padding: 0 20px 16px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    color: var(--color-text);
    box-shadow: var(--shadow-lg);
    line-height: 1.45;
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

  h3 {
    margin: 16px 0 4px;
    font-size: 15px;
  }

  p,
  ul {
    margin: 0;
  }

  .lead {
    font-weight: 600;
  }

  ul {
    padding-left: 20px;
  }

  li + li {
    margin-top: 6px;
  }

  button {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    margin-right: -12px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-md);
    background: none;
    color: inherit;
    cursor: pointer;
  }

  button:hover {
    background: var(--color-surface-hover);
  }
</style>
