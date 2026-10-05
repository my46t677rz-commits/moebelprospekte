# Möbelprospekte – Design

Stand: 05.10.2026

## Ziel

Eine private Web-App fürs iPhone, die die aktuellen Prospekte aller Möbelhäuser im
40-km-Umkreis von 85395 Attenkirchen an einem Ort zeigt. Zweck ist Stöbern: Prospekte
durchblättern und dabei auf gute Preise aufmerksam werden.

Nicht Teil dieser Version: Suche, Merkliste, Preisalarm, Benachrichtigungen.

## Datenquelle

kaufDA (Bonial), ohne offizielle Schnittstelle. Am 05.10.2026 vom Mac aus geprüft:

- **Prospektliste je Ort:** `https://www.kaufda.de/Filialen/<Ort>/Moebel-Einrichtung/v-c7`
  enthält im `__NEXT_DATA__`-Block unter
  `props.pageProps.pageInformation.brochures.sector` und `.topRanked` Prospekte mit
  `contentId`, `title`, `validFrom`, `validUntil`, `pageCount`, `publisher` (id, name,
  Logo) und Titelbild. Die Seite liefert pro Ort nur einen Ausschnitt (8 von 22 in
  Eching, höchstens 3 je Haus), `topRanked` mischt andere Branchen bei.
- **Nachbarorte:** dieselbe Seite nennt unter
  `template.content.CityLinkbox_NearCities.links` Orte mit Entfernung, unter
  `PublisherLinkbox.links` die Häuser am Ort.
- **Prospektdetails:** `https://content-viewer-be.kaufda.de/v1/brochures/<contentId>?partner=kaufda_web&lat=<lat>&lng=<lng>`
- **Seiten:** `…/v1/brochures/<contentId>/pages?partner=kaufda_web&lat=<lat>&lng=<lng>`
  liefert je Seite Bild-Adressen in vier Größen (Vorschau, 768x1024, 1600, 2800) sowie
  erfasste Angebote und Links zum Händler.

Für Attenkirchen selbst existiert keine Ortsseite. Standort für Abfragen:
Koordinaten von 85395 (ca. 48.505, 11.763).

Risiken: Die Schnittstelle kann sich ohne Ankündigung ändern. Ob Abrufe von
GitHub-Servern durchgelassen werden, ist ungetestet (siehe „Täglicher Lauf“).

## Aufbau

Ordner `moebelprospekte`, eigenes öffentliches GitHub-Repository, drei Teile.

### 1. Abruf-Skript (`scripts/`, Node, ohne Abhängigkeiten außer Testwerkzeug)

Aufgeteilt in kleine Module mit je einer Aufgabe:

- `orte.js` – feste Liste der Startorte (Eching, Freising, Neufahrn, Unterschleißheim,
  Dachau, Landshut, Ingolstadt, Erding, Pfaffenhofen, Moosburg, München). Ergänzt um
  Nachbarorte aus der Linkbox. Filtert per Luftlinie auf 40 km um den Standort.
- `kaufda.js` – die einzige Stelle, die kaufDA kennt: Ortsseite laden und
  `__NEXT_DATA__` auslesen, Händlerseiten am Ort laden (um über den Ausschnitt von
  3 je Haus hinauszukommen), Prospektseiten laden. Gibt bereinigte Objekte zurück.
- `sammeln.js` – führt Prospekte über `contentId` zusammen, behält nur Branche
  „Möbel & Einrichtung“ (`primarySectorId` DE-24), verwirft Abgelaufene, sortiert.
- `abruf.js` – Einstiegspunkt: ruft die Module auf, prüft das Ergebnis, schreibt
  `public/data/prospekte.json`.

Abrufe laufen nacheinander mit kurzer Pause und normalem Browser-User-Agent,
insgesamt wenige Dutzend Anfragen pro Tag.

### 2. Datei `prospekte.json`

