import { projectInvestorSnapshot } from './investorProjection.mjs';
import { aggregateSongGeography, validateGeography, GEO_MAX_POSTS } from '../../src/investor/geography.js';
import { validateSnapshot } from '../../src/investor/metrics.js';

const HOUR = 3600000;
// Bounded, consistent read. Only the scheduled publisher calls this function.
export async function loadSongGeography(db, windowEnd, { Timestamp, FieldPath }) {
  return db.runTransaction(async transaction => {
    const base = db.collection('songs').where('isPublic', '==', true)
      .where('timestamp', '>=', Timestamp.fromMillis(windowEnd - 72 * HOUR))
      .where('timestamp', '<', Timestamp.fromMillis(windowEnd))
      .orderBy('timestamp', 'desc').orderBy(FieldPath.documentId(), 'desc')
      .select('timestamp', 'location', 'isPublic');
    const posts = [];
    let cursor;
    for (;;) {
      const limit = Math.min(300, GEO_MAX_POSTS + 1 - posts.length);
      const page = await transaction.get((cursor ? base.startAfter(cursor) : base).limit(limit));
      for (const doc of page.docs) {
        const data = doc.data();
        posts.push({ isPublic: data.isPublic, timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toMillis() : NaN, location: data.location });
      }
      if (posts.length > GEO_MAX_POSTS) throw new Error('Geographic safety limit exceeded');
      if (page.size < limit) break;
      cursor = page.docs[page.size - 1];
    }
    return validateGeography(aggregateSongGeography(posts, windowEnd));
  }, { readOnly: true });
}

export async function publishWebsiteData({ db, destination, token, readGeography, now = Date.now(), fetcher = fetch }) {
  const url = new URL(destination);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search || url.pathname !== '/api/internal/snapshots' || typeof token !== 'string' || token.length < 32)
    throw new Error('Invalid publication configuration');
  const hour = Math.floor(now / HOUR) * HOUR;
  const ref = db.doc('internalAnalytics/websitePublication');
  // Persist BEFORE doing source reads. Redelivery, cold starts and concurrent
  // invocations cannot cause another scan this hour, including after failure.
  const claimed = await db.runTransaction(async tx => {
    const previous = (await tx.get(ref)).data();
    if (previous?.attemptedHour >= hour) return false;
    tx.set(ref, { attemptedHour: hour });
    return true;
  });
  if (!claimed) return { status: 'skipped' };
  const results = await Promise.allSettled([
    db.doc('internalAnalytics/liveKpis').get().then(snapshot => validateSnapshot(projectInvestorSnapshot(snapshot.data()), now)),
    readGeography(hour).then(value => validateGeography(value, now)),
  ]);
  const values = {};
  ['metrics', 'geography'].forEach((key, index) => {
    if (results[index].status === 'fulfilled') values[key] = results[index].value;
  });
  if (!Object.keys(values).length) return { status: 'failed', metrics: false, geography: false };
  const response = await fetcher(url.href, {
    method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(values), signal: AbortSignal.timeout(20000), redirect: 'error',
  });
  if (!response.ok) throw new Error(`Snapshot publication failed (${response.status})`);
  return { status: 'published', metrics: !!values.metrics, geography: !!values.geography };
}
