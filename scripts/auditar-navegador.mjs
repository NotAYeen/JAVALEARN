/**
 * Auditoria de la build en un navegador real.
 *
 * tests/ui/a11y.test.js corre axe sobre jsdom, que no calcula diseno: por eso
 * el contraste de texto queda fuera de su alcance y lo cubre
 * scripts/check-contrast.mjs sobre los tokens del CSS.
 *
 * Este script cubre lo que falta: sirve dist/ tal cual se publicara, lo abre
 * en un navegador de verdad y comprueba el contraste ya calculado, el
 * comportamiento en un movil estrecho y los objetivos tactiles. Usa el Edge o
 * el Chrome que ya tiene el sistema, asi que no descarga ningun navegador.
 *
 *   node scripts/auditar-navegador.mjs [-- headed]
 */

import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import axe from 'axe-core';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(RAIZ, 'dist');
const SALIDA = join(RAIZ, 'tmp', 'auditoria');

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const NAVEGADORES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];

function buscarNavegador() {
  for (const ruta of NAVEGADORES) {
    if (existsSync(ruta)) return ruta;
  }
  return null;
}

/**
 * En local se usa el Edge o el Chrome que ya tiene el sistema, para no
 * descargar nada. En la CI no hay ninguno de los dos, asi que se cae al
 * navegador que playwright tenga registrado (tras `playwright install`).
 */
async function abrirNavegador(cabecera) {
  const ejecutable = buscarNavegador();
  if (ejecutable) {
    console.log(`Navegador del sistema: ${ejecutable}`);
    return chromium.launch({ executablePath: ejecutable, headless: !cabecera });
  }
  console.log('Navegador del sistema no encontrado: se usa el de playwright.');
  return chromium.launch({ headless: !cabecera });
}

function servir() {
  const servidor = createServer((peticion, respuesta) => {
    const url = new URL(peticion.url, 'http://localhost');
    let camino = decodeURIComponent(url.pathname);
    if (camino.endsWith('/')) camino += 'index.html';

    const destino = join(DIST, normalize(camino).replace(/^([/\\])+/, ''));
    if (!resolve(destino).startsWith(resolve(DIST) + sep) || !existsSync(destino)) {
      respuesta.writeHead(404).end('no encontrado');
      return;
    }

    respuesta.writeHead(200, { 'content-type': TIPOS[extname(destino)] ?? 'application/octet-stream' });
    respuesta.end(readFileSync(destino));
  });

  return new Promise((cumplir) => {
    servidor.listen(0, '127.0.0.1', () => cumplir({ servidor, puerto: servidor.address().port }));
  });
}

const MOVIL = { width: 360, height: 640 };

