# GPS post KPI — Echo #112

Issue: https://github.com/Luka2705/echo/issues/112

The homepage and embedded investor map show **Posts with GPS coordinates** in
EN/DE/ES, using the existing validated public geography snapshot. The count is
`locatedSongPosts`, denominator is `publicSongPosts`, and the window is the map's
existing 72 hours ending at its hourly generation. Zero counts remain zero;
missing data shows a placeholder; a zero denominator has no percentage.
No additional requests, raw coordinate publication, schema changes, or database
access are introduced. The existing refresh, error and staleness states remain.

Implementation: `src/investor/CommunityWorldMap.jsx`, `community-map.css`, and
`geo-translations.js`. The render regression verifies all three languages,
counts, percentages, zero and missing-data states.

Verification on 2026-10-25, Node 22.23.3:

- `npm test`: 32 PASS, 0 FAIL, 0 SKIP.
- `npm run build:production`: PASS; 22 prerendered pages. Existing large JS
  bundle advisory remains (588 kB before gzip).
- `git diff --check`: PASS.
- Safari desktop `/de#world-map`: visually checked with the actual public
  hourly snapshot: 58 located + 138 unlocated = 196 public posts, rounded share
  30%, generation 2026-10-25 21:00 Europe/Berlin. Mobile visual inspection not run.

An initial build/test attempt failed because a dependency symlink targeted a
read-only directory. The isolated worktree now has a copy of the existing
dependencies; the rerun passed. No lockfile/dependency changes.

Prepared in `/private/tmp/anlumith-gps-post-kpi`, branch
`feature/echo-112-gps-post-kpi`. Commit/push and a PR against main have been authorized; website publication
remains separate from the requested production backend deployment. The corresponding
Echo report change is in `/private/tmp/echo-gps-post-kpi` and retains the report's
24-hour window (public and private posts); the homepage remains public-only.
