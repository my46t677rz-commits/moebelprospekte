import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leseRegal, leseSeiten, leseLogo } from '../scripts/kaufda.js';
import { sammle, istPlausibel, entfernungKm } from '../scripts/sammeln.js';

const fixture = (name) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));

const STANDORT = { lat: 48.5053, lng: 11.76 };
const JETZT = new Date('2026-10-05T10:00:00Z');
const optionen = (mehr = {}) => ({ standort: STANDORT, radiusKm: 40, jetzt: JETZT, vorher: null, ...mehr });

test('leseRegal übernimmt Prospekte und überspringt Blog-Einträge', () => {
  const roh = leseRegal(fixture('regal'));
  assert.equal(roh.length, 8);
  const roller = roh.find((p) => p.haus.name === 'ROLLER');
  assert.equal(roller.haus.id, 'DE-1063');
  assert.equal(roller.art, 'seiten');
  assert.equal(roller.gueltigBis, '2026-10-24T21:00:00.000Z');
  assert.equal(roller.filiale.ort, 'Eching');
  assert.match(roller.titelbild, /^https:\/\/content-media\.bonial\.biz\/.+\/preview\.jpg$/);
  assert.equal(roh.find((p) => p.haus.name === 'IKEA').art, 'liste');
});

test('leseSeiten liefert Bildadressen ohne Größenangabe in Seitenreihenfolge', () => {
  const seiten = leseSeiten(fixture('seiten'));
  assert.equal(seiten.length, 3);
  assert.match(seiten[0], /zoomlarge_page_0\.jpg$/);
  assert.match(seiten[2], /zoomlarge_page_2\.jpg$/);
});

test('leseLogo findet das Händlerlogo', () => {
  assert.match(leseLogo(fixture('details')), /publisher-logos\/.+impolicy=128x128$/);
  assert.equal(leseLogo({}), null);
});

test('entfernungKm rechnet Luftlinie', () => {
  const eching = { lat: 48.3054, lng: 11.636 };
  assert.ok(Math.abs(entfernungKm(STANDORT, eching) - 24) < 1);
});

test('sammle behält nur Häuser im Umkreis', () => {
  const daten = sammle(leseRegal(fixture('regal')), optionen());
  const namen = daten.haeuser.map((h) => h.name);
  assert.ok(namen.includes('ROLLER'));
  assert.ok(!namen.includes('Möbel Inhofer'));
  assert.deepEqual(
    daten.haeuser.map((h) => h.entfernungKm),
    daten.haeuser.map((h) => h.entfernungKm).toSorted((a, b) => a - b),
  );
});

test('sammle verwirft Abgelaufene und Doppelte', () => {
  const roh = leseRegal(fixture('regal'));
  const spaeter = new Date('2026-10-25T00:00:00Z');
  const ids = sammle([...roh, ...roh], optionen()).prospekte.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  const roller = roh.find((p) => p.haus.name === 'ROLLER');
  assert.ok(!sammle(roh, optionen({ jetzt: spaeter })).prospekte.some((p) => p.id === roller.id));
});

test('sammle übernimmt erstmalsGesehen, Seiten und Logos aus der vorherigen Datei', () => {
  const roh = leseRegal(fixture('regal'));
  const erster = sammle(roh, optionen());
  const roller = erster.prospekte.find((p) => p.haus === 'DE-1063');
  assert.equal(roller.erstmalsGesehen, '2026-09-26');

  roller.seiten = ['https://example.org/a.jpg'];
  roller.erstmalsGesehen = '2026-10-01';
  erster.haeuser.find((h) => h.id === 'DE-1063').logo = 'https://example.org/logo.png';
  const ohneIkea = { ...erster, prospekte: erster.prospekte.filter((p) => p.art !== 'liste') };

  const zweiter = sammle(roh, optionen({ vorher: ohneIkea }));
  const wieder = zweiter.prospekte.find((p) => p.id === roller.id);
  assert.equal(wieder.erstmalsGesehen, '2026-10-01');
  assert.deepEqual(wieder.seiten, ['https://example.org/a.jpg']);
  assert.equal(zweiter.haeuser.find((h) => h.id === 'DE-1063').logo, 'https://example.org/logo.png');
  assert.equal(zweiter.prospekte.find((p) => p.art === 'liste').erstmalsGesehen, '2026-10-05');
});

test('istPlausibel schützt vor leeren und stark geschrumpften Ergebnissen', () => {
  const mit = (n) => ({ prospekte: Array(n).fill({}) });
  assert.equal(istPlausibel(mit(0), null), false);
  assert.equal(istPlausibel(mit(3), null), true);
  assert.equal(istPlausibel(mit(9), mit(20)), false);
  assert.equal(istPlausibel(mit(10), mit(20)), true);
});
