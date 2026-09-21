# ANLUMITH

Unternehmenswebsite mit **React und Vite**. Die `index.html` liegt direkt im Projektordner. Kein eigener HTML-Generator. Keine Tracker, externen Schriftarten oder eigenen Cookies.

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
| `public/echo-icon.png` | Das bereitgestellte Original-Logo von Echo Music |
| `vite.config.js` | Vite und Hosting-Metadaten |

MyBasar verwendet das ShoppingBag-Icon aus Lucide. Weitere Produkte können in `products` ergänzt werden; bei `icon` entweder einen lokalen Bildpfad unter `public/` oder `shopping-bag` angeben. `appStore` ist optional.

## Bauen und veröffentlichen

```sh
npm run build
```

Vite erzeugt die Website in `dist/`. Nur diesen Ordner veröffentlicht Cloudflare. Zum Testen des Builds: `npm run preview` (vorher den Entwicklungsserver stoppen, beide nutzen Port 4173).

Die [Cloudflare-Anleitung](docs/CLOUDFLARE.md) erklärt die GitHub-Anbindung. Das bestehende Repository ist `Luka2705/anlumith`. Nach Einrichtung veröffentlicht Cloudflare erfolgreiche Pushes auf `main` automatisch. Build-Befehl: `npm run build:production`; Ausgabeordner: `dist`.

Die [rechtlichen offenen Punkte](docs/RECHTLICHES.md) bleiben vor Veröffentlichung abzugleichen. `build:production` prüft ihre Vollständigkeit, nicht ihre rechtliche Richtigkeit. Solange Angaben fehlen bzw. `legal.reviewed` nicht `true` ist, bleiben die Texte als Entwurf markiert und die Website erhält `noindex`. `noindex` ist kein Zugriffsschutz.

Seiten: `/`, `/kontakt/`, `/impressum/`, `/datenschutz/`, `/cookies/`. Die Navigation verwendet normale Links, deshalb funktionieren Zurück, Neuladen und direkte Seitenaufrufe. Für unbekannte Pfade gibt es eine Nicht-gefunden-Ansicht. Cloudflare Pages liefert im SPA-Modus dabei HTTP 200.

## Gestaltung und Quellen

Orientiert an Apples [Typografie-Prinzipien](https://developer.apple.com/design/human-interface-guidelines/typography): Systemschrift, klare Hierarchie, Weißraum, Tastaturfokus und flexible Größen. Keine Apple-Schriftdateien oder Markenassets, keine Apple-Zertifizierung.

Produktbeschreibung und Link zu Echo Music stammen aus dem [App-Store-Eintrag von Luka Juric](https://apps.apple.com/de/app/echo-music/id6749182326). MyBasar-Beschreibung und Produktwebsite-Links wurden vom Betreiber bereitgestellt.
