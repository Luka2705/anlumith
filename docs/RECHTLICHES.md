# Rechtstexte: Stand und offene Angaben

Die Texte sind auf eine Unternehmenswebsite mit Produktlinks, E-Mail- und Telefonkontakt zugeschnitten. Sie ersetzen keine individuelle rechtliche Prüfung des Unternehmens und seiner Produkte. Der Entwurfsstatus bleibt sichtbar, bis du die tatsächlichen Verhältnisse abgeglichen hast. Ein erfolgreicher Build bestätigt keine Rechtskonformität.

## Bereits übernommen

- Marke ANLUMITH; Anbieter und datenschutzrechtlich Verantwortlicher Luka Juric, Einzelunternehmen.
- Obstweg 5, 70771 Leinfelden-Echterdingen, Deutschland.
- lukamateo.juric@icloud.com und +49 178 2380948.
- Kein eigenes Tracking oder eingebetteter Fremdinhalt, Newsletter, Login, Shop oder Kontaktformular.
- Cloudflare Pages als vorgesehenes Hosting, iCloud Mail als Kontaktpostfach.
- Impressum von jeder Seite aus erreichbar. Die Datenschutztexte der Apps werden nicht durch diese Website ersetzt.

## Vor Veröffentlichung in src/site.json abgleichen

1. **Anbieter:** `company` prüfen, insbesondere die ladungsfähige Geschäftsanschrift und Geschäftsbezeichnung. Ein Einzelunternehmer wird selbst als Anbieter genannt. Registerdaten nur ergänzen, wenn tatsächlich vorhanden; weitere Pflichtangaben je nach Tätigkeit über `additionalLegalInformation` oder im Seitentemplate ergänzen.
2. **USt-ID und W-IdNr.:** `vatId` und `businessId` sind leer und werden deshalb nicht angezeigt. Prüfe, ob dir eine Umsatzsteuer-Identifikationsnummer oder Wirtschafts-Identifikationsnummer zugeteilt wurde. Wenn vorhanden, ergänzen. Persönliche Steuer-ID und Finanzamts-Steuernummer nicht ersatzweise veröffentlichen. Suche nach der Vergabemitteilung des BZSt oder informiere dich beim [BZSt zur Beantragung](https://online.portal.bzst.de/SharedDocs/Leistungsbeschreibung/DE/vergabe_der_umsatzsteuer-identifikationsnummer_nach_27_a_UStG.html?nn=25056).
3. **Cloudflare-Vertrag:** Unter `legal.cloudflareTransferSafeguards` den geltenden Auftragsverarbeitungsvertrag und die anwendbare Grundlage internationaler Übermittlungen beschreiben. Cloudflares DPA enthält Regelungen zu Standardvertragsklauseln und zusätzlichen Garantien; prüfen, was auf deinen Vertrag anwendbar ist. Keine EU-only-Speicherung behaupten. Der DPA-Link ist bereits im Datenschutztext enthalten.
4. **Hosting-Speicherung:** In `legal.hostingRetention` tatsächliche Fristen oder nachvollziehbare Löschkriterien für die verwendeten Zugriffs-/Sicherheitsprotokolle eintragen. Keine ausgedachte Standardfrist verwenden. Auch Datenarten mit den aktiven Funktionen abgleichen.
5. **Cloudflare-Cookies:** In `legal.cloudflareCookies` das Ergebnis der Prüfung aktiver Einstellungen und später der echten Domain festhalten. Falls eingesetzt: Name, Anbieter, Zweck und tatsächliche Laufzeit dokumentieren und Erforderlichkeit prüfen. Cloudflares Einstufung als „necessary“ ersetzt die Prüfung nach § 25 TDDDG nicht. Nicht erforderliche Technologien benötigen vorherige Einwilligung; diese Website lädt solche Technologien nicht.
6. **E-Mail:** `legal.emailProvider` enthält Apple iCloud Mail. In `legal.emailInternationalTransfers` die geprüften Rollen, Verträge und internationalen Übermittlungen für die geschäftliche Nutzung beschreiben. Ein persönliches iCloud-Konto ist nicht automatisch ein geprüfter Auftragsverarbeitungsvertrag für Kundendaten. Falls erforderlich ein geeignetes geschäftliches Postfach wählen und Anbieter, Kontaktadresse und Texte gemeinsam anpassen. Beschriebene Löschkriterien tatsächlich umsetzen.
7. **Streitbeilegung:** `legal.disputeResolution` nach Prüfung von § 36 VSBG ausfüllen, soweit erforderlich. Teilnahmebereitschaft/-verpflichtung nicht erfinden. Die Ausnahme bei höchstens zehn Beschäftigten am 31. Dezember des Vorjahres betrifft § 36 Abs. 1 Nr. 1. Bei Teilnahme/Verpflichtung die zuständige Schlichtungsstelle mit Adresse und Website nennen. Ist kein Hinweis erforderlich, darf das Feld nach Prüfung leer bleiben.
8. **Weitere Pflichten:** Falls ein Datenschutzbeauftragter zu benennen ist, Kontakt unter `dataProtectionOfficer` ergänzen. Bei journalistisch-redaktionellen Inhalten, regulierten Tätigkeiten, Bestell-/Buchungsfunktionen oder späteren Shops zusätzliche Pflichten gesondert prüfen. AGB, Widerruf und Informationen für Verbraucherverträge gehören zum jeweiligen Angebot, soweit einschlägig. Auch den BFSG-Anwendungsbereich für deine konkreten Angebote prüfen; hier wird keine rechtlich geprüfte Barrierefreiheit behauptet.
9. **Abschluss:** Domain eintragen, Texte lesen und bei Bedarf rechtlich prüfen lassen. Erst dann `legal.reviewed` auf `true` setzen und `npm run build:production` ausführen. Dieses Feld hält deinen Prüfstatus fest.

Der frühere Link zur EU-OS-Plattform fehlt bewusst: Die Plattform ist seit 20. Juli 2025 eingestellt. Alte Muster können veraltet sein.

## Quellen

- [§ 5 DDG](https://www.gesetze-im-internet.de/ddg/__5.html)
- [§ 25 TDDDG](https://www.gesetze-im-internet.de/ttdsg/__25.html)
- [§ 36 VSBG](https://www.gesetze-im-internet.de/vsbg/__36.html)
- [BfDI: DSGVO und BDSG](https://www.bfdi.bund.de/SharedDocs/Downloads/DE/Broschueren/INFO1.pdf?__blob=publicationFile&v=27)
- [LfDI Baden-Württemberg: Beschwerde](https://www.baden-wuerttemberg.datenschutz.de/beschwerde/)
- [Cloudflare DPA](https://www.cloudflare.com/cloudflare-customer-dpa/) und [Cookies](https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/)
- [Apple-Datenschutzrichtlinie](https://www.apple.com/de/legal/privacy/)
- [EU-Kommission: Einstellung der OS-Plattform](https://consumer-redress.ec.europa.eu/site-relocation_en)
- [Bundesfachstelle Barrierefreiheit: elektronischer Geschäftsverkehr](https://www.bundesfachstelle-barrierefreiheit.de/DE/Barrierefreiheitsstaerkungsgesetz/FAQ-elektronischer-Geschaeftsverkehr/faq-elektronischer-Geschaeftsverkehr_node)

Recherche- und Entwurfsstand: 21. September 2026.
