<script lang="ts">
  import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
  import { Map } from 'maplibre-gl';
  import { onMount } from 'svelte';
  import { setupMapLibre } from './setup';

  interface Props {
    style: StyleSpecification;
    center: [number, number];
    zoom: number;
    onready?: (map: Map) => void;
  }

  let { style, center, zoom, onready }: Props = $props();
  let container: HTMLDivElement;
  let map: Map | undefined;
  let applied: StyleSpecification | undefined;

  /** Flags when the current style is fully rendered (used by e2e tests). */
  function markReady(m: Map) {
    container.dataset['ready'] = 'false';
    m.once('idle', () => (container.dataset['ready'] = 'true'));
  }

  onMount(() => {
    setupMapLibre();
    applied = style;
    map = new Map({
      container,
      style,
      center,
      zoom,
      // Map state lives in the URL fragment, which never reaches the server (PLAN.md §5.6).
      hash: 'map',
      // Attribution and zoom controls are our own themed components.
      attributionControl: false,
    });
    markReady(map);
    onready?.(map);
    return () => {
      map?.remove();
      map = undefined;
    };
  });

  // Theme or language change: swap the style in place, keeping the camera.
  $effect(() => {
    const next = style;
    if (!map || next === applied) return;
    applied = next;
    map.setStyle(next, { diff: true });
    markReady(map);
  });
</script>

<div class="map" bind:this={container}></div>

<style>
  .map {
    position: absolute;
    inset: 0;
  }
</style>
