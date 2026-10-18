import site, { isDraft } from '../site.js';
import { en, de, es } from './translations.js';
import { getScreenshotImage, getSocialImage } from './image-assets.js';

export const LANGUAGES = ['en', 'de', 'es'];
export const APP_STORE = 'https://apps.apple.com/app/echo-music/id6749182326';
export const PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.anlumith.echo';
export const investorRoutes = ['/', ...LANGUAGES.flatMap(language => ['', '/investors', '/privacy', '/imprint', '/cookies'].map(page => `/${language}${page}`))];
const copy = { en, de, es };
export function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
export function safeJson(value) { return JSON.stringify(value).replace(/</g, '\\u003c'); }

export function pageSeo({ pathname = '/', locale = 'en', domain = site.domain, draft = isDraft } = {}) {
  const strings = copy[locale] || en;
  const clean = pathname.replace(/\/$/, '') || '/';
  const page = clean.split('/')[2] || '';
  const known = investorRoutes.includes(clean);
  const title = !known ? `${strings.notFound} — echo music` : page === 'investors' ? strings.investorMetaTitle : page ? `${strings[page === 'privacy' ? 'privacyTitle' : page === 'imprint' ? 'legalTitle' : 'storageTitle']} — echo music` : strings.metaTitle;
  const description = page === 'investors' ? strings.investorMetaDescription : strings.metaDescription;
  const root = domain ? new URL('/', domain).href : null;
  const canonicalPath = clean === '/' ? '/en' : clean;
  const canonical = root && known ? new URL(canonicalPath, root).href : null;
  const alternates = root && known ? [...LANGUAGES, 'x-default'].map(language => ({ language,
    href: new URL(`/${language === 'x-default' ? 'en' : language}${page ? '/' + page : ''}`, root).href })) : [];
  const socialImage = getSocialImage(locale);
  const image = root ? new URL(socialImage.src, root).href : null;
  const graph = root && known ? [
    { '@type': 'Organization', '@id': `${root}#organization`, name: 'ANLUMITH', url: new URL('/company/', root).href,
      founder: { '@id': `${root}#founder` }, brand: { '@type': 'Brand', name: 'echo music' }, email: site.company.email },
    { '@type': 'Person', '@id': `${root}#founder`, name: site.company.legalName, worksFor: { '@id': `${root}#organization` } },
    { '@type': 'WebSite', '@id': `${root}#website`, name: 'echo music', alternateName: 'echo music by ANLUMITH', url: root,
      inLanguage: LANGUAGES, publisher: { '@id': `${root}#organization` } },
    { '@type': 'WebPage', '@id': `${canonical}#webpage`, url: canonical, name: title, description,
      inLanguage: locale, isPartOf: { '@id': `${root}#website` }, about: { '@id': `${root}#app` } },
    ...(!page || page === 'investors' ? [{ '@type': 'MobileApplication', '@id': `${root}#app`, name: 'echo music',
      description: strings.productSummary, operatingSystem: 'iOS, Android', applicationCategory: 'SocialNetworkingApplication',
      publisher: { '@id': `${root}#organization` }, creator: { '@id': `${root}#founder` },
      image, screenshot: ['feed-original', 'diary-original', 'map-americas', 'map-asia'].map(name => new URL(getScreenshotImage(name, locale).src, root).href),
      installUrl: [APP_STORE, PLAY_STORE], sameAs: [APP_STORE, PLAY_STORE] }] : []),
  ] : [];
  return { title, description, canonical, alternates, image, imageAlt: socialImage.alt, locale, known,
    robots: draft || !known ? 'noindex, follow' : 'index, follow, max-image-preview:large',
    structuredData: graph.length ? { '@context': 'https://schema.org', '@graph': graph } : null };
}

export function seoTags(options) {
  const seo = pageSeo(options);
  const socialImage = getSocialImage(seo.locale);
  const meta = (name, content, property = false) => `<meta ${property ? 'property' : 'name'}="${name}" content="${escapeHtml(content)}" data-echo-seo>`;
  return [`<title>${escapeHtml(seo.title)}</title>`, meta('description', seo.description), meta('robots', seo.robots),
    meta('apple-itunes-app', 'app-id=6749182326'),
    meta('og:type', 'website', true), meta('og:site_name', 'echo music', true), meta('og:title', seo.title, true),
    meta('og:description', seo.description, true), meta('og:locale', { en: 'en_US', de: 'de_DE', es: 'es_ES' }[seo.locale], true),
    ...LANGUAGES.filter(language => language !== seo.locale).map(language => meta('og:locale:alternate', { en: 'en_US', de: 'de_DE', es: 'es_ES' }[language], true)),
    meta('twitter:card', 'summary_large_image'), meta('twitter:title', seo.title), meta('twitter:description', seo.description),
    ...(seo.canonical ? [`<link rel="canonical" href="${escapeHtml(seo.canonical)}" data-echo-seo>`, meta('og:url', seo.canonical, true)] : []),
    ...seo.alternates.map(alternate => `<link rel="alternate" hreflang="${alternate.language}" href="${escapeHtml(alternate.href)}" data-echo-seo>`),
    ...(seo.image ? [meta('og:image', seo.image, true), meta('og:image:width', socialImage.width, true), meta('og:image:height', socialImage.height, true), meta('og:image:alt', seo.imageAlt, true), meta('twitter:image', seo.image), meta('twitter:image:alt', seo.imageAlt)] : []),
    ...(seo.structuredData ? [`<script type="application/ld+json" id="echo-structured-data" data-echo-seo>${safeJson(seo.structuredData)}</script>`] : []),
  ].join('\n');
}

export function updateSeo(options) {
  const seo = pageSeo(options);
  document.title = seo.title;
  document.querySelectorAll('[data-echo-seo],meta[name="description"],meta[name="robots"],link[rel="canonical"]').forEach(element => element.remove());
  const template = document.createElement('template'); template.innerHTML = seoTags(options);
  template.content.querySelector('title')?.remove();
  document.head.append(template.content);
}
