import type { Place } from '../providers/types';

export interface SavedPlace extends Place {
  /** Unix time, ms. */
  savedAt: number;
}
