/**
 * Vistas de la aplicacion.
 *
 * Cada vista devuelve una cadena de HTML y nada mas: no tocan el DOM ni
 * escuchan eventos. Quien decide y quien actua es App.js. Asi las vistas se
 * pueden probar comparando cadenas, que es mas fiable que simular clics para
 * comprobar que sale el texto correcto.
 */

import { TOTAL_MISIONES, UNIDADES } from '../data/unidades.js';
import {
  TOTAL_MISIONES_ESCRITAS,
  buscarMision,
  misionesDeUnidad,
  unidadesConContenido,
} from '../data/misiones.js';
import { escapar } from './anuncios.js';
import { RUTAS, hashDe } from './ruta.js';

/** Etiqueta legible de cada modalidad. */
const MODALIDADES = {
  lectura: 'Lectura',
  terminal: 'Terminal',
  depuracion: 'Depuracion',
  auditoria: 'Auditoria',
  ensamblaje: 'Ensamblaje',
  relacion: 'Relacion',
};

/**
 * Convierte el texto de una leccion en HTML seguro.
 *
 * Se escapa primero y despues se transforman los `codigo` entre acentos
 * graves. El orden importa: escapar no toca las comillas graves, asi que al
 * hacerlo despues se pueden insertar las etiquetas sin miedo, y ningun texto
 * del contenido puede inyectar HTML.
 */
