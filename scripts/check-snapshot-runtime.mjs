import assert from 'node:assert/strict';
import { historicalSnapshot } from '../src/investor/metrics.js';
import { aggregateSongGeography } from '../src/investor/geography.js';

// Local runtime verification only: never publish fixtures or generate load live.
const origin = 'http://127.0.0.1:8791';
const hour = Math.floor(Date.now() / 3600000) * 3600000;
const metrics = { ...historicalSnapshot, source: 'firebase', definition: 'canonical-includes-comment-likes', generatedAt: hour };
const geography = aggregateSongGeography([], hour);
const publication = { method: 'PUT', headers: { Authorization: 'Bearer test-only-runtime-secret-1234567890', 'Content-Type': 'application/json' }, body: JSON.stringify({ metrics, geography }) };
assert.equal((await fetch(`${origin}/api/internal/snapshots`, { ...publication, headers: {} })).status, 401);
assert.equal((await fetch(`${origin}/api/internal/snapshots`, publication)).status, 200);
for (const name of ['metrics', 'geography']) {
  const response = await fetch(`${origin}/api/${name}`, { headers: { 'CF-Connecting-IP': '192.0.2.70' } });
  assert.equal(response.status, 200); assert.equal((await response.json()).generatedAt, hour);
}
const statuses = {};
for (let i = 0; i < 40; i++) {
  const response = await fetch(`${origin}/api/metrics`, { headers: { 'CF-Connecting-IP': '192.0.2.71' } });
  statuses[response.status] = (statuses[response.status] || 0) + 1;
  if (response.status === 429) assert.equal(response.headers.get('Retry-After'), '60');
  else assert.equal(response.status, 200);
}
assert.ok(statuses[429] > 0, 'Runtime rate limiter did not reject excess requests');
assert.equal((await fetch(`${origin}/de`)).status, 200);
assert.equal((await fetch(`${origin}/maps/world-land.geojson`)).status, 200);
console.log('Runtime authentication, durable publication, schemas, 429 limits, pages and map passed.', statuses);
