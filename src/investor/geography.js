export const GEO_HOUR = 3_600_000;
export const GEO_WINDOW_HOURS = 72;
export const GEO_GRID_DEGREES = 1;
export const GEO_MAX_POSTS = 20000;

export function songCoordinates(location) {
  if (!location || typeof location !== 'object') return null;
  const latitude = location.latitude ?? location._latitude;
  const longitude = location.longitude ?? location._longitude;
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

// Fixed grid centres never reveal a singleton's original GPS position. Posts
// in the same region are counted together, not discarded or randomly spread.
export function aggregateSongGeography(posts, windowEnd) {
  if (!Number.isSafeInteger(windowEnd) || windowEnd <= 0 || posts.length > GEO_MAX_POSTS) throw new Error('Invalid geographic window');
  const windowStart = windowEnd - GEO_WINDOW_HOURS * GEO_HOUR;
  const cells = new Map();
  let publicSongPosts = 0, locatedSongPosts = 0;
  for (const post of posts) {
    if (post.isPublic !== true || !Number.isFinite(post.timestamp) || post.timestamp < windowStart || post.timestamp >= windowEnd) continue;
    publicSongPosts++;
    const coordinates = songCoordinates(post.location);
    if (!coordinates) continue;
    locatedSongPosts++;
    const latitude = Math.min(89, Math.floor(coordinates.latitude)) + 0.5;
    const longitude = Math.floor(coordinates.longitude === 180 ? -180 : coordinates.longitude) + 0.5;
    const key = `${latitude}:${longitude}`;
    const existing = cells.get(key);
    if (existing) existing.songPosts++;
    else cells.set(key, { latitude, longitude, songPosts: 1 });
  }
  return { schemaVersion: 1, source: 'firebase', generatedAt: windowEnd, windowStart, windowEnd,
    windowHours: GEO_WINDOW_HOURS, precisionDegrees: GEO_GRID_DEGREES, publicSongPosts, locatedSongPosts,
    unlocatedSongPosts: publicSongPosts - locatedSongPosts,
    cells: [...cells.values()].sort((a, b) => a.longitude - b.longitude || a.latitude - b.latitude) };
}

export function validateGeography(value, now = Date.now()) {
  const count = number => Number.isSafeInteger(number) && number >= 0;
  if (!value || value.schemaVersion !== 1 || value.source !== 'firebase' || value.windowHours !== GEO_WINDOW_HOURS || value.precisionDegrees !== GEO_GRID_DEGREES ||
      !Number.isSafeInteger(value.generatedAt) || value.generatedAt <= 0 || value.generatedAt > now || value.windowEnd !== value.generatedAt ||
      value.windowStart !== value.windowEnd - GEO_WINDOW_HOURS * GEO_HOUR ||
      !count(value.publicSongPosts) || value.publicSongPosts > GEO_MAX_POSTS || !count(value.locatedSongPosts) || !count(value.unlocatedSongPosts) ||
      value.locatedSongPosts + value.unlocatedSongPosts !== value.publicSongPosts || !Array.isArray(value.cells) || value.cells.length > value.locatedSongPosts) throw new Error('Invalid geographic snapshot');
  const keys = new Set(); let total = 0;
  const cells = value.cells.map(cell => {
    if (!songCoordinates(cell) || Math.abs(cell.latitude) > 89.5 || Math.abs(cell.longitude) > 179.5 ||
        !Number.isInteger(cell.latitude - 0.5) || !Number.isInteger(cell.longitude - 0.5) || !count(cell.songPosts) || cell.songPosts < 1) throw new Error('Invalid geographic cell');
    const key = `${cell.latitude}:${cell.longitude}`;
    if (keys.has(key)) throw new Error('Duplicate geographic cell'); keys.add(key); total += cell.songPosts;
    return { latitude: cell.latitude, longitude: cell.longitude, songPosts: cell.songPosts };
  });
  if (total !== value.locatedSongPosts) throw new Error('Incomplete geographic snapshot');
  return { schemaVersion: 1, source: 'firebase', generatedAt: value.generatedAt, windowStart: value.windowStart, windowEnd: value.windowEnd,
    windowHours: GEO_WINDOW_HOURS, precisionDegrees: GEO_GRID_DEGREES, publicSongPosts: value.publicSongPosts,
    locatedSongPosts: value.locatedSongPosts, unlocatedSongPosts: value.unlocatedSongPosts, cells };
}
