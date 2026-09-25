import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { auditar, contraste, extraerTemas, luminancia } from '../../scripts/check-contrast.mjs';

const CSS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'css', 'style.css');
const cssReal = readFileSync(CSS, 'utf8');

describe('matematica de contraste', () => {
  it('devuelve 21 para negro sobre blanco', () => {
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 2);
  });

  it('devuelve 1 para un color contra si mismo', () => {
    expect(contraste('#7cb0ff', '#7cb0ff')).toBeCloseTo(1, 5);
  });

  it('es simetrica', () => {
    expect(contraste('#0f1117', '#e6e9ef')).toBeCloseTo(contraste('#e6e9ef', '#0f1117'), 10);
  });

  it('reconoce los extremos de la luminancia', () => {
    expect(luminancia('#ffffff')).toBeCloseTo(1, 6);
    expect(luminancia('#000000')).toBeCloseTo(0, 6);
  });

  it('acepta la forma abreviada de tres digitos', () => {
    expect(contraste('#000', '#fff')).toBeCloseTo(21, 2);
  });

  it('reproduce el valor de referencia de WCAG para #767676', () => {
    expect(contraste('#767676', '#ffffff')).toBeCloseTo(4.54, 1);
  });
});

describe('extraccion de temas', () => {
  it('encuentra los dos temas del proyecto', () => {
    expect(Object.keys(extraerTemas(cssReal)).sort()).toEqual(['claro', 'oscuro']);
  });

  it('lee los tokens de cada tema', () => {
    const temas = extraerTemas(cssReal);
    expect(temas.oscuro.fondo).toBe('#0f1117');
    expect(temas.claro.fondo).toBe('#ffffff');
    expect(temas.oscuro.acento).toBe('#7cb0ff');
  });
});

describe('auditoria de la hoja real', () => {
  const informe = auditar(cssReal);

  it('audita los dos temas', () => {
    expect(informe.temas.sort()).toEqual(['claro', 'oscuro']);
  });

  it('no encuentra ninguna combinacion por debajo del minimo', () => {
    const fallos = informe.resultados.filter((r) => r.estado === 'error');
    expect(fallos).toEqual([]);
  });

  it('cubre los 18 pares en cada tema', () => {
    expect(informe.resultados).toHaveLength(36);
  });
});

describe('deteccion de regresiones', () => {
  it('detecta un texto claro sobre fondo claro', () => {
    const roto = cssReal.replace('#14171d;', '#f7f8fa;');
    const informe = auditar(roto);
    const fallos = informe.resultados.filter((r) => r.estado === 'error');
    expect(fallos.length).toBeGreaterThan(0);
    expect(fallos.some((f) => f.tema === 'claro' && f.titulo.includes('texto sobre fondo'))).toBe(true);
  });

  it('detecta un color ausente en la paleta', () => {
    const roto = cssReal.replace('--acento: #7cb0ff;', '--otra-cosa: #7cb0ff;');
    const informe = auditar(roto);
    const fallos = informe.resultados.filter((r) => r.estado === 'error');
    expect(fallos.length).toBeGreaterThan(0);
    expect(fallos[0].detalle).toContain('--acento');
  });

  it('detecta un borde interactivo demasiado tenue', () => {
    const roto = cssReal.replace('--borde-fuerte: #646e8c;', '--borde-fuerte: #2b3243;');
    const informe = auditar(roto);
    const fallos = informe.resultados.filter((r) => r.estado === 'error');
    expect(fallos.some((f) => f.titulo.includes('borde interactivo'))).toBe(true);
  });
});
