import { TOTAL_MISIONES, UNIDADES } from './data/unidades.js';
import { anunciar, escapar } from './ui/anuncios.js';
import { iniciarTema } from './ui/tema.js';

/**
 * Monta la aplicacion.
 *
 * En esta fase la interfaz es el armazon: estructura, tema y hoja de ruta.
 * Las misiones y el editor llegan en fases posteriores, pero todo lo que hay
 * aqui se construye ya con teclado y con lector de pantalla en mente, para no
 * acumular deuda de accesibilidad.
 */
export function montar({ raiz, botonTema }) {
  raiz.innerHTML = vistaBienvenida();
  iniciarTema(botonTema);
  anunciar(`JavaLearn listo. Hoja de ruta de ${UNIDADES.length} unidades cargada.`);
}

function vistaBienvenida() {
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
      <p>
        Cada solucion se contrasta contra el <code>javac</code> real antes de publicarse,
        de modo que lo que ves aqui se comporta como Java de verdad.
      </p>
    </div>

    <h2>El recorrido</h2>
    <p>
      ${UNIDADES.length} unidades y ${TOTAL_MISIONES} misiones, con seis formas distintas de
      practicar: leer, escribir en la terminal, depurar, auditar, ensamblar y relacionar.
    </p>

    <ol class="rejilla lista-unidades">
      ${UNIDADES.map(tarjetaUnidad).join('\n      ')}
    </ol>
  `;
}

function tarjetaUnidad(u) {
  return `
        <li class="tarjeta tarjeta-unidad">
          <p class="tarjeta-unidad__numero">${u.numero}</p>
          <h3 class="tarjeta-unidad__titulo">${escapar(u.titulo)}</h3>
          <p class="tarjeta-unidad__resumen">${escapar(u.resumen)}</p>
          <p class="tarjeta-unidad__pie">
            <span class="etiqueta etiqueta--pendiente">En preparacion</span>
            <span class="tarjeta-unidad__misiones">${u.misiones} misiones</span>
          </p>
        </li>`;
}
