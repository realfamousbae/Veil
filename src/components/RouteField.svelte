<script lang="ts">
  import { t } from '../lib/i18n/i18n.svelte';
  import type { RouteEnd } from '../lib/routing/route-hash';
  import type { SearchState } from '../lib/search/search.svelte';
  import Icon from './Icon.svelte';

  /**
   * One end of a route: a search field with its own suggestions, plus "My location".
   * Picking "My location" only marks the end; the position is asked for on "Build route".
   */
  interface Props {
    id: string;
    label: string;
    placeholder: string;
    value: RouteEnd;
    search: SearchState;
    onchange: (end: RouteEnd) => void;
    input?: HTMLInputElement;
  }

  let { id, label, placeholder, value, search, onchange, input = $bindable() }: Props = $props();

  let editing = $state(false);
  const shown = $derived(
    value?.kind === 'me' ? t('route.me') : value ? value.place.name || t('place.point') : '',
  );
  /** "My location" first, then the search results. */
  const options = $derived<RouteEnd[]>([
    { kind: 'me' },
    ...search.results.map((place) => ({ kind: 'place' as const, place })),
  ]);
  // search.active indexes the results; here -1 is "My location", ≥0 the results.
  const active = $derived(editing ? search.active + 1 : -1);

  function pick(end: RouteEnd) {
    onchange(end);
    search.clear();
    editing = false;
    input?.blur();
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      search.move(e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      input?.blur();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // With nothing typed, "My location" is the highlighted option.
      if (search.active >= 0 || !search.query.trim()) pick(options[search.active + 1] ?? null);
      else search.submit();
    }
  }
</script>

<div class="field">
  <label class="list-row" for={id}>
    <span class="caption">{label}</span>
    <input
      bind:this={input}
      {id}
      type="search"
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={editing}
      aria-controls="{id}-options"
      aria-activedescendant={active >= 0 ? `${id}-option-${active}` : undefined}
      {placeholder}
      autocomplete="off"
      spellcheck="false"
      enterkeyhint="search"
      value={editing ? search.query : shown}
      onfocus={(e) => {
        editing = true;
        search.setQuery('');
        e.currentTarget.value = '';
      }}
      onblur={() => {
        // Let a click on an option land before the list goes away.
        setTimeout(() => (editing = false), 150);
      }}
      oninput={(e) => search.setQuery(e.currentTarget.value)}
      {onkeydown}
    />
  </label>

  {#if editing}
    <ul class="options list-group" id="{id}-options" role="listbox" aria-label={label}>
      {#each options as end, i (end?.kind === 'place' ? end.place.id : 'me')}
        <li
          id="{id}-option-{i}"
          role="option"
          aria-selected={i === active}
          class:active={i === active}
          class="list-row"
          tabindex="-1"
          onpointerdown={(e) => e.preventDefault()}
          onclick={() => pick(end)}
          onkeydown={(e) => e.key === 'Enter' && pick(end)}
        >
          {#if end?.kind === 'place'}
            <Icon name="pin" />
            <span class="grow">
              <span class="name">{end.place.name}</span>
              {#if end.place.description}<span class="hint">{end.place.description}</span>{/if}
            </span>
          {:else}
            <Icon name="locate" />
            <span class="grow name">{t('route.me')}</span>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .field {
    position: relative;
  }

  label {
    cursor: text;
  }

  .caption {
    flex: none;
    width: 4.5em;
    color: var(--color-text-muted);
    font-size: 13px;
  }

  input {
    flex: 1;
    min-width: 0;
    padding: 0;
    border: 0;
    background: none;
    color: var(--color-text);
    font: inherit;
    font-size: 16px; /* ≥16px prevents iOS from zooming in on focus */
  }

  input::placeholder {
    color: var(--color-text-muted);
    opacity: 1;
  }

  input::-webkit-search-cancel-button {
    appearance: none;
  }

  input:focus {
    outline: none;
  }

  .options {
    margin: 6px 0 4px;
  }

  li {
    color: var(--color-text);
    cursor: pointer;
  }

  li :global(.icon) {
    flex: none;
    width: 18px;
    height: 18px;
    color: var(--color-accent);
  }

  li:hover,
  li.active {
    background: var(--glass-edge);
  }

  .name {
    display: block;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
</style>
