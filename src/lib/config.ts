/** Runtime configuration, loaded from public/config.json (not baked into the build). */
export interface AppConfig {
  tiles: { world: string };
  regions: string | null;
  geocoder: {
    type: 'photon';
    url: string;
    /** Result languages the instance supports besides "default" (local names). */
    langs?: string[];
  };
  /** Base URL of the optional self-hosted server; null disables account features. */
  server: string | null;
}

export async function loadConfig(): Promise<AppConfig> {
  const res = await fetch(`${import.meta.env.BASE_URL}config.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to load config.json: ${res.status}`);
  return (await res.json()) as AppConfig;
}

/** Resolves a possibly relative URL from the config against the page location. */
export function resolveUrl(url: string): string {
  return new URL(url, document.baseURI).href;
}
