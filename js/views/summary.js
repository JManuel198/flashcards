/* ==========================================================================
   views/summary.js — Resumen post-sesión. Recibe el sessionId por ruta,
   carga la sesión y muestra sus métricas con la distribución de confianza.
   ========================================================================== */

import { getSessions, getDeckById } from '../storage.js';
import { navigate } from '../router.js';

const STYLE_HREF = 'css/views/summary.css';

const RATING_LABELS = {
  1: 'Bloqueado',
  2: 'Difícil',
  3: 'Regular',
  4: 'Bien',
  5: 'Fácil',
};

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

function formatDateTime(ts) {
  return new Date(ts).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** mm:ss a partir de milisegundos. */
function formatDuration(ms) {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function stat(label, value) {
  const box = el('div', 'summary__stat');
  box.append(el('span', 'summary__stat-value', String(value)));
  box.append(el('span', 'summary__stat-label', label));
  return box;
}

/** Barra proporcional + leyenda de la distribución de confianza. */
function buildDistribution(distribution) {
  const wrap = el('div', 'summary__dist');
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);

  const bar = el('div', 'summary__dist-bar');
  bar.setAttribute('role', 'img');
  bar.setAttribute('aria-label', 'Distribución de confianza');
  for (let level = 1; level <= 5; level++) {
    const count = distribution[level] || 0;
    if (count === 0) continue;
    const seg = el('div', `summary__dist-seg summary__dist-seg--${level}`, String(count));
    seg.style.flexGrow = String(count);
    seg.title = `${RATING_LABELS[level]}: ${count}`;
    bar.append(seg);
  }
  wrap.append(bar);

  // Leyenda: qué color es cada nivel
  const legend = el('div', 'summary__legend');
  for (let level = 1; level <= 5; level++) {
    const item = el('div', 'summary__legend-item');
    item.append(el('span', `summary__legend-dot summary__dist-seg--${level}`));
    item.append(el('span', 'summary__legend-label', `${level} ${RATING_LABELS[level]}`));
    legend.append(item);
  }
  wrap.append(legend);

  return wrap;
}

export function renderSummary(container, sessionId) {
  ensureStyle(STYLE_HREF);

  const session = getSessions().find((s) => s.id === sessionId);
  if (!session) {
    container.append(renderMessage('Sesión no encontrada', '#/', 'Inicio'));
    return;
  }

  const deck = getDeckById(session.deckId);
  const deckName = deck?.name ?? 'Mazo eliminado';

  const section = el('section', 'summary');

  // Cabecera
  const header = el('header', 'summary__header');
  header.append(el('h1', 'summary__title', 'Sesión completada'));
  header.append(el('p', 'summary__subtitle', `${deckName} · ${formatDateTime(session.startedAt)}`));
  section.append(header);

  // Métricas
  const stats = el('div', 'summary__stats');
  stats.append(stat('Duración', formatDuration(session.durationMs)));
  stats.append(stat('Vistas', session.cardsSeen));
  stats.append(stat('Nuevas', session.newCards));
  stats.append(stat('Repaso', session.reviewCards));
  section.append(stats);

  // Distribución
  section.append(buildDistribution(session.distribution));

  // Tarjetas débiles
  const weak = session.weakCardIds?.length ?? 0;
  if (weak > 0) {
    const note = el(
      'p',
      'summary__weak',
      weak === 1
        ? '1 tarjeta necesita más repaso.'
        : `${weak} tarjetas necesitan más repaso.`,
    );
    section.append(note);
  }

  // Acciones
  const actions = el('div', 'summary__actions');

  const again = el('button', 'summary__btn summary__btn--primary', 'Estudiar de nuevo');
  again.type = 'button';
  again.addEventListener('click', () => navigate(`#/study/${session.deckId}`));

  const toDeck = el('button', 'summary__btn', 'Volver al mazo');
  toDeck.type = 'button';
  toDeck.addEventListener('click', () => navigate(`#/deck/${session.deckId}`));

  const home = el('button', 'summary__btn', 'Inicio');
  home.type = 'button';
  home.addEventListener('click', () => navigate('#/'));

  actions.append(again, toDeck, home);
  section.append(actions);

  container.append(section);
}

/** Mensaje genérico con un botón de navegación. */
function renderMessage(title, route, btnText) {
  const box = el('div', 'summary');
  box.append(el('h1', 'summary__title', title));
  const btn = el('button', 'summary__btn summary__btn--primary', btnText);
  btn.type = 'button';
  btn.addEventListener('click', () => navigate(route));
  box.append(btn);
  return box;
}
