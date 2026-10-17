import { validateSnapshot } from '../../src/investor/metrics.js';
import { backendUrl, json } from '../../server/http.js';

export async function handleMetrics({ env }, fetcher = fetch) {
  if (!env.ECHO_METRICS_URL || !env.ECHO_API_TOKEN) return json({ error: 'not_configured' }, 503);
  try {
    const upstream = await fetcher(backendUrl(env.ECHO_METRICS_URL), {
      headers: { Authorization: `Bearer ${env.ECHO_API_TOKEN}` }, signal: AbortSignal.timeout(10000), redirect: 'error',
    });
    if (!upstream.ok) return json({ error: 'unavailable' }, 503);
    const approved = validateSnapshot(await upstream.json());
    return json(approved, 200, { 'Cache-Control': 'public, max-age=60, s-maxage=300' });
  } catch { return json({ error: 'unavailable' }, 503); }
}
export const onRequest = context => context.request.method === 'GET' ? handleMetrics(context) : json({ error: 'method_not_allowed' }, 405, { Allow: 'GET' });
