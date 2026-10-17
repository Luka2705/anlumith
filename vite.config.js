import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import site, { isDraft, routes } from './src/site.js';
import { resolve } from 'node:path';
import localConfiguration from './server/investor.config.json' with { type: 'json' };
import { createLocalApi } from './server/local-api.js';
import { prerender } from './server/prerender.js';
import { robotsTxt, sitemapXml } from './server/search-assets.js';
import { investorRoutes } from './src/investor/seo.js';
import { previewHtml } from './server/preview-html.js';

export default defineConfig(({ mode, isPreview }) => {
  const fromFile = loadEnv(mode, process.cwd(), 'ECHO_');
  const env = {
    ECHO_METRICS_URL: process.env.ECHO_METRICS_URL || fromFile.ECHO_METRICS_URL,
    ECHO_API_TOKEN: process.env.ECHO_API_TOKEN || fromFile.ECHO_API_TOKEN,
  };
  let building = false;
  return {
  appType: isPreview ? 'mpa' : 'spa',
  plugins: [react(), {
    name: 'site-metadata',
    configResolved(config) { building = config.command === 'build'; },
    configureServer(server) {
      server.middlewares.use('/api', createLocalApi({ configuration: localConfiguration, env }));
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api', createLocalApi({ configuration: localConfiguration, env }));
      server.middlewares.use(previewHtml(resolve('dist')));
    },
    transformIndexHtml() {
      return isDraft ? [{ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' }, injectTo: 'head' }] : [];
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt(site.domain, isDraft) });
      if (site.domain && !isDraft) this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml(site.domain, routes) });
      this.emitFile({ type: 'asset', fileName: '_routes.json', source: JSON.stringify({ version: 1, include: ['/api/*'], exclude: [] }) });
      this.emitFile({ type: 'asset', fileName: '_redirects', source: investorRoutes.filter(route => route !== '/').map(route => `${route}/ ${route} 301`).join('\n') + '\n' });
      this.emitFile({ type: 'asset', fileName: '_headers', source: `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'\n${isDraft ? '  X-Robots-Tag: noindex, nofollow\n' : ''}` });
    },
    async closeBundle() {
      if (!building) return;
      const count = await prerender(resolve('dist'));
      console.log(`Prerendered ${count} complete HTML pages, including localized investor pages and a static 404.`);
    },
  }],
  server: { host: '127.0.0.1', port: 4173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  };
});
