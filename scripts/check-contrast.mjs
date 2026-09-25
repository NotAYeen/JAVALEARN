/**
 * Auditor de contraste WCAG 2.2.
 *
 * Lee css/style.css, extrae los bloques de tema delimitados por
 * "INICIO TEMA ..." / "FIN TEMA ..." y comprueba un catálogo de pares
 * de color exigidos por el proyecto.
 *
 * No es una decoración: si alguien cambia un color y rompe el contraste,
 * el script falla y la CI lo para. Un color que nadie audita se degrada solo.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const CSS_POR_DEFECTO = join(AQUI, '..', 'css', 'style.css');

/** Pares que el proyecto se obliga a cumplir, con su mínimo en ratio. */
export const PARES_AUDITADOS = [
  { titulo: 'texto sobre fondo', fg: 'texto', bg: 'fondo', minimo: 4.5 },
  { titulo: 'texto sobre superficie', fg: 'texto', bg: 'superficie', minimo: 4.5 },
  { titulo: 'texto sobre superficie-2', fg: 'texto', bg: 'superficie-2', minimo: 4.5 },
  { titulo: 'texto suave sobre fondo', fg: 'texto-suave', bg: 'fondo', minimo: 4.5 },
  { titulo: 'texto suave sobre superficie', fg: 'texto-suave', bg: 'superficie', minimo: 4.5 },
  { titulo: 'texto suave sobre superficie-2', fg: 'texto-suave', bg: 'superficie-2', minimo: 4.5 },
  { titulo: 'acento como enlace sobre fondo', fg: 'acento', bg: 'fondo', minimo: 4.5 },
  { titulo: 'acento como enlace sobre superficie', fg: 'acento', bg: 'superficie', minimo: 4.5 },
  { titulo: 'acento como enlace sobre superficie-2', fg: 'acento', bg: 'superficie-2', minimo: 4.5 },
  { titulo: 'texto del boton principal', fg: 'sobre-acento', bg: 'acento', minimo: 4.5 },
  { titulo: 'mensaje de exito', fg: 'exito', bg: 'fondo', minimo: 4.5 },
  { titulo: 'mensaje de aviso', fg: 'aviso', bg: 'fondo', minimo: 4.5 },
  { titulo: 'mensaje de error', fg: 'error', bg: 'fondo', minimo: 4.5 },
  { titulo: 'anillo de foco sobre fondo', fg: 'foco', bg: 'fondo', minimo: 3 },
  { titulo: 'anillo de foco sobre superficie', fg: 'foco', bg: 'superficie', minimo: 3 },
  { titulo: 'borde interactivo sobre fondo', fg: 'borde-fuerte', bg: 'fondo', minimo: 3 },
  { titulo: 'borde interactivo sobre superficie', fg: 'borde-fuerte', bg: 'superficie', minimo: 3 },
  { titulo: 'borde interactivo sobre superficie-2', fg: 'borde-fuerte', bg: 'superficie-2', minimo: 3 },
];

const RE_BLOQUE = /\/\*\s*=+\s*INICIO TEMA ([A-ZÁÉÍÓÚÑ]+)\s*=+\s*\*\/([\s\S]*?)\/\*\s*=+\s*FIN TEMA \1\s*=+\s*\*\//g;
const RE_TOKEN = /--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g;

export function aHex(tresDigitos) {
  return tresDigitos
    .slice(1)
    .split('')
    .map((c) => c + c)
    .join('')
    .toLowerCase();
}

export function aRgb(hex) {
  let h = hex.toLowerCase();
  if (h.length === 4 || h.length === 5) h = aHex(h.slice(0, h.length === 5 ? 4 : 4));
  if (h.length < 6) h = aHex(h);
  const limpio = h.replace('#', '');
  return {
    r: parseInt(limpio.slice(0, 2), 16),
    g: parseInt(limpio.slice(2, 4), 16),
    b: parseInt(limpio.slice(4, 6), 16),
  };
}

