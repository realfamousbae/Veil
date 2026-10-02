import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GeocodeProvider, LngLat, Place } from '../../src/lib/providers/types';
import { DEBOUNCE_MS, SearchState } from '../../src/lib/search/search.svelte';

const place = (name: string): Place => ({ id: name, name, point: { lng: 0, lat: 0 } });

function setup(opts: { onEnterOnly?: boolean; bias?: LngLat } = {}) {
  const pending: { query: string; resolve: (p: Place[]) => void; signal: AbortSignal }[] = [];
  const provider: GeocodeProvider = {
    search: vi.fn(
      (query: string, { signal }: { signal: AbortSignal }) =>
        new Promise<Place[]>((resolve) => pending.push({ query, resolve, signal })),
    ),
    reverse: vi.fn(async () => place('Reverse')),
  };
  const state = new SearchState({
    provider: () => provider,
    lang: () => 'en',
    bias: () => opts.bias,
    onEnterOnly: () => opts.onEnterOnly ?? false,
  });
  return { state, provider, pending };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('SearchState', () => {
  it('does not query with fewer than 3 characters', () => {
    const { state, provider } = setup();
    state.setQuery('ab');
    vi.advanceTimersByTime(1000);
    state.submit();
    expect(provider.search).not.toHaveBeenCalled();
  });

  it('debounces typing by 300 ms', () => {
    const { state, provider } = setup();
    state.setQuery('caf');
    vi.advanceTimersByTime(DEBOUNCE_MS - 1);
    state.setQuery('cafe');
    vi.advanceTimersByTime(DEBOUNCE_MS - 1);
    expect(provider.search).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(provider.search).toHaveBeenCalledTimes(1);
    expect(vi.mocked(provider.search).mock.calls[0]?.[0]).toBe('cafe');
  });

  it('in "Enter only" mode queries only on submit', () => {
    const { state, provider } = setup({ onEnterOnly: true });
    state.setQuery('cafe');
    vi.advanceTimersByTime(1000);
    expect(provider.search).not.toHaveBeenCalled();
    state.submit();
    expect(provider.search).toHaveBeenCalledTimes(1);
  });

  it('passes the bias through to the provider', () => {
    const { state, provider } = setup({ bias: { lng: 37.6, lat: 55.8 } });
    state.setQuery('cafe');
    state.submit();
    expect(vi.mocked(provider.search).mock.calls[0]?.[1].bias).toEqual({ lng: 37.6, lat: 55.8 });
  });

  it('never lets a stale response overwrite fresh results', async () => {
    const { state, pending } = setup();
    state.setQuery('first');
    state.submit();
    state.setQuery('second');
    state.submit();
    expect(pending[0]?.signal.aborted).toBe(true);

    pending[1]?.resolve([place('fresh')]);
    await vi.runAllTimersAsync();
    pending[0]?.resolve([place('stale')]);
    await vi.runAllTimersAsync();

    expect(state.results.map((p) => p.name)).toEqual(['fresh']);
    expect(state.status).toBe('done');
  });

  it('clears results when the query gets too short', async () => {
    const { state, pending } = setup();
    state.setQuery('cafe');
    state.submit();
    pending[0]?.resolve([place('A')]);
    await vi.runAllTimersAsync();
    state.setQuery('ca');
    expect(state.results).toEqual([]);
    expect(state.status).toBe('idle');
  });

  it('moves the keyboard highlight with wrap-around', async () => {
    const { state, pending } = setup();
    state.setQuery('cafe');
    state.submit();
    pending[0]?.resolve([place('A'), place('B')]);
    await vi.runAllTimersAsync();
    state.move(-1);
    expect(state.active).toBe(1);
    state.move(1);
    expect(state.active).toBe(0);
  });

  it('reverse geocodes a point, keeping the pin where the user pointed', async () => {
    const { state } = setup();
    const point = { lng: 37.1, lat: 55.2 };
    const done = state.reverse(point);
    expect(state.selected).toMatchObject({ name: '', point });
    expect(state.resolving).toBe(true);
    await done;
    expect(state.selected).toMatchObject({ name: 'Reverse', point });
    expect(state.resolving).toBe(false);
  });
});
