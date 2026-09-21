# GitHub → Cloudflare Pages → deine Domain

Stand: 21. September 2026. Diese Anleitung gilt für dieses Repository. Cloudflare empfiehlt Workers grundsätzlich für neue Anwendungen; Pages unterstützt weiterhin das hier verwendete Hosting statischer Seiten mit Git-Anbindung. Die folgenden Einstellungen gehören zu **Pages**.

## 1. Website vorbereiten

1. Öffne `src/site.json`.
2. Trage bei `domain` deine Wunschadresse mit HTTPS ein, ohne Unterpfad, zum Beispiel `https://deine-domain.de`. Die echte Domain wurde noch nicht mitgeteilt.
3. Prüfe die Firmendaten und ergänze die offenen Rechtsangaben entsprechend `RECHTLICHES.md`.
4. Setze `legal.reviewed` nach diesem Abgleich auf `true`.
5. Einmal `npm install` ausführen, dann mit `npm run dev` alle Seiten lokal prüfen. Änderungen werden automatisch sichtbar.
6. Führe `npm run build:production` aus. Solange Angaben fehlen, erklärt der Befehl, welche Felder noch offen sind.

## 2. Dateien nach GitHub übertragen

Das Verzeichnis ist schon ein Git-Repository, Branch `main`. `origin` verweist auf `git@github.com:Luka2705/anlumith.git`. Kein weiteres Repository anlegen und `origin` nicht neu hinzufügen.

```sh
cd /Users/lukajuric/Desktop/anlumith-website
git status
git add README.md .gitignore .nvmrc package.json package-lock.json index.html vite.config.js src public scripts docs
git commit -m "Add anlumith company website"
git push origin main
```

Alternativ dieselben Dateien mit GitHub Desktop committen und pushen. Wenn SSH nicht eingerichtet ist, über GitHub Desktop anmelden oder GitHubs offizielle SSH-Einrichtung verwenden. Keine Tokens in Projektdateien speichern. Durch die Erstellung der Website wurde noch nichts gepusht.

## 3. Cloudflare mit GitHub verbinden

