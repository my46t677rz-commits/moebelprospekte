// Daten laden und den Stand merken, der nur dieses Gerät betrifft.

const TAG_MS = 24 * 60 * 60 * 1000;

export async function ladeDaten() {
  const antwort = await fetch('data/prospekte.json', { cache: 'no-cache' });
  if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
  const daten = await antwort.json();
  const jetzt = Date.now();
  // Die Datei kann einen Tag alt sein.
  daten.prospekte = daten.prospekte.filter((p) => new Date(p.gueltigBis) > jetzt);
  return daten;
}

// localStorage kann fehlen oder gesperrt sein (privates Fenster); dann eben ohne Merken.
function lies(schluessel, ersatz) {
  try {
    const wert = localStorage.getItem(schluessel);
    return wert === null ? ersatz : JSON.parse(wert);
  } catch {
    return ersatz;
  }
}

function schreibe(schluessel, wert) {
  try {
    localStorage.setItem(schluessel, JSON.stringify(wert));
  } catch {}
}

export const merker = {
  ausgeblendet: () => new Set(lies('ausgeblendet', [])),
  setzeAusgeblendet: (menge) => schreibe('ausgeblendet', [...menge]),

  // { prospektId: zuletzt gelesene Seite (ab 0) }
  lesestand: () => lies('lesestand', {}),
  merkeSeite(id, seite) {
    schreibe('lesestand', { ...this.lesestand(), [id]: seite });
  },

  // Einträge zu Prospekten, die es nicht mehr gibt, wegräumen.
  raeumeAuf(ids) {
    const stand = this.lesestand();
    schreibe('lesestand', Object.fromEntries(Object.entries(stand).filter(([id]) => ids.has(id))));
  },
};

export const istNeu = (p, lesestand) =>
  !(p.id in lesestand) && Date.now() - new Date(p.erstmalsGesehen) < 3 * TAG_MS;

export const endetBald = (p) => new Date(p.gueltigBis) - Date.now() < 3 * TAG_MS;

const datum = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'numeric', timeZone: 'Europe/Berlin' });
const datumZeit = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
  month: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Berlin',
});

export const alsDatum = (zeit) => datum.format(new Date(zeit));
export const alsDatumZeit = (zeit) => datumZeit.format(new Date(zeit));

export const betrachterLink = (id) => `https://www.kaufda.de/contentViewer/static/${id}`;
export const bild = (adresse, groesse) => `${adresse}?impolicy=${groesse}`;
