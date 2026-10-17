import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en, de, es } from './translations.js';
export const locales = ['en', 'de', 'es'];
export function detectLocale(path = typeof window === 'undefined' ? '/' : window.location.pathname, languages = typeof navigator === 'undefined' ? [] : navigator.languages) {
  const explicit = path.split('/')[1];
  if (locales.includes(explicit)) return explicit;
  if (typeof window !== 'undefined') {
    try { const saved = globalThis.localStorage?.getItem('echo-language'); if (locales.includes(saved)) return saved; } catch { /* Storage can be disabled. */ }
  }
  return (languages || []).map(language => language.split('-')[0]).find(language => locales.includes(language)) || 'en';
}
export const formatNumber = (value, locale) => new Intl.NumberFormat(locale, { useGrouping: 'always', maximumFractionDigits: 1 }).format(value);
i18n.use(initReactI18next).init({ resources: { en: { translation: en }, de: { translation: de }, es: { translation: es } }, lng: detectLocale(), fallbackLng: 'en', interpolation: { escapeValue: false }, returnNull: false });
export default i18n;
