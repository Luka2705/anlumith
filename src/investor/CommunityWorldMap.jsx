import { useEffect, useMemo, useRef, useState } from 'react';
import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import { ArrowUpRight, Globe2, RefreshCw } from 'lucide-react';
import { formatNumber } from './i18n.js';
import { GEO_HOUR, validateGeography } from './geography.js';
import './community-map.css';

const WIDTH = 1000, HEIGHT = 540;
const projection = geoNaturalEarth1().fitExtent([[22, 18], [WIDTH - 22, HEIGHT - 22]], { type: 'Sphere' });
const path = geoPath(projection);
const sphere = path({ type: 'Sphere' });
const graticule = path(geoGraticule10());

export function isLiveMapSnapshot(data, { now = Date.now(), landReady = false, failed = false } = {}) {
  return Boolean(data?.source === 'firebase' && landReady && !failed && data.generatedAt <= now && now - data.generatedAt <= 2 * GEO_HOUR);
}

export default function CommunityWorldMap({ locale, t, embedded = false }) {
  const [data, setData] = useState(null);
  const [land, setLand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [landError, setLandError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const request = useRef(null), landRequest = useRef(null);
  const n = value => formatNumber(value, locale);
  const date = value => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' }).format(value);

  async function refresh() {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 45000);
    setLoading(true); setError(false);
    try {
      const response = await fetch('/api/geography', { signal: controller.signal, cache: 'no-store' });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Unavailable');
      const next = validateGeography(await response.json());
      if (request.current === controller) {
        setData(previous => previous?.generatedAt > next.generatedAt ? previous : next);
        setNow(Date.now());
      }
    } catch { if (request.current === controller) setError(true); }
    finally { clearTimeout(timeout); if (request.current === controller) setLoading(false); }
  }
  async function loadLand() {
    landRequest.current?.abort();
    const controller = new AbortController(); landRequest.current = controller; setLandError(false);
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch('/maps/world-land.geojson', { signal: controller.signal });
      if (!response.ok) throw new Error('Unavailable');
      const geometry = await response.json();
      if (geometry.type !== 'FeatureCollection' || !Array.isArray(geometry.features)) throw new Error('Invalid geography');
      if (landRequest.current === controller) setLand(geometry);
    } catch { if (landRequest.current === controller) setLandError(true); }
    finally { clearTimeout(timeout); }
  }
  useEffect(() => {
    refresh(); loadLand();
    const timer = setInterval(refresh, GEO_HOUR), freshness = setInterval(() => setNow(Date.now()), 60000);
    return () => {
      request.current?.abort(); request.current = null; landRequest.current?.abort(); landRequest.current = null;
      clearInterval(timer); clearInterval(freshness);
    };
  }, []);
  const landPath = useMemo(() => land ? path(land) : null, [land]);
  const dots = useMemo(() => (data?.cells || []).map(cell => ({ ...cell, point: projection([cell.longitude, cell.latitude]) })).filter(cell => cell.point), [data]);
  const live = isLiveMapSnapshot(data, { now, landReady: Boolean(land), failed: error || landError });
  return <section id="world-map" className={`community-map-section${embedded ? ' community-map--embedded' : ''}`} aria-labelledby="community-map-title">
    <div className={`community-map-layout${embedded ? '' : ' echo-wrap'}`}>
      <div className="community-map-heading"><p className="echo-eyebrow"><Globe2 size={15} />{t('geoEyebrow')}</p>
        <h2 id="community-map-title" className="display-heading">{t('geoTitle')}</h2><p className="section-body">{t('geoIntro')}</p>
        <p className={`community-map-live${live ? ' is-live' : ''}`} aria-live="polite"><i aria-hidden="true" />{t(data ? live ? 'geoLive' : 'geoStale' : 'geoPeriod')}</p>
        <p className="community-map-cadence">{t('geoHourly')}</p>
      </div>
      <div className="community-map-preview">
        <figure className="community-map-figure" aria-busy={loading}>
          <div className="community-map-topline"><span className="community-map-legend"><i aria-hidden="true" />{t('geoLegend')}</span></div>
          <div className="community-map-canvas">
            <svg className="community-map-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={t('geoMapLabel')} aria-describedby="community-map-help">
              <title>{t('geoMapLabel')}</title><desc>{data ? t('geoMapDescription', { posts: n(data.locatedSongPosts), regions: n(data.cells.length) }) : t('geoNoData')}</desc>
              <path d={sphere} className="community-map-ocean" /><path d={graticule} className="community-map-grid" vectorEffect="non-scaling-stroke" />
              {landPath && <path d={landPath} className="community-map-land" vectorEffect="non-scaling-stroke" />}
              {landPath && dots.map(cell => <circle key={`${cell.latitude}:${cell.longitude}`} cx={cell.point[0]} cy={cell.point[1]} r="3"
                className="community-map-dot" vectorEffect="non-scaling-stroke"><title>{t('geoCell', { count: n(cell.songPosts) })}</title></circle>)}
            </svg>
            {(!data || !land || data.locatedSongPosts === 0) && <div className="community-map-message" role="status">{loading || !land && !landError ? t('geoLoading') : error || landError ? t('geoError') : t('geoEmpty')}</div>}
          </div>
          <figcaption><span id="community-map-help">{t('geoPrivacy')}</span><a href="/maps/ATTRIBUTION.txt" target="_blank" rel="noreferrer">Natural Earth<ArrowUpRight size={12} /></a></figcaption>
        </figure>
        <div className="community-map-status" aria-live="polite"><div>{data && <><span>{t('geoWindow')}: {date(data.windowStart)} — {date(data.windowEnd)} (Europe/Berlin)</span><span>{t('geoUpdated')}: {date(data.generatedAt)} · {t('geoOmitted', { count: n(data.unlocatedSongPosts) })}</span></>}{(error || landError) && <span className="community-map-error">{t(data ? 'geoRefreshError' : 'geoError')}</span>}</div>{(error || landError) && <button type="button" onClick={() => { refresh(); if (!land) loadLand(); }} disabled={loading}><RefreshCw size={14} />{t('retry')}</button>}</div>
      </div>
    </div>
  </section>;
}
