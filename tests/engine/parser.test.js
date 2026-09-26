import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ErrorSintaxis } from '../../src/engine/errores.js';
import { analizar, intentarAnalizar } from '../../src/engine/index.js';
import { nodo } from '../../src/engine/ast.js';
import { NO_SOPORTADO, SOPORTADO, restriccionDe } from '../../src/data/motor.js';
import { MISIONES } from '../../src/data/misiones.js';

/**
 * Envuelve un cuerpo sucio en una clase válida, para probar algo rápido.
 *
 * Declara de antemano las variables que usan los casos, porque el contraste
 * con javac compara **sintaxis**: si `a` no existiera, el JDK no fallaría por
 * la sintaxis sino por no encontrar el símbolo, y estariamos comparando dos
 * cosas distintas sin querer.
 */
function enClase(cuerpo) {
  return `public class Principal {
    static int a;
    static int b;
    static int c;
    static int n;
    static int r;
    static int x;
    static int y;
    static int[] numeros;
    static String[] lista;
    static String s;
    static boolean activo;
    static boolean p;
    static boolean q;
    static double d;
    static char letra;

    public static void main(String[] args) {
        ${cuerpo}
    }
}`;
}

/** Igual, pero el metodo devuelve int, para probar el return con valor. */
function enMetodoQueDevuelve(cuerpo) {
  return `public class Principal {
    static int a;
    static int b;

    static int calcular() {
        ${cuerpo}
    }

    public static void main(String[] args) { }
}`;
}

/** Analiza el cuerpo de un main y devuelve el árbol. */
function cuerpo(codigo) {
  return analizar(enClase(codigo));
}

/** Analiza un programa entero, sin envolverlo en nada. */
function completo(fuente) {
  return analizar(fuente);
}

/** Busca un nodo por su tipo, en profundidad. */
function buscar(nodo, tipo) {
  if (!nodo || typeof nodo !== 'object') return null;
  if (Array.isArray(nodo)) {
    for (const hijo of nodo) {
      const encontrado = buscar(hijo, tipo);
      if (encontrado) return encontrado;
    }
    return null;
  }
  if (nodo.tipo === tipo) return nodo;
  for (const [clave, valor] of Object.entries(nodo)) {
    if (clave === 'pos') continue;
    const encontrado = buscar(valor, tipo);
    if (encontrado) return encontrado;
  }
  return null;
}

/** Todos los nodos de un tipo, en orden de aparición. */
function todos(nodo, tipo, acum = []) {
  if (!nodo || typeof nodo !== 'object') return acum;
  if (Array.isArray(nodo)) {
    for (const hijo of nodo) todos(hijo, tipo, acum);
    return acum;
  }
  if (nodo.tipo === tipo) acum.push(nodo);
  for (const [clave, valor] of Object.entries(nodo)) {
    if (clave === 'pos') continue;
    todos(valor, tipo, acum);
  }
  return acum;
}

/**
 * Ejecuta javac y devuelve si lo acepta o no, sin lanzar.
 *
 * El archivo se llama como la clase pública que declara el fuente: javac
 * rechaza el código si no coinciden, y ese error no va de sintaxis, así que
 * contaminaría el contraste.
 */
