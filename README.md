# ANLUMITH

echo music's investor website uses the existing React/Vite app at `/en`, `/de` and `/es`. The company homepage remains at `/company/`. Cards and maps share one anonymous download of ECHO's public hourly JSON file; browser visits cannot read the database or start generation. See [public data access and verification](docs/PUBLIC-ECHO-SNAPSHOT.md). Run `npm test` and `npm run build:production` before publishing.

SEO now prerenders complete HTML, includes `/en/investors`, `/de/investors`, `/es/investors`, responsive images, social previews and Apple app banners. Read [SEO implementation and release requirements](docs/SEO.md) and the [30-day investor growth plan](docs/INVESTOR-GROWTH.md). Validate the built pages with `npm run check:seo`. Search indexing remains blocked until the existing release requirements and canonical domain are completed.

Unternehmenswebsite mit **React und Vite**. Die `index.html` liegt direkt im Projektordner; der Build rendert die React-Seiten vollständig als HTML vor. Keine Tracker, externen Schriftarten oder eigenen Cookies.

## Starten

Node.js 22.12 oder neuer verwenden.

```sh
npm install
npm run dev
```

Öffne http://127.0.0.1:4173. Änderungen erscheinen automatisch.

## Dateien

| Datei | Inhalt |
| --- | --- |
| `index.html` | HTML-Einstiegspunkt |
| `src/main.jsx` | Startet React |
| `src/App.jsx` | Navigation und Zuordnung der Seiten |
| `src/pages/` | Startseite, Kontakt, Impressum, Datenschutz, Cookies |
| `src/components.jsx` | Gemeinsame Bausteine wie Adresse und Kontaktlinks |
| `src/site.json` | Firmendaten, Produkte, Domain und Rechtsangaben |
| `src/styles.css` | Gestaltung und mobile Darstellung |
| `public/echo-icon.png` | Das bereitgestellte Original-Logo von echo music |
| `vite.config.js` | Vite und Hosting-Metadaten |

MyBasar verwendet das ShoppingBag-Icon aus Lucide. Weitere Produkte können in `products` ergänzt werden; bei `icon` entweder einen lokalen Bildpfad unter `public/` oder `shopping-bag` angeben. `appStore` ist optional.

## Bauen und veröffentlichen

**Aktuelles Hosting: Cloudflare Workers.** `wrangler.jsonc` verbindet `dist/` mit
`server/worker.js`. Dieser Einstieg stellt `/api/geography`, `/api/metrics` und
`/api/contact` bereit; das Verzeichnis `functions/` allein wird von Workers nicht
ausgeführt. Der bestehende GitHub-Produktionsbranch `main` ist mit Workers Builds
verbunden; ein erfolgreicher Build veröffentlicht die Website. Alternativ steht
mit einer passenden Cloudflare-Anmeldung `npx wrangler deploy` zur Verfügung.
Kennzahlen und Karte brauchen keine `ECHO_*`-Secrets mehr: Sie lesen ausschließlich
die öffentliche ECHO-Datei. Die Kompatibilitätsrouten liefern denselben Dateistand.
Kontaktfunktionen behalten ihre bisherige Konfiguration. Der Pages-Leitfaden
beschreibt eine frühere Hosting-Alternative.

```sh
npm run build:production
```

Vite erzeugt die Website in `dist/`. Nur diesen Ordner veröffentlicht Cloudflare. Zum Testen des Builds: `npm run preview` (vorher den Entwicklungsserver stoppen, beide nutzen Port 4173).

Die [Cloudflare-Anleitung](docs/CLOUDFLARE.md) erklärt die GitHub-Anbindung. Das bestehende Repository ist `Luka2705/anlumith`. Nach Einrichtung veröffentlicht Cloudflare erfolgreiche Pushes auf `main` automatisch. Build-Befehl: `npm run build:production`; Ausgabeordner: `dist`.

Die [rechtlichen offenen Punkte](docs/RECHTLICHES.md) bleiben vor Veröffentlichung abzugleichen. `build:production` prüft ihre Vollständigkeit, nicht ihre rechtliche Richtigkeit. Solange Angaben fehlen bzw. `legal.reviewed` nicht `true` ist, bleiben die Texte als Entwurf markiert und die Website erhält `noindex`. `noindex` ist kein Zugriffsschutz.

Investorenseiten von echo music: `/en`, `/de`, `/es` mit lokalisierten Unterseiten. Unternehmensseiten: `/company/`, `/kontakt/`, `/impressum/`, `/datenschutz/`, `/cookies/`. Die Navigation verwendet normale Links, deshalb funktionieren Zurück, Neuladen und direkte Seitenaufrufe. Für unbekannte Pfade gibt es eine Nicht-gefunden-Ansicht. Cloudflare Pages liefert im SPA-Modus dabei HTTP 200.

## Gestaltung und Quellen

Orientiert an Apples [Typografie-Prinzipien](https://developer.apple.com/design/human-interface-guidelines/typography): Systemschrift, klare Hierarchie, Weißraum, Tastaturfokus und flexible Größen. Keine Apple-Schriftdateien oder Markenassets, keine Apple-Zertifizierung.

Produktbeschreibung und Link zu echo music stammen aus dem [App-Store-Eintrag von Luka Juric](https://apps.apple.com/de/app/echo-music/id6749182326). MyBasar-Beschreibung und Produktwebsite-Links wurden vom Betreiber bereitgestellt.

Brand and investor message: always use **echo music**. The owner confirmed on October 18, 2026 that growth to date was organic with **€0 paid advertising expenditure**. Repeat this message in key investor touchpoints; identify its owner-reported source in methodology and keep it separate from Firebase metrics. All website inquiries use **info@anlumith.com**.
