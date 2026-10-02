<script lang="ts">
  import { namedFlavor } from '@protomaps/basemaps';
  import { loadConfig, resolveUrl } from '../lib/config';
  import MapView from '../lib/map/MapView.svelte';
  import { buildStyle } from '../lib/map/style';
  import { PmtilesTileProvider } from '../lib/providers/pmtiles';

  const MOSCOW: [number, number] = [37.62, 55.75];
  const lang = navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en';

  async function init() {
    const config = await loadConfig();
    const tiles = new PmtilesTileProvider(resolveUrl(config.tiles.world));
    return buildStyle({
      source: await tiles.source(),
      flavor: namedFlavor('light'),
      sprite: 'light',
      lang,
      assetsBase: resolveUrl(`${import.meta.env.BASE_URL}assets/`),
    });
  }
</script>

{#await init() then style}
  <MapView {style} center={MOSCOW} zoom={12} />
{:catch error}
  <p role="alert">{error.message}</p>
{/await}