function enLinea(texto) {
  return escapar(texto).replace(/`([^`]+)`/g, '<code>$1</code>');
}

/* -------------------------------------------------------------------------- */
/* Portada                                                                    */
/* -------------------------------------------------------------------------- */

export function vistaPortada() {
  const conContenido = unidadesConContenido();
  const lasQueFaltan = UNIDADES.length - conContenido.size;

  return `
    <h1>Java, desde el primer <code>println</code></h1>

    <p class="intro">
      Una ruta para aprender Java de cero a nivel intermedio. Escribes codigo real,
      lo ejecutas aqui mismo y recibes los errores explicados en castellano, no en
      ingles de maquina. Funciona en el movil y no necesita instalar nada.
    </p>

    <div class="panel panel--aviso">
      <p class="panel__titulo"><span aria-hidden="true">&#9888;</span> Que es este entorno</p>
      <p>
        JavaLearn ejecuta Java con un interprete propio escrito en JavaScript, no con
        una maquina virtual de Java completa. Implementa el subconjunto de Java 8 que
        necesitan estas misiones, y lo hace <strong>mucho mas rapido</strong> que cargar
        un compilador entero en un movil. Cuando escribas algo que todavia no soporta,
        el aviso te lo dira con claridad.
      </p>
    </div>

    <div class="panel panel--aviso">
      <p class="panel__titulo"><span aria-hidden="true">&#128196;</span> Cuanto hay hecho hoy</p>
      <p>
        El recorrido completo son <strong>${TOTAL_MISIONES} misiones</strong> en
        ${UNIDADES.length} unidades. Ahora mismo hay
        <strong>${TOTAL_MISIONES_ESCRITAS} publicadas</strong>, todas de la unidad 1 y
        en modo lectura: se leen, pero todavia no se puede escribir ni ejecutar codigo
        aqui, porque el interprete sigue en construccion.
      </p>
      <p>
        Se preferia decirte esto a presentar 43 misiones que no existen. Las que faltan
        se van sumando por tandas, y ninguna se publica sin pasar antes una prueba
        contra el <code>javac</code> de verdad.
      </p>
    </div>

    <h2>El recorrido</h2>
    <p>
      Seis formas distintas de practicar: leer, escribir en la terminal, depurar,
      auditar, ensamblar y relacionar. Las unidades con contenido publicado se pueden
      abrir; las demas seiran apareciendo conforme se terminen.
    </p>

    <ol class="rejilla lista-unidades">
      ${UNIDADES.map(tarjetaUnidad).join('\n      ')}
    </ol>
  `;
}

function tarjetaUnidad(unidad) {
  const publicadas = misionesDeUnidad(unidad.id).length;
  const disponible = publicadas > 0;

  // Cuando la unidad no tiene misiones escritas no se inventa un enlace: la
  // tarjeta es texto plano, no un control disfrazado. Un control que no hace
  // nada es peor que no tener control.
  const cuerpo = `
        <p class="tarjeta-unidad__numero"${disponible ? ' aria-hidden="true"' : ''}>${unidad.numero}</p>
        <h3 class="tarjeta-unidad__titulo">${escapar(unidad.titulo)}</h3>
        <p class="tarjeta-unidad__resumen">${escapar(unidad.resumen)}</p>
        <p class="tarjeta-unidad__pie">
          ${
            disponible
              ? `<span class="etiqueta etiqueta--lista">${publicadas} de ${unidad.misiones} publicadas</span>`
              : '<span class="etiqueta etiqueta--pendiente">En preparacion</span>'
          }
          <span class="tarjeta-unidad__misiones">${unidad.misiones} misiones</span>
        </p>`;

  if (!disponible) {
    return `<li class="tarjeta tarjeta-unidad tarjeta-unidad--vacia">${cuerpo}</li>`;
  }

  return `<li class="tarjeta tarjeta-unidad">
        <a class="tarjeta-unidad__enlace" href="${hashDe(RUTAS.UNIDAD, unidad.id)}">
          <span class="tarjeta-unidad__numero" aria-hidden="true">${unidad.numero}</span>
          <span class="tarjeta-unidad__titulo">${escapar(unidad.titulo)}</span>
          <span class="tarjeta-unidad__resumen">${escapar(unidad.resumen)}</span>
          <span class="tarjeta-unidad__pie">
            <span class="etiqueta etiqueta--lista">${publicadas} de ${unidad.misiones} publicadas</span>
            <span class="tarjeta-unidad__misiones">Abrir unidad</span>
          </span>
        </a>
      </li>`;
}

/* -------------------------------------------------------------------------- */
/* Lista de misiones de una unidad                                            */
/* -------------------------------------------------------------------------- */

export function vistaUnidad(unidad) {
  const misiones = misionesDeUnidad(unidad.id);

  return `
    <nav aria-label="Migas de pan" class="migas">
      <a href="${hashDe(RUTAS.PORTADA)}">Portada</a>
      <span aria-hidden="true"> / </span>
      <span aria-current="page">Unidad ${unidad.numero}</span>
    </nav>

    <h1 class="titulo-vista">Unidad ${unidad.numero}. ${escapar(unidad.titulo)}</h1>
    <p class="intro">${escapar(unidad.resumen)}</p>

    ${
      misiones.length === 0
        ? `<div class="panel panel--vacio">
             <p class="panel__titulo"><span aria-hidden="true">&#128296;</span> Todavia no hay misiones aqui</p>
             <p>Esta unidad esta en preparacion. Vuelve mas adelante.</p>
             <p><a class="boton boton--secundario" href="${hashDe(RUTAS.PORTADA)}">Volver a la portada</a></p>
           </div>`
        : `<ol class="lista-misiones">
            ${misiones.map((mision, indice) => filaMision(mision, indice + 1)).join('\n            ')}
          </ol>`
    }
  `;
}

function filaMision(mision, posicion) {
  const modalidad = MODALIDADES[mision.modalidad] ?? mision.modalidad;

  return `<li class="tarjeta tarjeta-mision">
        <a class="tarjeta-mision__enlace" href="${hashDe(RUTAS.MISION, mision.id)}">
          <span class="tarjeta-mision__numero" aria-hidden="true">${posicion}</span>
          <span class="tarjeta-mision__titulo">${escapar(mision.titulo)}</span>
          <span class="etiqueta etiqueta--${escapar(mision.modalidad)}">${escapar(modalidad)}</span>
          <span class="tarjeta-mision__objetivo">${enLinea(mision.objetivos[0])}</span>
        </a>
      </li>`;
}

/* -------------------------------------------------------------------------- */
/* Leccion                                                                    */
/* -------------------------------------------------------------------------- */

export function vistaMision(mision, unidad, { anterior, siguiente } = {}) {
  const modalidad = MODALIDADES[mision.modalidad] ?? mision.modalidad;
  const esLectura = mision.modalidad === 'lectura';

  return `
    <nav aria-label="Migas de pan" class="migas">
      <a href="${hashDe(RUTAS.PORTADA)}">Portada</a>
      <span aria-hidden="true"> / </span>
      <a href="${hashDe(RUTAS.UNIDAD, unidad.id)}">Unidad ${unidad.numero}</a>
      <span aria-hidden="true"> / </span>
      <span aria-current="page">${escapar(mision.titulo)}</span>
    </nav>

    <header class="cabecera-leccion">
      <p class="cabecera-leccion__etiquetas">
        <span class="etiqueta etiqueta--${escapar(mision.modalidad)}">${escapar(modalidad)}</span>
        <span class="cabecera-leccion__unidad">Unidad ${unidad.numero}. ${escapar(unidad.titulo)}</span>
      </p>
      <h1 class="titulo-vista">${escapar(mision.titulo)}</h1>
    </header>

    ${
      esLectura
        ? `<div class="panel panel--aviso">
             <p class="panel__titulo"><span aria-hidden="true">&#128218;</span> Leccion de lectura</p>
             <p>Esta mision se lee. Todavia no hay editor ni ejecucion: el interprete
             de JavaLearn esta en construccion y preferimos decirtelo a ponerte un
             boton que no hace nada.</p>
             <p>El codigo de ejemplo si es real. Cada fragmento de esta pagina se
             compila y se ejecuta con el <code>javac</code> de verdad antes de
             publicarse, y su salida es la que ves escrita debajo.</p>
           </div>`
        : ''
    }

    <section aria-labelledby="objetivos-leccion" class="bloque">
      <h2 id="objetivos-leccion">Al terminar, sabras</h2>
      <ul class="lista-objetivos">
        ${mision.objetivos.map((o) => `<li>${enLinea(o)}</li>`).join('\n        ')}
      </ul>
    </section>

    <article class="leccion">
      ${mision.explicacion.map(bloque).join('\n      ')}
    </article>

    ${
      mision.vocabulario?.length
        ? `<section aria-labelledby="vocabulario-leccion" class="bloque">
             <h2 id="vocabulario-leccion">Vocabulario de esta leccion</h2>
             <ul class="lista-etiquetas">
               ${mision.vocabulario.map((v) => `<li class="etiqueta etiqueta--vocab">${escapar(v)}</li>`).join('\n               ')}
             </ul>
           </section>`
        : ''
    }

    ${
      mision.glosario?.length
        ? `<section aria-labelledby="glosario-leccion" class="bloque">
             <h2 id="glosario-leccion">Palabras del glosario</h2>
             <ul class="lista-glosario">
               ${mision.glosario.map((t) => `<li class="lista-glosario__item"><code>${escapar(t)}</code></li>`).join('\n               ')}
             </ul>
           </section>`
        : ''
    }

    ${
      mision.pistas?.length
        ? `<section aria-labelledby="pistas-leccion" class="bloque">
             <h2 id="pistas-leccion">Si te atoras</h2>
             <p class="nota">De menos a mas. Abrir la ultima sin leer las anteriores
             se nota, pero nadie te va a impedir hacerlo.</p>
             ${mision.pistas
               .map(
                 (pista) => `<details class="pista">
                   <summary class="pista__resumen">Pista ${pista.nivel}</summary>
                   <p class="pista__texto">${enLinea(pista.texto)}</p>
                 </details>`,
               )
               .join('\n             ')}
           </section>`
        : ''
    }

    <section aria-labelledby="solucion-leccion" class="bloque">
      <h2 id="solucion-leccion">El programa completo</h2>
      <p class="nota">Este es el programa entero de la leccion. Compila y produce
      exactamente la salida que se indica.</p>
      <pre class="codigo" ${regionDesplazable('Programa completo de la leccion')}><code>${escapar(mision.solucion)}</code></pre>
      ${
        mision.salidaEsperada !== undefined
          ? `<p class="salida">
               <span class="salida__etiqueta">Salida</span>
               <pre class="salida__texto" ${regionDesplazable('Salida del programa completo')}><code>${escapar(mision.salidaEsperada)}</code></pre>
             </p>`
          : ''
      }
    </section>

    ${navegacionEntreMisiones({ anterior, siguiente })}
  `;
}

function navegacionEntreMisiones({ anterior, siguiente }) {
  if (!anterior && !siguiente) return '';

  return `<nav aria-label="Misiones contiguas" class="paginacion">
      ${
        anterior
          ? `<a class="boton boton--secundario" href="${hashDe(RUTAS.MISION, anterior.id)}">
               <span aria-hidden="true">&#8592;</span> Anterior: ${escapar(anterior.titulo)}
             </a>`
          : '<span class="paginacion__hueco"></span>'
      }
      ${
        siguiente
          ? `<a class="boton boton--secundario" href="${hashDe(RUTAS.MISION, siguiente.id)}">
               Siguiente: ${escapar(siguiente.titulo)} <span aria-hidden="true">&#8594;</span>
             </a>`
          : '<span class="paginacion__hueco"></span>'
      }
    </nav>`;
}

/* -------------------------------------------------------------------------- */
/* Bloques de la leccion                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Atributos para una region con scroll propio.
 *
 * Un bloque que se desplaza y no es un control sigue siendo alcanzable con
 * teclado si se le da tabindex="0" y un nombre: con el foco puesto, las flechas
 * desplazan. Sin esto, en un movil ancho el unico modo de leer el final de un
 * programa es arrastrarlo con el dedo.
 */
function regionDesplazable(etiqueta) {
  return `tabindex="0" role="region" aria-label="${escapar(etiqueta)}"`;
}

function bloque(b) {
  switch (b.tipo) {
    case 'parrafo':
      return `<p>${enLinea(b.texto)}</p>`;

    case 'lista':
      return `<section class="subseccion">
          ${b.titulo ? `<h2>${enLinea(b.titulo)}</h2>` : ''}
          <ul>
            ${b.items.map((i) => `<li>${enLinea(i)}</li>`).join('\n            ')}
          </ul>
        </section>`;

    case 'codigo':
      return `<figure class="ejemplo">
          ${b.titulo ? `<figcaption class="ejemplo__titulo">${enLinea(b.titulo)}</figcaption>` : ''}
          <pre class="codigo" ${regionDesplazable(`Codigo Java${b.titulo ? `: ${escapar(b.titulo)}` : ''}`)}><code>${escapar(b.codigo)}</code></pre>
          ${
            b.salida !== undefined
              ? `<p class="salida">
                   <span class="salida__etiqueta">Salida</span>
                   <pre class="salida__texto" ${regionDesplazable('Salida del ejemplo')}><code>${escapar(b.salida)}</code></pre>
                 </p>`
              : ''
          }
          ${b.nota ? `<p class="ejemplo__nota">${enLinea(b.nota)}</p>` : ''}
        </figure>`;

    case 'aviso':
      return `<div class="panel panel--${b.tono === 'atencion' ? 'peligro' : 'aviso'}">
          <p class="panel__titulo">
            <span aria-hidden="true">${b.tono === 'atencion' ? '&#9888;' : '&#9432;'}</span>
            ${b.tono === 'atencion' ? 'Ojo' : 'Nota'}
          </p>
          <p>${enLinea(b.texto)}</p>
        </div>`;

    case 'tabla':
      return `<div class="tabla-envoltorio" ${regionDesplazable('Tabla de la leccion')}>
          <table class="tabla">
            <thead>
              <tr>${b.cabeceras.map((c) => `<th scope="col">${enLinea(c)}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${b.filas
                .map(
                  (fila) =>
                    `<tr>${fila
                      .map((celda, i) => (i === 0 ? `<th scope="row">${enLinea(celda)}</th>` : `<td>${enLinea(celda)}</td>`))
                      .join('')}</tr>`,
                )
                .join('\n              ')}
            </tbody>
          </table>
        </div>`;

    default:
      /* Un bloque de tipo desconocido se dice, no se calla: si alguien escribe
         'lista' con otra cosa, hay que ver el fallo y no un hueco raro en la pagina. */
      return `<div class="panel panel--error">
          <p class="panel__titulo"><span aria-hidden="true">&#9888;</span> Contenido no reconocido</p>
          <p>Hay un bloque de tipo <code>${escapar(String(b.tipo))}</code> que esta vista
          no sabe pintar. Es un fallo del contenido, no tuyo.</p>
        </div>`;
  }
}

/* -------------------------------------------------------------------------- */
/* Ruta desconocida                                                            */
/* -------------------------------------------------------------------------- */

export function vistaNoEncontrada() {
  return `
    <h1 class="titulo-vista">No encontramos esa pagina</h1>
    <p class="intro">El enlace puede estar mal escrito, o la mision todavia no existe.</p>
    <p><a class="boton boton--principal" href="${hashDe(RUTAS.PORTADA)}">Volver a la portada</a></p>
  `;
}

export { buscarMision, misionesDeUnidad };
