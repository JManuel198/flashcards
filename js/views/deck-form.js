/* ==========================================================================
   views/deck-form.js — Modal para crear / editar un mazo.
   Sin argumento → modo creación. Con un mazo → modo edición.

   Construido con createElement. Al guardar, persiste vía storage y re-renderiza
   la vista activa (navigate al hash actual fuerza un re-render). Cancelar,
   clic fuera del modal o Escape cierran sin guardar.
   ========================================================================== */

import { createDeck as persistDeck, updateDeck } from '../storage.js';
import { createDeck as buildDeck } from '../models.js';
import { navigate } from '../router.js';
import { showToast } from '../toast.js';
import { trapTab } from '../focus-trap.js';

const STYLE_HREF = 'css/views/deck.css';

/** Paleta sugerida (acentos japoneses desaturados). El usuario puede además
 *  elegir un color libre con el input nativo. */
const PRESET_COLORS = [
  '#d95d42', // shu
  '#c9904f', // kohaku
  '#8aa66b', // wasabi
  '#5fa882', // matcha
  '#6b8aa6', // ai (azul)
  '#9b7fb0', // murasaki (violeta)
];

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

/**
 * Abre el modal de mazo.
 * @param {object|null} deck - si se pasa, modo edición; si no, creación.
 */
export function openDeckForm(deck = null) {
  ensureStyle(STYLE_HREF);

  const isEdit = !!deck;
  let selectedColor = deck?.color ?? PRESET_COLORS[0];

  // --- Estructura ---------------------------------------------------------
  const overlay = el('div', 'modal-overlay');

  const modal = el('div', 'modal');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'deck-form-title');

  const title = el('h2', 'modal__title', isEdit ? 'Editar mazo' : 'Nuevo mazo');
  title.id = 'deck-form-title';

  const form = el('form', 'deck-form');
  // Validación propia (estilizada). `required` se mantiene como pista de
  // accesibilidad, pero desactivamos el bubble nativo para usar nuestro mensaje.
  form.noValidate = true;

  // Campo: nombre
  const nameField = el('div', 'deck-form__field');
  const nameLabel = el('label', 'deck-form__label', 'Nombre');
  nameLabel.htmlFor = 'deck-form-name';
  const nameInput = el('input', 'deck-form__input');
  nameInput.id = 'deck-form-name';
  nameInput.type = 'text';
  nameInput.required = true;
  nameInput.value = deck?.name ?? '';
  nameInput.placeholder = 'p. ej. Japonés N5';
  nameField.append(nameLabel, nameInput);

  const error = el('p', 'deck-form__error', 'El nombre no puede estar vacío.');
  error.hidden = true;
  error.setAttribute('role', 'alert');

  // Campo: color (swatches + color libre)
  const colorField = el('div', 'deck-form__field');
  colorField.append(el('label', 'deck-form__label', 'Color'));

  const swatches = el('div', 'deck-form__swatches');
  const colorInput = el('input', 'deck-form__color');
  colorInput.type = 'color';
  colorInput.value = selectedColor;
  colorInput.setAttribute('aria-label', 'Color personalizado');

  const swatchBtns = [];
  function syncSelection() {
    for (const b of swatchBtns) {
      const on = b.dataset.color.toLowerCase() === selectedColor.toLowerCase();
      b.classList.toggle('is-selected', on);
      b.setAttribute('aria-pressed', String(on));
    }
    colorInput.value = selectedColor;
  }

  for (const c of PRESET_COLORS) {
    const sw = el('button', 'deck-form__swatch');
    sw.type = 'button';
    sw.dataset.color = c;
    sw.style.setProperty('--swatch', c);
    sw.setAttribute('aria-label', `Color ${c}`);
    sw.addEventListener('click', () => {
      selectedColor = c;
      syncSelection();
    });
    swatchBtns.push(sw);
    swatches.append(sw);
  }

  colorInput.addEventListener('input', () => {
    selectedColor = colorInput.value;
    syncSelection();
  });
  swatches.append(colorInput);
  colorField.append(swatches);

  // Footer
  const footer = el('div', 'deck-form__footer');
  const cancelBtn = el('button', 'deck-form__btn deck-form__btn--ghost', 'Cancelar');
  cancelBtn.type = 'button';
  const saveBtn = el(
    'button',
    'deck-form__btn deck-form__btn--primary',
    isEdit ? 'Guardar' : 'Crear',
  );
  saveBtn.type = 'submit';
  footer.append(cancelBtn, saveBtn);

  form.append(nameField, error, colorField, footer);
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

  // mousedown en el overlay (no en el modal) cierra. Usar mousedown evita
  // que un arrastre que empieza dentro y suelta fuera cierre por error.
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) close();
  });
  cancelBtn.addEventListener('click', close);
  document.addEventListener('keydown', onKey);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) {
      error.hidden = false;
      nameInput.focus();
      return;
    }

    if (isEdit) {
      updateDeck({ ...deck, name, color: selectedColor });
      showToast('Mazo actualizado');
    } else {
      persistDeck(buildDeck(name, selectedColor));
      showToast('Mazo creado');
    }

    close();
    navigate(window.location.hash || '#/'); // refresca la vista activa
  });

  document.body.append(overlay);
  syncSelection();
  nameInput.focus();
}