async function principal() {
  if (!existsSync(DIST)) {
    console.error('No existe dist/. Ejecuta antes: npm run build');
    process.exit(1);
  }

  const { servidor, puerto } = await servir();
  const base = `http://127.0.0.1:${puerto}/`;
  mkdirSync(SALIDA, { recursive: true });

  const navegador = await abrirNavegador(process.argv.includes('--headed'));

  const problemas = [];
  let resumenAxe = { violaciones: 0, entradas: [] };

  try {
    for (const [nombre, opciones] of [
      ['escritorio', { viewport: { width: 1280, height: 900 } }],
      ['movil', { viewport: MOVIL, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
    ]) {
      const contexto = await navegador.newContext(opciones);
      const pagina = await contexto.newPage();
      await pagina.goto(base, { waitUntil: 'networkidle' });

      /* Contraste y semantica, ya con diseno real calculado. */
      await pagina.addScriptTag({ content: readFileSync(join(RAIZ, 'node_modules', 'axe-core', 'axe.min.js'), 'utf8') });
      const axe = await pagina.evaluate(async () => {
        const r = await window.axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] },
        });
        return r.violations.map((v) => ({ id: v.id, impacto: v.impact, ayuda: v.help, nodos: v.nodes.length }));
      });

      if (axe.length > 0) {
        resumenAxe.violaciones += axe.length;
        resumenAxe.entradas.push({ nombre, axe });
      }

      /* Sin desbordamiento horizontal en movil. */
      const desborde = await pagina.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        visible: window.innerWidth,
      }));
      if (desborde.scroll > desborde.visible + 1) {
        problemas.push(`${nombre}: hay scroll horizontal (${desborde.scroll} px de contenido en ${desborde.visible} px visibles)`);
      }

      /* El texto no puede bajar de 16 px: por debajo, iOS hace zoom al enfocar. */
      const tamanoTexto = await pagina.evaluate(() => {
        const estilos = getComputedStyle(document.body);
        return parseFloat(estilos.fontSize);
      });
      if (tamanoTexto < 16) {
        problemas.push(`${nombre}: el texto base mide ${tamanoTexto} px; debe ser 16 px o mas`);
      }

      /* Objetivos tactiles de 44x44 en los controles visibles.
         WCAG 2.2 (2.5.8) solo exige 24x24 y exime a los enlaces insertados
         dentro de un texto corrido, pero aqui se pide 44x44 para todo lo
         demas. La excepcion se aplica de forma explicita para que el
         comprobante no senale los enlaces de un parrafo. */
      const pequenos = await pagina.evaluate(() => {
        const medidos = [];
        for (const nodo of document.querySelectorAll('button, a[href], input, select, textarea')) {
          const estilos = getComputedStyle(nodo);
          const padre = nodo.parentElement;
          const padreEsTexto =
            padre &&
            estilos.display === 'inline' &&
            ['P', 'LI', 'SPAN', 'TD'].includes(padre.tagName) &&
            (padre.textContent ?? '').trim().length > (nodo.textContent ?? '').trim().length + 2;

          if (padreEsTexto) continue;

          const caja = nodo.getBoundingClientRect();
          if (caja.width === 0 || caja.height === 0) continue;
          if (caja.width < 44 || caja.height < 44) {
            medidos.push({
              etiqueta: (nodo.textContent ?? nodo.tagName).trim().slice(0, 40),
              ancho: Math.round(caja.width),
              alto: Math.round(caja.height),
            });
          }
        }
        return medidos;
      });
      for (const p of pequenos) {
        problemas.push(`${nombre}: objetivo tactil de ${p.ancho}x${p.alto} px en "${p.etiqueta}" (se exigen 44x44)`);
      }

      /* El foco tiene que verse: comprobamos que el anillo no es transparente. */
      const foco = await pagina.evaluate(() => {
        const boton = document.querySelector('button');
        if (!boton) return null;
        boton.focus();
        const estilos = getComputedStyle(boton, null);
        return { contorno: estilos.outlineStyle, grosor: estilos.outlineWidth };
      });
      if (foco && (foco.contorno === 'none' || parseFloat(foco.grosor) === 0)) {
        problemas.push(`${nombre}: el primer boton no muestra anillo de foco`);
      }

      await pagina.screenshot({ path: join(SALIDA, `${nombre}.png`), fullPage: true });
      console.log(`  ${nombre.padEnd(10)} auditado y capturado en tmp/auditoria/${nombre}.png`);
      await contexto.close();
    }
  } finally {
    await navegador.close();
    servidor.close();
  }

  console.log('');
  if (resumenAxe.violaciones > 0) {
    for (const entrada of resumenAxe.entradas) {
      for (const v of entrada.axe) {
        problemas.push(`${entrada.nombre}: axe ${v.id} (${v.impacto}) — ${v.ayuda} (${v.nodos} nodo/s)`);
      }
    }
  } else {
    console.log('axe con diseno real: 0 violaciones, incluido el contraste de texto.');
  }

  console.log('');
  if (problemas.length > 0) {
    console.error(`FALLO: ${problemas.length} problema(s):\n`);
    for (const p of problemas) console.error(`  - ${p}`);
    process.exit(1);
  }

  console.log('Auditoria de navegador correcta.');
}

principal().catch((error) => {
  console.error(error);
  process.exit(1);
});
