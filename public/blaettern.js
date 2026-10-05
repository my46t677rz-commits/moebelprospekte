// Vollbildansicht: wischen blättert, antippen vergrößert.

import { merker, bild } from './daten.js';

const NORMAL = 'large'; // bis 1600 px
const GROSS = 'zoomlarge'; // bis 2800 px
const VORAUS = 2;

export function richteBetrachterEin(haeuser, beimSchliessen) {
  const betrachter = document.getElementById('betrachter');
  const leiste = document.getElementById('seiten');
  const zaehler = document.getElementById('b-zaehler');
  const zurueck = document.getElementById('zurueck');
  const weiter = document.getElementById('weiter');
  let prospekt = null;
  let aktuell = 0;

  const seiten = () => [...leiste.children];

  function ladeUmgebung() {
    seiten().forEach((seite, i) => {
      const img = seite.firstElementChild;
      if (Math.abs(i - aktuell) <= VORAUS && img?.dataset.src) {
        img.src = img.dataset.src;
        delete img.dataset.src;
      }
    });
  }

  function verkleinere(seite) {
    seite.classList.remove('gross');
  }

  function zeigeStand() {
    zaehler.textContent = `${aktuell + 1} / ${prospekt.seiten.length}`;
    zurueck.disabled = aktuell === 0;
    weiter.disabled = aktuell === prospekt.seiten.length - 1;
    merker.merkeSeite(prospekt.id, aktuell);
    ladeUmgebung();
  }

  function geheZu(seite, weich = true) {
    const ziel = Math.max(0, Math.min(prospekt.seiten.length - 1, seite));
    leiste.classList.toggle('weich', weich);
    leiste.scrollLeft = ziel * leiste.clientWidth;
  }

  function baueSeite(adresse) {
    const img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    img.draggable = false;
    img.dataset.src = bild(adresse, NORMAL);
    img.addEventListener('error', () => {
      const ersatz = document.createElement('span');
      ersatz.className = 'fehlt';
      ersatz.textContent = 'Seite konnte nicht geladen werden';
      img.replaceWith(ersatz);
    });

    const seite = document.createElement('div');
    seite.className = 'seite';
    seite.append(img);
    seite.addEventListener('click', (ereignis) => {
      if (!img.isConnected) return;
      if (seite.classList.contains('gross')) return verkleinere(seite);
      // Die angetippte Stelle soll nach dem Vergrößern unter dem Finger bleiben.
      const rahmen = img.getBoundingClientRect();
      const x = (ereignis.clientX - rahmen.left) / rahmen.width;
      const y = (ereignis.clientY - rahmen.top) / rahmen.height;
      if (!img.src.endsWith(`=${GROSS}`)) img.src = bild(adresse, GROSS);
      seite.classList.add('gross');
      seite.scrollLeft = x * seite.scrollWidth - seite.clientWidth / 2;
      seite.scrollTop = y * seite.scrollHeight - seite.clientHeight / 2;
    });
    return seite;
  }

  leiste.addEventListener('scroll', () => {
    if (!prospekt) return;
    const seite = Math.round(leiste.scrollLeft / leiste.clientWidth);
    if (seite === aktuell) return;
    seiten()[aktuell] && verkleinere(seiten()[aktuell]);
    aktuell = seite;
    zeigeStand();
  });

  zurueck.addEventListener('click', () => geheZu(aktuell - 1));
  weiter.addEventListener('click', () => geheZu(aktuell + 1));
  document.getElementById('schliessen').addEventListener('click', () => history.back());

  document.addEventListener('keydown', (ereignis) => {
    if (!prospekt) return;
    if (ereignis.key === 'ArrowLeft') geheZu(aktuell - 1);
    if (ereignis.key === 'ArrowRight') geheZu(aktuell + 1);
    if (ereignis.key === 'Escape') history.back();
  });

  // Die Zurück-Geste des Geräts schließt den Prospekt.
  window.addEventListener('popstate', () => {
    if (!prospekt) return;
    prospekt = null;
    betrachter.hidden = true;
    leiste.replaceChildren();
    document.body.classList.remove('gesperrt');
    beimSchliessen();
  });

  window.addEventListener('resize', () => prospekt && geheZu(aktuell, false));

  return function oeffne(p) {
    prospekt = p;
    aktuell = Math.min(merker.lesestand()[p.id] ?? 0, p.seiten.length - 1);
    // Auf der letzten Seite stehen geblieben heißt: ausgelesen, also von vorn.
    if (aktuell === p.seiten.length - 1) aktuell = 0;

    document.getElementById('b-haus').textContent = haeuser.find((h) => h.id === p.haus)?.name ?? '';
    document.getElementById('b-titel').textContent = p.titel;
    leiste.replaceChildren(...p.seiten.map(baueSeite));
    betrachter.hidden = false;
    document.body.classList.add('gesperrt');
    history.pushState({ prospekt: p.id }, '');
    geheZu(aktuell, false);
    zeigeStand();
  };
}
