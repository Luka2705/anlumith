import CompanyApp from './CompanyApp.jsx';
import Investor from './investor/Investor.jsx';
import './investor/investor.css';

export default function App({ pathname = typeof window === 'undefined' ? '/' : window.location.pathname, initialLocale }) {
  const path = pathname;
  if (['/kontakt/', '/impressum/', '/datenschutz/', '/cookies/'].includes(`${path.replace(/\/$/, '')}/`)) return <CompanyApp pathname={path} />;
  if (path === '/company' || path === '/company/') return <CompanyApp pathname="/" />;
  return <Investor initialPath={path} initialLocale={initialLocale} />;
}
