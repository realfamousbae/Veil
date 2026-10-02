import type { RegionInfo } from '../tiles/catalog';

/** A region stored (fully or partly) on this device. */
export interface OfflineRegion {
  id: string;
  /** Catalog entry at download time (name, bbox, build, size). */
  info: RegionInfo;
  /** Bytes on disk. */
  bytes: number;
  complete: boolean;
}
