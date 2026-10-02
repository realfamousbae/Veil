/// <reference lib="webworker" />
// Downloads one region file into OPFS. Runs in a dedicated worker because
// createSyncAccessHandle (the most widely supported way to write OPFS files, incl. older
// Safari) is only available in workers.
import {
  isPmtilesV3,
  regionFileName,
  REGIONS_DIR,
  type StartMessage,
  type WorkerMessage,
} from './protocol';

const PROGRESS_INTERVAL_MS = 200;
let controller: AbortController | undefined;

const post = (m: WorkerMessage) => self.postMessage(m);

self.onmessage = (e: MessageEvent<StartMessage | { type: 'pause' }>) => {
  if (e.data.type === 'pause') controller?.abort();
  else void download(e.data);
};

async function download({ id, url, size, offset }: StartMessage): Promise<void> {
  controller = new AbortController();
  let bytes = offset;
  let access: FileSystemSyncAccessHandle | undefined;
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle(REGIONS_DIR, { create: true });
    const file = await dir.getFileHandle(regionFileName(id), { create: true });
    access = await file.createSyncAccessHandle();
    access.truncate(bytes);

    const res = await fetch(url, {
      signal: controller.signal,
      credentials: 'omit',
      headers: bytes > 0 ? { Range: `bytes=${bytes}-` } : {},
    });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    if (bytes > 0 && res.status === 200) {
      // The server ignored the range: start over.
      bytes = 0;
      access.truncate(0);
    }

    const reader = res.body.getReader();
    let lastPost = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      access.write(value, { at: bytes });
      bytes += value.byteLength;
      if (performance.now() - lastPost > PROGRESS_INTERVAL_MS) {
        lastPost = performance.now();
        post({ type: 'progress', bytes });
      }
    }
    access.flush();

    const head = new Uint8Array(8);
    access.read(head, { at: 0 });
    if (bytes !== size || !isPmtilesV3(head)) {
      access.truncate(0);
      bytes = 0;
      post({ type: 'error', bytes, reason: 'corrupt' });
      return;
    }
    post({ type: 'done', bytes });
  } catch (err) {
    access?.flush();
    if (controller.signal.aborted) post({ type: 'paused', bytes });
    else if (err instanceof DOMException && err.name === 'QuotaExceededError')
      post({ type: 'error', bytes, reason: 'storage' });
    else post({ type: 'error', bytes, reason: 'network' });
  } finally {
    access?.close();
  }
}
