<script lang="ts">
  import type { VectorSourceSpecification } from '@maplibre/maplibre-gl-style-spec';
  import { loadConfig, resolveUrl } from '../lib/config';
  import MapView from '../lib/map/MapView.svelte';
  import { buildStyle } from '../lib/map/style';
  import { PmtilesTileProvider } from '../lib/providers/pmtiles';
  import { applyTheme } from '../lib/theme/css';
  import { themeState } from '../lib/theme/theme.svelte';

  const MOSCOW: [number, number] = [37.62, 55.75];
  const lang = navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en';
  const assetsBase = resolveUrl(`${import.meta.env.BASE_URL}assets/`);

  let source = $state.raw<VectorSourceSpecification>();
  let error = $state<string>();

  const style = $derived(
    source && buildStyle({ source, theme: themeState.current, lang, assetsBase }),
  );

  $effect(() => applyTheme(themeState.current));

  async function init() {
    const [config] = await Promise.all([loadConfig(), themeState.init()]);
    source = await new PmtilesTileProvider(resolveUrl(config.tiles.world)).source();
  }

  init().catch((e: unknown) => (error = e instanceof Error ? e.message : String(e)));
</script>

{#if error}
  <p role="alert">{error}</p>
{:else if style}
  <MapView {style} center={MOSCOW} zoom={12} />
{/if}
