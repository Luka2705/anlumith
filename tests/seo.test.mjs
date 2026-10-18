import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { pageSeo, seoTags, investorRoutes, safeJson, escapeHtml } from '../src/investor/seo.js';
import { getScreenshotImage, getSocialImage, socialImage } from '../src/investor/image-assets.js';
import { robotsTxt, sitemapXml } from '../server/search-assets.js';
import { en, de, es } from '../src/investor/translations.js';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

const screenshotNames = ['feed-original', 'diary-original', 'map-americas', 'map-asia'];

function assertLocalizedScreenshots(markup, locale, names = screenshotNames) {
  const imageTags = [...markup.matchAll(/<img\b[^>]*>/g)].map(match => match[0]);
  for (const name of names) {
    const image = getScreenshotImage(name, locale);
    const tag = imageTags.find(tag => tag.includes(`src="${image.src}"`));
    assert.ok(tag, `${locale}/${name}: localized screenshot source`);
    assert.ok(tag.includes(`srcSet="${image.srcSet}"`), `${locale}/${name}: responsive localized alternatives`);
  }
  for (const name of names.filter(name => name !== 'feed-original')) {
    assert.ok(markup.includes(`href="${getScreenshotImage(name, locale).original}"`), `${locale}/${name}: matching full-size link`);
  }
  assert.ok([...markup.matchAll(/(?:src|srcSet|href)="(\/echo\/localized\/[^"\s]+)/g)].every(match => match[1].startsWith(`/echo/localized/${locale}/`)), `${locale}: screenshots never use another language`);
}

test('localized screenshot and social assets have complete language paths and English fallbacks', () => {
  for (const locale of ['en', 'de', 'es']) {
    for (const name of screenshotNames) {
      const image = getScreenshotImage(name, locale);
      assert.equal(image.src, `/echo/localized/${locale}/${name}-600.webp`);
      assert.equal(image.original, `/echo/localized/${locale}/${name}.png`);
      assert.equal(image.srcSet, [360, 600, 900].map(width => `/echo/localized/${locale}/${name}-${width}.webp ${width}w`).join(', '));
      assert.equal(image.width, 1206);
      assert.equal(image.height, 2622);
    }
    const social = getSocialImage(locale);
    assert.equal(social.src, `/echo/localized/${locale}/echo-music-investors.jpg`);
    assert.equal(social.width, 1200);
    assert.equal(social.height, 630);
    assert.equal(social.type, 'image/jpeg');
    assert.ok(social.alt.length > 20);
  }
  assert.equal(getScreenshotImage('feed-original', 'fr'), getScreenshotImage('feed-original', 'en'));
  assert.equal(getScreenshotImage('diary-original'), getScreenshotImage('diary-original', 'en'));
  assert.equal(getSocialImage('fr'), getSocialImage('en'));
  assert.equal(socialImage, getSocialImage('en'));
  assert.equal(new Set(['en', 'de', 'es'].map(locale => getSocialImage(locale).alt)).size, 3, 'social image descriptions are localized');
});

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
    const social = getSocialImage(locale);
    const socialUrl = `https://example.org${social.src}`;
    assert.equal(seo.image, socialUrl);
    assert.ok(html.includes(`property="og:image" content="${socialUrl}"`), `${locale}: localized Open Graph image`);
    assert.ok(html.includes(`name="twitter:image" content="${socialUrl}"`), `${locale}: localized Twitter image`);
    assert.ok(html.includes(`property="og:image:alt" content="${escapeHtml(social.alt)}"`), `${locale}: localized Open Graph description`);
    assert.ok(html.includes(`name="twitter:image:alt" content="${escapeHtml(social.alt)}"`), `${locale}: localized Twitter description`);
    const graph = seo.structuredData['@graph'];
    const app = graph.find(item => item['@type'] === 'MobileApplication');
    assert.equal(app.name, 'echo music');
    assert.equal(app.image, socialUrl, `${locale}: matching JSON-LD share image`);
    assert.deepEqual([...app.screenshot].sort(), screenshotNames.map(name => `https://example.org${getScreenshotImage(name, locale).src}`).sort(), `${locale}: JSON-LD screenshots match the selected language`);
    assert.equal(graph.find(item => item['@type'] === 'WebPage').inLanguage, locale);
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
      assert.ok(home.includes(strings.industryIntro) && home.includes(strings.industryStatus), `${locale}: industry opportunity distinguishes present product and future tools`);
      for (const useCase of strings.industryCases) assert.ok(home.includes(escapeHtml(useCase.title)), `${locale}: concrete label use case`);
      assert.ok(home.includes(`href="/${locale}/investors#opportunity"`), `${locale}: detailed investment case`);
      assert.ok(home.includes(strings.diaryTitle) && home.includes(strings.discoveryTitle) && home.includes(strings.ecosystemBody), `${locale}: diary, discovery and supported listening options`);
      assertLocalizedScreenshots(home, locale);
      assert.ok(home.split(strings.organicGrowth).length - 1 >= 3, `${locale}: organic growth is repeated in key home sections`);
      assert.ok(home.includes(strings.organicSource), `${locale}: owner provenance remains available`);
      assert.ok(home.includes(strings.faqTitle));
      assert.ok(home.includes(strings.faqs[0].question));
      assert.ok(home.includes('srcSet=') && home.includes('.webp'));
      assert.ok(home.includes(`href="/${locale}/investors"`));
      assert.equal((home.match(/<h1\b/g) || []).length, 1);
      const brief = render(`/${locale}/investors`, locale);
      assert.ok(brief.includes(strings.investorPosition));
      for (const key of ['investmentBody', 'investmentProof', 'pilotTitle', 'pilotMeasure', 'fundingTitle']) assert.ok(brief.includes(escapeHtml(strings[key])), `${locale}: ${key}`);
      assert.ok(!brief.includes('class="industry-revenue"') && !brief.includes('class="industry-economics"'), `${locale}: human community story leads without commercial sections`);
      for (const model of strings.fundingSteps) assert.ok(brief.includes(escapeHtml(model.title)), `${locale}: community development directions`);
      assert.equal((brief.match(/id="opportunity"/g) || []).length, 1, `${locale}: single industry opportunity section`);
      assert.ok(brief.includes(strings.diaryTitle), `${locale}: investor product evidence`);
      assertLocalizedScreenshots(brief, locale, ['diary-original']);
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
