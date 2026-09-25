import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { codificarPNG, dibujar } from '../../scripts/generate-icons.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ICONOS = join(RAIZ, 'public', 'icons');
const FIRMA = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function leerChunks(png) {
  const chunks = {};
  let i = 8;
  while (i < png.length) {
    const largo = png.readUInt32BE(i);
    const tipo = png.toString('latin1', i + 4, i + 8);
    const datos = png.subarray(i + 8, i + 8 + largo);
    const crcAnunciado = png.readUInt32BE(i + 8 + largo);
    chunks[tipo] = { datos, crcAnunciado, crcSobreTipoYMensaje: crc32(png.subarray(i + 4, i + 8 + largo)) };
    i += 12 + largo;
  }
  return chunks;
}

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = TABLA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pixel(rgba, ancho, x, y) {
  const off = (y * ancho + x) * 4;
  return [rgba[off], rgba[off + 1], rgba[off + 2], rgba[off + 3]];
}

describe('codificador PNG', () => {
  const ancho = 16;
  const alto = 16;
  const rgba = Buffer.alloc(ancho * alto * 4, 128);
  const png = codificarPNG(ancho, alto, rgba);

  it('empieza por la firma PNG correcta', () => {
    expect([...png.subarray(0, 8)]).toEqual(FIRMA);
  });

  it('declara las dimensiones en IHDR', () => {
    const { datos } = leerChunks(png).IHDR;
    expect(datos.readUInt32BE(0)).toBe(ancho);
    expect(datos.readUInt32BE(4)).toBe(alto);
    expect(datos[8]).toBe(8);
    expect(datos[9]).toBe(6);
  });

  it('valida el CRC de cada trozo', () => {
    const chunks = leerChunks(png);
    for (const [tipo, chunk] of Object.entries(chunks)) {
      expect(`${tipo}:${chunk.crcAnunciado}`).toBe(`${tipo}:${chunk.crcSobreTipoYMensaje}`);
    }
  });

  it('termina con el trozo IEND vacio', () => {
    expect(leerChunks(png).IEND.datos).toHaveLength(0);
  });

  it('el flujo IDAT se descomprime a filas con byte de filtro', () => {
    const crudo = inflateSync(leerChunks(png).IDAT.datos);
    expect(crudo).toHaveLength(alto * (1 + ancho * 4));
    for (let y = 0; y < alto; y += 1) {
      expect(crudo[y * (1 + ancho * 4)]).toBe(0);
    }
  });
});

describe('dibujo del icono', () => {
  it('pinta fondo en el centro y figura en el palo vertical', () => {
    const lado = 64;
    const rgba = dibujar(lado, lado);
    // Centro exacto: cae dentro de la base de la J, que es figura.
    expect(pixel(rgba, lado, 32, 32)).toEqual([0x0b, 0x12, 0x20, 255]);
    // Cuadrante superior derecho, fuera de la figura: fondo.
    expect(pixel(rgba, lado, 56, 10)).toEqual([0x7c, 0xb0, 0xff, 255]);
  });

  it('deja las esquinas transparentes en la version normal', () => {
    const lado = 64;
    const rgba = dibujar(lado, lado);
    expect(pixel(rgba, lado, 0, 0)[3]).toBe(0);
  });

  it('la version opaca no tiene pixeles transparentes', () => {
    const lado = 64;
    const rgba = dibujar(lado, lado, { opaco: true });
    for (const [x, y] of [[0, 0], [63, 0], [0, 63], [63, 63]]) {
      expect(pixel(rgba, lado, x, y)[3]).toBe(255);
    }
  });

  it('la version maskable mantiene la figura dentro de la zona segura', () => {
    const lado = 64;
    const rgba = dibujar(lado, lado, { opaco: true, escalaFigura: 0.62 });
    const centro = pixel(rgba, lado, 32, 32);
    expect(centro[3]).toBe(255);
    // A un 20% del borde no debe haber figura: se descarta al recortar.
    const fuera = pixel(rgba, lado, 6, 6);
    expect(fuera).toEqual([0x7c, 0xb0, 0xff, 255]);
  });
});

describe('ficheros generados', () => {
  for (const nombre of [
    'icono-192.png',
    'icono-512.png',
    'icono-maskable-512.png',
    'apple-touch-icon.png',
    'icono.svg',
  ]) {
    it(`existe ${nombre} y no esta vacio`, () => {
      const ruta = join(ICONOS, nombre);
      expect(existsSync(ruta)).toBe(true);
      expect(readFileSync(ruta).length).toBeGreaterThan(0);
    });
  }

  it('los PNG del proyecto tienen la firma valida', () => {
    for (const nombre of ['icono-192.png', 'icono-512.png', 'icono-maskable-512.png', 'apple-touch-icon.png']) {
      const buf = readFileSync(join(ICONOS, nombre));
      expect([...buf.subarray(0, 8)]).toEqual(FIRMA);
    }
  });
});
