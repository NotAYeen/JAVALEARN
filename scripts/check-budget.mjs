/**
 * Presupuesto de tamano del bundle.
 *
 * Un alumno con datos moviles paga cada kilobyte, y en este proyecto la
 * diferencia con la propuesta inicial es precisamente no bajar 17 MB. Este
 * script es el que impide que volvamos a hacerlo por descuido: si el bundle
 * crece sin que nadie lo haya decidido, la CI falla.
 *
 * Se mide el JavaScript comprimido, que es lo que viaja por la red.
 */

import { gzipSync } from 'node:zlib';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(RAIZ, 'dist');

export const PRESUPUESTO_KB = 300;

function tamanoComprimido(ruta) {
  return gzipSync(readFileSync(ruta), { level: 9 }).length;
}

function recoger(directorio, predicate) {
  if (!existsSync(directorio)) return [];
  return readdirSync(directorio, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(directorio, entrada.name);
    if (entrada.isDirectory()) return recoger(ruta, predicate);
    return predicate(ruta) ? [ruta] : [];
  });
}

export function medir() {
  const js = recoger(DIST, (ruta) => extname(ruta) === '.js');
  const css = recoger(DIST, (ruta) => extname(ruta) === '.css');
  const html = recoger(DIST, (ruta) => extname(ruta) === '.html');

  const total = (ficheros) => ficheros.reduce((suma, ruta) => suma + tamanoComprimido(ruta), 0);

  return {
    js: total(js),
    css: total(css),
    html: total(html),
    ficherosJs: js.length,
    mayor: js
      .map((ruta) => ({ nombre: ruta.slice(DIST.length + 1), bytes: statSync(ruta).size, gzip: tamanoComprimido(ruta) }))
      .sort((a, b) => b.gzip - a.gzip)
      .slice(0, 6),
  };
}

function principal() {
  if (!existsSync(DIST)) {
    console.error('No existe dist/. Ejecuta antes: npm run build');
    process.exit(1);
  }

  const m = medir();
  const total = m.js + m.css + m.html;
  const kb = (bytes) => (bytes / 1024).toFixed(1).padStart(7);

  console.log('Tamano del bundle servido (comprimido con gzip)\n');
  console.log(`  JavaScript  ${kb(m.js)} KB  en ${m.ficherosJs} archivo(s)`);
  console.log(`  CSS         ${kb(m.css)} KB`);
  console.log(`  HTML        ${kb(m.html)} KB`);
  console.log(`  ${'-'.repeat(34)}`);
  console.log(`  TOTAL       ${kb(total)} KB   (presupuesto: ${PRESUPUESTO_KB} KB)\n`);

  if (m.mayor.length > 0) {
    console.log('  Los archivos mas pesados:');
    for (const f of m.mayor) {
      console.log(`    ${f.nombre.padEnd(38)} ${(f.gzip / 1024).toFixed(1).padStart(7)} KB`);
    }
    console.log('');
  }

  if (total / 1024 > PRESUPUESTO_KB) {
    console.error(
      `FALLO: el bundle ocupa ${(total / 1024).toFixed(1)} KB y el presupuesto es de ${PRESUPUESTO_KB} KB.`,
    );
    process.exit(1);
  }

  console.log(`Correcto: quedan ${(PRESUPUESTO_KB - total / 1024).toFixed(1)} KB de margen.`);
}

if (process.argv[1] && process.argv[1].endsWith('check-budget.mjs')) principal();
