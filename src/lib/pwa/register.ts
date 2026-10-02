import { registerSW } from 'virtual:pwa-register';

/**
 * Registers the service worker (production builds only). `onupdate` is called when a new
 * version is ready; calling the returned function activates it and reloads.
 */
export function registerServiceWorker(onupdate: (apply: () => void) => void): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const update = registerSW({
    onNeedRefresh: () => onupdate(() => void update(true)),
  });
}
