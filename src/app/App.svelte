<script lang="ts">
  import type { VectorSourceSpecification } from '@maplibre/maplibre-gl-style-spec';
  import type { Map } from 'maplibre-gl';
  import Attribution from '../components/Attribution.svelte';
  import MapControls from '../components/MapControls.svelte';
  import SearchBar from '../components/SearchBar.svelte';
  import SettingsDialog from '../components/SettingsDialog.svelte';
  import Sheet, { type SheetSnap } from '../components/Sheet.svelte';
  import { loadConfig, resolveUrl } from '../lib/config';
  import { i18n, t } from '../lib/i18n/i18n.svelte';
  import MapView from '../lib/map/MapView.svelte';
  import { buildStyle } from '../lib/map/style';
  import { PmtilesTileProvider } from '../lib/providers/pmtiles';
  import { applyTheme } from '../lib/theme/css';
  import { themeState } from '../lib/theme/theme.svelte';

  const MOSCOW: [number, number] = [37.62, 55.75];
  const WIDE = 768; // must match the @container breakpoints in components
  const assetsBase = resolveUrl(`${import.meta.env.BASE_URL}assets/`);

  let source = $state.raw<VectorSourceSpecification>();
  let error = $state<string>();
  let map = $state.raw<Map>();

  let width = $state(0);
  let height = $state(0);
  let snap = $state<SheetSnap>('collapsed');
  let sheetHeight = $state(0);
  let search = $state<HTMLInputElement>();
  let settings: SettingsDialog;

  const wide = $derived(width >= WIDE);
  const style = $derived(
    source && buildStyle({ source, theme: themeState.current, lang: i18n.locale, assetsBase }),
  );

  $effect(() => applyTheme(themeState.current));
  $effect(() => {
    document.documentElement.lang = i18n.locale;
  });

  async function init() {
    const [config] = await Promise.all([loadConfig(), themeState.init(), i18n.init()]);
    source = await new PmtilesTileProvider(resolveUrl(config.tiles.world)).source();
  }

  init().catch((e: unknown) => (error = e instanceof Error ? e.message : String(e)));

  function isTyping(target: EventTarget | null): boolean {
    return (
      target instanceof HTMLElement &&
      (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
    );
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '/' && !isTyping(e.target)) {
      e.preventDefault();
      search?.focus();
    } else if (e.key === 'Escape' && !document.querySelector('dialog[open]')) {
      if (document.activeElement === search) search?.blur();
      else snap = 'collapsed';
    }
  }
</script>

<svelte:window {onkeydown} />

<div class="shell" bind:clientWidth={width} bind:clientHeight={height}>
  <div class="layout" class:wide style:--sheet-height="{wide ? 0 : sheetHeight}px">
    <main class="map-area" aria-label={t('app.map')}>
      {#if error}
        <p role="alert">{error}</p>
      {:else if style}
        <MapView {style} center={MOSCOW} zoom={12} onready={(m) => (map = m)} />
      {/if}
      <div class="corner">
        <MapControls {map} onsettings={() => settings.open()} />
        <Attribution />
      </div>
    </main>

    <div class="search-slot">
      <SearchBar bind:input={search} />
    </div>

    <Sheet bind:snap bind:visibleHeight={sheetHeight} containerHeight={height} {wide}>
      <p class="empty">{t('panel.empty')}</p>
    </Sheet>
  </div>
</div>

<SettingsDialog bind:this={settings} />

<style>
  .shell {
    container: shell / size;
    height: 100%;
    overflow: hidden;
  }

  /* Narrow (phone): full-screen map, floating search, bottom sheet. */
  .layout {
    position: relative;
    height: 100%;
  }

  .map-area {
    position: absolute;
    inset: 0;
  }

  .search-slot {
    position: absolute;
    top: calc(12px + env(safe-area-inset-top));
    left: calc(12px + env(safe-area-inset-left));
    right: calc(12px + env(safe-area-inset-right));
    z-index: 1;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
  }

  /* Controls sit in the thumb zone and ride above the sheet up to its half position. */
  .corner {
    position: absolute;
    right: calc(12px + env(safe-area-inset-right));
    bottom: calc(min(var(--sheet-height), 50%) + 12px);
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    transition: bottom 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .empty {
    margin: 0;
    color: var(--color-text-muted);
  }

  @media (prefers-reduced-motion: reduce) {
    .corner {
      transition: none;
    }
  }

  /* Wide (desktop): fixed left panel with search on top, map takes the rest. */
  @container shell (min-width: 768px) {
    .layout {
      display: grid;
      grid-template: 'search map' auto 'panel map' 1fr / 360px 1fr;
    }

    .map-area {
      position: relative;
      grid-area: map;
    }

    .search-slot {
      position: static;
      grid-area: search;
      padding: 16px 16px 8px;
      background: var(--color-surface);
      border-radius: 0;
      box-shadow: none;
    }

    .corner {
      right: 16px;
      bottom: 16px;
      transition: none;
    }
  }
</style>