function canal(v) {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminancia(hex) {
  const { r, g, b } = aRgb(hex);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

export function contraste(hexA, hexB) {
  const a = luminancia(hexA);
  const b = luminancia(hexB);
  const claro = Math.max(a, b);
  const oscuro = Math.min(a, b);
  return (claro + 0.05) / (oscuro + 0.05);
}

export function extraerTemas(css) {
  const temas = {};
  for (const coincidencia of css.matchAll(RE_BLOQUE)) {
    const nombre = coincidencia[1].toLowerCase();
    const bloque = coincidencia[2];
    const tokens = {};
    for (const t of bloque.matchAll(RE_TOKEN)) {
      tokens[t[1]] = t[2].toLowerCase();
    }
    temas[nombre] = tokens;
  }
  return temas;
}

export function auditar(css, pares = PARES_AUDITADOS) {
  const temas = extraerTemas(css);
  const resultados = [];

  for (const [nombreTema, tokens] of Object.entries(temas)) {
    for (const par of pares) {
      const fg = tokens[par.fg];
      const bg = tokens[par.bg];

      if (!fg || !bg) {
        resultados.push({
          tema: nombreTema,
          titulo: par.titulo,
          estado: 'error',
          detalle: `falta el color ${!fg ? `--${par.fg}` : `--${par.bg}`} en el tema ${nombreTema}`,
        });
        continue;
      }

      const ratio = contraste(fg, bg);
      resultados.push({
        tema: nombreTema,
        titulo: par.titulo,
        fg,
        bg,
        ratio: Math.round(ratio * 100) / 100,
        minimo: par.minimo,
        estado: ratio >= par.minimo ? 'ok' : 'error',
      });
    }
  }

  return { temas: Object.keys(temas), resultados };
}

export function formatearInforme(auditoria) {
  const lineas = [];
  const anchos = [14, 42, 11, 11, 8];
  const cab = ['Tema', 'Combinacion', 'Foreground', 'Background', 'Ratio'];
  lineas.push(cab.map((t, i) => t.padEnd(anchos[i])).join(' ').trimEnd());
  lineas.push('-'.repeat(96));

  for (const r of auditoria.resultados) {
    if (r.estado === 'error' && !r.ratio) {
      lineas.push(`${r.tema.padEnd(14)}${r.titulo.padEnd(42)}ERROR: ${r.detalle}`);
      continue;
    }
    const marca = r.estado === 'ok' ? ' ' : '!';
    const ratio = `${r.ratio.toFixed(2)} (min ${r.minimo.toFixed(1)})${marca}`;
    lineas.push(
      [r.tema.padEnd(14), r.titulo.padEnd(42), r.fg.padEnd(11), r.bg.padEnd(11), ratio]
        .join(' ')
        .trimEnd(),
    );
  }

  return lineas.join('\n');
}

function principal() {
  const ruta = process.argv[2] ?? CSS_POR_DEFECTO;
  const css = readFileSync(ruta, 'utf8');
  const auditoria = auditar(css);

  if (auditoria.temas.length === 0) {
    console.error('No se encontro ningun bloque de tema en el CSS.');
    console.error('Se esperaban bloques delimitados por "INICIO TEMA ..." y "FIN TEMA ...".');
    process.exit(1);
  }

  console.log(`Auditoría de contraste WCAG 2.2 — ${ruta}`);
  console.log(`Temas detectados: ${auditoria.temas.join(', ')}\n`);
  console.log(formatearInforme(auditoria));

  const fallos = auditoria.resultados.filter((r) => r.estado === 'error');
  const total = auditoria.resultados.length;

  console.log('');
  if (fallos.length > 0) {
    console.error(`FALLO: ${fallos.length} de ${total} combinaciones no cumplen el mínimo exigido.`);
    process.exit(1);
  }

  console.log(`Correcto: ${total} de ${total} combinaciones cumplen el mínimo.`);
}

if (process.argv[1] && process.argv[1].endsWith('check-contrast.mjs')) principal();
