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
  <h2 id="saved-title" class="section-title">
    {t('places.title')}
    {#if savedPlaces.list.length}<span class="count">{savedPlaces.list.length}</span>{/if}
  </h2>

  {#if savedPlaces.list.length}
    <ul class="list-group">
      {#each savedPlaces.list as place (place.id)}
        <li>
          <button class="list-row" type="button" onclick={() => onpick(place)}>
            <span class="badge"><Icon name="star-filled" /></span>
            <span class="grow">
              <span class="name">{place.name || t('place.point')}</span>
              {#if place.description}<span class="hint">{place.description}</span>{/if}
            </span>
            <Icon name="chevron" />
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <div class="empty list-group">
      <span class="badge muted"><Icon name="star" /></span>
      <p>{t('places.empty')}</p>
    </div>
  {/if}

  <div class="actions">
    <button
      class="glass pill"
      type="button"
      disabled={!savedPlaces.list.length}
      onclick={exportPlaces}
    >
      <Icon name="download" />
      {t('places.export')}
    </button>
    <button class="glass pill" type="button" onclick={() => fileInput.click()}>
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

  <p class="note">{t('places.backupHint')} {t('place.whatsHere')}</p>
</section>

<style>
  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
  }

  .count {
    padding: 0 8px;
    border-radius: var(--radius-full);
    background: var(--glass-group);
    letter-spacing: 0;
    line-height: 20px;
  }

  .badge {
    display: grid;
    flex: none;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: var(--radius-full);
    background: var(--color-accent);
    color: var(--color-on-accent);
  }

  .badge.muted {
    background: var(--glass-edge);
    color: var(--color-text-muted);
  }

  .badge :global(.icon) {
    width: 18px;
    height: 18px;
  }

  .list-row :global(.icon:last-child) {
    width: 18px;
    height: 18px;
    color: var(--color-text-muted);
  }

  .name {
    display: block;
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .empty {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
  }

  .empty p {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 14px;
  }

  .actions {
    display: flex;
    gap: 10px;
    margin-top: 14px;
  }

  .actions .pill {
    flex: 1;
  }

  .note {
    margin: 14px 6px 0;
    color: var(--color-text-muted);
    font-size: 12px;
    line-height: 1.45;
  }
</style>
