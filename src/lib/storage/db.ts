import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

/** On-device storage (PLAN.md §5.3). Nothing here ever leaves the device. */
interface VeilDB extends DBSchema {
  settings: { key: string; value: unknown };
}

let db: Promise<IDBPDatabase<VeilDB>> | undefined;

export function getDb(): Promise<IDBPDatabase<VeilDB>> {
  db ??= openDB<VeilDB>('veil', 1, {
    upgrade(database) {
      database.createObjectStore('settings');
    },
  });
  return db;
}
