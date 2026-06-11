/* ==========================================================================
   focus-trap.js — Mantiene el foco dentro de un contenedor (modales).
   Llamar desde el handler keydown del modal: trapTab(modal, e).
   ========================================================================== */

const FOCUSABLE =
  'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])';

/**
 * Cicla Tab / Shift+Tab dentro de `container`. No deja salir el foco.
 * @param {HTMLElement} container
 * @param {KeyboardEvent} event
 */
export function trapTab(container, event) {
  if (event.key !== 'Tab') return;

  const items = [...container.querySelectorAll(FOCUSABLE)].filter(
    (el) => !el.disabled && el.offsetParent !== null,
  );
  if (items.length === 0) return;

  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;

  // Shift+Tab desde el primero (o foco fuera) → al último.
  if (event.shiftKey && (active === first || !container.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    // Tab desde el último → al primero.
    event.preventDefault();
    first.focus();
  }
}
