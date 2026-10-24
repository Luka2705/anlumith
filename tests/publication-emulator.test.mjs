import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { publishWebsiteData, loadSongGeography } from '../integrations/firebase/websitePublication.mjs';

// Supply the existing Echo functions package path; no live credentials are used.
const enabled = !!process.env.FIRESTORE_EMULATOR_HOST && !!process.env.ECHO_FUNCTIONS_PACKAGE;
test('publisher integration: durable claim, public query pagination and partial failure retention', { skip: !enabled }, async () => {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  assert.match(host, /^(127\.0\.0\.1|localhost):\d+$/);
  const require = createRequire(process.env.ECHO_FUNCTIONS_PACKAGE);
  const { initializeApp, deleteApp } = require('firebase-admin/app');
  const { getFirestore, Timestamp, FieldPath, GeoPoint } = require('firebase-admin/firestore');
  const app = initializeApp({ projectId: 'demo-anlumith-publication' }, `website-test-${Date.now()}`);
  const db = getFirestore(app);
  const hour = Math.floor(Date.now() / 3600000) * 3600000 - 3 * 3600000;
  try {
    await db.doc('internalAnalytics/websitePublication').delete();
    const row = { newUsers: 5, activeUsers: 3, posts: 4 };
    await db.doc('internalAnalytics/liveKpis').set({ schemaVersion: 1, cacheVersion: 6, registrationSource: 'firebase-auth', generatedAt: hour, totalUsers: 100,
      current: row, history: { totals: { days: row, weeks: row, months: row } }, authActivity: { users24h: 8, periods: { days: 9, weeks: 10, months: 11 } } });
    const batch = db.batch();
    for (let i = 0; i < 301; i++) batch.set(db.doc(`songs/public-${i}`), { isPublic: true, timestamp: Timestamp.fromMillis(hour - 1000), location: new GeoPoint(48.1234, 9.5678), private: 'not-exported' });
    batch.set(db.doc('songs/private'), { isPublic: false, timestamp: Timestamp.fromMillis(hour - 1000), location: new GeoPoint(48, 9) });
    batch.set(db.doc('songs/old'), { isPublic: true, timestamp: Timestamp.fromMillis(hour - 73 * 3600000), location: new GeoPoint(48, 9) });
    await batch.commit();
    let reads = 0, sent = [];
    const options = { db, now: hour + 1000, destination: 'https://anlumith.com/api/internal/snapshots', token: 'test-only-secret-'.repeat(3),
      async readGeography(end) { reads++; return loadSongGeography(db, end, { Timestamp, FieldPath }); },
      async fetcher(url, init) { sent.push(JSON.parse(init.body)); return Response.json({ ok: true }); } };
    const results = await Promise.all(Array.from({ length: 5 }, () => publishWebsiteData(options)));
    assert.equal(results.filter(r => r.status === 'published').length, 1);
    assert.equal(reads, 1); assert.equal(sent.length, 1);
    assert.equal(sent[0].geography.publicSongPosts, 301);
    assert.equal(sent[0].geography.locatedSongPosts, 301);
    assert.deepEqual(sent[0].geography.cells, [{ latitude: 48.5, longitude: 9.5, songPosts: 301 }]);
    assert.ok(!JSON.stringify(sent).includes('not-exported'));
    // A new process invocation reuses the persisted claim; failure is not retried.
    assert.equal((await publishWebsiteData({ ...options })).status, 'skipped');
    await db.doc('internalAnalytics/liveKpis').delete();
    await publishWebsiteData({ ...options, now: hour + 3601000 });
    assert.equal(sent.length, 2); assert.deepEqual(Object.keys(sent[1]), ['geography']);
    await assert.rejects(publishWebsiteData({ ...options, now: hour + 7201000, fetcher: async () => { throw new Error('offline'); } }));
    assert.equal((await publishWebsiteData({ ...options, now: hour + 7201000 })).status, 'skipped');
  } finally { await db.terminate(); await deleteApp(app); }
});
