import { createSnapshotReader, readPublicSnapshot } from '../../src/investor/public-snapshot.js';
import { json } from '../../server/http.js';

export async function handleMetrics(_context, fetcher = fetch) {
  try {
    const snapshot = await (fetcher === fetch ? readPublicSnapshot() : createSnapshotReader({ fetcher })());
    return json(snapshot.metrics, 200, { 'Cache-Control': 'public, max-age=60, s-maxage=300' });
  } catch { return json({ error: 'unavailable' }, 503, { 'Retry-After': '60' }); }
}
export const onRequest = context => context.request.method === 'GET' ? handleMetrics(context) : json({ error: 'method_not_allowed' }, 405, { Allow: 'GET' });
