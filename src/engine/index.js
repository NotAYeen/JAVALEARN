/**
 * Punto de entrada del motor.
 *
 * Se importa siempre desde aquí, nunca de un archivo suelto, para que el
 * orden en que se enchangan las piezas no se disperse por la aplicacion:
 * texto -> tokens -> arbol.
 */

import { analizar } from './parser.js';
import { leerTokens } from './lexer.js';
import { ErrorJava, ErrorLexico, ErrorSintaxis } from './errores.js';

export { analizar, leerTokens, ErrorJava, ErrorLexico, ErrorSintaxis };

/**
 * Analiza un programa y devuelve su arbol, o el error que sea.
 *
 * Devolver el error en vez de lanzar permite que la interfaz muestre los dos
 * casos por el mismo camino, que es lo que evita que el error acabe tratado
 * como un caso raro.
 */
export function intentarAnalizar(fuente) {
  try {
    return { arbol: analizar(fuente), error: null };
  } catch (error) {
    if (error instanceof ErrorJava) {
      return { arbol: null, error };
    }
    throw error;
  }
}