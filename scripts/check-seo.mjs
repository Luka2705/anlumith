import { readFile, stat } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { investorRoutes } from '../src/investor/seo.js';
import { en, de, es } from '../src/investor/translations.js';
import site, { isDraft } from '../src/site.js';

for (const route of investorRoutes) {
  const file = route === '/' ? 'dist/index.html' : `dist/${route.replace(/^\//, '')}.html`;
  const html = await readFile(file, 'utf8');
  const locale = route === '/' ? 'en' : route.split('/')[1];
  assert.ok(html.includes(`lang="${locale}"`), `${route}: language`);
  assert.ok(html.includes('data-prerendered="true"'), `${route}: complete prerender`);
  assert.ok(!html.includes('<div id="root"></div>'), `${route}: empty shell`);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${route}: single h1`);
  assert.equal((html.match(/name="apple-itunes-app"/g) || []).length, 1, `${route}: smart banner`);
  if (route === '/' || /^\/(en|de|es)$/.test(route)) assert.ok(html.includes({ en, de, es }[locale].productSummary), `${route}: visible product positioning`);
  if (site.domain) {
    assert.equal((html.match(/rel="canonical"/g) || []).length, 1, `${route}: canonical`);
    assert.equal((html.match(/hreflang=/g) || []).length, 4, `${route}: alternatives`);
    assert.ok(html.includes('application/ld+json'), `${route}: structured data`);
  }
  assert.ok(!/firebaseCliAccessToken|refresh_token|PRIVATE KEY/.test(html), `${route}: private server data`);
}
const missing = await readFile('dist/404.html', 'utf8');
assert.ok(missing.includes('noindex, follow'));
for (const image of ['echo/feed-original-600.webp', 'echo/diary-original-600.webp', 'echo/map-americas-600.webp', 'echo/map-asia-600.webp']) assert.ok((await stat(`dist/${image}`)).size < 100000, `${image}: optimized asset`);
console.log(`${investorRoutes.length} localized pages: complete HTML, image assets, metadata and 404 checks passed.`);
if (isDraft || !site.domain) console.log('Indexing remains disabled pending the existing release requirements; no release guard was bypassed.');
