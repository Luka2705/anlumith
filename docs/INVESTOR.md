# echo music investor website

> Hosting update (2026-10-24, anlumith#1): the current runtime is Cloudflare
> Workers. Public data routes use durable snapshots and request limits;
> the hourly scheduled Firebase publisher replaces the visitor-triggered
> upstream proxy. Follow [WEBSITE-SNAPSHOTS.md](WEBSITE-SNAPSHOTS.md) for the
> authoritative current deployment path. Earlier local observations and
> optional HTTP/Pages setup below are historical context.


## Scope and routes

The existing React/Vite app is retained. echo music's investor presentation is at `/en`, `/de`, and `/es`. `/` resolves to a saved language, then a supported browser language, otherwise English. Language switching preserves the current page and section; browser back/forward is handled. Each locale has `/privacy`, `/imprint`, and `/cookies`. Vite prerenders full translated HTML for sixteen echo music routes (including the root and dedicated investor pages), plus the corporate pages and a static 404. It emits translated titles, descriptions and `lang` attributes, as well as configured-domain canonical/hreflang and social metadata. React updates metadata and configured-domain canonical/hreflang links. Unknown routes render a localized not-found screen.

The original company homepage is preserved at `/company/`. Existing `/kontakt/`, `/impressum/`, `/datenschutz/`, and `/cookies/` routes remain available. Nothing in the adjacent echo music app/backend has been modified.

## Data currently displayed

**The local website now reads the existing production Firebase hourly cache.** `server/investor.config.json` explicitly selects `echo-ee3bf`. The server-only reader fetches `internalAnalytics/liveKpis` with a Firestore field mask, reuses the tested canonical projection, and validates the public aggregate contract before sending it to the browser. It authenticates using the existing installed Firebase CLI login, without copying tokens to project files or the browser.

Verified through the running website on October 17, 2026: `/api/metrics` returned HTTP 200, `source: firebase`, `generatedAt: 1792238400000` (14:00 Europe/Berlin), total accounts 27,815, and the exact period counts listed below. This is a real authenticated Firestore read, not a fixture. The browser's existing fetch hook replaces all figures with that response and labels the timestamp. No Firebase deployments, database writes, security-rule changes or changes to the adjacent echo music checkout were needed for this local connection.

Before the first fetch, or if no live fetch succeeds, the UI uses the owner-supplied historical snapshot in `src/investor/metrics.js`. Its capture timestamp was not supplied; the UI says so. The application never assigns today's date to this fallback. A hosted public connection remains separate and requires the deployment setup below.

| Period | New users | Auth-active users | Contributors | Song posts |
| --- | ---: | ---: | ---: | ---: |
| 24 hours | 353 | 418 | 164 | 168 |
| 7 days | 1,566 | 1,776 | 683 | 744 |
| 4 weeks | 4,412 | 4,878 | 1,939 | 2,286 |
| 3 months | 12,570 | 13,299 | 5,198 | 6,112 |

Historical registered accounts: **27,815** in the supplied snapshot. The earlier +51.5% comparison remains in the supplied source data but is not displayed in the simplified investor story. No retention, virality, projection or conversion-rate claims are made. The unvalidated 39.1% ratio is deliberately absent.

On **October 18, 2026**, the owner explicitly confirmed that echo music’s growth to date was organic and that cumulative paid advertising expenditure was **€0**. This is a persistent marketing message in the hero, community headline, traction summary, contact area, investor page, FAQ, search descriptions and share card. The methodology disclosure and FAQ identify it as owner-reported. Firebase supplies community counts; it does not verify ad expenditure. The statement does not establish zero acquisition costs, a channel attribution split, retention or virality.

All hero, headline and investor summary figures consume the same snapshot state. A successful API refresh replaces them together. Network failure preserves the last successful snapshot. Firebase data older than two hours is marked overdue, never live. The timestamp is the upstream generation time, displayed in the selected locale and Europe/Berlin timezone. Fetching the data does not rewrite the timestamp.

The former traction dashboard and separate community chapter are combined into **02 / Traction & Community**. Three prominent figures cover new registrations, unique contributors and song posts over the same three-month reporting period. The four duplicate charts, repeated community figures and roadmap counts are removed. The earlier headline section retains the total registered-user count without its former four-metric grid. The dedicated investor page uses the same three summary measures. The following roadmap chapter is numbered 03 and explains the launched product and next discovery/distribution focus without repeating counts.

The closed-by-default “Metrics & methodology” disclosure retains the four reporting-period filters, all five metrics and their definitions for diligence. Period comparisons do not change the prominent three-month summary. No daily data, cumulative growth path, extrapolation or unvalidated engagement conversion rate is fabricated.

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

The local connection is distinct from Cloudflare Pages Functions and is not deployed by the Vite static build. The investor form now opens a `mailto:` draft to the fixed recipient `info@anlumith.com`, containing the name, email, organization, message and privacy acknowledgment with localized labels. It validates the required fields, retains the entries, and explains that the visitor must send the draft in their email app; it does not claim successful delivery or call `/api/contact`. Existing server-side contact endpoints remain available for integrations but are not used by this form. Direct email links also open the email application; no deck is made public.

### Stage the Firebase companion

```sh
node scripts/prepare-echo-backend.mjs /tmp/echo-investor-backend
```

This generates `src/services/investor/investorWebsite.ts` and the tested CommonJS runtime companions in both `src/services/investor/` and `lib/services/investor/` under the staging directory. Copy these into the **existing echo music functions checkout**, preserving the same directory structure. The three `.cjs` runtime files must remain in `lib/services/investor/` after each clean build because TypeScript does not copy them automatically. The generator converts the shared frontend validation, pure projection and geographic aggregation to CommonJS, avoiding inconsistent validators.

Add to echo music's `functions/src/index.ts`:

```ts
export { investorMetrics, investorContact, investorGeography } from './services/investor/investorWebsite';
```

Configure using Firebase's normal secret/parameter workflow:

- `INVESTOR_API_TOKEN`: a high-entropy server-only token (at least 32 characters).
- Contact recipient is fixed to the owner-designated `info@anlumith.com` in the Firebase companion. No runtime parameter or browser field can redirect an inquiry to a different address.
- `INVESTOR_METRIC_DEFINITIONS_APPROVED`: default `false`; set `true` only after approving the documented live definitions and aggregate publication.
- Existing `EMAIL_USER` / `EMAIL_PASS` remain accessed through echo music's `getSecret`. Confirm that the deployed service identity can access them and the sender is configured.

Build the existing functions project and test in the dev project before deploying only the three investor functions. Preserve all existing Firestore rules, indexes, scheduler and admin endpoints. All three HTTP endpoints require the server bearer token. The metrics endpoint reads the existing hourly cache only. It never triggers aggregation or exports raw documents, account IDs, profiles, locations, detail pages or emails. The separate geography endpoint reads public song posts and exports only counts in fixed 1° regions; see [the map contract](GLOBAL-COMMUNITY-MAP.md).

The contact endpoint revalidates all fields, sends plain text through the existing mail transport, and rate limits to five attempts per hashed client-IP bucket per hour using transactional writes. Add a Firestore TTL policy for `investorInquiryLimits.expiresAt`; keep that collection denied to clients (the current default-deny should be retained). No inquiry body or raw IP is stored there. Include this rate-limit retention and actual providers in the final reviewed privacy notice. Delivery failure can have an ambiguous outcome after a network timeout; there is no claim of exactly-once email delivery.

### Connect Cloudflare Pages Functions

**Hosting diagnosis, October 21, 2026:** anlumith.com is deployed as a
Cloudflare Worker with static assets, not a Pages application. Its static-only
deployment returns 404 for both data endpoints. For this existing Worker use
the root `wrangler.jsonc` and `server/worker.js`: build the website, then deploy
with `npx wrangler deploy` (or the connected Workers Build). The Worker reuses
the validated handlers below and sends `/api/*` to code before asset handling.
Keep the same server-only URL/token bindings listed below in the Worker's
Variables and Secrets settings. Missing backend bindings return JSON 503 rather
than a static 404. This routing fix does not deploy the Firebase companion or
provide its credentials. The Pages instructions below are an alternative.

Keep the existing Cloudflare Pages deployment with build `npm run build:production`, output `dist`, and the root `functions/` directory included. Configure **server environment bindings/secrets**, never `VITE_*`:

| Binding | Value |
| --- | --- |
| `ECHO_METRICS_URL` | HTTPS URL of deployed `investorMetrics` |
| `ECHO_GEOGRAPHY_URL` | HTTPS URL of deployed `investorGeography` |
| `ECHO_CONTACT_URL` | HTTPS URL of deployed `investorContact` |
| `ECHO_API_TOKEN` | Same server-only bearer token |

`functions/api/metrics.js` revalidates and whitelists the aggregate payload before returning it, with a short public edge cache. The contact route checks same-origin requests, validates a bounded JSON stream, rejects the honeypot, supplies the trusted Cloudflare connecting IP to the authenticated backend, and returns a generic failure without upstream details. Both routes fail closed with 503 when configuration is absent. Tokens, SMTP credentials and Firebase Admin access are never included in the browser bundle. The website's existing self-only CSP is retained.

Do not deploy this folder as static assets alone and expect the online form or live metrics to work. Test the Pages Functions runtime (for example with an existing Wrangler setup) and both deployed endpoints before accepting real inquiries. No real email was sent as part of development tests.

## Localization and accessibility

`i18next` + `react-i18next`, with complete `en`/`de`/`es` dictionaries in `translations.js`. Every visible investor string, field label, validation/loading/error message, map label/description, image alternative, metric definition, navigation label and metadata string is translated. `Intl.NumberFormat` uses explicit grouping, including Spanish four-digit values; timestamps use `Intl.DateTimeFormat`. A failed localStorage write does not prevent navigation.

Product screenshots use text-only DE/EN/ES variants selected with the page language, including their full-size links. Source screenshots remain unchanged; see [IMAGE-LOCALIZATION.md](IMAGE-LOCALIZATION.md) for the protected content and pixel checks.

Features include skip navigation, semantic sections, headings, labeled inputs, aria-pressed filters, aria-current language selection, native keyboard-operable definition disclosures, an accessible map title/description, live error/status notices, visible focus, and reduced-motion support. The responsive layout collapses from desktop grids to single columns; on mobile the deck request remains available in hero/summary/footer and the full form.

## Authentic visual sources

The product section now combines the personal music diary, discovery beyond familiar recommendations, and supported music-service actions. The home page and investor brief reuse the same diary module; it replaces the previous overlapping product phones on the home page. The compact public world map remains separate.

Read-only inspection of the existing app confirms a monthly profile calendar and personal map of song posts (`account_view_widget.dart`, `month_calendar_widget.dart`, `memories_page.dart`, `user_map_widget.dart`). Dates refer to posting time, and locations are optional. Copy describes revisiting shared music rather than an automatically collected, complete listening history.

`music_service.dart` searches Apple Music and SoundCloud; `share_service.dart` opens Spotify through ISRC/title search and Apple Music through a catalogue link or search. The visible copy describes these available paths rather than universal three-service playback, guaranteed track matching or playlist migration. The feed itself has ranking logic, so “break out of your music bubble” is framed as discovering through people and places, without claiming an algorithm-free product.

Original logo: existing `public/echo-icon.png`.

Official [echo music App Store listing](https://apps.apple.com/de/app/echo-music/id6749182326); screenshots fetched via Apple's public lookup API. Local files:

- `public/echo/app-discovery.jpg`: official launch screen.
- `public/echo/app-community.jpg`: official sharing screen.
- `public/echo/app-diary.jpg`: official feed screen.

The displayed product images derive from the three screenshots supplied by the owner on October 17, 2026. Their source PNGs remain unchanged:

- `public/echo/feed-original.png`: current music feed; the localized version is displayed in the hero.
- `public/echo/map-americas.png`: world map with song-cover markers across the Americas.
- `public/echo/map-asia.png`: world map with song-cover markers across Asia and the Pacific; localized versions are available in the app screenshot gallery.

The owner additionally supplied `public/echo/diary-original.png` on October 18, 2026: the German profile screen with calendar and music memories. The complete 1206×2622 source is preserved, with SHA-256 `6fb46521ec6d168723ec74ca17336338cfe18550af59d69f0b31fed9cae4e3be` matching the supplied image. Profile handles and captured numbers remain product imagery, distinct from website metrics.

At the owner's request, the selected DE/EN/ES language now selects matching in-image UI and map text for all four screenshots, full-size image links, responsive 360/600/900px WebPs and the social share card. See [IMAGE-LOCALIZATION.md](IMAGE-LOCALIZATION.md). The original source PNGs above remain unchanged. Only translated lettering is composited from built-in ImageGen edits; protected artwork, markers, numbers and icons retain source pixels. Responsive WebP conversion applies normal resizing/compression. Brand names, artist names and song/album artwork lettering retain their original form. The social card's existing text is localized directly in its editable SVG source, retaining its layout and logo.

The dedicated `#world-map` section contains a compact, fixed world overview of the last 72 hours of public Firebase song posts, with red dots for approximate 1° regions. Zoom and the region table have been removed. A verified fresh snapshot displays “Live view · past 72 hours”, with the hourly cadence and actual snapshot time alongside it; errors/overdue data remove the live label. The map is also embedded on each investor page. The localized app screenshots remain available in a disclosure below the home-page map, preserving attribution and the app interface. Each links to the full-size version in the selected language. All map copy, status messages and image alternatives are translated into EN/DE/ES. No generated people, stock photos or fabricated metrics are used; image generation is limited to translating existing screenshot lettering. Android URL is retained from echo music's existing frontend landing page. See [GLOBAL-COMMUNITY-MAP.md](GLOBAL-COMMUNITY-MAP.md) for privacy, query, cache and deployment details.

## Verification and release limits

### Music-industry and investment thesis

The public investor story now leads with the human and cultural value of an organically grown community: regional perspectives, unexpected personal choices, diversity of music, and songs that become memories. It identifies tens of thousands of registrations rather than rounding the current Firebase total up to 30,000 or presenting every account as an active fan. Exact counts remain in the existing data sections. Owner-confirmed organic growth and €0 advertising expenditure remain visible with their provenance.

Labels are invited to listen, find inspiration for artist/editorial stories and explore thoughtful voluntary collaborations. The example of an artist inviting people to share song memories is explicitly a future collaboration idea. Any future partner content should be clearly identified. The page does not claim to represent whole countries, offer artist-level analytics or operate without ranking algorithms. The live map remains a limited view of public posts in approximate regions during the past 72 hours.

Commercial buyer/commission/economics sections and competitive comparisons have been removed from the public narrative at the owner's request. Earlier research remains in Git history. No commercial programme was joined, no contract was agreed, and no advertising, new tracking or data publication was activated. The revised DE/EN/ES story frames investment as helping discovery, personal memories and artist/listener relationships grow, without promised financial results.

```sh
npm test
npm run build
npm run build:production
```

The tests cover supplied figures; live/future/stale validation; sensitive-field filtering; canonical-cache mapping; translation completeness/placeholders; locale number formatting; input validation; request methods/origins/body limits; missing configuration; upstream failure; and confirmed versus failed email responses. Local-reader tests verify authenticated Firestore requests, field masks, fail-closed responses, request coalescing, cache expiry and loopback/origin restrictions. Geography tests verify the public-only 72-hour window, coordinate aggregation, complete pagination with a consistent read time, strict public contract and hourly cache. SSR tests render all localized pages and check visible translations, accessible map descriptions and investor summaries, input labeling, default/saved/browser locale behavior and translated legal routes. The built browser bundle was also checked to exclude the CLI credential reader and OAuth scope.

The Firebase companion was staged in `/tmp` and type-checked against the installed echo music Firebase/TypeScript dependencies, without modifying or deploying echo music. The Vite production bundle passes. `npm run build:production` is intentionally blocked by existing incomplete hosting retention, email transfers and Cloudflare legal configuration in `src/site.json`. The confirmed canonical domain is configured. No release guard was bypassed.

The revised compact map, fresh-data live label and combined three-figure investor section were checked in desktop Safari with actual Firebase data. The earlier API verification returned HTTP 200 with 124 located public posts across 75 approximate regions for October 15–18, 2026, 10:00 Europe/Berlin; the UI now loads subsequent hourly snapshots. Mobile device testing remains outstanding. The local metrics API was verified against the real production hourly Firebase cache with read-only access. Emulator and real email delivery were not exercised; automated failure-path tests use synthetic fixtures and mocked transport. Hosted integration checks remain necessary before release.

## Information still needed

1. Runtime endpoint URLs and secret bindings, plus deployment into the existing Firebase and Pages environments. The owner-confirmed canonical domain is https://anlumith.com.
2. Owner approval of the broader live contributor definition and public aggregate exposure.
3. The supplied snapshot's actual capture time (if known).
4. A successful authorized end-to-end form delivery to info@anlumith.com.
5. Provider/transfer/retention settings and reviewed legal notices for the actual deployed setup on anlumith.com.
6. An approved, semantically explicit public historical-series contract if trend charts are added.

Only claim live metrics or functioning hosted email delivery where their runtime integration is verified. The organic-growth/€0-advertising statement is owner-confirmed, not an independently audited acquisition channel mix. Do not infer retention, virality, zero acquisition costs or numerical projections from it.

The diary layout and German feature copy were visually checked in desktop Safari against the running local site on October 18, 2026. The complete screenshot and its calendar remain visible, with a link to the matching full-size localized image. The new diary asset, feature text and investor-page reuse are covered by the existing localized SSR/SEO checks.


### Local contact verification — October 19, 2026

The restarted local Vite server accepted a clearly labeled technical test inquiry through `POST /api/contact` and returned HTTP 200 with `{ "ok": true }` after Gmail SMTP accepted the message for `info@anlumith.com`. SMTP authentication was also verified separately. This confirms local submission and SMTP acceptance; inbox placement and hosted delivery were not verified. The owner requested form email delivery. All 23 automated tests and the production build pass. The earlier statements about no real email testing describe the prior implementation.
