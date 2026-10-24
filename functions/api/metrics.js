import { serveSnapshot } from '../../server/snapshots.js';
import { json } from '../../server/http.js';

export const handleMetrics = context => serveSnapshot(context, 'metrics');
export const onRequest = context => context.request.method === 'GET' ? handleMetrics(context) : json({ error: 'method_not_allowed' }, 405, { Allow: 'GET' });
