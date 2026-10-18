/** Deployment companion for the existing Echo backend; not deployed by Vite.
 * Copy into functions/src/services/investor/ in the Echo project.
 * Reuses Echo's hourly aggregation and existing Gmail secrets/mail transport.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import { getFirestore, Timestamp, FieldPath, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import * as nodemailer from 'nodemailer';
import { getSecret } from '../../utils/secrets';
import { analyticsRegion } from '../../config/functionRegions';
// @ts-ignore -- prepare-echo-backend.mjs generates this tested CommonJS companion.
import { projectInvestorSnapshot } from './investorProjection.cjs';
// @ts-ignore -- generated from the website's shared validator.
import { validateInquiry } from './contact-schema.cjs';
// @ts-ignore -- generated from the website's tested public geographic contract.
import { aggregateSongGeography, validateGeography, GEO_MAX_POSTS } from './geography.cjs';

const apiToken = defineSecret('INVESTOR_API_TOKEN');
// Owner-designated destination for every website inquiry; never read from a request.
const recipient = 'info@anlumith.com';
const approved = defineString('INVESTOR_METRIC_DEFINITIONS_APPROVED', { default: 'false' });
function authorized(header?: string) {
  const expected = apiToken.value();
  const presented = (header || '').replace(/^Bearer /, '');
  if (!expected || expected.length < 32 || !presented) return false;
  const hash = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(hash(expected), hash(presented));
}

export const investorMetrics = onRequest({ region: analyticsRegion, secrets: [apiToken], maxInstances: 2, timeoutSeconds: 20 }, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  if (!authorized(req.get('Authorization'))) { res.status(401).json({ error: 'unauthorized' }); return; }
  // Canonical contributors include comment likes. Require owner approval before publication.
  if (approved.value() !== 'true') { res.status(503).json({ error: 'definitions_not_approved' }); return; }
  try {
    const cache = (await getFirestore().doc('internalAnalytics/liveKpis').get()).data();
    res.json(projectInvestorSnapshot(cache));
  } catch { res.status(503).json({ error: 'snapshot_unavailable' }); }
});

export const investorContact = onRequest({ region: analyticsRegion, secrets: [apiToken], maxInstances: 2, timeoutSeconds: 30 }, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  if (!authorized(req.get('Authorization'))) { res.status(401).json({ error: 'unauthorized' }); return; }
  if (JSON.stringify(req.body ?? {}).length > 16000) { res.status(413).json({ error: 'too_large' }); return; }
  let inquiry: { name: string; email: string; organization: string; message: string; locale: string };
  try { inquiry = validateInquiry(req.body); } catch { res.status(400).json({ error: 'invalid_inquiry' }); return; }
  try {
    // Salted one-hour rate bucket. Store no plain IP or investor message in Firestore.
    const hour = Math.floor(Date.now() / 3600000);
    const clientIp = typeof req.body.clientIp === 'string' ? req.body.clientIp.slice(0, 100) : 'unknown';
    const key = createHash('sha256').update(`${apiToken.value()}:${hour}:${clientIp}`).digest('hex');
    const ref = getFirestore().doc(`investorInquiryLimits/${key}`);
    const allowed = await getFirestore().runTransaction(async tx => {
      const used = (await tx.get(ref)).data()?.count || 0;
      if (used >= 5) return false;
      tx.set(ref, { count: used + 1, expiresAt: new Date((hour + 2) * 3600000) }); return true;
    });
    if (!allowed) { res.status(429).json({ error: 'rate_limited' }); return; }
    const [user, pass] = await Promise.all([getSecret('EMAIL_USER'), getSecret('EMAIL_PASS')]);
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass }, connectionTimeout: 8000, socketTimeout: 10000 });
    await transporter.sendMail({ from: user, to: recipient, replyTo: inquiry.email,
      subject: 'echo music — Investor deck request',
      text: `Name: ${inquiry.name}\nEmail: ${inquiry.email}\nOrganization: ${inquiry.organization}\nLanguage: ${inquiry.locale}\nPrivacy acknowledged: yes\n\n${inquiry.message}` });
    res.json({ ok: true });
  } catch { res.status(503).json({ error: 'delivery_failed' }); }
});

let geographicCache: { windowEnd: number; promise: Promise<unknown> } | undefined;
async function loadGeography(windowEnd: number) {
  return getFirestore().runTransaction(async transaction => {
    const base = getFirestore().collection('songs').where('isPublic', '==', true)
      .where('timestamp', '>=', Timestamp.fromMillis(windowEnd - 72 * 3600000))
      .where('timestamp', '<', Timestamp.fromMillis(windowEnd))
      .orderBy('timestamp', 'desc').orderBy(FieldPath.documentId(), 'desc')
      .select('timestamp', 'location', 'isPublic');
    const posts: { isPublic: unknown; timestamp: number; location: unknown }[] = [];
    let cursor: QueryDocumentSnapshot | undefined;
    for (;;) {
      const page = await transaction.get(cursor ? base.startAfter(cursor).limit(300) : base.limit(300));
      for (const doc of page.docs) {
        const data = doc.data();
        posts.push({ isPublic: data.isPublic, timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toMillis() : NaN, location: data.location });
      }
      if (posts.length > GEO_MAX_POSTS) throw new Error('Geographic safety limit exceeded');
      if (page.size < 300) break;
      cursor = page.docs[page.size - 1];
    }
    return validateGeography(aggregateSongGeography(posts, windowEnd));
  }, { readOnly: true });
}

export const investorGeography = onRequest({ region: analyticsRegion, secrets: [apiToken], maxInstances: 2, timeoutSeconds: 60, memory: '256MiB' }, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  if (!authorized(req.get('Authorization'))) { res.status(401).json({ error: 'unauthorized' }); return; }
  const windowEnd = Math.floor(Date.now() / 3600000) * 3600000;
  try {
    if (geographicCache?.windowEnd !== windowEnd) geographicCache = { windowEnd, promise: loadGeography(windowEnd) };
    res.json(await geographicCache.promise);
  } catch {
    if (geographicCache?.windowEnd === windowEnd) geographicCache = undefined;
    res.status(503).json({ error: 'snapshot_unavailable' });
  }
});
