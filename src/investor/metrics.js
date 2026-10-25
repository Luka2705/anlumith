export const PERIODS = ['24h', '7d', '4w', '3m'];
export const METRICS = ['newUsers', 'activeUsers', 'contributors', 'sharedSongs'];
export const HOUR = 3_600_000;
// Owner-supplied analytics snapshot. Capture time was not supplied.
export const historicalSnapshot = {
  schemaVersion: 1, source: 'historical', generatedAt: null,
  definition: 'supplied-post-rating-comment', totalUsers: 27815,
  periods: {
    '24h': { newUsers: 353, activeUsers: 418, contributors: 164, sharedSongs: 168 },
    '7d': { newUsers: 1566, activeUsers: 1776, contributors: 683, sharedSongs: 744 },
    '4w': { newUsers: 4412, activeUsers: 4878, contributors: 1939, sharedSongs: 2286 },
    '3m': { newUsers: 12570, activeUsers: 13299, contributors: 5198, sharedSongs: 6112 },
  }, growth24h: 51.5,
};
// Empty first render: numbers only become visible after a valid public file.
export const unavailableSnapshot = {
  source: 'unavailable', generatedAt: null, totalUsers: null, growth24h: null,
  periods: Object.fromEntries(PERIODS.map(period => [period, Object.fromEntries(METRICS.map(key => [key, null]))])),
};
const count = value => Number.isSafeInteger(value) && value >= 0;
export function validateSnapshot(value, now = Date.now()) {
  if (!value || value.schemaVersion !== 1 || value.source !== 'firebase' ||
      !Number.isSafeInteger(value.generatedAt) || value.generatedAt <= 0 || value.generatedAt > now ||
      value.definition !== 'canonical-includes-comment-likes' || !count(value.totalUsers)) throw new Error('Invalid metrics snapshot');
  const periods = {};
  for (const period of PERIODS) {
    const row = value.periods?.[period];
    if (!row || METRICS.some(key => !count(row[key]))) throw new Error('Invalid metric period');
    periods[period] = Object.fromEntries(METRICS.map(key => [key, row[key]]));
  }
  return { schemaVersion: 1, source: 'firebase', generatedAt: value.generatedAt,
    definition: value.definition, totalUsers: value.totalUsers, periods,
    growth24h: Number.isFinite(value.growth24h) ? value.growth24h : null };
}
export function snapshotState(snapshot, now = Date.now()) {
  if (snapshot.source === 'unavailable') return 'unavailable';
  return snapshot.source !== 'firebase' ? 'historical' : now - snapshot.generatedAt > 2 * HOUR ? 'stale' : 'live';
}
