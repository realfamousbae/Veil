import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { OfflineRegion } from '../offline/types';
import type { SavedPlace } from '../places/types';

/** On-device storage (PRIVACY.md §3). Nothing here ever leaves the device. */
interface VeilDB extends DBSchema {
  settings: { key: string; value: unknown };
  places: { key: string; value: SavedPlace };
  regions: { key: string; value: OfflineRegion };
}

let db: Promise<IDBPDatabase<VeilDB>> | undefined;

export function getDb(): Promise<IDBPDatabase<VeilDB>> {
  db ??= openDB<VeilDB>('veil', 3, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) database.createObjectStore('settings');
      if (oldVersion < 2) database.createObjectStore('places', { keyPath: 'id' });
      if (oldVersion < 3) database.createObjectStore('regions', { keyPath: 'id' });
    },
  });
  return db;
}
