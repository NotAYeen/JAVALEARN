/**
 * Catalogo de misiones.
 *
 * Se construye por tandas de cinco. Ninguna mision se publica hasta que pasa
 * scripts/validate-missions.mjs, que contrasta su solucion contra el JDK real.
 *
 * Forma de cada mision:
 *
 * {
 *   id: 'fundamentos-01',
 *   unidad: 'fundamentos',
 *   titulo: 'Hola, mundo',
 *   modalidad: 'terminal',
 *   objetivos: ['Escribir tu primer programa en Java'],
 *   vocabulario: ['System', 'out', 'println', 'String'],
 *   glosario: ['clase', 'metodo', 'main'],
 *   codigoInicial: 'public class Main {\n  ...',
 *   solucion: 'public class Main { ... }',
 *   entrada: [],                       // argumentos de main
 *   salidaEsperada: 'Hola, mundo',
 *   pistas: [{ nivel: 1, texto: '...' }],
 *   explicacion: '...',
 *   // solo para 'auditoria'
 *   lineas: ['...'], indiceFallo: 2,
 *   // solo para 'ensamblaje'
 *   bloques: ['...'],
 *   // solo para 'relacion'
 *   pares: [{ izquierda: '...', derecha: '...' }],
 * }
 */

export const MISIONES = [];
