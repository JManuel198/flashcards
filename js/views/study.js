/* ==========================================================================
   views/study.js — Modo estudio. Construye la cola, muestra la tarjeta actual,
   gestiona el volteo (clic / Espacio) y los botones de confianza 1–5.
   El volteo es 100% CSS (card.css): JS solo alterna la clase .is-flipped.
   ========================================================================== */

import { getDeckById, getCardsByDeck } from '../storage.js';
import { navigate } from '../router.js';
import { buildQueue } from '../queue.js';
import { createSessionState, recordAnswer, closeSession } from '../session.js';
import { isJapaneseDeck } from './card-form.js';
import { endOfToday, startOfToday, DAY_MS } from '../dates.js';

const STYLE_HREF = 'css/views/study.css';

const RATINGS = [
  [1, 'Bloqueado'],
  [2, 'Difícil'],
  [3, 'Regular'],
  [4, 'Bien'],
  [5, 'Fácil'],
];

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

/** Tarjeta 3D según el contrato de card.css. */
function buildCardEl(card, ja) {
  const cardEl = el('div', 'card');
  cardEl.tabIndex = 0;
  cardEl.setAttribute('role', 'button');
  cardEl.setAttribute('aria-pressed', 'false');
  cardEl.setAttribute('aria-label', 'Voltear tarjeta');

  const inner = el('div', 'card__inner');

  const front = el('div', 'card__face card__face--front');
  const frontContent = el('p', 'card__content', card.front);
  if (ja) frontContent.lang = 'ja';
  front.append(frontContent);

  const back = el('div', 'card__face card__face--back');
  back.append(el('p', 'card__content', card.back));

  inner.append(front, back);
  cardEl.append(inner);
  return cardEl;
}

/** Fila de botones de confianza. */
function buildRates(onAnswer) {
  const wrap = el('div', 'study__rates');
  for (const [value, label] of RATINGS) {
    const btn = el('button', `study__rate study__rate--${value}`);
    btn.type = 'button';
    btn.setAttribute('aria-label', `Confianza ${value} - ${label}`);
    btn.append(el('span', 'study__rate-num', String(value)));
    btn.append(el('span', 'study__rate-label', label));
    btn.addEventListener('click', () => onAnswer(value));
    wrap.append(btn);
  }
  return wrap;
}

export function renderStudy(container, deckId) {
  ensureStyle(STYLE_HREF);

  const deck = getDeckById(deckId);
  if (!deck) {
    container.append(renderMessage('Este mazo no existe', 'Volver al inicio'));
    return;
  }

  const now = Date.now();
  const cards = getCardsByDeck(deckId);
  const queue = buildQueue(cards, { now });
  const ja = isJapaneseDeck(deck);

  if (queue.length === 0) {
    container.append(renderAllDone(cards, now));
    return;
  }

  let session = createSessionState(deckId, queue, now);
  let cardEl = null;
  let flipped = false;

  const section = el('section', 'study');
  const counter = el('p', 'study__counter');
  const cardWrap = el('div', 'study__card-wrap');
  const rates = buildRates(onAnswer);
  rates.hidden = true;
  section.append(counter, cardWrap, rates);

  function showCard(index) {
    const card = session.queue[index];
    counter.textContent = `Tarjeta ${index + 1} de ${session.queue.length}`;
    flipped = false;
    rates.hidden = true;
    cardEl = buildCardEl(card, ja);
    cardEl.addEventListener('click', flip);
    cardWrap.replaceChildren(cardEl);
  }

  function flip() {
    flipped = !flipped;
    cardEl.classList.toggle('is-flipped', flipped);
    cardEl.setAttribute('aria-pressed', String(flipped));
    rates.hidden = !flipped; // los botones solo tras voltear
  }

  function onAnswer(confidence) {
    if (!flipped) return; // hay que ver la respuesta antes de calificar
    const card = session.queue[session.index];
    session = recordAnswer(session, card, confidence, Date.now());
    if (session.index >= session.queue.length) {
      finish();
    } else {
      showCard(session.index);
    }
  }

  function finish() {
    cleanup();
    const saved = closeSession(session, Date.now());
    navigate(`#/summary/${saved.id}`);
  }

  function onKeyDown(e) {
    if (e.key === ' ' || e.code === 'Space') {
      // Si el foco está en un botón de confianza, dejar que se active él.
      if (e.target.closest && e.target.closest('.study__rate')) return;
      e.preventDefault();
      if (cardEl) flip();
    } else if (e.key === 'Escape') {
      navigate('#/'); // abandona la sesión sin guardarla
    }
  }

  // El router no notifica el desmontaje: limpiamos los listeners globales al
  // cambiar de hash (salir de la vista por finish, Escape o navegación).
  function cleanup() {
    document.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('hashchange', cleanup);
  }
  document.addEventListener('keydown', onKeyDown);
  window.addEventListener('hashchange', cleanup);

  container.append(section);
  showCard(0);
}

/** Pantalla "Todo al día" cuando la cola está vacía. */
function renderAllDone(cards, now) {
  const box = el('div', 'study__done');
  box.append(el('h1', 'study__done-title', 'Todo al día'));

  let hint;
  if (cards.length === 0) {
    hint = 'Este mazo no tiene tarjetas todavía.';
  } else {
    const next = cards
      .map((c) => c.srs.dueAt)
      .filter((d) => d > endOfToday(now))
      .sort((a, b) => a - b)[0];
    if (next) {
      const days = Math.max(1, Math.round((startOfToday(next) - startOfToday(now)) / DAY_MS));
      hint = days === 1
        ? 'La próxima tarjeta vence mañana.'
        : `La próxima tarjeta vence en ${days} días.`;
    } else {
      hint = 'No tienes tarjetas pendientes.';
    }
  }
  box.append(el('p', 'study__done-hint', hint));

  const back = el('button', 'study__btn', 'Volver');
  back.type = 'button';
  back.addEventListener('click', () => navigate('#/'));
  box.append(back);
  return box;
}

/** Mensaje genérico (mazo inexistente) con botón a home. */
function renderMessage(title, btnText) {
  const box = el('div', 'study__done');
  box.append(el('h1', 'study__done-title', title));
  const back = el('button', 'study__btn', btnText);
  back.type = 'button';
  back.addEventListener('click', () => navigate('#/'));
  box.append(back);
  return box;
}
