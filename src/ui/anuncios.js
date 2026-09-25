/**
 * Anuncios para lectores de pantalla.
 *
 * Las regiones vivas viven en index.html desde el arranque: crearlas con
 * JavaScript justo antes de cambiar el texto es la forma habitual de que el
 * anuncio se pierda, porque el lector de pantalla no ha visto la region.
 *
 * Para que un cambio de texto se anuncie de verdad, el nodo se vacia primero
 * y el texto se inserta en el siguiente turno de la event loop.
 */

const IDENT_POR_TAG = new Map();

function region(id) {
  if (typeof document === 'undefined') return null;
  let nodo = IDENT_POR_TAG.get(id);
  if (!nodo) {
    nodo = document.getElementById(id);
    IDENT_POR_TAG.set(id, nodo);
  }
  return nodo;
}

/** Anuncio no interrumpivo: cambios de estado, resultados, pistas. */
export function anunciar(mensaje) {
  escribir(region('region-polite'), mensaje);
}

/** Anuncio urgente: errores que impiden continuar. */
export function urgentemente(mensaje) {
  escribir(region('region-urgente'), mensaje);
}

function escribir(nodo, mensaje) {
  if (!nodo) return;
  nodo.textContent = '';
  window.setTimeout(() => {
    nodo.textContent = mensaje;
  }, 50);
}

/** Texto visible de estado que acompaña siempre al anuncio. */
export function textoEstado(mensaje) {
  return `<p class="estado-lector">${escapar(mensaje)}</p>`;
}

export function escapar(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
