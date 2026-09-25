/**
 * Enrutado por hash.
 *
 * Se usa el hash y no la historia del navegador por una razon concreta: la
 * aplicacion se publica en un subdirectorio estatico de GitHub Pages
 * (`/JAVALEARN/`) y no hay servidor que reescriba URLs. Con el hash no hace
 * falta ningun archivo por ruta, y recargar o compartir un enlace funciona
 * sin configuracion adicional.
 *
 * El resolutor es una funcion pura a proposito: decidir que hay que pintar
 * se puede probar sin DOM, y es donde se concentran los casos raros (ruta
 * desconocida, id que no existe, hash vacio).
 */

/** Rutas que la aplicacion entiende. */
export const RUTAS = {
  PORTADA: 'portada',
  UNIDAD: 'unidad',
  MISION: 'mision',
  NO_ENCONTRADA: 'no-encontrada',
};

/**
 * Traduce el hash de la barra de direcciones a una ruta.
 *
 * Formatos aceptados: '' o '#/' → portada, '#/unidad/<id>', '#/mision/<id>',
 * '#/cualquier-cosa' → no encontrada.
 *
 * @param {string} hash
 * @returns {{ tipo: string, id?: string }}
 */
export function resolverRuta(hash = '') {
  // Se aplastan las barras repetidas en los extremos y en medio. Alguien que
  // escriba '#/mision//fundamentos-01' a mano debería ver la lección, no un
  // error: la barra de direcciones se puede editar y conviene ser indulgente.
  const limpio = String(hash)
    .replace(/^#/, '')
    .split('/')
    .filter((parte) => parte !== '')
    .join('/');

  if (limpio === '') return { tipo: RUTAS.PORTADA };

  const partes = limpio.split('/');
  const [seccion, id] = partes;

  if (seccion === 'unidad' && id) return { tipo: RUTAS.UNIDAD, id };
  if (seccion === 'mision' && id) return { tipo: RUTAS.MISION, id };

  return { tipo: RUTAS.NO_ENCONTRADA };
}

/** Construye el hash de una ruta. Ahi se centraliza el formato. */
export function hashDe(tipo, id) {
  if (tipo === RUTAS.PORTADA) return '#/';
  return `#/${tipo}/${id}`;
}

/**
 * Arranca el enrutado y llama a `pintar` en cada cambio de ruta.
 *
 * @param {(ruta: {tipo: string, id?: string}) => void} pintar
 * @returns {{ parar: () => void }}  para desmontar en las pruebas
 */
export function iniciarRuta(pintar) {
  const alCambiar = () => pintar(resolverRuta(window.location.hash));

  // Un solo manejador de hashchange para toda la aplicacion, como con Esc: si
  // hay dos, cada navegacion se ejecutaria dos veces.
  window.addEventListener('hashchange', alCambiar);
  alCambiar();

  return { parar: () => window.removeEventListener('hashchange', alCambiar) };
}
