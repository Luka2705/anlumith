import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { pageSeo, seoTags, investorRoutes, safeJson } from '../src/investor/seo.js';
import { robotsTxt, sitemapXml } from '../server/search-assets.js';
import { en, de, es } from '../src/investor/translations.js';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

test('SEO tags use canonical language URLs, reciprocal alternates and factual app identity', () => {
  for (const locale of ['en', 'de', 'es']) {
    const options = { pathname: `/${locale}/investors`, locale, domain: 'https://example.org', draft: false };
    const seo = pageSeo(options);
    assert.equal(seo.canonical, `https://example.org/${locale}/investors`);
    assert.deepEqual(seo.alternates.map(item => item.language), ['en', 'de', 'es', 'x-default']);
    assert.ok(seo.alternates.every(item => item.href.endsWith('/investors')));
    assert.ok(seo.robots.startsWith('index, follow'));
    const html = seoTags(options);
    assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
    assert.equal((html.match(/name="apple-itunes-app"/g) || []).length, 1);
    assert.ok(html.includes('app-id=6749182326'));
    assert.ok(html.includes('og:image:width" content="1200'));
    const graph = seo.structuredData['@graph'];
    assert.equal(graph.find(item => item['@type'] === 'MobileApplication').name, 'echo music');
    assert.equal(graph.find(item => item['@type'] === 'Organization').email, 'info@anlumith.com');
    assert.equal(graph.find(item => item['@type'] === 'WebSite').name, 'echo music');
    assert.ok(seo.title.includes('echo music'));
    assert.equal(graph.find(item => item['@type'] === 'Person').name, 'Luka Juric');
    assert.equal(JSON.stringify(graph).includes('aggregateRating'), false);
    assert.equal(JSON.stringify(graph).includes('reviewRating'), false);
  }
  assert.equal(pageSeo({ domain: '', draft: true }).canonical, null);
  assert.equal(pageSeo({ domain: 'https://example.org', draft: true }).robots, 'noindex, follow');
  assert.equal(pageSeo({ pathname: '/en/missing', domain: 'https://example.org', draft: false }).robots, 'noindex, follow');
  assert.ok(!safeJson({ value: '</script><script>alert(1)</script>' }).includes('</script>'));
});
test('sitemap uses unique canonical URLs and language alternatives; draft protection remains', () => {
  const xml = sitemapXml('https://example.org', investorRoutes);
  assert.ok(xml.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'));
  assert.ok(xml.includes('https://example.org/de/investors'));
  assert.ok(xml.includes('hreflang="x-default"'));
  assert.equal((xml.match(/<loc>https:\/\/example.org\/en<\/loc>/g) || []).length, 1);
  assert.ok(!xml.includes('<loc>https://example.org/</loc>'));
  assert.equal(robotsTxt('https://example.org', true), 'User-agent: *\nDisallow: /\n');
  assert.ok(robotsTxt('https://example.org', false).includes('Sitemap: https://example.org/sitemap.xml'));
});
test('production renderer emits complete localized content without browser globals or JavaScript', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true, ws: false, hmr: false }, appType: 'custom' });
  try {
    const { render } = await server.ssrLoadModule('/src/entry-server.jsx');
    for (const route of [...investorRoutes, '/company/', '/kontakt/', '/impressum/', '/datenschutz/', '/cookies/']) {
      const markup = render(route, route.split('/')[1] || 'en');
      const text = markup.replace(/<[^>]*>/g, ' ');
      assert.ok(!/\bEcho\b|\bECHO\b|\becho\b(?! music|[-_])/.test(text), `${route}: complete consistent brand`);
      const destinations = [...markup.matchAll(/href="mailto:([^?"\s]+)/g)].map(match => match[1]);
      assert.ok(destinations.length > 0 && destinations.every(address => address === 'info@anlumith.com'), `${route}: designated contact address`);
      assert.ok(!markup.includes('href="tel:'), `${route}: contact actions use the designated inbox`);
    }
    for (const [locale, strings] of Object.entries({ en, de, es })) {
      const home = render(`/${locale}`, locale);
      assert.ok(home.includes(strings.productSummary));
      assert.ok(home.includes(strings.diaryTitle) && home.includes(strings.discoveryTitle) && home.includes(strings.ecosystemBody), `${locale}: diary, discovery and supported listening options`);
      assert.ok(home.includes('/echo/diary-original-600.webp') && home.includes('/echo/diary-original.png'), `${locale}: genuine diary screenshot and original`);
      assert.ok(home.split(strings.organicGrowth).length - 1 >= 3, `${locale}: organic growth is repeated in key home sections`);
      assert.ok(home.includes(strings.organicSource), `${locale}: owner provenance remains available`);
      assert.ok(home.includes(strings.faqTitle));
      assert.ok(home.includes(strings.faqs[0].question));
      assert.ok(home.includes('srcSet=') && home.includes('.webp'));
      assert.ok(home.includes('/echo/map-americas.png'));
      assert.ok(home.includes(`href="/${locale}/investors"`));
      assert.equal((home.match(/<h1\b/g) || []).length, 1);
      const brief = render(`/${locale}/investors`, locale);
      assert.ok(brief.includes(strings.investorPosition));
      assert.ok(brief.includes(strings.diaryTitle) && brief.includes('/echo/diary-original-600.webp'), `${locale}: investor product evidence`);
      assert.ok(brief.split(strings.organicGrowth).length - 1 >= 3, `${locale}: investor introduction, evidence and contact repeat the organic message`);
      assert.ok(brief.includes(strings.organicSource), `${locale}: investor provenance`);
      assert.ok(brief.includes(strings.founderTitle));
      assert.ok(brief.includes(strings.historical));
      assert.equal((brief.match(/<h1\b/g) || []).length, 1);
      assert.ok(!brief.includes('undefined'));
    }
    assert.ok(render('/company/', 'de').includes('ANLUMITH'));
    assert.ok(render('/impressum/', 'de').includes('Impressum'));
    assert.ok(render('/bogus/privacy', 'en').includes(en.notFound));
    assert.ok(render('/de/privacy/extra', 'de').includes(de.notFound));
    // Match the first hydrated tree to the HTML's locale and rendering path,
    // even when the browser initially prefers German or requested an unknown URL.
    const { default: clientI18n } = await server.ssrLoadModule('/src/investor/i18n.js');
    const { default: ClientApp } = await server.ssrLoadModule('/src/App.jsx');
    for (const initialPath of ['/', '/en/not-found']) {
      await clientI18n.changeLanguage('de');
      const serverMarkup = render(initialPath, 'en');
      await clientI18n.changeLanguage('en');
      const clientMarkup = renderToString(createElement(ClientApp, { pathname: initialPath, initialLocale: 'en' }));
      assert.equal(clientMarkup, serverMarkup, `${initialPath}: hydration language/path contract`);
    }
  } finally { await server.close(); }
});
