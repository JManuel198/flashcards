/* ==========================================================================
   app.js — Bootstrap. Inicializa storage y arranca el router con las vistas.
   ========================================================================== */

import { initStorage } from './storage.js';
import { initRouter, navigate } from './router.js';
import { renderHome } from './views/home.js';
import { renderDeck } from './views/deck.js';
import { renderStudy } from './views/study.js';
import { renderSummary } from './views/summary.js';
import { renderProgress } from './views/progress.js';
import { renderSettings } from './views/settings.js';

initStorage();

initRouter({
  home: renderHome,
  deck: renderDeck,
  study: renderStudy,
  summary: renderSummary,
  progress: renderProgress,
  settings: renderSettings,
});

// Ruta inicial: si no hay hash, normaliza a #/ (home).
if (!window.location.hash) navigate('#/');
