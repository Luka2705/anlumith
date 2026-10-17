// Copy alongside investorWebsite.ts into Echo functions/src/services/investor/.
// This projects the existing hourly cache. It never reads raw user collections.
const count = value => Number.isSafeInteger(value) && value >= 0;
export function projectInvestorSnapshot(cache) {
  if (!cache || cache.schemaVersion !== 1 || cache.cacheVersion < 6 || cache.registrationSource !== 'firebase-auth') throw new Error('Incompatible cache');
  if (!Number.isSafeInteger(cache.generatedAt) || cache.generatedAt <= 0 || cache.generatedAt > Date.now() || !count(cache.totalUsers)) throw new Error('Invalid cache');
  function period(value, activeUsers) {
    const row = { newUsers: value?.newUsers, activeUsers, contributors: value?.activeUsers, sharedSongs: value?.posts };
    if (Object.values(row).some(value => !count(value))) throw new Error('Incomplete cache');
    return row;
  }
  return { schemaVersion: 1, source: 'firebase', definition: 'canonical-includes-comment-likes',
    generatedAt: cache.generatedAt, totalUsers: cache.totalUsers,
    periods: { '24h': period(cache.current, cache.authActivity?.users24h),
      '7d': period(cache.history?.totals?.days, cache.authActivity?.periods?.days),
      '4w': period(cache.history?.totals?.weeks, cache.authActivity?.periods?.weeks),
      '3m': period(cache.history?.totals?.months, cache.authActivity?.periods?.months) },
    growth24h: Number.isFinite(cache.growth?.newUsers) ? cache.growth.newUsers : null };
}
