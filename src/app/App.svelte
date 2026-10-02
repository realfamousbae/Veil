<script lang="ts">
  import type { VectorSourceSpecification } from '@maplibre/maplibre-gl-style-spec';
  import { Marker, type Map } from 'maplibre-gl';
  import { untrack } from 'svelte';
  import Attribution from '../components/Attribution.svelte';
  import MapControls from '../components/MapControls.svelte';
  import SearchBar from '../components/SearchBar.svelte';
  import SearchPanel from '../components/SearchPanel.svelte';
  import SettingsDialog from '../components/SettingsDialog.svelte';
  import Sheet, { type SheetSnap } from '../components/Sheet.svelte';
  import { loadConfig, resolveUrl } from '../lib/config';
  import { i18n, t } from '../lib/i18n/i18n.svelte';
  import { onLongPress } from '../lib/map/long-press';
  import MapView from '../lib/map/MapView.svelte';
  import { buildStyle } from '../lib/map/style';
  import { PhotonGeocodeProvider } from '../lib/providers/photon';
  import { PmtilesTileProvider } from '../lib/providers/pmtiles';
  import type { GeocodeProvider, Place } from '../lib/providers/types';
  import { readPlaceFromHash, writePlaceToHash } from '../lib/search/place-hash';
  import { searchPrefs } from '../lib/search/prefs.svelte';
  import { SearchState } from '../lib/search/search.svelte';
  import { applyTheme } from '../lib/theme/css';
  import { themeState } from '../lib/theme/theme.svelte';

  const MOSCOW: [number, number] = [37.62, 55.75];
  const WIDE = 768; // must match the @container breakpoints in components
  const assetsBase = resolveUrl(`${import.meta.env.BASE_URL}assets/`);
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  let source = $state.raw<VectorSourceSpecification>();
  let geocoder = $state.raw<GeocodeProvider>();
  let error = $state<string>();
  let map = $state.raw<Map>();

  let width = $state(0);
  let height = $state(0);
  let snap = $state<SheetSnap>('collapsed');
  let sheetHeight = $state(0);
  let searchInput = $state<HTMLInputElement>();
  let settings: SettingsDialog;

  const wide = $derived(width >= WIDE);
  const style = $derived(
    source && buildStyle({ source, theme: themeState.current, lang: i18n.locale, assetsBase }),
  );

  const search = new SearchState({
    provider: () => geocoder,
    lang: () => i18n.locale,
    bias: () => {
      const c = map?.getCenter();
      return searchPrefs.bias && c ? { lng: c.lng, lat: c.lat } : undefined;
    },
    onEnterOnly: () => searchPrefs.onEnter,
  });

  // A place from a shared link is shown as is: no geocoder request on load (PLAN.md §5.1).
  const restored = readPlaceFromHash();
  if (restored) search.select(restored);

  $effect(() => applyTheme(themeState.current));
  $effect(() => {
    document.documentElement.lang = i18n.locale;
  });

  async function init() {
    const [config] = await Promise.all([
      loadConfig(),
      themeState.init(),
      i18n.init(),
      searchPrefs.init(),
    ]);
    geocoder = new PhotonGeocodeProvider(config.geocoder.url, config.geocoder.langs);
    source = await new PmtilesTileProvider(resolveUrl(config.tiles.world)).source();
  }

  init().catch((e: unknown) => (error = e instanceof Error ? e.message : String(e)));

  // Selected place → URL fragment and map marker.
  $effect(() => writePlaceToHash(search.selected));

  let marker: Marker | undefined;
  $effect(() => {
    const place = search.selected;
    if (!map) return;
    if (!place) {
      marker?.remove();
      marker = undefined;
      return;
    }
    if (!marker) {
      const el = document.createElement('div');
      el.className = 'place-marker';
      el.innerHTML = '<div class="place-pin"></div>';
      marker = new Marker({ element: el, anchor: 'bottom' });
    }
    marker.setLngLat(place.point).addTo(map);
  });

  $effect(() => {
    if (!map) return;
    return onLongPress(map, (point) => {
      void search.reverse(point);
      if (!wide && snap === 'collapsed') snap = 'half';
    });
  });

  // New results or a new place appear in the sheet: open it halfway on phones. Only these
  // changes re-run the effect, so a sheet the user collapsed stays collapsed.
  $effect(() => {
    const hasContent = search.status !== 'idle' || search.selected;
    untrack(() => {
      if (hasContent && !wide && snap === 'collapsed') snap = 'half';
    });
  });

  /** Picks a search result: shows it and moves the map to it. */
  function pick(place: Place) {
    search.select(place);
    if (!wide) {
      searchInput?.blur(); // hide the on-screen keyboard
      snap = 'half';
    }
    if (!map) return;
    const padding = wide
      ? 48
      : { top: 80, bottom: Math.round(height * 0.5) + 16, left: 32, right: 32 };
    const duration = reducedMotion() ? 0 : 800;
    const [w, s, e, n] = place.extent ?? [];
    if (w !== undefined && s !== undefined && e !== undefined && n !== undefined && w !== e) {
      map.fitBounds([w, s, e, n], { padding, maxZoom: 17, duration });
    } else {
      map.easeTo({ center: place.point, zoom: Math.max(map.getZoom(), 16), padding, duration });
    }
  }

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
      searchInput?.focus();
    } else if (e.key === 'Escape' && !document.querySelector('dialog[open]')) {
      if (document.activeElement === searchInput) searchInput?.blur();
      else if (search.selected) search.deselect();
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
        <MapView
          {style}
          center={restored ? [restored.point.lng, restored.point.lat] : MOSCOW}
          zoom={restored ? 16 : 12}
          onready={(m) => (map = m)}
        />
      {/if}
      <div class="corner">
        <MapControls {map} onsettings={() => settings.open()} />
        <Attribution />
      </div>
    </main>

    <div class="search-slot">
      <SearchBar {search} onpick={pick} bind:input={searchInput} />
    </div>

    <Sheet bind:snap bind:visibleHeight={sheetHeight} containerHeight={height} {wide}>
      <SearchPanel {search} onEnterOnly={searchPrefs.onEnter} onpick={pick} />
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
