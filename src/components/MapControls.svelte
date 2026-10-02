<script lang="ts">
  import type { Map } from 'maplibre-gl';
  import type { LocateMode } from '../lib/geolocation/locator.svelte';
  import { t } from '../lib/i18n/i18n.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    map: Map | undefined;
    locateMode: LocateMode;
    onlocate: () => void;
    onsettings: () => void;
  }

  let { map, locateMode, onlocate, onsettings }: Props = $props();

  const locateLabel = $derived(
    locateMode === 'follow'
      ? t('locate.stop')
      : locateMode === 'shown'
        ? t('locate.follow')
        : locateMode === 'locating'
          ? t('locate.locating')
          : t('locate.show'),
  );

  const animate = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;
</script>

<div class="controls">
  <button
    class="glass"
    type="button"
    title={t('settings.open')}
    aria-label={t('settings.open')}
    onclick={onsettings}
  >
    <Icon name="layers" />
  </button>
  <div class="group glass">
    <button
      type="button"
      title={t('map.zoomIn')}
      aria-label={t('map.zoomIn')}
      onclick={() => map?.zoomIn({ animate: animate() })}
    >
      <Icon name="plus" />
    </button>
    <span class="divider" aria-hidden="true"></span>
    <button
      type="button"
      title={t('map.zoomOut')}
      aria-label={t('map.zoomOut')}
      onclick={() => map?.zoomOut({ animate: animate() })}
    >
      <Icon name="minus" />
    </button>
  </div>
  <button
    class="locate glass"
    type="button"
    data-mode={locateMode}
    title={locateLabel}
    aria-label={locateLabel}
    aria-pressed={locateMode === 'follow'}
    aria-busy={locateMode === 'locating'}
    onclick={onlocate}
  >
    <Icon name={locateMode === 'follow' ? 'locate-follow' : 'locate'} />
  </button>
</div>

<style>
  .controls {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 12px;
  }

  button {
    display: grid;
    place-items: center;
    width: 50px;
    height: 50px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-full);
    color: var(--color-text);
    cursor: pointer;
    transition: transform 0.15s ease;
  }

  button:active {
    transform: scale(0.94);
  }

  .group {
    display: flex;
    flex-direction: column;
    border-radius: var(--radius-full);
  }

  /* Zoom in/out share one glass capsule. */
  .group button {
    border-radius: 0;
    background: none;
    box-shadow: none;
  }

  /* Hairline between zoom in and out. */
  .divider {
    height: 1px;
    margin: 0 12px;
    background: var(--color-border);
  }

  .locate[data-mode='shown'] {
    color: var(--color-accent);
  }

  .locate[data-mode='follow'] {
    --glass-tint: var(--color-accent);

    color: var(--color-on-accent);
  }

  .locate[data-mode='locating'] {
    color: var(--color-text-muted);
  }

  @media (prefers-reduced-motion: no-preference) {
    .locate[data-mode='locating'] :global(.icon) {
      animation: pulse 1s ease-in-out infinite alternate;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    button {
      transition: none;
    }
  }

  @keyframes pulse {
    to {
      opacity: 0.3;
    }
  }
</style>
