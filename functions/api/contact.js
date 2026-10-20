import { validateInquiry } from '../../src/investor/contact-schema.js';
import { backendUrl, json } from '../../server/http.js';

export async function handleContact({ request, env }, fetcher = fetch, deliver) {
  const origin = new URL(request.url).origin;
  if (request.headers.get('Origin') !== origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') return json({ error: 'forbidden' }, 403);
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'invalid_content_type' }, 415);
  // Bound the stream before parsing, even when Content-Length is absent or dishonest.
  let input;
  try {
    const reader = request.body?.getReader(); if (!reader) return json({ error: 'invalid_inquiry' }, 400);
    const chunks = []; let length = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; length += value.byteLength;
      if (length > 16000) { await reader.cancel(); return json({ error: 'too_large' }, 413); } chunks.push(value); }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    input = JSON.parse(new TextDecoder().decode(bytes));
  } catch { return json({ error: 'invalid_inquiry' }, 400); }
  if (input?.website) return json({ error: 'invalid_inquiry' }, 400);
  let inquiry;
  try { inquiry = validateInquiry(input); } catch { return json({ error: 'invalid_inquiry' }, 400); }
  if (deliver) {
    try { await deliver(inquiry); return json({ ok: true }); }
    catch { return json({ error: 'delivery_failed' }, 503); }
  }
  if (!env.ECHO_CONTACT_URL || !env.ECHO_API_TOKEN) return json({ error: 'not_configured' }, 503);
  try {
    const response = await fetcher(backendUrl(env.ECHO_CONTACT_URL), { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.ECHO_API_TOKEN}` },
      body: JSON.stringify({ ...inquiry, clientIp: request.headers.get('CF-Connecting-IP') || 'unknown' }),
      signal: AbortSignal.timeout(12000), redirect: 'error' });
    if (!response.ok) return json({ error: 'delivery_failed' }, response.status === 429 ? 429 : 503);
    const result = await response.json();
    if (result.ok !== true) return json({ error: 'delivery_failed' }, 503);
    return json({ ok: true });
  } catch { return json({ error: 'delivery_failed' }, 503); }
}
export const onRequest = context => context.request.method === 'POST' ? handleContact(context) : json({ error: 'method_not_allowed' }, 405, { Allow: 'POST' });
