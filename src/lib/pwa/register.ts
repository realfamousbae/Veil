import { registerSW } from 'virtual:pwa-register';

/**
 * Registers the service worker (production builds only). A new version activates right
 * away and reloads the page: a stale worker would otherwise keep serving old files (e.g.
 * icons) until the user acted on a prompt. Nothing is lost on reload — the map position
 * and the selected place live in the URL, saved places in IndexedDB.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  registerSW({ immediate: true });
}
