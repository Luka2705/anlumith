import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, ArrowDown, ArrowRight, Check, Plus, Music2, Users, Globe2, RefreshCw } from 'lucide-react';
import { scaleBand, scaleLinear } from 'd3-scale';
import i18n, { detectLocale, formatNumber, locales } from './i18n.js';
import { historicalSnapshot, HOUR, METRICS, PERIODS, snapshotState, validateSnapshot } from './metrics.js';
import { company } from '../site.js';
import { updateSeo } from './seo.js';
import { screenshotImages } from './image-assets.js';
import CommunityWorldMap from './CommunityWorldMap.jsx';

const appStore = 'https://apps.apple.com/de/app/echo-music/id6749182326';
const playStore = 'https://play.google.com/store/apps/details?id=com.anlumith.echo';
const icons = [Music2, Users, Globe2];
const mail = t => `mailto:${company.email}?subject=${encodeURIComponent(`Echo Music — ${t('deck')}`)}`;

function Screenshot({ name, alt, priority = false, sizes = '(max-width: 600px) 44vw, 280px' }) {
  const image = screenshotImages[name];
  return <img src={image.src} srcSet={image.srcSet} sizes={sizes} alt={alt} width={image.width} height={image.height}
    loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} decoding="async" />;
}

function InvestorBrief({ data, status, t, locale, n }) {
  return <main id="echo-content" className="echo-wrap investor-brief section-space">
    <p className="echo-eyebrow">{t('investorBrief')}</p><h1 className="display-heading">{t('investorPageTitle')}</h1>
    <p className="investor-position">{t('investorPosition')}</p><p className="section-body">{t('investorIntro')}</p>
    <div className="hero-actions"><a className="echo-button primary" href="#contact">{t('deck')}<ArrowUpRight size={18} /></a><a className="text-link" href={`/${locale}#product`}>{t('explore')}<ArrowUpRight size={18} /></a></div>
    <section className="brief-traction" aria-labelledby="brief-traction-title"><h2 id="brief-traction-title">{t('dashboardTitle')}</h2>{status}
      <dl className="brief-numbers">{['totalUsers', 'newUsers', 'contributors', 'sharedSongs'].map(key => <div key={key}><dt>{t(key)}</dt><dd>{n(key === 'totalUsers' ? data.totalUsers : data.periods['3m'][key])}</dd><small>{t(key === 'totalUsers' ? data.source === 'historical' ? 'historical' : 'lastRefresh' : 'threeMonths')}</small></div>)}</dl>
      <p className="section-body">{t(data.source === 'firebase' ? 'liveContributorDef' : 'contributorDef')}</p><a className="text-link" href={`/${locale}#traction`}>{t('definitions')}<ArrowUpRight size={17} /></a>
    </section>
    <CommunityWorldMap locale={locale} t={t} embedded />
    <section className="brief-story"><div><h2>{t('investorOpportunity')}</h2><p>{t('investorOpportunityBody')}</p><a className="text-link" href={`/${locale}#world-map`}>{t('mapNav')}<ArrowUpRight size={17} /></a></div><div><h2>{t('founderTitle')}</h2><p>{t('founderBody')}</p><a className="text-link" href={mail(t)}>{t('founder')}<ArrowUpRight size={17} /></a></div></section>
    <section id="contact" className="brief-contact"><div><p className="echo-eyebrow">{t('contactEyebrow')}</p><h2>{t('investorDiligence')}</h2><p className="section-body">{t('investorDiligenceBody')}</p><a className="text-link" href={mail(t)}>{company.email}<ArrowUpRight size={17} /></a></div><ContactForm t={t} locale={locale} /></section>
  </main>;
}

function useMetrics() {
  const [data, setData] = useState(historicalSnapshot);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const active = useRef(null);
  async function refresh() {
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    const timeout = setTimeout(() => controller.abort(), 12000);
    setLoading(true); setError(false);
    try {
      const response = await fetch('/api/metrics', { signal: controller.signal, cache: 'no-store' });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Unavailable');
      const value = validateSnapshot(await response.json());
      if (active.current === controller) {
        setData(previous => previous.generatedAt && previous.generatedAt > value.generatedAt ? previous : value);
        setNow(Date.now());
      }
    } catch { if (active.current === controller) setError(true); }
    finally { clearTimeout(timeout); if (active.current === controller) setLoading(false); }
  }
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, HOUR);
    const freshness = setInterval(() => setNow(Date.now()), 60000);
    return () => { active.current?.abort(); active.current = null; clearInterval(timer); clearInterval(freshness); };
  }, []);
  return { data, loading, error, refresh, state: snapshotState(data, now) };
}

