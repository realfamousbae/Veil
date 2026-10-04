import { describe, expect, it, vi } from 'vitest';
import type {
  Itinerary,
  LngLat,
  RouteRequest,
  RoutingProvider,
} from '../../src/lib/providers/types';
import { RouteState } from '../../src/lib/routing/route.svelte';

const at = (lng: number, lat: number) => ({
  kind: 'place' as const,
  place: { id: `${lat},${lng}`, name: '', point: { lng, lat } },
});
const itinerary = (duration: number): Itinerary => ({
  duration,
  start: new Date(0),
  end: new Date(duration * 1000),
  transfers: 0,
  legs: [],
});

function setup(opts: { locate?: () => Promise<LngLat>; online?: boolean } = {}) {
  const pending: { request: RouteRequest; resolve: (it: Itinerary[]) => void }[] = [];
  const provider: RoutingProvider = {
    route: vi.fn(
      (request: RouteRequest) =>
        new Promise<Itinerary[]>((resolve) => pending.push({ request, resolve })),
    ),
  };
  const locate = vi.fn(opts.locate ?? (async () => ({ lng: 37.5301, lat: 55.7012 })));
  const state = new RouteState({
    provider: () => provider,
    lang: () => 'ru',
    locate,
    online: () => opts.online ?? true,
  });
  return { state, provider, pending, locate };
}

describe('RouteState', () => {
  it('asks the router only on build', async () => {
    const { state, provider, pending } = setup();
    state.start({ to: at(37.6, 55.75) });
    state.setEnd('from', at(37.5, 55.7));
    state.setMode('car');
    expect(provider.route).not.toHaveBeenCalled();

    const done = state.build();
    expect(state.status).toBe('loading');
    pending[0]?.resolve([itinerary(600)]);
    await done;
    expect(pending[0]?.request).toMatchObject({
      mode: 'car',
      from: { lng: 37.5, lat: 55.7 },
      to: { lng: 37.6, lat: 55.75 },
      lang: 'ru',
    });
    expect(state.status).toBe('done');
    expect(state.itineraries).toHaveLength(1);
  });

  it('drops results when the form changes, and ignores the stale response', async () => {
    const { state, pending } = setup();
    state.start({ from: at(1, 1), to: at(2, 2) });
    const done = state.build();
    state.swap();
    expect(state.status).toBe('idle');
    expect(pending[0]?.request.signal.aborted).toBe(true);
    pending[0]?.resolve([itinerary(1)]);
    await done;
    expect(state.itineraries).toEqual([]);
    expect(state.from).toEqual(at(2, 2));
  });

  it('locates the user only when building a route from "me"', async () => {
    const { state, locate, pending } = setup();
    state.start({ from: { kind: 'me' }, to: at(37.6, 55.75) });
    expect(state.usesMe).toBe(true);
    expect(locate).not.toHaveBeenCalled();
    const done = state.build();
    await vi.waitFor(() => expect(pending).toHaveLength(1));
    expect(locate).toHaveBeenCalledOnce();
    expect(pending[0]?.request.from).toEqual({ lng: 37.5301, lat: 55.7012 });
    pending[0]?.resolve([]);
    await done;
  });

  it('reports a failed location without asking the router', async () => {
    const { state, provider } = setup({
      locate: async () => {
        throw new Error('denied');
      },
    });
    state.start({ from: { kind: 'me' }, to: at(1, 1) });
    await state.build();
    expect(state.locateError).toBe('denied');
    expect(provider.route).not.toHaveBeenCalled();
  });

  it('does not try offline', async () => {
    const { state, provider } = setup({ online: false });
    state.start({ from: at(1, 1), to: at(2, 2) });
    await state.build();
    expect(state.status).toBe('offline');
    expect(provider.route).not.toHaveBeenCalled();
  });

  it('reports router errors and clears everything on close', async () => {
    const { state, pending } = setup();
    state.start({ from: at(1, 1), to: at(2, 2) });
    const done = state.build();
    pending[0]?.resolve(Promise.reject(new Error('down')) as never);
    await done;
    expect(state.status).toBe('error');
    state.close();
    expect(state).toMatchObject({ open: false, from: null, to: null, status: 'idle' });
  });
});
