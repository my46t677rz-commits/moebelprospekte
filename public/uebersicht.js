// Startseite: Filterleiste und Raster der Titelbilder, nach Haus gruppiert.

import { merker, istNeu, endetBald, alsDatum, alsDatumZeit, betrachterLink, bild } from './daten.js';

const el = (tag, eigenschaften = {}, ...kinder) => {
  const knoten = Object.assign(document.createElement(tag), eigenschaften);
  knoten.append(...kinder.filter((k) => k != null));
  return knoten;
};

function karte(p, lesestand, oeffne) {
  const titelbild = el('div', { className: 'titelbild' });
  if (p.titelbild) {
    titelbild.append(el('img', { src: bild(p.titelbild, '320x480'), alt: '', loading: 'lazy', decoding: 'async' }));
  }
  if (istNeu(p, lesestand)) titelbild.append(el('span', { className: 'marke', textContent: 'neu' }));

  const gelesen = lesestand[p.id];
  if (p.art === 'seiten' && gelesen > 0) {
    const balken = el('span', { className: 'fortschritt' });
    balken.style.width = `${((gelesen + 1) / p.seiten.length) * 100}%`;
    titelbild.append(balken);
  }

  const umfang = p.art === 'seiten' ? `${p.seiten.length} S.` : 'Angebotsliste ↗';
  const angaben = el(
    'p',
    {},
    el('span', { className: endetBald(p) ? 'bald' : '', textContent: `bis ${alsDatum(p.gueltigBis)}` }),
    ` · ${umfang}`,
  );
  const inhalt = [titelbild, el('h3', { textContent: p.titel }), angaben];

  // Angebotslisten haben keine Seitenbilder und öffnen bei kaufDA.
  if (p.art !== 'seiten') {
    const link = el('a', { className: 'karte', href: betrachterLink(p.id), target: '_blank', rel: 'noopener' }, ...inhalt);
    link.addEventListener('click', () => merker.merkeSeite(p.id, 0));
    return link;
  }
  const knopf = el('button', { type: 'button', className: 'karte' }, ...inhalt);
  knopf.addEventListener('click', () => oeffne(p));
  return knopf;
}

export function zeigeUebersicht(daten, oeffne) {
  const filter = document.getElementById('filter');
  const haupt = document.getElementById('uebersicht');
  const ausgeblendet = merker.ausgeblendet();

  document.getElementById('stand').textContent = `Stand ${alsDatumZeit(daten.stand)}`;

  function zeichne() {
    const lesestand = merker.lesestand();

    filter.replaceChildren(
      ...daten.haeuser.map((haus) => {
        const anzahl = daten.prospekte.filter((p) => p.haus === haus.id).length;
        const chip = el(
          'button',
          { type: 'button', className: 'chip' },
          haus.name,
          el('span', { className: 'zahl', textContent: anzahl }),
        );
        chip.setAttribute('aria-pressed', String(!ausgeblendet.has(haus.id)));
        chip.addEventListener('click', () => {
          ausgeblendet.has(haus.id) ? ausgeblendet.delete(haus.id) : ausgeblendet.add(haus.id);
          merker.setzeAusgeblendet(ausgeblendet);
          zeichne();
        });
        return chip;
      }),
    );

    const sichtbar = daten.haeuser.filter((haus) => !ausgeblendet.has(haus.id));
    if (sichtbar.length === 0) {
      haupt.replaceChildren(
        el('p', {
          className: 'hinweis',
          textContent: daten.prospekte.length
            ? 'Alle Häuser sind ausgeblendet. Tippe oben auf ein Haus, um es wieder einzublenden.'
            : 'Zurzeit gibt es keine gültigen Prospekte.',
        }),
      );
      return;
    }

    haupt.replaceChildren(
      ...sichtbar.map((haus) => {
        const prospekte = daten.prospekte.filter((p) => p.haus === haus.id);
        const orte = [...new Set(prospekte.map((p) => p.filiale))].join(', ');
        return el(
          'section',
          { className: 'haus' },
          el(
            'div',
            { className: 'haus-kopf' },
            haus.logo ? el('img', { src: haus.logo, alt: '', loading: 'lazy' }) : null,
            el('h2', { textContent: haus.name }),
            el('span', { className: 'ort', textContent: `${orte} · ${haus.entfernungKm} km` }),
          ),
          el('div', { className: 'raster' }, ...prospekte.map((p) => karte(p, lesestand, oeffne))),
        );
      }),
    );
  }

  zeichne();
  return zeichne;
}

export function zeigeFehler(erneut) {
  const knopf = el('button', { type: 'button', textContent: 'Erneut versuchen' });
  knopf.addEventListener('click', erneut);
  document
    .getElementById('uebersicht')
    .replaceChildren(el('div', { className: 'hinweis' }, 'Die Prospekte konnten nicht geladen werden.', el('br'), knopf));
}
