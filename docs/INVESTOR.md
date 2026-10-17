# Echo Music investor website

## Scope and routes

The existing React/Vite app is retained. Echo's investor presentation is at `/en`, `/de`, and `/es`. `/` resolves to a saved language, then a supported browser language, otherwise English. Language switching preserves the current page and section; browser back/forward is handled. Each locale has `/privacy`, `/imprint`, and `/cookies`. Vite prerenders full translated HTML for sixteen Echo routes (including the root and dedicated investor pages), plus the corporate pages and a static 404. It emits translated titles, descriptions and `lang` attributes, as well as configured-domain canonical/hreflang and social metadata. React updates metadata and configured-domain canonical/hreflang links. Unknown routes render a localized not-found screen.

The original company homepage is preserved at `/company/`. Existing `/kontakt/`, `/impressum/`, `/datenschutz/`, and `/cookies/` routes remain available. Nothing in the adjacent Echo app/backend has been modified.

## Data currently displayed

**The local website now reads the existing production Firebase hourly cache.** `server/investor.config.json` explicitly selects `echo-ee3bf`. The server-only reader fetches `internalAnalytics/liveKpis` with a Firestore field mask, reuses the tested canonical projection, and validates the public aggregate contract before sending it to the browser. It authenticates using the existing installed Firebase CLI login, without copying tokens to project files or the browser.

Verified through the running website on October 17, 2026: `/api/metrics` returned HTTP 200, `source: firebase`, `generatedAt: 1792238400000` (14:00 Europe/Berlin), total accounts 27,815, and the exact period counts listed below. This is a real authenticated Firestore read, not a fixture. The browser's existing fetch hook replaces all figures with that response and labels the timestamp. No Firebase deployments, database writes, security-rule changes or changes to the adjacent Echo checkout were needed for this local connection.

Before the first fetch, or if no live fetch succeeds, the UI uses the owner-supplied historical snapshot in `src/investor/metrics.js`. Its capture timestamp was not supplied; the UI says so. The application never assigns today's date to this fallback. A hosted public connection remains separate and requires the deployment setup below.

| Period | New users | Auth-active users | Contributors | Song posts |
| --- | ---: | ---: | ---: | ---: |
| 24 hours | 353 | 418 | 164 | 168 |
| 7 days | 1,566 | 1,776 | 683 | 744 |
| 4 weeks | 4,412 | 4,878 | 1,939 | 2,286 |
| 3 months | 12,570 | 13,299 | 5,198 | 6,112 |

Total registered accounts: **27,815**. The supplied +51.5% appears only for the 24-hour filter and is explicitly one comparison against the preceding 24 hours. No retention, virality, paid-acquisition, projection or conversion-rate claims are made. The unvalidated 39.1% ratio is deliberately absent.

All hero, narrative, participation and roadmap figures consume the same snapshot state as the dashboard. A successful API refresh replaces them together. Network failure preserves the last successful snapshot. Firebase data older than two hours is marked overdue, never live. The timestamp is the upstream generation time, displayed in the selected locale and Europe/Berlin timezone. Fetching the data does not rewrite the timestamp.

Charts use D3 scales and accessible SVG with native text summaries, tooltips and visible labels. They show **selected period totals**, with explicit disclosure that historical time series are not connected. Calendar-window totals are not plotted as sequential trend points. No daily data, cumulative growth path or extrapolation is fabricated.

## Existing Firebase infrastructure inspected (read-only)

Source repository: adjacent `../echo`.

- `functions/src/services/analytics/liveKpi.ts`: existing `refreshLiveKpisHourly` scheduler, transactional lease and monotonic hourly publication to `internalAnalytics/liveKpis`. `getLiveKpis` and detail APIs require admin claims; those checks remain untouched.
- `liveKpiAuth.ts`: existing Firebase Auth accounts, account creation times, latest sign-in/token-refresh contacts.
- `liveKpiSources.ts`: canonical song posts and supported rating/comment/comment-like sources; bounded queries. We do not independently calculate these in the website.
- `liveKpiCache.ts`: cached calendar periods, deduplicated full-period contributor counts, auth activity and daily/weekly/monthly histories.
- `dailyReport.ts`: existing Gmail/nodemailer transport and `EMAIL_USER` / `EMAIL_PASS` secret access. These are reused by the optional contact companion; no credentials were read.

**Definition discrepancy:** the supplied brief defines contributors as post/rating/comment users. The canonical live cache also includes comment likes. The user's instruction to connect the existing database is implemented locally by reusing that canonical cache and its explicit definition identifier; the website switches to the corresponding translated explanation. It never silently maps contributors to sign-in activity. The optional hosted companion retains its explicit publication-approval parameter. The daily-report contributor calculation is also different from the canonical cache; it is not reused to create competing investor calculations.

