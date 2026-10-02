<script lang="ts">
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
  import { i18n, t } from '../lib/i18n/i18n.svelte';
  import { readCameraFromHash, syncCameraHash, type Camera } from '../lib/map/hash';
  import { onLongPress } from '../lib/map/long-press';
  import MapView from '../lib/map/MapView.svelte';
  import { buildStyle } from '../lib/map/style';
  import { SavedPlaceMarkers } from '../lib/places/markers';
  import { savedPlaces } from '../lib/places/saved.svelte';
  import { installState } from '../lib/pwa/install.svelte';
  import { registerServiceWorker } from '../lib/pwa/register';
  import { PhotonGeocodeProvider } from '../lib/providers/photon';
  import type { GeocodeProvider, Place } from '../lib/providers/types';
  import { readPlaceFromHash, writePlaceToHash } from '../lib/search/place-hash';
  import { searchPrefs } from '../lib/search/prefs.svelte';
  import { SearchState } from '../lib/search/search.svelte';
  import { loadCatalog, type RegionInfo } from '../lib/tiles/catalog';
  import { registerTileProtocol, remoteArchive, tileResolver } from '../lib/tiles/resolver';
  import { applyTheme } from '../lib/theme/css';
  import { themeState } from '../lib/theme/theme.svelte';

  const MOSCOW: Camera = { center: [37.62, 55.75], zoom: 12, bearing: 0, pitch: 0 };
  const WIDE = 768; // must match the @container breakpoints in components
  const assetsBase = resolveUrl(`${import.meta.env.BASE_URL}assets/`);
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  let ready = $state(false);
  let worldMaxZoom = $state(0);
  let tilesVersion = $state(0);
  let catalog = $state.raw<RegionInfo[]>([]);
  let noDetail = $state(false);
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
    ready
      ? buildStyle({
          theme: themeState.current,
          lang: i18n.locale,
          assetsBase,
          worldMaxZoom,
          tilesVersion,
        })
      : undefined,
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
      padding: cameraPadding(),
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

  interface Notice {
    text: string;
    action?: { label: string; run: () => void };
  }
  let notice = $state<Notice | null>(null);
  let noticeTimer: ReturnType<typeof setTimeout> | undefined;
  function showNotice(text: string, action?: Notice['action']) {
    notice = { text, action };
    clearTimeout(noticeTimer);
    // Notices with an action stay until the user acts or closes them.
    if (!action) noticeTimer = setTimeout(() => (notice = null), 6000);
  }

  installState.init();
  registerServiceWorker((apply) =>
    showNotice(t('pwa.updateReady'), { label: t('pwa.update'), run: apply }),
  );

  // Android's system Back closes an open place card instead of leaving the app: opening
  // a card adds one history entry, and going back removes the card.
  const CARD_STATE = 'veil-card';
  function pushCardEntry() {
    if (history.state?.[CARD_STATE]) return;
    history.pushState({ ...history.state, [CARD_STATE]: true }, '');
  }
  function closeCard() {
    if (history.state?.[CARD_STATE]) history.back();
    else search.deselect();
  }
  $effect(() => {
    const onpopstate = () => {
      if (!history.state?.[CARD_STATE] && search.selected) search.deselect();
    };
    window.addEventListener('popstate', onpopstate);
    return () => window.removeEventListener('popstate', onpopstate);
  });
  $effect(() => {
    if (locator.error) showNotice(t(`locate.${locator.error}`));
  });

  // Saved places on the map; tapping one opens its card.
  let savedMarkers = $state.raw<SavedPlaceMarkers>();
  $effect(() => {
    if (!map) return;
    const markers = new SavedPlaceMarkers(
      map,
      `${import.meta.env.BASE_URL}assets/icons.svg#star-filled`,
      (place) => {
        search.select(place);
        pushCardEntry();
        if (!wide) snap = 'half';
      },
    );
    savedMarkers = markers;
    return () => markers.remove();
  });
  $effect(() => {
    savedMarkers?.update(
      savedPlaces.list,
      search.selected?.id ?? null,
      (p) => p.name || t('place.point'),
    );
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
      savedPlaces.init(),
    ]);
    geocoder = new PhotonGeocodeProvider(config.geocoder.url, config.geocoder.langs);

    registerTileProtocol();
    worldMaxZoom = config.tiles.worldMaxZoom;
    tileResolver.setWorld(resolveUrl(config.tiles.world), worldMaxZoom);
    ready = true;
    if (config.regions) {
      try {
        catalog = await loadCatalog(resolveUrl(config.regions));
      } catch {
        // Offline or no catalog: the world overview (and downloaded regions) still work.
      }
    }
    updateArchives();
  }

  /** Re-reads the set of tile archives and makes the map refetch its tiles. */
  function updateArchives() {
    tileResolver.setRegions(catalog.map((r) => remoteArchive(r.id, r.url, r.bbox, r.maxzoom)));
    tilesVersion++;
  }

  // Hint where only the low-zoom overview exists.
  $effect(() => {
    if (!map) return;
    const m = map;
    const check = () => {
      const c = m.getCenter();
      noDetail = !tileResolver.hasDetail(c.lng, c.lat, m.getZoom());
    };
    m.on('moveend', check);
    check();
    return () => m.off('moveend', check);
  });

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
      pushCardEntry();
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

  /** Keeps a camera target clear of the search bar and the open sheet on phones. */
  function cameraPadding() {
    if (wide) return 48;
    const bottom = snap === 'collapsed' ? sheetHeight : Math.round(height * 0.5);
    return { top: 80, bottom: bottom + 16, left: 32, right: 32 };
  }

  /** Picks a search result: shows it and moves the map to it. */
  function pick(place: Place) {
    search.select(place);
    pushCardEntry();
    cameraOnUser = false;
    locator.stopFollow();
    if (!wide) {
      searchInput?.blur(); // hide the on-screen keyboard
      snap = 'half';
    }
    if (!map) return;
    const padding = cameraPadding();
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
      else if (search.selected) closeCard();
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
          <span>{notice.text}</span>
          {#if notice.action}
            <button
              class="action"
              type="button"
              onclick={() => {
                notice?.action?.run();
                notice = null;
              }}>{notice.action.label}</button
            >
          {/if}
          <button type="button" aria-label={t('common.close')} onclick={() => (notice = null)}>
            <Icon name="close" />
          </button>
        </p>
      {/if}
      {#if noDetail && !notice}
        <p class="no-detail" role="status">{t('tiles.noDetail')}</p>
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
      <SearchPanel
        {search}
        onEnterOnly={searchPrefs.onEnter}
        onpick={pick}
        oncloseplace={closeCard}
        onnotice={showNotice}
      />
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

  .no-detail {
    position: absolute;
    top: calc(72px + env(safe-area-inset-top));
    left: 50%;
    z-index: 1;
    margin: 0;
    padding: 6px 12px;
    transform: translateX(-50%);
    background: var(--color-surface);
    color: var(--color-text-muted);
    border-radius: var(--radius-full);
    box-shadow: var(--shadow-md);
    font-size: 14px;
    white-space: nowrap;
  }

  .notice span {
    flex: 1;
  }

  .notice .action {
    width: auto;
    padding: 0 12px;
    background: var(--color-accent);
    color: var(--color-on-accent);
    font: inherit;
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

    .notice,
    .no-detail {
      top: 16px;
    }
  }
</style>
