import test from 'node:test';
import assert from 'node:assert/strict';
import { publishWebsiteData, loadSongGeography } from '../integrations/firebase/websitePublication.mjs';
import { aggregateSongGeography } from '../src/investor/geography.js';

const hour = Math.floor(Date.now() / 3600000) * 3600000 - 3 * 3600000;
const row = { newUsers: 5, activeUsers: 3, posts: 4 };
const cache = { schemaVersion: 1, cacheVersion: 6, registrationSource: 'firebase-auth', generatedAt: hour, totalUsers: 100,
  current: row, history: { totals: { days: row, weeks: row, months: row } }, authActivity: { users24h: 8, periods: { days: 9, weeks: 10, months: 11 } } };
function fixture() {
  let lease, reads = 0, scans = 0, posts = 0, tail = Promise.resolve();
  const db = {
    doc(path) { return { path, async get() { reads++; return { data: () => cache }; } }; },
    runTransaction(fn) {
      const result = tail.then(() => fn({ async get() { return { data: () => lease }; }, set(ref, value) { lease = value; } }));
      tail = result.catch(() => {}); return result;
    },
  };
  const options = { db, now: hour + 1000, destination: 'https://anlumith.com/api/internal/snapshots', token: 'test-only-'.repeat(5),
    async readGeography(windowEnd) { scans++; return aggregateSongGeography([], windowEnd); },
    async fetcher(url, init) { posts++; assert.equal(init.method, 'PUT'); assert.equal(init.redirect, 'error'); return Response.json({ ok: true }); },
  };
  return { options, counts: () => ({ reads, scans, posts }) };
}
test('concurrent/redelivered jobs claim one durable hourly attempt before source reads', async () => {
  const { options, counts } = fixture();
  const values = await Promise.all(Array.from({ length: 10 }, () => publishWebsiteData(options)));
  assert.equal(values.filter(v => v.status === 'published').length, 1);
  assert.deepEqual(counts(), { reads: 1, scans: 1, posts: 1 });
  assert.equal((await publishWebsiteData({ ...options })).status, 'skipped');
  await publishWebsiteData({ ...options, now: hour + 3601000 });
  assert.deepEqual(counts(), { reads: 2, scans: 2, posts: 2 });
  assert.equal((await publishWebsiteData(options)).status, 'skipped');
});
test('failed delivery does not trigger repeated scans or automatic retries in the hour', async () => {
  const { options, counts } = fixture(); options.fetcher = async () => { throw new Error('network failure'); };
  await assert.rejects(publishWebsiteData(options));
  assert.equal((await publishWebsiteData(options)).status, 'skipped');
  assert.deepEqual(counts(), { reads: 1, scans: 1, posts: 0 });
});
test('partial failures publish only valid data; secrets and raw cache fields stay private', async () => {
  const { options } = fixture(); options.readGeography = async () => { throw new Error('index unavailable'); };
  options.fetcher = async (url, init) => {
    const value = JSON.parse(init.body); assert.deepEqual(Object.keys(value), ['metrics']);
    assert.equal(value.metrics.authActivity, undefined); assert.equal(value.metrics.totalUsers, 100);
    return Response.json({ ok: true });
  };
  assert.deepEqual(await publishWebsiteData(options), { status: 'published', metrics: true, geography: false });
});
test('invalid configuration is rejected before Firebase work', async () => {
  const { options, counts } = fixture();
  for (const overrides of [{ token: '' }, { destination: 'http://anlumith.com/api/internal/snapshots' }, { destination: 'https://anlumith.com/api/metrics' }])
    await assert.rejects(publishWebsiteData({ ...options, ...overrides }));
  assert.deepEqual(counts(), { reads: 0, scans: 0, posts: 0 });
});

test('geography reads only public fields, stable pages and at most 20001 source documents', async () => {
  class Timestamp { constructor(n) { this.n = n; } static fromMillis(n) { return new Timestamp(n); } toMillis() { return this.n; } }
  const fields = [], filters = [], limits = []; let cursor = 0, queried = 0;
  const query = { where(...args) { filters.push(args); return this; }, orderBy() { return this; },
    select(...args) { fields.push(...args); return this; }, startAfter(doc) { cursor = doc.index + 1; return this; }, limit(n) { limits.push(n); return { count: n, cursor }; } };
  const db = { collection(name) { assert.equal(name, 'songs'); return query; },
    async runTransaction(fn, config) { assert.equal(config.readOnly, true); return fn({ async get({ count, cursor }) {
      queried += count;
      return { size: count, docs: Array.from({ length: count }, (_, offset) => ({ index: cursor + offset,
        data: () => ({ timestamp: new Timestamp(hour - 1000), isPublic: true, location: null }) })) };
    } }); } };
  await assert.rejects(loadSongGeography(db, hour, { Timestamp, FieldPath: { documentId: () => '__name__' } }), /safety limit/);
  assert.equal(queried, 20001); assert.equal(limits.at(-1), 201);
  assert.deepEqual(fields, ['timestamp', 'location', 'isPublic']); assert.deepEqual(filters[0], ['isPublic', '==', true]);
});
