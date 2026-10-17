import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.jsx';
import i18n from './investor/i18n.js';
import './styles.css';

const root = document.getElementById('root');
const start = () => {
  const application = <StrictMode><App initialLocale={root.dataset.locale} pathname={root.dataset.path || window.location.pathname} /></StrictMode>;
  if (root.dataset.prerendered === 'true') hydrateRoot(root, application);
  else createRoot(root).render(application);
};
// Hydrate in the exact language of the static HTML. Browser/saved preferences
// are applied by the root-page effect only after hydration has completed.
if (root.dataset.locale) i18n.changeLanguage(root.dataset.locale).then(start);
else start();
