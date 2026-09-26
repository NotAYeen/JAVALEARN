import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MISIONES } from '../../src/data/misiones.js';
import { UNIDADES } from '../../src/data/unidades.js';

/**
 * El texto que ve el alumno lleva tildes. El codigo no.
 *
 * AGENTS distingue tres cosas que en un mismo archivo conviven: los
 * identificadores, los comentarios y el texto del alumno. Los dos primeros van
 * sin tilde porque se leen en la terminal; el tercero si, porque lo lee alguien
 * que esta aprendiendo a escribir en castellano. Se incumplio en las cinco
 * primeras misiones y en la interfaz entera, y pasaba desapercibido: nadie
 * mira el corrector de un sitio en castellano, simplemente queda mal.
 *
 * Aqui solo van las palabras que SIEMPRE van acentuadas. Las que dependen del
 * contexto (que, como, donde, si, esta, el, tu, aun, solo) no pueden ir: un
 * corrector automatico pondria una tilde donde no toca. Esas se revisan a mano.
 *
 * Tres trampas que costaron una vuelta de tuerca cada una:
 *
 * 1. Los plurales. En -cion el singular lleva tilde y el plural no
 *    (`instruccion` si, `instrucciones` no), porque el plural pasa a ser llana
 *    y una llana terminada en -s no se acentua. En cambio las esdrujulas y las
 *    agudas si la llevan en plural: `codigos`, `metodos`, `basicos` y `logicos`
 *    la llevan; `lecciones` no. Poner las dos formas hace fallar la prueba con
 *    texto que esta bien, y una prueba que falla con lo correcto ensena a
 *    ignorar la prueba.
 * 2. La letra ñ. `senal`, `anade` y `anaden` no llevan tilde: llevan eñe. Se
 *    apuntan aqui en su forma sin eñe a proposito, para pillar la que falte.
 * 3. Las palabras con ñ o tilde en el nombre no son un problema para el motor,
 *    pero si un fallo de este archivo: `codigo` a secas es un identificador, y
 *    un identificador sin tilde en un sitio de texto es justo lo que se busca.
 */

const SIEMPRE = [
  // -cion y derivados: el singular lleva tilde, el plural no.
  'instruccion', 'ejecucion', 'condicion', 'operacion', 'excepcion',
  'precision', 'expresion', 'posicion', 'decision', 'repeticion', 'version',
  'seccion', 'coleccion', 'opcion', 'atencion', 'compilacion', 'documentacion',
  'codificacion', 'construccion', 'preparacion', 'depuracion', 'auditoria',
  'relacion', 'aplicacion', 'informacion', 'navegacion', 'paginacion',
  // Ni -dad ni -sion: `unidad`, `edad`, `capacidad` y `libertad` NO llevan
  // tilde. `leccion` si, pero `lecciones` no: el plural es llana.
  'indice', 'indices', 'limite', 'limites', 'numero', 'numeros',
  'aqui', 'ahi', 'alli', 'alla', 'asi', 'mas', 'demas',
  'sintaxis', 'analisis', 'metodo', 'metodos', 'codigo', 'codigos',
  'linea', 'lineas', 'leccion', 'mision', 'practica', 'practico',
  'tecnica', 'tecnico', 'aritmetica', 'logica', 'logico', 'logicos',
  'caracter', 'generico', 'generica', 'automatico', 'automatica',
  'unico', 'unica', 'ultimo', 'ultima', 'ultimas', 'minimo', 'maximo',
  'optimo', 'proximo', 'valido', 'valida', 'validos', 'invalido',
  'basico', 'basica', 'movil', 'rapido', 'facil', 'dificil', 'util',
  'boton', 'botones', 'tambien', 'despues', 'detras', 'ademas', 'habia',
  'interprete', 'preferia', 'dia', 'habitos', 'publico', 'estatico',
  'tecnologia', 'categoria', 'energia', 'matematica', 'programacion',
  'pseudocodigo', 'grafico', 'simbolico', 'aritmetico', 'alfabetico',
  // Plurales de esdrujula, que tambien llevan tilde.
  'basicos', 'basicas', 'practicos', 'practicas', 'tecnicos', 'tecnicas',
  'genericos', 'genericas', 'automaticos', 'automaticas', 'unicos', 'unicas',
  'moviles', 'utiles', 'faciles', 'dificiles', 'rapidos', 'rapidas',
  'interpretes', 'graficos', 'simbolicos', 'aritmeticos', 'alfabeticos',
  'minimos', 'maximos', 'ultimos', 'dias',
  // Palabras con eñe, apuntadas sin eñe para detectar la que falte.
  'senal', 'anade', 'anaden',
  // Verbos y expresiones que casi siempre aparecen en pasado o futuro.
  'quedaria', 'quedo', 'seria', 'serian', 'seran', 'estara', 'estan', 'esten',
  'estaria', 'deberia', 'deberian', 'podria', 'podrian', 'veras', 'diras',
  'dira', 'diran', 'hara', 'podras', 'sabras', 'seguiria', 'seguirian', 'todavia', 'ningun',
  // Irregulares y plurales que se nos suelen escapar.
  'iran', 'iria', 'podra', 'podran', 'sabra', 'sabran', 'haria',
  'harian', 'seira', 'seiran', 'veran', 'pudieron',
  'maquina', 'maquinas', 'cuanto', 'cuantos', 'cuanta', 'cuantas',
];

