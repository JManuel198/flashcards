/* ==========================================================================
   storage.js — ÚNICO módulo que toca localStorage. Política write-through:
   cada mutación persiste de inmediato (no hay caché en memoria que sincronizar).

   Cuatro claves independientes — separarlas evita reescribir todo el dataset
   en cada cambio y acota la corrupción a una sola clave:
     fc:meta      { schemaVersion, createdAt }
     fc:decks     [ deck, … ]
     fc:cards     [ card, … ]   ← array único; cada card lleva su deckId
     fc:sessions  [ session, … ] append-only

   Robustez: todo JSON.parse va envuelto en try/catch. Si una clave está
   corrupta, se reinicializa vacía y la app sigue viva (mejor perder una
   clave que romper el arranque entero).
   ========================================================================== */

const SCHEMA_VERSION = 1;

const KEYS = {
  meta: 'fc:meta',
  decks: 'fc:decks',
  cards: 'fc:cards',
  sessions: 'fc:sessions',
};

/* --- Lectura/escritura de bajo nivel ------------------------------------- */

/** Lee y parsea una clave. Si falta → fallback. Si está corrupta → la
 *  reinicializa con fallback y devuelve fallback (la app no se cae). */
function read(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    console.warn(`storage: clave "${key}" corrupta, reinicializando.`);
    write(key, fallback);
    return fallback;
  }
}

/** Persiste un valor (write-through). */
function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* --- Inicialización y migraciones ---------------------------------------- */

/** Devuelve el meta actual, con defaults si falta o está corrupto. */
function getMeta() {
  const meta = read(KEYS.meta, null);
  if (!meta || typeof meta.schemaVersion !== 'number') {
    return { schemaVersion: SCHEMA_VERSION, createdAt: Date.now() };
  }
  return meta;
}

/** Crea las 4 claves si no existen y pasa los datos por migrate(). */
export function initStorage() {
  if (read(KEYS.meta, null) === null) {
    write(KEYS.meta, { schemaVersion: SCHEMA_VERSION, createdAt: Date.now() });
  }
  if (!Array.isArray(read(KEYS.decks, null))) write(KEYS.decks, []);
  if (!Array.isArray(read(KEYS.cards, null))) write(KEYS.cards, []);
  if (!Array.isArray(read(KEYS.sessions, null))) write(KEYS.sessions, []);

  // Pasa el estado actual por el hook de migración y persiste el resultado.
  const meta = getMeta();
  const migrated = migrate({
    schemaVersion: meta.schemaVersion,
    decks: getDecks(),
    cards: getCards(),
    sessions: getSessions(),
  });

  write(KEYS.meta, { ...meta, schemaVersion: migrated.schemaVersion });
  write(KEYS.decks, migrated.decks);
  write(KEYS.cards, migrated.cards);
  write(KEYS.sessions, migrated.sessions);
}

/**
 * Hook de migración. Normaliza un dataset { schemaVersion, decks, cards,
 * sessions } garantizando que las 4 piezas existan y tengan el tipo correcto.
 * Por ahora no hay saltos de versión; el bucle queda preparado para el futuro.
 * @param {object} data
 * @returns {{schemaVersion:number, decks:any[], cards:any[], sessions:any[]}}
 */
export function migrate(data) {
  if (!data || typeof data !== 'object') data = {};

  if (typeof data.schemaVersion !== 'number') data.schemaVersion = SCHEMA_VERSION;
  if (!Array.isArray(data.decks)) data.decks = [];
  if (!Array.isArray(data.cards)) data.cards = [];
  if (!Array.isArray(data.sessions)) data.sessions = [];

  // Migraciones futuras, una por versión:
  // while (data.schemaVersion < SCHEMA_VERSION) {
  //   switch (data.schemaVersion) {
  //     case 1: /* transformar v1 → v2 */ break;
  //   }
  //   data.schemaVersion++;
  // }

  data.schemaVersion = SCHEMA_VERSION;
  return data;
}

/* --- Export / import (backup) -------------------------------------------- */

/** Snapshot serializable de todo el dataset. */
export function exportAll() {
  return {
    schemaVersion: getMeta().schemaVersion,
    decks: getDecks(),
    cards: getCards(),
    sessions: getSessions(),
  };
}

/** Sobrescribe el storage con un dataset importado (pasa por migrate()). */
export function importAll(data) {
  const migrated = migrate(data);
  write(KEYS.meta, {
    schemaVersion: migrated.schemaVersion,
    createdAt: getMeta().createdAt,
  });
  write(KEYS.decks, migrated.decks);
  write(KEYS.cards, migrated.cards);
  write(KEYS.sessions, migrated.sessions);
  return migrated;
}

/* --- CRUD: mazos --------------------------------------------------------- */

export function getDecks() {
  return read(KEYS.decks, []);
}

export function getDeckById(id) {
  return getDecks().find((d) => d.id === id) ?? null;
}

export function createDeck(deck) {
  const decks = getDecks();
  decks.push(deck);
  write(KEYS.decks, decks);
  return deck;
}

/** Reemplaza el mazo con mismo id y refresca updatedAt. */
export function updateDeck(deck) {
  const updated = { ...deck, updatedAt: Date.now() };
  write(
    KEYS.decks,
    getDecks().map((d) => (d.id === updated.id ? updated : d)),
  );
  return updated;
}

/** Borra el mazo y, en cascada, sus tarjetas (evita tarjetas huérfanas).
 *  Las sesiones son append-only/histórico y NO se tocan. */
export function deleteDeck(id) {
  write(KEYS.decks, getDecks().filter((d) => d.id !== id));
  write(KEYS.cards, getCards().filter((c) => c.deckId !== id));
}

/* --- CRUD: tarjetas ------------------------------------------------------ */

export function getCards() {
  return read(KEYS.cards, []);
}

export function getCardsByDeck(deckId) {
  return getCards().filter((c) => c.deckId === deckId);
}

export function getCardById(id) {
  return getCards().find((c) => c.id === id) ?? null;
}

export function createCard(card) {
  const cards = getCards();
  cards.push(card);
  write(KEYS.cards, cards);
  return card;
}

/** Reemplaza la tarjeta con mismo id (incluye su slice srs y stats). */
export function updateCard(card) {
  write(
    KEYS.cards,
    getCards().map((c) => (c.id === card.id ? card : c)),
  );
  return card;
}

export function deleteCard(id) {
  write(KEYS.cards, getCards().filter((c) => c.id !== id));
}

/* --- Sesiones (append-only) ---------------------------------------------- */

export function getSessions() {
  return read(KEYS.sessions, []);
}

export function getSessionsByDeck(deckId) {
  return getSessions().filter((s) => s.deckId === deckId);
}

export function createSession(session) {
  const sessions = getSessions();
  sessions.push(session);
  write(KEYS.sessions, sessions);
  return session;
}