function Bars({ entries, label, n, t }) {
  const width = 520, rowHeight = 56, height = entries.length * rowHeight + 30;
  const scale = scaleLinear().domain([0, Math.max(1, ...entries.map(entry => entry.value))]).range([0, 350]);
  const rows = scaleBand().domain(entries.map(entry => entry.key)).range([8, entries.length * rowHeight + 8]).padding(0.4);
  return <svg className="metric-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
    <title>{label}</title><desc>{entries.map(entry => `${t(entry.key)}: ${n(entry.value)}`).join('; ')}</desc>
    {entries.map((entry, index) => <g key={entry.key}>
      <text x="0" y={rows(entry.key) + 1} className="chart-label">{t(entry.key)}</text>
      <rect x="0" y={rows(entry.key) + 12} width="350" height="8" rx="4" className="chart-track" />
      <rect x="0" y={rows(entry.key) + 12} width={scale(entry.value)} height="8" rx="4" className={`chart-bar tone-${index}`} />
      <text x="515" y={rows(entry.key) + 22} textAnchor="end" className="chart-value">{n(entry.value)}</text>
    </g>)}
    <text x="0" y={height - 2} className="chart-axis">0</text>
    <text x="350" y={height - 2} textAnchor="end" className="chart-axis">{n(Math.max(...entries.map(entry => entry.value)))}</text>
  </svg>;
}

function Definition({ metric, data, t }) {
  const key = { totalUsers: 'totalDef', newUsers: 'newDef', activeUsers: 'activeDef', contributors: data.source === 'firebase' ? 'liveContributorDef' : 'contributorDef', sharedSongs: 'songDef' }[metric];
  return <details className="definition"><summary aria-label={`${t(metric)} — ${t('definitionsLabel')}`}><span aria-hidden="true">i</span></summary><p>{t(key)}</p></details>;
}

function ContactForm({ t, locale }) {
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const pending = useRef(false);
  const started = useRef(Date.now());
  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    if (!form.checkValidity() || !values.name.trim() || !values.consent) { setError('validation'); return; }
    pending.current = true; setState('submitting'); setError('');
    try {
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, locale, startedAt: started.current }), signal: AbortSignal.timeout(15000) });
      if (!response.ok) { setError(response.status === 503 ? 'formUnavailable' : 'formError'); setState('idle'); return; }
      const result = await response.json();
      if (result.ok !== true) throw new Error('Delivery not confirmed');
      setState('success'); form.reset();
    } catch { setError('formError'); setState('idle'); }
    finally { pending.current = false; }
  }
  return <form className="investor-form" onSubmit={submit} aria-label={t('formLabel')} noValidate>
    {state === 'success' ? <div className="form-success" role="status"><Check size={32} /><p>{t('success')}</p></div> : <>
      <div className="form-row"><label>{t('name')}<input name="name" autoComplete="name" required maxLength={120} /></label><label>{t('email')}<input name="email" type="email" autoComplete="email" required maxLength={254} /></label></div>
      <label>{t('organization')} <span>({t('optional')})</span><input name="organization" autoComplete="organization" maxLength={160} /></label>
      <label>{t('message')} <span>({t('optional')})</span><textarea name="message" rows="3" maxLength={3000} /></label>
      <div className="honey" aria-hidden="true"><label>Website<input name="website" tabIndex="-1" autoComplete="off" /></label></div>
      <label className="consent"><input type="checkbox" name="consent" required /><span>{t('consent')} <a href={`/${locale}/privacy`}>{t('privacy')} ↗</a></span></label>
      {error && <p className="form-error" role="alert">{t(error)} <a href={mail(t)}>{t('directEmail')} ↗</a></p>}
      <button className="echo-button primary" type="submit" disabled={state === 'submitting'}>{t(state === 'submitting' ? 'submitting' : 'submit')}<ArrowUpRight size={18} /></button>
      <p className="form-privacy">{t('privacyNote')}</p>
    </>}
  </form>;
}

