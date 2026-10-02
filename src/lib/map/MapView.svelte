<script lang="ts">
  import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
  import { AttributionControl, Map, NavigationControl } from 'maplibre-gl';
  import { onMount } from 'svelte';
  import { setupMapLibre } from './setup';

  interface Props {
    style: StyleSpecification;
    center: [number, number];
    zoom: number;
  }

  let { style, center, zoom }: Props = $props();
  let container: HTMLDivElement;

  onMount(() => {
    setupMapLibre();
    const map = new Map({
      container,
      style,
      center,
      zoom,
      // Map state lives in the URL fragment, which never reaches the server (PLAN.md §5.6).
      hash: 'map',
      attributionControl: false,
    });
    map.addControl(new AttributionControl({ compact: false }));
    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');
    // Signals that the first frame with all visible tiles is rendered (used by e2e tests).
    map.once('idle', () => (container.dataset['ready'] = 'true'));
    return () => map.remove();
  });
</script>

<div class="map" bind:this={container}></div>

<style>
  .map {
    position: absolute;
    inset: 0;
  }
</style>
