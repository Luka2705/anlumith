# Hosted data snapshots (anlumith#1, echo#110)

The Worker serves `/api/metrics` and `/api/geography` from one named SQLite
Durable Object, `public-v1`. These public handlers have no Firebase URL, token,
refresh action or outbound fetch. Empty storage returns 503; query strings and
browser refreshes cannot trigger source reads. API schemas and the existing
historical/stale UI are unchanged.

`publishWebsiteSnapshots`, a Firebase Scheduler function, runs at minute 15 of
each UTC hour. It projects the existing `internalAnalytics/liveKpis` document;
it never recalculates analytics. It reads the canonical public songs in the
previous 72 hours using consistent pagination and only timestamp, location and
public status. The existing 1-degree aggregation and validators are reused.
At most 20,001 song documents are read per attempt (the last detects overflow;
index-entry charges may also apply). Over-limit or failed reads publish no
partial map. Metric and map failures are independent.

Before reading sources the job transactionally claims
`internalAnalytics/websitePublication.attemptedHour`. Concurrent runs,
redelivery, instance restart and failed delivery cannot repeat source reads in
that hour. This intentionally limits retries to the next hour. Scheduler retry
count is zero; instance/concurrency limits are one. Normal deployment uses only
the new scheduled function, with no public HTTP database reader. Do not change
Firestore rules or the existing analytics job. The new internal marker remains
unreadable to website clients.

The authenticated PUT `/api/internal/snapshots` validates and whitelists data
again. Payloads above 2 MiB are rejected, including chunked bodies. Storage
updates are transactional and monotonic per dataset; equal/older timestamps
cannot overwrite confirmed data. Failed or partial publications retain the
last confirmed snapshot and its original timestamp. The browser already marks
snapshots older than two hours as overdue. A restart preserves both snapshots
and global quotas.

## Request limits and remaining costs

- Cloudflare's rate-limit binding allows 30 GETs per IP per 60 seconds, shared
  across both APIs. It is approximate per Cloudflare location. Only a SHA-256
  digest of the trusted `CF-Connecting-IP` is used as the limiter key; no raw IP
  is stored in snapshot storage. Missing/failed bindings fail closed.
- The single Durable Object enforces a strict shared limit of 1,000 accepted
  data requests per UTC minute and 100,000 per UTC day. Quotas are persisted
  atomically before reading a snapshot. Rejections return 429 and Retry-After.
  Exhausting a global limit also limits legitimate visitors until reset;
  static pages, map geometry and authenticated publication remain available.
- These limits bound accepted data work and source scans, not total Cloudflare
  invocation/bandwidth charges. Rejected traffic still reaches Cloudflare;
  billing alerts and provider-level abuse controls remain useful. No claim of
  a hard monetary cap is made.
- Public GETs are cacheable for 60 seconds in browsers and 300 seconds at an
  explicitly configured intermediary. Correctness and Firebase cost protection
  do not depend on cache hits. Never cache the internal publication endpoint.

## Deploy and bootstrap

Use Node 22, the lockfiles, and a clean checkout of `main`. The existing
`npm run build:production` check can fail on unresolved legal fields; do not
invent values or remove draft/noindex protection to make it pass. The normal
`npm run build` remains available for the existing draft site.

1. Build/test the website. Deploy the Worker with `npm exec wrangler deploy -- --env=""`.
   `wrangler.jsonc` declares the Durable Object migration and rate limiter.
   Preserve the existing custom domain/routes. No Cloudflare Pages binding is
   used by this deployment.
2. Generate a random publication secret of at least 32 characters and configure
   it with `wrangler secret put WEBSITE_PUBLISH_TOKEN`. Keep it out of the
   repository, bundle, shell arguments and logs. This secret authorizes only
   publication of validated aggregate snapshots, not database reads.
3. Stage the publisher into an isolated checkout of the existing Echo backend:

   ```sh
   node scripts/prepare-website-publisher.mjs /absolute/echo-staging/functions
   ```

   Add this export to the staged `functions/src/index.ts`:

   ```ts
   export { publishWebsiteSnapshots } from './services/investor/publishWebsiteSnapshots';
   ```

   The generator places all four `.cjs` companions in both source and compiled
   directories; TypeScript does not copy these. Re-run after a clean build.
   The canonical publisher source stays versioned here under `integrations/`.
   Do not deploy the legacy optional `investorWebsite.ts` HTTP companion.
4. Set `WEBSITE_PUBLISH_TOKEN` in Firebase Secret Manager to the matching value.
   Set server parameter `WEBSITE_PUBLISH_URL` to
   `https://anlumith.com/api/internal/snapshots` in production. Use a **separate
   dev Worker (`npm exec wrangler deploy -- --env dev`), Durable Object
   namespace, rate-limit namespace and token** for
   `echo-dev-b5e0f`; never point a dev job at production snapshot storage.
5. Build and test the staged functions. Deploy only
   `firebase deploy --only functions:publishWebsiteSnapshots --project echo-dev-b5e0f`
   to the isolated dev target first, then the same targeted command with explicit
   `--project echo-ee3bf`. Never deploy all functions, rules, hosting or indexes.
   A staging build is not a deployment. No Flutter change or Echo main push is
   needed; this avoids triggering its unrelated Android release workflow.
6. Invoke the authenticated Cloud Scheduler job once to bootstrap, or wait for
   minute 15. The persisted hourly claim still applies to manual invocations.
   Verify both production GETs return 200, `source: firebase`, valid schemas and
   plausible upstream timestamps, and the map geometry returns 200. Check that
   unauthenticated publication returns 401. Do not load-test production.

The previous `ECHO_METRICS_URL`, `ECHO_GEOGRAPHY_URL` and `ECHO_API_TOKEN` are no
longer required by public data GETs. Leave contact integration configuration
alone. Loopback development keeps its existing Firebase CLI/legacy adapter;
it is not imported by the public Worker.

## Verification

```sh
npm ci
npm test
npm run build
npm run check:seo
npm exec wrangler deploy -- --env="" --dry-run
```

For the integration test start an isolated Firestore emulator on loopback, then:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8096 \
ECHO_FUNCTIONS_PACKAGE=/absolute/echo-staging/functions/package.json \
node --test tests/publication-emulator.test.mjs
```

This test uses only the `demo-anlumith-publication` emulator fixture project.
Without both variables it explicitly skips. It exercises the real transaction
claim under concurrency, consistent multi-page geographic reads, private/old
post exclusion, partial publication and failed-delivery replay suppression.

For real local Workers bindings (fake data only):

```sh
npm exec wrangler dev -- --local --ip 127.0.0.1 --port 8791 \
  --var WEBSITE_PUBLISH_TOKEN:test-only-runtime-secret-1234567890
node scripts/check-snapshot-runtime.mjs
```

The local check verifies authentication, durable writes/reads, schema output,
actual rate-limit 429s, and unchanged page/map asset routing. It never targets
a remote host or publishes fixture data to production.
