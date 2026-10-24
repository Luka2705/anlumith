import test from 'node:test';
import assert from 'node:assert/strict';
import { historicalSnapshot as snapshot, validateSnapshot, snapshotState, HOUR, METRICS } from '../src/investor/metrics.js';
import { projectInvestorSnapshot } from '../integrations/firebase/investorProjection.mjs';
import { validateInquiry } from '../src/investor/contact-schema.js';
import { en, de, es } from '../src/investor/translations.js';
import { handleMetrics, onRequest as metricsRoute } from '../functions/api/metrics.js';
import { handleContact, onRequest as contactRoute } from '../functions/api/contact.js';

test('all supplied figures and unknown capture time remain exact', () => {
  assert.equal(snapshot.totalUsers, 27815); assert.equal(snapshot.generatedAt, null); assert.equal(snapshot.growth24h, 51.5);
  assert.deepEqual(Object.values(snapshot.periods).map(row => METRICS.map(key => row[key])), [[353,418,164,168],[1566,1776,683,744],[4412,4878,1939,2286],[12570,13299,5198,6112]]);
  assert.equal(snapshotState(snapshot), 'historical');
});
const now = Date.now();
const live = { ...snapshot, source: 'firebase', generatedAt: now - HOUR, definition: 'canonical-includes-comment-likes' };
test('live validation rejects missing, future and invalid values, strips unexpected data', () => {
  assert.throws(() => validateSnapshot(snapshot));
  assert.throws(() => validateSnapshot({ ...live, generatedAt: now + HOUR }, now));
  assert.throws(() => validateSnapshot({ ...live, periods: { ...live.periods, '7d': { newUsers: -1 } } }));
  assert.throws(() => validateSnapshot({ ...live, definition: 'unknown' }));
  assert.equal(validateSnapshot({ ...live, emails: ['private'], periods: { ...live.periods, '24h': { ...live.periods['24h'], userIds: ['private'] } } }).emails, undefined);
  assert.deepEqual(Object.keys(validateSnapshot(live).periods['24h']), METRICS);
  assert.equal(snapshotState(live, now), 'live');
  assert.equal(snapshotState({ ...live, generatedAt: now - 3 * HOUR }, now), 'stale');
});
test('canonical cache maps auth activity and contributors separately without new aggregation', () => {
  const row = { newUsers: 5, activeUsers: 3, posts: 4 };
  const cache = { schemaVersion: 1, cacheVersion: 6, registrationSource: 'firebase-auth', generatedAt: now, totalUsers: 100,
    current: row, history: { totals: { days: row, weeks: row, months: row } }, authActivity: { users24h: 8, periods: { days: 9, weeks: 10, months: 11 } },
    growth: { newUsers: 51.5 }, details: { emails: ['private'] }, profileUsers: 999 };
  const result = projectInvestorSnapshot(cache);
  assert.equal(result.periods['24h'].activeUsers, 8); assert.equal(result.periods['24h'].contributors, 3);
  assert.equal(result.periods['3m'].activeUsers, 11); assert.equal(result.details, undefined);
  assert.equal(result.profileUsers, undefined); assert.equal(result.totalUsers, 100);
  validateSnapshot(result);
  assert.throws(() => projectInvestorSnapshot({ ...cache, history: undefined }));
  assert.throws(() => projectInvestorSnapshot({ ...cache, cacheVersion: 5 }));
});
function leaves(value, path = '') { return Object.entries(value).flatMap(([key, entry]) => typeof entry === 'object' ? leaves(entry, `${path}${key}.`) : [`${path}${key}`]).sort(); }
test('all locales have identical complete keys, placeholders and valid formatted numbers', () => {
  for (const translation of [de, es]) {
    assert.deepEqual(leaves(translation), leaves(en));
    for (const key of Object.keys(en)) if (typeof en[key] === 'string') {
      assert.ok(translation[key].trim(), key);
      assert.deepEqual(translation[key].match(/\{\{\w+\}\}/g) || [], en[key].match(/\{\{\w+\}\}/g) || [], key);
    }
  }
  assert.equal(new Intl.NumberFormat('en', { useGrouping: 'always' }).format(27815), '27,815');
  for (const locale of ['de', 'es']) assert.equal(new Intl.NumberFormat(locale, { useGrouping: 'always' }).format(5198), '5.198');
});
const inquiry = { name: 'Test Investor', email: 'investor@example.org', organization: 'Test', message: 'Request a deck', consent: 'on', locale: 'en' };
test('contact validation rejects malformed input and header injection', () => {
  assert.equal(validateInquiry(inquiry).email, inquiry.email);
  for (const invalid of [{ name: ' ' }, { email: 'x' }, { email: 'a@b.de\r\nBcc:x@y.de' }, { consent: false }, { locale: 'fr' }, { message: 'x'.repeat(3001) }]) assert.throws(() => validateInquiry({ ...inquiry, ...invalid }));
  assert.equal(validateInquiry({ ...inquiry, apiKey: 'private' }).apiKey, undefined);
});
const environment = { ECHO_METRICS_URL: 'https://example.org/metrics', ECHO_CONTACT_URL: 'https://example.org/contact', ECHO_API_TOKEN: 'server-secret' };
test('metrics route fails closed without a snapshot binding and rejects mutations', async () => {
  assert.equal((await handleMetrics({ env: {} })).status, 503);
  assert.equal((await metricsRoute({ request: new Request('https://site.test/api/metrics', { method: 'POST' }) })).status, 405);
});
const context = (body = inquiry, headers = {}, env = environment) => ({ env, request: new Request('https://site.test/api/contact', { method: 'POST', headers: { Origin: 'https://site.test', 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }) });
test('contact proxy validates origin, payload, availability and confirmed delivery', async () => {
  assert.equal((await handleContact(context(inquiry, { Origin: 'https://evil.test' }))).status, 403);
  assert.equal((await handleContact(context({ ...inquiry, website: 'spam' }))).status, 400);
  assert.equal((await handleContact(context({ ...inquiry, email: 'bad' }))).status, 400);
  assert.equal((await handleContact(context(inquiry, {}, {}))).status, 503);
  assert.equal((await handleContact(context({ ...inquiry, message: 'x'.repeat(17000) }))).status, 413);
  const result = await handleContact(context(), async (url, options) => {
    const body = JSON.parse(options.body); assert.equal(body.email, inquiry.email); assert.equal(body.startedAt, undefined);
    return Response.json({ ok: true, secret: 'not-public' });
  });
  assert.deepEqual(await result.json(), { ok: true });
  assert.equal((await handleContact(context(), async () => Response.json({ ok: false }))).status, 503);
  assert.equal((await handleContact(context(), async () => Response.json({}, { status: 429 }))).status, 429);
  assert.equal((await contactRoute({ request: new Request('https://site.test/api/contact') })).status, 405);
});
