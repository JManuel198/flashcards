/* ==========================================================================
   dates.js — Semántica temporal de la app. Única fuente de verdad de "hoy".
   Lo consumen: srs.js (isDue), queue.js (filtrar vencidas), views/home.js
   (contar pendientes). Si algún día el "día de estudio" termina a las 4am
   (estilo Anki), se cambia SOLO aquí.
   ========================================================================== */

export const DAY_MS = 86_400_000;

/** Timestamp (epoch ms) del último instante del día local de `now`. */
export function endOfToday(now = Date.now()) {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/** Timestamp (epoch ms) del primer instante del día local de `now`. */
export function startOfToday(now = Date.now()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
