import { useEffect, useMemo, useRef, useState } from 'react';
import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import { ArrowUpRight, Globe2, Minus, Plus, RefreshCw, RotateCcw, X } from 'lucide-react';
import { formatNumber } from './i18n.js';
import { GEO_HOUR, validateGeography } from './geography.js';
import './community-map.css';

const WIDTH = 1000, HEIGHT = 540;
const projection = geoNaturalEarth1().fitExtent([[22, 18], [WIDTH - 22, HEIGHT - 22]], { type: 'Sphere' });
const path = geoPath(projection);
const sphere = path({ type: 'Sphere' });
const graticule = path(geoGraticule10());

export default function CommunityWorldMap({ locale, t, embedded = false }) {
  const [data, setData] = useState(null);
  const [land, setLand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [landError, setLandError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [view, setView] = useState({ zoom: 1, x: WIDTH / 2, y: HEIGHT / 2 });
  const [selected, setSelected] = useState(null);
  const request = useRef(null), landRequest = useRef(null), drag = useRef(null), moved = useRef(false);
  const n = value => formatNumber(value, locale);
  const date = value => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' }).format(value);
  const coordinates = cell => `${t('geoLatitude')} ${n(cell.latitude)}° · ${t('geoLongitude')} ${n(cell.longitude)}°`;

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
        setSelected(null); setNow(Date.now());
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
  const stale = data && now - data.generatedAt > 2 * GEO_HOUR;
  const clampView = value => ({ ...value,
    x: Math.max(WIDTH / (2 * value.zoom), Math.min(WIDTH - WIDTH / (2 * value.zoom), value.x)),
    y: Math.max(HEIGHT / (2 * value.zoom), Math.min(HEIGHT - HEIGHT / (2 * value.zoom), value.y)),
  });
  function zoom(factor) { setView(previous => clampView({ ...previous, zoom: Math.min(5, Math.max(1, previous.zoom * factor)) })); }
  function pan(event) {
    if (!drag.current) return;
    const start = drag.current;
    const bounds = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - start.x) * WIDTH / bounds.width / view.zoom;
    const dy = (event.clientY - start.y) * HEIGHT / bounds.height / view.zoom;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
    setView(previous => clampView({ ...previous, x: start.centerX - dx, y: start.centerY - dy }));
  }
  function keyboard(event) {
    if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(1.5); return; }
    if (event.key === '-') { event.preventDefault(); zoom(1 / 1.5); return; }
    if (event.key === 'Home') { event.preventDefault(); setView({ zoom: 1, x: WIDTH / 2, y: HEIGHT / 2 }); return; }
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (view.zoom > 1 && directions[event.key]) {
      event.preventDefault(); const [x, y] = directions[event.key];
      setView(previous => clampView({ ...previous, x: previous.x + x * 75 / previous.zoom, y: previous.y + y * 75 / previous.zoom }));
    }
  }
  return <section id="world-map" className={`community-map-section ${embedded ? 'community-map--embedded' : 'section-space'}`} aria-labelledby="community-map-title">
    <div className={embedded ? '' : 'echo-wrap'}>
      <div className="community-map-heading"><div><p className="echo-eyebrow"><Globe2 size={15} />{t('geoEyebrow')}</p>
        <h2 id="community-map-title" className="display-heading">{t('geoTitle')}</h2><p className="section-body">{t('geoIntro')}</p></div>
        <span className="community-map-period">{t('geoPeriod')}</span></div>
      <div className="community-map-stats" aria-live="polite" aria-atomic="true">
        <div><strong>{data ? n(data.locatedSongPosts) : '—'}</strong><span>{t('geoLocated')}</span></div>
        <div><strong>{data ? n(data.cells.length) : '—'}</strong><span>{t('geoRegions')}</span></div>
        <div><strong>{data ? n(data.publicSongPosts) : '—'}</strong><span>{t('geoPublicPosts')}</span></div>
      </div>
      <figure className="community-map-figure" aria-busy={loading}>
        <div className="community-map-topline"><span className="community-map-legend"><i aria-hidden="true" />{t('geoLegend')}</span><span>{data ? t(stale ? 'geoStale' : 'geoHourly') : t('geoPeriod')}</span></div>
        <div className="community-map-canvas">
          <svg className="community-map-svg" viewBox={`${view.x - WIDTH / (2 * view.zoom)} ${view.y - HEIGHT / (2 * view.zoom)} ${WIDTH / view.zoom} ${HEIGHT / view.zoom}`} role="img" tabIndex="0" aria-label={t('geoMapLabel')} aria-describedby="community-map-help" data-zoomed={view.zoom > 1}
            onKeyDown={keyboard} onPointerDown={event => { moved.current = false; if (view.zoom === 1 || event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, centerX: view.x, centerY: view.y }; }}
            onPointerMove={pan} onPointerCancel={() => { drag.current = null; }} onPointerUp={event => { drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}>
            <title>{t('geoMapLabel')}</title><desc>{data ? t('geoMapDescription', { posts: n(data.locatedSongPosts), regions: n(data.cells.length) }) : t('geoNoData')}</desc>
            <path d={sphere} className="community-map-ocean" /><path d={graticule} className="community-map-grid" vectorEffect="non-scaling-stroke" />
            {landPath && <path d={landPath} className="community-map-land" vectorEffect="non-scaling-stroke" />}
            {landPath && dots.map(cell => <circle key={`${cell.latitude}:${cell.longitude}`} cx={cell.point[0]} cy={cell.point[1]} r={3 / view.zoom}
              className={`community-map-dot${selected === cell ? ' is-selected' : ''}`} vectorEffect="non-scaling-stroke"
              onClick={event => { event.stopPropagation(); if (!moved.current) setSelected(cell); }}><title>{t('geoCell', { count: n(cell.songPosts) })}</title></circle>)}
          </svg>
          <div className="community-map-controls" role="group" aria-label={t('geoControls')}>
            <button type="button" aria-label={t('geoZoomIn')} onClick={() => zoom(1.5)} disabled={view.zoom === 5}><Plus size={18} /></button>
            <button type="button" aria-label={t('geoZoomOut')} onClick={() => zoom(1 / 1.5)} disabled={view.zoom === 1}><Minus size={18} /></button>
            <button type="button" aria-label={t('geoReset')} onClick={() => setView({ zoom: 1, x: WIDTH / 2, y: HEIGHT / 2 })}><RotateCcw size={16} /></button>
          </div>
          {(!data || !land || data.locatedSongPosts === 0) && <div className="community-map-message" role="status">{loading || !land && !landError ? t('geoLoading') : error || landError ? t('geoError') : t('geoEmpty')}</div>}
          {selected && <div className="community-map-selection" role="status"><span>{t('geoCell', { count: n(selected.songPosts) })}<small>{coordinates(selected)}</small></span><button type="button" onClick={() => setSelected(null)} aria-label={t('geoClose')}><X size={15} /></button></div>}
        </div>
        <figcaption><span id="community-map-help">{t('geoPrivacy')}</span><a href="/maps/ATTRIBUTION.txt" target="_blank" rel="noreferrer">Natural Earth<ArrowUpRight size={12} /></a></figcaption>
      </figure>
      <div className="community-map-status" aria-live="polite"><div>{data && <><span>{t('geoWindow')}: {date(data.windowStart)} — {date(data.windowEnd)} (Europe/Berlin)</span><span>{t('geoOmitted', { count: n(data.unlocatedSongPosts) })}</span></>}{(error || landError) && <span className="community-map-error">{t(data ? 'geoRefreshError' : 'geoError')}</span>}</div><button type="button" onClick={() => { refresh(); if (!land) loadLand(); }} disabled={loading}><RefreshCw size={14} />{t('geoRefresh')}</button></div>
      {data && dots.length > 0 && <details className="community-map-table"><summary>{t('geoRegionList')}<Plus size={15} /></summary><div><table><caption>{t('geoMapDescription', { posts: n(data.locatedSongPosts), regions: n(data.cells.length) })}</caption><thead><tr><th scope="col">{t('geoRegion')}</th><th scope="col">{t('geoLocated')}</th></tr></thead><tbody>{dots.map(cell => <tr key={`${cell.latitude}:${cell.longitude}`}><td>{coordinates(cell)}</td><td>{n(cell.songPosts)}</td></tr>)}</tbody></table></div></details>}
    </div>
  </section>;
}
