import { validateSnapshot } from '../src/investor/metrics.js';
import { validateGeography } from '../src/investor/geography.js';
import { json } from './http.js';

export const validators = { metrics: validateSnapshot, geography: validateGeography };
export const MINUTE_LIMIT = 1000;
export const DAY_LIMIT = 100000;
const MINUTE = 60000, DAY = 86400000;

// One named Durable Object globally; public reads have no upstream or refresh path.
export class WebsiteSnapshots {
  constructor(state) { this.state = state; }

  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (request.method === 'PUT' && path === '/publish') {
      let values;
      try {
        const input = await request.json();
        values = Object.fromEntries(Object.entries(validators)
          .filter(([name]) => input[name] !== undefined)
          .map(([name, validate]) => [name, validate(input[name])]));
        if (!Object.keys(values).length) throw new Error('Empty publication');
      } catch { return json({ error: 'invalid_snapshot' }, 400); }
      await this.state.storage.transaction(async tx => {
        for (const [name, value] of Object.entries(values)) {
          const previous = await tx.get(`snapshot:${name}`);
          // A replay or delayed publisher cannot replace a confirmed version.
          if (!previous || value.generatedAt > previous.generatedAt) await tx.put(`snapshot:${name}`, value);
        }
      });
      return json({ ok: true });
    }
    const name = path.slice(1);
    if (request.method !== 'GET' || !Object.hasOwn(validators, name)) return json({ error: 'not_found' }, 404);
    const now = Date.now(), minute = Math.floor(now / MINUTE), day = Math.floor(now / DAY);
    const allowed = await this.state.storage.transaction(async tx => {
      const quota = await tx.get('quota') || {};
      const minuteCount = quota.minute === minute ? quota.minuteCount : 0;
      const dayCount = quota.day === day ? quota.dayCount : 0;
      if (dayCount >= DAY_LIMIT) return { ok: false, retry: Math.ceil(((day + 1) * DAY - now) / 1000) };
      if (minuteCount >= MINUTE_LIMIT) return { ok: false, retry: Math.ceil(((minute + 1) * MINUTE - now) / 1000) };
      await tx.put('quota', { minute, minuteCount: minuteCount + 1, day, dayCount: dayCount + 1 });
      return { ok: true };
    });
    if (!allowed.ok) return json({ error: 'rate_limited' }, 429, { 'Retry-After': String(allowed.retry) });
    const snapshot = await this.state.storage.get(`snapshot:${name}`);
    if (!snapshot) return json({ error: 'snapshot_unavailable' }, 503, { 'Retry-After': '3600' });
    return json(snapshot, 200, { 'Cache-Control': 'public, max-age=60, s-maxage=300' });
  }
}

export function snapshotStore(env) {
  return env.WEBSITE_SNAPSHOTS.get(env.WEBSITE_SNAPSHOTS.idFromName('public-v1'));
}

export async function serveSnapshot({ env, request }, name) {
  if (!env.WEBSITE_SNAPSHOTS || !env.PUBLIC_DATA_LIMITER) return json({ error: 'not_configured' }, 503);
  // CF overwrites this header at ingress; never use client-supplied X-Forwarded-For.
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) return json({ error: 'unavailable' }, 503);
  try {
    const key = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip))))
      .map(byte => byte.toString(16).padStart(2, '0')).join('');
    if (!(await env.PUBLIC_DATA_LIMITER.limit({ key })).success)
      return json({ error: 'rate_limited' }, 429, { 'Retry-After': '60' });
    return await snapshotStore(env).fetch(new Request(`https://snapshots/${name}`));
  } catch { return json({ error: 'unavailable' }, 503); }
}

async function authorized(request, token) {
  if (typeof token !== 'string' || token.length < 32) return false;
  const supplied = request.headers.get('Authorization') || '';
  if (supplied.length > 1024) return false;
  // HMAC verification uses the runtime's constant-time verification primitive.
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(token), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const message = new TextEncoder().encode('website-snapshot-publication-v1');
  const presentedKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(supplied.slice(7) || 'invalid'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const presented = await crypto.subtle.sign('HMAC', presentedKey, message);
  return supplied.startsWith('Bearer ') && crypto.subtle.verify('HMAC', key, presented, message);
}

export async function publishSnapshots(request, env) {
  if (request.method !== 'PUT') return json({ error: 'method_not_allowed' }, 405, { Allow: 'PUT' });
  if (!env.WEBSITE_SNAPSHOTS || !env.WEBSITE_PUBLISH_TOKEN) return json({ error: 'not_configured' }, 503);
  if (!await authorized(request, env.WEBSITE_PUBLISH_TOKEN)) return json({ error: 'unauthorized' }, 401);
  // Enforce actual bytes, including chunked bodies. Do not trust Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return json({ error: 'invalid_snapshot' }, 400);
  let length = 0; const chunks = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 2097152) { await reader.cancel(); return json({ error: 'too_large' }, 413); }
      chunks.push(value);
    }
    return await snapshotStore(env).fetch(new Request('https://snapshots/publish', { method: 'PUT', body: new Blob(chunks) }));
  } catch { return json({ error: 'unavailable' }, 503); }
}