function LegalPage({ page, t, locale }) {
  return <main id="echo-content" className="echo-wrap echo-legal"><a href={`/${locale}`} className="text-link">← {t('back')}</a>
    <p className="echo-eyebrow">ECHO MUSIC / ANLUMITH</p><h1>{t(page === 'privacy' ? 'privacyTitle' : page === 'cookies' ? 'storageTitle' : 'legalTitle')}</h1>
    {page === 'privacy' ? <><p>{t('privacyIntro')}</p><h2>{t('controller')}</h2><Address /><p>{t('privacyBody')}</p><p>{t('contactPrivacy')}</p><p>{t('privacyRights')}</p><p>{t('hostingNotice')}</p></>
      : page === 'cookies' ? <><p>{t('storageBody')}</p><p>{t('hostingNotice')}</p></> : <><h2>{t('provider')}</h2><Address /><h2>{t('legalContact')}</h2><p><a href={`mailto:${company.email}`}>{company.email}</a><br /><a href={`tel:${company.phone.replace(/[^+\d]/g, '')}`}>{company.phone}</a></p><p>{t('hostingNotice')}</p></>}
  </main>;
}
function Address() { return <address>{company.legalName}<br />{company.legalForm}<br />{company.street}<br />{company.postalCode} {company.city}<br /><a href={`mailto:${company.email}`}>{company.email}</a></address>; }

