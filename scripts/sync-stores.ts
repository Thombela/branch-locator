/**
 * Pulls every Capitec location from the store feed into src/mocks/data/stores.json.
 *
 *   npm run sync:stores
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { FEED_REQUEST, FEED_URL, feedSchema, normaliseFeed } from '../src/mocks/data/storeFeed.ts';

const OUTPUT = new URL('../src/mocks/data/stores.json', import.meta.url);

const response = await fetch(FEED_URL, {
  method: 'POST',
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  body: JSON.stringify(FEED_REQUEST),
  signal: AbortSignal.timeout(120_000),
});
if (!response.ok)
  throw new Error(`Store feed returned ${response.status}: ${await response.text()}`);

// The feed's "today" hours are for the day it answered, so date the snapshot by its clock.
const fetchedAt = new Date(response.headers.get('date') ?? Date.now());
const feed = feedSchema.parse(await response.json());
const stores = normaliseFeed(feed.stores, fetchedAt);

// One store per line keeps the file diffable without pretty-printing ~2 MB.
await writeFile(
  OUTPUT,
  `{\n"source": ${JSON.stringify(FEED_URL)},\n"fetchedAt": ${JSON.stringify(fetchedAt.toISOString())},\n"stores": [\n${stores.map((store) => JSON.stringify(store)).join(',\n')}\n]\n}\n`,
);
process.stdout.write(
  `Saved ${stores.length} open stores (${feed.stores.length - stores.length} closed ones skipped) to ${fileURLToPath(OUTPUT)}\n`,
);
