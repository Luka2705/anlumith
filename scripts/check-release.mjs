import site, { pendingFields, legal } from '../src/site.js';

const missing = [...pendingFields];
if (!site.domain) missing.push('domain (https://deine-domain.de)');
if (legal.reviewed !== true) missing.push('legal.reviewed (nach Abgleich mit docs/RECHTLICHES.md)');
if (missing.length) {
  console.error(`Veröffentlichung noch nicht vorbereitet. Offene Angaben in src/site.json:\n- ${missing.join('\n- ')}\nLokale Vorschau: npm run dev`);
  process.exit(1);
}
const domain = new URL(site.domain);
if (domain.protocol !== 'https:' || domain.pathname !== '/' || domain.search || domain.hash || domain.username || domain.password) throw new Error('domain muss eine HTTPS-Adresse ohne Unterpfad oder Zugangsdaten sein.');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(site.company.email)) throw new Error('Bitte eine gültige Kontakt-E-Mail eintragen.');
console.log('Angaben vollständig. Dies ist keine automatische Rechtsprüfung.');