export default function Investor({ initialLocale, initialPath } = {}) {
  const { t } = useTranslation();
  const [locale, setLocale] = useState(() => initialLocale || detectLocale());
  const [path, setPath] = useState(() => initialPath || window.location.pathname);
  const [period, setPeriod] = useState('3m');
  const metrics = useMetrics();
  const { data } = metrics;
  const n = value => formatNumber(value, locale);
  const three = data.periods['3m'];
  const current = data.periods[period];
  const subpage = path.split('/').filter(Boolean)[1];
  const legalPage = ['privacy', 'imprint', 'cookies'].includes(subpage);
  const investorPage = subpage === 'investors';
  const found = (path === '/' || locales.includes(path.split('/')[1])) && path.split('/').filter(Boolean).length <= 2 && (!subpage || legalPage || investorPage);

  useEffect(() => {
    if (initialPath && initialPath !== location.pathname) setPath(location.pathname);
    const handle = () => { const next = detectLocale(); i18n.changeLanguage(next); setPath(location.pathname); setLocale(next); };
    window.addEventListener('popstate', handle);
    return () => window.removeEventListener('popstate', handle);
  }, []);
  useEffect(() => {
    const preferred = path === '/' ? detectLocale('/', navigator.languages) : locale;
    i18n.changeLanguage(preferred);
    document.documentElement.lang = preferred;
    document.body.classList.add('echo-body');
    if (path === '/' || locales.includes(path.split('/')[1])) {
      try { localStorage.setItem('echo-language', preferred); } catch { /* Optional preference. */ }
    }
    if (!locales.includes(path.split('/')[1]) && path === '/') {
      setLocale(preferred);
      history.replaceState({}, '', `/${preferred}${location.hash}`); setPath(`/${preferred}`);
    }
    return () => document.body.classList.remove('echo-body');
  }, [locale, path]);
  useEffect(() => {
    if (!location.hash) return;
    let target;
    try { target = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const frame = requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView());
    return () => cancelAnimationFrame(frame);
  }, [path]);
  useEffect(() => {
    updateSeo({ pathname: path, locale });
    document.querySelector('meta[name="theme-color"]').content = '#151515';
  }, [locale, path]);

  function changeLanguage(event, next) {
    event.preventDefault();
    const suffix = subpage ? `/${subpage}` : '';
    history.pushState({}, '', `/${next}${suffix}${location.hash}`);
    i18n.changeLanguage(next);
    setPath(`/${next}${suffix}`); setLocale(next);
  }
  const section = id => `/${locale}#${id}`;
  const status = <span className={`data-status ${metrics.state}`}><i />{t(metrics.state)}{data.generatedAt ? <> · <time dateTime={new Date(data.generatedAt).toISOString()}>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' }).format(data.generatedAt)} (Europe/Berlin)</time></> : <> · {t('unknownDate')}</>}</span>;

  return <div className="echo-site"><a className="skip" href="#echo-content">{t('skip')}</a>
    <header className="echo-header"><div className="echo-wrap echo-nav"><a href={`/${locale}`} className="echo-wordmark" aria-label={t('home')}><img src="/echo-icon-64.png" alt="" width="34" height="34" /><span>echo<span className="logo-dot">.</span></span></a>
      <nav className="echo-main-nav" aria-label={t('navigation')}><a href={section('product')}>{t('product')}</a><a href={section('world-map')}>{t('mapNav')}</a><a href={section('traction')}>{t('traction')}</a><a href={`/${locale}/investors`} aria-current={investorPage ? 'page' : undefined}>{t('investorNav')}</a></nav>
      <div className="echo-nav-right"><nav className="echo-languages" aria-label={t('language')}>{locales.map(next => <a href={`/${next}${subpage ? '/' + subpage : ''}`} lang={next} key={next} aria-current={next === locale ? 'true' : undefined} onClick={event => changeLanguage(event, next)}>{next.toUpperCase()}</a>)}</nav><a className="echo-button nav-deck" href={section('contact')}>{t('deck')}<ArrowUpRight size={16} /></a></div>
    </div></header>
    {!found ? <main id="echo-content" className="echo-wrap echo-legal"><h1>{t('notFound')}</h1><a href={`/${locale}`}>{t('back')}</a></main> : legalPage ? <LegalPage page={subpage} t={t} locale={locale} /> : investorPage ? <InvestorBrief data={data} status={status} t={t} locale={locale} n={n} /> : <main id="echo-content">
      <section className="echo-hero echo-wrap" aria-labelledby="echo-hero-title"><div className="hero-copy"><p className="echo-eyebrow"><span className="tiny-dot" />{t('investor')}</p><h1 id="echo-hero-title">{t('hero1')}<br /><em>{t('hero2')}</em></h1><p className="hero-sub">{t('heroSub')}</p><p className="hero-category">{t('productSummary')}</p><p className="hero-joined"><span className="joined-line" />{t('joined', { count: n(data.totalUsers) })}</p><p className="hero-data-note">{t(metrics.state === 'historical' ? 'historicalShort' : metrics.state)}</p><div className="hero-actions"><a className="echo-button primary" href="#product">{t('explore')}<ArrowUpRight size={18} /></a><a className="echo-button ghost" href="#traction">{t('seeTraction')}<ArrowDown size={17} /></a></div></div>
        <div className="hero-visual"><div className="visual-top"><span>ECHO MUSIC</span><Music2 size={19} /></div><div className="hero-phone original-screen"><Screenshot name="feed-original" alt={t('feedVisual')} priority sizes="240px" /></div><div className="visual-caption"><span>{t('heroNote')}</span><span>↗</span></div></div>
        <div className="hero-bottom"><span>{t('built')}</span><a href="#moment">{t('scroll')}<ArrowDown size={15} /></a><span>iOS & Android</span></div>
      </section>

      <section id="moment" className="traction-moment"><div className="echo-wrap"><div className="moment-heading"><p className="echo-eyebrow">{t('actual')}</p><h2>{t('moment1')}<br /><span>{t('moment2')}</span></h2><p>{t('momentIntro')}</p></div><div className="moment-total"><strong className="number-reveal">{n(data.totalUsers)}</strong><div><span>{t('totalUsers')}</span><small>{t(metrics.state === 'historical' ? 'historicalShort' : metrics.state)}</small></div></div>
      <div className="moment-grid">{METRICS.map(key => <div key={key}><strong>{n(three[key])}</strong><span>{t(key)}</span><small>{t('threeMonths')}</small></div>)}</div><div className="moment-foot"><span>{t('built')}</span><a href="#traction">{t('seeTraction')}<ArrowDown size={16} /></a></div></div></section>

      <section id="product" className="echo-product echo-wrap section-space"><div className="product-copy"><p className="echo-eyebrow">{t('productEyebrow')}</p><h2 className="display-heading">{t('productTitle')}</h2><p className="section-body">{t('productBody')}</p><ul className="product-features">{['productFeature1', 'productFeature2', 'mapFeature'].map((key, index) => { const Icon = icons[index]; return <li key={key}><Icon size={19} />{t(key)}</li>; })}</ul><div className="store-links"><a href={appStore}>{t('ios')}<ArrowUpRight size={16} /></a><a href={playStore}>{t('android')}<ArrowUpRight size={16} /></a></div></div><div className="product-visuals"><div className="product-phone phone-back original-screen"><Screenshot name="map-asia" alt={t('mapVisualAsia')} /></div><div className="product-phone phone-front original-screen"><Screenshot name="feed-original" alt={t('feedVisual')} /></div><span className="visual-source">{t('providedVisuals')}</span></div></section>

      <CommunityWorldMap locale={locale} t={t} />
      <details className="map-product-details"><summary className="echo-wrap">{t('geoAppScreenshots')}<Plus size={17} /></summary><div className="echo-wrap world-map-layout"><div className="world-map-copy"><p className="echo-eyebrow"><Globe2 size={16} />{t('mapEyebrow')}</p><h2 id="world-map-title" className="display-heading">{t('mapTitle')}</h2><p className="section-body">{t('mapBody')}</p><p className="section-body">{t('mapDetail')}</p><a className="text-link" href={appStore}>{t('mapApp')}<ArrowUpRight size={18} /></a><p className="map-image-note">{t('mapImageNote')}</p></div><div className="world-map-gallery">{[{ source: 'map-americas', caption: 'mapAmericas', alt: 'mapVisualAmericas' }, { source: 'map-asia', caption: 'mapAsia', alt: 'mapVisualAsia' }].map(image => <figure key={image.source}><a className="map-original-link" href={`/echo/${image.source}.png`} target="_blank" rel="noreferrer" aria-label={`${t('openOriginal')} — ${t(image.caption)}`}><Screenshot name={image.source} alt={t(image.alt)} /></a><figcaption><span>{t(image.caption)}</span><a href={`/echo/${image.source}.png`} target="_blank" rel="noreferrer">{t('openOriginal')}<ArrowUpRight size={13} /></a></figcaption></figure>)}</div></div></details>

      <section id="traction" className="echo-dashboard section-space"><div className="echo-wrap"><div className="section-top"><div><p className="echo-eyebrow">{t('dashboardEyebrow')}</p><h2 className="display-heading">{t('dashboardTitle')}</h2><p className="section-body">{t('dashboardIntro')}</p></div><a className="text-link" href="#contact">{t('deck')}<ArrowUpRight size={18} /></a></div>
        <div className="dashboard-toolbar">{status}<div className="period-selector" role="group" aria-label={t('periodLabel')}>{PERIODS.map(key => <button key={key} type="button" aria-pressed={period === key} onClick={() => setPeriod(key)}>{t(`periods.${key}`)}</button>)}</div></div>
        <div className="refresh-notice" aria-live="polite">{metrics.loading ? t('refreshing') : metrics.error ? <>{t('refreshError')} <button onClick={metrics.refresh}><RefreshCw size={13} />{t('retry')}</button></> : data.source === 'historical' ? t('snapshotNote') : <>{t('lastRefresh')}: {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' }).format(data.generatedAt)} (Europe/Berlin)</>}</div>
        <div className="dashboard-kpis" aria-live="polite" aria-atomic="true"><div className="dashboard-total"><div className="kpi-label">{t('totalUsers')}<Definition metric="totalUsers" data={data} t={t} /></div><strong>{n(data.totalUsers)}</strong><small>{t(metrics.state === 'historical' ? 'historical' : metrics.state)}</small></div>{METRICS.map(key => <div key={key}><div className="kpi-label">{t(key)}<Definition metric={key} data={data} t={t} /></div><strong key={`${key}-${period}`}>{n(current[key])}</strong><small>{t(`periods.${period}`)}</small></div>)}</div>
        <div className="chart-grid">{[
          { title: 'acquisition', note: 'acquisitionNote', keys: ['newUsers'] },
          { title: 'communityActivity', note: 'activityNote', keys: ['activeUsers', 'contributors'] },
          { title: 'sharing', note: 'sharingNote', keys: ['sharedSongs'] },
          { title: 'engagement', note: 'engagementNote', keys: ['contributors'] },
        ].map((chart, index) => <figure className="chart-panel" key={chart.title}><figcaption><span className="chart-index">0{index + 1}</span><h3>{t(chart.title)}</h3><span className="chart-period">{t(`periods.${period}`)}</span></figcaption><p>{t(chart.note)}</p><Bars entries={chart.keys.map(key => ({ key, value: current[key] }))} label={`${t(chart.title)} — ${t(`periods.${period}`)}`} t={t} n={n} /><div className="chart-caption"><span className="tiny-dot" />{t('periodTotal')}</div></figure>)}</div>
        <p className="totals-note">{t('totalsOnly')}</p>
        {period === '24h' && data.growth24h !== null && <div className="growth-note"><strong>{t('growth', { value: `${data.growth24h > 0 ? '+' : ''}${n(data.growth24h)}` })}</strong><span>{t('growthNote')}</span></div>}
        <details className="metric-methodology"><summary>{t('definitions')}<Plus size={17} /></summary><div>{['totalUsers', ...METRICS].map(key => <div key={key}><h4>{t(key)}</h4><p>{t({ totalUsers: 'totalDef', newUsers: 'newDef', activeUsers: 'activeDef', contributors: data.source === 'firebase' ? 'liveContributorDef' : 'contributorDef', sharedSongs: 'songDef' }[key])}</p></div>)}<p>{t('periodsDef')}</p></div></details>
      </div></section>

      <section className="echo-story echo-wrap section-space"><p className="echo-eyebrow">{t('storyEyebrow')}</p><h2 className="display-heading">{t('storyTitle')}</h2><div className="story-rows">{[{ key: 'newUsers', title: 'story1', body: 'story1Body' }, { key: 'contributors', title: 'story2', body: 'story2Body' }, { key: 'sharedSongs', title: 'story3', body: 'story3Body' }].map((story, index) => <article key={story.key}><span className="story-index">0{index + 1}</span><div><h3>{t(story.title)}</h3><p>{t(story.body)}</p></div><div className="story-number"><strong>{n(three[story.key])}</strong><span>{t(story.key)} · {t('threeMonths')}</span></div></article>)}</div><div className="participation"><div><h3>{t('participationTitle')}</h3><p>{t('participationBody')}</p></div><div className="participation-values">{['contributors', 'activeUsers'].map(key => <div key={key}><strong>{n(three[key])}</strong><span>{t(key)}<Definition metric={key} data={data} t={t} /></span><small>{t('threeMonths')}</small></div>)}</div></div><p className="story-source">{status}</p></section>

      <section id="opportunity" className="echo-opportunity section-space"><div className="echo-wrap"><p className="echo-eyebrow">{t('opportunityEyebrow')}</p><div className="section-top"><h2 className="display-heading">{t('opportunityTitle')}</h2><a href="#contact" className="text-link">{t('founder')}<ArrowUpRight size={18} /></a></div><div className="opportunity-stages">{['stageProduct', 'stageTraction', 'stageCommunity', 'stageGrowth', 'stageNext'].map((key, index) => <div key={key}><span className="stage-dot">{index === 4 ? <ArrowRight size={15} /> : <Check size={13} />}</span><span className="stage-label">{t(`stages.${index}`)}</span><p>{t(key, { count: n(index === 1 ? data.totalUsers : index === 2 ? three.contributors : three.newUsers) })}</p></div>)}</div><p className="roadmap-note">{t('roadmapNote')}</p></div></section>

      <section className="echo-faq echo-wrap section-space" aria-labelledby="echo-faq-title"><p className="echo-eyebrow">ECHO MUSIC</p><h2 id="echo-faq-title" className="display-heading">{t('faqTitle')}</h2><div>{t('faqs', { returnObjects: true }).map(item => <details key={item.question}><summary>{item.question}<Plus size={17} /></summary><p>{item.answer}</p></details>)}</div><a className="text-link" href={`/${locale}/investors`}>{t('investorBrief')}<ArrowUpRight size={17} /></a></section>

      <section id="contact" className="echo-contact echo-wrap section-space"><div><p className="echo-eyebrow">{t('contactEyebrow')}</p><h2 className="display-heading">{t('contactTitle')}</h2><p className="section-body">{t('contactBody')}</p><a className="founder-link" href={mail(t)}>{company.legalName}<ArrowUpRight size={20} /><span>{t('founder')}</span></a><a className="text-link" href={appStore}>{t('exploreApp')}<ArrowUpRight size={17} /></a></div><ContactForm t={t} locale={locale} /></section>
    </main>}
    <footer className="echo-footer"><div className="echo-wrap"><div className="footer-top"><a href={`/${locale}`} className="echo-wordmark" aria-label={t('home')}><img src="/echo-icon-64.png" width="30" height="30" alt="" /><span>echo.</span></a><p>{t('footerLine')}</p><a href={section('contact')}>{t('founder')}<ArrowUpRight size={15} /></a></div><div className="footer-bottom"><p>© {new Date().getFullYear()} Echo Music · ANLUMITH. {t('rights')}</p><nav aria-label={t('imprint')}><a href={`/${locale}/investors`}>{t('investorNav')}</a><a href={`/${locale}/privacy`}>{t('privacy')}</a><a href={`/${locale}/imprint`}>{t('imprint')}</a><a href={`/${locale}/cookies`}>{t('cookies')}</a></nav></div></div></footer>
  </div>;
}
