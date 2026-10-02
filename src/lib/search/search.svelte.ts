import { pointId, type GeocodeProvider, type LngLat, type Place } from '../providers/types';

export const MIN_QUERY_LENGTH = 3;
export const DEBOUNCE_MS = 300;

export interface SearchDeps {
  provider: () => GeocodeProvider | undefined;
  lang: () => string;
  /** Map center for location bias, or undefined when bias is off. */
  bias: () => LngLat | undefined;
  /** Search only on explicit submit. */
  onEnterOnly: () => boolean;
}

export type SearchStatus = 'idle' | 'loading' | 'done' | 'error';

/**
 * Search and place-selection state. Queries reach the geocoder only with at least
 * MIN_QUERY_LENGTH characters, after DEBOUNCE_MS of no typing (or on Enter), and every
 * new query aborts the previous one so stale responses never overwrite fresh results.
 */
export class SearchState {
  query = $state('');
  results = $state.raw<Place[]>([]);
  status = $state<SearchStatus>('idle');
  /** Index of the keyboard-highlighted result, -1 for none. */
  active = $state(-1);

  selected = $state.raw<Place | null>(null);
  /** Reverse geocoding of the selected point is in progress. */
  resolving = $state(false);

  #timer: ReturnType<typeof setTimeout> | undefined;
  #search: AbortController | undefined;
  #reverse: AbortController | undefined;

  constructor(private readonly deps: SearchDeps) {}

  setQuery(query: string): void {
    this.query = query;
    this.active = -1;
    clearTimeout(this.#timer);
    if (query.trim().length < MIN_QUERY_LENGTH) {
      this.#search?.abort();
      this.results = [];
      this.status = 'idle';
      return;
    }
    if (!this.deps.onEnterOnly()) {
      this.#timer = setTimeout(() => void this.#run(), DEBOUNCE_MS);
    }
  }

  /** Explicit submit (Enter): search now. */
  submit(): void {
    clearTimeout(this.#timer);
    if (this.query.trim().length >= MIN_QUERY_LENGTH) void this.#run();
  }

  async #run(): Promise<void> {
    const provider = this.deps.provider();
    if (!provider) return;
    this.#search?.abort();
    const controller = new AbortController();
    this.#search = controller;
    this.status = 'loading';
    try {
      const results = await provider.search(this.query.trim(), {
        lang: this.deps.lang(),
        bias: this.deps.bias(),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      this.results = results;
      this.active = -1;
      this.status = 'done';
    } catch {
      if (controller.signal.aborted) return;
      this.results = [];
      this.status = 'error';
    }
  }

  move(delta: 1 | -1): void {
    const n = this.results.length;
    if (!n) return;
    this.active = this.active === -1 && delta === -1 ? n - 1 : (this.active + delta + n) % n;
  }

  select(place: Place): void {
    this.#reverse?.abort();
    this.resolving = false;
    this.selected = place;
  }

  /** "What's here?": selects a map point and looks up its address. */
  async reverse(point: LngLat): Promise<void> {
    const provider = this.deps.provider();
    this.#reverse?.abort();
    const controller = new AbortController();
    this.#reverse = controller;
    const pin: Place = { id: pointId(point), name: '', point };
    this.selected = pin;
    if (!provider) return;
    this.resolving = true;
    try {
      const found = await provider.reverse(point, {
        lang: this.deps.lang(),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      // Keep the pin where the user pointed; describe it by the nearest object.
      if (found) this.selected = { ...found, id: pin.id, point };
    } catch {
      // Keep the bare point; the card still shows its coordinates.
    } finally {
      if (!controller.signal.aborted) this.resolving = false;
    }
  }

  deselect(): void {
    this.#reverse?.abort();
    this.resolving = false;
    this.selected = null;
  }

  clear(): void {
    clearTimeout(this.#timer);
    this.#search?.abort();
    this.query = '';
    this.results = [];
    this.status = 'idle';
    this.active = -1;
    this.deselect();
  }
}
