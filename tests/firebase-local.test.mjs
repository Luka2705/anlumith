import test from 'node:test';
import assert from 'node:assert/strict';
import { readFirebaseMetrics, SNAPSHOT_FIELDS } from '../server/firebase-metrics.js';
import { Readable } from 'node:stream';
import { createContactTransport } from '../server/contact-mail.js';
import { createLocalApi } from '../server/local-api.js';

const time = Date.now() - 3600000;
const count = integerValue => ({ integerValue: String(integerValue) });
const map = fields => ({ mapValue: { fields } });
const period = map({ newUsers: count(5), activeUsers: count(3), posts: count(4) });
const fixture = { fields: {
  schemaVersion: count(1), cacheVersion: count(6), registrationSource: { stringValue: 'firebase-auth' },
  generatedAt: count(time), totalUsers: count(100), current: period,
  authActivity: map({ users24h: count(9), periods: map({ days: count(10), weeks: count(20), months: count(30) }) }),
  history: map({ totals: map({ days: period, weeks: period, months: period }) }),
  growth: map({ newUsers: { doubleValue: 51.5 } }),
} };
test('Firestore reader authenticates server-side, masks private fields and projects canonical totals', async () => {
  let called = false;
  const result = await readFirebaseMetrics({ projectId: 'echo-ee3bf', getAccessToken: async () => 'test-only-token', fetcher: async (url, options) => {
    called = true;
    assert.equal(url.hostname, 'firestore.googleapis.com');
    assert.equal(url.pathname, '/v1/projects/echo-ee3bf/databases/(default)/documents/internalAnalytics/liveKpis');
    assert.deepEqual(url.searchParams.getAll('mask.fieldPaths'), SNAPSHOT_FIELDS);
    assert.ok(!SNAPSHOT_FIELDS.some(field => /detail|userId|email/i.test(field)));
    assert.equal(options.headers.Authorization, 'Bearer test-only-token');
    return Response.json(fixture);
  } });
  assert.equal(called, true); assert.equal(result.source, 'firebase');
  assert.equal(result.generatedAt, time); assert.equal(result.totalUsers, 100);
  assert.deepEqual(result.periods['3m'], { newUsers: 5, activeUsers: 30, contributors: 3, sharedSongs: 4 });
  assert.equal(JSON.stringify(result).includes('test-only-token'), false);
});
test('Firestore reader rejects unauthorized, malformed and incomplete responses', async () => {
  const base = { projectId: 'echo-ee3bf', getAccessToken: async () => 'test' };
  await assert.rejects(readFirebaseMetrics({ ...base, fetcher: async () => new Response('', { status: 403 }) }));
  await assert.rejects(readFirebaseMetrics({ ...base, fetcher: async () => Response.json({ fields: {} }) }));
  await assert.rejects(readFirebaseMetrics({ ...base, projectId: '../other' }));
});
function invoke(handler, overrides = {}) {
  return new Promise((resolve, reject) => {
    const response = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(body) { resolve({ status: this.statusCode, headers: this.headers, body: JSON.parse(body) }); } };
    handler(overrides instanceof Readable ? overrides : { url: '/metrics', method: 'GET', headers: { host: '127.0.0.1:4173' }, ...overrides }, response).catch(reject);
  });
}
test('local API coalesces requests, caches briefly, refreshes, and rejects cross-origin access', async () => {
  let calls = 0, clock = 1000;
  const handler = createLocalApi({ configuration: { localMetricsSource: 'firebase-cli', firebaseProjectId: 'echo-ee3bf' }, clock: () => clock,
    readMetrics: async options => { calls++; assert.equal(options.projectId, 'echo-ee3bf'); return { source: 'firebase', generatedAt: time }; } });
  const results = await Promise.all([invoke(handler), invoke(handler)]);
  assert.equal(calls, 1); assert.equal(results[0].status, 200); assert.equal(results[1].status, 200);
  await invoke(handler); assert.equal(calls, 1);
  clock += 60001; await invoke(handler); assert.equal(calls, 2);
  assert.equal((await invoke(handler, { headers: { host: 'evil.test' } })).status, 403);
  assert.equal((await invoke(handler, { headers: { host: 'localhost:4173', origin: 'https://evil.test' } })).status, 403);
  assert.equal((await invoke(handler, { method: 'POST' })).status, 405);
  assert.equal((await invoke(handler, { url: '/contact' })).status, 405);
  const failed = createLocalApi({ configuration: { localMetricsSource: 'firebase-cli' }, readMetrics: async () => { throw new Error('PRIVATE CREDENTIAL DETAILS'); } });
  const result = await invoke(failed); assert.equal(result.status, 503); assert.equal(JSON.stringify(result).includes('PRIVATE'), false);
});

const inquiry = { name: 'Test Investor', email: 'investor@example.org', organization: 'Example', message: 'Deck request content', locale: 'de', consent: true };
function contactRequest(body = inquiry, origin = 'http://127.0.0.1:4173') {
  return Object.assign(Readable.from([Buffer.from(JSON.stringify(body))]), { url: '/contact', method: 'POST',
    headers: { host: '127.0.0.1:4173', origin, 'content-type': 'application/json' } });
}
test('local contact delivers validated form content and reports failure without false success', async () => {
  let received;
  const handler = createLocalApi({ configuration: { localContactSource: 'firebase-cli', firebaseProjectId: 'echo-ee3bf' },
    sendMail: async value => { received = value; } });
  assert.equal((await invoke(handler, contactRequest({ ...inquiry, website: 'spam' }))).status, 400);
  assert.equal(received, undefined);
  assert.equal((await invoke(handler, contactRequest(inquiry, 'https://evil.test'))).status, 403);
  const response = await invoke(handler, contactRequest());
  assert.deepEqual(response.body, { ok: true });
  assert.deepEqual(received, { projectId: 'echo-ee3bf', inquiry });
  const failed = createLocalApi({ configuration: { localContactSource: 'firebase-cli' }, sendMail: async () => { throw new Error('PRIVATE'); } });
  assert.deepEqual((await invoke(failed, contactRequest())).body, { error: 'delivery_failed' });
  for (let i = 0; i < 4; i++) await invoke(handler, contactRequest());
  assert.equal((await invoke(handler, contactRequest())).status, 429);
});
test('mail transport fixes recipient, preserves content and requires SMTP acceptance', async () => {
  let sent;
  const mail = await createContactTransport({ projectId: 'echo-ee3bf', getAccessToken: async () => 'test-token',
    fetcher: async url => Response.json({ payload: { data: Buffer.from(url.includes('EMAIL_USER') ? 'sender@example.org' : 'test-password').toString('base64') } }),
    createTransport: () => ({ sendMail: async value => { sent = value; return { accepted: ['info@anlumith.com'] }; } }) });
  await mail.send({ ...inquiry, to: 'evil@example.org' });
  assert.equal(sent.to, 'info@anlumith.com');
  assert.equal(sent.replyTo, inquiry.email);
  for (const value of [inquiry.name, inquiry.email, inquiry.organization, inquiry.message]) assert.ok(sent.text.includes(value));
  const rejected = await createContactTransport({ projectId: 'echo-ee3bf', getAccessToken: async () => 'test',
    fetcher: async () => Response.json({ payload: { data: 'dGVzdA==' } }),
    createTransport: () => ({ sendMail: async () => ({ accepted: [] }) }) });
  await assert.rejects(rejected.send(inquiry));
});