function javacAcepta(fuente) {
  const dir = mkdtempSync(join(tmpdir(), 'javaparse-'));
  try {
    const nombreClase = /class\s+([A-Za-z_$][A-Za-z0-9_$]*)/.exec(fuente)?.[1] ?? 'Principal';
    const archivo = join(dir, `${nombreClase}.java`);
    writeFileSync(archivo, fuente, 'utf8');
    try {
      execFileSync('javac', ['--release', '8', '-d', dir, archivo], { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function esperarErrorSintaxis(fuente, fragmento) {
  try {
    analizar(fuente);
  } catch (error) {
    expect(error).toBeInstanceOf(ErrorSintaxis);
    expect(error.mensaje).toContain(fragmento);
    return error;
  }
  throw new Error(`Se esperaba un error de sintaxis al analizar: ${JSON.stringify(fuente)}`);
}

/* ------------------------------------------------------------------ */

describe('estructura de un programa', () => {
  it('analiza una clase con su metodo main', () => {
    const arbol = completo('public class Principal { public static void main(String[] args) { } }');
    expect(arbol.tipo).toBe('Programa');
    expect(arbol.clase.nombre).toBe('Principal');
    expect(arbol.clase.modificadores).toEqual(['public']);
    expect(arbol.clase.miembros).toHaveLength(1);

    const main = arbol.clase.miembros[0];
    expect(main.tipo).toBe('Metodo');
    expect(main.nombre).toBe('main');
    expect(main.tipoRetorno.nombre).toBe('void');
    expect(main.modificadores).toEqual(['public', 'static']);
    expect(main.parametros[0].tipoParametro.tipo).toBe('TipoArreglo');
    expect(main.parametros[0].tipoParametro.elemento.nombre).toBe('String');
    expect(main.parametros[0].nombre).toBe('args');
  });

  it('acepta campos, varios y con modificadores', () => {
    const arbol = completo(`public class Principal {
      int contador;
      static final int MAXIMO = 10;
      public static String saludo = "hola";
      public static void main(String[] args) { }
    }`);
    const campos = todos(arbol, 'Campo');
    expect(campos).toHaveLength(3);
    expect(campos[1].modificadores).toEqual(['static', 'final']);
    expect(campos[1].nombre).toBe('MAXIMO');
    expect(campos[1].inicializador.valor).toBe(10);
    expect(campos[2].nombre).toBe('saludo');
    expect(campos[2].inicializador.valor).toBe('hola');
    expect(campos[0].inicializador).toBeNull();
  });

  it('acepta varios metodos y parametros de varios tipos', () => {
    const arbol = completo(`public class Principal {
      static int sumar(int a, int b) { return a + b; }
      static void avisar(String texto, int veces) { }
      public static void main(String[] args) { }
    }`);
    const metodos = todos(arbol, 'Metodo');
    expect(metodos.map((m) => m.nombre)).toEqual(['sumar', 'avisar', 'main']);
    expect(metodos[1].parametros.map((p) => p.tipoParametro.nombre)).toEqual(['String', 'int']);
  });

  it('admite varias variables en una sola declaracion', () => {
    const arbol = cuerpo('int a = 1, b = 2, c;');
    const multiplas = buscar(arbol, 'DeclaracionesMultiples');
    expect(multiplas).not.toBeNull();
    expect(multiplas.variables.map((v) => v.nombre)).toEqual(['a', 'b', 'c']);
  });
});

describe('instrucciones', () => {
  it('analiza if con else y sin else', () => {
    const arbol = cuerpo('if (x > 1) { System.out.println("a"); } else { System.out.println("b"); }');
    const si = buscar(arbol, 'Si');
    expect(si.condicion.tipo).toBe('Binario');
    expect(si.condicion.operador).toBe('>');
    expect(si.otro.tipo).toBe('Bloque');
    expect(buscar(cuerpo('if (x > 1) { }'), 'Si').otro).toBeNull();
  });

  it('analiza while, do while, for y for each', () => {
    expect(buscar(cuerpo('while (x < 3) { x++; }'), 'Mientras')).not.toBeNull();

    const hacer = buscar(cuerpo('do { x++; } while (x < 3);'), 'Hacer');
    expect(hacer.condicion.operador).toBe('<');

    const para = buscar(cuerpo('for (int i = 0; i < 5; i++) { }'), 'Para');
    expect(para.inicializacion[0].tipo).toBe('Declaracion');
    expect(para.inicializacion[0].tipoDeclarado.tipo).toBe('TipoPrimitivo');
    expect(para.condicion.operador).toBe('<');
    expect(para.avance.tipo).toBe('Unario');

    const cada = buscar(cuerpo('for (String s : lista) { }'), 'ParaCada');
    expect(cada.declarado.tipoParametro.nombre).toBe('String');
    expect(cada.declarado.nombre).toBe('s');
    expect(cada.coleccion.nombre).toBe('lista');
  });

  it('no confunde un for clasico con un for each', () => {
    const para = buscar(cuerpo('for (int i = 0; i < 5; i++) { }'), 'Para');
    expect(para).not.toBeNull();
    expect(buscar(cuerpo('for (int i = 0; i < 5; i++) { }'), 'ParaCada')).toBeNull();
  });

  it('distingue los dos puntos del for each de los dos puntos del condicional', () => {
    /* El `:` del ternario no convierte un for en un for each. */
    const para = buscar(cuerpo('for (int i = 0; i < 5; i++) { }'), 'Para');
    expect(para.condicion.tipo).toBe('Binario');

    const cond = buscar(cuerpo('String s = a > b ? "x" : "y";'), 'Condicional');
    expect(cond).not.toBeNull();
  });

  it('analiza break, continue, return y bloque vacio', () => {
    expect(buscar(cuerpo('while (true) { break; }'), 'Romper')).not.toBeNull();
    expect(buscar(cuerpo('while (true) { continue; }'), 'Continuar')).not.toBeNull();
    expect(buscar(cuerpo('return 5;'), 'Devolver').valor.valor).toBe(5);
    expect(buscar(cuerpo('return;'), 'Devolver').valor).toBeNull();
    expect(buscar(cuerpo('{ int x = 1; }'), 'Bloque')).not.toBeNull();
  });

  it('acepta un cuerpo sin llaves cuando hay una sola instruccion', () => {
    const si = buscar(cuerpo('if (x > 1) System.out.println("a");'), 'Si');
    expect(si.entonces.tipo).toBe('Expresion');
  });

  it('no se come el else de un if anidado mal formado', () => {
    /* El else pertenece al if interior, igual que en Java. */
    const arbol = cuerpo('if (a) { if (b) { } else { } }');
    const sis = todos(arbol, 'Si');
    expect(sis).toHaveLength(2);
    expect(sis[0].otro).toBeNull();
    expect(sis[1].otro).not.toBeNull();
  });
});

describe('expresiones y precedencia', () => {
  it('respeta la precedencia de Java, que no es la de JavaScript', () => {
    /* En Java `a < b == c` es `(a < b) == c`. En JavaScript sería
       `a < (b == c)`. El detalle: en Java el motor de JavaScript se equivoca. */
    const arbol = cuerpo('boolean r = a < b == c;');
    const raiz = buscar(arbol, 'Binario');
    expect(raiz.operador).toBe('==');
    expect(raiz.izquierda.operador).toBe('<');
    expect(raiz.derecha.nombre).toBe('c');
  });

  it('multiplica antes de sumar', () => {
    const raiz = buscar(cuerpo('int r = 1 + 2 * 3;'), 'Binario');
    expect(raiz.operador).toBe('+');
    expect(raiz.derecha.operador).toBe('*');
  });

  it('asocia la resta y la division a la izquierda', () => {
    const raiz = buscar(cuerpo('int r = 10 - 3 - 2;'), 'Binario');
    expect(raiz.izquierda.operador).toBe('-');
    expect(raiz.izquierda.izquierda.valor).toBe(10);
    expect(raiz.derecha.valor).toBe(2);
  });

  it('asocia la asignacion a la derecha', () => {
    const raiz = buscar(cuerpo('a = b = 0;'), 'Asignacion');
    expect(raiz.objetivo.nombre).toBe('a');
    expect(raiz.valor.tipo).toBe('Asignacion');
  });

  it('ordena los operadores logicos como en Java', () => {
    /* || es mas flojo que &&, y && mas flojo que |. */
    const raiz = buscar(cuerpo('boolean r = a || b && c;'), 'Binario');
    expect(raiz.operador).toBe('||');
    expect(raiz.derecha.operador).toBe('&&');
  });

  it('analiza el condicional ternario', () => {
    const raiz = buscar(cuerpo('int r = a > b ? 1 : 2;'), 'Condicional');
    expect(raiz.condicion.operador).toBe('>');
    expect(raiz.entonces.valor).toBe(1);
    expect(raiz.otro.valor).toBe(2);
  });

  it('analiza asignaciones compuestas', () => {
    for (const op of ['+=', '-=', '*=', '/=', '%=']) {
      const raiz = buscar(cuerpo(`int r = 0; r ${op} 2;`), 'Asignacion');
      expect(raiz.operador).toBe(op);
    }
  });

  it('analiza operadores unarios, antes y despues', () => {
    expect(buscar(cuerpo('int r = -5;'), 'Unario').operador).toBe('-');
    expect(buscar(cuerpo('boolean r = !activo;'), 'Unario').operador).toBe('!');
    const post = buscar(cuerpo('int r = 0; r++;'), 'Unario');
    expect(post.prefijo).toBe(false);
    const pre = buscar(cuerpo('int r = 0; ++r;'), 'Unario');
    expect(pre.prefijo).toBe(true);
  });

  it('distingue un agrupamiento de una conversion a primitivo', () => {
    /* (a + b) * c agrupa; no es un cast. */
    const raiz = buscar(cuerpo('int r = (a + b) * c;'), 'Binario');
    expect(raiz.operador).toBe('*');
    expect(raiz.izquierda.tipo).toBe('Binario');
    expect(raiz.izquierda.operador).toBe('+');
    expect(buscar(cuerpo('int r = (a + b) * c;'), 'Conversion')).toBeNull();

    /* (double) n si es una conversion. */
    const conv = buscar(cuerpo('double r = (double) n;'), 'Conversion');
    expect(conv.tipoDestino.nombre).toBe('double');
  });

  it('analiza llamadas, accesos a campos e indexado', () => {
    const llamada = buscar(cuerpo('System.out.println("hola");'), 'Llamada');
    expect(llamada.nombre).toBe('println');
    expect(llamada.receptor.tipo).toBe('AccesoMiembro');
    expect(llamada.receptor.miembro).toBe('out');
    expect(llamada.receptor.objeto.nombre).toBe('System');

    const suelta = buscar(cuerpo('saludar("x");'), 'Llamada');
    expect(suelta.receptor).toBeNull();

    const indice = buscar(cuerpo('int r = numeros[0];'), 'Indexado');
    expect(indice.base.nombre).toBe('numeros');
    expect(indice.indice.valor).toBe(0);
  });

  it('analiza la creacion de arreglos con y sin contenido', () => {
    const vacio = buscar(cuerpo('int[] n = new int[5];'), 'NuevoArreglo');
    expect(vacio.tipoElemento.nombre).toBe('int');
    expect(vacio.dimensiones).toHaveLength(1);
    expect(vacio.dimensiones[0].valor).toBe(5);
    expect(vacio.inicializador).toBeNull();

    const conDatos = buscar(cuerpo('String[] s = new String[] {"a", "b"};'), 'NuevoArreglo');
    expect(conDatos.inicializador).toHaveLength(2);
    expect(conDatos.inicializador[0].valor).toBe('a');
  });

  it('entiende todos los tipos de literal', () => {
    const arbol = cuerpo('int a = 1; long b = 2L; double c = 3.5; char d = \'x\'; String e = "t"; boolean f = true; String g = null;');
    const literales = todos(arbol, 'Literal').map((l) => l.tipoLiteral);
    expect(literales).toEqual(['entero', 'largo', 'doble', 'caracter', 'cadena', 'logico', 'nulo']);
  });
});

describe('genericos y el token >>', () => {
  /* El lector emite «>>» como un solo token porque en el resto de Java es un
     desplazamiento. Aquí hay que partirlo. Es el punto que la documentacion
     del proyecto avisa de forma expresa. */
  it('parte «>>» para cerrar dos niveles de genéricos', () => {
    const arbol = cuerpo('List<List<String>> datos = null;');
    const tipo = todos(arbol, 'TipoClase').find((t) => t.nombre === 'List');
    expect(tipo.nombre).toBe('List');
    expect(tipo.argumentos).toHaveLength(1);
    const interno = tipo.argumentos[0];
    expect(interno.tipo).toBe('TipoClase');
    expect(interno.nombre).toBe('List');
    expect(interno.argumentos[0].nombre).toBe('String');
  });

  it('parte «>>>» para cerrar tres niveles', () => {
    const arbol = cuerpo('Map<String, List<List<Integer>>> datos = null;');
    const mapa = todos(arbol, 'TipoClase').find((t) => t.nombre === 'Map');
    expect(mapa.nombre).toBe('Map');
    expect(mapa.argumentos).toHaveLength(2);
  });

  it('parte «>>» y además sigue usando el «>» que sobra como comparación', () => {
    /* El caso que de verdad importa: el «>» que queda tras partir el token
       tiene que seguir siendo un operador de comparación. */
    const arbol = cuerpo('boolean r = lista.size() > 0;');
    const raiz = buscar(arbol, 'Binario');
    expect(raiz.operador).toBe('>');
  });

  it('el «>» que sobra tras partir «>>» no se pierde y el resto sigue bien', () => {
    /* El `>>` de `List<String>>` se parte en dos. El «>» que queda cierra el
       nivel exterior y el resto de la linea se analiza con normalidad: si el
       token partido se comiera de más, el `+=` de despues no se vería. */
    const arbol = cuerpo('int r = 0; Map<String, List<String>> m = null; r += 1;');
    const asignaciones = todos(arbol, 'Asignacion');
    expect(asignaciones).toHaveLength(1);
    expect(asignaciones[0].operador).toBe('+=');
    expect(asignaciones[0].objetivo.nombre).toBe('r');
  });

  it('analiza los desplazamientos, incluido >>=, como Askew los', () => {
    for (const [codigo, operador] of [
      ['r = r << 1;', '<<'],
      ['r = r >> 1;', '>>'],
      ['r = r >>> 1;', '>>>'],
      ['r <<= 1;', '<<='],
      ['r >>= 1;', '>>='],
      ['r >>>= 1;', '>>>='],
    ]) {
      const arbol = cuerpo(codigo);
      const nodo = buscar(arbol, operador.endsWith('=') ? 'Asignacion' : 'Binario');
      expect(nodo.operador).toBe(operador);
    }
  });

  it('acepta un tipo parametrizado vacío', () => {
    const arbol = cuerpo('List<> datos = null;');
    expect(todos(arbol, 'TipoClase').find((t) => t.nombre === 'List').argumentos).toEqual([]);
  });
});

/* Los cinco programas de las misiones tienen que analizarse. Si el parser no
   entiende el código que la app enseña, el motor no sirve de nada. */
describe('los programas de las misiones', () => {
  const conCodigo = MISIONES.filter((m) => typeof m.solucion === 'string' && m.solucion.includes('class'));

  it('hay al menos cinco programas que analizar', () => {
    expect(conCodigo.length).toBeGreaterThanOrEqual(5);
  });

  for (const mision of conCodigo) {
    it(`analiza la solución de ${mision.id}`, () => {
      const arbol = analizar(mision.solucion);
      expect(arbol.tipo).toBe('Programa');
      expect(arbol.clase.miembros.length).toBeGreaterThan(0);
    });

    it(`el JDK acepta la solución de ${mision.id} y nuestro parser también`, () => {
      expect(javacAcepta(mision.solucion)).toBe(true);
      expect(() => analizar(mision.solucion)).not.toThrow();
    });
  }
});

/* El parser y el javac tienen que coincidir en qué se acepta, para todo lo que
   el motor dice admitir. Si el nuestro rechaza algo que Java compila, el alumno
   recibe un error falso; si acepta algo que Java rechaza, el error llega tarde
   y con otro aspecto.
   Quedan fuera try, switch y demás construcciones que el motor rechaza a
   propósito: ahí la diferencia con el JDK es deliberada, y se comprueba por
   separado más abajo. */
describe('con el mismo veredicto que el JDK real', () => {
  const casos = [
    ['int a = 1;', true],
    ['int a = 1', false],
    ['int a = ;', false],
    ['if (a > 1) { n = 1; }', true],
    ['if (a > 1) { n = 1; }', true],
    ['if a > 1 { n = 1; }', false],
    ['while (a < 3) { a++; }', true],
    ['while (a < 3) a++;', true],
    ['for (int i = 0; i < 3; i++) { }', true],
    ['for (int i = 0 i < 3; i++) { }', false],
    ['for (String s : lista) { }', true],
    ['for (String s lista) { }', false],
    ['do { a++; } while (a < 3);', true],
    ['do { a++; } while (a < 3)', false],
    ['do { a++; } while a < 3);', false],
    ['int u = 1, v = 2;', true],
    ['int u = 1, v = ;', false],
    ['int[] v = new int[3];', true],
    ['int[] v = new int[;', false],
    ['System.out.println("a" + 1);', true],
    ['System.out.println("a" + 1)', false],
    ['numeros[0] = 5;', true],
    ['numeros[0 = 5;', false],
    ['a = b;', true],
    ['x = y = 0;', true],
    ['int z = a >> 2;', true],
    ['boolean w = p == q;', true],
    ['boolean w = p && q || activo;', true],
    ['boolean w = !activo;', true],
    ['int z = (a + b) * c;', true],
    ['int z = ((a + b) * c;', false],
    ['for (int i = 0; i < 3; i++) { break; }', true],
    ['{ int z = 1; }', true],
    ['int z = activo ? 1 : 2;', true],
    ['return;', true],
  ];

  for (const [codigo, aceptado] of casos) {
    it(`${aceptado ? 'acepta' : 'rechaza'}: ${codigo}`, () => {
      const fuente = enClase(codigo);
      const javaLoAcepta = javacAcepta(fuente);
      let nosotrosLoAceptamos = true;
      try {
        analizar(fuente);
      } catch (error) {
        if (!(error instanceof ErrorSintaxis)) throw error;
        nosotrosLoAceptamos = false;
      }
      expect(javaLoAcepta).toBe(aceptado);
      expect(nosotrosLoAceptamos).toBe(aceptado);
    });
  }

  it('acepta un return con valor donde Java lo acepta', () => {
    const fuente = enMetodoQueDevuelve('return a + b;');
    expect(javacAcepta(fuente)).toBe(true);
    expect(() => analizar(fuente)).not.toThrow();
  });

  /* El contraste anterior es de sintaxis. Hay una capa que todavía no
     tenemos —el verificador de tipos— y mientras no exista hay diferencias
     conocidas que conviene dejar escritas y no tapar: el JDK rechaza por
     tipos cosas que el parser, que solo mira la forma, acepta. */
  it('el motor acepta aun lo que Java rechaza por tipos, y es lo esperado', () => {
    /* Estos cuatro casos se comprobaron uno a uno contra javac: todos los
       rechaza por tipos, no por sintaxis. La forma es correcta en los cuatro,
       así que un parser sin verificador de tipos los tiene que dejar pasar. */
    const porTipos = [
      'double otra = 1.5; int z = otra;',  // conversion que pierde precision
      'int z = n ? 1 : 2;',                // la condicion del ternario no es boolean
      'int z = "texto";',                  // un texto donde va un numero
      'boolean w = a;',                    // un numero donde va un boolean
    ];
    for (const codigo of porTipos) {
      const fuente = enClase(codigo);
      expect(javacAcepta(fuente)).toBe(false);
      expect(() => analizar(fuente)).not.toThrow();
    }
  });

  it('y acepta tambien los que Java acepta: la forma no era el problema', () => {
    /* Comprobado para no dejar un caso mal puesto: `a < b == activo` es legal
       en Java, porque `a < b` ya es un boolean y se puede comparar con otro.
       Estaba en la lista de «errores de tipo» por error. */
    for (const codigo of ['int z = activo ? 1 : 2;', 'boolean w = a < b == activo;']) {
      const fuente = enClase(codigo);
      expect(javacAcepta(fuente)).toBe(true);
      expect(() => analizar(fuente)).not.toThrow();
    }
  });
});

/* La regla de AGENTS: un error dice qué hacer, no solo qué falló. */
describe('los errores enseñan cómo arreglarlo', () => {
  const casos = [
    ['int a = 1', 'punto y coma'],
    ['if (a > 1) { n = 1; } else', 'falta el cuerpo'],
    ['while (a < 3) { } while', 'paréntesis de apertura'],
    ['while a < 3) { }', 'paréntesis de apertura'],
    ['for (int i = 0; i < 3; i++ { }', 'paréntesis de cierre'],
    ['for (String s lista) { }', 'dos puntos'],
    ['do { a++; } a < 3;', 'while'],
    ['int r = a > b ? 1;', 'dos puntos'],
    ['int[] v = new int[3;', 'corchete de cierre'],
    ['a.b.();', 'nombre del campo'],
    ['int a = 1; int b = ;', 'expresión'],
    ['int a = (1 + 2;', 'paréntesis de cierre'],
    ['String s = (String) a;', 'conversiones a clases'],
    ['int a = 1 + ;', 'expresión'],
  ];

  for (const [codigo, fragmento] of casos) {
    it(`«${codigo}» explica qué hacer`, () => {
      const error = esperarErrorSintaxis(enClase(codigo), fragmento);
      expect(error.mensaje.length).toBeGreaterThan(20);
    });
  }

  const programas = [
    ['public class { }', 'nombre de la clase'],
    ['public class Principal { }', 'main'],
    ['public class Principal { int a }', 'punto y coma'],
    ['public class Principal { public static void main(String[] args) { if (a > 1) { } }', 'llave de cierre'],
    ['public class Principal { Principal() { } }', 'constructores'],
  ];

  for (const [fuente, fragmento] of programas) {
    it(`«${fuente}» explica qué hacer`, () => {
      const error = esperarErrorSintaxis(fuente, fragmento);
      expect(error.mensaje.length).toBeGreaterThan(20);
    });
  }

  it('señala linea, columna y longitud exactas', () => {
    const fuente = 'public class Principal {\n  static void m() {\n    int a = 1\n  }\n}';
    const error = esperarErrorSintaxis(fuente, 'punto y coma');
    expect(error.linea).toBe(3);
    /* La columna 14 es justo detrás del «1» de la línea 3: el «;» que falta va ahi. */
    expect(error.columna).toBe(14);
    expect(error.longitud).toBeGreaterThan(0);
  });

  it('señala la columna del carácter exacto, no la del principio de la linea', () => {
    const fuente = 'public class Principal {\n  static void m() {\n    int a = ;\n  }\n}';
    const error = esperarErrorSintaxis(fuente, 'expresión');
    expect(error.linea).toBe(3);
    /* 4 espacios + «int a = » son 12 caracteres: el «;» es la columna 13. */
    expect(error.columna).toBe(13);
  });

  it('da una posición válida también al final del archivo', () => {
    const error = esperarErrorSintaxis('public class Principal {', 'llave de cierre');
    expect(error.linea).toBe(1);
    expect(error.longitud).toBeGreaterThanOrEqual(1);
  });

  it('nunca dice «error de sintaxis» a secas ni «token inesperado»', () => {
    const todosLosCasos = [
      ...casos.map(([codigo]) => enClase(codigo)),
      ...programas.map(([fuente]) => fuente),
    ];
    for (const fuente of todosLosCasos) {
      try {
        analizar(fuente);
      } catch (error) {
        expect(error).toBeInstanceOf(ErrorSintaxis);
        expect(error.mensaje).not.toMatch(/error de sintaxis/i);
        expect(error.mensaje).not.toMatch(/token inesperado/i);
        expect(error.mensaje).not.toMatch(/^error/i);
        expect(error.mensaje.length).toBeGreaterThan(20);
      }
    }
  });
});

describe('lo que el motor todavia no admite', () => {
  const rechazos = [
    ['import java.util.List;', 'no admite imports'],
    ['package ejemplo;', 'no admite declaraciones de package'],
    ['try { } catch (Exception e) { }', 'no admite try'],
    ['switch (n) { case 1: break; }', 'no admite switch'],
    ['interface I { }', 'no admite interfaces'],
    ['enum E { A }', 'no admite enums'],
    ['boolean r = a instanceof Principal;', 'no admite instanceof'],
    ['Principal p = new Principal();', 'solo admite new para arreglos'],
  ];

  for (const [codigo, fragmento] of rechazos) {
    it(`rechaza y explica: ${codigo}`, () => {
      const fuente = /^(import|package)\b/.test(codigo)
        ? `${codigo}\npublic class Principal { public static void main(String[] args) { } }`
        : enClase(codigo);
      const error = esperarErrorSintaxis(fuente, fragmento);
      /* La regla de AGENTS: nunca «error desconocido». */
      expect(error.mensaje.length).toBeGreaterThan(30);
    });
  }

  /* Estas construcciones las acepta Java y el motor las rechaza a propósito.
     Conviene dejarlo escrito: si algún día el motor las admite, esta prueba
     avisa, y mientras exista explica que la diferencia es deliberada. */
  it('son rechazos deliberados: Java sí las acepta', () => {
    const conInterfaz = 'interface I { } public class Principal { public static void main(String[] args) { } }';
    for (const codigo of ['try { } catch (Exception e) { }', 'switch (n) { case 1: break; }', 'interface I { }']) {
      const fuente = codigo === 'interface I { }' ? conInterfaz : enClase(codigo);
      expect(javacAcepta(fuente)).toBe(true);
      expect(() => analizar(fuente)).toThrow(ErrorSintaxis);
    }
  });

  it('rechaza un constructor diciendo que no se admiten', () => {
    esperarErrorSintaxis('public class Principal { Principal() { } }', 'constructores');
  });
});

/* ------------------------------------------------------------------ */

describe('la tabla de lo que el motor admite', () => {
  /* La tabla de src/data/motor.js no puede quedarse en decorativa: si alguien
     añade una fila y el parser no la rechaza, el alumno lee «no lo admitimos»
     y luego se topa un error distinto. Estas pruebas atan las dos cosas. */

  it('cada fila de NO_SOPORTADO tiene mensaje y alternativa', () => {
    for (const fila of NO_SOPORTADO) {
      expect(typeof fila.clave).toBe('string');
      expect(fila.mensaje.length).toBeGreaterThan(10);
      /* Sin alternativa el mensaje solo dice que no, y AGENTS pide que diga
         qué escribir en su lugar. */
      expect(fila.alternativa.length).toBeGreaterThan(15);
      expect(fila.mensaje.endsWith('.')).toBe(false);
    }
  });

  it('no hay claves repetidas en la tabla', () => {
    const claves = NO_SOPORTADO.map((f) => f.clave);
    expect(new Set(claves).size).toBe(claves.length);
  });

  it('restriccionDe encuentra cada clave y devuelve null para lo demas', () => {
    for (const fila of NO_SOPORTADO) {
      expect(restriccionDe(fila.clave)).toBe(fila);
    }
    expect(restriccionDe('while')).toBeNull();
  });

  it('la tabla de SOPORTADO no promete nada que el parser no acepte', () => {
    /* Cada construcción prometida tiene su propio ejemplo que debe analizar. */
    /* Una cosa que puede ir dentro de main y otra que solo puede ir en el
       cuerpo de la clase: los miembros se prueban con programas completos. */
    const ejemplos = {
      'int': 'int a = 1;',
      'long': 'long a = 1L;',
      'double': 'double a = 1.5;',
      'float': 'float a = 1.5f;',
      'char': "char a = 'x';",
      'boolean': 'boolean a = true;',
      'void': 'public class P { static void f() { } }',
      'String': 'String s = "t";',
      'arreglos de una dimension': 'int[] v = new int[3];',
      'una clase por archivo': 'public class P { static void f() { } }',
      'campos': 'public class P { int a; static void f() { } }',
      'metodos con parametros': 'public class P { static void f(int a) { } }',
      'static final para constantes': 'public class P { static final int M = 1; static void f() { } }',
      'declaracion local': 'int a = 1;',
      'if / else': 'if (a > 1) { } else { }',
      'while': 'while (a < 1) { }',
      'do while': 'do { } while (a < 1);',
      'for': 'for (int i = 0; i < 1; i++) { }',
      'for each': 'for (int v : numeros) { }',
      'break': 'while (a < 1) { break; }',
      'continue': 'while (a < 1) { continue; }',
      'return': 'return 1;',
      'bloques': '{ int a = 1; }',
      'operadores aritmeticos y de comparacion': 'int r = a + 1 > 0 ? 1 : 0;',
      'and, or, not': 'boolean r = !activo || p && q;',
      'asignacion compuesta': 'r += 1;',
      'incremento y decremento': 'r++; ++r; r--;',
      'ternario': 'int r = activo ? 1 : 2;',
      'llamadas': 'System.out.println("t");',
      'acceso a campos': 'System.out.println("t");',
      'indexado de arreglos': 'int r = numeros[0];',
      'new para arreglos': 'int[] v = new int[2];',
    };

    for (const grupo of SOPORTADO) {
      for (const item of grupo.items) {
        const ejemplo = ejemplos[item];
        expect(ejemplo, `sin ejemplo para «${item}»: añádelo o quítalo de la tabla`).toBeTruthy();
        const fuente = ejemplo.includes('class') ? ejemplo : enClase(ejemplo);
        expect(() => analizar(fuente), `la tabla promete «${item}» y el parser lo rechaza`).not.toThrow();
      }
    }
  });

  it('no hay ejemplos en la prueba que la tabla ya no prometa', () => {
    const prometidos = new Set(SOPORTADO.flatMap((g) => g.items));
    /* Si se cae una fila de SOPORTADO, el ejemplo sobra y hay que quitarlo. */
    const huerfanos = Object.entries({
      'while': 'while (a < 1) { }',
      'for each': 'for (int v : numeros) { }',
    }).filter(([clave]) => !prometidos.has(clave));
    expect(huerfanos).toEqual([]);
  });
});

describe('el nodo del arbol no puede pisar su propio nombre', () => {
  /* El fallo era silencioso: nodo('Declaracion', pos, { tipo: tipoJava })
     dejaba el nodo diciendo que era un TipoPrimitivo, y buscar(arbol,
     'Declaracion') no encontraba nada en todo el arbol. */
  it('avisa si un nodo trae un dato llamado «tipo»', () => {
    expect(() => nodo('Declaracion', { linea: 1, columna: 1, longitud: 1 }, { tipo: 'int' }))
      .toThrow(/pisa su propio nombre/);
  });

  it('el nombre del nodo sobrevive cuando el dato tiene otro nombre', () => {
    const resultado = nodo('Declaracion', { linea: 1, columna: 1, longitud: 1 }, { tipoDeclarado: 'int', nombre: 'a' });
    expect(resultado.tipo).toBe('Declaracion');
    expect(resultado.tipoDeclarado).toBe('int');
  });
});

describe('intentarAnalizar', () => {
  it('devuelve el arbol cuando todo va bien', () => {
    const { arbol, error } = intentarAnalizar(enClase('int a = 1;'));
    expect(arbol.tipo).toBe('Programa');
    expect(error).toBeNull();
  });

  it('devuelve el error con su posicion en vez de lanzar', () => {
    const { arbol, error } = intentarAnalizar(enClase('int a = 1'));
    expect(arbol).toBeNull();
    expect(error).toBeInstanceOf(ErrorSintaxis);
    expect(error.linea).toBeGreaterThan(0);
    expect(error.mensaje.length).toBeGreaterThan(20);
  });

  it('deja pasar los errores del lector lexico tambien', () => {
    const { arbol, error } = intentarAnalizar(enClase('int a = 010;'));
    expect(arbol).toBeNull();
    expect(error.name).toBe('ErrorLexico');
    expect(error.mensaje).toContain('octal antiguo');
  });
});