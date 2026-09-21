import { useEffect } from 'react';
import site, { legal, isDraft, routes } from './site.js';
import { Page } from './components.jsx';
import Home from './pages/Home.jsx';
import Contact from './pages/Contact.jsx';
import Imprint from './pages/Imprint.jsx';
import Privacy from './pages/Privacy.jsx';
import Cookies from './pages/Cookies.jsx';

const pages = {
  '/kontakt/': { title: 'Sag Hallo.', meta: 'Kontakt', intro: <>Fragen zu unseren Produkten oder eine Idee?<br />Wir freuen uns, von dir zu hören.</>, Content: Contact },
  '/impressum/': { title: 'Impressum', intro: 'Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG).', legal: true, Content: Imprint },
  '/datenschutz/': { title: 'Datenschutz', intro: `Stand: ${legal.updated}`, legal: true, Content: Privacy },
  '/cookies/': { title: 'Cookie-Hinweise', intro: 'So geht diese Website mit lokalem Speicher um.', legal: true, Content: Cookies },
};

export default function App({ pathname = window.location.pathname }) {
  const route = `/${pathname.split('/').filter(Boolean).join('/')}${pathname === '/' ? '' : '/'}`;
  const selected = pages[route];
  const known = routes.includes(route);

  useEffect(() => {
    document.title = route === '/' ? 'ANLUMITH – Software. Einfach gedacht.' : `${selected?.meta || selected?.title || 'Seite nicht gefunden'} – ANLUMITH`;
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.append(robots); }
    robots.content = isDraft || !known ? 'noindex, nofollow' : 'index, follow';
    if (site.domain && known) {
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
      canonical.href = new URL(route, site.domain).href;
    }
    if (window.location.hash) document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView();
  }, [route, selected, known]);

  return <>
    <a className="skip" href="#inhalt">Zum Inhalt</a>
    <header className="site-header"><div className="wrap header-inner">
      <a className="wordmark" href="/" aria-label="ANLUMITH – Startseite">ANLUMITH</a>
      <nav className="nav" aria-label="Hauptnavigation"><a href="/#produkte">Produkte</a><a href="/kontakt/" aria-current={route === '/kontakt/' ? 'page' : undefined}>Kontakt</a></nav>
    </div></header>
    {route === '/' ? <Home /> : selected
      ? <Page title={selected.title} intro={selected.intro} legal={selected.legal}><selected.Content /></Page>
      : <Page title="Hier ist noch nichts." intro="Die gesuchte Seite existiert nicht oder wurde verschoben."><a href="/">Zur Startseite →</a></Page>}
    <footer className="site-footer"><div className="wrap footer-inner"><p>© {new Date().getFullYear()} ANLUMITH</p><nav className="footer-nav" aria-label="Rechtliche Informationen"><a href="/kontakt/">Kontakt</a><a href="/impressum/">Impressum</a><a href="/datenschutz/">Datenschutz</a><a href="/cookies/">Cookies</a></nav></div></footer>
  </>;
}
