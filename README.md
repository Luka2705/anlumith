# ANLUMITH

echo music investor V2 is implemented in the existing React/Vite app at `/en`, `/de`, and `/es`. The company homepage is retained at `/company/`. See [Investor implementation and integration](docs/INVESTOR.md) for data provenance, Firebase/Pages setup, localization, checks and remaining release requirements. Run `npm test` and `npm run build` for local verification. Local metrics now read echo music's existing hourly Firestore cache server-side using the installed Firebase CLI login; the supplied historical snapshot is a labeled fallback. Hosted metrics and online email delivery still require deployment configuration.

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
ausgeführt. Nach dem Build mit `npx wrangler deploy` veröffentlichen. Die
serverseitigen Bindings `ECHO_GEOGRAPHY_URL`, `ECHO_METRICS_URL` und
`ECHO_API_TOKEN` müssen auf die bereitgestellten Firebase-Endpunkte zeigen
(siehe [Investor-Anbindung](docs/INVESTOR.md#connect-cloudflare-pages-functions)).
Ohne diese Bindings antworten die Daten-Endpunkte mit 503; echte Daten erfordern
zusätzlich die Firebase-Bereitstellung. Der folgende Pages-Leitfaden beschreibt
die ursprünglich geplante, alternative Hosting-Variante.

```sh
npm run build
```

Vite erzeugt die Website in `dist/`. Nur diesen Ordner veröffentlicht Cloudflare. Zum Testen des Builds: `npm run preview` (vorher den Entwicklungsserver stoppen, beide nutzen Port 4173).

Die [Cloudflare-Anleitung](docs/CLOUDFLARE.md) erklärt die GitHub-Anbindung. Das bestehende Repository ist `Luka2705/anlumith`. Nach Einrichtung veröffentlicht Cloudflare erfolgreiche Pushes auf `main` automatisch. Build-Befehl: `npm run build:production`; Ausgabeordner: `dist`.

Die [rechtlichen offenen Punkte](docs/RECHTLICHES.md) bleiben vor Veröffentlichung abzugleichen. `build:production` prüft ihre Vollständigkeit, nicht ihre rechtliche Richtigkeit. Solange Angaben fehlen bzw. `legal.reviewed` nicht `true` ist, bleiben die Texte als Entwurf markiert und die Website erhält `noindex`. `noindex` ist kein Zugriffsschutz.

Investorenseiten von echo music: `/en`, `/de`, `/es` mit lokalisierten Unterseiten. Unternehmensseiten: `/company/`, `/kontakt/`, `/impressum/`, `/datenschutz/`, `/cookies/`. Die Navigation verwendet normale Links, deshalb funktionieren Zurück, Neuladen und direkte Seitenaufrufe. Für unbekannte Pfade gibt es eine Nicht-gefunden-Ansicht. Cloudflare Pages liefert im SPA-Modus dabei HTTP 200.

## Gestaltung und Quellen

Orientiert an Apples [Typografie-Prinzipien](https://developer.apple.com/design/human-interface-guidelines/typography): Systemschrift, klare Hierarchie, Weißraum, Tastaturfokus und flexible Größen. Keine Apple-Schriftdateien oder Markenassets, keine Apple-Zertifizierung.

Produktbeschreibung und Link zu echo music stammen aus dem [App-Store-Eintrag von Luka Juric](https://apps.apple.com/de/app/echo-music/id6749182326). MyBasar-Beschreibung und Produktwebsite-Links wurden vom Betreiber bereitgestellt.

Brand and investor message: always use **echo music**. The owner confirmed on October 18, 2026 that growth to date was organic with **€0 paid advertising expenditure**. Repeat this message in key investor touchpoints; identify its owner-reported source in methodology and keep it separate from Firebase metrics. All website inquiries use **info@anlumith.com**.
