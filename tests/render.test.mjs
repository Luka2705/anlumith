import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { en, de, es } from '../src/investor/translations.js';

test('localized investor pages, legal routes, locale preference and accessible charts render', async () => {
  const originalWindow = globalThis.window;
  const originalStorage = globalThis.localStorage;
  const values = new Map();
  globalThis.window = { location: { pathname: '/en', hash: '' } };
  globalThis.localStorage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  const server = await createServer({ server: { middlewareMode: true, ws: false, hmr: false }, appType: 'custom' });
  try {
    const { default: Investor } = await server.ssrLoadModule('/src/investor/Investor.jsx');
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
      assert.ok(markup.includes(translation.dashboardTitle), locale);
      assert.ok(markup.includes(translation.historical), locale);
      assert.ok(markup.includes(translation.unknownDate), locale);
      assert.ok(markup.includes(translation.formLabel), locale);
      assert.ok(markup.includes(`href="/${locale}/privacy"`), locale);
      assert.ok(markup.includes('aria-pressed="true"'), locale);
      assert.equal((markup.match(/role="img"/g) || []).length, 5, locale);
      assert.equal((markup.match(/<desc>/g) || []).length, 5, locale);
      assert.ok(markup.includes(translation.geoNoData), locale);
      assert.ok(markup.includes('community-map-svg'), locale);
      assert.ok(!markup.includes('class="community-map-dot'), locale);
      assert.ok(markup.includes('type="email"') && markup.includes('autoComplete="email"'), locale);
      assert.ok(markup.includes('aria-current="true"'), locale);
      assert.ok(markup.includes(formatNumber(27815, locale)), locale);
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
