/* ==========================================================================
   session.js — Ciclo de vida de una sesión de estudio.
   Orquesta srs.js (algoritmo) + storage.js (persistencia). El estado de sesión
   es inmutable: recordAnswer devuelve un estado NUEVO, no muta el anterior.
   ========================================================================== */

import { schedule } from './srs.js';
import { isNewCard } from './queue.js';
import { updateCard, createSession as persistSession } from './storage.js';
import { createSession as buildSession } from './models.js';

const RECENT_CAP = 10; // tope del historial reciente de confianzas por tarjeta

/**
 * Estado inicial de una sesión.
 * @param {string} deckId
 * @param {object[]} queue - cola ya construida (buildQueue)
 */
export function createSessionState(deckId, queue, now = Date.now()) {
  return {
    deckId,
    queue,
    index: 0,
    startedAt: now,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    weakCardIds: [],
    cardsSeen: 0,
    newCards: 0,
    reviewCards: 0,
  };
}

/**
 * Registra la respuesta a la tarjeta actual:
 *  - reprograma su srs con schedule()
 *  - actualiza stats (totalReviews, sumConfidence, recent con tope 10)
 *  - persiste la tarjeta con updateCard()
 *  - acumula distribución, weakCardIds (confidence ≤ 2) y contadores
 *  - avanza el índice
 * @returns {object} nuevo estado de sesión
 */
export function recordAnswer(sessionState, card, confidence, now = Date.now()) {
  const wasNew = isNewCard(card); // determinar ANTES de reprogramar

  const recent = [...card.stats.recent, confidence].slice(-RECENT_CAP);
  const updatedCard = {
    ...card,
    srs: schedule(card.srs, confidence, now),
    stats: {
      totalReviews: card.stats.totalReviews + 1,
      sumConfidence: card.stats.sumConfidence + confidence,
      recent,
    },
  };
  updateCard(updatedCard);

  const isWeak = confidence <= 2;
  return {
    ...sessionState,
    index: sessionState.index + 1,
    cardsSeen: sessionState.cardsSeen + 1,
    newCards: sessionState.newCards + (wasNew ? 1 : 0),
    reviewCards: sessionState.reviewCards + (wasNew ? 0 : 1),
    distribution: {
      ...sessionState.distribution,
      [confidence]: sessionState.distribution[confidence] + 1,
    },
    weakCardIds:
      isWeak && !sessionState.weakCardIds.includes(card.id)
        ? [...sessionState.weakCardIds, card.id]
        : sessionState.weakCardIds,
  };
}

/**
 * Cierra la sesión: arma el objeto final con durationMs real y lo persiste.
 * @returns {object} la sesión guardada (incluye su id).
 */
export function closeSession(sessionState, now = Date.now()) {
  // buildSession(deckId, now) fija startedAt = now → pasamos el startedAt real.
  const session = buildSession(sessionState.deckId, sessionState.startedAt);
  session.durationMs = Math.max(0, now - sessionState.startedAt);
  session.cardsSeen = sessionState.cardsSeen;
  session.newCards = sessionState.newCards;
  session.reviewCards = sessionState.reviewCards;
  session.distribution = { ...sessionState.distribution };
  session.weakCardIds = [...sessionState.weakCardIds];
  return persistSession(session);
}
