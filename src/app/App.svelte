<script lang="ts">
  import type { VectorSourceSpecification } from '@maplibre/maplibre-gl-style-spec';
  import { Marker, type Map } from 'maplibre-gl';
  import { untrack } from 'svelte';
  import Attribution from '../components/Attribution.svelte';
  import Icon from '../components/Icon.svelte';
  import MapControls from '../components/MapControls.svelte';
  import SearchBar from '../components/SearchBar.svelte';
  import SearchPanel from '../components/SearchPanel.svelte';
  import SettingsDialog from '../components/SettingsDialog.svelte';
  import Sheet, { type SheetSnap } from '../components/Sheet.svelte';
  import { loadConfig, resolveUrl } from '../lib/config';
  import { Locator, type Fix } from '../lib/geolocation/locator.svelte';
  import { UserLocationMarker } from '../lib/geolocation/marker';
  import { i18n, t, type MessageKey } from '../lib/i18n/i18n.svelte';
  import { readCameraFromHash, syncCameraHash, type Camera } from '../lib/map/hash';
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

  const MOSCOW: Camera = { center: [37.62, 55.75], zoom: 12, bearing: 0, pitch: 0 };
  const WIDE = 768; // must match the @container breakpoints in components
  const assetsBase = resolveUrl(`${import.meta.env.BASE_URL}assets/`);
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  let source = $state.raw<VectorSourceSpecification>();
  let geocoder = $state.raw<GeocodeProvider>();
  let error = $state<string>();
  let map = $state.raw<Map>();
  /**
   * The camera was moved to the user's own position and they haven't moved it since.
   * While true, neither the URL nor the geocoder (as search bias) may learn the map
   * center, because it is the user's location (PLAN.md §5.4).
   */
  let cameraOnUser = $state(false);

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
      return searchPrefs.bias && c && !cameraOnUser ? { lng: c.lng, lat: c.lat } : undefined;
    },
    onEnterOnly: () => searchPrefs.onEnter,
  });

  // A place from a shared link is shown as is: no geocoder request on load (PLAN.md §5.1).
  // Geolocation, only on the "Where am I" button (PLAN.md §5.4).
  const locator = new Locator(onfix);

  function onfix(fix: Fix, follow: boolean) {
    if (!map) return;
    cameraOnUser = true; // set before moving so the URL never gets this position
    const duration = reducedMotion() ? 0 : follow ? 500 : 1000;
    map.easeTo({
      center: [fix.lng, fix.lat],
      zoom: follow ? map.getZoom() : Math.max(map.getZoom(), 15),
      duration,
    });
  }

  // Recreated when the map or the label's language changes; the next effect re-applies the fix.
  let userMarker = $state.raw<UserLocationMarker>();
  $effect(() => {
    if (!map) return;
    const marker = new UserLocationMarker(map, t('locate.you'));
    userMarker = marker;
    return () => marker.remove();
  });
  $effect(() => userMarker?.update(locator.fix));

  // Panning the map by hand leaves follow mode and the user's position.
  $effect(() => {
    if (!map) return;
    const m = map;
    const leave = () => {
      cameraOnUser = false;
      locator.stopFollow();
    };
    m.on('dragstart', leave);
    return () => m.off('dragstart', leave);
  });

  let notice = $state<MessageKey | null>(null);
  $effect(() => {
    if (!locator.error) return;
    notice = `locate.${locator.error}`;
    const timer = setTimeout(() => (notice = null), 6000);
    return () => clearTimeout(timer);
  });

  const restored = readPlaceFromHash();
  if (restored) search.select(restored);
  const initialCamera: Camera =
    readCameraFromHash() ??
    (restored ? { ...MOSCOW, center: [restored.point.lng, restored.point.lat], zoom: 16 } : MOSCOW);

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
    return syncCameraHash(map, () => cameraOnUser);
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
    cameraOnUser = false;
    locator.stopFollow();
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
        <MapView {style} camera={initialCamera} onready={(m) => (map = m)} />
      {/if}
      {#if notice}
        <p class="notice" role="alert">
          <span>{t(notice)}</span>
          <button type="button" aria-label={t('common.close')} onclick={() => (notice = null)}>
            <Icon name="close" />
          </button>
        </p>
      {/if}
      <div class="corner">
        <MapControls
          {map}
          locateMode={locator.mode}
          onlocate={() => locator.press()}
          onsettings={() => settings.open()}
        />
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

  .notice {
    position: absolute;
    top: calc(72px + env(safe-area-inset-top));
    left: 12px;
    right: 12px;
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 auto;
    max-width: 480px;
    padding: 4px 4px 4px 16px;
    background: var(--color-surface);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
  }

  .notice span {
    flex: 1;
  }

  .notice button {
    display: grid;
    flex: none;
    place-items: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-sm);
    background: none;
    color: inherit;
    cursor: pointer;
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

    .notice {
      top: 16px;
    }
  }
</style>
