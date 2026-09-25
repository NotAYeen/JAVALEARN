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

/**
 * Comprueba que los recursos precacheados por el service worker existen.
 *
 * Se leen de la constante SHELL del propio sw.js, no de una copia: si la lista
 * cambia alli, esta comprobacion la sigue sin que haya que tocar dos sitios.
 */
function comprobarShell() {
  const fallos = [];
  const fuente = readFileSync(join(DIST, 'sw.js'), 'utf8');
  const coincidencia = fuente.match(/const\s+SHELL\s*=\s*\[([^\]]*)\]/);

  if (!coincidencia) {
    fallos.push('sw.js: no se encuentra la constante SHELL; el service worker no precachea nada.');
    return fallos;
  }

  const rutas = [...coincidencia[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  if (rutas.length === 0) {
    fallos.push('sw.js: SHELL esta vacia.');
    return fallos;
  }

  for (const ruta of rutas) {
    const limpio = ruta.replace(/^\.\//, '');
    const destino = join(DIST, limpio === '' ? 'index.html' : limpio);
    if (!existsSync(destino)) {
      fallos.push(
        `sw.js: SHELL pide "${ruta}" y en dist/ no existe. cache.addAll es atomico, ` +
          'asi que un solo fallo deja el service worker sin instalar.',
      );
    }
  }

  if (fallos.length === 0) {
    console.log(`Service worker: los ${rutas.length} recursos de SHELL existen en dist/.`);
  }
  return fallos;
}

/**
 * Rutas que se auditan. No basta con comprobar la portada: los enlaces, los
 * botones de las tarjetas y los bloques desplegables solo existen dentro de las
 * vistas, y son justo los que se rompen con mas facilidad.
 */
const RUTAS = [
  { hash: '#/', nombre: 'portada' },
  { hash: '#/unidad/fundamentos', nombre: 'unidad' },
  { hash: '#/mision/fundamentos-01', nombre: 'leccion' },
  { hash: '#/mision/fundamentos-03', nombre: 'leccion-con-tabla' },
  { hash: '#/ruta-inventada', nombre: 'error' },
];

async function principal() {
  if (!existsSync(DIST)) {
    console.error('No existe dist/. Ejecuta antes: npm run build');
    process.exit(1);
  }

  /* Cada recurso que el service worker precachea tiene que existir de verdad en
     la build. cache.addAll es atomico: si uno falla, no se instala nada y el
     service worker desaparece sin avisar, dejando la PWA sin funcionar offline
     y sin un solo error visible en la pagina. */
  const problemas = comprobarShell();

  const { servidor, puerto } = await servir();
  const base = `http://127.0.0.1:${puerto}/`;
  mkdirSync(SALIDA, { recursive: true });

  const navegador = await abrirNavegador(process.argv.includes('--headed'));

  let violacionesAxe = 0;
  const entradasAxe = [];

  try {
    for (const [dispositivo, opciones] of [
      ['escritorio', { viewport: { width: 1280, height: 900 } }],
      ['movil', { viewport: MOVIL, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
    ]) {
      const contexto = await navegador.newContext(opciones);
      const pagina = await contexto.newPage();
      const fuenteAxe = readFileSync(join(RAIZ, 'node_modules', 'axe-core', 'axe.min.js'), 'utf8');

      for (const ruta of RUTAS) {
        const donde = `${dispositivo}/${ruta.nombre}`;
        await pagina.goto(base + ruta.hash, { waitUntil: 'networkidle' });

        /* axe se inyecta despues de cada navegacion: goto crea un contexto
           nuevo y se lleva por delante lo que se hubiera inyectado antes. */
        await pagina.addScriptTag({ content: fuenteAxe });

        /* Contraste y semantica, ya con diseno real calculado. */
        const axe = await pagina.evaluate(async () => {
          const r = await window.axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] },
          });
          return r.violations.map((v) => ({ id: v.id, impacto: v.impact, ayuda: v.help, nodos: v.nodes.length }));
        });

        if (axe.length > 0) {
          violacionesAxe += axe.length;
          entradasAxe.push({ donde, axe });
        }

        /* Sin desbordamiento horizontal. */
        const desborde = await pagina.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          visible: window.innerWidth,
        }));
        if (desborde.scroll > desborde.visible + 1) {
          problemas.push(
            `${donde}: hay scroll horizontal (${desborde.scroll} px de contenido en ${desborde.visible} px visibles)`,
          );
        }

        /* El texto no puede bajar de 16 px: por debajo, iOS hace zoom al enfocar. */
        const tamanoTexto = await pagina.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
        if (tamanoTexto < 16) {
          problemas.push(`${donde}: el texto base mide ${tamanoTexto} px; debe ser 16 px o mas`);
        }

        /* Objetivos tactiles de 44x44 en los controles visibles.
           WCAG 2.2 (2.5.8) solo exige 24x24 y exime a los enlaces insertados
           dentro de un texto corrido, pero aqui se pide 44x44 para todo lo
           demas. La excepcion se aplica de forma explicita para que el
           comprobante no senale los enlaces de un parrafo. */
        const pequenos = await pagina.evaluate(() => {
          const medidos = [];
          for (const nodo of document.querySelectorAll('button, a[href], input, select, textarea, summary')) {
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
          problemas.push(`${donde}: objetivo tactil de ${p.ancho}x${p.alto} px en "${p.etiqueta}" (se exigen 44x44)`);
        }

        /* Tras navegar, el foco tiene que estar en el titulo de la vista y no
           en un enlace que ya no existe. */
        const foco = await pagina.evaluate(() => {
          const activo = document.activeElement;
          if (!activo) return { etiqueta: null, esTitulo: false, tieneAnillo: false };
          const esTitulo = activo.tagName === 'H1';
          const estilos = getComputedStyle(activo);
          return {
            etiqueta: (activo.textContent ?? activo.tagName).trim().slice(0, 40),
            esTitulo,
            tieneAnillo: esTitulo || estilos.outlineStyle !== 'none',
          };
        });
        if (foco.etiqueta && !foco.tieneAnillo) {
          problemas.push(`${donde}: el foco quedo en "${foco.etiqueta}" y no se ve`);
        }

        /* La tabla de la leccion 3 debe tener su propio scroll, no empujar la
           pagina entera: en un movil de 360 px una tabla de tres columnas se
           sale si no esta encerrada. */
        if (ruta.nombre === 'leccion-con-tabla') {
          const tabla = await pagina.evaluate(() => {
            const envoltura = document.querySelector('.tabla-envoltorio');
            if (!envoltura) return null;
            return {
              desborda: envoltura.scrollWidth > envoltura.clientWidth,
              overflow: getComputedStyle(envoltura).overflowX,
            };
          });
          if (tabla && tabla.overflow !== 'auto' && tabla.overflow !== 'scroll') {
            problemas.push(`${donde}: la tabla no tiene scroll propio (overflow-x: ${tabla.overflow})`);
          }
        }

        await pagina.screenshot({ path: join(SALIDA, `${dispositivo}-${ruta.nombre}.png`), fullPage: true });

        /* El service worker tiene que instalarse de verdad, no solo existir los
           archivos. Es el unico modo de saber que cache.addAll no falla por
           algo que esta comprobacion estatica no ve. */
        if (ruta.nombre === 'portada') {
          const sw = await pagina.evaluate(async () => {
            if (!('serviceWorker' in navigator)) return { soportado: false };
            const registro = await Promise.race([
              navigator.serviceWorker.ready,
              new Promise((r) => setTimeout(() => r(null), 8000)),
            ]);
            return {
              soportado: true,
              instalado: Boolean(registro),
              alcance: registro?.scope ?? null,
            };
          });
          if (sw.soportado && !sw.instalado) {
            problemas.push(`${donde}: el service worker no llega a instalarse`);
          } else if (sw.instalado && !sw.alcance?.endsWith('/JAVALEARN/') && sw.alcance && dispositivo === 'escritorio') {
            /* En Pages el alcance depende del subdirectorio; solo se avisa si no
               termina en barra, que es lo unico que debe cumplirse siempre. */
            if (!sw.alcance.endsWith('/')) {
              problemas.push(`${donde}: el alcance del service worker es raro: ${sw.alcance}`);
            }
          }
        }
      }

      console.log(`  ${dispositivo.padEnd(10)} ${RUTAS.length} rutas auditadas`);
      await contexto.close();
    }
  } finally {
    await navegador.close();
    servidor.close();
  }

  console.log('');
  if (violacionesAxe > 0) {
    for (const entrada of entradasAxe) {
      for (const v of entrada.axe) {
        problemas.push(`${entrada.donde}: axe ${v.id} (${v.impacto}) — ${v.ayuda} (${v.nodos} nodo/s)`);
      }
    }
  } else {
    console.log(`axe con diseno real: 0 violaciones en ${RUTAS.length * 2} combinaciones de vista, incluido el contraste.`);
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
