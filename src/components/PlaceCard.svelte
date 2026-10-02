<script lang="ts">
  import { t } from '../lib/i18n/i18n.svelte';
  import type { Place } from '../lib/providers/types';
  import Icon from './Icon.svelte';

  interface Props {
    place: Place;
    resolving: boolean;
    saved: boolean;
    ontogglesave: () => void;
    /** Shown when there are results to go back to. */
    onback?: () => void;
    onclose: () => void;
  }

  let { place, resolving, saved, ontogglesave, onback, onclose }: Props = $props();

  const coords = $derived(`${place.point.lat.toFixed(5)}, ${place.point.lng.toFixed(5)}`);
  // Users can't fix missing data here; OpenStreetMap is where it gets fixed (PLAN.md §9).
  const osmLink = $derived(
    place.osm
      ? `https://www.openstreetmap.org/edit?${place.osm.type}=${place.osm.id}`
      : `https://www.openstreetmap.org/note/new#map=18/${place.point.lat.toFixed(5)}/${place.point.lng.toFixed(5)}`,
  );
</script>

<article class="card" aria-labelledby="place-title">
  <header>
    {#if onback}
      <button class="icon-button" type="button" aria-label={t('place.back')} onclick={onback}>
        <Icon name="back" />
      </button>
    {/if}
    <h2 id="place-title">{place.name || t('place.point')}</h2>
    <button class="icon-button" type="button" aria-label={t('common.close')} onclick={onclose}>
      <Icon name="close" />
    </button>
  </header>

  {#if resolving}
    <p class="muted" role="status">{t('place.resolving')}</p>
  {:else if place.description}
    <p>{place.description}</p>
  {/if}

  <button class="save" type="button" aria-pressed={saved} onclick={ontogglesave}>
    <Icon name={saved ? 'star-filled' : 'star'} />
    {saved ? t('places.saved') : t('places.save')}
  </button>

  <dl>
    <dt>{t('place.coordinates')}</dt>
    <dd><span class="coords">{coords}</span></dd>
  </dl>

  <a class="osm" href={osmLink} target="_blank" rel="noopener noreferrer">
    {place.osm ? t('place.fixInOsm') : t('place.reportInOsm')}
  </a>
</article>

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  header {
    display: flex;
    align-items: flex-start;
    gap: 4px;
  }

  h2 {
    flex: 1;
    margin: 10px 0 0;
    font-size: 20px;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  p {
    margin: 0;
  }

  .muted {
    color: var(--color-text-muted);
  }

  dl {
    margin: 4px 0 0;
  }

  .save {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    margin-top: 4px;
    padding: 0 16px 0 12px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    background: var(--color-surface-raised);
    color: var(--color-text);
    font: inherit;
    cursor: pointer;
  }

  .save:hover {
    background: var(--color-surface-hover);
  }

  .save[aria-pressed='true'] {
    border-color: var(--color-accent);
    background: var(--color-accent);
    color: var(--color-on-accent);
  }

  dt {
    color: var(--color-text-muted);
    font-size: 14px;
  }

  dd {
    margin: 0;
  }

  .coords {
    user-select: all;
    font-variant-numeric: tabular-nums;
  }

  .osm {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    color: var(--color-accent);
  }

  .icon-button {
    display: grid;
    flex: none;
    place-items: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-md);
    background: none;
    color: inherit;
    cursor: pointer;
  }

  .icon-button:first-child {
    margin-left: -12px;
  }

  .icon-button:last-child {
    margin-right: -12px;
  }

  .icon-button:hover {
    background: var(--color-surface-hover);
  }
</style>
