/* ==========================================================================
   views/deck.js — Detalle de un mazo: sus tarjetas y las acciones del mazo.
   Recibe el id por parámetro de ruta (#/deck/:id).
   ========================================================================== */

import { getDeckById, getCardsByDeck, deleteDeck, deleteCard } from '../storage.js';
import { navigate } from '../router.js';
import { openDeckForm } from './deck-form.js';
import { openCardForm, isJapaneseDeck } from './card-form.js';
import { showToast } from '../toast.js';

const STYLE_HREF = 'css/views/deck.css';

function ensureStyle(href) {
  if (document.querySelector(`link[data-view-style="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.viewStyle = href;
  document.head.append(link);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/** Render principal. @param {string} id - id del mazo */
export function renderDeck(container, id) {
  ensureStyle(STYLE_HREF);

  const deck = getDeckById(id);
  if (!deck) {
    container.append(renderMissing());
    return;
  }

  const cards = getCardsByDeck(id);
  const ja = isJapaneseDeck(deck);
  const section = el('section', 'deck');
  section.style.setProperty('--deck-color', deck.color);

  // Volver
  const back = el('button', 'deck__back', '← Volver');
  back.type = 'button';
  back.addEventListener('click', () => navigate('#/'));

  // Cabecera
  const header = el('header', 'deck__header');
  header.append(el('h1', 'deck__title', deck.name));

  // Acciones del mazo
  const actions = el('div', 'deck__actions');

  const studyBtn = el('button', 'deck__btn deck__btn--primary', 'Estudiar');
  studyBtn.type = 'button';
  studyBtn.addEventListener('click', () => navigate(`#/study/${id}`));

  const newCardBtn = el('button', 'deck__btn', 'Nueva tarjeta');
  newCardBtn.type = 'button';
  newCardBtn.addEventListener('click', () => openCardForm(id));

  const editBtn = el('button', 'deck__btn', 'Editar mazo');
  editBtn.type = 'button';
  editBtn.addEventListener('click', () => openDeckForm(deck));

  const delBtn = el('button', 'deck__btn deck__btn--danger', 'Eliminar mazo');
  delBtn.type = 'button';
  delBtn.addEventListener('click', () => {
    const ok = window.confirm(
      `¿Eliminar "${deck.name}" y sus ${cards.length} tarjeta(s)? Esta acción no se puede deshacer.`,
    );
    if (ok) {
      deleteDeck(id);
      navigate('#/');
      showToast('Mazo eliminado', 'warning');
    }
  });

  actions.append(studyBtn, newCardBtn, editBtn, delBtn);
  section.append(back, header, actions);

  // Tarjetas o estado vacío
  if (cards.length === 0) {
    section.append(renderEmpty(id));
  } else {
    const list = el('ul', 'deck__cards');
    list.setAttribute('role', 'list');
    for (const card of cards) list.append(renderCardRow(card, ja));
    section.append(list);
  }

  container.append(section);
}

/** Estado vacío con llamada a la acción de crear la primera tarjeta. */
function renderEmpty(deckId) {
  const empty = el('div', 'deck__empty');
  empty.append(el('p', 'deck__empty-title', 'Este mazo aún no tiene tarjetas'));
  empty.append(
    el('p', 'deck__empty-hint', 'Crea la primera para empezar a estudiar.'),
  );
  const cta = el('button', 'deck__btn deck__btn--primary', 'Nueva tarjeta');
  cta.type = 'button';
  cta.addEventListener('click', () => openCardForm(deckId));
  empty.append(cta);
  return empty;
}

/** Fila de tarjeta: anverso visible, reverso con toggle, y acciones. */
function renderCardRow(card, ja) {
  const item = el('li', 'deck-card-row');

  const front = el('p', 'deck-card-row__front', card.front);
  if (ja) front.lang = 'ja';
  item.append(front);

  const back = el('p', 'deck-card-row__back', card.back);
  back.hidden = true;

  // Fila de acciones de la tarjeta (reutiliza el layout flex de .deck__actions)
  const rowActions = el('div', 'deck__actions');

  const toggle = el('button', 'deck-card-row__toggle', 'Mostrar respuesta');
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.addEventListener('click', () => {
    const show = back.hidden;
    back.hidden = !show;
    toggle.textContent = show ? 'Ocultar respuesta' : 'Mostrar respuesta';
    toggle.setAttribute('aria-expanded', String(show));
  });

  const editBtn = el('button', 'deck__btn', 'Editar');
  editBtn.type = 'button';
  editBtn.addEventListener('click', () => openCardForm(card.deckId, card));

  const delBtn = el('button', 'deck__btn deck__btn--danger', 'Eliminar');
  delBtn.type = 'button';
  delBtn.addEventListener('click', () => {
    if (window.confirm('¿Eliminar esta tarjeta? Esta acción no se puede deshacer.')) {
      deleteCard(card.id);
      navigate(window.location.hash || '#/'); // refresca la vista deck
      showToast('Tarjeta eliminada', 'warning');
    }
  });

  rowActions.append(toggle, editBtn, delBtn);
  item.append(back, rowActions);
  return item;
}

/** Mazo inexistente (id inválido en la URL). */
function renderMissing() {
  const box = el('div', 'deck__empty');
  box.append(el('p', 'deck__empty-title', 'Este mazo no existe'));
  const back = el('button', 'deck__btn deck__btn--primary', 'Volver al inicio');
  back.type = 'button';
  back.addEventListener('click', () => navigate('#/'));
  box.append(back);
  return box;
}