const PALABRA = new RegExp(`(?<![\\p{L}])(${SIEMPRE.join('|')})(?![\\p{L}])`, 'giu');

const PALABRAS_CLAVE = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
  'case', 'do', 'else', 'yield', 'await', 'throw',
]);

/**
 * Recorre un archivo de JavaScript y separa el codigo del texto, saltando
 * comentarios, cadenas, regex y plantillas, incluidas las que van anidadas
 * dentro de una interpolacion.
 *
 * Esto no se puede hacer con una expresion regular del tipo `` `[^`]*` ``, y
 * no es teoria: en `escapar(texto).replace(/`([^`]+)`/g, ...)` hay TRES acentos
 * graves dentro de un regex, y en `${a ? `si` : `no`}` hay plantillas dentro
 * de una plantilla. Con emparejado a pares, el primer regex desplaza todo lo
 * que viene despues y la "plantilla" se come medio archivo. Se comprobo: la
 * prueba pasaba en verde con `Leccio` a secas en mitad de la portada.
 *
 * @returns {{plantillas: string[], cadenas: string[]}}
 */
function separarTexto(fuente) {
  const salida = { plantillas: [], cadenas: [] };

  function saltarLinea(i) {
    while (i < fuente.length && fuente[i] !== '\n') i += 1;
    return i;
  }

  function saltarBloque(i) {
    const fin = fuente.indexOf('*/', i + 2);
    return fin === -1 ? fuente.length : fin + 2;
  }

  /** Una barra abre regex si delante no hay un valor, sino un operador o una palabra clave. */
  function abreRegex(i) {
    let j = i - 1;
    while (j >= 0 && /\s/.test(fuente[j])) j -= 1;
    if (j < 0) return true;
    if (/[\w$)\]]/.test(fuente[j])) {
      let k = j;
      while (k >= 0 && /[\w$]/.test(fuente[k])) k -= 1;
      return PALABRAS_CLAVE.has(fuente.slice(k + 1, j + 1));
    }
    return true;
  }

  function saltarRegex(i) {
    let j = i + 1;
    let enClase = false;
    while (j < fuente.length) {
      const c = fuente[j];
      if (c === '\\') { j += 2; continue; }
      if (c === '\n') break; // regex sin cerrar
      if (c === '[') enClase = true;
      else if (c === ']') enClase = false;
      else if (c === '/' && !enClase) break;
      j += 1;
    }
    if (fuente[j] !== '/') return i + 1;
    j += 1;
    while (j < fuente.length && /[a-z]/i.test(fuente[j])) j += 1;
    return j;
  }

  function saltarCadena(i, cierre) {
    let j = i + 1;
    let valor = '';
    while (j < fuente.length) {
      const c = fuente[j];
      if (c === '\\') { valor += fuente[j + 1] ?? ''; j += 2; continue; }
      if (c === cierre || c === '\n') break;
      valor += c;
      j += 1;
    }
    if (fuente[j] === cierre) {
      salida.cadenas.push(valor);
      return j + 1;
    }
    return i + 1; // cadena sin cerrar: no la cuento
  }

  /**
   * `i` apunta al acento grave de apertura. Devuelve el indice siguiente al de
   * cierre y guarda el cuerpo, con las interpolaciones ya vacias.
   */
  function saltarPlantilla(i) {
    let j = i + 1;
    let cuerpo = '';
    let cerrada = false;
    while (j < fuente.length) {
      const c = fuente[j];
      if (c === '\\') { cuerpo += fuente[j] + (fuente[j + 1] ?? ''); j += 2; continue; }
      if (c === '`') { j += 1; cerrada = true; break; }
      if (c === '$' && fuente[j + 1] === '{') {
        j = saltarInterpolacion(j + 2);
        cuerpo += ' ';
        continue;
      }
      cuerpo += c;
      j += 1;
    }
    salida.plantillas.push(cuerpo);
    if (!cerrada && j >= fuente.length) {
      throw new Error('plantilla sin cerrar: el recorrido se ha comido el archivo');
    }
    return j;
  }

  /** `i` apunta justo detras de `${`. Devuelve el indice tras la llave de cierre. */
  function saltarInterpolacion(i) {
    let nivel = 1;
    while (i < fuente.length && nivel > 0) {
      const c = fuente[i];
      const siguiente = fuente[i + 1];
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { i = saltarPlantilla(i); continue; }
      if (c === "'" || c === '"') { i = saltarCadena(i, c); continue; }
      if (c === '/' && siguiente === '/') { i = saltarLinea(i + 2); continue; }
      if (c === '/' && siguiente === '*') { i = saltarBloque(i + 2); continue; }
      if (c === '/' && abreRegex(i)) { i = saltarRegex(i); continue; }
      if (c === '{') nivel += 1;
      else if (c === '}') nivel -= 1;
      i += 1;
    }
    return i;
  }

  let i = 0;
  while (i < fuente.length) {
    const c = fuente[i];
    const siguiente = fuente[i + 1];
    if (c === '/' && siguiente === '/') { i = saltarLinea(i + 2); continue; }
    if (c === '/' && siguiente === '*') { i = saltarBloque(i + 2); continue; }
    if (c === '/' && abreRegex(i)) { i = saltarRegex(i); continue; }
    if (c === '`') { i = saltarPlantilla(i); continue; }
    if (c === "'" || c === '"') { i = saltarCadena(i, c); continue; }
    i += 1;
  }

  return salida;
}

