<script lang="ts">
  import { t } from '../lib/i18n/i18n.svelte';
  import { fromGeoJSON, MAX_IMPORT_BYTES, toGeoJSON } from '../lib/places/geojson';
  import { savedPlaces } from '../lib/places/saved.svelte';
  import type { Place } from '../lib/providers/types';
  import Icon from './Icon.svelte';

  interface Props {
    onpick: (place: Place) => void;
    onnotice: (text: string) => void;
  }

  let { onpick, onnotice }: Props = $props();
  let fileInput: HTMLInputElement;

  function exportPlaces() {
    const blob = new Blob([toGeoJSON(savedPlaces.list)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veil-places-${new Date().toISOString().slice(0, 10)}.geojson`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importPlaces(file: File | undefined) {
    fileInput.value = '';
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) return onnotice(t('places.importTooLarge'));
    try {
      const { places, invalid } = fromGeoJSON(await file.text());
      const { added, skipped } = await savedPlaces.importMany(places);
      onnotice(t('places.imported', { added, skipped, invalid }));
    } catch {
      onnotice(t('places.importFailed'));
    }
  }
</script>

<section aria-labelledby="saved-title">
  <h2 id="saved-title">
    {t('places.title')}
    {#if savedPlaces.list.length}<span class="count">{savedPlaces.list.length}</span>{/if}
  </h2>

  {#if savedPlaces.list.length}
    <ul>
      {#each savedPlaces.list as place (place.id)}
        <li>
          <button class="item" type="button" onclick={() => onpick(place)}>
            <Icon name="star-filled" />
            <span class="text">
              <span class="name">{place.name || t('place.point')}</span>
              {#if place.description}<span class="description">{place.description}</span>{/if}
            </span>
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="muted">{t('places.empty')}</p>
  {/if}

  <p class="muted small">{t('places.backupHint')} {t('place.whatsHere')}</p>

  <div class="actions">
    <button class="action" type="button" disabled={!savedPlaces.list.length} onclick={exportPlaces}>
      <Icon name="download" />
      {t('places.export')}
    </button>
    <button class="action" type="button" onclick={() => fileInput.click()}>
      <Icon name="upload" />
      {t('places.import')}
    </button>
    <input
      bind:this={fileInput}
      type="file"
      accept=".geojson,.json,application/geo+json,application/json"
      hidden
      onchange={(e) => importPlaces(e.currentTarget.files?.[0])}
    />
  </div>
</section>

<style>
  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 8px;
    font-size: 16px;
  }

  .count {
    padding: 0 8px;
    border-radius: var(--radius-full);
    background: var(--color-surface-raised);
    color: var(--color-text-muted);
    font-size: 13px;
    font-weight: normal;
    line-height: 22px;
  }

  ul {
    margin: 0 -8px;
    padding: 0;
    list-style: none;
  }

  .item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 48px;
    padding: 8px;
    border: 0;
    border-radius: var(--radius-md);
    background: none;
    color: var(--color-accent);
    font: inherit;
    text-align: start;
    cursor: pointer;
  }

  .item:hover {
    background: var(--color-surface-hover);
  }

  .text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    color: var(--color-text);
  }

  .name {
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .description,
  .muted {
    color: var(--color-text-muted);
  }

  .description {
    font-size: 14px;
  }

  p {
    margin: 0 0 8px;
  }

  .small {
    margin-top: 12px;
    font-size: 13px;
  }

  .actions {
    display: flex;
    gap: 8px;
  }

  .action {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    padding: 0 14px 0 10px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface-raised);
    color: var(--color-text);
    font: inherit;
    cursor: pointer;
  }

  .action:disabled {
    color: var(--color-text-muted);
    cursor: default;
  }

  .action:hover:not(:disabled) {
    background: var(--color-surface-hover);
  }
</style>
