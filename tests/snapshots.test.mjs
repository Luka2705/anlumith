import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../server/worker.js';
import { WebsiteSnapshots, DAY_LIMIT, MINUTE_LIMIT } from '../server/snapshots.js';
import { historicalSnapshot } from '../src/investor/metrics.js';
import { aggregateSongGeography } from '../src/investor/geography.js';

const hour = Math.floor(Date.now() / 3600000) * 3600000;
const metrics = { ...historicalSnapshot, source: 'firebase', definition: 'canonical-includes-comment-likes', generatedAt: hour };
const geography = aggregateSongGeography([], hour);
const token = 'test-only-secret-'.repeat(3);
export function memoryStore() {
  const data = new Map(); let tail = Promise.resolve();
  const storage = {
    async get(key) { return structuredClone(data.get(key)); },
    async put(key, value) { data.set(key, structuredClone(value)); },
    transaction(fn) { const next = tail.then(() => fn(storage)); tail = next.catch(() => {}); return next; },
  };
  return storage;
}
function environment() {
  const storage = memoryStore(), object = new WebsiteSnapshots({ storage });
  const seen = [];
  return { storage, object, seen, env: {
    WEBSITE_PUBLISH_TOKEN: token,
    PUBLIC_DATA_LIMITER: { async limit({ key }) { seen.push(key); return { success: true }; } },
    WEBSITE_SNAPSHOTS: { idFromName(name) { assert.equal(name, 'public-v1'); return name; }, get() { return object; } },
    ASSETS: { fetch() { throw new Error('API must not reach assets'); } },
    ECHO_METRICS_URL: 'https://must-never-be-called.test', ECHO_API_TOKEN: 'unused',
  } };
}
const read = (env, path = '/api/metrics') => worker.fetch(new Request(`https://anlumith.com${path}`, { headers: { 'CF-Connecting-IP': '192.0.2.1' } }), env);
const publish = (env, body = { metrics, geography }, secret = token) => worker.fetch(new Request('https://anlumith.com/api/internal/snapshots', {
  method: 'PUT', headers: { Authorization: `Bearer ${secret}` }, body: JSON.stringify(body),
}), env);

test('public reads never fetch upstream, even when empty, expired, or refreshed by query string', async t => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Public request triggered upstream'); });
  const { env, seen } = environment();
  assert.equal((await read(env)).status, 503);
  assert.equal((await publish(env)).status, 200);
  for (const path of ['/api/metrics', '/api/geography', '/api/metrics?refresh=1', '/api/metrics/']) {
    const response = await read(env, path); assert.equal(response.status, 200);
    assert.equal((await response.json()).generatedAt, hour);
  }
  assert.ok(seen.every(key => /^[a-f0-9]{64}$/.test(key)));
  assert.equal((await worker.fetch(new Request('https://anlumith.com/api/metrics'), env)).status, 503);
});

test('publication authenticates, validates and strips private fields; old/invalid data cannot replace snapshots', async () => {
  const { env } = environment();
  assert.equal((await publish(env, { metrics }, 'wrong')).status, 401);
  assert.equal((await publish(env, { metrics: { ...metrics, totalUsers: -1 } })).status, 400);
  assert.equal((await publish(env, { metrics: { ...metrics, private: 'never publish' }, geography })).status, 200);
  assert.equal((await (await read(env)).json()).private, undefined);
  await publish(env, { metrics: { ...metrics, generatedAt: hour - 3600000, totalUsers: 1 } });
  assert.equal((await (await read(env)).json()).totalUsers, metrics.totalUsers);
  assert.equal((await publish(env, { metrics, geography: { ...geography, cells: [{ latitude: 1.1234 }] } })).status, 400);
  assert.equal((await (await read(env, '/api/geography')).json()).generatedAt, hour);
  const response = await worker.fetch(new Request('https://anlumith.com/api/internal/snapshots', {
    method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: 'x'.repeat(2097153),
  }), env);
  assert.equal(response.status, 413);
});

test('per-IP edge limit rejects before durable storage, and fails closed when binding fails', async () => {
  const { env } = environment();
  env.PUBLIC_DATA_LIMITER.limit = async () => ({ success: false });
  env.WEBSITE_SNAPSHOTS.get = () => { throw new Error('must not reach storage'); };
  const response = await read(env); assert.equal(response.status, 429); assert.equal(response.headers.get('Retry-After'), '60');
  env.PUBLIC_DATA_LIMITER.limit = async () => { throw new Error('limiter unavailable'); };
  assert.equal((await read(env)).status, 503);
});

test('global quotas are shared across routes and survive object recreation; publish remains available', async t => {
  const now = hour + 10000; t.mock.method(Date, 'now', () => now);
  const { env, storage } = environment();
  await publish(env);
  const minute = Math.floor(now / 60000), day = Math.floor(now / 86400000);
  await storage.put('quota', { minute, minuteCount: MINUTE_LIMIT - 1, day, dayCount: 0 });
  const responses = await Promise.all([read(env), read(env, '/api/geography')]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 429]);
  assert.ok(Number(responses.find(r => r.status === 429).headers.get('Retry-After')) > 0);
  const restarted = new WebsiteSnapshots({ storage }); env.WEBSITE_SNAPSHOTS.get = () => restarted;
  assert.equal((await read(env)).status, 429);
  await storage.put('quota', { minute: minute - 1, minuteCount: 0, day, dayCount: DAY_LIMIT });
  assert.equal((await read(env)).status, 429);
  assert.equal((await publish(env)).status, 200);
  t.mock.method(Date, 'now', () => (day + 1) * 86400000);
  assert.equal((await read(env)).status, 200);
});

test('stale snapshots survive isolated updates and keep original upstream timestamps', async () => {
  const { env } = environment();
  const stale = { ...metrics, generatedAt: hour - 10 * 3600000 };
  await publish(env, { metrics: stale, geography });
  await publish(env, { geography: aggregateSongGeography([], hour + 0) });
  assert.equal((await (await read(env)).json()).generatedAt, stale.generatedAt);
});

test('loopback development retains the legacy hosted adapter with private-field filtering', async t => {
  const { createLocalApi } = await import('../server/local-api.js');
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls++; assert.equal(options.headers.Authorization, 'Bearer test-only-local-token');
    return Response.json({ ...(url.includes('metrics') ? metrics : geography), private: 'must be stripped' });
  });
  const local = createLocalApi({ configuration: {}, env: { ECHO_API_TOKEN: 'test-only-local-token',
    ECHO_METRICS_URL: 'https://legacy.test/metrics', ECHO_GEOGRAPHY_URL: 'https://legacy.test/geography' } });
  for (const path of ['/metrics', '/geography']) {
    const value = await new Promise(resolve => local({ method: 'GET', url: path, headers: { host: '127.0.0.1:4173' } }, {
      setHeader() {}, end(body) { resolve(JSON.parse(body)); },
    }));
    assert.equal(value.private, undefined); assert.equal(value.source, 'firebase');
  }
  assert.equal(calls, 2);
});
