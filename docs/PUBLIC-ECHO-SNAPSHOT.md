# Public ECHO data on anlumith.com

Implemented 2026-10-25 in this Anlumith project. Existing uncommitted map geometry,
layout and refresh changes are preserved.

`src/investor/public-snapshot.js` is the only source for metrics and map data.
It anonymously downloads the production ECHO file:

```
https://firebasestorage.googleapis.com/v0/b/echo-ee3bf.firebasestorage.app/o/public-analytics%2Fv1%2Fsnapshot.json?alt=media&token=e18b38fa-3b02-4bd8-87f0-b459cabdc110
```

The token intentionally permits public read access to this aggregate object only.
No Firebase SDK, account, API token, Firestore query, or callable is used. The
ECHO backend generates the file once per hour; visitors cannot start generation.
Both `metrics` and `geography` must validate and have the same hourly generation.
The loader strips extra fields, limits payloads to 2 MiB, times out after 10 seconds,
coalesces concurrent requests and shares one download between all cards and maps.
It caches until the next hourly publication plus five minutes; failed downloads
are suppressed for one minute. Language/period changes reuse the downloaded data.
A regressed generation is rejected. Existing components keep the last confirmed
view on errors; before the first valid file, counters show unavailable placeholders instead of old historical figures.
Browser reads omit credentials and referrers. Privacy text in all three languages
explains that Google Cloud Storage receives download connection metadata.

The legacy `/api/metrics` and `/api/geography` routes now project this same file.
They ignore old ECHO_METRICS_URL / ECHO_GEOGRAPHY_URL / ECHO_API_TOKEN settings and
cannot fall back to Firebase. The local Vite API uses the same reader, regardless
of legacy `localMetricsSource` configuration. Existing contact delivery is unchanged;
its private mail credential utility is not a public data reader. Old standalone
Firebase read utilities remain for compatibility tests/operator tooling but are
not imported by the website's metrics/map paths.

The generated Content Security Policy permits the fixed Storage origin in
`connect-src`; all other existing restrictions remain. Static transfers remain
metered, but page traffic cannot cause database reads or source recomputation.

Verification:

- `npm test`: PASS, 30 tests, zero failures/skips.
- `npm run build:production`: existing release gate blocks four empty fields:
  `legal.hostingRetention`, `legal.emailInternationalTransfers`,
  `legal.cloudflareTransferSafeguards`, `legal.cloudflareCookies`.
  No values were invented and the release gate was not bypassed.
- `npm run build`: PASS, 22 complete prerendered pages. Existing bundle-size
  advisory remains; no code or dependency build failures.
- `node scripts/check-public-snapshot.mjs`: PASS against the actual ECHO production
  file (2026-10-25 20:00 Berlin, 29,466 accounts, 198 public posts / 39 map cells).
- `node scripts/check-live.mjs http://127.0.0.1:4186`: both compatibility routes PASS.
- `tests/public-snapshot.browser.mjs` with a local built preview, Playwright and Edge:
  PASS for `/en` at 1366px, `/de` at 390px, `/en/investors` at 390px. Exactly one
  anonymous static file download per page, consistent 39 map cells, no DB/callable
  or legacy API requests, no refetch on language/period changes, generated CSP
  applied, no page errors or horizontal overflow. Initial download failure shows
  unavailable placeholders and no historical fallback counts. Mobile map inspected.
- `git diff --check`: PASS. No installation, dependency or lockfile change.

The SSR expectations formerly required historical fallback figures. They now
explicitly require unavailable placeholders until a valid generated file arrives;
legacy historical fixtures remain in operator/compatibility unit tests only.
The first browser assertion incorrectly expected the total account count on the
compact investor page (which shows three-month registrations instead); corrected
that test assertion, then all routes passed. These were test expectation changes,
not hidden application failures.

Reproduce the live browser smoke with an existing preview on port 4186:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
SNAPSHOT_BROWSER_PATH=/absolute/path/to/browser \
node tests/public-snapshot.browser.mjs
```

`SNAPSHOT_PREVIEW_URL` and `SNAPSHOT_SCREENSHOT_DIR` can override the preview URL
and screenshot output directory. The browser test is separate from `npm test`
because it intentionally checks the real public file over the network.

Run `node scripts/check-public-snapshot.mjs` to validate the actual public ECHO
file. `node scripts/check-live.mjs http://127.0.0.1:4186` validates compatibility
routes during a local preview. Production publication has now been explicitly authorized; the existing GitHub main → Cloudflare Workers Builds workflow is used.


## Release configuration completed — 2026-10-25

The owner confirmed seven days for technical access/security log retention and
30 minutes of continuous inactivity for `__cf_bm`. Recorded these values in
`src/site.json` together with the previously prepared Cloudflare/Apple transfer
texts and updated the text date. These are website configuration/text changes;
no Cloudflare or Apple account settings were changed.

`npm run build:production`: PASS, release fields complete and 22 pages prerendered.
`npm test`: 30 PASS, 0 FAIL, 0 SKIP. `git diff --check`: PASS. The earlier release
field blocker recorded above is resolved. That validation stage preceded production publication.


## Production release validation — 2026-10-25

Synchronized the two existing origin/main hosting commits without losing local
map or data changes. Retained the production Worker entry, assets binding and
GitHub integration. The newly included Worker regression now verifies that all
legacy API paths share the public file, with no credentials or database fallback.
Final `npm test`: **32 PASS, 0 FAIL, 0 SKIP**. `npm run build:production`: PASS,
22 pages. `wrangler deploy --dry-run`: PASS, 123 static assets and a 12.88 KiB
Worker bundle. `git diff --check`: PASS.

The owner authorized committing/pushing the complete site update and publishing
it to anlumith.com. The existing Cloudflare GitHub check is `Workers Builds:
anlumith`. Direct Wrangler credentials are unavailable locally; the already
configured GitHub production build provides the authenticated publication path.
The live browser smoke must use the delivered CSP unmodified (local previews
apply the generated CSP explicitly). No Firebase/backend deployment is required.
