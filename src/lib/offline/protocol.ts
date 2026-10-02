/** Messages between the app and the region download worker. */

export interface StartMessage {
  type: 'start';
  id: string;
  url: string;
  /** Expected total size, bytes. */
  size: number;
  /** Bytes already on disk to resume after (0 = from scratch). */
  offset: number;
}

export type WorkerMessage =
  | { type: 'progress'; bytes: number }
  | { type: 'done'; bytes: number }
  | { type: 'paused'; bytes: number }
  | { type: 'error'; bytes: number; reason: 'network' | 'corrupt' | 'storage' };

/** OPFS location of downloaded regions. */
export const REGIONS_DIR = 'regions';
export const regionFileName = (id: string) => `${id}.pmtiles`;

/** PMTiles v3 files start with "PMTiles" followed by the version byte 3. */
export function isPmtilesV3(head: Uint8Array): boolean {
  const magic = [0x50, 0x4d, 0x54, 0x69, 0x6c, 0x65, 0x73, 0x03];
  return magic.every((b, i) => head[i] === b);
}
