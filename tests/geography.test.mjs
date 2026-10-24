import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateSongGeography, validateGeography, GEO_HOUR, GEO_MAX_POSTS, songCoordinates } from '../src/investor/geography.js';
import { readFirebaseGeography, GEOGRAPHY_FIELDS } from '../server/firebase-geography.js';
import { handleGeography } from '../functions/api/geography.js';
import { createLocalApi } from '../server/local-api.js';

const end = Math.floor(Date.now() / GEO_HOUR) * GEO_HOUR;
const start = end - 72 * GEO_HOUR;
const post = (overrides = {}) => ({ isPublic: true, timestamp: end - 1000, location: { latitude: 48.12345, longitude: 9.4321 }, ...overrides });
test('geography includes every public post in the 72h window, groups collisions and never exports exact locations or identities', () => {
  const value = aggregateSongGeography([
    post({ userId: 'private', title: 'private' }), post({ location: { latitude: 48.9, longitude: 9.8 } }),
    post({ timestamp: start, location: { _latitude: -33.99, _longitude: -70.77 } }),
    post({ location: null }), post({ location: { latitude: 999, longitude: 9 } }),
    post({ isPublic: false }), post({ timestamp: start - 1 }), post({ timestamp: end }),
  ], end);
  assert.equal(value.publicSongPosts, 5); assert.equal(value.locatedSongPosts, 3); assert.equal(value.unlocatedSongPosts, 2);
  assert.equal(value.cells.length, 2);
  assert.deepEqual(value.cells.find(cell => cell.latitude === 48.5), { latitude: 48.5, longitude: 9.5, songPosts: 2 });
  const text = JSON.stringify(value); assert.ok(!text.includes('private')); assert.ok(!text.includes('48.12345')); assert.ok(!text.includes('9.4321'));
  assert.deepEqual(validateGeography(value), value);
  assert.equal(songCoordinates({ latitude: 0, longitude: 0 }).latitude, 0);
  assert.equal(songCoordinates({ latitude: '48', longitude: 9 }), null);
  const poles = aggregateSongGeography([post({ location: { latitude: 90, longitude: 180 } }), post({ location: { latitude: -90, longitude: -180 } })], end);
  validateGeography(poles); assert.ok(poles.cells.every(cell => cell.longitude === -179.5));
});
test('geographic contract fails closed for invalid, future, truncated or precise data', () => {
  const value = aggregateSongGeography([post()], end);
  assert.throws(() => validateGeography({ ...value, cells: [] }));
  assert.throws(() => validateGeography({ ...value, cells: [{ latitude: 48.12345, longitude: 9.4321, songPosts: 1 }] }));
  assert.throws(() => validateGeography({ ...value, generatedAt: Date.now() + GEO_HOUR }));
  assert.throws(() => validateGeography({ ...value, windowStart: start - 1 }));
  assert.throws(() => aggregateSongGeography(Array(GEO_MAX_POSTS + 1).fill(post()), end));
  assert.deepEqual(validateGeography({ ...value, userIds: ['private'], cells: value.cells.map(cell => ({ ...cell, userId: 'private' })) }), value);
  assert.equal(validateGeography(aggregateSongGeography([], end)).locatedSongPosts, 0);
});

function document(index, valid = true) {
  return { name: `projects/echo-ee3bf/databases/(default)/documents/songs/test-${index}`, fields: {
    timestamp: { timestampValue: new Date(end - (index + 1) * 1000).toISOString() }, isPublic: { booleanValue: true },
    ...(valid ? { location: { geoPointValue: { latitude: 48.12345, longitude: 9.4321 } } } : {}),
  } };
}
test('Firestore geography paginates all canonical public posts at one read time using a minimal field mask', async () => {
  const queries = [];
  const snapshotTime = new Date(end + 10000).toISOString();
  const value = await readFirebaseGeography({ projectId: 'echo-ee3bf', now: end + 20000, getAccessToken: async () => 'test-only-secret', fetcher: async (url, options) => {
    assert.equal(new URL(url).hostname, 'firestore.googleapis.com');
    assert.equal(options.headers.Authorization, 'Bearer test-only-secret');
    const query = JSON.parse(options.body); queries.push(query);
    assert.deepEqual(query.structuredQuery.select.fields.map(field => field.fieldPath), GEOGRAPHY_FIELDS);
    assert.deepEqual(query.structuredQuery.from, [{ collectionId: 'songs' }]);
    assert.deepEqual(query.structuredQuery.where.compositeFilter.filters[0].fieldFilter.value, { booleanValue: true });
    const docs = queries.length === 1 ? Array.from({ length: 300 }, (_, i) => document(i)) : [document(300, false)];
    return Response.json(docs.map(doc => ({ document: doc, readTime: snapshotTime })));
  } });
  assert.equal(queries.length, 2); assert.equal(queries[1].readTime, snapshotTime);
  assert.equal(queries[1].structuredQuery.startAt.before, false);
  assert.equal(value.publicSongPosts, 301); assert.equal(value.locatedSongPosts, 300); assert.equal(value.unlocatedSongPosts, 1);
  assert.equal(value.cells.length, 1); assert.equal(value.cells[0].songPosts, 300);
  assert.ok(!JSON.stringify(value).includes('test-')); validateGeography(value);
});
test('query errors do not publish fake zero or partial points', async () => {
  const base = { projectId: 'echo-ee3bf', now: end + 20000, getAccessToken: async () => 'test' };
  await assert.rejects(readFirebaseGeography({ ...base, fetcher: async () => Response.json({ error: 'index unavailable' }, { status: 400 }) }));
  await assert.rejects(readFirebaseGeography({ ...base, fetcher: async () => Response.json([{ document: document(1) }]) }));
  const empty = await readFirebaseGeography({ ...base, fetcher: async () => Response.json([{ readTime: new Date(end + 10000).toISOString() }]) });
  assert.equal(empty.publicSongPosts, 0);
});
test('hosted geography fails closed without a snapshot binding', async () => {
  assert.equal((await handleGeography({ env: {} })).status, 503);
});
test('local geography snapshot is shared across visitors and refreshed on the next hour', async () => {
  let now = end + 1000, reads = 0;
  const handler = createLocalApi({ configuration: { firebaseProjectId: 'echo-ee3bf', localMetricsSource: 'firebase-cli' }, clock: () => now,
    readGeography: async ({ now }) => { reads++; return aggregateSongGeography([post()], Math.floor(now / GEO_HOUR) * GEO_HOUR); } });
  const invoke = () => new Promise(resolve => handler({ method: 'GET', url: '/geography', headers: { host: '127.0.0.1:4173' } }, {
    setHeader() {}, end(body) { resolve(JSON.parse(body)); },
  }));
  const [a, b] = await Promise.all([invoke(), invoke()]); assert.equal(reads, 1); assert.deepEqual(a, b);
  now += GEO_HOUR; await invoke(); assert.equal(reads, 2);
});
