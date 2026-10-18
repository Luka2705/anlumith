import { validateGeography } from '../../src/investor/geography.js';
import { backendUrl, json } from '../../server/http.js';

export async function handleGeography({ env }, fetcher = fetch) {
  if (!env.ECHO_GEOGRAPHY_URL || !env.ECHO_API_TOKEN) return json({ error: 'not_configured' }, 503);
  try {
    const response = await fetcher(backendUrl(env.ECHO_GEOGRAPHY_URL), {
      headers: { Authorization: `Bearer ${env.ECHO_API_TOKEN}` }, signal: AbortSignal.timeout(20000), redirect: 'error',
    });
    if (!response.ok) return json({ error: 'unavailable' }, 503);
    return json(validateGeography(await response.json()), 200, { 'Cache-Control': 'public, max-age=60, s-maxage=300' });
  } catch { return json({ error: 'unavailable' }, 503); }
}
export const onRequest = context => context.request.method === 'GET' ? handleGeography(context) : json({ error: 'method_not_allowed' }, 405, { Allow: 'GET' });
