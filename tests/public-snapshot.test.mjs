import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSnapshotReader, validatePublicSnapshot, nextSnapshotAt, PUBLIC_SNAPSHOT_URL } from '../src/investor/public-snapshot.js';
import { unavailableSnapshot, snapshotState } from '../src/investor/metrics.js';
import { snapshotFixture } from './fixtures/public-snapshot.mjs';
const HOUR = 3_600_000, GRACE = 300_000;
const hour = Math.floor(Date.now() / HOUR) * HOUR;

test('cards and maps share one anonymous download until the next hourly publication', async () => {
  let now = hour + 1000, calls = 0;
  let finish;
  const reader = createSnapshotReader({ clock: () => now, fetcher: async (url, options) => {
    calls++; assert.equal(url, PUBLIC_SNAPSHOT_URL); assert.equal(options.credentials, 'omit');
    assert.equal(options.headers?.Authorization, undefined); assert.equal(options.redirect, 'error');
    await new Promise(resolve => { finish = resolve; }); return Response.json(snapshotFixture(now));
  } });
  const metrics = reader(), map = reader(); assert.equal(calls, 1); finish();
  const [a, b] = await Promise.all([metrics, map]); assert.equal(a, b);
  now = hour + HOUR + GRACE - 1; await reader(); assert.equal(calls, 1);
  now++; const newer = reader(); assert.equal(calls, 2); finish();
  assert.equal((await newer).generatedAt, hour + HOUR);
  assert.equal(nextSnapshotAt(hour, hour), hour + HOUR + GRACE);
});

test('file errors and malformed data fail closed without credential or database fallback', async () => {
  let now = hour + 1000, calls = 0;
  const reader = createSnapshotReader({ clock: () => now, fetcher: async () => { calls++; throw Error('PRIVATE backend details'); } });
  await assert.rejects(reader(), /^Error: Public snapshot unavailable$/);
  await assert.rejects(reader()); assert.equal(calls, 1);
  now += 60_000; await assert.rejects(reader()); assert.equal(calls, 2);
  const fixture = snapshotFixture();
  for (const value of [{}, { ...fixture, generatedAt: hour + HOUR }, { ...fixture, geography: { ...fixture.geography, generatedAt: hour - HOUR } },
    { ...fixture, metrics: { ...fixture.metrics, source: 'historical' } }]) assert.throws(() => validatePublicSnapshot(value));
  for (const response of [new Response('missing', { status: 404 }), new Response('<html>error</html>'), Response.json({})]) {
    await assert.rejects(createSnapshotReader({ fetcher: async () => response })());
  }
});

test('only validated aggregates leave the loader, with no raw user fields or extra envelope fields', () => {
  assert.equal(snapshotState(unavailableSnapshot), 'unavailable');
  assert.equal(unavailableSnapshot.totalUsers, null);
  const fixture = snapshotFixture(); fixture.apiKey = 'private'; fixture.metrics.email = 'private';
  fixture.geography.cells[0].userId = 'private'; fixture.kpis = { username: 'private' };
  const result = validatePublicSnapshot(fixture);
  assert.deepEqual(Object.keys(result), ['schemaVersion', 'generatedAt', 'metrics', 'geography']);
  assert(!JSON.stringify(result).includes('private'));
});

test('the website and local compatibility API have no Firestore or callable read fallback', async () => {
  for (const name of ['src/investor/Investor.jsx', 'src/investor/CommunityWorldMap.jsx', 'server/local-api.js', 'functions/api/metrics.js', 'functions/api/geography.js']) {
    const text = await readFile(new URL('../' + name, import.meta.url), 'utf8');
    assert(!text.includes('readFirebaseMetrics') && !text.includes('readFirebaseGeography'), name);
    assert(!text.includes("fetch('/api/metrics'") && !text.includes("fetch('/api/geography'"), name);
    assert(text.includes('readPublicSnapshot'), name);
  }
  const vite = await readFile(new URL('../vite.config.js', import.meta.url), 'utf8');
  assert(vite.includes("connect-src 'self' https://firebasestorage.googleapis.com;"));
});
