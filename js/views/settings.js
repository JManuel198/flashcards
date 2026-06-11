/* ==========================================================================
   views/settings.js — Ajustes (mínimo): export / import del dataset completo.
   Esta vista crecerá; por ahora solo respaldo y restauración en JSON.
   ========================================================================== */

import { exportAll, importAll } from '../storage.js';
import { navigate } from '../router.js';

const STYLE_HREF = 'css/views/settings.css';

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

/** YYYY-MM-DD en hora local, para el nombre del archivo. */
function todayStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Un backup válido es objeto con schemaVersion y las 3 colecciones como arrays.
 *  Verificar la forma ANTES de importar evita que un JSON válido pero ajeno
 *  (p. ej. `[]` o `{}`) borre los datos al normalizarse en migrate(). */
function isValidBackup(d) {
  return (
    !!d &&
    typeof d === 'object' &&
    !Array.isArray(d) &&
    typeof d.schemaVersion === 'number' &&
    Array.isArray(d.decks) &&
    Array.isArray(d.cards) &&
    Array.isArray(d.sessions)
  );
}

export function renderSettings(container) {
  ensureStyle(STYLE_HREF);

  const section = el('section', 'settings');

  // Volver
  const back = el('button', 'settings__back', '← Volver');
  back.type = 'button';
  back.addEventListener('click', () => navigate('#/'));

  const title = el('h1', 'settings__title', 'Ajustes');

  // Mensaje de estado (éxito/error)
  const message = el('p', 'settings__message');
  message.hidden = true;
  message.setAttribute('role', 'status');
  function showMessage(text, kind) {
    message.textContent = text;
    message.className = `settings__message settings__message--${kind}`;
    message.hidden = false;
  }

  // --- Exportar -----------------------------------------------------------
  const exportGroup = el('div', 'settings__group');
  exportGroup.append(el('h2', 'settings__group-title', 'Copia de seguridad'));
  exportGroup.append(
    el('p', 'settings__hint', 'Descarga todos tus mazos, tarjetas y sesiones en un archivo JSON.'),
  );
  const exportBtn = el('button', 'settings__btn', 'Exportar datos');
  exportBtn.type = 'button';
  exportBtn.addEventListener('click', () => {
    const json = JSON.stringify(exportAll(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flashcards-backup-${todayStamp()}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showMessage('Datos exportados.', 'success');
  });
  exportGroup.append(exportBtn);

  // --- Importar -----------------------------------------------------------
  const importGroup = el('div', 'settings__group');
  importGroup.append(el('h2', 'settings__group-title', 'Restaurar'));
  importGroup.append(
    el('p', 'settings__hint', 'Sustituye los datos actuales por los de un archivo de respaldo.'),
  );

  const fileInput = el('input', 'settings__file');
  fileInput.type = 'file';
  fileInput.accept = 'application/json,.json';
  fileInput.hidden = true;
  fileInput.setAttribute('aria-label', 'Seleccionar archivo de respaldo');

  const importBtn = el('button', 'settings__dropzone', 'Importar datos');
  importBtn.type = 'button';
  importBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try {
        data = JSON.parse(reader.result);
      } catch {
        showMessage('El archivo no es un JSON válido. Tus datos no se han modificado.', 'error');
        fileInput.value = '';
        return;
      }
      if (!isValidBackup(data)) {
        showMessage('El archivo no es un backup válido. Tus datos no se han modificado.', 'error');
        fileInput.value = '';
        return;
      }
      importAll(data);
      fileInput.value = '';
      showMessage('Datos importados correctamente.', 'success');
      // Dar un instante para ver el mensaje y volver a home con los datos nuevos.
      setTimeout(() => navigate('#/'), 900);
    };
    reader.onerror = () => {
      showMessage('No se pudo leer el archivo.', 'error');
      fileInput.value = '';
    };
    reader.readAsText(file);
  });

  importGroup.append(importBtn, fileInput);

  section.append(back, title, message, exportGroup, importGroup);
  container.append(section);
}
