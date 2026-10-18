import { readFirebaseMetrics } from './firebase-metrics.js';
import { handleMetrics } from '../functions/api/metrics.js';
import { readFirebaseGeography } from './firebase-geography.js';
import { handleGeography } from '../functions/api/geography.js';

export function createLocalApi({ configuration, env = {}, readMetrics = readFirebaseMetrics, readGeography = readFirebaseGeography, clock = Date.now }) {
  let cached, expiresAt = 0, pending;
  let cachedGeography, geographyExpiresAt = 0, pendingGeography;
  async function geography() {
    if (cachedGeography && clock() < geographyExpiresAt) return cachedGeography;
    if (pendingGeography) return pendingGeography;
    const now = clock();
    pendingGeography = (async () => {
      const value = await readGeography({ projectId: configuration.firebaseProjectId, now });
      cachedGeography = value; geographyExpiresAt = Math.floor(now / 3600000) * 3600000 + 3600000;
      return value;
    })();
    try { return await pendingGeography; } finally { pendingGeography = undefined; }
  }
  async function metrics() {
    if (cached && clock() < expiresAt) return cached;
    if (pending) return pending;
    pending = (async () => {
      const value = await readMetrics({ projectId: configuration.firebaseProjectId });
      cached = value; expiresAt = clock() + 60000;
      return value;
    })();
    try { return await pending; } finally { pending = undefined; }
  }
  return async (request, response) => {
    const send = (body, status = 200) => {
      response.statusCode = status;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.end(JSON.stringify(body));
    };
    // Local account access stays bound to loopback and same-origin requests.
    // Reject DNS rebinding and cross-site reads even if the port is reachable.
    let host;
    try { host = new URL(`http://${request.headers.host}`); } catch { send({ error: 'forbidden' }, 403); return; }
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(host.hostname) ||
        (request.headers.origin && ![`http://${host.host}`, `https://${host.host}`].includes(request.headers.origin)) ||
        request.headers['sec-fetch-site'] === 'cross-site') { send({ error: 'forbidden' }, 403); return; }
    const path = new URL(request.url, 'http://127.0.0.1').pathname;
    const isGeography = path === '/geography' || path === '/geography/';
    if (!isGeography && path !== '/metrics' && path !== '/metrics/') { send({ error: 'not_configured' }, 503); return; }
    if (request.method !== 'GET') { response.setHeader('Allow', 'GET'); send({ error: 'method_not_allowed' }, 405); return; }
    try {
      if (isGeography) {
        if (env.ECHO_GEOGRAPHY_URL && env.ECHO_API_TOKEN) {
          const upstream = await handleGeography({ env }); send(await upstream.json(), upstream.status);
        } else if (configuration.localMetricsSource === 'firebase-cli') send(await geography());
        else send({ error: 'not_configured' }, 503);
        return;
      }
      if (env.ECHO_METRICS_URL && env.ECHO_API_TOKEN) {
        const upstream = await handleMetrics({ env });
        send(await upstream.json(), upstream.status);
      } else if (configuration.localMetricsSource === 'firebase-cli') {
        send(await metrics());
      } else send({ error: 'not_configured' }, 503);
    } catch { send({ error: 'unavailable' }, 503); }
  };
}
