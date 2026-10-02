import type { Place } from '../providers/types';
import { getDb } from '../storage/db';
import type { SavedPlace } from './types';

const newestFirst = (a: SavedPlace, b: SavedPlace) => b.savedAt - a.savedAt;

/** Saved places, stored in IndexedDB on this device only. */
class SavedPlaces {
  list = $state.raw<SavedPlace[]>([]);
  #ids = $derived(new Set(this.list.map((p) => p.id)));

  async init(): Promise<void> {
    try {
      this.list = (await (await getDb()).getAll('places')).sort(newestFirst);
    } catch {
      // Storage unavailable (e.g. some private modes): start empty.
    }
  }

  has(id: string): boolean {
    return this.#ids.has(id);
  }

  async toggle(place: Place): Promise<void> {
    if (this.has(place.id)) await this.remove(place.id);
    else await this.add(place);
  }

  async add(place: Place): Promise<void> {
    const saved: SavedPlace = { ...$state.snapshot(place), savedAt: Date.now() };
    this.list = [saved, ...this.list.filter((p) => p.id !== saved.id)];
    await (await getDb()).put('places', saved);
  }

  async remove(id: string): Promise<void> {
    this.list = this.list.filter((p) => p.id !== id);
    await (await getDb()).delete('places', id);
  }

  /** Adds places that are not saved yet; returns how many were added and skipped. */
  async importMany(places: SavedPlace[]): Promise<{ added: number; skipped: number }> {
    const fresh = places.filter(
      (p, i) => !this.has(p.id) && places.findIndex((q) => q.id === p.id) === i,
    );
    const tx = (await getDb()).transaction('places', 'readwrite');
    await Promise.all([...fresh.map((p) => tx.store.put(p)), tx.done]);
    this.list = [...this.list, ...fresh].sort(newestFirst);
    return { added: fresh.length, skipped: places.length - fresh.length };
  }
}

export const savedPlaces = new SavedPlaces();
