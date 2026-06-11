/* ==========================================================================
   models.js — Factories de entidades. Cada factory devuelve un objeto COMPLETO
   con todos sus defaults; no toca storage ni DOM. IDs vía crypto.randomUUID,
   timestamps vía Date.now() (inyectable como `now` para poder testear).

   El slice `srs` se construye con createSrsState() de srs.js: esa es la única
   fuente de verdad de los valores iniciales del algoritmo. Si cambian allí,
   cambian aquí sin tocar este archivo.
   ========================================================================== */

import { createSrsState } from './srs.js';

/**
 * Mazo. El color es un acento visual (hex) para la tarjeta de mazo en home.
 * @returns {{id,name,color,createdAt,updatedAt}}
 */
export function createDeck(name, color, now = Date.now()) {
  return {
    id: crypto.randomUUID(),
    name,
    color,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Tarjeta. `front`/`back` son el contenido (front suele ser japonés, back la
 * lectura/traducción). dueAt = now ⇒ vencida de inmediato, entra a la primera
 * sesión. `stats` acumula histórico para la vista de progreso.
 * @returns {{id,deckId,front,back,createdAt,srs,stats}}
 */
export function createCard(deckId, front, back, now = Date.now()) {
  return {
    id: crypto.randomUUID(),
    deckId,
    front,
    back,
    createdAt: now,
    srs: createSrsState(now), // { repetitions:0, easeFactor:2.5, interval:0, dueAt:now, lapses:0 }
    stats: {
      totalReviews: 0,
      sumConfidence: 0, // permite media de confianza sin recorrer `recent`
      recent: [],       // últimas confianzas, para tendencia
    },
  };
}

/**
 * Sesión de estudio. Append-only: se crea al empezar y se va completando
 * (durationMs, cardsSeen, distribution…) durante la sesión.
 * @returns {object}
 */
export function createSession(deckId, now = Date.now()) {
  return {
    id: crypto.randomUUID(),
    deckId,
    startedAt: now,
    durationMs: 0,
    cardsSeen: 0,
    newCards: 0,
    reviewCards: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    weakCardIds: [],
  };
}

/* ==========================================================================
   SEED — ejecutar UNA SOLA VEZ en la consola del navegador (en localhost:8000)
   para tener datos reales en el Paso 3. Crea 2 mazos con 3 tarjetas cada uno.

   const storage = await import('/js/storage.js');
   const models  = await import('/js/models.js');

   storage.initStorage();

   const n5 = models.createDeck('Japonés N5', '#d95d42');
   const fe = models.createDeck('Frontend',   '#5fa882');
   storage.createDeck(n5);
   storage.createDeck(fe);

   [
     models.createCard(n5.id, '食べる', 'taberu — comer'),
     models.createCard(n5.id, '水',     'mizu — agua'),
     models.createCard(n5.id, '学校',   'gakkō — escuela'),
     models.createCard(fe.id, 'closure',     'Función que recuerda su scope léxico al crearse.'),
     models.createCard(fe.id, 'event loop',  'Modelo de concurrencia: cola de tareas + call stack.'),
     models.createCard(fe.id, 'specificity', 'Peso de un selector CSS que decide qué regla gana.'),
   ].forEach((card) => storage.createCard(card));

   console.log(storage.exportAll());
   ========================================================================== */