/** Una cadena es prosa si no parece un identificador, una clase ni una ruta. */
function pareceProsa(cadena) {
  if (cadena.length === 0 || cadena.length > 60) return false;
  if (/[-_/#.\\]/.test(cadena)) return false;
  if (/^[a-z0-9]+$/.test(cadena)) return false; // 'lectura', 'dependencias'
  return /[\p{L}]/u.test(cadena);
}

/** Deja solo el texto que se lee de una plantilla: sin etiquetas ni codigo. */
function soloTextoDePlantilla(cuerpo) {
  let salida = '';
  let i = 0;
  while (i < cuerpo.length) {
    const c = cuerpo[i];
    if (c === '<') {
      const fin = cuerpo.indexOf('>', i);
      i = fin === -1 ? cuerpo.length : fin + 1;
      continue;
    }
    if (c === '`') {
      const fin = cuerpo.indexOf('`', i + 1);
      i = fin === -1 ? cuerpo.length : fin + 1;
      continue;
    }
    salida += c;
    i += 1;
  }
  return salida;
}

/** Deja solo el texto de un valor de datos: fuera no hay etiquetas ni plantillas. */
function soloTextoDeDato(valor) {
  return valor.replace(/`[^`]*`/g, ' ');
}

/** Recoge el texto de prosa de cualquier estructura anidada. */
function prosaDe(valor, claves) {
  const encontradas = [];
  if (Array.isArray(valor)) {
    for (const v of valor) encontradas.push(...prosaDe(v, claves));
  } else if (valor && typeof valor === 'object') {
    for (const [k, v] of Object.entries(valor)) {
      if (claves.has(k)) {
        if (typeof v === 'string') encontradas.push({ clave: k, valor: v });
        else if (Array.isArray(v)) {
          for (const x of v) if (typeof x === 'string') encontradas.push({ clave: k, valor: x });
        }
      } else {
        encontradas.push(...prosaDe(v, claves));
      }
    }
  }
  return encontradas;
}

const CLASES_PROSA = new Set([
  'titulo', 'resumen', 'texto', 'nota', 'descripcion', 'nombre', 'etiqueta',
  'objetivos', 'items', 'cabeceras', 'filas', 'glosario', 'vocabulario',
]);

/** Busca palabras que siempre van acentuadas en un texto ya limpio. */
function faltan(texto, donde, contexto = '') {
  const encontradas = [...new Set([...texto.matchAll(PALABRA)].map((m) => m[0]))];
  if (encontradas.length === 0) return [];
  const dondeEsta = contexto ? ` en ${JSON.stringify(contexto.slice(0, 90))}` : '';
  return encontradas.map((palabra) => `${donde}: "${palabra}"${dondeEsta}`);
}

/** Busca en un valor de datos, quitando el codigo entre acentos graves. */
function faltanEnDato(valor, donde) {
  return faltan(soloTextoDeDato(valor), donde, valor);
}

const SIN_TILDE = 'Sin tilde donde siempre va:\n  ';

describe('el texto del alumno lleva tildes', () => {
  it('el detector encuentra de verdad cada palabra que dice detectar', () => {
    /* Si el patron se rompiera (una palabra mal escapada, un flag que no hace
       lo que creemos) las pruebas de contenido de abajo pasarian sin mirar nada.
       Aqui se comprueba palabra por palabra que el patron las ve. */
    const Fallo = [];
    for (const palabra of SIEMPRE) {
      const texto = `antes ${palabra} despues`;
      if (![...texto.matchAll(PALABRA)].some((m) => m[0] === palabra)) Fallo.push(palabra);
    }
    expect(Fallo, `el patron no encuentra estas palabras: ${Fallo.join(', ')}`).toEqual([]);
  });

  it('la lista no tiene palabras repetidas', () => {
    /* Una palabra repetida no rompe nada, pero indica que la lista se esta
       editando a mano y hay que repasarla. */
    const repetidas = SIEMPRE.filter((p, i) => SIEMPRE.indexOf(p) !== i);
    expect(repetidas, `palabras repetidas: ${[...new Set(repetidas)].join(', ')}`).toEqual([]);
  });

  it('las cinco misiones no dejan palabras que siempre van acentuadas', () => {
    const problemas = [];
    for (const mision of MISIONES) {
      for (const { clave, valor } of prosaDe(mision, CLASES_PROSA)) {
        problemas.push(...faltanEnDato(valor, `${mision.id} (${clave})`));
      }
    }
    expect(problemas, SIN_TILDE + problemas.join('\n  ')).toEqual([]);
  });

  it('las unidades tampoco', () => {
    const problemas = [];
    for (const unidad of UNIDADES) {
      for (const { clave, valor } of prosaDe(unidad, CLASES_PROSA)) {
        problemas.push(...faltanEnDato(valor, `${unidad.id} (${clave})`));
      }
    }
    expect(problemas, SIN_TILDE + problemas.join('\n  ')).toEqual([]);
  });

  it('la interfaz tampoco', () => {
    /* Las plantillas de vistas.js llevan el texto de pantalla. Los comentarios
       van sin tilde a proposito y `leccion` en `aria-labelledby="leccion"` es un
       identificador, asi que el recorrido los salta. */
    const { plantillas } = separarTexto(readFileSync('src/ui/vistas.js', 'utf8'));
    expect(plantillas.length, 'no se ha encontrado ni una plantilla: algo va mal con el recorrido')
      .toBeGreaterThan(0);
    const problemas = [];
    for (const cuerpo of plantillas) {
      problemas.push(...faltan(soloTextoDePlantilla(cuerpo), 'vistas.js', cuerpo));
    }
    expect(problemas, SIN_TILDE + problemas.join('\n  ')).toEqual([]);
  });

  it('las etiquetas de modalidad tampoco', () => {
    /* Las etiquetas de MODALIDADES son cadenas sueltas entre comillas simples, no
       plantillas, asi que el recorrido anterior no las ve. */
    const { cadenas } = separarTexto(readFileSync('src/ui/vistas.js', 'utf8'));
    const problemas = [];
    for (const cadena of cadenas) {
      if (!pareceProsa(cadena)) continue;
      problemas.push(...faltanEnDato(cadena, 'etiqueta'));
    }
    expect(problemas, SIN_TILDE + problemas.join('\n  ')).toEqual([]);
  });

  it('ni el indice HTML', () => {
    /* El indice pone las tildes como entidades (`c&oacute;digo`), que es lo que
       permite AGENTS, asi que no hay ni una tilde suelta en el archivo. Lo que
       se busca es la palabra escrita a secas. Se quitan el script y los
       comentarios porque dentro no hay texto del alumno. */
    const visible = readFileSync('index.html', 'utf8')
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s[a-z-]+="[^"]*"/g, ' ');
    const problemas = [...new Set([...visible.matchAll(PALABRA)].map((m) => m[0]))]
      .map((palabra) => `index.html: "${palabra}"`);
    expect(problemas, SIN_TILDE + problemas.join('\n  ')).toEqual([]);
  });
});

describe('el codigo de los ejemplos se deja como estaba', () => {
  /* Un ejemplo con tildes es Java valido, y las soluciones ya imprimen
     "Año 2026" a proposito: es la leccion de las cadenas. Lo que no vale es que
     una tilde se colara en un identificador, y eso no se comprueba aqui sino
     con el JDK, que es quien de verdad lo diria. */

  it('los ejemplos con tildes siguen siendo Java que compila', () => {
    /* Delegado en el validador real, que ademas compara la salida. Aqui solo se
       deja constancia de que el ejemplo acentuado existe, porque es el que
       romperea un corrector automatico. */
    const conAcentos = MISIONES.filter((m) => /[áéíóúñÁÉÍÓÚÑ]/.test(m.solucion));
    expect(conAcentos.map((m) => m.id)).toEqual(['fundamentos-03']);
  });

  it('ninguna solucion depende de una tilde en un identificador', () => {
    for (const mision of MISIONES) {
      /* Un identificador con tilde no compila, y el contraste con el JDK ya lo
         comprueba. Aqui solo se mira la cabecera del programa para que el fallo
         diga que la tilde esta en un nombre y no en un texto. */
      const identificadores = mision.solucion.match(/\b[A-Za-z_$][\w$]*\b/g) ?? [];
      const conTilde = identificadores.filter((i) => /[áéíóúñÁÉÍÓÚÑ]/.test(i));
      expect(conTilde, `${mision.id}: ${conTilde.join(', ')}`).toEqual([]);
    }
  });
});
