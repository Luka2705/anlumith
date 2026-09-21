import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import site, { isDraft, routes } from './src/site.js';

export default defineConfig({
  plugins: [react(), {
    name: 'site-metadata',
    transformIndexHtml() {
      return isDraft ? [{ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' }, injectTo: 'head' }] : [];
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: isDraft ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n${site.domain ? `Sitemap: ${new URL(site.domain).origin}/sitemap.xml\n` : ''}` });
      if (site.domain && !isDraft) this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(route => `<url><loc>${new URL(route, site.domain).href}</loc></url>`).join('')}</urlset>` });
      this.emitFile({ type: 'asset', fileName: '_headers', source: `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'\n${isDraft ? '  X-Robots-Tag: noindex, nofollow\n' : ''}` });
    },
  }],
  server: { host: '127.0.0.1', port: 4173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
});
