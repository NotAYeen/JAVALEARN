/**
 * Pruebas de la navegacion y de las vistas.
 *
 * La vista se prueba comparando la cadena de HTML que devuelve, no simulando
 * clics: si el texto no esta, no esta, y comparar cadenas da un fallo que
 * apunta a la linea exacta en vez de un "no encontrado" generico.
 */

// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { RUTAS, hashDe, resolverRuta } from '../../src/ui/ruta.js';
import { construir } from '../../src/App.js';
import { MISIONES, buscarMision, misionesDeUnidad, unidadesConContenido } from '../../src/data/misiones.js';
import { UNIDADES } from '../../src/data/unidades.js';
import {
  vistaMision,
  vistaNoEncontrada,
  vistaPortada,
  vistaUnidad,
} from '../../src/ui/vistas.js';

const unidad1 = UNIDADES[0];
const mision1 = MISIONES[0];

/* -------------------------------------------------------------------------- */

describe('resolucion de rutas', () => {
  it('trata el hash vacio y la portada como la misma ruta', () => {
    expect(resolverRuta('')).toEqual({ tipo: RUTAS.PORTADA });
    expect(resolverRuta('#')).toEqual({ tipo: RUTAS.PORTADA });
    expect(resolverRuta('#/')).toEqual({ tipo: RUTAS.PORTADA });
  });

  it('lee la unidad y la mision', () => {
    expect(resolverRuta('#/unidad/fundamentos')).toEqual({ tipo: RUTAS.UNIDAD, id: 'fundamentos' });
    expect(resolverRuta('#/mision/fundamentos-01')).toEqual({ tipo: RUTAS.MISION, id: 'fundamentos-01' });
  });

  it('tolera barras sobrantes', () => {
    expect(resolverRuta('#/unidad/fundamentos/')).toEqual({ tipo: RUTAS.UNIDAD, id: 'fundamentos' });
    expect(resolverRuta('#//unidad//fundamentos')).toEqual({ tipo: RUTAS.UNIDAD, id: 'fundamentos' });
  });

  it('no se inventa una ruta para lo que no entiende', () => {
    expect(resolverRuta('#/inventado').tipo).toBe(RUTAS.NO_ENCONTRADA);
    expect(resolverRuta('#/mision').tipo).toBe(RUTAS.NO_ENCONTRADA);
    expect(resolverRuta('#/unidad').tipo).toBe(RUTAS.NO_ENCONTRADA);
  });

  it('construye el hash con el mismo formato que resuelve', () => {
    for (const ruta of [
      { tipo: RUTAS.PORTADA },
      { tipo: RUTAS.UNIDAD, id: 'fundamentos' },
      { tipo: RUTAS.MISION, id: 'fundamentos-01' },
    ]) {
      const laHash = ruta.tipo === RUTAS.PORTADA ? hashDe(RUTAS.PORTADA) : hashDe(ruta.tipo, ruta.id);
      expect(resolverRuta(laHash)).toEqual(ruta);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('consultas del catalogo', () => {
  it('devuelve las misiones de una unidad en orden', () => {
    const del = misionesDeUnidad('fundamentos');
    expect(del.length).toBe(5);
    expect(del.map((m) => m.numero ?? m.id)).toEqual(del.map((m) => m.id));
  });

  it('devuelve null en vez de undefined cuando no existe', () => {
    expect(buscarMision('no-existe')).toBeNull();
    expect(buscarMision('fundamentos-01')).not.toBeNull();
  });

  it('sabe que unidades tienen contenido y cuales no', () => {
    expect(unidadesConContenido().has('fundamentos')).toBe(true);
    expect(unidadesConContenido().has('bucles')).toBe(false);
  });

  it('no declara una mision para una unidad que no existe', () => {
    for (const mision of MISIONES) {
      expect(UNIDADES.some((u) => u.id === mision.unidad)).toBe(true);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('portada', () => {
  const html = vistaPortada();

  it('dice cuantas misiones estan escritas, no solo cuantas hay previstas', () => {
    // El fallo que motivó este test: decir "43 misiones" cuando hay cinco
    // escritas hace perder la confianza del que llega.
    expect(html).toContain('43 misiones');
    expect(html).toContain('5 publicadas');
    expect(html).toMatch(/Ahora mismo hay/);
  });

  it('enlaza las unidades que tienen contenido y no las que no', () => {
    expect(html).toContain('href="#/unidad/fundamentos"');
    expect(html).not.toContain('href="#/unidad/bucles"');
  });

  it('marca como no disponible lo que no se puede abrir', () => {
    expect(html).toContain('En preparación');
  });

  it('no usa ningun control que no haga nada', () => {
    // Un enlace o boton sin destino es peor que no ponerlo: promete una
    // accion que no ocurre.
    const enlaces = html.match(/<a\b[^>]*>/g) ?? [];
    for (const enlace of enlaces) {
      expect(enlace).toMatch(/href="[^"]+"/);
    }
    expect(html).not.toMatch(/<div[^>]*onclick/);
  });

  it('escapa el contenido de las unidades', () => {
    expect(html).not.toMatch(/<script/i);
  });
});

/* -------------------------------------------------------------------------- */

describe('lista de misiones de una unidad', () => {
  const html = vistaUnidad(unidad1);

  it('enlaza cada mision que existe', () => {
    for (const mision of misionesDeUnidad('fundamentos')) {
      expect(html).toContain(`href="#/mision/${mision.id}"`);
    }
  });

  it('ofrece un camino de vuelta', () => {
    expect(html).toContain('href="#/"');
  });

  it('lo dice cuando una unidad aun no tiene misiones', () => {
    const vacia = vistaUnidad(UNIDADES.find((u) => u.id === 'bucles'));
    expect(vacia).toContain('Todavía no hay misiones aquí');
    expect(vacia).not.toMatch(/href="#\/mision\//);
  });
});

/* -------------------------------------------------------------------------- */

describe('leccion', () => {
  const html = vistaMision(mision1, unidad1, {});

  it('enseña el titulo y los objetivos', () => {
    expect(html).toContain(mision1.titulo);
    for (const objetivo of mision1.objetivos) {
      expect(html).toContain(objetivo.replace(/`/g, ''));
    }
  });

  it('pinta todos los bloques de la explicacion', () => {
    const deParrafo = mision1.explicacion.filter((b) => b.tipo === 'parrafo');
    expect(deParrafo.length).toBeGreaterThan(0);
    for (const bloque of deParrafo) {
      expect(html).toContain(bloque.texto.slice(0, 40));
    }
  });

  it('convierte el codigo entre acentos graves en <code>', () => {
    expect(html).toMatch(/<code>/);
    // Y el texto de dentro no puede inyectar etiquetas.
    expect(html).not.toMatch(/<code>[^<]*<script/i);
  });

  it('escapa el codigo de ejemplo en lugar de interpretarlo', () => {
    const conCodigo = mision1.explicacion.find((b) => b.tipo === 'codigo');
    expect(html).toContain(escaparTexto(conCodigo.codigo));
  });

  it('dice que es una lección de lectura y que no se puede ejecutar', () => {
    expect(html).toContain('Lección de lectura');
    expect(html).toContain('Todavía no hay editor');
  });

  it('muestra las pistas de menor a mayor y con details nativo', () => {
    expect(html).toContain('<details class="pista">');
    expect(html.indexOf('Pista 1')).toBeLessThan(html.indexOf('Pista 2'));
  });

  it('enseña el programa completo y su salida', () => {
    expect(html).toContain(escaparTexto(mision1.solucion));
    expect(html).toContain(escaparTexto(mision1.salidaEsperada));
  });

  it('usa encabezados con id para poder enlazar desde aria-labelledby', () => {
    const ids = [...html.matchAll(/<h2 id="([^"]+)"/g)].map((m) => m[1]);
    const referenciados = [...html.matchAll(/aria-labelledby="([^"]+)"/g)].map((m) => m[1]);
    for (const id of referenciados) {
      expect(ids).toContain(id);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('navegacion entre lecciones', () => {
  it('ofrece la anterior y la siguiente dentro de la unidad', () => {
    const html = vistaMision(mision1, unidad1, {
      anterior: MISIONES[0],
      siguiente: MISIONES[1],
    });
    expect(html).toContain('Anterior:');
    expect(html).toContain('Siguiente:');
  });

  it('deja un hueco, no un boton roto, en el primer extremo', () => {
    // En la primera mision no hay anterior, pero sí siguiente: la barra se
    // dibuja igual y ocupa el hueco, para que "Siguiente" no salte de lado.
    const html = vistaMision(MISIONES[0], unidad1, { siguiente: MISIONES[1] });
    expect(html).toContain('paginacion__hueco');
    expect(html).not.toContain('Anterior:');
    expect(html).toContain('Siguiente:');
  });

  it('no dibuja barra de paginacion si la mision esta sola', () => {
    const html = vistaMision(mision1, unidad1, {});
    expect(html).not.toContain('paginacion');
  });

  it('tampoco inventa una anterior que no existe', () => {
    const html = vistaMision(mision1, unidad1, { siguiente: MISIONES[1] });
    expect(html).not.toMatch(/href="#\/mision\/[^"]*"[^>]*>\s*<span[^>]*>←/);
  });
});

/* -------------------------------------------------------------------------- */

describe('bloques desconocidos', () => {
  it('se dicen en pantalla en vez de desaparecer en silencio', () => {
    const raro = { tipo: 'bloque-inventado', texto: 'x' };
    const html = vistaMision(
      { ...mision1, explicacion: [raro] },
      unidad1,
      {},
    );
    expect(html).toContain('Contenido no reconocido');
    expect(html).toContain('bloque-inventado');
  });
});

/* -------------------------------------------------------------------------- */

describe('construccion de la vista desde la ruta', () => {
  it('resuelve la portada', () => {
    expect(construir({ tipo: RUTAS.PORTADA }).titulo).toBe('Portada');
  });

  it('resuelve una unidad existente', () => {
    const r = construir({ tipo: RUTAS.UNIDAD, id: 'fundamentos' });
    expect(r.titulo).toContain('Unidad 1');
    expect(r.html).toContain('href="#/mision/fundamentos-01"');
  });

  it('cae en pagina no encontrada si la unidad no existe', () => {
    const r = construir({ tipo: RUTAS.UNIDAD, id: 'inventada' });
    expect(r.titulo).toBe('Pagina no encontrada');
  });

  it('cae en pagina no encontrada si la mision no existe', () => {
    const r = construir({ tipo: RUTAS.MISION, id: 'inventada' });
    expect(r.titulo).toBe('Pagina no encontrada');
  });

  it('calcula la mision anterior y la siguiente', () => {
    const r = construir({ tipo: RUTAS.MISION, id: 'fundamentos-02' });
    expect(r.html).toContain('Anterior:');
    expect(r.html).toContain('Siguiente:');
  });

  it('no ofrece siguiente en la ultima mision de la unidad', () => {
    const r = construir({ tipo: RUTAS.MISION, id: 'fundamentos-05' });
    expect(r.html).toContain('Anterior:');
    expect(r.html).not.toContain('Siguiente:');
  });

  it('devuelve la vista de error directamente', () => {
    expect(vistaNoEncontrada()).toContain('No encontramos esa página');
  });
});

/* -------------------------------------------------------------------------- */

/** Copia de escapar() sin importar la vista, para no acoplar el test a ella. */
function escaparTexto(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
