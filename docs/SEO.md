# echo music: Suchmaschinen, App-Suche und Veröffentlichung

Stand: 17. Oktober 2026. Diese Umsetzung verbessert technische Auffindbarkeit und eine klare Produkt-/Investorenansprache. Sie verspricht weder Platz 1 noch eine Finanzierung. Google garantiert keine bestimmte Platzierung; bezahlte Anzeigen kaufen keine bessere organische Position. [Google zur Auswahl von SEO-Dienstleistungen](https://developers.google.com/search/docs/fundamentals/do-i-need-seo)

## Bereits umgesetzt

- Vollständiges vorgerendertes HTML für die EN/DE/ES-Startseiten, Investorenseiten und rechtlichen Unterseiten. Suchmaschinen und Link-Vorschauen müssen den Text nicht erst durch JavaScript erzeugen. React übernimmt anschließend die vorhandene Oberfläche; die Firebase-Zahlen aktualisieren sich weiter clientseitig. [Google: JavaScript-SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- Eigene Investorenseiten unter `/en/investors`, `/de/investors`, `/es/investors`: Produkt, definierte Kennzahlen, Gründer, Produktrichtung und direkter Kontakt. Keine erfundene Finanzierungsrunde, Rendite, Retention, Kundenliste oder Partnerschaft.
- Klare, sprachspezifische Titel und Beschreibungen zu „echo music“, Social Music Discovery, Song-Sharing und Weltkarte. Sichtbare Produktdefinition und Antworten auf echte Produkt-/Gründerfragen. [Google: hilfreiche Titel](https://developers.google.com/search/docs/appearance/title-link)
- Einheitlicher SEO-Generator für statisches HTML und Browsernavigation: selbstreferenzierende Canonicals, vollständige Sprachalternativen mit `x-default`, Open Graph und Twitter-Vorschauen. Absolute URLs werden erst mit einer konfigurierten Hauptdomain ausgegeben. [Google: Sprachversionen](https://developers.google.com/search/docs/specialty/international/localized-versions)
- `Organization`, `Person`, `WebSite`, `WebPage` und `MobileApplication` als JSON-LD mit realer Marke, Betreiber, Gründer und Store-Links. Es werden keine Sterne, Rezensionen, Rankings oder Finanzierungsdaten erfunden. Ohne belegte Reviews wird keine Eignung für Googles Software-App-Rich-Result behauptet. [Google: Organization](https://developers.google.com/search/docs/appearance/structured-data/organization), [Software-App-Pflichtangaben](https://developers.google.com/search/docs/appearance/structured-data/software-app)
- Echte Apple-App-ID im Smart App Banner; kleine Browser- und iOS-Icons. Dies unterstützt den Übergang von der Website in den App Store und ist kein zugesagter Rankingbonus. [Apple: Smart App Banners](https://developer.apple.com/documentation/webkit/promoting-apps-with-smart-app-banners)
- Neun responsive WebP-Dateien, passende `srcset`/`sizes`, priorisiertes Einstiegsbild und verzögertes Laden weiterer Bilder. Bei 600 px sind die Dateien 96–98 % kleiner. Unveränderte Original-PNGs bleiben für die vergrößerte Ansicht erreichbar.
- Echtes 1200×630-Vorschaubild mit vorhandenem echo music-Logo und Produktbeschreibung, ohne alternde Kennzahlen.
- Saubere statische Sprach-URLs, Weiterleitungen für frühere Slash-Varianten, `404.html` für fehlende Seiten, API-Routing separat. Sitemap mit Sprachalternativen und robots.txt werden aus der finalen Domain/Veröffentlichungsfreigabe erzeugt. Keine Sitemap-Daten oder `lastmod`-Zeitpunkte werden erfunden.

## Was die öffentliche Indexierung aktuell verhindert

Die vom Betreiber bestätigte Hauptdomain **https://anlumith.com** ist in `src/site.json` eingetragen und wird für Canonicals, Sprachalternativen, strukturierte Daten und Vorschaubilder verwendet. Offen sind weiterhin Hosting-Aufbewahrung, E-Mail-Transfers, Cloudflare-Transfergrundlage und tatsächlich eingesetzte Cloudflare-Cookies. Der bestehende Schutz in `scripts/check-release.mjs` und `isDraft` bleibt deshalb aktiv. Die Vorschau ist mit `noindex`/gesperrter robots.txt versehen. Der Build für die Freigabe wird erst erfolgreich, wenn diese Angaben tatsächlich bestätigt sind; dafür wurden keine Fakten erfunden.

Die lokal verbundene Firebase-Anmeldung wird nicht mit einem statischen Build auf Cloudflare übertragen. Für die öffentliche Website sind die serverseitigen Endpunkte und Bindings aus [INVESTOR.md](INVESTOR.md) separat einzurichten. Auch die Online-Deck-Anfrage benötigt den bestätigten E-Mail-Transport; der direkte öffentliche E-Mail-Link funktioniert unabhängig davon.

Der lokale GitHub-Zugang `mirojur` meldet für `Luka2705/anlumith` nur `READ`. Ein nicht verändernder Push-Test wurde vom Ziel mit HTTP 403 abgewiesen. Ein automatischer Freigabeprüfer hat die zusätzliche Erstellung eines Forks mangels ausdrücklicher Freigabe abgelehnt. Es wurde kein Fork erstellt und nichts zum Original gepusht. Für die Veröffentlichung ist Schreibzugriff auf das Original oder eine ausdrücklich freigegebene alternative Übergabe nötig.

## Nach Bestätigung der Domain

1. Die bestätigte Hauptadresse `https://anlumith.com` verwenden. Weitere tatsächlich kontrollierte Domains per dauerhafter Weiterleitung auf sie führen; nicht mehrere identische Hauptseiten veröffentlichen.
2. Die vorhandenen Betriebs-/Datenschutzangaben anhand des eingesetzten Hostings und Maildienstes vervollständigen. `npm run build:production` muss erfolgreich sein. Die Domain darf dann keine unbeabsichtigten `noindex`-Header oder `Disallow: /` mehr ausliefern.
3. Hosting mit dem Root-Verzeichnis `functions/` und `dist` konfigurieren, damit `/api/metrics` funktioniert. Statuscodes, Canonicals, vier Sprachalternativen und die tatsächlichen Kennzahlen auf der veröffentlichten Domain prüfen.
4. Domaininhaberschaft in Google Search Console per DNS bestätigen; die generierte `/sitemap.xml` einreichen. Die Startseite und Investorenseite per URL-Prüfung kontrollieren. Zugang und DNS-Bestätigung können nicht durch einen geratenen Meta-Tag ersetzt werden. [Google: Sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [Search Console](https://search.google.com/search-console/about)
5. Live-URLs mit Rich Results Test und PageSpeed Insights prüfen; Warnungen nach tatsächlicher Bedeutung priorisieren. Strukturierte Daten garantieren keine besondere Ergebnisdarstellung. [Rich Results Test](https://search.google.com/test/rich-results), [PageSpeed Insights](https://pagespeed.web.dev/)
6. App-Store- und Google-Play-Entwicklerlinks sowie kontrollierte öffentliche Profile auf dieselbe Adresse ausrichten. Apple-Titel/Untertitel/Keywords, Produktseiten und Screenshots im App-Store-Connect-Konto separat prüfen; Website-Metadaten ändern diese nicht. [Apple: Produktseite](https://developer.apple.com/app-store/product-page/)
7. Markenanfragen, Produktsuchanfragen, indexierte Seiten, Klicks, Store-Aufrufe und qualifizierte Investorengespräche getrennt messen. Keine Installation als Investor, kein Auth-Refresh als aktive Nutzung zählen.

## Für Sichtbarkeit bei Investoren

Der ausführbare 30-Tage-Plan, konkrete Fonds/Branchenmedien, offizielle Kontaktwege und DE/EN-Entwürfe stehen in [INVESTOR-GROWTH.md](INVESTOR-GROWTH.md). Die Website hilft bei Prüfung und Weiterleitung; passende persönliche Kontakte und echte Produktnachrichten ergänzen die Suche. Eine Verteiler-Mail oder das Kaufen von Backlinks ist kein Ersatz für diese Arbeit.

Der Betreiber wünscht **keine bezahlte Werbung**. Zusätzlich bestätigt er am **18.10.2026** das bisherige organische Wachstum mit **0 € kumulierten Werbeausgaben**. Diese Betreiberangabe wird in sichtbaren Texten, FAQ, Meta-Beschreibungen und Vorschaubild wiederholt; sie stammt nicht aus Firebase oder einem Werbekonto-Audit. Es werden keine Anzeigen, Werbebudgets oder kostenpflichtigen Backlinks eingerichtet. Der Plan konzentriert sich auf organische Suche, Store-Auffindbarkeit, hilfreiche Gründerbeiträge und passende persönliche Kontakte. Es wurden keine Investoren oder Redaktionen angeschrieben. Die verlinkten öffentlichen Zugänge dienen der gezielten Vorbereitung.

## Reproduzierbare Checks

```sh
npm test
npm run build
npm run check:seo
npm run build:production
```

Die ersten drei Befehle prüfen unter anderem die echte HTML-Ausgabe, Sprachinhalte, nur eine H1 pro Seite, Kontakt-/Store-Links, Schema-JSON, Canonicals/Alternates mit einer Testdomain, keine erfundenen Bewertungen, 404-Semantik sowie die bisherige Firebase-/Formularvalidierung. Der vierte Befehl ist die bestehende Freigabeprüfung und meldet die noch fehlenden Angaben. Ein lokaler Test mit einer Beispieldomain ist keine erfolgreiche Produktionsfreigabe und keine Search-Console-Verifizierung.
