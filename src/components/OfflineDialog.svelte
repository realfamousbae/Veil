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

<dialog
  class="sheet-dialog glass glass-panel"
  bind:this={dialog}
  aria-labelledby="offline-title"
  {onclick}
>
  <header>
    <h2 id="offline-title">{t('offline.title')}</h2>
    <button
      class="glass icon-btn"
      type="button"
      aria-label={t('common.close')}
      onclick={() => dialog.close()}
    >
      <Icon name="close" />
    </button>
  </header>

  {#if !offlineSupported()}
    <p class="intro">{t('offline.unsupported')}</p>
  {:else}
    <p class="intro">{t('offline.intro')}</p>
    {#if installState.ios && !installState.standalone}
      <p class="warning list-group" role="note">
        {t('offline.iosInstallFirst')}
        {t('pwa.iosHint')}
      </p>
    {/if}

    {#if catalog.length}
      <ul class="list-group">
        {#each catalog as info (info.id)}
          {@const region = offlineRegions.find(info.id)}
          {@const active = offlineRegions.active === info.id}
          {@const error = offlineRegions.error?.id === info.id ? offlineRegions.error : null}
          <li class="region">
            <div class="row">
              <div class="text">
                <span class="name">{info.name[i18n.locale]}</span>
                <span class="meta">
                  {fmt(info.size)} · {t('offline.build', {
                    date: formatBuildDate(info.build, i18n.locale),
                  })}
                </span>
              </div>
              {#if region?.complete && !active}
                <span class="done">
                  <Icon name="check" />
                  {t('offline.downloaded')}
                </span>
              {/if}
            </div>

            {#if region && !region.complete}
              <div class="progress" aria-hidden="true">
                <span style:width="{(region.bytes / info.size) * 100}%"></span>
              </div>
              <progress
                class="visually-hidden"
                max={info.size}
                value={region.bytes}
                aria-label={info.name[i18n.locale]}
              ></progress>
              <span class="meta">
                {fmt(region.bytes)} / {fmt(info.size)}
                {#if !active}· {t('offline.paused')}{/if}
              </span>
            {/if}

            <div class="buttons">
              {#if active}
                <button class="glass pill" type="button" onclick={() => offlineRegions.pause()}>
                  {t('offline.pause')}
                </button>
              {:else if !region?.complete}
                <button
                  class="glass pill pill-accent"
                  type="button"
                  disabled={!!offlineRegions.active}
                  onclick={() => offlineRegions.start(info)}
                >
                  <Icon name="download" />
                  {region ? t('offline.resume') : t('offline.download')}
                </button>
              {/if}
              {#if region && !active}
                <button
                  class="glass pill"
                  type="button"
                  onclick={() => offlineRegions.remove(info.id)}
                >
                  {t('offline.delete')}
                </button>
              {/if}
            </div>
            {#if error}
              <p class="error" role="alert">{errorText(error.reason, info)}</p>
            {/if}
          </li>
        {/each}
      </ul>
    {:else}
      <p class="intro">{t('offline.none')}</p>
    {/if}

    {#if usage !== null}
      <p class="usage">{t('offline.used', { size: fmt(usage) })}</p>
    {/if}
  {/if}
</dialog>

<style>
  .intro {
    margin: 0 4px 14px;
    color: var(--color-text-muted);
    font-size: 14px;
  }

  .warning {
    margin: 0 0 14px;
    padding: 12px 14px;
    font-size: 13px;
  }

  .region {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px 16px;
  }

  .region + .region {
    border-top: 1px solid var(--color-border);
  }

  .row {
    display: flex;
    align-items: flex-start;
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

  .meta {
    color: var(--color-text-muted);
    font-size: 12px;
  }

  .done {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 4px;
    color: var(--color-accent);
    font-size: 13px;
    font-weight: 600;
  }

  .done :global(.icon) {
    width: 18px;
    height: 18px;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .buttons:empty {
    display: none;
  }

  .progress {
    height: 6px;
    border-radius: var(--radius-full);
    background: var(--glass-edge);
    overflow: hidden;
  }

  .progress span {
    display: block;
    height: 100%;
    border-radius: var(--radius-full);
    background: var(--color-accent);
    transition: width 0.2s linear;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .error {
    margin: 0;
    font-size: 13px;
  }

  .usage {
    margin: 12px 6px 0;
    color: var(--color-text-muted);
    font-size: 12px;
  }
</style>
