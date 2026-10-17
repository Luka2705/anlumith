import { LANGUAGES, escapeHtml } from '../src/investor/seo.js';

export function sitemapXml(domain, routes) {
  const entries = [...new Set(routes.filter(route => route !== '/'))].map(route => {
    const url = new URL(route, domain).href;
    const parts = route.split('/').filter(Boolean);
    const page = LANGUAGES.includes(parts[0]) ? parts.slice(1).join('/') : null;
    const alternates = page !== null ? [...LANGUAGES, 'x-default'].map(language => `<xhtml:link rel="alternate" hreflang="${language}" href="${escapeHtml(new URL(`/${language === 'x-default' ? 'en' : language}${page ? '/' + page : ''}`, domain).href)}"/>`).join('') : '';
    return `<url><loc>${escapeHtml(url)}</loc>${alternates}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries.join('')}</urlset>`;
}
export function robotsTxt(domain, draft) {
  if (draft || !domain) return 'User-agent: *\nDisallow: /\n';
  return `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /404.html\nSitemap: ${new URL('/sitemap.xml', domain).href}\n`;
}
