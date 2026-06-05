# Wishlist

Eine kleine Wishlist-Anwendung mit statischem Frontend und einem Node.js/Express-Backend. Das Backend speichert die Daten in einer lokalen SQLite-Datenbank.

Das Backend ist so aufgebaut, dass es normal gestartet, aber auch sauber in Tests importiert werden kann. Die Express-App, die Datenbankverbindung und die Initialisierung sind voneinander getrennt.

## Voraussetzungen

Zum Ausfuehren ohne Docker brauchst du:

- Git
- Node.js LTS
- npm, wird normalerweise zusammen mit Node.js installiert
- Einen aktuellen Browser, zum Beispiel Chrome, Edge oder Firefox

Optional:

- Docker Desktop, wenn du das Backend lieber per Docker starten willst
- Eine REST-Client-Erweiterung fuer VS Code, wenn du `src/backend/queries.http` direkt ausfuehren moechtest

## Projekt starten

### 1. Repository klonen

```bash
git clone https://github.com/sanin-zc/wishlist.git
cd wishlist
```

### 2. Backend starten

```bash
cd src/backend
npm install
npm start
```

Das Backend laeuft danach unter:

```text
http://localhost:3000
```

Beim ersten Start wird automatisch eine SQLite-Datenbank unter `src/backend/db/main.db` erstellt. Diese Datei ist absichtlich nicht im Git-Repository enthalten.

### 3. Frontend oeffnen

Oeffne die Datei im Browser:

```text
src/frontend/index.html
```

Das Frontend verbindet sich automatisch mit dem Backend unter `http://localhost:3000`.

## Backend-Konfiguration

Das Backend kann ueber Umgebungsvariablen konfiguriert werden:

| Variable | Standardwert | Beschreibung |
| --- | --- | --- |
| `PORT` | `3000` | Port, auf dem der Server gestartet wird |
| `DB_STORAGE` | `./db/main.db` | Pfad zur SQLite-Datenbank |
| `SEED_DB` | `true` | Wenn `false`, werden keine Beispieldaten angelegt |

Beispiele:

```bash
PORT=4000 npm start
```

```bash
DB_STORAGE=./db/test.db SEED_DB=false npm start
```

Unter Windows PowerShell:

```powershell
$env:PORT="4000"; npm start
```

```powershell
$env:DB_STORAGE="./db/test.db"; $env:SEED_DB="false"; npm start
```

## Testbarkeit des Backends

Das Backend wurde fuer Tests in zwei Dateien aufgeteilt:

- `src/backend/app.mjs` enthaelt Factory-Funktionen fuer Express-App, Sequelize-Verbindung, Models und Datenbankinitialisierung.
- `src/backend/server.mjs` ist nur noch die Startdatei fuer den echten Server und ruft `app.listen(...)` auf.

Dadurch koennen Tests die App importieren, ohne automatisch einen Server-Port zu belegen:

```js
import { createBackend } from './app.mjs';

const backend = await createBackend({
  storage: ':memory:',
  seed: false,
  syncOptions: { force: true }
});

const { app, sequelize, models } = backend;

// Tests gegen app ausfuehren, z.B. mit supertest

await sequelize.close();
```

Fuer Integrationstests oder Unit-Tests kann `storage: ':memory:'` verwendet werden. Damit wird eine separate SQLite-Datenbank im Arbeitsspeicher erzeugt und die echte Datei `src/backend/db/main.db` bleibt unveraendert.

Mit `seed: false` koennen Tests verhindern, dass automatisch die Beispiel-Wishlist erstellt wird. So starten Tests immer mit einem kontrollierbaren Datenbestand.

## Alternative: Backend mit Docker starten

Wenn Docker Desktop installiert ist, kannst du das Backend auch so starten:

```bash
cd src/backend
docker compose up --build
```

Auch dabei ist das Backend unter `http://localhost:3000` erreichbar. Die Datenbank wird in einem Docker-Volume gespeichert.

Zum Stoppen:

```bash
docker compose down
```

## Wichtige Hinweise

- `node_modules/` wird nicht mit Git versioniert. Nach dem Klonen immer `npm install` im Ordner `src/backend` ausfuehren.
- `src/backend/db/main.db` wird lokal erzeugt und nicht gepusht.
- Der Backend-Port ist standardmaessig `3000`, kann aber ueber `PORT` geaendert werden.
- Fuer automatisierte Tests sollte nicht die echte Datenbankdatei verwendet werden, sondern `DB_STORAGE=:memory:` oder ein eigener Testdatenbank-Pfad.
