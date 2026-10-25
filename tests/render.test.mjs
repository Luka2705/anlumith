import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { en, de, es } from '../src/investor/translations.js';

test('localized investor summaries, compact map, legal routes and locale preference render', async () => {
  const originalWindow = globalThis.window;
  const originalStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.window = { location: { pathname: '/en', hash: '' } };
  globalThis.localStorage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  const server = await createServer({ server: { middlewareMode: true, ws: false, hmr: false }, appType: 'custom' });
  try {
    const { default: Investor } = await server.ssrLoadModule('/src/investor/Investor.jsx');
    const { isLiveMapSnapshot } = await server.ssrLoadModule('/src/investor/CommunityWorldMap.jsx');
    const now = Date.now(), snapshot = { source: 'firebase', generatedAt: now - 3_600_000 };
    assert.equal(isLiveMapSnapshot(null, { now, landReady: true }), false);
    assert.equal(isLiveMapSnapshot(snapshot, { now, landReady: true }), true);
    assert.equal(isLiveMapSnapshot(snapshot, { now, landReady: false }), false);
    assert.equal(isLiveMapSnapshot(snapshot, { now, landReady: true, failed: true }), false);
    assert.equal(isLiveMapSnapshot({ ...snapshot, generatedAt: now - 3 * 3_600_000 }, { now, landReady: true }), false);
    const { default: i18n, detectLocale, formatNumber } = await server.ssrLoadModule('/src/investor/i18n.js');
    assert.equal(detectLocale('/', ['fr-FR']), 'en');
    assert.equal(detectLocale('/', ['de-DE', 'en']), 'de');
    values.set('echo-language', 'es');
    assert.equal(detectLocale('/', ['de-DE']), 'es');
    assert.equal(detectLocale('/en', ['de-DE']), 'en');
    assert.equal(formatNumber(27815, 'en'), '27,815');
    assert.equal(formatNumber(27815, 'de'), '27.815');
    assert.equal(formatNumber(5198, 'es'), '5.198');
    values.clear();
    for (const [locale, translation] of Object.entries({ en, de, es })) {
      window.location.pathname = `/${locale}`;
      await i18n.changeLanguage(locale);
      const markup = renderToStaticMarkup(createElement(Investor));
      assert.ok(markup.includes(translation.hero1), locale);
      assert.ok(markup.includes('src="/echo/hero-devices-v3-1000.webp"') && markup.includes(translation.heroVisual), `${locale}: product hero with localized description`);
      for (const name of ['diary-original', 'map-americas', 'map-asia']) {
        const image = [...markup.matchAll(/<img\b[^>]*>/g)].map(match => match[0]).find(tag => tag.includes(`src="/echo/localized/${locale}/${name}-600.webp"`));
        assert.ok(image, `${locale}/${name}: selected language screenshot`);
        for (const width of [360, 600, 900]) assert.ok(image.includes(`/echo/localized/${locale}/${name}-${width}.webp ${width}w`), `${locale}/${name}: ${width}px responsive image`);
        if (name !== 'feed-original') assert.ok(markup.includes(`href="/echo/localized/${locale}/${name}.png"`), `${locale}/${name}: matching full-size language`);
      }
      assert.ok(!markup.includes('src="/echo/feed-original-') && !markup.includes('href="/echo/map-asia.png"'), `${locale}: original German assets are not used as language defaults`);
      assert.ok(markup.includes(translation.proofTitle), locale);
      assert.ok(markup.includes(translation.proofDetails.replaceAll('&', '&amp;')), locale);
      for (const title of ['proofAcquisitionTitle', 'proofParticipationTitle', 'proofSharingTitle']) assert.ok(markup.includes(translation[title]), locale);
      assert.ok(!markup.includes(translation.storyEyebrow), locale);
      assert.ok(markup.includes(translation.unavailable), locale);
      assert.ok(markup.includes(translation.unknownDate), locale);
      assert.ok(markup.includes(translation.formLabel), locale);
      assert.ok(markup.includes(`href="/${locale}/privacy"`), locale);
      assert.ok(markup.includes('aria-pressed="true"'), locale);
      assert.equal((markup.match(/role="img"/g) || []).length, 1, locale);
      assert.equal((markup.match(/<desc>/g) || []).length, 1, locale);
      assert.ok(markup.includes(translation.geoNoData), locale);
      assert.ok(markup.includes('community-map-svg'), locale);
      assert.match(markup, /<path[^>]+d="M[^\"]+"[^>]+class="community-map-land"/, `${locale}: land is rendered before any API request`);
      assert.ok(!markup.includes('class="community-map-dot'), locale);
      assert.ok(!markup.includes(translation.geoLive), `${locale}: no live claim before verification`);
      assert.ok(!markup.includes(translation.geoRegionList), locale);
      assert.ok(!markup.includes(translation.geoZoomIn), locale);
      assert.ok(!markup.includes('onPointerDown') && !markup.includes('data-zoomed'), locale);
      assert.ok(markup.includes('type="email"') && markup.includes('autoComplete="email"'), locale);
      assert.ok(markup.includes('aria-current="true"'), locale);
      assert.ok(!markup.includes(formatNumber(27815, locale)), `${locale}: no historical fallback numbers`);
      assert.ok(markup.includes('—'), `${locale}: unavailable values remain empty`);
      for (const [page, title] of [['privacy', 'privacyTitle'], ['imprint', 'legalTitle'], ['cookies', 'storageTitle']]) {
        window.location.pathname = `/${locale}/${page}`;
        assert.ok(renderToStaticMarkup(createElement(Investor)).includes(translation[title]), `${locale}/${page}`);
      }
    }
    window.location.pathname = '/en/nonexistent'; await i18n.changeLanguage('en');
    assert.ok(renderToStaticMarkup(createElement(Investor)).includes(en.notFound));
    globalThis.localStorage = { getItem() { throw new Error('Blocked'); } };
    assert.equal(detectLocale('/', ['de-DE']), 'de');
  } finally {
    await server.close();
    globalThis.window = originalWindow;
    globalThis.localStorage = originalStorage;
  }
});
