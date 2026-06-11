/* ==========================================================================
   views/card-form.js — Modal para crear / editar una tarjeta.
   Sin tarjeta → modo creación. Con tarjeta → modo edición.

   El anverso lleva lang="ja" si el mazo es de japonés (nombre con "japonés"
   o "japan"). Reutiliza la cáscara de modal y los botones de deck.css; aporta
   sus campos propios desde card-form.css. Validación propia estilizada (sin
   validación nativa del navegador).
   ========================================================================== */

import { createCard as persistCard, updateCard, getDeckById } from '../storage.js';
import { createCard as buildCard } from '../models.js';
import { navigate } from '../router.js';
import { showToast } from '../toast.js';
import { trapTab } from '../focus-trap.js';

// La cáscara de modal y los botones viven en deck.css; los campos de tarjeta
// en card-form.css. Ambas se cargan de forma idempotente.
const STYLE_HREFS = ['css/views/deck.css', 'css/components/card-form.css'];

/** ¿El mazo es de japonés? Decide el lang="ja" del anverso. */
export function isJapaneseDeck(deck) {
  const name = (deck?.name ?? '').toLowerCase();
  return name.includes('japonés') || name.includes('japones') || name.includes('japan');
}

function ensureStyles() {
  for (const href of STYLE_HREFS) {
    if (document.querySelector(`link[data-view-style="${href}"]`)) continue;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.viewStyle = href;
    document.head.append(link);
  }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/**
 * Abre el modal de tarjeta.
 * @param {string} deckId - mazo al que pertenece la tarjeta.
 * @param {object|null} card - si se pasa, modo edición; si no, creación.
 */
export function openCardForm(deckId, card = null) {
  ensureStyles();

  const isEdit = !!card;
  const deck = getDeckById(deckId);
  const ja = isJapaneseDeck(deck);

  // --- Estructura ---------------------------------------------------------
  const overlay = el('div', 'modal-overlay');

  const modal = el('div', 'modal');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'card-form-title');

  const title = el('h2', 'modal__title', isEdit ? 'Editar tarjeta' : 'Nueva tarjeta');
  title.id = 'card-form-title';

  const form = el('form', 'card-form');
  form.noValidate = true; // usamos validación propia, no el bubble nativo

  // Campo: anverso
  const frontField = el('div', 'card-form__field');
  const frontLabel = el('label', 'card-form__label', 'Anverso');
  frontLabel.htmlFor = 'card-form-front';
  const frontInput = el('textarea', 'card-form__textarea card-form__textarea--front');
  frontInput.id = 'card-form-front';
  frontInput.required = true;
  frontInput.value = card?.front ?? '';
  frontInput.placeholder = ja ? '食べる' : 'Pregunta o concepto';
  if (ja) frontInput.lang = 'ja';
  frontField.append(frontLabel, frontInput);

  // Campo: reverso
  const backField = el('div', 'card-form__field');
  const backLabel = el('label', 'card-form__label', 'Reverso');
  backLabel.htmlFor = 'card-form-back';
  const backInput = el('textarea', 'card-form__textarea');
  backInput.id = 'card-form-back';
  backInput.required = true;
  backInput.value = card?.back ?? '';
  backInput.placeholder = ja ? 'taberu — comer' : 'Respuesta o definición';
  backField.append(backLabel, backInput);

  const error = el('p', 'card-form__error', 'El anverso y el reverso no pueden estar vacíos.');
  error.hidden = true;
  error.setAttribute('role', 'alert');

  // Footer (reutiliza los botones del modal de mazos)
  const footer = el('div', 'card-form__footer');
  const cancelBtn = el('button', 'deck-form__btn deck-form__btn--ghost', 'Cancelar');
  cancelBtn.type = 'button';
  const saveBtn = el(
    'button',
    'deck-form__btn deck-form__btn--primary',
    isEdit ? 'Guardar' : 'Crear',
  );
  saveBtn.type = 'submit';
  footer.append(cancelBtn, saveBtn);

  form.append(frontField, backField, error, footer);
  modal.append(title, form);
  overlay.append(modal);

  // --- Comportamiento -----------------------------------------------------
  function close() {
    document.removeEventListener('keydown', onKey);
    overlay.remove();
  }
  function onKey(e) {
    if (e.key === 'Escape') {
      close();
      return;
    }
    trapTab(modal, e); // Tab/Shift+Tab no salen del modal
  }

  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) close();
  });
  cancelBtn.addEventListener('click', close);
  document.addEventListener('keydown', onKey);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const front = frontInput.value.trim();
    const back = backInput.value.trim();
    if (!front || !back) {
      error.hidden = false;
      (!front ? frontInput : backInput).focus();
      return;
    }

    if (isEdit) {
      updateCard({ ...card, front, back });
      showToast('Tarjeta actualizada');
    } else {
      persistCard(buildCard(deckId, front, back));
      showToast('Tarjeta creada');
    }

    close();
    navigate(window.location.hash || '#/'); // refresca la vista deck
  });

  document.body.append(overlay);
  frontInput.focus();
}
