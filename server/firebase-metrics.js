import { existsSync, realpathSync } from 'node:fs';
import { dirname, delimiter, join } from 'node:path';
import { createRequire } from 'node:module';
import { projectInvestorSnapshot } from '../integrations/firebase/investorProjection.mjs';
import { validateSnapshot } from '../src/investor/metrics.js';

// Read only aggregate fields. Never download the cache's admin detail pages,
// user identifiers, profiles, email addresses or other private collections.
export const SNAPSHOT_FIELDS = [
  'schemaVersion', 'cacheVersion', 'registrationSource', 'generatedAt', 'totalUsers',
  'current.newUsers', 'current.activeUsers', 'current.posts',
  'authActivity.users24h', 'authActivity.periods', 'history.totals', 'growth.newUsers',
];

export function decodeFirestoreValue(value) {
  if ('integerValue' in value) {
    const number = Number(value.integerValue);
    if (!Number.isSafeInteger(number)) throw new Error('Invalid Firestore integer');
    return number;
  }
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, entry]) => [key, decodeFirestoreValue(entry)]));
  throw new Error('Unsupported metric field');
}

let firebaseAuth;
export async function firebaseCliAccessToken() {
  if (!firebaseAuth) {
    const binary = (process.env.PATH || '').split(delimiter).map(directory => join(directory, 'firebase')).find(file => existsSync(file));
    if (!binary) throw new Error('Firebase CLI is not installed');
    // Resolve the installed CLI, rather than copying credentials or relying on
    // a machine-specific path. This module is server-only and never bundled.
    const cliDirectory = dirname(realpathSync(binary));
    firebaseAuth = createRequire(import.meta.url)(join(cliDirectory, '..', 'auth.js'));
  }
  const account = firebaseAuth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) throw new Error('Firebase CLI login is required');
  const tokens = await firebaseAuth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
  if (!tokens?.access_token) throw new Error('Firebase access is unavailable');
  return tokens.access_token;
}

export async function readFirebaseMetrics({ projectId, getAccessToken = firebaseCliAccessToken, fetcher = fetch }) {
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId || '')) throw new Error('Invalid Firebase project');
  const url = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/internalAnalytics/liveKpis`);
  for (const field of SNAPSHOT_FIELDS) url.searchParams.append('mask.fieldPaths', field);
  const token = await getAccessToken();
  const response = await fetcher(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000), redirect: 'error' });
  if (!response.ok) throw new Error(`Firebase snapshot unavailable (${response.status})`);
  const document = await response.json();
  if (!document.fields || typeof document.fields !== 'object') throw new Error('Missing Firebase snapshot');
  const cache = Object.fromEntries(Object.entries(document.fields).map(([key, value]) => [key, decodeFirestoreValue(value)]));
  return validateSnapshot(projectInvestorSnapshot(cache));
}
