import { ladeDaten, merker } from './daten.js';
import { zeigeUebersicht, zeigeFehler } from './uebersicht.js';
import { richteBetrachterEin } from './blaettern.js';

async function starte() {
  let daten;
  try {
    daten = await ladeDaten();
  } catch {
    zeigeFehler(starte);
    return;
  }
  merker.raeumeAuf(new Set(daten.prospekte.map((p) => p.id)));

  let zeichne = () => {};
  const oeffne = richteBetrachterEin(daten.haeuser, () => zeichne());
  zeichne = zeigeUebersicht(daten, oeffne);
}

starte();
