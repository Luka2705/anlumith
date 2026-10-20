import { readFile, stat } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { investorRoutes, escapeHtml } from '../src/investor/seo.js';
import { getScreenshotImage, getSocialImage } from '../src/investor/image-assets.js';
import { en, de, es } from '../src/investor/translations.js';
import site, { isDraft } from '../src/site.js';

const locales = ['en', 'de', 'es'];
const screenshotNames = ['feed-original', 'diary-original', 'map-americas', 'map-asia'];

for (const route of investorRoutes) {
  const file = route === '/' ? 'dist/index.html' : `dist/${route.replace(/^\//, '')}.html`;
  const html = await readFile(file, 'utf8');
  const locale = route === '/' ? 'en' : route.split('/')[1];
  const home = route === '/' || /^\/(en|de|es)$/.test(route);
  const investor = route.endsWith('/investors');
  assert.ok(html.includes(`lang="${locale}"`), `${route}: language`);
  assert.ok(html.includes('data-prerendered="true"'), `${route}: complete prerender`);
  assert.ok(!html.includes('<div id="root"></div>'), `${route}: empty shell`);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${route}: single h1`);
  assert.equal((html.match(/name="apple-itunes-app"/g) || []).length, 1, `${route}: smart banner`);
  if (home) {
    assert.ok(html.includes({ en, de, es }[locale].productSummary), `${route}: visible product positioning`);
    assert.ok(html.includes('src="/echo/hero-devices-v3-1000.webp"') && html.includes(escapeHtml({ en, de, es }[locale].heroVisual)), `${route}: complete product hero`);
    for (const width of [600, 1000, 1122]) assert.ok((await stat(`dist/echo/hero-devices-v3-${width}.webp`)).size > 0, `${route}: responsive hero asset`);
  }
  for (const name of home ? screenshotNames.filter(name => name !== 'feed-original') : investor ? ['diary-original'] : []) {
    const image = getScreenshotImage(name, locale);
    const imageTag = [...html.matchAll(/<img\b[^>]*>/g)].map(match => match[0]).find(tag => tag.includes(`src="${image.src}"`));
    assert.ok(imageTag, `${route}/${name}: localized screenshot`);
    assert.ok(imageTag.includes(`srcSet="${image.srcSet}"`), `${route}/${name}: localized responsive images`);
    if (name !== 'feed-original') assert.ok(html.includes(`href="${image.original}"`), `${route}/${name}: localized full-size link`);
  }
  assert.ok([...html.matchAll(/(?:src|srcSet|href)="(\/echo\/localized\/[^"\s]+)/g)].every(match => match[1].startsWith(`/echo/localized/${locale}/`)), `${route}: consistent screenshot language`);
  if (site.domain) {
    assert.equal((html.match(/rel="canonical"/g) || []).length, 1, `${route}: canonical`);
    assert.equal((html.match(/hreflang=/g) || []).length, 4, `${route}: alternatives`);
    assert.ok(html.includes('application/ld+json'), `${route}: structured data`);
    const social = getSocialImage(locale);
    const socialUrl = new URL(social.src, site.domain).href;
    assert.ok(html.includes(`property="og:image" content="${socialUrl}"`), `${route}: localized Open Graph image`);
    assert.ok(html.includes(`name="twitter:image" content="${socialUrl}"`), `${route}: localized Twitter image`);
    assert.ok(html.includes(`property="og:image:alt" content="${escapeHtml(social.alt)}"`), `${route}: localized Open Graph image description`);
    assert.ok(html.includes(`name="twitter:image:alt" content="${escapeHtml(social.alt)}"`), `${route}: localized Twitter image description`);
    const structured = JSON.parse(html.match(/<script[^>]*id="echo-structured-data"[^>]*>([\s\S]*?)<\/script>/)?.[1] || 'null');
    assert.ok(structured?.['@graph'], `${route}: parseable JSON-LD`);
    if (home || investor) {
      const app = structured['@graph'].find(item => item['@type'] === 'MobileApplication');
      assert.equal(app?.image, socialUrl, `${route}: matching JSON-LD image`);
      assert.deepEqual([...app.screenshot].sort(), screenshotNames.map(name => new URL(getScreenshotImage(name, locale).src, site.domain).href).sort(), `${route}: localized JSON-LD screenshots`);
    }
  }
  assert.ok(!/firebaseCliAccessToken|refresh_token|PRIVATE KEY/.test(html), `${route}: private server data`);
}
const missing = await readFile('dist/404.html', 'utf8');
assert.ok(missing.includes('noindex, follow'));
for (const locale of locales) {
  for (const name of screenshotNames) {
    const image = getScreenshotImage(name, locale);
    assert.ok((await stat(`dist${image.src}`)).size < 100000, `${locale}/${name}: optimized 600px asset`);
    assert.ok((await stat(`dist${image.original}`)).size > 0, `${locale}/${name}: full-size asset exists`);
    for (const width of [360, 900]) assert.ok((await stat(`dist/echo/localized/${locale}/${name}-${width}.webp`)).size > 0, `${locale}/${name}: ${width}px asset exists`);
  }
  assert.ok((await stat(`dist${getSocialImage(locale).src}`)).size > 0, `${locale}: localized social image exists`);
}
console.log(`${investorRoutes.length} localized pages and 12 optimized screenshot sets: complete HTML, language-specific images, metadata and 404 checks passed.`);
if (isDraft || !site.domain) console.log('Indexing remains disabled pending the existing release requirements; no release guard was bypassed.');
