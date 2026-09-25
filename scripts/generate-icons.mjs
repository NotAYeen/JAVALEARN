/**
 * Genera los iconos de la PWA.
 *
 * Se escriben a mano en lugar de tirar de una libreria de imagen: hacen falta
 * cuatro PNG, el dibujo es geometrico y node:zlib ya sabe comprimir. Cargar
 * una dependencia para esto seria mas peso que el propio script.
 *
 *   node scripts/generate-icons.mjs
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const AQUI = dirname(fileURLToPath(import.meta.url));
const DESTINO = join(AQUI, '..', 'public', 'icons');

const FONDO = [0x7c, 0xb0, 0xff];
const FIGURA = [0x0b, 0x12, 0x20];
const SUPERMUESTREO = 4;

/* ------------------------------- PNG ----------------------------------- */

const TABLA_CRC = (() => {
  const tabla = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[n] = c >>> 0;
  }
  return tabla;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = TABLA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function trozo(tipo, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length, 0);
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'latin1'), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo), 0);
  return Buffer.concat([largo, cuerpo, crc]);
}

/** Codifica un mapa de bits RGBA de 8 bits sin entrelazado. */
export function codificarPNG(ancho, alto, rgba) {
  const firma = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0);
  ihdr.writeUInt32BE(alto, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const crudo = Buffer.alloc(alto * (1 + ancho * 4));
  for (let y = 0; y < alto; y += 1) {
    const destino = y * (1 + ancho * 4);
    crudo[destino] = 0;
    rgba.copy(crudo, destino + 1, y * ancho * 4, (y + 1) * ancho * 4);
  }

  return Buffer.concat([
    firma,
    trozo('IHDR', ihdr),
    trozo('IDAT', deflateSync(crudo, { level: 9 })),
    trozo('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------ Dibujo --------------------------------- */

function dentroDeRectanguloRedondeado(x, y, x0, y0, x1, y1, radio) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const rx = Math.min(radio, (x1 - x0) / 2);
  const ry = Math.min(radio, (y1 - y0) / 2);
  if (x < x0 + rx && y < y0 + ry) return (x0 + rx - x) ** 2 + (y0 + ry - y) ** 2 <= rx * rx;
  if (x > x1 - rx && y < y0 + ry) return (x - (x1 - rx)) ** 2 + (y0 + ry - y) ** 2 <= rx * rx;
  if (x < x0 + rx && y > y1 - ry) return (x0 + rx - x) ** 2 + (y - (y1 - ry)) ** 2 <= rx * rx;
  if (x > x1 - rx && y > y1 - ry) return (x - (x1 - rx)) ** 2 + (y - (y1 - ry)) ** 2 <= rx * rx;
  return true;
}

function dentroDeRectangulo(x, y, x0, y0, x1, y1) {
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

/**
 * "J" geometrica: un palo vertical y una base. Se mantiene deliberadamente
 * simple para que se lea bien a 32 px y para no parecerse a ningun logotipo.
 */
function esJ(x, y, escala) {
  const cx = 0.5;
  const cy = 0.5;
  const u = (v) => cx + (v - cx) * escala;
  const v = (t) => cy + (t - cy) * escala;
  const palo = dentroDeRectangulo(x, y, u(0.45), v(0.24), u(0.61), v(0.58));
  const base = dentroDeRectangulo(x, y, u(0.31), v(0.58), u(0.61), v(0.73));
  return palo || base;
}

function colorEn(x, y, { opaco, escalaFigura }) {
  const fondoLleno = opaco || escalaFigura < 1;
  if (fondoLleno) {
    if (esJ(x, y, escalaFigura)) return [...FIGURA, 255];
    return [...FONDO, 255];
  }
  if (!dentroDeRectanguloRedondeado(x, y, 0, 0, 1, 1, 0.22)) return [0, 0, 0, 0];
  if (esJ(x, y, escalaFigura)) return [...FIGURA, 255];
  return [...FONDO, 255];
}

export function dibujar(ancho, alto, opciones = {}) {
  const conf = { opaco: false, escalaFigura: 1, ...opciones };
  const rgba = Buffer.alloc(ancho * alto * 4);
  const n = SUPERMUESTREO * SUPERMUESTREO;

  for (let py = 0; py < alto; py += 1) {
    for (let px = 0; px < ancho; px += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SUPERMUESTREO; sy += 1) {
        for (let sx = 0; sx < SUPERMUESTREO; sx += 1) {
          const c = colorEn((px + (sx + 0.5) / SUPERMUESTREO) / ancho, (py + (sy + 0.5) / SUPERMUESTREO) / alto, conf);
          r += c[0];
          g += c[1];
          b += c[2];
          a += c[3];
        }
      }
      const off = (py * ancho + px) * 4;
      rgba[off] = Math.round(r / n);
      rgba[off + 1] = Math.round(g / n);
      rgba[off + 2] = Math.round(b / n);
      rgba[off + 3] = Math.round(a / n);
    }
  }

  return rgba;
}

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="JavaLearn">
  <rect width="100" height="100" rx="22" fill="#7cb0ff"/>
  <path d="M45 24h16v34H45z" fill="#0b1220"/>
  <path d="M31 58h30v15H31z" fill="#0b1220"/>
</svg>
`;

const FICHOS = [
  { nombre: 'icono-192.png', ancho: 192, alto: 192, opciones: {} },
  { nombre: 'icono-512.png', ancho: 512, alto: 512, opciones: {} },
  // Maskable: el sistema puede recortar hasta un 20% por lado, asi que el
  // fondo llena todo el cuadro y la figura se encoge a la zona segura.
  { nombre: 'icono-maskable-512.png', ancho: 512, alto: 512, opciones: { opaco: true, escalaFigura: 0.62 } },
  // iOS no reproduce bien el canal alfa: el icono de apple va opaco.
  { nombre: 'apple-touch-icon.png', ancho: 180, alto: 180, opciones: { opaco: true } },
];

function principal() {
  mkdirSync(DESTINO, { recursive: true });
  writeFileSync(join(DESTINO, 'icono.svg'), SVG, 'utf8');

  for (const f of FICHOS) {
    const rgba = dibujar(f.ancho, f.alto, f.opciones);
    const png = codificarPNG(f.ancho, f.alto, rgba);
    writeFileSync(join(DESTINO, f.nombre), png);
    console.log(`  ${f.nombre.padEnd(26)} ${f.ancho}x${f.alto}  ${(png.length / 1024).toFixed(1)} KB`);
  }

  console.log(`  ${'icono.svg'.padEnd(26)} vector`);
  console.log(`\nIconos escritos en ${DESTINO}`);
}

if (process.argv[1] && process.argv[1].endsWith('generate-icons.mjs')) principal();
