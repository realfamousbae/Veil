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
    onnotice: (text: string) => void;
  }

  let { place, resolving, saved, ontogglesave, onback, onclose, onnotice }: Props = $props();

  const lat = $derived(place.point.lat.toFixed(5));
  const lng = $derived(place.point.lng.toFixed(5));
  // Users can't fix missing data here; OpenStreetMap is where it gets fixed.
  const osmLink = $derived(
    place.osm
      ? `https://www.openstreetmap.org/edit?${place.osm.type}=${place.osm.id}`
      : `https://www.openstreetmap.org/note/new#map=18/${lat}/${lng}`,
  );
  const osmView = $derived(
    place.osm && `https://www.openstreetmap.org/${place.osm.type}/${place.osm.id}`,
  );

  async function copyCoords() {
    await navigator.clipboard?.writeText(`${lat}, ${lng}`);
    onnotice(t('place.copied'));
  }

  /** Shares the link to this place (its fragment carries the place; nothing else). */
  async function share() {
    const data = { title: place.name || t('place.point'), url: location.href };
    if (navigator.share) {
      await navigator.share(data).catch(() => {}); // dismissed by the user
    } else {
      await navigator.clipboard?.writeText(data.url);
      onnotice(t('place.linkCopied'));
    }
  }
</script>

<article class="card" aria-labelledby="place-title">
  <header>
    {#if onback}
      <button class="glass icon-btn" type="button" aria-label={t('place.back')} onclick={onback}>
        <Icon name="back" />
      </button>
    {/if}
    <div class="titles">
      <h2 id="place-title">{place.name || t('place.point')}</h2>
      {#if resolving}
        <p class="subtitle" role="status">{t('place.resolving')}</p>
      {:else if place.description}
        <p class="subtitle">{place.description}</p>
      {/if}
    </div>
    <button class="glass icon-btn" type="button" aria-label={t('common.close')} onclick={onclose}>
      <Icon name="close" />
    </button>
  </header>

  <div class="actions">
    <button
      class="action"
      class:on={saved}
      type="button"
      aria-pressed={saved}
      aria-label={saved ? t('places.saved') : t('places.save')}
      onclick={ontogglesave}
    >
      <span class="bubble glass"><Icon name={saved ? 'star-filled' : 'star'} /></span>
      <span class="label">{saved ? t('places.saved') : t('places.save')}</span>
    </button>
    <button class="action" type="button" aria-label={t('place.copyCoords')} onclick={copyCoords}>
      <span class="bubble glass"><Icon name="copy" /></span>
      <span class="label">{t('place.copy')}</span>
    </button>
    <button class="action" type="button" aria-label={t('place.share')} onclick={share}>
      <span class="bubble glass"><Icon name="share" /></span>
      <span class="label">{t('place.share')}</span>
    </button>
    <a
      class="action"
      href={osmLink}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={place.osm ? t('place.fixInOsm') : t('place.reportInOsm')}
    >
      <span class="bubble glass"><Icon name="edit" /></span>
      <span class="label">{place.osm ? t('place.fix') : t('place.report')}</span>
    </a>
  </div>

  <dl class="list-group">
    {#if place.description}
      <div class="list-row">
        <dt>{t('place.address')}</dt>
        <dd>{place.description}</dd>
      </div>
    {/if}
    <div class="list-row">
      <dt>{t('place.coordinates')}</dt>
      <dd class="coords">
        <span>{lat}, {lng}</span>
        <button
          class="icon-btn small"
          type="button"
          aria-label={t('place.copyCoords')}
          onclick={copyCoords}
        >
          <Icon name="copy" />
        </button>
      </dd>
    </div>
    {#if osmView && place.osm}
      <div class="list-row">
        <dt>{t('place.source')}</dt>
        <dd>
          <a href={osmView} target="_blank" rel="noopener noreferrer"
            >OpenStreetMap · {place.osm.type}/{place.osm.id}</a
          >
        </dd>
      </div>
    {/if}
  </dl>
</article>

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  header {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .titles {
    flex: 1;
    min-width: 0;
    padding-top: 4px;
  }

  h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.02em;
    overflow-wrap: anywhere;
  }

  .subtitle {
    margin: 4px 0 0;
    color: var(--color-text-muted);
    font-size: 14px;
  }

  /* Four equal action buttons, icon in a glass bubble with a caption below. */
  .actions {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .action {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    min-width: 0;
    padding: 0;
    border: 0;
    background: none;
    color: var(--color-text);
    font-size: 12px;
    text-decoration: none;
    cursor: pointer;
  }

  .bubble {
    display: grid;
    place-items: center;
    width: 100%;
    height: 54px;
    border-radius: var(--radius-lg);
    color: var(--color-accent);
    transition: transform 0.15s ease;
  }

  .action:active .bubble {
    transform: scale(0.95);
  }

  .action.on .bubble {
    --glass-tint: var(--color-accent);

    color: var(--color-on-accent);
  }

  .label {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  dl {
    margin: 0;
  }

  .list-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 2px;
  }

  dt {
    color: var(--color-text-muted);
    font-size: 12px;
  }

  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }

  .coords {
    display: flex;
    align-items: center;
    justify-content: space-between;
    align-self: stretch;
    gap: 8px;
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    user-select: all;
  }

  .icon-btn.small {
    width: 36px;
    height: 36px;
    margin: -6px -8px -6px 0;
    color: var(--color-accent);
  }

  dd a {
    color: var(--color-accent);
  }

  @media (prefers-reduced-motion: reduce) {
    .bubble {
      transition: none;
    }
  }
</style>
