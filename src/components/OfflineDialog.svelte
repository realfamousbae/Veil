<script lang="ts">
  import { formatBuildDate, formatBytes } from '../lib/format';
  import { i18n, t } from '../lib/i18n/i18n.svelte';
  import { offlineRegions, offlineSupported } from '../lib/offline/regions.svelte';
  import { installState } from '../lib/pwa/install.svelte';
  import type { RegionInfo } from '../lib/tiles/catalog';
  import Icon from './Icon.svelte';

  let { catalog }: { catalog: RegionInfo[] } = $props();

  let dialog: HTMLDialogElement;
  let usage = $state<number | null>(null);

  export function open() {
    dialog.showModal();
    void refreshUsage();
  }

  async function refreshUsage() {
    usage = (await navigator.storage?.estimate?.())?.usage ?? null;
  }

  // Keep the usage figure current as downloads finish or get removed.
  $effect(() => {
    void offlineRegions.regions.length;
    void offlineRegions.active;
    void refreshUsage();
  });

  function onclick(e: MouseEvent) {
    const r = dialog.getBoundingClientRect();
    const inside =
      e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) dialog.close();
  }

  const fmt = (n: number) => formatBytes(n, i18n.locale);
  const errorText = (reason: string, info: RegionInfo) =>
    reason === 'space'
      ? t('offline.error.space', { free: fmt(Math.max(0, info.size)) })
      : t(`offline.error.${reason}` as Parameters<typeof t>[0]);
</script>

<dialog bind:this={dialog} aria-labelledby="offline-title" {onclick}>
  <header>
    <h2 id="offline-title">{t('offline.title')}</h2>
    <button
      class="icon"
      type="button"
      aria-label={t('common.close')}
      onclick={() => dialog.close()}
    >
      <Icon name="close" />
    </button>
  </header>

  {#if !offlineSupported()}
    <p>{t('offline.unsupported')}</p>
  {:else}
    <p class="muted">{t('offline.intro')}</p>
    {#if installState.ios && !installState.standalone}
      <p class="warning" role="note">{t('offline.iosInstallFirst')} {t('pwa.iosHint')}</p>
    {/if}

    {#if catalog.length}
      <ul>
        {#each catalog as info (info.id)}
          {@const region = offlineRegions.find(info.id)}
          {@const active = offlineRegions.active === info.id}
          {@const error = offlineRegions.error?.id === info.id ? offlineRegions.error : null}
          <li>
            <div class="row">
              <div class="text">
                <span class="name">{info.name[i18n.locale]}</span>
                <span class="meta">
                  {fmt(info.size)} · {t('offline.build', {
                    date: formatBuildDate(info.build, i18n.locale),
                  })}
                </span>
              </div>
              <div class="buttons">
                {#if active}
                  <button type="button" onclick={() => offlineRegions.pause()}>
                    {t('offline.pause')}
                  </button>
                {:else if region?.complete}
                  <span class="done">
                    <Icon name="check" />
                    {t('offline.downloaded')}
                  </span>
                {:else}
                  <button
                    class="primary"
                    type="button"
                    disabled={!!offlineRegions.active}
                    onclick={() => offlineRegions.start(info)}
                  >
                    {region ? t('offline.resume') : t('offline.download')}
                  </button>
                {/if}
                {#if region && !active}
                  <button type="button" onclick={() => offlineRegions.remove(info.id)}>
                    {t('offline.delete')}
                  </button>
                {/if}
              </div>
            </div>
            {#if region && !region.complete}
              <progress max={info.size} value={region.bytes} aria-label={info.name[i18n.locale]}
              ></progress>
              <span class="meta">
                {fmt(region.bytes)} / {fmt(info.size)}
                {#if !active}· {t('offline.paused')}{/if}
              </span>
            {/if}
            {#if error}
              <p class="error" role="alert">{errorText(error.reason, info)}</p>
            {/if}
          </li>
        {/each}
      </ul>
    {:else}
      <p>{t('offline.none')}</p>
    {/if}

    {#if usage !== null}
      <p class="muted small">{t('offline.used', { size: fmt(usage) })}</p>
    {/if}
  {/if}
</dialog>

<style>
  dialog {
    width: min(440px, calc(100% - 32px));
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

  p {
    margin: 0 0 12px;
  }

  .muted,
  .meta {
    color: var(--color-text-muted);
  }

  .small,
  .meta {
    font-size: 13px;
  }

  .warning {
    padding: 8px 12px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface-raised);
  }

  .error {
    margin: 6px 0 0;
    color: var(--color-text);
    font-size: 14px;
  }

  ul {
    margin: 0 0 12px;
    padding: 0;
    list-style: none;
  }

  li {
    padding: 10px 0;
    border-top: 1px solid var(--color-border);
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .name {
    font-weight: 600;
  }

  .buttons {
    display: flex;
    gap: 8px;
  }

  button {
    min-height: 44px;
    padding: 0 14px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface-raised);
    color: var(--color-text);
    font: inherit;
    cursor: pointer;
  }

  button.primary {
    border-color: var(--color-accent);
    background: var(--color-accent);
    color: var(--color-on-accent);
  }

  button:disabled {
    opacity: 0.5;
    cursor: default;
  }

  button.icon {
    display: grid;
    place-items: center;
    width: 44px;
    margin-right: -10px;
    padding: 0;
    border: 0;
    background: none;
  }

  .done {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--color-accent);
  }

  progress {
    width: 100%;
    height: 6px;
    margin-top: 8px;
    accent-color: var(--color-accent);
  }
</style>
