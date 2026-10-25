import { validateGeography } from '../src/investor/geography.js';
import { validateSnapshot } from '../src/investor/metrics.js';

const base = new URL(process.argv[2] || 'https://www.anlumith.com');
if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password) throw new Error('Expected a website URL without credentials');
for (const [path, validate] of [['/api/geography', validateGeography], ['/api/metrics', validateSnapshot]]) {
  try {
    const response = await fetch(new URL(path, base), { cache: 'no-store', signal: AbortSignal.timeout(75000) });
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error(`HTTP ${response.status}: no JSON API. Check that Cloudflare deployed the root functions/ directory.`);
    const body = await response.json();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${body.error === 'not_configured' ? 'The static snapshot route is not configured. See docs/PUBLIC-ECHO-SNAPSHOT.md.' : 'The public snapshot file is unavailable or invalid. No database fallback is used.'}`);
    const snapshot = validate(body);
    if (snapshot.source !== 'firebase' || !snapshot.generatedAt || Date.now() - snapshot.generatedAt > 2 * 3_600_000) throw new Error('API returned an overdue or non-Firebase snapshot. Check the upstream hourly refresh.');
    console.log(`${path}: OK — Firebase snapshot ${new Date(snapshot.generatedAt).toISOString()}`);
  } catch (error) {
    console.error(`${path}: FAILED — ${error.message}${error.cause?.code ? ` (${error.cause.code})` : ''}`);
    process.exitCode = 1;
  }
}
