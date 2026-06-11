/* ==========================================================================
   srs.js — SM-2 simplificado. Funciones puras: sin DOM, sin localStorage.
   Opera solo sobre el slice `card.srs`, nunca sobre la tarjeta completa.

   MAPEO CONFIANZA (1–5) → ALGORITMO — la decisión semántica central:

   ┌────────────┬──────────────────────────────────────────────────┐
   │ Confianza  │ Efecto                                           │
   ├────────────┼──────────────────────────────────────────────────┤
   │ 1–2 (fallo)│ repetitions → 0, interval → 1 día, lapses++,     │
   │            │ ease factor baja (1 baja más que 2)              │
   │ 3 (neutro) │ acierto: el intervalo crece, EF NO cambia        │
   │ 4–5        │ acierto: el intervalo crece, EF sube             │
   └────────────┴──────────────────────────────────────────────────┘

   Divergencia deliberada del SM-2 canónico: en el original, quality=3
   ("recordé con dificultad") REDUCE el ease factor. Aquí confianza 3 es
   neutral por especificación del producto, así que usamos una tabla de
   deltas en vez de la fórmula EF' = EF + (0.1 - (5-q)(0.08 + (5-q)·0.02)).
   Misma forma de curva, anclada en 3 = 0.

   Progresión de intervalos (SM-2 estándar):
     1er acierto → 1 día · 2do acierto → 6 días · después → interval × EF
   ========================================================================== */

import { DAY_MS, endOfToday } from './dates.js';

const MIN_EASE = 1.3;      // piso canónico de SM-2: evita espirales de repaso
const INITIAL_EASE = 2.5;  // EF inicial canónico

/** Delta de ease factor por nivel de confianza. Ancla: 3 → 0 (neutral). */
const EASE_DELTA = {
  1: -0.30,
  2: -0.15,
  3: 0,
  4: 0.08,
  5: 0.15,
};

/** Estado SRS inicial de una tarjeta nueva. dueAt = ahora ⇒ entra a cola hoy. */
export function createSrsState(now = Date.now()) {
  return {
    repetitions: 0,
    easeFactor: INITIAL_EASE,
    interval: 0, // días
    dueAt: now,
    lapses: 0,
  };
}

/**
 * Núcleo del algoritmo. Pura: recibe un estado SRS y una confianza,
 * devuelve un estado NUEVO. Nunca muta el original.
 *
 * @param {object} srs        - slice card.srs actual
 * @param {number} confidence - entero 1..5
 * @param {number} [now]      - epoch ms (inyectable para testear)
 * @returns {object} nuevo estado srs
 */
export function schedule(srs, confidence, now = Date.now()) {
  if (!Number.isInteger(confidence) || confidence < 1 || confidence > 5) {
    throw new RangeError(`Confianza inválida: ${confidence}. Debe ser entero 1–5.`);
  }

  const next = { ...srs };

  if (confidence <= 2) {
    // Fallo: la tarjeta vuelve al inicio de su curva de aprendizaje
    next.repetitions = 0;
    next.interval = 1;
    next.lapses = srs.lapses + 1;
  } else {
    next.repetitions = srs.repetitions + 1;
    if (next.repetitions === 1) {
      next.interval = 1;
    } else if (next.repetitions === 2) {
      next.interval = 6;
    } else {
      next.interval = Math.round(srs.interval * srs.easeFactor);
    }
  }

  const ease = srs.easeFactor + EASE_DELTA[confidence];
  next.easeFactor = Math.round(Math.max(MIN_EASE, ease) * 100) / 100;

  next.dueAt = now + next.interval * DAY_MS;
  return next;
}

/** ¿Está vencida? Vencida = dueAt cae dentro de hoy o antes. */
export function isDue(srs, now = Date.now()) {
  return srs.dueAt <= endOfToday(now);
}

/**
 * Para la UI del modo estudio: qué intervalo (en días) produciría cada
 * nivel de confianza. Permite mostrar "1d / 1d / 6d / 6d / 6d" bajo los
 * botones de rating, estilo Anki. Pura: no modifica nada.
 * @returns {{1:number,2:number,3:number,4:number,5:number}}
 */
export function previewIntervals(srs, now = Date.now()) {
  const out = {};
  for (let c = 1; c <= 5; c++) {
    out[c] = schedule(srs, c, now).interval;
  }
  return out;
}

/* ==========================================================================
   PRUEBA EN CONSOLA (antes de tocar UI) — pega esto en DevTools con el
   módulo cargado, o ejecútalo temporalmente al final de este archivo:

   const day = 86_400_000;
   let t = Date.now();

   // Tarjeta fácil: 5, 5, 5
   let a = createSrsState(t);
   a = schedule(a, 5, t);              // interval: 1,  EF: 2.65
   a = schedule(a, 5, t += day);       // interval: 6,  EF: 2.80
   a = schedule(a, 5, t += 6 * day);   // interval: 17, EF: 2.95
   console.log('fácil →', a);

   // Tarjeta difícil: 2, 2, 3
   let b = createSrsState(t);
   b = schedule(b, 2, t);              // interval: 1, EF: 2.35, lapses: 1
   b = schedule(b, 2, t += day);       // interval: 1, EF: 2.20, lapses: 2
   b = schedule(b, 3, t += day);       // interval: 1, EF: 2.20 (3 no toca EF)
   console.log('difícil →', b);

   // El piso de EF nunca se perfora
   let c = createSrsState(t);
   for (let i = 0; i < 20; i++) c = schedule(c, 1, t);
   console.log('EF mínimo →', c.easeFactor); // 1.3

   // Preview para los botones de rating
   console.log(previewIntervals(a));

   Verifica: intervalos crecen con 4–5, colapsan a 1 con 1–2,
   lapses cuenta fallos, EF nunca baja de 1.3, y confianza 3
   hace crecer el intervalo sin tocar el EF.
   ========================================================================== */
