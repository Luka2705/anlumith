import { company, legal, isDraft } from '../site.js';
import { Address, Email, Phone, Field, DraftNotice } from '../components.jsx';

export default function Imprint() {
  const optionalFields = [
    ['Vertretungsberechtigung', company.representative],
    ['Registereintrag', company.register],
    ['Umsatzsteuer-Identifikationsnummer', company.vatId],
    ['Wirtschafts-Identifikationsnummer', company.businessId],
    ['Weitere Angaben', company.additionalLegalInformation],
  ];
  return <>
    <DraftNotice />
    <h2>Anbieter</h2><p><Address /></p>
    <h2>Kontakt</h2><p>E-Mail: <Email />{company.phone && <><br />Telefon: <Phone /></>}</p>
    {optionalFields.filter(([, value]) => value).map(([title, value]) => <section key={title}><h2>{title}</h2><p><Field text={value} /></p></section>)}
    {(legal.disputeResolution || isDraft) && <><h2>Verbraucherstreitbeilegung</h2><p><Field text={legal.disputeResolution} label="Anwendbarkeit des § 36 VSBG und Teilnahmebereitschaft prüfen; zutreffenden Hinweis ergänzen, falls erforderlich" /></p></>}
  </>;
}
