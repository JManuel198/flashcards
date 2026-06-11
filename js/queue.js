/* ==========================================================================
   queue.js — Construcción de la cola de estudio. Funciones puras: no tocan
   DOM ni storage, no mutan las tarjetas que reciben.

   Dos buckets, en este orden:
     1. Repasos vencidos  — tarjetas ya vistas (repetitions > 0) con dueAt
        dentro de hoy o antes. Orden: más vencida primero (dueAt asc) y, a
        igualdad, más difícil primero (easeFactor asc).
     2. Tarjetas nuevas   — nunca vistas (repetitions === 0). Rellenan hasta
        que la cola alcanza `newLimit` en total.

   Nota de diseño: las nuevas no entran como "vencidas" aunque su dueAt sea
   hoy; son un bucket aparte sujeto a newLimit, al estilo Anki.
   ========================================================================== */

import { endOfToday } from './dates.js';

/** ¿Tarjeta nunca repasada? */
export function isNewCard(card) {
  return card.srs.repetitions === 0;
}

/** Repaso vencido: ya visto (repetitions > 0) y con dueAt dentro de hoy o antes.
 *  Predicado compartido por buildQueue y countDue para que no puedan divergir. */
function isDueReview(card, todayEnd) {
  return card.srs.repetitions > 0 && card.srs.dueAt <= todayEnd;
}

/**
 * Construye la cola de estudio.
 * @param {object[]} cards - tarjetas del mazo.
 * @param {{now?:number, newLimit?:number}} [opts]
 * @returns {object[]} cola ordenada (referencias a las tarjetas, sin mutar).
 */
export function buildQueue(cards, { now = Date.now(), newLimit = 10 } = {}) {
  const todayEnd = endOfToday(now);

  const dueReviews = cards
    .filter((c) => isDueReview(c, todayEnd))
    .sort((a, b) => a.srs.dueAt - b.srs.dueAt || a.srs.easeFactor - b.srs.easeFactor);

  // Rellenar con nuevas hasta completar newLimit en total.
  const slots = Math.max(0, newLimit - dueReviews.length);
  const newCards = cards
    .filter(isNewCard)
    .sort((a, b) => a.srs.dueAt - b.srs.dueAt)
    .slice(0, slots);

  return [...dueReviews, ...newCards];
}

/**
 * Cuenta cuántas tarjetas entrarían en la cola, sin construirla. Misma lógica
 * que buildQueue (repasos vencidos + nuevas hasta newLimit). Fuente de verdad
 * del badge de pendientes en home.
 * @param {object[]} cards
 * @param {{now?:number, newLimit?:number}} [opts]
 * @returns {number}
 */
export function countDue(cards, { now = Date.now(), newLimit = 10 } = {}) {
  const todayEnd = endOfToday(now);

  const dueReviews = cards.filter((c) => isDueReview(c, todayEnd)).length;
  const slots = Math.max(0, newLimit - dueReviews);
  const newCards = cards.filter(isNewCard).length;

  return dueReviews + Math.min(slots, newCards);
}