The live cache has time series, but they are intentionally excluded from the first public contract. Auth's series bucket latest stored contacts, not historical daily active users. Publishing those as ordinary activity history would be misleading. A future chart contract should explicitly distinguish acquisition/post history from latest-contact distributions and preserve interval boundaries and deduplication.

## Server integration and deployment

No deployment has been performed. `npm run dev` and `vite preview` now include a loopback-only local metrics middleware. It reads Firebase via the existing CLI login and keeps a one-minute in-memory cache, coalescing concurrent requests. The browser polls hourly. Missing permissions, invalid snapshots or network failures return a generic 503; the UI keeps its last confirmed data and marks overdue data appropriately. Cross-origin and non-loopback Host requests are rejected. No credential-bearing endpoint is accessible in the browser bundle.

Local prerequisites: install the Firebase CLI through its official distribution, sign in using `firebase login`, and run the development server with network access. The active CLI account needs access to the configured Firestore project. `server/investor.config.json` makes the production project selection explicit; it does not contain secrets. If `ECHO_METRICS_URL` and `ECHO_API_TOKEN` are configured as server environment variables (or in an ignored `.env.local`), the local middleware uses the hosted adapter instead. Set `localMetricsSource` to a value other than `firebase-cli` to disable direct local reads.

The local connection is distinct from Cloudflare Pages Functions and is not deployed by the Vite static build. Online form delivery remains unconfigured locally; the email CTA opens a deck request to the founder using the existing public company email. Form success is shown only after a backend confirms delivery; no deck is made public.

### Stage the Firebase companion

```sh
node scripts/prepare-echo-backend.mjs /tmp/echo-investor-backend
```

This generates `src/services/investor/investorWebsite.ts` and the tested CommonJS runtime companions in both `src/services/investor/` and `lib/services/investor/` under the staging directory. Copy these into the **existing Echo functions checkout**, preserving the same directory structure. The two `.cjs` runtime files must remain in `lib/services/investor/` after each clean build because TypeScript does not copy them automatically. The generator converts the shared frontend validation and pure projection to CommonJS, avoiding inconsistent validators.

Add to Echo's `functions/src/index.ts`:

```ts
export { investorMetrics, investorContact } from './services/investor/investorWebsite';
```

Configure using Firebase's normal secret/parameter workflow:

- `INVESTOR_API_TOKEN`: a high-entropy server-only token (at least 32 characters).
- `INVESTOR_CONTACT_RECIPIENT`: verified founder destination. Never accept it from a browser request.
- `INVESTOR_METRIC_DEFINITIONS_APPROVED`: default `false`; set `true` only after approving the documented live definitions and aggregate publication.
- Existing `EMAIL_USER` / `EMAIL_PASS` remain accessed through Echo's `getSecret`. Confirm that the deployed service identity can access them and the sender is configured.

Build the existing functions project and test in the dev project before deploying only the two investor functions. Preserve all existing Firestore rules, indexes, scheduler and admin endpoints. Both new HTTP endpoints require the server bearer token. The metrics endpoint reads the existing hourly cache only. It never triggers aggregation or exports raw documents, account IDs, profiles, locations, detail pages or emails.

The contact endpoint revalidates all fields, sends plain text through the existing mail transport, and rate limits to five attempts per hashed client-IP bucket per hour using transactional writes. Add a Firestore TTL policy for `investorInquiryLimits.expiresAt`; keep that collection denied to clients (the current default-deny should be retained). No inquiry body or raw IP is stored there. Include this rate-limit retention and actual providers in the final reviewed privacy notice. Delivery failure can have an ambiguous outcome after a network timeout; there is no claim of exactly-once email delivery.

### Connect Cloudflare Pages Functions

Keep the existing Cloudflare Pages deployment with build `npm run build:production`, output `dist`, and the root `functions/` directory included. Configure **server environment bindings/secrets**, never `VITE_*`:

| Binding | Value |
| --- | --- |
| `ECHO_METRICS_URL` | HTTPS URL of deployed `investorMetrics` |
| `ECHO_CONTACT_URL` | HTTPS URL of deployed `investorContact` |
| `ECHO_API_TOKEN` | Same server-only bearer token |

`functions/api/metrics.js` revalidates and whitelists the aggregate payload before returning it, with a short public edge cache. The contact route checks same-origin requests, validates a bounded JSON stream, rejects the honeypot, supplies the trusted Cloudflare connecting IP to the authenticated backend, and returns a generic failure without upstream details. Both routes fail closed with 503 when configuration is absent. Tokens, SMTP credentials and Firebase Admin access are never included in the browser bundle. The website's existing self-only CSP is retained.

