import type { Itinerary, LngLat, RouteMode, RoutingProvider } from '../providers/types';
import type { RouteEnd, RouteForm } from './route-hash';

export interface RouteDeps {
  provider: () => RoutingProvider | undefined;
  lang: () => string;
  /**
   * The user's position for a "me" end. Asked only from `build()`, which runs on a click
   * (PRIVACY.md §4); rejects with a LocateError code.
   */
  locate: () => Promise<LngLat>;
  online: () => boolean;
}

export type RouteStatus = 'idle' | 'locating' | 'loading' | 'done' | 'error' | 'offline';

/**
 * The route form and its results. The router is asked only by `build()` — an explicit
 * "Build route" — and any change to the form drops results that no longer match it.
 */
export class RouteState {
  open = $state(false);
  mode = $state<RouteMode>('walk');
  from = $state.raw<RouteEnd>(null);
  to = $state.raw<RouteEnd>(null);
  /** Departure time; null for now. */
  time = $state.raw<Date | null>(null);

  status = $state<RouteStatus>('idle');
  /** Error code of the last failed `locate()`, e.g. "denied". */
  locateError = $state<string | null>(null);
  itineraries = $state.raw<Itinerary[]>([]);
  /** Index of the itinerary shown on the map. */
  selected = $state(0);

  #request: AbortController | undefined;

  constructor(private readonly deps: RouteDeps) {}

  /** Either end is the user's position: the map must not reveal where they are. */
  get usesMe(): boolean {
    return this.from?.kind === 'me' || this.to?.kind === 'me';
  }

  get ready(): boolean {
    return !!this.from && !!this.to;
  }

  get form(): RouteForm {
    return { mode: this.mode, from: this.from, to: this.to };
  }

  /** Opens the form; with a place, as the destination. */
  start(form: Partial<RouteForm> = {}): void {
    this.open = true;
    if (form.mode) this.mode = form.mode;
    if (form.from !== undefined) this.from = form.from;
    if (form.to !== undefined) this.to = form.to;
    this.#reset();
  }

  setMode(mode: RouteMode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    this.#reset();
  }

  setEnd(which: 'from' | 'to', end: RouteEnd): void {
    this[which] = end;
    this.#reset();
  }

  setTime(time: Date | null): void {
    this.time = time;
    this.#reset();
  }

  swap(): void {
    [this.from, this.to] = [this.to, this.from];
    this.#reset();
  }

  close(): void {
    this.#reset();
    this.open = false;
    this.from = null;
    this.to = null;
    this.time = null;
  }

  async build(): Promise<void> {
    const provider = this.deps.provider();
    const { from, to, mode, time } = this;
    if (!provider || !from || !to) return;
    this.#reset();
    if (!this.deps.online()) {
      this.status = 'offline';
      return;
    }
    const controller = new AbortController();
    this.#request = controller;
    try {
      let here: LngLat = { lng: 0, lat: 0 }; // replaced below whenever an end is "me"
      if (from.kind === 'me' || to.kind === 'me') {
        this.status = 'locating';
        try {
          here = await this.deps.locate();
        } catch (e) {
          if (controller.signal.aborted) return;
          this.locateError = e instanceof Error ? e.message : String(e);
          this.status = 'idle';
          return;
        }
        if (controller.signal.aborted) return;
      }
      const point = (end: NonNullable<RouteEnd>) => (end.kind === 'me' ? here : end.place.point);
      this.status = 'loading';
      const itineraries = await provider.route({
        from: point(from),
        to: point(to),
        mode,
        ...(time && { time }),
        lang: this.deps.lang(),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      this.itineraries = itineraries;
      this.status = 'done';
    } catch {
      if (controller.signal.aborted) return;
      this.status = 'error';
    }
  }

  #reset(): void {
    this.#request?.abort();
    this.#request = undefined;
    this.itineraries = [];
    this.selected = 0;
    this.status = 'idle';
    this.locateError = null;
  }
}
