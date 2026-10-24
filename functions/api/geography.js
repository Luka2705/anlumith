import { serveSnapshot } from '../../server/snapshots.js';
import { json } from '../../server/http.js';

export const handleGeography = context => serveSnapshot(context, 'geography');
export const onRequest = context => context.request.method === 'GET' ? handleGeography(context) : json({ error: 'method_not_allowed' }, 405, { Allow: 'GET' });
