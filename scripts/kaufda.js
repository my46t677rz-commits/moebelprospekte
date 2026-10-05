// Einzige Stelle, die kaufDA kennt. Die Schnittstellen sind inoffiziell;
// ändert sich dort etwas, ist nur diese Datei anzupassen.

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const BRANCHE_MOEBEL = 'DE-24';
const PAUSE_MS = 400;

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function holeJson(url) {
  const antwort = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!antwort.ok) throw new Error(`HTTP ${antwort.status} für ${url}`);
  return antwort.json();
}

const ohneParameter = (url) => url.split('?')[0];
const alsIso = (zeit) => new Date(zeit).toISOString();

export const betrachterLink = (id) => `https://www.kaufda.de/contentViewer/static/${id}`;

// Regal-Antwort -> bereinigte Prospekte. Blog-Karussells und Ähnliches fallen raus.
export function leseRegal(json) {
  const prospekte = [];
  for (const eintrag of json.contents ?? []) {
    const c = eintrag.content;
    if (!c || Array.isArray(c) || !c.contentId || !c.publisher) continue;
    const filiale = c.closestStore;
    prospekte.push({
      id: c.contentId,
      titel: c.title.trim(),
      haus: { id: c.publisher.id, name: c.publisher.name },
      gueltigVon: alsIso(c.validFrom),
      gueltigBis: alsIso(c.validUntil),
      // Dynamische Prospekte sind Angebotslisten ohne Seitenbilder.
      art: c.type === 'BROCHURE' ? 'seiten' : 'liste',
      titelbild: c.brochureImage?.url ?? null,
      filiale: filiale
        ? { ort: filiale.city, lat: filiale.latitude, lng: filiale.longitude }
        : null,
    });
  }
  return prospekte;
}

// Seiten-Antwort -> Bildadressen ohne Größenangabe; die App hängt die Größe an.
export function leseSeiten(json) {
  return (json.contents ?? [])
    .toSorted((a, b) => a.number - b.number)
    .map((seite) => seite.images?.[0]?.url)
    .filter(Boolean)
    .map(ohneParameter);
}

export function leseLogo(json) {
  const bilder = json.content?.publisher?.images ?? [];
  const bild = bilder.find((b) => b.size === '128x128') ?? bilder[0];
  return bild?.url ?? null;
}

export async function ladeRegal({ lat, lng }) {
  const prospekte = [];
  for (let seite = 0, gesamt = 1; seite < gesamt && seite < 20; seite++) {
    const url = `https://www.kaufda.de/api/shelf?lat=${lat}&lng=${lng}&size=24&page=${seite}&sectorIds=${BRANCHE_MOEBEL}`;
    const json = await holeJson(url);
    gesamt = json.page?.totalPages ?? 1;
    prospekte.push(...leseRegal(json));
    await pause(PAUSE_MS);
  }
  return prospekte;
}

const betrachter = (id, pfad, { lat, lng }) =>
  `https://content-viewer-be.kaufda.de/v1/brochures/${id}${pfad}?partner=kaufda_web&lat=${lat}&lng=${lng}`;

export async function ladeSeiten(id, standort) {
  const json = await holeJson(betrachter(id, '/pages', standort));
  await pause(PAUSE_MS);
  return leseSeiten(json);
}

export async function ladeLogo(id, standort) {
  const json = await holeJson(betrachter(id, '', standort));
  await pause(PAUSE_MS);
  return leseLogo(json);
}
