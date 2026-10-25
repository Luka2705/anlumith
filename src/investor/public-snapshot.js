import { validateSnapshot, HOUR } from './metrics.js';
import { validateGeography } from './geography.js';

// Public read capability for this fixed aggregate object; not an API/admin key.
export const PUBLIC_SNAPSHOT_URL = 'https://firebasestorage.googleapis.com/v0/b/echo-ee3bf.firebasestorage.app/o/public-analytics%2Fv1%2Fsnapshot.json?alt=media&token=e18b38fa-3b02-4bd8-87f0-b459cabdc110';
const GRACE = 5 * 60_000;
const MAX_BYTES = 2 * 1024 * 1024;
export function validatePublicSnapshot(value, now = Date.now()) {
  if (value?.schemaVersion !== 1 || !Number.isSafeInteger(value.generatedAt) || value.generatedAt <= 0 || value.generatedAt > now
    || value.generatedAt % HOUR !== 0 || value.metrics?.generatedAt !== value.generatedAt || value.geography?.generatedAt !== value.generatedAt)
    throw new Error('Invalid public snapshot');
  return { schemaVersion: 1, generatedAt: value.generatedAt,
    metrics: validateSnapshot(value.metrics, now), geography: validateGeography(value.geography, now) };
}
export function nextSnapshotAt(now, generatedAt) {
  const expected = generatedAt + HOUR + GRACE;
  return expected > now ? expected : (Math.floor(now / HOUR) + 1) * HOUR + GRACE;
}

// Homepage cards, investor pages and maps share one anonymous file download.
// No credentials, Firebase SDK, callable, query parameters or DB fallback.
export function createSnapshotReader({ fetcher = fetch, clock = Date.now } = {}) {
  let cached, expires = 0, pending, failedUntil = 0, failure;
  return async function read() {
    const now = clock();
    if (cached && now < expires) return cached;
    if (pending) return pending;
    if (now < failedUntil) throw failure;
    pending = (async () => {
      try {
        const response = await fetcher(PUBLIC_SNAPSHOT_URL, { credentials: 'omit', referrerPolicy: 'no-referrer',
          signal: AbortSignal.timeout(10_000), redirect: 'error',
          cf: { cacheEverything: true, cacheTtl: 300 } });
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Public file unavailable');
        if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('Public file too large');
        const text = await response.text();
        if (new TextEncoder().encode(text).byteLength > MAX_BYTES) throw new Error('Public file too large');
        const value = validatePublicSnapshot(JSON.parse(text), clock());
        if (cached && value.generatedAt < cached.generatedAt) throw new Error('Public file generation regressed');
        cached = value; expires = nextSnapshotAt(clock(), value.generatedAt); failedUntil = 0;
        return value;
      } catch {
        failure = new Error('Public snapshot unavailable'); failedUntil = clock() + 60_000;
        throw failure;
      }
    })();
    try { return await pending; } finally { pending = undefined; }
  };
}
export const readPublicSnapshot = createSnapshotReader();
