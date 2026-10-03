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

<dialog
  class="sheet-dialog glass glass-panel"
  bind:this={dialog}
  aria-labelledby="privacy-title"
  {onclick}
>
  <header>
    <h2 id="privacy-title">{t('privacy.title')}</h2>
    <button
      class="glass icon-btn"
      type="button"
      aria-label={t('common.close')}
      onclick={() => dialog.close()}
    >
      <Icon name="close" />
    </button>
  </header>

  <div class="dialog-body">
    <p class="lead">{t('privacy.intro')}</p>

    <h3 class="section-title">{t('privacy.deviceTitle')}</h3>
    <p class="list-group block">{t('privacy.device')}</p>

    <h3 class="section-title">{t('privacy.whoTitle')}</h3>
    <ul class="list-group">
      <li class="list-row">{t('privacy.hosting', { host: siteHost })}</li>
      <li class="list-row">{t('privacy.search', { host: geocoderHost })}</li>
      <li class="list-row">{t('privacy.location')}</li>
      <li class="list-row">{t('privacy.links')}</li>
    </ul>

    <h3 class="section-title">{t('privacy.selfHostTitle')}</h3>
    <p class="list-group block">{t('privacy.selfHost')}</p>
  </div>
</dialog>

<style>
  .lead {
    margin: 0 4px;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.4;
  }

  .block {
    padding: 12px 16px;
    font-size: 14px;
  }

  .list-row {
    font-size: 14px;
    line-height: 1.45;
  }
</style>
