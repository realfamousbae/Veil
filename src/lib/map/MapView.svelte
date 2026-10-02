<script lang="ts">
  import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
  import { Map } from 'maplibre-gl';
  import { onMount } from 'svelte';
  import type { Camera } from './hash';
  import { setupMapLibre } from './setup';

  interface Props {
    style: StyleSpecification;
    /** Initial camera. */
    camera: Camera;
    onready?: (map: Map) => void;
  }

  let { style, camera, onready }: Props = $props();
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
      ...camera,
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
