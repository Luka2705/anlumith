import { createSnapshotReader, readPublicSnapshot } from '../../src/investor/public-snapshot.js';
import { json } from '../../server/http.js';

export async function handleGeography(_context, fetcher = fetch) {
  try {
    const snapshot = await (fetcher === fetch ? readPublicSnapshot() : createSnapshotReader({ fetcher })());
    return json(snapshot.geography, 200, { 'Cache-Control': 'public, max-age=60, s-maxage=300' });
  } catch { return json({ error: 'unavailable' }, 503, { 'Retry-After': '60' }); }
}
export const onRequest = context => context.request.method === 'GET' ? handleGeography(context) : json({ error: 'method_not_allowed' }, 405, { Allow: 'GET' });
