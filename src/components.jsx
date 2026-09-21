import { company, isDraft } from './site.js';

export function Field({ text, label }) {
  return text?.trim() ? <span className="text-lines">{text}</span> : <span className="missing">[Noch ergänzen: {label}]</span>;
}
export function Email() {
  return <a href={`mailto:${company.email}`}>{company.email}</a>;
}
export function Phone() {
  return company.phone && <a href={`tel:${company.phone.replace(/[^+\d]/g, '')}`}>{company.phone}</a>;
}
export function Address() {
  return <>{company.legalName}<br />{company.legalForm}<br />{company.street}<br />{company.postalCode} {company.city}<br />{company.country}</>;
}
export function DraftNotice() {
  return isDraft && <p className="notice"><strong>Entwurf vor Veröffentlichung.</strong> Diese rechtlichen Hinweise müssen noch mit den tatsächlichen Hosting- und E-Mail-Einstellungen abgeglichen werden. Offene Angaben sind markiert.</p>;
}
export function Page({ title, intro, legal = false, children }) {
  return <main id="inhalt" className="wrap page">
    <div className="page-heading"><p className="eyebrow">ANLUMITH</p><h1>{title}</h1>{intro && <p className="intro">{intro}</p>}</div>
    <div className={legal ? 'legal' : 'page-content'}>{children}</div>
  </main>;
}
