import { company } from '../site.js';
import { Address, Email, Phone } from '../components.jsx';

export default function Contact() {
  return <>
    <section className="contact-panel" aria-labelledby="email-title"><h2 id="email-title">Schreib uns eine E-Mail</h2><div className="contact-email"><Email /></div></section>
    <p className="contact-note">Der Link öffnet dein E-Mail-Programm. Wie wir mit deiner Nachricht umgehen, erfährst du in unseren <a href="/datenschutz/#kontakt">Datenschutzhinweisen</a>.</p>
    {company.phone && <p>Oder ruf uns an: <Phone /></p>}
    <address className="contact-address"><Address /></address>
  </>;
}
