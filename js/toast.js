/* ==========================================================================
   toast.js — Feedback efímero para acciones (crear, eliminar, etc.).
   Una sola región aria-live; cada toast se autodescarta. Colores por tipo:
   success → matcha, error → aka, warning → kohaku (tokens de confianza).
   ========================================================================== */

const STYLE_HREF = 'css/components/toast.css';
const DEFAULT_TIMEOUT = 2600;

let region = null;

function ensureStyle() {
  if (document.querySelector(`link[data-view-style="${STYLE_HREF}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = STYLE_HREF;
  link.dataset.viewStyle = STYLE_HREF;
  document.head.append(link);
}

function ensureRegion() {
  if (region && document.body.contains(region)) return region;
  region = document.createElement('div');
  region.className = 'toast-region';
  document.body.append(region);
  return region;
}

/**
 * Muestra un toast.
 * @param {string} message
 * @param {'success'|'error'|'warning'} [kind='success']
 */
export function showToast(message, kind = 'success', timeout = DEFAULT_TIMEOUT) {
  ensureStyle();
  const host = ensureRegion();

  const toast = document.createElement('div');
  toast.className = `toast toast--${kind}`;
  // error: assertive (alert); resto: polite (status)
  toast.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  toast.textContent = message;
  host.append(toast);

  requestAnimationFrame(() => toast.classList.add('is-visible'));

  setTimeout(() => {
    toast.classList.remove('is-visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    setTimeout(() => toast.remove(), 400); // por si no hay transición (reduced motion)
  }, timeout);
}
