// Täglicher Abruf: holt die Möbelprospekte im Umkreis und schreibt public/data/prospekte.json.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ladeRegal, ladeSeiten, ladeLogo } from './kaufda.js';
import { sammle, istPlausibel } from './sammeln.js';

// 85395 Attenkirchen
const STANDORT = { lat: 48.5053, lng: 11.76 };
const RADIUS_KM = 40;
const ZIEL = fileURLToPath(new URL('../public/data/prospekte.json', import.meta.url));

async function leseVorher() {
  try {
    return JSON.parse(await readFile(ZIEL, 'utf8'));
  } catch {
    return null;
  }
}

const vorher = await leseVorher();
const roh = await ladeRegal(STANDORT);
const daten = sammle(roh, { standort: STANDORT, radiusKm: RADIUS_KM, jetzt: new Date(), vorher });
console.log(`${roh.length} Prospekte im Regal, ${daten.prospekte.length} im Umkreis von ${RADIUS_KM} km`);

if (!istPlausibel(daten, vorher)) {
  console.error(
    `Abbruch: nur ${daten.prospekte.length} Prospekte (vorher ${vorher?.prospekte.length ?? 0}). Die alte Datei bleibt stehen.`,
  );
  process.exit(1);
}

// Seiten ändern sich nicht mehr, deshalb nur für neue Prospekte laden.
for (const p of daten.prospekte) {
  if (p.art !== 'seiten' || p.seiten.length > 0) continue;
  try {
    p.seiten = await ladeSeiten(p.id, STANDORT);
  } catch (fehler) {
    console.warn(`Seiten für "${p.titel}" nicht geladen: ${fehler.message}`);
  }
}

for (const haus of daten.haeuser) {
  if (haus.logo) continue;
  try {
    haus.logo = await ladeLogo(daten.prospekte.find((p) => p.haus === haus.id).id, STANDORT);
  } catch (fehler) {
    console.warn(`Logo für ${haus.name} nicht geladen: ${fehler.message}`);
  }
}

// Blätterbare Prospekte ohne Seiten wären in der App leer.
daten.prospekte = daten.prospekte.filter((p) => p.art !== 'seiten' || p.seiten.length > 0);

await mkdir(dirname(ZIEL), { recursive: true });
await writeFile(ZIEL, JSON.stringify(daten, null, 1) + '\n');
console.log(`${daten.prospekte.length} Prospekte von ${daten.haeuser.length} Häusern geschrieben.`);
