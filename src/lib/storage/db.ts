import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { SavedPlace } from '../places/types';

/** On-device storage (PLAN.md §5.3). Nothing here ever leaves the device. */
interface VeilDB extends DBSchema {
  settings: { key: string; value: unknown };
  places: { key: string; value: SavedPlace };
}

let db: Promise<IDBPDatabase<VeilDB>> | undefined;

export function getDb(): Promise<IDBPDatabase<VeilDB>> {
  db ??= openDB<VeilDB>('veil', 2, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) database.createObjectStore('settings');
      if (oldVersion < 2) database.createObjectStore('places', { keyPath: 'id' });
    },
  });
  return db;
}
