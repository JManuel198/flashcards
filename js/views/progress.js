/* ==========================================================================
   views/progress.js — Progreso global: historial, tarjetas problemáticas y
   resumen. Solo lectura sobre storage.
   ========================================================================== */

import { getSessions, getDecks, getCards } from '../storage.js';
import { navigate } from '../router.js';
import { startOfToday, DAY_MS } from '../dates.js';

const STYLE_HREF = 'css/views/progress.css';
const MAX_SESSIONS = 20;
const WEAK_AVG = 2.5; // umbral de confianza media para "problemática"
const WEAK_LAPSES = 2;

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

function formatDate(ts) {
  return new Date(ts).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(ms) {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Racha: días consecutivos con al menos una sesión, contando desde hoy
 *  (con gracia de un día: si hoy no hay pero ayer sí, sigue contando). */
function currentStreak(sessions, now = Date.now()) {
  if (sessions.length === 0) return 0;
  const days = new Set(sessions.map((s) => startOfToday(s.startedAt)));
  let cursor = startOfToday(now);
  if (!days.has(cursor)) cursor -= DAY_MS; // gracia
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor -= DAY_MS;
  }
  return streak;
}

export function renderProgress(container) {
  ensureStyle(STYLE_HREF);

  const sessions = getSessions();
  const decks = getDecks();
  const cards = getCards();
  const deckName = (id) => decks.find((d) => d.id === id)?.name ?? 'Mazo eliminado';

  const section = el('section', 'progress');

  const back = el('button', 'progress__back', '← Volver');
  back.type = 'button';
  back.addEventListener('click', () => navigate('#/'));
  section.append(back);

  section.append(el('h1', 'progress__title', 'Progreso'));

  if (sessions.length === 0) {
    const empty = el('div', 'progress__empty');
    empty.append(el('p', 'progress__empty-title', 'Aún no has estudiado'));
    empty.append(
      el('p', 'progress__empty-hint', 'Completa una sesión de estudio para ver aquí tu historial y tus estadísticas.'),
    );
    section.append(empty);
    container.append(section);
    return;
  }

  // --- Sección 1: Historial ---------------------------------------------
  section.append(buildSection('Historial de sesiones', buildHistory(sessions, deckName)));

  // --- Sección 2: Tarjetas problemáticas --------------------------------
  section.append(buildSection('Tarjetas problemáticas', buildWeak(cards, deckName)));

  // --- Sección 3: Resumen global ----------------------------------------
  section.append(buildSection('Resumen', buildGlobal(decks, cards, sessions)));

  container.append(section);
}

function buildSection(title, body) {
  const sec = el('section', 'progress__section');
  sec.append(el('h2', 'progress__section-title', title));
  sec.append(body);
  return sec;
}

function buildHistory(sessions, deckName) {
  const list = el('ul', 'progress__sessions');
  list.setAttribute('role', 'list');
  const recent = [...sessions].sort((a, b) => b.startedAt - a.startedAt).slice(0, MAX_SESSIONS);
  for (const s of recent) {
    const row = el('li', 'progress__session');
    row.append(el('span', 'progress__session-date', formatDate(s.startedAt)));
    row.append(el('span', 'progress__session-deck', deckName(s.deckId)));
    row.append(el('span', 'progress__session-meta', `${s.cardsSeen} tarjetas · ${formatDuration(s.durationMs)}`));
    list.append(row);
  }
  return list;
}

function buildWeak(cards, deckName) {
  const weak = cards
    .filter((c) => {
      const { totalReviews, sumConfidence } = c.stats;
      if (totalReviews === 0) return false;
      const avg = sumConfidence / totalReviews;
      return c.srs.lapses >= WEAK_LAPSES || avg < WEAK_AVG;
    })
    .map((c) => ({ card: c, avg: c.stats.sumConfidence / c.stats.totalReviews }))
    .sort((a, b) => a.avg - b.avg);

  if (weak.length === 0) {
    return el('p', 'progress__none', 'Ninguna tarjeta problemática. ¡Buen trabajo!');
  }

  const list = el('ul', 'progress__weak');
  list.setAttribute('role', 'list');
  for (const { card, avg } of weak) {
    const item = el('li', 'progress__weak-item');
    const front = el('span', 'progress__weak-front', card.front);
    item.append(front);
    item.append(el('span', 'progress__weak-deck', deckName(card.deckId)));
    item.append(el('span', 'progress__weak-avg', `media ${avg.toFixed(1)}`));
    list.append(item);
  }
  return list;
}

function buildGlobal(decks, cards, sessions) {
  const grid = el('div', 'progress__stats');
  const stat = (label, value) => {
    const box = el('div', 'progress__stat');
    box.append(el('span', 'progress__stat-value', String(value)));
    box.append(el('span', 'progress__stat-label', label));
    return box;
  };
  grid.append(stat('Mazos', decks.length));
  grid.append(stat('Tarjetas', cards.length));
  grid.append(stat('Sesiones', sessions.length));
  grid.append(stat('Racha', `${currentStreak(sessions)} d`));
  return grid;
}
