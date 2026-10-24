/** #110 / anlumith#1. Only deploy this scheduled publisher; no public DB reader. */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret, defineString } from 'firebase-functions/params';
import { getFirestore, Timestamp, FieldPath } from 'firebase-admin/firestore';
// @ts-ignore -- staged runtime companion, generated from tested website sources.
import { publishWebsiteData, loadSongGeography } from './websitePublication.cjs';

const token = defineSecret('WEBSITE_PUBLISH_TOKEN');
const destination = defineString('WEBSITE_PUBLISH_URL');
const project = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT
  ?? JSON.parse(process.env.FIREBASE_CONFIG || '{}').projectId;

export const publishWebsiteSnapshots = onSchedule({
  schedule: '15 * * * *', timeZone: 'UTC',
  region: project === 'echo-ee3bf' ? 'europe-west1' : 'europe-west3',
  secrets: [token], maxInstances: 1, concurrency: 1, retryCount: 0,
  timeoutSeconds: 180, memory: '256MiB',
}, async () => {
  const db = getFirestore();
  const result = await publishWebsiteData({ db, destination: destination.value(), token: token.value(),
    readGeography: (hour: number) => loadSongGeography(db, hour, { Timestamp, FieldPath }) });
  if (result.status === 'failed' || result.metrics === false || result.geography === false)
    console.error('Website snapshot publication incomplete', result);
});
