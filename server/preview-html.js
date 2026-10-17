import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { investorRoutes } from '../src/investor/seo.js';

const corporateRoutes = ['/company/', '/kontakt/', '/impressum/', '/datenschutz/', '/cookies/'];
// Match the built clean-URL files explicitly; Vite's static server otherwise
// treats directory and extensionless fallbacks differently from Pages.
export function previewHtml(directory) {
  return async (request, response, next) => {
    if (!['GET', 'HEAD'].includes(request.method)) { next(); return; }
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const clean = pathname.replace(/\/$/, '') || '/';
    const investor = investorRoutes.includes(clean);
    const corporate = corporateRoutes.includes(`${clean}/`);
    if (!investor && !corporate && /\.[a-z0-9]+$/i.test(pathname) && !pathname.endsWith('.html')) { next(); return; }
    if (investor && pathname !== clean || corporate && pathname !== `${clean}/`) {
      response.statusCode = 301; response.setHeader('Location', investor ? clean : `${clean}/`); response.end(); return;
    }
    const file = investor ? clean === '/' ? 'index.html' : `${clean.slice(1)}.html` : corporate ? `${clean.slice(1)}/index.html` : '404.html';
    try {
      const html = await readFile(resolve(directory, file), 'utf8');
      response.statusCode = investor || corporate ? 200 : 404;
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      if (!investor && !corporate) response.setHeader('X-Robots-Tag', 'noindex');
      response.end(request.method === 'HEAD' ? undefined : html);
    } catch { next(); }
  };
}
