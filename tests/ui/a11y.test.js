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

/**
 * Las mismas comprobaciones sobre las demas vistas.
 *
 * La portada sola no basta: los enlaces de las tarjetas, la lista de misiones y
 * los bloques desplegables de la leccion solo existen dentro de sus vistas, y
 * son justo donde se cuela un fallo sin avisar. En el navegador, ademas, esto lo
 * comprueba scripts/auditar-navegador.mjs sobre la build real.
 */
describe('vistas con contenido', () => {
  const VISTAS = [
    { hash: '#/unidad/fundamentos', nombre: 'lista de misiones' },
    { hash: '#/mision/fundamentos-01', nombre: 'leccion' },
    { hash: '#/mision/fundamentos-02', nombre: 'leccion con tabla' },
    { hash: '#/mision/fundamentos-04', nombre: 'leccion completa' },
    { hash: '#/ruta-que-no-existe', nombre: 'pagina no encontrada' },
  ];

  async function irA(hash) {
    window.location.hash = hash;
    /* jsdom no siempre dispara hashchange al cambiar el hash, asi que se
       provoca a mano lo mismo que haria el navegador. */
    window.dispatchEvent(new window.HashChangeEvent('hashchange'));
  }

  it.each(VISTAS)('$nombre no tiene violaciones de axe', async ({ hash }) => {
    await irA(hash);
    const resultados = await axe.run(document, {
      resultTypes: ['violations'],
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
    });
    expect(resultados.violations.map((v) => v.id)).toEqual([]);
  }, 30000);

  it('las zonas de codigo con scroll son alcanzables con teclado', async () => {
    await irA('#/mision/fundamentos-01');
    const zonas = [...document.querySelectorAll('.codigo, .salida__texto, .tabla-envoltorio')];
    expect(zonas.length).toBeGreaterThan(0);
    for (const zona of zonas) {
      // Sin tabindex="0" ni nombre accesible, quien navega con teclado no puede
      // desplazar el bloque: es el fallo que encontro la auditoria de navegador.
      expect(zona.getAttribute('tabindex'), `sin tabindex: ${zona.className}`).toBe('0');
      expect(zona.getAttribute('role')).toBe('region');
      expect(zona.getAttribute('aria-label')).toBeTruthy();
    }
  });

  it('el foco va al titulo de la vista al navegar', async () => {
    await irA('#/mision/fundamentos-03');
    expect(document.activeElement).toBe(document.querySelector('main h1'));
    expect(document.activeElement.getAttribute('tabindex')).toBe('-1');
  });

  it('anuncia la vista nueva en la region suave', async () => {
    await irA('#/mision/fundamentos-01');
    await new Promise((r) => setTimeout(r, 120));
    expect(document.getElementById('region-polite').textContent).toContain('primer programa');
  });

  it('no baja la opacidad para marcar lo que no esta disponible', async () => {
    await irA('#/');
    const vacias = [...document.querySelectorAll('.tarjeta-unidad--vacia')];
    expect(vacias.length).toBeGreaterThan(0);
    const css = readFileSync(join(RAIZ, 'css', 'style.css'), 'utf8');
    // La forma de marcar "todavia no" es el borde y el texto, nunca la
    // opacidad: atenua el texto y hunde el contraste por debajo de 4.5:1.
    expect(css).not.toMatch(/\.tarjeta-unidad--vacia\s*\{[^}]*opacity/);
  });
});
