<script lang="ts">
  import type { Map } from 'maplibre-gl';
  import { t } from '../lib/i18n/i18n.svelte';
  import Icon from './Icon.svelte';

  let { map, onsettings }: { map: Map | undefined; onsettings: () => void } = $props();

  const animate = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;
</script>

<div class="controls">
  <button
    type="button"
    title={t('settings.open')}
    aria-label={t('settings.open')}
    onclick={onsettings}
  >
    <Icon name="layers" />
  </button>
  <div class="group">
    <button
      type="button"
      title={t('map.zoomIn')}
      aria-label={t('map.zoomIn')}
      onclick={() => map?.zoomIn({ animate: animate() })}
    >
      <Icon name="plus" />
    </button>
    <button
      type="button"
      title={t('map.zoomOut')}
      aria-label={t('map.zoomOut')}
      onclick={() => map?.zoomOut({ animate: animate() })}
    >
      <Icon name="minus" />
    </button>
  </div>
</div>

<style>
  .controls {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 12px;
  }

  .group {
    display: flex;
    flex-direction: column;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
  }

  button {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    padding: 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface-raised);
    color: var(--color-text);
    box-shadow: var(--shadow-md);
    cursor: pointer;
  }

  button:hover {
    background: var(--color-surface-hover);
  }

  .group button {
    box-shadow: none;
  }

  .group button:first-child {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  .group button:last-child {
    border-top: 0;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }
</style>
