// Reine Logik ohne Netzwerk: filtern, zusammenführen, sortieren, prüfen.

export function entfernungKm(a, b) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const tag = (zeit) => new Date(zeit).toISOString().slice(0, 10);

// Rohliste aus dem Regal -> Prospekte im Umkreis, ohne Doppelte und Abgelaufene.
// `vorher` ist der Inhalt der letzten prospekte.json (oder null beim ersten Lauf).
export function sammle(roh, { standort, radiusKm, jetzt, vorher }) {
  const alt = new Map((vorher?.prospekte ?? []).map((p) => [p.id, p]));
  const gesehen = new Set();
  const prospekte = [];

  for (const p of roh) {
    if (gesehen.has(p.id)) continue;
    gesehen.add(p.id);
    if (!p.filiale) continue;
    const km = entfernungKm(standort, p.filiale);
    if (km > radiusKm) continue;
    if (new Date(p.gueltigBis) <= jetzt) continue;

    prospekte.push({
      id: p.id,
      haus: p.haus.id,
      titel: p.titel,
      gueltigVon: p.gueltigVon,
      gueltigBis: p.gueltigBis,
      // Beim allerersten Lauf wäre sonst alles "neu".
      erstmalsGesehen: alt.get(p.id)?.erstmalsGesehen ?? (vorher ? tag(jetzt) : tag(p.gueltigVon)),
      art: p.art,
      titelbild: p.titelbild,
      filiale: p.filiale.ort,
      entfernungKm: Math.round(km),
      seiten: alt.get(p.id)?.seiten ?? [],
    });
  }

  const namen = new Map(roh.map((p) => [p.haus.id, p.haus.name]));
  const logos = new Map((vorher?.haeuser ?? []).map((h) => [h.id, h.logo]));
  const haeuser = [...new Set(prospekte.map((p) => p.haus))]
    .map((id) => ({
      id,
      name: namen.get(id),
      logo: logos.get(id) ?? null,
      entfernungKm: Math.min(...prospekte.filter((p) => p.haus === id).map((p) => p.entfernungKm)),
    }))
    .sort((a, b) => a.entfernungKm - b.entfernungKm || a.name.localeCompare(b.name, 'de'));

  const rang = new Map(haeuser.map((h, i) => [h.id, i]));
  prospekte.sort(
    (a, b) =>
      rang.get(a.haus) - rang.get(b.haus) ||
      b.gueltigVon.localeCompare(a.gueltigVon) ||
      a.titel.localeCompare(b.titel, 'de'),
  );

  return { stand: jetzt.toISOString(), haeuser, prospekte };
}

// Schutz davor, eine gute Datei mit einem kaputten Abruf zu überschreiben.
export function istPlausibel(neu, vorher) {
  if (neu.prospekte.length === 0) return false;
  if (!vorher) return true;
  return neu.prospekte.length >= vorher.prospekte.length / 2;
}
