import { firebaseCliAccessToken } from './firebase-metrics.js';
import { aggregateSongGeography, GEO_HOUR, GEO_MAX_POSTS, GEO_WINDOW_HOURS, validateGeography } from '../src/investor/geography.js';

export const GEOGRAPHY_FIELDS = ['timestamp', 'location', 'isPublic'];
const PAGE_SIZE = 300;
function decodeLocation(value) {
  if (value?.geoPointValue) return value.geoPointValue;
  if (!value?.mapValue?.fields) return null;
  const result = {};
  for (const key of ['latitude', 'longitude', '_latitude', '_longitude']) {
    const field = value.mapValue.fields[key];
    if (field?.doubleValue !== undefined) result[key] = field.doubleValue;
    else if (field?.integerValue !== undefined) result[key] = Number(field.integerValue);
  }
  return result;
}

export async function readFirebaseGeography({ projectId, getAccessToken = firebaseCliAccessToken, fetcher = fetch, now = Date.now() }) {
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId || '') || !Number.isFinite(now)) throw new Error('Invalid Firebase project');
  const windowEnd = Math.floor(now / GEO_HOUR) * GEO_HOUR;
  const windowStart = windowEnd - GEO_WINDOW_HOURS * GEO_HOUR;
  const token = await getAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  let cursor, readTime;
  const posts = [];
  for (;;) {
    const structuredQuery = {
      select: { fields: GEOGRAPHY_FIELDS.map(fieldPath => ({ fieldPath })) },
      from: [{ collectionId: 'songs' }],
      where: { compositeFilter: { op: 'AND', filters: [
        { fieldFilter: { field: { fieldPath: 'isPublic' }, op: 'EQUAL', value: { booleanValue: true } } },
        { fieldFilter: { field: { fieldPath: 'timestamp' }, op: 'GREATER_THAN_OR_EQUAL', value: { timestampValue: new Date(windowStart).toISOString() } } },
        { fieldFilter: { field: { fieldPath: 'timestamp' }, op: 'LESS_THAN', value: { timestampValue: new Date(windowEnd).toISOString() } } },
      ] } },
      orderBy: [{ field: { fieldPath: 'timestamp' }, direction: 'DESCENDING' }, { field: { fieldPath: '__name__' }, direction: 'DESCENDING' }],
      limit: PAGE_SIZE, ...(cursor ? { startAt: { values: cursor, before: false } } : {}),
    };
    const response = await fetcher(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery, ...(readTime ? { readTime } : {}) }), signal: AbortSignal.timeout(15000), redirect: 'error' });
    if (!response.ok) throw new Error(`Geographic snapshot unavailable (${response.status})`);
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.some(row => row.error)) throw new Error('Invalid query response');
    readTime ||= rows.find(row => row.readTime)?.readTime;
    if (!readTime || !Number.isFinite(Date.parse(readTime))) throw new Error('Missing consistent query read time');
    const documents = rows.filter(row => row.document).map(row => row.document);
    for (const document of documents) {
      const fields = document.fields || {};
      posts.push({ isPublic: fields.isPublic?.booleanValue, timestamp: Date.parse(fields.timestamp?.timestampValue), location: decodeLocation(fields.location) });
    }
    if (posts.length > GEO_MAX_POSTS) throw new Error('Geographic safety limit exceeded');
    if (documents.length < PAGE_SIZE) break;
    const last = documents.at(-1);
    if (!last.name || !last.fields?.timestamp?.timestampValue) throw new Error('Invalid geographic cursor');
    const next = [{ timestampValue: last.fields.timestamp.timestampValue }, { referenceValue: last.name }];
    if (JSON.stringify(next) === JSON.stringify(cursor)) throw new Error('Repeated geographic cursor');
    cursor = next;
  }
  return validateGeography(aggregateSongGeography(posts, windowEnd), now);
}
