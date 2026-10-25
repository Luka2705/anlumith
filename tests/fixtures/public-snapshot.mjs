import { historicalSnapshot, HOUR } from '../../src/investor/metrics.js';
import { aggregateSongGeography } from '../../src/investor/geography.js';
// Synthetic fixtures only; never imported by the product.
export function snapshotFixture(now = Date.now()) {
  const generatedAt = Math.floor(now / HOUR) * HOUR;
  return { schemaVersion: 1, generatedAt,
    metrics: { ...structuredClone(historicalSnapshot), source: 'firebase', generatedAt,
      definition: 'canonical-includes-comment-likes' },
    geography: aggregateSongGeography([{ isPublic: true, timestamp: generatedAt - 1000,
      location: { latitude: 48.12345, longitude: 9.4321 } }], generatedAt) };
}
