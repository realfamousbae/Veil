export type LocateMode = 'off' | 'locating' | 'shown' | 'follow';
export type LocateError = 'denied' | 'unavailable' | 'timeout' | 'unsupported';

export interface Fix {
  lng: number;
  lat: number;
  /** Radius of 68% confidence, meters. */
  accuracy: number;
}

const OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 };

const ERRORS: Record<number, LocateError> = { 1: 'denied', 2: 'unavailable', 3: 'timeout' };

/**
 * The user's position, strictly on demand (PRIVACY.md §4):
 * - nothing touches the Geolocation API until `press()` — call it only from a click handler;
 * - `watchPosition` runs only in follow mode and stops when it ends or the tab is hidden;
 * - the position is kept in memory only.
 */
export class Locator {
  mode = $state<LocateMode>('off');
  fix = $state.raw<Fix | null>(null);
  error = $state<LocateError | null>(null);

  #watch: number | undefined;

  constructor(
    /** Called on every new position; `follow` is false for the first, one-shot fix. */
    private readonly onfix: (fix: Fix, follow: boolean) => void,
    private readonly geolocation: () => Geolocation | undefined = () => navigator.geolocation,
  ) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stopFollow();
    });
  }

  /** The "Where am I" button: locate → follow → stop following. */
  press(): void {
    this.error = null;
    if (this.mode === 'follow') this.stopFollow();
    else if (this.mode === 'shown') this.#follow();
    else if (this.mode === 'off') this.#locate();
  }

  stopFollow(): void {
    if (this.#watch !== undefined) this.geolocation()?.clearWatch(this.#watch);
    this.#watch = undefined;
    if (this.mode === 'follow') this.mode = 'shown';
  }

  #locate(): void {
    const geo = this.geolocation();
    if (!geo) return this.#fail('unsupported');
    this.mode = 'locating';
    geo.getCurrentPosition(
      (p) => {
        this.mode = 'shown';
        this.#update(p, false);
      },
      (e) => this.#fail(ERRORS[e.code] ?? 'unavailable'),
      OPTIONS,
    );
  }

  #follow(): void {
    const geo = this.geolocation();
    if (!geo) return this.#fail('unsupported');
    this.mode = 'follow';
    this.#watch = geo.watchPosition(
      (p) => this.#update(p, true),
      (e) => {
        this.stopFollow();
        this.#fail(ERRORS[e.code] ?? 'unavailable');
      },
      OPTIONS,
    );
  }

  #update(p: GeolocationPosition, follow: boolean): void {
    const fix = { lng: p.coords.longitude, lat: p.coords.latitude, accuracy: p.coords.accuracy };
    this.fix = fix;
    this.onfix(fix, follow);
  }

  #fail(error: LocateError): void {
    this.error = error;
    // Keep showing an earlier position if we had one.
    this.mode = this.fix ? 'shown' : 'off';
  }
}
