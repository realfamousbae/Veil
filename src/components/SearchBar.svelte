<script lang="ts">
  import { t } from '../lib/i18n/i18n.svelte';
  import type { Place } from '../lib/providers/types';
  import type { SearchState } from '../lib/search/search.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    search: SearchState;
    onpick: (place: Place) => void;
    input?: HTMLInputElement;
  }

  let { search, onpick, input = $bindable() }: Props = $props();

  const expanded = $derived(search.results.length > 0 && !search.selected);

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!expanded) return;
      e.preventDefault();
      search.move(e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Escape') {
      // Keep the query (the native search input would clear it) and just leave the field.
      e.preventDefault();
      input?.blur();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const active = expanded ? search.results[search.active] : undefined;
      if (active) onpick(active);
      else search.submit();
    }
  }
</script>

<form class="search" role="search" onsubmit={(e) => e.preventDefault()}>
  <Icon name="search" />
  <input
    bind:this={input}
    type="search"
    role="combobox"
    aria-label={t('search.label')}
    aria-autocomplete="list"
    aria-expanded={expanded}
    aria-controls="search-results"
    aria-activedescendant={expanded && search.active >= 0 ? `result-${search.active}` : undefined}
    placeholder={t('search.placeholder')}
    autocomplete="off"
    spellcheck="false"
    enterkeyhint="search"
    value={search.query}
    oninput={(e) => search.setQuery(e.currentTarget.value)}
    {onkeydown}
  />
  {#if search.query}
    <button
      class="clear"
      type="button"
      aria-label={t('search.clear')}
      onclick={() => {
        search.clear();
        input?.focus();
      }}
    >
      <Icon name="close" />
    </button>
  {:else}
    <kbd aria-hidden="true">/</kbd>
  {/if}
</form>

<style>
  .search {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 48px;
    padding: 0 4px 0 12px;
    background: var(--color-surface-raised);
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  input {
    flex: 1;
    min-width: 0;
    height: 46px;
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

  /* The native clear button duplicates ours. */
  input::-webkit-search-cancel-button {
    appearance: none;
  }

  input:focus {
    outline: none;
  }

  .search:focus-within {
    outline: 2px solid var(--color-focus);
    outline-offset: 1px;
  }

  .clear {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-sm);
    background: none;
    color: inherit;
    cursor: pointer;
  }

  .clear:hover {
    background: var(--color-surface-hover);
  }

  kbd {
    margin-right: 8px;
    padding: 0 6px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font: inherit;
    font-size: 12px;
    line-height: 20px;
  }

  /* No physical keyboard shortcut hint on touch devices. */
  @media (pointer: coarse) {
    kbd {
      display: none;
    }
  }
</style>
