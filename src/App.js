import { UNIDADES } from './data/unidades.js';
import { buscarMision, misionesDeUnidad } from './data/misiones.js';
import { anunciar } from './ui/anuncios.js';
import { iniciarTema } from './ui/tema.js';
import { RUTAS, iniciarRuta } from './ui/ruta.js';
import { vistaMision, vistaNoEncontrada, vistaPortada, vistaUnidad } from './ui/vistas.js';

/**
 * Monta la aplicacion.
 *
 * Aqui no se pinta nada directamente: se resuelve la ruta, se pide la cadena
 * de HTML a la vista correspondiente y se decide donde va el foco. Que el
 * gestion de foco este en un unico sitio es lo que evita el fallo clasico de
 * las SPAs: navegar y que el foco se quede en un enlace que ya no existe,
 * dejando a quien navega con teclado sin saber donde esta.
 */
export function montar({ raiz, botonTema }) {
  iniciarTema(botonTema);
  iniciarRuta((ruta) => pintarRuta(raiz, ruta));
}

function pintarRuta(raiz, ruta) {
  const { html, titulo } = construir(ruta);

  raiz.innerHTML = html;
  raiz.scrollTop = 0;
  window.scrollTo(0, 0);
  moverFocoAlTitulo();
  anunciar(titulo);
  document.title = `${titulo} · JavaLearn`;
}

/**
 * Devuelve el HTML y el texto que se anuncia y va al titulo del navegador.
 *
 * Es una funcion pura a proposito: la decision de que pintar se prueba sin
 * DOM, que es donde se concentran los casos raros.
 */
export function construir(ruta) {
  switch (ruta.tipo) {
    case RUTAS.PORTADA:
      return { html: vistaPortada(), titulo: 'Portada' };

    case RUTAS.UNIDAD: {
      const unidad = UNIDADES.find((u) => u.id === ruta.id);
      if (!unidad) return construir({ tipo: RUTAS.NO_ENCONTRADA });
      return { html: vistaUnidad(unidad), titulo: `Unidad ${unidad.numero}. ${unidad.titulo}` };
    }

    case RUTAS.MISION: {
      const mision = buscarMision(ruta.id);
      if (!mision) return construir({ tipo: RUTAS.NO_ENCONTRADA });

      const unidad = UNIDADES.find((u) => u.id === mision.unidad);
      if (!unidad) return construir({ tipo: RUTAS.NO_ENCONTRADA });

      const hermanas = misionesDeUnidad(unidad.id);
      const indice = hermanas.findIndex((m) => m.id === mision.id);

      return {
        html: vistaMision(mision, unidad, {
          anterior: indice > 0 ? hermanas[indice - 1] : null,
          siguiente: indice >= 0 && indice < hermanas.length - 1 ? hermanas[indice + 1] : null,
        }),
        titulo: mision.titulo,
      };
    }

    case RUTAS.NO_ENCONTRADA:
    default:
      return { html: vistaNoEncontrada(), titulo: 'Pagina no encontrada' };
  }
}

/**
 * Lleva el foco al titulo de la vista.
 *
 * El h1 lleva tabindex="-1" precisamente para esto: sin el, un encabezado no
 * es un destino de foco valido y el foco se quedaria donde estaba, que es un
 * enlace que acaba de desaparecer del DOM.
 */
function moverFocoAlTitulo() {
  const titulo = document.querySelector('main h1');
  if (!titulo) return;
  titulo.setAttribute('tabindex', '-1');
  titulo.focus({ preventScroll: true });
}
