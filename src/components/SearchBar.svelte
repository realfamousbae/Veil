<script lang="ts">
  import { t } from '../lib/i18n/i18n.svelte';
  import Icon from './Icon.svelte';

  let { input = $bindable() }: { input?: HTMLInputElement } = $props();
</script>

<form class="search" role="search" onsubmit={(e) => e.preventDefault()}>
  <Icon name="search" />
  <input
    bind:this={input}
    type="search"
    aria-label={t('search.label')}
    placeholder={t('search.placeholder')}
    autocomplete="off"
    spellcheck="false"
    enterkeyhint="search"
  />
  <kbd aria-hidden="true">/</kbd>
</form>

<style>
  .search {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 48px;
    padding: 0 12px;
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

  input:focus {
    outline: none;
  }

  .search:focus-within {
    outline: 2px solid var(--color-focus);
    outline-offset: 1px;
  }

  kbd {
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
