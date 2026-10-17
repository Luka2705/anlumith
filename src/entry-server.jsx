import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import i18n from './investor/i18n.js';
import App from './App.jsx';

export function render(pathname, locale = 'en') {
  const instance = i18n.cloneInstance({ lng: locale, initImmediate: false });
  return renderToString(createElement(I18nextProvider, { i18n: instance }, createElement(App, { pathname, initialLocale: locale })));
}
