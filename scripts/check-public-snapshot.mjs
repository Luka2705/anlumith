import { readPublicSnapshot, PUBLIC_SNAPSHOT_URL } from '../src/investor/public-snapshot.js';
const value = await readPublicSnapshot();
if (Date.now() - value.generatedAt > 2 * 3_600_000) throw new Error('Public snapshot is overdue');
console.log(JSON.stringify({ source: PUBLIC_SNAPSHOT_URL, generatedAt: new Date(value.generatedAt).toISOString(),
  totalUsers: value.metrics.totalUsers, mapCells: value.geography.cells.length, publicPosts72h: value.geography.publicSongPosts }));
