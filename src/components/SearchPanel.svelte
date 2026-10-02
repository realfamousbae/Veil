<script lang="ts">
  import { t } from '../lib/i18n/i18n.svelte';
  import type { Place } from '../lib/providers/types';
  import { MIN_QUERY_LENGTH, type SearchState } from '../lib/search/search.svelte';
  import { savedPlaces } from '../lib/places/saved.svelte';
  import Icon from './Icon.svelte';
  import PlaceCard from './PlaceCard.svelte';
  import SavedList from './SavedList.svelte';

  interface Props {
    search: SearchState;
    onEnterOnly: boolean;
    onpick: (place: Place) => void;
    /** Closes the place card (also used by the system Back button). */
    oncloseplace: () => void;
    onnotice: (text: string) => void;
  }

  let { search, onEnterOnly, onpick, oncloseplace, onnotice }: Props = $props();

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
    onback={search.results.length ? oncloseplace : undefined}
    onclose={oncloseplace}
    {onnotice}
  />
{:else}
  <p class="status" role="status" aria-live="polite">{status}</p>

  {#if search.results.length}
    <ul class="list-group" id="search-results" role="listbox" aria-label={t('search.results')}>
      {#each search.results as place, i (place.id)}
        <li
          id="result-{i}"
          role="option"
          aria-selected={i === search.active}
          class:active={i === search.active}
          onclick={() => onpick(place)}
          onkeydown={(e) => e.key === 'Enter' && onpick(place)}
          tabindex="-1"
          class="list-row"
        >
          <span class="badge"><Icon name="pin" /></span>
          <span class="grow">
            <span class="name">{place.name}</span>
            {#if place.description}<span class="hint">{place.description}</span>{/if}
          </span>
        </li>
      {/each}
    </ul>
  {:else if !status}
    <SavedList {onpick} {onnotice} />
  {/if}
{/if}

<style>
  .status {
    margin: 2px 6px 10px;
    color: var(--color-text-muted);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .status:empty {
    display: none;
  }

  li {
    cursor: pointer;
  }

  li:hover,
  li.active {
    background: var(--glass-edge);
  }

  li.active {
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
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

  .badge :global(.icon) {
    width: 18px;
    height: 18px;
  }

  .name {
    display: block;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
</style>
