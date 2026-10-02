import { getDb } from '../storage/db';
import type { RegionInfo } from '../tiles/catalog';
import { regionFileName, REGIONS_DIR, type StartMessage, type WorkerMessage } from './protocol';
import type { OfflineRegion } from './types';

export type DownloadError = 'network' | 'corrupt' | 'storage' | 'space' | 'unsupported';

/** Spare room kept free when checking the storage quota. */
const QUOTA_MARGIN = 1.1;

export function offlineSupported(): boolean {
  return typeof navigator.storage?.getDirectory === 'function' && typeof Worker === 'function';
}

/**
 * Regions downloaded for offline use: files in OPFS, records in IndexedDB (PLAN.md §7).
 * One download runs at a time.
 */
class OfflineRegions {
  regions = $state.raw<OfflineRegion[]>([]);
  /** Id of the region being downloaded. */
  active = $state<string | null>(null);
  error = $state<{ id: string; reason: DownloadError } | null>(null);
  /** Called when the set of complete regions changes. */
  onchange: () => void = () => {};

  #worker: Worker | undefined;

  async init(): Promise<void> {
    if (!offlineSupported()) return;
    try {
      this.regions = await (await getDb()).getAll('regions');
    } catch {
      // Storage unavailable.
    }
  }

  find(id: string): OfflineRegion | undefined {
    return this.regions.find((r) => r.id === id);
  }

  get complete(): OfflineRegion[] {
    return this.regions.filter((r) => r.complete);
  }

  async start(info: RegionInfo): Promise<void> {
    if (this.active) return;
    this.error = null;
    if (!offlineSupported()) return this.#fail(info.id, 'unsupported');

    let existing = this.find(info.id);
    // A newer build on the server: a partial download of the old one is useless.
    if (existing && existing.info.build !== info.build) {
      await this.remove(info.id);
      existing = undefined;
    }
    const offset = existing?.complete ? 0 : (existing?.bytes ?? 0);

    const { quota = 0, usage = 0 } = await navigator.storage.estimate();
    if (quota && (info.size - offset) * QUOTA_MARGIN > quota - usage) {
      return this.#fail(info.id, 'space');
    }
    // Ask once to protect downloads from automatic cleanup (granted silently for
    // installed apps; Safari grants it only to Home Screen apps).
    if (!(await navigator.storage.persisted?.())) await navigator.storage.persist?.();

    await this.#save({ id: info.id, info, bytes: offset, complete: false });
    this.active = info.id;

    const worker = new Worker(new URL('./download.worker.ts', import.meta.url), { type: 'module' });
    this.#worker = worker;
    worker.onmessage = (e: MessageEvent<WorkerMessage>) => void this.#onmessage(info, e.data);
    worker.onerror = () =>
      void this.#onmessage(info, { type: 'error', bytes: offset, reason: 'network' });
    const message: StartMessage = {
      type: 'start',
      id: info.id,
      url: info.url,
      size: info.size,
      offset,
    };
    worker.postMessage(message);
  }

  pause(): void {
    this.#worker?.postMessage({ type: 'pause' });
  }

  async remove(id: string): Promise<void> {
    if (this.active === id) this.#stop();
    const wasComplete = this.find(id)?.complete;
    // Free the space first; the list changes only once the file is really gone.
    try {
      const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle(REGIONS_DIR);
      await dir.removeEntry(regionFileName(id));
    } catch {
      // Already gone.
    }
    await (await getDb()).delete('regions', id);
    this.regions = this.regions.filter((r) => r.id !== id);
    if (wasComplete) this.onchange();
  }

  /** Opens the file of a complete region for reading. */
  async file(id: string): Promise<File> {
    const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle(REGIONS_DIR);
    return (await dir.getFileHandle(regionFileName(id))).getFile();
  }

  async #onmessage(info: RegionInfo, m: WorkerMessage): Promise<void> {
    const region: OfflineRegion = {
      id: info.id,
      info,
      bytes: m.bytes,
      complete: m.type === 'done',
    };
    if (m.type === 'progress') {
      this.regions = this.regions.map((r) => (r.id === info.id ? region : r));
      return;
    }
    this.#stop();
    await this.#save(region);
    if (m.type === 'error') this.error = { id: info.id, reason: m.reason };
    if (m.type === 'done') this.onchange();
  }

  #stop(): void {
    this.#worker?.terminate();
    this.#worker = undefined;
    this.active = null;
  }

  async #save(region: OfflineRegion): Promise<void> {
    const others = this.regions.filter((r) => r.id !== region.id);
    this.regions = [...others, region];
    await (await getDb()).put('regions', $state.snapshot(region));
  }

  #fail(id: string, reason: DownloadError): void {
    this.error = { id, reason };
  }
}

export const offlineRegions = new OfflineRegions();
