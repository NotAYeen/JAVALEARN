/** Vocabulario lexico del motor. */

export const PALABRAS_CLAVE = new Set([
  'abstract', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const',
  'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally',
  'float', 'for', 'if', 'implements', 'instanceof', 'int', 'interface', 'long', 'native',
  'new', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp',
  'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'true',
  'false', 'null', 'try', 'void', 'volatile', 'while',
  'import', 'package', 'assert',
]);

/** Palabras que alleinamos pero no implementamos: el error debe ser explicito. */
export const FUERA_DE_ALCANCE = new Set(['import', 'package', 'assert']);

/** Ordenados de mas largo a mas corto: el lector prueba en este orden. */
export const OPERADORES = [
  '>>>=', '>>=', '<<=', '>>>', '>>', '<<', '++', '--', '&&', '||', '==', '!=', '<=',
  '>=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '->', '::',
  '+', '-', '*', '/', '%', '=', '<', '>', '!', '~', '?', ':', '&', '|', '^',
];

export const SEPARADORES = new Set(['(', ')', '{', '}', '[', ']', ';', ',', '.', '@']);

/** Tipos de token emitidos por el lector. */
export const TIPO = {
  IDENTIFICADOR: 'identificador',
  PALABRA_CLAVE: 'palabra-clave',
  ENTERO: 'entero',
  LARGO: 'largo',
  DECIMAL: 'decimal',
  DOBLE: 'doble',
  CARACTER: 'caracter',
  CADENA: 'cadena',
  OPERADOR: 'operador',
  SEPARADOR: 'separador',
  FIN: 'fin',
};

/** Tipos numericos primitivos, con su comportamiento de conversion. */
export const TIPOS_PRIMITIVOS = new Set(['byte', 'short', 'int', 'long', 'float', 'double', 'char', 'boolean', 'void']);
