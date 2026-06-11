/* ==========================================================================
   router.js — Hash router minimal. Sin dependencias, sin History API:
   solo window.location.hash + el evento hashchange.

   Rutas:
     #/            → home
     #/deck/:id    → deck
     #/study/:id   → study
     #/summary/:id → summary
     #/progress    → progress
     #/settings    → settings

   Contrato de las vistas: cada función de render recibe (container, param),
   donde `param` es el :id de la ruta (o null). El router limpia el
   contenedor antes de cada render.
   ========================================================================== */

const CONTAINER_ID = 'content';

let _routes = null;      // { home, deck, study, summary, progress }
let _container = null;   // <main id="content">

/**
 * Traduce un hash a { name, param }. Cualquier ruta desconocida cae en home.
 * @param {string} hash - p.ej. "#/deck/abc123"
 */
function parseRoute(hash) {
  const path = hash.replace(/^#/, '');
  const parts = path.split('/').filter(Boolean); // "/deck/abc" → ["deck","abc"]

  if (parts.length === 0) return { name: 'home', param: null };

  const [head, param = null] = parts;
  switch (head) {
    case 'deck':
    case 'study':
    case 'summary':
      return { name: head, param };
    case 'progress':
    case 'settings':
      return { name: head, param: null };
    default:
      return { name: 'home', param: null };
  }
}

/** Limpia el contenedor y renderiza la vista de la ruta actual. */
function render() {
  const { name, param } = parseRoute(window.location.hash);
  const view = _routes[name] ?? _routes.home;

  _container.replaceChildren(); // limpia el contenedor principal
  view(_container, param);
}

/**
 * Cambia de ruta programáticamente. Si el hash ya es el destino, fuerza
 * un re-render (cambiar location.hash al mismo valor no dispara hashchange).
 * @param {string} route - "#/deck/abc" o "/deck/abc" (el "#" es opcional)
 */
export function navigate(route) {
  const target = route.startsWith('#') ? route : `#${route}`;
  if (window.location.hash === target) {
    render();
  } else {
    window.location.hash = target;
  }
}

/**
 * Arranca el router: guarda el mapa de vistas, engancha hashchange y
 * renderiza la ruta inicial (la que haya en el hash al cargar).
 * @param {{home,deck,study,summary,progress:Function}} routes
 */
export function initRouter(routes) {
  _routes = routes;
  _container = document.getElementById(CONTAINER_ID);
  if (!_container) {
    throw new Error(`router: no existe el contenedor #${CONTAINER_ID}`);
  }

  window.addEventListener('hashchange', render);
  render(); // render inicial según el hash actual
}