Do not deploy this folder as static assets alone and expect the online form or live metrics to work. Test the Pages Functions runtime (for example with an existing Wrangler setup) and both deployed endpoints before accepting real inquiries. No real email was sent as part of development tests.

## Localization and accessibility

`i18next` + `react-i18next`, with complete `en`/`de`/`es` dictionaries in `translations.js`. Every visible investor string, field label, validation/loading/error message, chart label/description, image alternative, metric definition, navigation label and metadata string is translated. `Intl.NumberFormat` uses explicit grouping, including Spanish four-digit values; timestamps use `Intl.DateTimeFormat`. A failed localStorage write does not prevent navigation.

Original product screenshots contain their original English/German text. They are explicitly described as original product imagery, not recreated or altered into fictitious localized screenshots. UI outside these authentic images uses the selected locale.

Features include skip navigation, semantic sections, headings, labeled inputs, aria-pressed filters, aria-current language selection, native keyboard-operable definition disclosures, accessible chart title/description, live error/status notices, visible focus, and reduced-motion support. The responsive layout collapses from desktop grids to single columns; on mobile the deck request remains available in hero/narrative/footer and the full form.

## Authentic visual sources

Original logo: existing `public/echo-icon.png`.

Official [Echo App Store listing](https://apps.apple.com/de/app/echo-music/id6749182326); screenshots fetched via Apple's public lookup API. Local files:

- `public/echo/app-discovery.jpg`: official launch screen.
- `public/echo/app-community.jpg`: official sharing screen.
- `public/echo/app-diary.jpg`: official feed screen.

The displayed product images now use the three original screenshots supplied by the owner on October 17, 2026:

- `public/echo/feed-original.png`: current music feed; displayed in the hero and product section.
- `public/echo/map-americas.png`: world map with song-cover markers across the Americas.
- `public/echo/map-asia.png`: world map with song-cover markers across Asia and the Pacific; also displayed in the product section.

The dedicated `#world-map` section presents both complete map screenshots, preserving the map attribution and app interface. Each links to the unchanged original PNG for closer inspection. This is a screenshot showcase of the app feature, not a live website map or a source of new geographic analytics. The copy, navigation and image alternatives are translated into EN/DE/ES. No AI imagery, generated people, stock images or fabricated screenshots are used. Android URL is retained from Echo's existing frontend landing page.

## Verification and release limits

```sh
npm test
npm run build
npm run build:production
```

The eleven tests check all supplied figures; live/future/stale validation; sensitive-field filtering; canonical-cache mapping; translation completeness/placeholders; locale number formatting; input validation; request methods/origins/body limits; missing configuration; upstream failure; and confirmed versus failed email responses. Additional local-reader tests verify authenticated Firestore requests, the aggregate-only field mask, fail-closed responses, request coalescing, cache expiry and loopback/origin restrictions. SSR tests render all localized pages and check visible translations, chart descriptions, input labeling, default/saved/browser locale behavior and translated legal routes. The built browser bundle was also checked to exclude the CLI credential reader and OAuth scope.

The Firebase companion was staged in `/tmp` and type-checked against the installed Echo Firebase/TypeScript dependencies, without modifying or deploying Echo. The Vite production bundle passes. `npm run build:production` is intentionally blocked by existing incomplete domain, hosting retention, email transfers and Cloudflare legal configuration in `src/site.json`. No release guard was bypassed.

No controllable browser was available in this session, so visual mobile/desktop, actual keyboard navigation and browser interaction QA remain unverified. The local website's API was verified against the real production hourly Firebase cache with read-only access. Emulator and real email delivery were not exercised; automated failure-path tests use synthetic fixtures and mocked transport. Browser and hosted integration checks remain necessary before release.

## Information still needed

1. Runtime endpoint URLs and secret bindings, plus deployment into the existing Firebase and Pages environments. The owner-confirmed canonical domain is https://anlumith.com.
2. Owner approval of the broader live contributor definition and public aggregate exposure.
3. The supplied snapshot's actual capture time (if known).
4. Verified founder mail destination and a successful authorized end-to-end form delivery.
5. Provider/transfer/retention settings and reviewed legal notices for the actual deployed setup on anlumith.com.
6. An approved, semantically explicit public historical-series contract if trend charts are added.

Do not claim live metrics, functioning hosted email delivery, a verified acquisition channel mix, retention, virality or numerical projections until those facts are verified.
