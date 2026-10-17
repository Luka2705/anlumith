import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import site, { isDraft } from '../src/site.js';
import { investorRoutes, seoTags, escapeHtml } from '../src/investor/seo.js';
import { en, de, es } from '../src/investor/translations.js';

const companyPages = { '/company/': 'ANLUMITH — Software. Einfach gedacht.', '/kontakt/': 'Kontakt — ANLUMITH', '/impressum/': 'Impressum — ANLUMITH', '/datenschutz/': 'Datenschutz — ANLUMITH', '/cookies/': 'Cookie-Hinweise — ANLUMITH' };

export async function prerender(directory) {
  const template = await readFile(resolve(directory, 'index.html'), 'utf8');
  const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, ws: false, hmr: false }, appType: 'custom' });
  let total = 0;
  try {
    const { render } = await server.ssrLoadModule('/src/entry-server.jsx');
    for (const pathname of [...investorRoutes, ...Object.keys(companyPages), '/404.html']) {
      const corporate = Boolean(companyPages[pathname]);
      const locale = corporate ? 'de' : pathname.split('/')[1] in { en, de, es } ? pathname.split('/')[1] : 'en';
      const strings = { en, de, es }[locale];
      const route = pathname === '/404.html' ? '/en/not-found' : pathname;
      const content = render(route, locale);
      const head = corporate ? `<title>${escapeHtml(companyPages[pathname])}</title><meta name="description" content="ANLUMITH entwickelt digitale Produkte. Entdecke Echo Music und MyBasar."><meta name="robots" content="${isDraft ? 'noindex, follow' : 'index, follow'}">${site.domain ? `<link rel="canonical" href="${escapeHtml(new URL(pathname, site.domain).href)}">` : ''}` : seoTags({ pathname: route, locale });
      let html = template.replace(/<title>[\s\S]*?<\/title>/g, '')
        .replace(/<meta name="(?:description|robots|apple-itunes-app)"[^>]*>/g, '')
        .replace(/<html lang="[^"]*">/, `<html lang="${locale}">`)
        .replace('</head>', `${head}\n</head>`)
        .replace('<body>', corporate ? '<body>' : '<body class="echo-body">')
        .replace('<div id="root"></div>', `<div id="root" data-prerendered="true" data-locale="${locale}" data-path="${escapeHtml(route)}">${content}</div>`)
        .replace(/<noscript>[\s\S]*?<\/noscript>/, `<noscript>${escapeHtml(strings.noScript)}: ${escapeHtml(site.company.email)}</noscript>`);
      if (corporate) html = html.replace('content="#151515"', 'content="#ffffff"');
      const destination = pathname === '/404.html' ? resolve(directory, '404.html')
        : pathname === '/' ? resolve(directory, 'index.html')
        : corporate ? resolve(directory, pathname.replace(/^\//, ''), 'index.html')
        : resolve(directory, `${pathname.replace(/^\//, '')}.html`);
      await mkdir(resolve(destination, '..'), { recursive: true });
      await writeFile(destination, html); total++;
    }
  } finally { await server.close(); }
  return total;
}
