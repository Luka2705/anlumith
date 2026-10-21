import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../server/worker.js';
import { readFile } from 'node:fs/promises';

test('Worker deployment routes API requests before static assets', async () => {
  const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  assert.equal(config.main, 'server/worker.js');
  assert.deepEqual(config.assets.run_worker_first, ['/api', '/api/*']);
  const env = { ASSETS: { fetch() { throw new Error('API request reached static hosting'); } } };
  for (const path of ['/api/metrics', '/api/geography', '/api/metrics/', '/api/geography/']) {
    const response = await worker.fetch(new Request(`https://anlumith.com${path}`), env);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'not_configured' });
  }
  for (const path of ['/api/metrics', '/api/geography', '/api/contact']) {
    const response = await worker.fetch(new Request(`https://anlumith.com${path}`, { method: 'DELETE' }), env);
    assert.equal(response.status, 405);
  }
  assert.equal((await worker.fetch(new Request('https://anlumith.com/api/unknown'), env)).status, 404);
});

test('Worker preserves static page and map asset responses', async () => {
  for (const path of ['/de', '/maps/world-land.geojson', '/missing-page']) {
    const request = new Request(`https://anlumith.com${path}`);
    const response = new Response('asset response', { status: path === '/missing-page' ? 404 : 200 });
    const env = { ASSETS: { fetch(received) { assert.equal(received, request); return response; } } };
    assert.equal(await worker.fetch(request, env), response);
  }
});
