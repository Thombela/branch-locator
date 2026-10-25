import feed from './stores.json';
import type { StoreRecord } from './storeFeed';

/** Every open Capitec location, saved from the store feed by `npm run sync:stores`. */
export const STORES = feed.stores as StoreRecord[];

/** When the feed was read; ATM hours are that day's hours. */
export const STORES_FETCHED_AT = feed.fetchedAt;
