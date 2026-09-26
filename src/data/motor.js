/**
 * Que entiende el motor, en una sola lista.
 *
 * El parser consulta estas tablas para redactar sus mensajes: si aqui se dice
 * que no soportamos `import`, el error que ve el alumno lo dice tambien. Con
 * dos listas distintas, un dia dejarian de contar la misma historia, asi que
 * esta es la unica: la interfaz la muestra y el parser se apoya en ella.
 */

/** Construcciones que el motor acepta hoy. */
export const SOPORTADO = [
  { grupo: 'Tipos', items: ['int', 'long', 'double', 'float', 'char', 'boolean', 'void', 'String', 'boolean', 'arreglos de una dimension'] },
  { grupo: 'Clases', items: ['una clase por archivo', 'campos', 'metodos con parametros', 'static final para constantes'] },
  { grupo: 'Instrucciones', items: ['declaracion local', 'if / else', 'while', 'do while', 'for', 'for each', 'break', 'continue', 'return', 'bloques'] },
  { grupo: 'Expresiones', items: ['operadores aritmeticos y de comparacion', 'and, or, not', 'asignacion compuesta', 'incremento y decremento', 'ternario', 'llamadas', 'acceso a campos', 'indexado de arreglos', 'new para arreglos'] },
];

/**
 * Construcciones que el lexer o el parser reconocen y rechazan a proposito.
 *
 * `clave` es la palabra o el sintagma; `mensaje` es lo que ve el alumno, y
 * `alternativa` le dice que escribir en su lugar. Ningun mensaje dice
 * "error desconocido": siempre hay una salida.
 */
export const NO_SOPORTADO = [
  {
    clave: 'import',
    mensaje: 'JavaLearn no admite imports',
    alternativa: 'La biblioteca ya esta disponible sin importarla: usa String directamente.',
  },
  {
    clave: 'package',
    mensaje: 'JavaLearn no admite declaraciones de package',
    alternativa: 'Borra la línea: cada programa vive en su propio archivo.',
  },
  {
    clave: 'assert',
    mensaje: 'JavaLearn no admite assert',
    alternativa: 'Usa un if que imprima un mensaje si la condicion no se cumple.',
  },
  {
    clave: 'interface',
    mensaje: 'JavaLearn todavia no admite interfaces',
    alternativa: 'Por ahora usa una clase con metodos publicos.',
  },
  {
    clave: 'enum',
    mensaje: 'JavaLearn todavia no admite enums',
    alternativa: 'Usa constantes public static final: public static final int ALTO = 3;',
  },
  {
    clave: 'try',
    mensaje: 'JavaLearn todavia no admite try ni catch',
    alternativa: 'Esta version todavia no usa excepciones: revisa que los datos sean correctos antes de operar.',
  },
  {
    clave: 'switch',
    mensaje: 'JavaLearn todavia no admite switch',
    alternativa: 'Usa una cadena de if / else if.',
  },
  {
    clave: 'new',
    mensaje: 'JavaLearn todavia solo admite new para arreglos',
    alternativa: 'Usa new int[0] o new String[0], o llama a una clase propia ya declarada arriba.',
  },
  {
    clave: 'herencia',
    mensaje: 'JavaLearn todavia no admite herencia entre clases',
    alternativa: 'Declare los datos dentro de una sola clase y páselos por parámetro.',
  },
];

/** Busca la entrada de la tabla que corresponde a una palabra clave. */
export function restriccionDe(clave) {
  return NO_SOPORTADO.find((item) => item.clave === clave) ?? null;
}
