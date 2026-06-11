/* ==========================================================================
   views/home.js — Lista de mazos. Primera vista real.
   Construye DOM con createElement (sin innerHTML). Cada mazo muestra nombre,
   su color como acento, total de tarjetas y cuántas vencen hoy.

   El color del mazo viaja al CSS por la custom property --deck-color en el
   elemento; home.css decide cómo pintarlo (borde de acento).
   ========================================================================== */

import { getDecks, getCardsByDeck } from '../storage.js';
import { countDue } from '../queue.js';
import { navigate } from '../router.js';
import { openDeckForm } from './deck-form.js';

const STYLE_HREF = 'css/views/home.css';

/** Inserta el <link> de la hoja de estilos de la vista una sola vez.
 *  (index.html está congelado, así que cada vista carga su propio CSS.) */
function ensureStyle(href) {
  if (document.querySelector(`link[data-view-style="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.viewStyle = href;
  document.head.append(link);
}

/** Atajo: crea un elemento con clase y texto opcionales. */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/** Render principal de la vista. */
export function renderHome(container) {
  ensureStyle(STYLE_HREF);

  const decks = getDecks();
  const section = el('section', 'home');

  // Cabecera: título + botón "Nuevo mazo" (siempre visible, aún sin lógica)
  const header = el('header', 'home__header');
  header.append(el('h1', 'home__title', 'Mazos'));

  const newDeckBtn = el('button', 'home__new-deck', 'Nuevo mazo');
  newDeckBtn.type = 'button';
  newDeckBtn.addEventListener('click', () => openDeckForm());
  header.append(newDeckBtn);
  section.append(header);

  // Cuerpo: lista de mazos o estado vacío
  if (decks.length === 0) {
    section.append(renderEmpty());
  } else {
    const list = el('ul', 'home__list');
    list.setAttribute('role', 'list');
    for (const deck of decks) list.append(renderDeckCard(deck));
    section.append(list);
  }

  // Pie discreto: enlaces a Progreso y Ajustes. Son <a href="#/..."> para que
  // el router navegue por hashchange y base.css los estilice sin tocar home.css.
  const footer = el('nav', 'home__footer');
  footer.setAttribute('aria-label', 'Secundaria');
  const progressLink = el('a', 'home__progress', 'Progreso');
  progressLink.href = '#/progress';
  const settingsLink = el('a', 'home__settings', 'Ajustes');
  settingsLink.href = '#/settings';
  footer.append(progressLink, document.createTextNode(' · '), settingsLink);
  section.append(footer);

  container.append(section);
}

/** Estado vacío con mensaje útil. */
function renderEmpty() {
  const empty = el('div', 'home__empty');
  empty.append(el('p', 'home__empty-title', 'Aún no tienes mazos'));
  empty.append(
    el('p', 'home__empty-hint', 'Crea tu primer mazo para empezar a estudiar.'),
  );
  return empty;
}

/** Una tarjeta de mazo, clickeable → #/deck/:id. */
function renderDeckCard(deck) {
  const cards = getCardsByDeck(deck.id);
  const total = cards.length;
  // Fuente de verdad: el mismo conteo que la cola de estudio (countDue).
  const due = countDue(cards, { newLimit: 10 });

  const item = el('li', 'home__item');

  const card = el('button', 'deck-card');
  card.type = 'button';
  card.style.setProperty('--deck-color', deck.color);
  card.addEventListener('click', () => navigate(`#/deck/${deck.id}`));

  card.append(el('h2', 'deck-card__name', deck.name));

  const meta = el('div', 'deck-card__meta');
  meta.append(
    el('span', 'deck-card__count', `${total} ${total === 1 ? 'tarjeta' : 'tarjetas'}`),
  );

  const dueLabel = due > 0 ? `${due} pendientes hoy` : 'Al día';
  const dueBadge = el('span', 'deck-card__due', dueLabel);
  if (due > 0) dueBadge.classList.add('deck-card__due--active');
  meta.append(dueBadge);

  card.append(meta);
  item.append(card);
  return item;
}
