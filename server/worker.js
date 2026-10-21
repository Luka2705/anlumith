import { onRequest as geography } from '../functions/api/geography.js';
import { onRequest as metrics } from '../functions/api/metrics.js';
import { onRequest as contact } from '../functions/api/contact.js';
import { json } from './http.js';

const routes = new Map([
  ['/api/geography', geography],
  ['/api/metrics', metrics],
  ['/api/contact', contact],
]);

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname.replace(/\/$/, '');
    const handler = routes.get(path);
    if (handler) return handler({ request, env });
    if (path === '/api' || path.startsWith('/api/')) return json({ error: 'not_found' }, 404);
    return env.ASSETS.fetch(request);
  },
};
