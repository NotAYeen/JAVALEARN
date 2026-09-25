/**
 * Validador de misiones.
 *
 * Contrasta cada solucion de dos formas independientes:
 *
 *   1. Estructural: el dato de la mision esta completo y es coherente.
 *   2. Diferencial: la solucion se ejecuta con el JDK real y con nuestro
 *      interprete, y las dos salidas deben coincidir entre si y con la salida
 *      esperada. Si un dia divergimos de Java, este script lo detecta.
 *
 * El paso 2 es el que da credibilidad al proyecto: no basta con que nuestro
 * motor se comporte bien consigo mismo, tiene que comportarse como Java.
 *
 * Uso:  node scripts/validate-missions.mjs [--jdk]
 *   --jdk   Si el JDK no esta disponible, aborta en lugar de avisar y seguir.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { MISIONES } from '../src/data/misiones.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..');

export const MODALIDADES = ['lectura', 'terminal', 'depuracion', 'auditoria', 'ensamblaje', 'relacion'];

const OBLIGATORIOS = ['id', 'unidad', 'titulo', 'modalidad', 'objetivos', 'solucion'];

/* -------------------------------------------------------------------------- */
/* Comprobaciones estructurales                                                */
/* -------------------------------------------------------------------------- */

export function validarEstructura(misiones) {
  const errores = [];
  const vistos = new Set();

  if (!Array.isArray(misiones)) {
    return ['misiones.js debe exportar un array llamado MISIONES'];
  }

  misiones.forEach((m, indice) => {
    const donde = `mision #${indice}${m?.id ? ` (${m.id})` : ''}`;

    for (const campo of OBLIGATORIOS) {
      if (m[campo] === undefined || m[campo] === null || m[campo] === '') {
        errores.push(`${donde}: falta el campo obligatorio "${campo}"`);
      }
    }

    if (m.id !== undefined) {
      if (vistos.has(m.id)) errores.push(`${donde}: el id "${m.id}" esta repetido`);
      vistos.add(m.id);
    }

    if (m.modalidad !== undefined && !MODALIDADES.includes(m.modalidad)) {
      errores.push(`${donde}: modalidad "${m.modalidad}" no existe (validas: ${MODALIDADES.join(', ')})`);
    }

    if (m.objetivos !== undefined && !Array.isArray(m.objetivos)) {
      errores.push(`${donde}: "objetivos" debe ser un array`);
    } else if (Array.isArray(m.objetivos) && m.objetivos.length === 0) {
      errores.push(`${donde}: "objetivos" no puede estar vacio`);
    }

    if (m.pistas !== undefined && !Array.isArray(m.pistas)) {
      errores.push(`${donde}: "pistas" debe ser un array`);
    }

    if (m.solucion !== undefined && typeof m.solucion !== 'string') {
      errores.push(`${donde}: "solucion" debe ser texto`);
    }

    if (m.solucion !== undefined && !/class\s+\w+/.test(m.solucion)) {
      errores.push(`${donde}: "solucion" no parece contener ninguna declaracion de clase`);
    }

    if (m.salidaEsperada === undefined && m.modalidad !== 'lectura' && m.modalidad !== 'auditoria' && m.modalidad !== 'ensamblaje' && m.modalidad !== 'relacion') {
      errores.push(`${donde}: la modalidad "${m.modalidad}" necesita "salidaEsperada"`);
    }

    if (m.entrada !== undefined && !Array.isArray(m.entrada)) {
      errores.push(`${donde}: "entrada" debe ser un array de cadenas (los argumentos de main)`);
    }
  });

  return errores;
}

/* -------------------------------------------------------------------------- */
/* Ejecucion con el JDK real                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Normaliza una salida para poder compararla con la esperada.
 *
 * Tres reglas, y las tres son decisiones pedagogicas:
 *
 * 1. Los finales de linea de Windows se unifican en `\n`. Sin esto, la misma
 *    solucion daria fallos distintos en cada sistema.
 * 2. Se quitan los espacios al final de cada linea. El alumno no los escribe
 *    en la leccion, asi que no deben decidir si su solucion es correcta.
 * 3. Se quitan los saltos de linea del final. El ultimo `println` anade uno
 *    siempre, pero el texto esperado se escribe sin el: el alumno espera ver
 *    `Hola, mundo`, no `Hola, mundo` seguido de un salto invisible. Comparar
 *    ese caracter obligaria a escribir `\\n` en cada salida esperada, que
 *    ensuciaria el contenido sin aportar precision.
 */
export function normalizar(salida) {
  return String(salida ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\s+$/, '');
}

