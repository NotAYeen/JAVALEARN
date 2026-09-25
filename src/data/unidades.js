/**
 * Catalogo de las nueve unidades del curso.
 *
 * Es la hoja de ruta acordada: de lo mas basico a nivel intermedio, sin
 * nivel experto. El detalle de cada mision (objetivos, pistas, solucion,
 * salida esperada) vive en src/data/misiones.js, que se construira por tandas
 * y se validara contra el JDK real antes de publicarse.
 */

export const UNIDADES = [
  {
    id: 'fundamentos',
    numero: 1,
    titulo: 'Fundamentos',
    resumen: 'Tu primer programa, lo que se imprime y en que orden.',
    misiones: 5,
  },
  {
    id: 'variables',
    numero: 2,
    titulo: 'Variables y tipos',
    resumen: 'Guardar datos: int, double, char, boolean, String y final.',
    misiones: 5,
  },
  {
    id: 'condiciones',
    numero: 3,
    titulo: 'Condiciones',
    resumen: 'if, else if, operadores logicos, switch y el ternario.',
    misiones: 5,
  },
  {
    id: 'bucles',
    numero: 4,
    titulo: 'Bucles',
    resumen: 'while, do-while, for, break, continue y el for-each.',
    misiones: 5,
  },
  {
    id: 'metodos',
    numero: 5,
    titulo: 'Metodos y clases',
    resumen: 'Organizar el codigo en metodos, constructores y campos.',
    misiones: 5,
  },
  {
    id: 'cadenas',
    numero: 6,
    titulo: 'Cadenas y arreglos',
    resumen: 'Dominar String y trabajar con colecciones de datos.',
    misiones: 5,
  },
  {
    id: 'colecciones',
    numero: 7,
    titulo: 'Colecciones',
    resumen: 'ArrayList y HashMap: listas y mapas que crecen contigo.',
    misiones: 4,
  },
  {
    id: 'herencia',
    numero: 8,
    titulo: 'Herencia y polimorfismo',
    resumen: 'extends, sobrescritura, abstract, interfaces y toString.',
    misiones: 5,
  },
  {
    id: 'excepciones',
    numero: 9,
    titulo: 'Excepciones',
    resumen: 'try, catch, finally y throw para controlar los errores.',
    misiones: 4,
  },
];

export const TOTAL_MISIONES = UNIDADES.reduce((total, u) => total + u.misiones, 0);

export function buscarUnidad(id) {
  return UNIDADES.find((u) => u.id === id) ?? null;
}
