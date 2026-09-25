// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import axe from 'axe-core';
import { JSDOM } from 'jsdom';
import { beforeAll, describe, expect, it } from 'vitest';

import { montar } from '../../src/App.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HTML = readFileSync(join(RAIZ, 'index.html'), 'utf8');

/**
 * Prueba de humo de accesibilidad sobre la pagina real.
 *
 * axe corre en jsdom, que no calcula diseno, asi que no puede evaluar el
 * contraste de texto: de eso se encarga scripts/check-contrast.mjs sobre los
 * tokens del CSS, que si lo hace de verdad. Aqui se comprueba la estructura
 * semantica, que es justo lo que se rompe al crecer la interfaz.
 */
function stubMatchMedia(consulta) {
  return {
    matches: false,
    media: consulta,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  };
}

beforeAll(() => {
  const origen = new JSDOM(HTML, { url: 'https://ejemplo.test/javalearn/' });

  document.documentElement.lang = origen.window.document.documentElement.lang;
  document.title = origen.window.document.title;
  document.body.className = origen.window.document.body.className;
  document.body.innerHTML = origen.window.document.body.innerHTML;

  window.matchMedia = stubMatchMedia;

  montar({
    raiz: document.getElementById('vista-mision'),
    botonTema: document.getElementById('btn-tema'),
  });
});

describe('estructura semantica', () => {
  it('declara el idioma del documento', () => {
    expect(document.documentElement.getAttribute('lang')).toBe('es');
  });

  it('tiene un enlace de salto al contenido principal', () => {
    const salto = document.querySelector('a.saltar-al-contenido');
    expect(salto).not.toBeNull();
    const destino = salto.getAttribute('href');
    expect(destino).toBe('#contenido');
    expect(document.querySelector(destino)).not.toBeNull();
  });

  it('el enlace de salto es el primer elemento enfocable', () => {
    const enlaces = [...document.querySelectorAll('a, button, input, [tabindex]')];
    expect(enlaces[0]).toBe(document.querySelector('a.saltar-al-contenido'));
  });

  it('expone los cuatro regiones principales', () => {
    expect(document.querySelector('header')).not.toBeNull();
    expect(document.querySelector('main')).not.toBeNull();
    expect(document.querySelector('footer')).not.toBeNull();
    expect(document.querySelector('nav')).not.toBeNull();
  });

  it('la navegacion tiene nombre accesible', () => {
    const nav = document.querySelector('nav');
    const etiqueta = nav.getAttribute('aria-label') ?? nav.getAttribute('aria-labelledby');
    expect(etiqueta).toBeTruthy();
  });

  it('tiene exactamente un h1', () => {
    expect(document.querySelectorAll('h1')).toHaveLength(1);
  });

  it('el h1 existe despues de montar', () => {
    expect(document.querySelector('h1').textContent).toContain('println');
  });

  it('las regiones de anuncio estan dentro de un landmark', () => {
    for (const id of ['region-polite', 'region-urgente']) {
      const nodo = document.getElementById(id);
      expect(nodo, `falta la region ${id}`).not.toBeNull();
      expect(nodo.closest('main, header, footer, nav')).not.toBeNull();
    }
  });

  it('la region urgente usa role alert y la suave role status', () => {
    expect(document.getElementById('region-urgente').getAttribute('role')).toBe('alert');
    expect(document.getElementById('region-polite').getAttribute('role')).toBe('status');
    expect(document.getElementById('region-polite').getAttribute('aria-live')).toBe('polite');
    expect(document.getElementById('region-urgente').getAttribute('aria-live')).toBe('assertive');
  });
});

describe('controles', () => {
  it('el boton de tema tiene nombre accesible', () => {
    const boton = document.getElementById('btn-tema');
    expect(boton).not.toBeNull();
    const texto = boton.textContent.trim();
    expect(texto).toMatch(/tema (claro|oscuro)/i);
  });

  it('el boton de tema es un elemento nativo', () => {
    const boton = document.getElementById('btn-tema');
    expect(boton.tagName).toBe('BUTTON');
    expect(boton.getAttribute('type')).toBe('button');
  });

  it('el icono decorativo del boton esta oculto del lector de pantalla', () => {
    const icono = document.querySelector('#btn-tema span[aria-hidden]');
    expect(icono).not.toBeNull();
  });

  it('no hay controles hechos con div o span y manejadores de clic', () => {
    const sospechosos = [...document.querySelectorAll('div, span')].filter((nodo) => {
      if (nodo.getAttribute('role') === 'button') return true;
      return typeof nodo.onclick === 'function';
    });
    expect(sospechosos).toEqual([]);
  });

  it('el objetivo tactil del boton de tema es de al menos 44 px', () => {
    // Comprobamos la regla del CSS, no el valor calculado: jsdom no calcula
    // anchuras. Si alguien baja el min-height, esta prueba no lo detectaria,
    // asi que la regla vive en el propio archivo de estilos y se revisa a mano.
    const css = readFileSync(join(RAIZ, 'css', 'style.css'), 'utf8');
    expect(css).toMatch(/\.boton\s*\{[^}]*min-height:\s*2\.75rem/);
    expect(css).toMatch(/\.boton\s*\{[^}]*min-width:\s*2\.75rem/);
  });
});

describe('auditoria automatica con axe', () => {
  it('no encuentra violaciones WCAG A ni AA', async () => {
    const resultados = await axe.run(document, {
      resultTypes: ['violations'],
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
    });

    const resumen = resultados.violations.map((v) => ({
      id: v.id,
      impacto: v.impact,
      ayuda: v.help,
      nodos: v.nodes.map((n) => n.target.join(' ')),
    }));

    expect(resumen).toEqual([]);
  }, 30000);
});
