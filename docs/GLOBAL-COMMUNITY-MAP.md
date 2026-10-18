# Global community map

The home and investor pages show a compact world map of public song-sharing activity during a rolling 72-hour snapshot. The local server reads Firebase; a hosted adapter is prepared but not deployed. No example or random dots are substituted when data is unavailable.

## Public data contract

- Read only the canonical top-level `songs` collection, with `isPublic === true` and `timestamp` in `[windowEnd − 72 hours, windowEnd)`. `windowEnd` is the current hour boundary in UTC. Display the exact interval in Europe/Berlin.
- Read only `timestamp`, `isPublic` and `location`. Support Firebase GeoPoint and numeric legacy latitude/longitude maps. Exclude missing, non-finite and out-of-range coordinates from the map; disclose the omitted post count.
- Group every valid position into a fixed 1° latitude/longitude cell. Publish the cell centre and number of posts, never individual GPS positions, document IDs, user identities, titles, captions or individual timestamps.
- Count song-sharing **posts**, not unique recordings or people. Count occupied grid regions, not cities or countries. Multiple posts at one approximate location share a dot and retain their full count.
- Fetch every matching page (300 documents per page) with stable timestamp/document-name ordering. The REST reader reuses one Firestore read time; the hosted Admin reader uses a read-only transaction. An over-limit response (20,000 posts), malformed page or upstream failure fails closed instead of reporting a partial total.
- Whitelist and validate the public response again in the proxy and browser. Cache/coalesce requests per hour. Refresh the browser hourly; preserve the last confirmed snapshot on failure and mark data older than two hours as overdue.

Verified through the running local `/api/geography` on October 18, 2026: HTTP 200, `source: firebase`, window October 15, 10:00 to October 18, 10:00 Europe/Berlin, 352 public posts, 124 with valid locations, 75 occupied regions, 228 without valid locations. These are observed snapshot values, not hard-coded UI figures.

## Map and interaction

D3's Natural Earth projection displays local Natural Earth 1:110m land contours. The land asset is 138,160 bytes before compression and contains no remote map service or API key. Source, version, hash and public-domain attribution are recorded in `public/maps/ATTRIBUTION.txt`.

Small red dots contrast with pale land and a dark, quiet basemap. The world overview is fixed, with no zoom, dragging, point selection or region table. On desktop the map sits beside its short introduction and is capped at 300px high (240px on the investor page); on mobile it moves below the introduction and is capped at 220px. The accessible SVG description retains post/region totals. The legend, privacy caption and exact reporting window remain visible.

The green “Live view · past 72 hours” label appears only after valid Firebase data and land geometry have loaded successfully. A refresh failure, future timestamp or snapshot older than two hours removes the live label. “Updated hourly” and the actual snapshot time clarify the refresh cadence; this is not a continuous per-event stream. Initial/server rendering makes no live claim.

Design references: [Apple HIG Maps](https://developer.apple.com/design/human-interface-guidelines/maps), [Apple HIG Color](https://developer.apple.com/design/human-interface-guidelines/color), and [D3 geographic projections](https://d3js.org/d3-geo/projection). Red indicates post locations, not an error status. The display describes recorded posting locations, not nationality or residence.

## Runtime and deployment

Locally, `server/firebase-geography.js` uses the existing Firebase CLI login on the server only. `server/local-api.js` exposes the loopback-only `/api/geography` route with Host/Origin checks. It performs no Firebase writes and does not copy authentication tokens into files or browser code.

For hosting, stage the existing Firebase companion with `node scripts/prepare-echo-backend.mjs /tmp/echo-investor-backend`. It generates `geography.cjs` beside the other two runtime companions in both `src/services/investor/` and `lib/services/investor/`. Export/deploy `investorGeography` from the existing Firebase project and set server-only `ECHO_GEOGRAPHY_URL` and `ECHO_API_TOKEN` on Cloudflare Pages. `functions/api/geography.js` authenticates upstream and validates the response. Missing configuration returns 503; a static Vite upload alone cannot provide live data.

No Firebase functions, rules, indexes or public hosting were deployed for this change. Existing website release requirements remain in effect. Deployment steps are documented in [INVESTOR.md](INVESTOR.md).

## Checks

`npm test` includes public-window filtering, collisions, coordinate boundaries, omission/PII rules, strict response validation, complete 301-document pagination with a shared read time, query failures, proxy filtering and hourly request coalescing. Rendering checks cover the compact map without zoom/table controls, the initial neutral state and live-label eligibility for fresh, missing, failed and overdue snapshots. The complete suite has 20 passing tests. The Firebase companion passes TypeScript checking against the existing backend dependencies. The production Vite build and SEO checks pass; the compact map and live label were visually checked in Safari with actual data. A physical mobile device and the deployed Pages/Firebase pair have not been tested.
