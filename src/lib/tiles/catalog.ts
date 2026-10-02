import type { BBox } from './geo';

/** A downloadable region, as listed in the catalog (regions/index.json). */
export interface RegionInfo {
  id: string;
  name: { en: string; ru: string };
  bbox: BBox;
  maxzoom: number;
  /** Bytes. */
  size: number;
  /** Planet build date, YYYYMMDD. */
  build: string;
  /** Absolute URL of the .pmtiles file. */
  url: string;
}

interface CatalogEntry extends Omit<RegionInfo, 'url'> {
  /** Relative to the catalog URL. */
  file: string;
}

export async function loadCatalog(url: string): Promise<RegionInfo[]> {
  const res = await fetch(url, { credentials: 'omit', cache: 'no-cache' });
  if (!res.ok) throw new Error(`Region catalog: ${res.status}`);
  const entries = (await res.json()) as CatalogEntry[];
  return entries.map(({ file, ...info }) => ({ ...info, url: new URL(file, url).href }));
}