1. Melde dich im [Cloudflare-Dashboard](https://dash.cloudflare.com/) im Konto deiner Domain an.
2. Öffne **Workers & Pages → Create application → Pages → Connect to Git**. Je nach Dashboard-Version wird der Einstieg als „Get started“ bei Pages angezeigt.
3. Wähle **GitHub** und autorisiere die Cloudflare-GitHub-App. Begrenze den Zugriff auf `Luka2705/anlumith`, wenn du keine weiteren Repositories brauchst.
4. Wähle das Repository `anlumith` und starte das Setup.
5. Verwende diese Werte:

| Einstellung | Wert |
| --- | --- |
| Project name | `anlumith` oder ein freier Name |
| Production branch | `main` |
| Framework preset | `React (Vite)` (alternativ `None` mit den folgenden Werten) |
| Build command | `npm run build:production` |
| Build output directory | `dist` |
| Root directory | leer lassen / Repository-Wurzel |
| Environment variable | `NODE_VERSION` = `22` |

6. Klicke **Save and Deploy**. Cloudflare holt den Code, baut die React-App und veröffentlicht nur `dist/`.
7. Öffne nach dem erfolgreichen Build die angezeigte `*.pages.dev`-Adresse.

Für Git-Veröffentlichung keine Direct-Upload-Anwendung anlegen. Ein vorhandenes Direct-Upload-Projekt lässt sich nicht nachträglich auf Git-Integration umstellen; dafür ein neues Pages-Projekt mit Git erstellen und die Domain diesem zuordnen.

## 4. Eigene Domain verbinden

1. Öffne dein Pages-Projekt → **Custom domains → Set up a domain**.
2. Trage die in `src/site.json` verwendete Domain ein, ohne `https://`.
3. Bestätige den vorgeschlagenen DNS-Eintrag. Bei einer Domain im selben Cloudflare-Konto übernimmt Cloudflare die Einrichtung.
4. Warte, bis Domain und HTTPS-Zertifikat aktiv sind, und teste die Adresse.
5. Für `www` füge auch `www.deine-domain.de` als Custom Domain hinzu. Richte anschließend nach der [Cloudflare-Anleitung](https://developers.cloudflare.com/pages/how-to/www-redirect/) eine dauerhafte Weiterleitung zur bevorzugten Domain ein. Nur die bevorzugte Adresse steht im `domain`-Feld.

Die Domain zuerst im Pages-Projekt zuordnen; ein allein manuell angelegter CNAME genügt nicht. Bestehende MX-/E-Mail-Einträge unverändert lassen. Für eine bereits aktive Cloudflare-Registrar-Domain ist kein Nameserverwechsel nötig.

## 5. Datenschutz-Einstellungen abgleichen

- Diese Website benötigt kein Web Analytics, Zaraz oder Drittanbieter-Tracking. Neue Funktionen erfordern angepasste Datenschutzhinweise und gegebenenfalls vorherige Einwilligung.
- Cloudflare-Sicherheitsfunktionen können Cookies setzen. Prüfe die aktiven Funktionen und dokumentiere sie unter `legal.cloudflareCookies`. Schutzmaßnahmen nicht bloß zum Entfernen eines Cookie-Hinweises deaktivieren.
- Cookies und Netzwerkanfragen nach dem Deployment auch auf der echten Domain prüfen. Die lokale Vorschau sagt nichts über Cloudflares spätere Antwort-Header aus.
- Die Content Security Policy erlaubt das lokal ausgelieferte React-JavaScript. Benötigen zusätzliche Cloudflare-Funktionen Skripte, ihre konkreten Anforderungen prüfen und die Policy gezielt anpassen.

## 6. Künftige Änderungen automatisch veröffentlichen

Quelldateien bearbeiten, lokal prüfen, committen und pushen:

```sh
npm run build:production
git add src public scripts docs README.md index.html vite.config.js package.json package-lock.json
git commit -m "Update website content"
git push origin main
```

Jeder Push auf `main` löst einen Build aus. Nach dessen Erfolg wird die Website aktualisiert. Kein GitHub-Actions-Workflow und kein API-Token nötig: Die Cloudflare-Git-Integration übernimmt das.

Unter **Deployments** den neuesten Commit und seinen Status prüfen. Ein fehlgeschlagener Build ersetzt eine funktionierende Veröffentlichung nicht. Andere Branches können Preview-Deployments auslösen; diese sind standardmäßig nicht vertraulich. Bei Bedarf ihren Zugriff mit Cloudflare Access beschränken oder Preview-Deployments abschalten.

## Fehler eingrenzen

- **Rechtsangaben fehlen:** Die im Build-Protokoll genannten Felder in `src/site.json` ausfüllen.
- **Repository fehlt:** GitHub-App-Zugriff auf `Luka2705/anlumith` prüfen; mindestens ein Commit muss auf `main` vorhanden sein.
- **Überall 404:** Ausgabeordner muss `dist` heißen und der Build erfolgreich sein.
- **Domain hängt:** Custom-Domain-Status und widersprüchliche DNS-Einträge für genau diesen Hostnamen prüfen.
- **Änderung fehlt:** Branch, Commit und Deployment-Status prüfen und Browser neu laden.

Quellen: [Git-Anbindung](https://developers.cloudflare.com/pages/get-started/git-integration/), [Build-Konfiguration](https://developers.cloudflare.com/pages/configuration/build-configuration/), [Custom Domains](https://developers.cloudflare.com/pages/configuration/custom-domains/), [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/), [Pages-Einstieg](https://developers.cloudflare.com/pages/get-started/).

Die React-App verwendet die SPA-Unterstützung von Cloudflare Pages. Ohne eine eigene `404.html` liefert Pages bei direkten Aufrufen wie `/kontakt/` die `index.html` aus; React zeigt die passende Seite. Unbekannte Pfade zeigen eine Nicht-gefunden-Ansicht (bei SPA-Hosting mit HTTP 200).
