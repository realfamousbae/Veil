<script lang="ts">
  import { t } from '../lib/i18n/i18n.svelte';
  import type { Place } from '../lib/providers/types';
  import { MIN_QUERY_LENGTH, type SearchState } from '../lib/search/search.svelte';
  import { savedPlaces } from '../lib/places/saved.svelte';
  import PlaceCard from './PlaceCard.svelte';
  import SavedList from './SavedList.svelte';

  interface Props {
    search: SearchState;
    onEnterOnly: boolean;
    onpick: (place: Place) => void;
    onnotice: (text: string) => void;
  }

  let { search, onEnterOnly, onpick, onnotice }: Props = $props();

  const queryLength = $derived(search.query.trim().length);
  const status = $derived.by(() => {
    if (search.status === 'loading') return t('search.loading');
    if (search.status === 'error') return t('search.error');
    if (search.status === 'done')
      return search.results.length
        ? t('search.found', { n: search.results.length })
        : t('search.noResults');
    if (queryLength > 0 && queryLength < MIN_QUERY_LENGTH) return t('search.minLength');
    if (queryLength >= MIN_QUERY_LENGTH && onEnterOnly) return t('search.pressEnter');
    return '';
  });
</script>

{#if search.selected}
  <PlaceCard
    place={search.selected}
    resolving={search.resolving}
    saved={savedPlaces.has(search.selected.id)}
    ontogglesave={() => search.selected && savedPlaces.toggle(search.selected)}
    onback={search.results.length ? () => search.deselect() : undefined}
    onclose={() => search.deselect()}
  />
{:else}
  <p class="status" role="status" aria-live="polite">{status}</p>

  {#if search.results.length}
    <ul id="search-results" role="listbox" aria-label={t('search.results')}>
      {#each search.results as place, i (place.id)}
        <li
          id="result-{i}"
          role="option"
          aria-selected={i === search.active}
          class:active={i === search.active}
          onclick={() => onpick(place)}
          onkeydown={(e) => e.key === 'Enter' && onpick(place)}
          tabindex="-1"
        >
          <span class="name">{place.name}</span>
          {#if place.description}<span class="description">{place.description}</span>{/if}
        </li>
      {/each}
    </ul>
  {:else if !status}
    <SavedList {onpick} {onnotice} />
  {/if}
{/if}

<style>
  .status {
    margin: 0;
    color: var(--color-text-muted);
  }

  .status:empty {
    display: none;
  }

  ul {
    margin: 8px -8px 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    min-height: 48px;
    padding: 8px;
    border-radius: var(--radius-md);
    cursor: pointer;
  }

  li:hover,
  li.active {
    background: var(--color-surface-hover);
  }

  li.active {
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
  }

  .name {
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .description {
    color: var(--color-text-muted);
    font-size: 14px;
  }
</style>