```json
{
  "stand": "2026-10-05T04:00:00Z",
  "haeuser": [{ "id": "DE-1063", "name": "ROLLER", "logo": "https://…" }],
  "prospekte": [{
    "id": "fad5e767-…",
    "haus": "DE-1063",
    "titel": "ERSCHRECKEND GÜNSTIGE ANGEBOTE",
    "gueltigVon": "2026-09-26",
    "gueltigBis": "2026-10-24",
    "erstmalsGesehen": "2026-10-05",
    "titelbild": "https://…",
    "seiten": [{ "klein": "https://…", "normal": "https://…", "gross": "https://…" }]
  }]
}
```

`erstmalsGesehen` wird aus der vorherigen Datei übernommen, damit „neu“ stabil bleibt.
Bilder werden nicht kopiert, die App lädt sie direkt von kaufDA.

### 3. Täglicher Lauf (`.github/workflows/abruf.yml`)

Täglich gegen 6 Uhr deutscher Zeit sowie von Hand auslösbar. Führt Tests und Abruf
aus, schreibt die neue Datei ins Repository und veröffentlicht `public/` auf GitHub
Pages.

Erster Umsetzungsschritt ist ein Probelauf auf GitHub. Lässt kaufDA die Abrufe von dort
nicht durch, läuft `abruf.js` stattdessen täglich per `launchd` auf dem Mac und lädt nur
die Datei hoch; alles andere bleibt gleich.

### 4. Webseite (`public/`, HTML, CSS, JavaScript ohne Framework und ohne Build)

- `index.html`, `app.css`, `manifest.webmanifest`, Icons; `noindex` im Kopf.
- `daten.js` – lädt `prospekte.json`, kennt Filter- und Lesestand im `localStorage`
  (jeder Zugriff abgesichert, die App funktioniert auch ohne).
- `uebersicht.js` – Raster der Titelbilder, nach Haus gruppiert, mit Titel,
  Seitenzahl, „gültig bis“. Markiert „neu“ (seit dem letzten Besuch erstmals gesehen)
  und „endet bald“ (höchstens 3 Tage). Leiste zum An- und Abwählen von Häusern.
- `blaettern.js` – Vollbildansicht: Wischen blättert (CSS Scroll-Snap), Zoomen lädt
  die große Bildfassung nach, Nachbarseiten werden vorgeladen, die zuletzt gelesene
  Seite je Prospekt wird gemerkt. Zurück-Geste schließt die Ansicht.

Gestaltung: dunkler Grund, gedämpfte Akzente, keine großen hellen Flächen. Angezeigt
wird „Stand: Datum“ der Daten.

Kein Service Worker in dieser Version: Die Prospektbilder liegen bei kaufDA, offline
wäre ohnehin nichts zu sehen.

## Fehlerverhalten

- Abruf eines Ortes oder Prospekts schlägt fehl: überspringen, protokollieren,
  weitermachen. Für einen Prospekt ohne Seiten bleibt der Eintrag der vorherigen Datei
  bestehen, sofern noch gültig.
- Ergebnis hat weniger als halb so viele Prospekte wie die vorherige Datei oder gar
  keine: Datei nicht überschreiben, Lauf schlägt fehl (GitHub verschickt eine Mail).
- App kann die Datei nicht laden: kurze Meldung mit Knopf „Erneut versuchen“.
- Ein Bild lädt nicht: Platzhalter auf der Seite, Blättern geht weiter.

## Tests

- Skript: Node-eigener Testläufer mit gespeicherten Beispielantworten von kaufDA
  (Ortsseite, Seitenliste). Geprüft werden Auslesen, Zusammenführen, Branchenfilter,
  Umkreisfilter, Ablaufdatum, Übernahme von `erstmalsGesehen` und die Schutzregel gegen
  ein zu kleines Ergebnis.
- Oberfläche: von Hand im Browser in Handygröße (Raster, Filter, Blättern, Zoom,
  Lesestand, Fehlermeldung bei fehlender Datei).

## Mögliche zweite Stufe

Suche und Preisalarm auf Basis der Angebotsdaten, die kaufDA je Seite mitliefert.