export function jdkDisponible() {
  try {
    execFileSync('javac', ['-version'], { stdio: 'ignore', timeout: 20000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Compila y ejecuta con el JDK real. Se fuerzan las codificaciones a UTF-8:
 * en JDK 17, System.out usa la codificacion nativa de la consola, y sin esto
 * una mision con acentos daria un fallo falso en Windows.
 */
export function ejecutarConJdk(fuente, args = []) {
  const dir = mkdtempSync(join(tmpdir(), 'javalearn-'));
  try {
    const archivo = join(dir, 'Main.java');
    writeFileSync(archivo, fuente, 'utf8');

    try {
      execFileSync('javac', ['--release', '8', '-encoding', 'UTF-8', '-d', dir, archivo], {
        stdio: 'pipe',
        timeout: 60000,
      });
    } catch (error) {
      return { ok: false, fase: 'compilacion', salida: '', error: stderrDe(error) };
    }

    try {
      const salida = execFileSync(
        'java',
        ['-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-cp', dir, 'Main', ...args],
        { stdio: 'pipe', timeout: 30000, encoding: 'utf8' },
      );
      return { ok: true, fase: 'ok', salida: normalizar(salida), error: '' };
    } catch (error) {
      return { ok: false, fase: 'ejecucion', salida: normalizar(error.stdout ?? ''), error: stderrDe(error) };
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function stderrDe(error) {
  const buffer = error?.stderr;
  if (!buffer) return String(error?.message ?? '');
  return Buffer.isBuffer(buffer) ? buffer.toString('utf8') : String(buffer);
}

/* -------------------------------------------------------------------------- */
/* Programa principal                                                          */
/* -------------------------------------------------------------------------- */

async function principal() {
  const estrictoJdk = process.argv.includes('--jdk');

  console.log('Validacion de misiones de JavaLearn\n');

  const estructurales = validarEstructura(MISIONES);
  if (estructurales.length > 0) {
    console.error('Fallos estructurales:\n');
    for (const e of estructurales) console.error(`  - ${e}`);
    console.error('');
    process.exit(1);
  }
  console.log(`Estructura: ${MISIONES.length} mision(es) sin problemas.`);

  if (MISIONES.length === 0) {
    console.log('');
    console.log('Todavia no hay misiones publicadas: nada que contrastar.');
    console.log('Las misiones se anaden por tandas y se validan antes de publicar.');
    return;
  }

  const conSolucion = MISIONES.filter((m) => m.solucion && m.salidaEsperada !== undefined);
  console.log(`${conSolucion.length} mision(es) con solucion contrastable.`);

  const hayJdk = jdkDisponible();
  if (!hayJdk) {
    const mensaje = 'No se encontro javac en el PATH: no se puede contrastar contra el JDK real.';
    if (estrictoJdk) {
      console.error(`\n${mensaje}\nInstala un JDK 8 o superior, o quita --jdk.`);
      process.exit(1);
    }
    console.warn(`\nAVISO: ${mensaje}`);
    return;
  }

  let motor = null;
  try {
    motor = await import('../src/engine/index.js');
  } catch {
    console.warn('\nAVISO: el interprete (src/engine/index.js) aun no esta disponible.');
    console.warn('Solo se contrasta contra el JDK real. El diferencial completo llega al');
    console.warn('finalizar el motor, y la CI lo exigira entonces.');
  }

  const fallos = [];
  console.log('');

  for (const mision of conSolucion) {
    const jdk = ejecutarConJdk(mision.solucion, mision.entrada ?? []);
    if (!jdk.ok) {
      fallos.push(`${mision.id}: la solucion no compila o no ejecuta con el JDK real (${jdk.fase}): ${jdk.error.split('\n')[0]}`);
      continue;
    }
    if (jdk.salida !== normalizar(mision.salidaEsperada)) {
      fallos.push(
        `${mision.id}: la salida real no coincide con la esperada.\n    esperado: ${JSON.stringify(normalizar(mision.salidaEsperada))}\n    obtenido: ${JSON.stringify(jdk.salida)}`,
      );
      continue;
    }

    if (motor?.ejecutar) {
      const propio = await motor.ejecutar(mision.solucion, {
        args: mision.entrada ?? [],
        clasePrincipal: mision.clasePrincipal ?? 'Main',
      });
      if (!propio.ok) {
        fallos.push(`${mision.id}: nuestro interprete no pudo ejecutar la solucion: ${propio.error?.mensaje ?? 'error desconocido'}`);
        continue;
      }
      if (normalizar(propio.salida) !== jdk.salida) {
        fallos.push(
          `${mision.id}: nuestro interprete diverge del JDK real.\n    jdk:     ${JSON.stringify(jdk.salida)}\n    nuestro: ${JSON.stringify(normalizar(propio.salida))}`,
        );
        continue;
      }
      console.log(`  correcto  ${mision.id}  (identico al JDK real)`);
    } else {
      console.log(`  correcto  ${mision.id}  (solo JDK real)`);
    }
  }

  console.log('');
  if (fallos.length > 0) {
    console.error(`FALLO: ${fallos.length} mision(es) no pasan la validacion:\n`);
    for (const f of fallos) console.error(`  - ${f}`);
    process.exit(1);
  }

  console.log(`Correcto: ${conSolucion.length} mision(es) validadas.`);
}

if (process.argv[1] && process.argv[1].endsWith('validate-missions.mjs')) {
  principal().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
