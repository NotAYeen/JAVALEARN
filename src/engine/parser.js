import { ErrorSintaxis } from './errores.js';
import { leerTokens } from './lexer.js';
import { TIPO, TIPOS_PRIMITIVOS } from './tokens.js';
import { restriccionDe } from '../data/motor.js';
import * as A from './ast.js';

/**
 * Analizador sintactico descendente recursivo.
 *
 * Traduce una lista de tokens en un arbol de sintaxis abstracta, o lanza un
 * ErrorSintaxis con linea, columna y longitud. Nunca devuelve medio arbol: si
 * algo no cuadra, avisa de la primera cosa que no cuadro.
 *
 * ## Precedencia
 *
 * Se sigue la de Java, que no es la de JavaScript. Por ejemplo `1 + 2 * 3`
 * vale 7 en los dos, pero `a < b == c` en Java es `(a < b) == c` porque `<`
 * liga mas fuerte que `==`, mientras que en JavaScript seria `a < (b == c)`.
 * Un motor que copiase la precedencia de JavaScript darieria resultados
 * equivocados justo donde el alumno esta aprendiendo a distinguir unos de
 * otros. De ahi la tabla explicita de abajo en vez de un bucle generico.
 *
 * | Nivel | Operadores | Asocia a la |
 * |-------|------------|-------------|
 * | 1 | `=`, `+=`, `-=`, `*=`, `/=`, `%=` | derecha |
 * | 2 | `?:` | derecha |
 * | 3 | `||` | izquierda |
 * | 4 | `&&` | izquierda |
 * | 5 | `|` | izquierda |
 * | 6 | `^` | izquierda |
 * | 7 | `&` | izquierda |
 * | 8 | `==`, `!=` | izquierda |
 * | 9 | `<`, `>`, `<=`, `>=`, `instanceof` | izquierda |
 * | 10 | `<<`, `>>`, `>>>` | izquierda |
 * | 11 | `+`, `-` | izquierda |
 * | 12 | `*`, `/`, `%` | izquierda |
 */

/** Un nivel de la tabla de precedencia. */
const NIVEL = {
  IGUALDAD: ['==', '!='],
  COMPARACION: ['<', '>', '<=', '>='],
  DESPLAZAMIENTO: ['<<', '>>', '>>>'],
  SUMA: ['+', '-'],
  PRODUCTO: ['*', '/', '%'],
  LOGICO_AND: ['&&'],
  LOGICO_OR: ['||'],
  BIT_AND: ['&'],
  BIT_OR: ['|'],
  BIT_XOR: ['^'],
  ASIGNACION: ['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=', '>>>='],
};

/** Los niveles, del mas flojo al mas fuerte. El orden de esta tabla es la precedencia. */
const CADENA_NIVELES = [
  [NIVEL.LOGICO_OR],
  [NIVEL.LOGICO_AND],
  [NIVEL.BIT_OR],
  [NIVEL.BIT_XOR],
  [NIVEL.BIT_AND],
  [NIVEL.IGUALDAD],
  [NIVEL.COMPARACION, 'instanceof'],
  [NIVEL.DESPLAZAMIENTO],
  [NIVEL.SUMA],
  [NIVEL.PRODUCTO],
];

/** Modificadores que se aceptan antes de un campo, metodo o clase. */
const MODIFICADORES = new Set(['public', 'private', 'protected', 'static', 'final']);

/**
 * Palabras clave que abren algo que el motor reconoce pero todavia no
 * implementa. Sejectedan aqui para poder dar el mensaje de la tabla central
 * en vez de un "se esperaba una expresión".
 */
const PALABRAS_FUERA = new Set([
  'interface', 'enum', 'try', 'switch', 'throw', 'abstract', 'synchronized',
  'native', 'transient', 'volatile', 'strictfp', 'implements', 'extends', 'super',
  'instanceof',
]);

/** Que se imprimen cuando un error los nombra, para no soltar comillas raras. */
function bonito(token) {
  if (token.tipo === TIPO.FIN) return 'el final del archivo';
  return `«${token.texto}»`;
}

export class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.i = 0;
  }

  /* --------------------------- utilidades --------------------------- */

  /** Token en el desplazamiento dado (0 = el que toca). */
  mira(n = 0) {
    const j = Math.max(0, Math.min(this.i + n, this.tokens.length - 1));
    return this.tokens[j];
  }

  actual() {
    return this.mira(0);
  }

  /** Valor del token actual si es un separador con ese texto. */
  esSeparador(texto, n = 0) {
    const t = this.mira(n);
    return t.tipo === TIPO.SEPARADOR && t.texto === texto;
  }

  /** Valor del token actual si es un operador con ese texto. */
  esOperador(texto, n = 0) {
    const t = this.mira(n);
    return t.tipo === TIPO.OPERADOR && t.texto === texto;
  }

  /** Valor del token actual si es una palabra clave con ese texto. */
  esPalabra(texto, n = 0) {
    const t = this.mira(n);
    return t.tipo === TIPO.PALABRA_CLAVE && t.valor === texto;
  }

  /** El token actual es un identificador con ese nombre. */
  esNombre(nombre, n = 0) {
    const t = this.mira(n);
    return t.tipo === TIPO.IDENTIFICADOR && t.valor === nombre;
  }

  siguiente() {
    const t = this.actual();
    if (t.tipo !== TIPO.FIN) this.i += 1;
    return t;
  }

  /**
   * Exige un token concreto y se lo come. Si no está, lanza un error que
   * nombra lo que esperaba y lo que encontró, con una salida cuando la hay.
   *
   * @param {string} descripcion  Que se esperaba, en palabras: 'un identificador'.
   * @param {object} [opciones]   { cumple, pista, ancla } para afinar el mensaje.
   */
  exige(que, opciones = {}) {
    const t = this.actual();
    if (opciones.cumple?.(t)) {
      return this.siguiente();
    }

    /* `ancla: 'anterior'` señala el error al final de lo último que sí estaba
       bien, no al principio de lo que viene. Cuando falta un «;», el sitio
       útil es justo detrás de la última palabra escrita: señalar el «}» de la
       línea siguiente manda al alumno a una línea donde no hay nada que
       arreglar. */
    if (opciones.ancla === 'anterior' && this.i > 0) {
      const previo = this.tokens[this.i - 1];
      throw new ErrorSintaxis(
        `falta ${que.replace(/^un\s+/, 'un ').replace(/^una\s+/, 'una ')} al final de la línea ${previo.linea}. ${opciones.pista ?? ''}`.trim(),
        {
          linea: previo.linea,
          columna: previo.columna + previo.longitud,
          longitud: 1,
          codigo: 'sintaxis',
          ayuda: opciones.pista ?? null,
        },
      );
    }

    const encontrado = bonito(t);
    const pista = opciones.pista ? ` ${opciones.pista}` : '';
    this.falla(
      t,
      `se esperaba ${que} y encontré ${encontrado}.${pista}`,
      opciones.ayuda,
    );
    return null;
  }

  /** Igual que exige, pero sin comerse nada: solo mira. */
  miraExigiendo(que, opciones = {}) {
    return opciones.cumple?.(this.actual()) ?? false;
  }

  /** Lanza un ErrorSintaxis señorando el token dado. */
  falla(token, mensaje, ayuda) {
    throw new ErrorSintaxis(mensaje, {
      linea: token.linea,
      columna: token.columna,
      longitud: Math.max(1, token.longitud || 1),
      codigo: 'sintaxis',
      ayuda: ayuda ?? null,
    });
  }

  /**
   * Si el token actual es una palabra clave que el motor no implementa todavia,
   * lanza el error de la tabla central. Si no es palabra clave, no hace nada.
   *
   * El mensaje sale de `src/data/motor.js`, la misma tabla que la interfaz
   * muestra: si aqui se dice que no hay try, alli tambien.
   */
  rechazaPalabra() {
    const t = this.actual();
    if (t.tipo !== TIPO.PALABRA_CLAVE) return;

    const regla = restriccionDe(t.valor);
    if (regla) {
      this.falla(t, `${regla.mensaje}. ${regla.alternativa}`, `Quita «${t.texto}» y prueba otra vez.`);
    }

    if (PALABRAS_FUERA.has(t.valor)) {
      this.falla(
        t,
        `«${t.texto}» todavía no forma parte del subconjuesto que entiende JavaLearn.`,
        `Quita «${t.texto}» o revisa la lista de lo que sí admite el motor.`,
      );
    }
  }

  /* ----------------------------- programa --------------------------- */

  /**
   * Punto de entrada: un unico archivo con una unica clase publica.
   */
  analizar() {
    this.rechazaPalabra();

    // Se admiten modificadores de clase antes de `class`.
    const modificadores = this.modificadores();
    const inicioClase = this.actual();
    this.exige('la palabra clave «class»', {
      cumple: (t) => t.tipo === TIPO.PALABRA_CLAVE && t.valor === 'class',
      pista: 'Un programa de JavaLearn empieza así: public class Principal { ... }',
    });

    const nombreClase = this.exige('el nombre de la clase', {
      cumple: (t) => t.tipo === TIPO.IDENTIFICADOR,
      pista: 'Después de «class» va un nombre que empiece por mayúscula, como Principal.',
    });

    const miembros = this.cuerpoClase();

    /* Sin esta comprobación, lo que venga detrás de la clase —incluidas llaves
       sobrantes— se ignora en silencio y el alumno recibe un programa que
       compila aquí y no compila en Java. */
    if (this.actual().tipo !== TIPO.FIN) {
      this.falla(
        this.actual(),
        `la clase se cerró antes de tiempo y encontré ${bonito(this.actual())} de más.`,
        `En Java cada «{» que abres tiene su «}» revisado: revisa que no falte ninguna llave en ${nombreClase.valor}.`,
      );
    }

    const fin = this.tokens[this.tokens.length - 1];

    return A.programa(
      A.clase(
        nombreClase.valor,
        modificadores,
        miembros,
        A.posEntre(inicioClase, this.mira(-1)),
      ),
      A.posEntre(inicioClase, fin),
    );
  }

  /** Miembros de la clase hasta la llave final. */
  cuerpoClase() {
    this.exige('una llave de apertura «{» para empezar el cuerpo de la clase', {
      cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === '{',
      pista: 'Sin la llave, Java no sabe dónde acaba la clase.',
    });

    const miembros = [];
    while (!this.esSeparador('}') && this.actual().tipo !== TIPO.FIN) {
      miembros.push(this.miembro());
    }

    this.exige('la llave de cierre «}» de la clase', {
      cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === '}',
      pista: 'Cada «{» que abres necesita su «}».',
      ancla: 'anterior',
    });

    if (miembros.length === 0) {
      this.falla(
        this.tokens[this.tokens.length - 1],
        'la clase está vacía: al menos necesita el método main.',
        'Añade public static void main(String[] args) { ... }',
      );
    }
    return miembros;
  }

  /** Lee los modificadores de clase, campo o metodo. */
  modificadores() {
    const lista = [];
    for (;;) {
      const t = this.actual();
      if (t.tipo === TIPO.PALABRA_CLAVE && MODIFICADORES.has(t.valor)) {
        lista.push(t.valor);
        this.siguiente();
        continue;
      }
      return lista;
    }
  }

  /** Un miembro de la clase: un campo o un metodo. */
  miembro() {
    this.rechazaPalabra();

    const inicio = this.actual();
    const modificadores = this.modificadores();

    /* Constructores: el nombre de la clase seguido de «(». No forman parte del
       subconjunto, y el mensaje lo dice claro. */
    if (this.actual().tipo === TIPO.IDENTIFICADOR && this.esSeparador('(', 1)) {
      this.falla(
        this.actual(),
        'JavaLearn todavía no admite constructores.',
        'Declara los valores de los campos en el punto donde los uses, sin public Nombre(...).',
      );
    }

    const tipo = this.tipo();

    if (this.actual().tipo === TIPO.IDENTIFICADOR && this.esSeparador('(', 1)) {
      return this.metodo(modificadores, tipo, inicio);
    }
    return this.campo(modificadores, tipo, inicio);
  }

  /**
   * Declaracion de campo: `static final int MAXIMO = 10;`
   *
   * Lleva inicializador opcional y admite varias variables separadas por
   * comas, igual que una local. Se guardan en un `Campo` por cada nombre para
   * que el verificador de tipos vea siempre la misma forma.
   */
  campo(modificadores, tipo, inicio) {
    const nombres = [];
    do {
      const nombre = this.exige('el nombre del campo', {
        cumple: (t) => t.tipo === TIPO.IDENTIFICADOR,
        pista: 'Después del tipo va un nombre, como contador.',
      });
      let inicializador = null;
      if (this.esOperador('=')) {
        this.siguiente();
        inicializador = this.expresion();
      }
      nombres.push({ nombre: nombre.valor, inicializador, pos: A.posDe(nombre) });
    } while (this.coma());

    this.exige('un punto y coma «;» después del campo', {
      cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === ';',
      pista: 'Las declaraciones de campo se terminan siempre con «;».',
      ancla: 'anterior',
    });

    const pos = A.posEntre(inicio, this.mira(-1));
    const [primero, ...resto] = nombres;
    return A.campo(modificadores, tipo, primero.nombre, pos, primero.inicializador, resto.length ? resto : null);
  }

  /** Declaracion de metodo, incluido su cuerpo entre llaves. */
  metodo(modificadores, tipoRetorno, inicio) {
    const nombre = this.exige('el nombre del método', {
      cumple: (t) => t.tipo === TIPO.IDENTIFICADOR,
      pista: 'Un método se nombra y se le pasan parámetros: saludar(String nombre).',
    });

    this.exige('un paréntesis de apertura «(» para los parámetros', {
      cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === '(',
      pista: 'Incluso sin parámetros hay que escribir los paréntesis: main().',
    });

    const parametros = [];
    if (!this.esSeparador(')')) {
      do {
        const inicioParam = this.actual();
        const tipoParam = this.tipo();
        const nombreParam = this.exige('el nombre del parámetro', {
          cumple: (t) => t.tipo === TIPO.IDENTIFICADOR,
          pista: `El parámetro va con su tipo: ${tipoTexto(tipoParam)} nombre.`,
        });
        parametros.push(A.parametro(tipoParam, nombreParam.valor, A.posDe(inicioParam)));
      } while (this.coma());
    }

    this.exige('un paréntesis de cierre «)»', {
      cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === ')',
      pista: 'Faltaba cerrar la lista de parámetros.',
    });

    this.exige('una llave de apertura «{» para el cuerpo del método', {
      cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === '{',
      pista: 'Un método tiene siempre un cuerpo entre llaves. Sin llaves, esto parece un campo.',
    });

    const cuerpo = this.bloqueHasta('}');
    this.exige('una llave de cierre «}» del cuerpo del método', {
      cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === '}',
      pista: `Abriste el cuerpo de ${nombre.valor} con «{» y falta cerrarlo.`,
    });

    return A.metodo(
      modificadores,
      tipoRetorno,
      nombre.valor,
      parametros,
      cuerpo,
      A.posEntre(inicio, this.mira(-1)),
    );
  }

  /* ------------------------------ tipos ----------------------------- */

  /**
   * Un tipo: primitivo, de clase, o arreglo de cualquiera de los dos.
   * Acepta tambien genericos: Map<String, List<Integer>>, partiendo el «>>»
   * que el lector emite como un solo token.
   */
  tipo() {
    const base = this.tipoBase();

    /* Arreglos: uno o varios pares de corchetes, como en int[] o int[][]. */
    let dimensiones = 0;
    while (this.esSeparador('[') && this.esSeparador(']', 1)) {
      this.siguiente();
      this.siguiente();
      dimensiones += 1;
    }

    let resultado = base;
    for (let k = 0; k < dimensiones; k += 1) {
      resultado = A.tipoArreglo(resultado, A.posDe(base));
    }
    return resultado;
  }

  /**
   * Solo el nombre del tipo, sin los corchetes de arreglo.
   *
   * Lo separa `tipo()` porque `new int[3]` necesita el nombre `int` y luego
   * interpretar los corchetes él mismo como dimensiones o como contenido. Si
   * `tipo()` se los comiera, en `new String[] {"a"}` no quedaría ningún `[`
   * donde mirar y saltaría el error de «solo se admite new para arreglos».
   */
  tipoBase() {
    this.rechazaPalabra();

    const t = this.actual();

    if (t.tipo === TIPO.PALABRA_CLAVE && TIPOS_PRIMITIVOS.has(t.valor)) {
      this.siguiente();
      return A.tipoPrimitivo(t.valor, A.posDe(t));
    }
    if (t.tipo === TIPO.IDENTIFICADOR) {
      this.siguiente();
      return A.tipoClase(t.valor, this.argumentosTipo(), A.posDe(t));
    }

    this.falla(
      t,
      `esperaba un tipo (int, double, char, boolean, String...) y encontré ${bonito(t)}.`,
      'Declara el tipo antes del nombre: int contador;',
    );
    return null;
  }

  /**
   * Argumentos de tipo entre parentesis angulares: <String, Integer>.
   *
   * El lector emite «>>» como un operador, porque en el resto de Java es un
   * desplazamiento a la derecha. Aqui, dentro de «List<List<String>>», cada
   * «>» cierra un nivel. Se parte el token en dos, con la mitad izquierda
   * consumida y la derecha devuelta a la corriente.
   */
  argumentosTipo() {
    if (!this.esOperador('<')) return null;

    this.siguiente();
    const argumentos = [];
    if (this.esOperador('>')) {
      this.siguiente();
      return argumentos;
    }

    do {
      this.rechazaPalabra();
      argumentos.push(this.tipo());
    } while (this.coma());

    this.cierraGenerico();
    return argumentos;
  }

  /**
   * Consume el «>» que cierra una lista de argumentos de tipo.
   *
   * Puede venir solo, o ser la mitad izquierda de «>>», «>>>», «>=» o «>>=».
   * En los tres últimos casos se parte el token: se queda con la mitad que
   * corresponde al «>» y devuelve la otra al cursor para el que viene detrás.
   */
  cierraGenerico() {
    const t = this.actual();

    if (t.tipo === TIPO.OPERADOR && t.texto === '>') {
      this.siguiente();
      return;
    }

    /* Al cerrar el nivel mas interno de List<List<String>>, el token pendiente
       es «>>»: nos comemos un «>» y el otro lo vuelve a mirar el analisis de
       la expresion que siga. */
    if (t.tipo === TIPO.OPERADOR && (t.texto === '>>' || t.texto === '>>>' || t.texto === '>>=' || t.texto === '>>>=')) {
      const sobra = t.texto.slice(1);
      this.tokens[this.i] = {
        ...t,
        valor: sobra,
        texto: sobra,
        columna: t.columna + 1,
        longitud: sobra.length,
        indice: t.indice + 1,
      };
      return;
    }

    if (t.tipo === TIPO.OPERADOR && t.texto === '>=') {
      this.tokens[this.i] = { ...t, valor: '=', texto: '=', columna: t.columna + 1, longitud: 1, indice: t.indice + 1 };
      return;
    }

    this.falla(
      t,
      `falta el «>» que cierra la lista de tipos genéricos y encontré ${bonito(t)}.`,
      'Los genéricos se escriben entre «<» y «>», como List<String>.',
    );
  }

  /** Consume una coma si la hay. Devuelve si la había. */
  coma() {
    if (this.esSeparador(',')) {
      this.siguiente();
      return true;
    }
    return false;
  }

  /* --------------------------- instrucciones ------------------------- */

  /**
   * Instrucciones de un bloque, hasta la llave de cierre (sin comerse la llave).
   */
  bloqueHasta(cierre) {
    const inicio = this.actual();
    const instrucciones = [];

    while (!this.esSeparador(cierre) && this.actual().tipo !== TIPO.FIN) {
      instrucciones.push(this.instruccion());
    }

    return A.bloque(instrucciones, A.posDe(inicio));
  }

  /** Una instrucción. Decide cuál es mirando la primera palabra. */
  instruccion() {
    const t = this.actual();

    /* Llegar aquí con una llave de cierre significa que la instrucción
       anterior se quedó sin cuerpo. Es un error de principiante muy común y
       merece un mensaje propio: sin esto saltaría «esperaba una expresión». */
    if (t.tipo === TIPO.SEPARADOR && t.texto === '}') {
      this.falla(
        t,
        'falta el cuerpo de la instrucción anterior: llegó un «}» sin nada que ejecutar.',
        `Revisa la línea ${t.linea - 1}: un if, while o for necesita su bloque con llaves.`,
      );
    }

    if (t.tipo === TIPO.PALABRA_CLAVE && t.valor === 'else') {
      this.falla(
        t,
        '«else» no tiene un if delante: solo puede ir después de la llave de cierre de un if.',
        'Un if con alternativa se escribe así: if (condicion) { ... } else { ... }',
      );
    }

    if (t.tipo === TIPO.SEPARADOR && t.texto === '{') {
      this.siguiente();
      const bloque = this.bloqueHasta('}');
      this.exige('la llave de cierre «}» del bloque', {
        cumple: (x) => x.tipo === TIPO.SEPARADOR && x.texto === '}',
        pista: 'Abriste un bloque con «{» y hay que cerrarlo.',
      });
      return bloque;
    }

    if (t.tipo === TIPO.SEPARADOR && t.texto === ';') {
      this.siguiente();
      return A.nodo('Vacio', A.posDe(t));
    }

    /* Las palabras que abren una instrucción en particular se comprueban antes
       que la declaración local, porque `int` al principio de una línea puede ser
       un tipo pero `if` nunca lo es. */
    switch (t.valor) {
      case 'if':
        return this.instruccionSi();
      case 'while':
        return this.instruccionMientras();
      case 'do':
        return this.instruccionHacer();
      case 'for':
        return this.instruccionPara();
      case 'return':
        return this.instruccionDevolver();
      case 'break':
        return this.instruccionRomper();
      case 'continue':
        return this.instruccionContinuar();
      default:
        break;
    }

    this.rechazaPalabra();

    /* ¿Declaración local o expresión? Si detrás del nombre no hay un «=» que
       no sea comparación, ni una «(», ni un «[», es una declaración. */
    if (this.puedeSerDeclaracion()) return this.declaracionLocal();
    return this.instruccionExpresion();
  }

  /**
   * Si en la posición k hay una lista de argumentos de tipo, devuelve el índice
   * del primer token que ya no es de esa lista; si no la hay, devuelve k.
   *
   * Hace falta para mirar «qué viene detrás de un tipo» sin analizarlo: en
   * `Map<String, List<Integer>> m = null;`, detrás de `Map` no viene un nombre
   * sino un `<`, y sin saltar los genéricos no se ve que lo que sigue es una
   * declaración.
   *
   * Cuenta los `<` y los `>` teniendo en cuenta que `>>` y `>>>` cierran dos y
   * tres niveles a la vez, igual que hace argumentsTipo().
   */
  saltaGenericos(k) {
    if (!(this.mira(k).tipo === TIPO.OPERADOR && this.mira(k).texto === '<')) return k;

    let nivel = 0;
    for (let j = k; j < k + 200; j += 1) {
      const t = this.mira(j);
      if (t.tipo === TIPO.FIN) return j;

      if (t.tipo === TIPO.OPERADOR) {
        if (t.texto === '<') nivel += 1;
        else if (t.texto === '>') nivel -= 1;
        else if (t.texto === '>>') nivel -= 2;
        else if (t.texto === '>>>') nivel -= 3;
        else if (t.texto === '>=') nivel -= 1;
        else if (t.texto === '>>=') nivel -= 2;
        else if (t.texto === '>>>=') nivel -= 3;
      }
      if (nivel <= 0) return j + 1;
    }
    return k;
  }

  /**
   * Mira si lo que viene es una declaración de variable.
   *
   * Detecta el caso raro pero real de una variable llamada igual que un tipo:
   * `int int = 1;` compila en Java. Por eso no basta con mirar el token actual.
   * También mira más allá de unos genéricos, porque `Map<String, Integer> m =`
   * empieza igual que una llamada.
   */
  puedeSerDeclaracion() {
    const t = this.actual();
    const esTipo = (t.tipo === TIPO.PALABRA_CLAVE && TIPOS_PRIMITIVOS.has(t.valor)) || t.tipo === TIPO.IDENTIFICADOR;
    if (!esTipo) return false;

    /* Un tipo primitivo abre siempre una declaración. */
    if (t.tipo === TIPO.PALABRA_CLAVE) return true;

    /* Tras el nombre del tipo, saltando sus genéricos y sus corchetes, tiene
       que venir otro nombre: eso ya no puede ser una llamada. Sin esto,
       `String[] t` parecía una expresión. */
    let k = this.saltaGenericos(1);
    while (this.esSeparador('[', k) && this.esSeparador(']', k + 1)) k += 2;
    if (this.mira(k).tipo !== TIPO.IDENTIFICADOR) return false;

    const s1 = this.mira(k);
    const s2 = this.mira(k + 1);

    if (s2.tipo === TIPO.SEPARADOR && ['=', ';', ','].includes(s2.texto)) return true;
    if (s2.tipo === TIPO.OPERADOR && ['=', '+=', '-=', '*=', '/=', '%='].includes(s2.valor)) return true;
    return false;
  }

  /** `int contador = 5;`, `String[] nombres;`, `final int MAX = 3;` */
  declaracionLocal() {
    this.rechazaPalabra();
    const inicio = this.actual();

    /* «final» es un modificador valido aqui, aunque el parser lo ignore. */
    this.modificadores();
    const tipo = this.tipo();

    const nombres = [];
    do {
      const nombre = this.exige('el nombre de la variable', {
        cumple: (t) => t.tipo === TIPO.IDENTIFICADOR,
        pista: 'Después del tipo va el nombre de la variable.',
      });
      let inicializador = null;
      if (this.esOperador('=')) {
        this.siguiente();
        inicializador = this.expresion();
      }
      nombres.push({ nombre: nombre.valor, inicializador, pos: A.posDe(nombre) });
    } while (this.coma());

    this.exige('un punto y coma «;» al final de la declaración', {
      cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === ';',
      pista: 'Falta el «;» que cierra la declaración.',
      ancla: 'anterior',
    });

    /* Varias variables en una línea, como int a = 1, b = 2;, se guardan en un
       bloque para que el resto del motor vea siempre una lista de declaraciones. */
    if (nombres.length === 1) {
      const unica = nombres[0];
      return A.declaracion(tipo, unica.nombre, unica.inicializador, A.posEntre(inicio, this.mira(-1)));
    }
    return A.declaracionesMultiples(
      tipo,
      nombres.map((v) => ({ nombre: v.nombre, inicializador: v.inicializador, pos: v.pos })),
      A.posEntre(inicio, this.mira(-1)),
    );
  }

  /** Una instrucción que es una expresión: normalmente una llamada o una asignación. */
  instruccionExpresion() {
    const inicio = this.actual();
    const operacion = this.expresion();

    this.exige('un punto y coma «;» al final de la instrucción', {
      cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === ';',
      pista: 'Las llamadas como println(...) se terminan con «;».',
      ancla: 'anterior',
    });

    return A.expresion(operacion, A.posEntre(inicio, this.mira(-1)));
  }

  /** if / else. El «else» se come solo si está pegado a la llave de cierre. */
  instruccionSi() {
    const inicio = this.siguiente(); // «if»

    this.exige('un paréntesis de apertura «(» para la condición', {
      cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === '(',
      pista: 'El if se escribe if (condición) { ... }.',
    });
    const condicion = this.expresion();
    this.exige('un paréntesis de cierre «)»', {
      cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === ')',
      pista: 'Faltaba cerrar la condición.',
    });

    const entonces = this.cuerpoDeInstruccion();
    let otro = null;
    if (this.esPalabra('else')) {
      this.siguiente();
      otro = this.cuerpoDeInstruccion();
    }

    return A.si(condicion, entonces, otro, A.posDe(inicio));
  }

  /** while */
  instruccionMientras() {
    const inicio = this.siguiente(); // «while»

    this.exige('un paréntesis de apertura «(» para la condición', {
      cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === '(',
      pista: 'El while se escribe while (condición) { ... }.',
    });
    const condicion = this.expresion();
    this.exige('un paréntesis de cierre «)»', {
      cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === ')',
      pista: 'Faltaba cerrar la condición.',
    });

    const cuerpo = this.cuerpoDeInstruccion();
    return A.mientras(condicion, cuerpo, A.posDe(inicio));
  }

  /** do { ... } while (condición); */
  instruccionHacer() {
    const inicio = this.siguiente(); // «do»
    const cuerpo = this.cuerpoDeInstruccion();

    this.exige('la palabra clave «while» después del cuerpo', {
      cumple: (t) => t.tipo === TIPO.PALABRA_CLAVE && t.valor === 'while',
      pista: 'El do while necesita su «while (condición);» detrás de las llaves.',
    });
    this.exige('un paréntesis de apertura «(»', {
      cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === '(',
    });
    const condicion = this.expresion();
    this.exige('un paréntesis de cierre «)»', {
      cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === ')',
    });
    this.exige('un punto y coma «;» después del while', {
      cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === ';',
      pista: 'El do while termina en punto y coma.',
    });

    return A.hacer(cuerpo, condicion, A.posDe(inicio));
  }

  /**
   * for. Hay dos formas distintas detrás de la misma palabra:
   *   for (int i = 0; i < 5; i++)  ->  la clásica
   *   for (String nombre : nombres) ->  la de recorrido
   * Se distinguen mirando si aparece un «:» antes del «)».
   */
  instruccionPara() {
    const inicio = this.siguiente(); // «for»

    this.exige('un paréntesis de apertura «(»', {
      cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === '(',
      pista: 'El for se escribe for (inicio; condición; avance) { ... }.',
    });

    if (this.esParaCada()) return this.paraCada(inicio);

    /* Un for con dos identificadores seguidos y sin «:» es un for each al que
       le falta el separador. Sin esta comprobación el error sale de tres
       mensajes más allá y no señala la causa. */
    if (this.esForEachRoto()) {
      this.falla(
        this.mira(1),
        `en el for each faltan los dos puntos «:» entre «${this.mira(0).texto}» y «${this.mira(1).texto}».`,
        'El for each separa la variable de la colección con «:», no con «;»: for (String s : lista) { ... }',
      );
    }

    let inicializacion = null;
    if (!this.esSeparador(';')) {
      if (this.puedeSerDeclaracion()) {
        inicializacion = [this.declaracionLocalSinPuntoYComa()];
      } else {
        const inicioExpr = this.actual();
        const operacion = this.expresion();
        inicializacion = [A.expresion(operacion, A.posEntre(inicioExpr, this.mira(-1)))];
        this.exige('un punto y coma «;» después de la inicialización', {
          cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === ';',
          pista: 'El for clásico lleva tres partes separadas por «;»: inicio; condición; avance.',
        });
      }
    } else {
      this.siguiente();
    }

    const condicion = this.esSeparador(')') ? null : this.expresion();
    this.exige('un punto y coma «;» después de la condición', {
      cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === ';',
      pista: 'Falta la segunda «;» del for.',
    });

    const avance = this.esSeparador(')') ? null : this.expresion();
    this.exige('un paréntesis de cierre «)»', {
      cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === ')',
      pista: 'Faltaba cerrar el paréntesis del for.',
    });

    const cuerpo = this.cuerpoDeInstruccion();
    return A.para(inicializacion, condicion, avance, cuerpo, A.posDe(inicio));
  }

  /** declarationLocal() sin el «;», que en el for ya lo pone la cabecera. */
  declaracionLocalSinPuntoYComa() {
    const inicio = this.actual();
    this.modificadores();
    const tipo = this.tipo();
    const nombre = this.exige('el nombre de la variable del for', {
      cumple: (t) => t.tipo === TIPO.IDENTIFICADOR,
      pista: 'La cabecera del for empieza con una declaración: int i = 0;',
    });
    let inicializador = null;
    if (this.esOperador('=')) {
      this.siguiente();
      inicializador = this.expresion();
    }
    this.exige('un punto y coma «;»', {
      cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === ';',
      pista: 'El for clásico separa sus tres partes con «;».',
    });
    return A.declaracion(tipo, nombre.valor, inicializador, A.posDe(inicio));
  }

  /** Mira si la cabecera del for es del tipo «for (T x : coleccion)». */
  esParaCada() {
    let profundidad = 0;
    for (let k = 0; k < 40; k += 1) {
      const t = this.mira(k);
      if (t.tipo === TIPO.FIN) return false;
      if (t.tipo === TIPO.SEPARADOR && t.texto === '(') profundidad += 1;
      if (t.tipo === TIPO.SEPARADOR && t.texto === ')') {
        if (profundidad === 0) return false;
        profundidad -= 1;
      }
      if (t.tipo === TIPO.OPERADOR && t.valor === ':' && profundidad === 0) return true;
    }
    return false;
  }

  /**
   * Mira si la cabecera es un for each al que le falta el «:».
   *
   * Se reconoce porque hay un tipo, luego un identificador y luego **otro
   * identificador**: el nombre de la colección donde debería ir el separador.
   * Un for clásico lleva ahí un «=» o un «;», así que no se confunde con él.
   */
  esForEachRoto() {
    const t0 = this.mira(0);
    const t1 = this.mira(1);
    const t2 = this.mira(2);
    const abreTipo = t0.tipo === TIPO.IDENTIFICADOR || (t0.tipo === TIPO.PALABRA_CLAVE && TIPOS_PRIMITIVOS.has(t0.valor));
    return abreTipo && t1.tipo === TIPO.IDENTIFICADOR && t2.tipo === TIPO.IDENTIFICADOR;
  }

  /** for (T x : coleccion) */
  paraCada(inicio) {
    this.modificadores();
    const tipo = this.tipo();
    const nombre = this.exige('el nombre de la variable del for each', {
      cumple: (t) => t.tipo === TIPO.IDENTIFICADOR,
      pista: 'El for each se escribe for (String nombre : lista) { ... }.',
    });
    this.exige('dos puntos «:» para separar la variable de la colección', {
      cumple: (t) => t.tipo === TIPO.OPERADOR && t.valor === ':',
      pista: 'El for each separa su variable de la colección con «:», no con «;».',
    });
    const coleccion = this.expresion();
    this.exige('un paréntesis de cierre «)»', {
      cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === ')',
      pista: 'Faltaba cerrar el paréntesis del for each.',
    });

    const cuerpo = this.cuerpoDeInstruccion();
    return A.paraCada(
      A.parametro(tipo, nombre.valor, A.posDe(nombre)),
      coleccion,
      cuerpo,
      A.posDe(inicio),
    );
  }

  /** return [expresión]; */
  instruccionDevolver() {
    const inicio = this.siguiente(); // «return»
    const valor = this.esSeparador(';') ? null : this.expresion();
    this.exige('un punto y coma «;» después del return', {
      cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === ';',
      pista: 'El return se termina con «;».',
      ancla: 'anterior',
    });
    return A.devolver(valor, A.posDe(inicio));
  }

  /** break; */
  instruccionRomper() {
    const inicio = this.siguiente();
    this.exige('un punto y coma «;» después del break', {
      cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === ';',
      pista: 'El break se escribe break; sin nada más.',
      ancla: 'anterior',
    });
    return A.romper(A.posDe(inicio));
  }

  /** continue; */
  instruccionContinuar() {
    const inicio = this.siguiente();
    this.exige('un punto y coma «;» después del continue', {
      cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === ';',
      pista: 'El continue se escribe continue; sin nada más.',
      ancla: 'anterior',
    });
    return A.continuar(A.posDe(inicio));
  }

  /**
   * El cuerpo de un if, while o for: un bloque entre llaves o una instrucción
   * suelta. Aceptar ambas formas es lo que hace Java, y evita tener que exigir
   * llaves siempre.
   */
  cuerpoDeInstruccion() {
    const t = this.actual();

    if (t.tipo === TIPO.SEPARADOR && t.texto === '{') {
      this.siguiente();
      const bloque = this.bloqueHasta('}');
      this.exige('la llave de cierre «}»', {
        cumple: (x) => x.tipo === TIPO.SEPARADOR && x.texto === '}',
        pista: 'Abriste el cuerpo con «{» y falta cerrarlo.',
      });
      return bloque;
    }
    return this.instruccion();
  }

  /* ---------------------------- expresiones --------------------------- */

  /**
   * Punto de entrada de una expresión: asignación, y de ahí hacia abajo por la
   * tabla de precedencia.
   */
  expresion() {
    return this.asignacion();
  }

  /** Nivel 1: asignación. Asocia a la derecha, así que `a = b = 0` vale 0 en a y en b. */
  asignacion() {
    const inicio = this.actual();
    const izquierda = this.condicional();

    if (this.actual().tipo === TIPO.OPERADOR && NIVEL.ASIGNACION.includes(this.actual().valor)) {
      const op = this.siguiente();
      const valor = this.asignacion();
      return A.asignacion(izquierda, op.valor, valor, A.posEntre(inicio, this.mira(-1)));
    }
    return izquierda;
  }

  /** Nivel 2: el operador condicional, que es el único ternario de Java. */
  condicional() {
    const inicio = this.actual();
    const condicion = this.oLogico();

    if (this.esOperador('?')) {
      this.siguiente();
      const entonces = this.asignacion();
      this.exige('dos puntos «:» en el operador condicional', {
        cumple: (t) => t.tipo === TIPO.OPERADOR && t.valor === ':',
        pista: 'El condicional se escribe condición ? unValor : otroValor.',
      });
      const otro = this.asignacion();
      return A.condicional(condicion, entonces, otro, A.posEntre(inicio, this.mira(-1)));
    }
    return condicion;
  }

  oLogico() {
    return this.nivel(NIVEL.LOGICO_OR, () => this.yLogico());
  }

  yLogico() {
    return this.nivel(NIVEL.LOGICO_AND, () => this.oBit());
  }

  oBit() {
    return this.nivel(NIVEL.BIT_OR, () => this.xorBit());
  }

  xorBit() {
    return this.nivel(NIVEL.BIT_XOR, () => this.yBit());
  }

  yBit() {
    return this.nivel(NIVEL.BIT_AND, () => this.igualdad());
  }

  igualdad() {
    return this.nivel(NIVEL.IGUALDAD, () => this.comparacion());
  }

  /**
   * Comparación: `<`, `>`, `<=`, `>=`.
   *
   * Se escribe a mano en vez de usar nivel() porque hay que mirar `instanceof`,
   * que el lector emite como palabra clave y no como operador. La comprobación
   * va **después** de leer el operando izquierdo: si se hiciera antes, la
   * palabra todavía no está en la corriente y la comprobación no ve nada.
   */
  comparacion() {
    let izquierda = this.desplazamiento();

    for (;;) {
      const t = this.actual();

      if (t.tipo === TIPO.PALABRA_CLAVE && t.valor === 'instanceof') {
        this.falla(
          t,
          'JavaLearn todavía no admite instanceof.',
          'Si lo que quieres es comparar dos textos, usa equals: texto.equals(otro).',
        );
      }

      if (t.tipo !== TIPO.OPERADOR || !NIVEL.COMPARACION.includes(t.valor)) return izquierda;

      this.siguiente();
      const derecha = this.desplazamiento();
      izquierda = A.binario(t.valor, izquierda, derecha, A.posNodos(izquierda, derecha));
    }
  }

  desplazamiento() {
    return this.nivel(NIVEL.DESPLAZAMIENTO, () => this.suma());
  }

  suma() {
    return this.nivel(NIVEL.SUMA, () => this.producto());
  }

  producto() {
    return this.nivel(NIVEL.PRODUCTO, () => this.unario());
  }

  /**
   * Un nivel de la tabla de precedencia.
   * Todos asocian a la izquierda, que es el caso mayoritario: `10 - 3 - 2`
   * vale 5, no 9.
   */
  nivel(operadores, siguienteNivel) {
    let izquierda = siguienteNivel();

    for (;;) {
      const t = this.actual();
      if (t.tipo !== TIPO.OPERADOR) return izquierda;
      if (!operadores.includes(t.valor)) return izquierda;

      this.siguiente();
      const derecha = siguienteNivel();
      izquierda = A.binario(t.valor, izquierda, derecha, A.posNodos(izquierda, derecha));
    }
  }

  /**
   * Prefijo: + - ! ~ ++ -- y el "cast" entre paréntesis.
   *
   * El cast es el punto delicado: `(double) x` convierte, pero
   * `(a + b) * c` solo agrupa. Se distingue mirando si dentro del paréntesis
   * hay algo más que un tipo; si lo hay, es una expresión entre paréntesis.
   */
  unario() {
    const t = this.actual();

    if (t.tipo === TIPO.OPERADOR && ['+', '-', '!', '~', '++', '--'].includes(t.valor)) {
      this.siguiente();
      const operando = this.unario();
      return A.unario(t.valor, operando, true, A.posDe(t));
    }

    /* Un «(» seguido de un tipo puede ser un cast: (int) x. */
    if (this.esSeparador('(') && this.esCast()) {
      this.siguiente();
      const tipo = this.tipo();
      this.exige('un paréntesis de cierre «)» del cast', {
        cumple: (x) => x.tipo === TIPO.SEPARADOR && x.texto === ')',
        pista: 'Un cast se escribe así: (double) numero.',
      });
      const operando = this.unario();
      return A.conversion(tipo, operando, A.posDe(t));
    }

    /* Un «(» seguido de un identificador y luego un «)» es un agrupamiento o
       un cast a clase. A las clases todavia no se convierten, y conviene
       decirlo en vez de fallar más adelante con un mensaje confuso. */
    if (this.esSeparador('(') && this.esCastAClase()) {
      this.falla(
        t,
        'JavaLearn todavía no admite conversiones a clases: solo se puede convertir a tipos primitivos.',
        'Escribe por ejemplo (double) numero, o deja la expresión entre paréntesis sin convertir.',
      );
    }

    return this.postfijo();
  }

  /** ¿Es «(» seguido de un nombre de clase y un «)»? */
  esCastAClase() {
    const t1 = this.mira(1);
    if (t1.tipo !== TIPO.IDENTIFICADOR) return false;
    if (t1.valor !== 'String') {
      /* Un identificador que empieza por mayúscula suele ser una clase; los
         nombres de variable empiezan por minúscula. */
      if (!/^[A-Z]/.test(t1.valor)) return false;
    }
    let k = 2;
    while (this.mira(k).tipo === TIPO.SEPARADOR && this.mira(k).texto === '[' && this.mira(k + 1).texto === ']') k += 2;
    const cierre = this.mira(k);
    return cierre.tipo === TIPO.SEPARADOR && cierre.texto === ')';
  }

  /**
   * Decide si el paréntesis abierto es un cast o un agrupamiento.
   *
   * Este es el punto más delicado del parser. En `(a + b) * c` el paréntesis
   * agrupa; en `(double) x` convierte. La diferencia no se ve en el «(»:
   * depende de lo que hay dentro.
   *
   * La regla que se aplica aquí es deliberadamente conservadora: solo se toma
   * por un cast si dentro hay un **tipo primitivo** y, detrás, un «)» seguido
   * de algo que pueda empezar una expresión unaria. Con eso, `(a + b)` nunca
   * se confunde porque `a` es un identificador, no un tipo primitivo, y una
   * expresión entre paréntesis no empieza por un tipo. El precio es no
   * aceptar todavía conversiones a clases —(String) x—, que no hacen falta en
   * estas misiones y se rechazan con un mensaje claro más abajo.
   */
  esCast() {
    let k = 1;
    const t1 = this.mira(k);
    if (t1.tipo !== TIPO.PALABRA_CLAVE || !TIPOS_PRIMITIVOS.has(t1.valor)) return false;
    if (t1.valor === 'void') return false;
    k += 1;

    /* Un cast puede llevar los corchetes del tipo: (int[]) numeros. */
    while (this.mira(k).tipo === TIPO.SEPARADOR && this.mira(k).texto === '[' && this.mira(k + 1).texto === ']') {
      k += 2;
    }

    const cierre = this.mira(k);
    if (cierre.tipo !== TIPO.SEPARADOR || cierre.texto !== ')') return false;

    /* Detrás del «)» tiene que poder venir un operando unario. Si no, era un
       agrupamiento: (int) por sí solo no significa nada. */
    const detras = this.mira(k + 1);
    if (detras.tipo === TIPO.ENTERO || detras.tipo === TIPO.LARGO || detras.tipo === TIPO.DECIMAL
      || detras.tipo === TIPO.DOBLE || detras.tipo === TIPO.CADENA || detras.tipo === TIPO.CARACTER
      || detras.tipo === TIPO.IDENTIFICADOR) {
      return true;
    }
    if (detras.tipo === TIPO.OPERADOR && ['!', '~', '+', '-', '++', '--'].includes(detras.valor)) return true;
    if (detras.tipo === TIPO.SEPARADOR && detras.texto === '(') return true;
    if (detras.tipo === TIPO.PALABRA_CLAVE && ['this', 'new', 'true', 'false', 'null'].includes(detras.valor)) return true;
    return false;
  }

  /** Postfijo: llamadas, accesos, indexado, ++ y -- detrás. */
  postfijo() {
    let expresion = this.primaria();

    for (;;) {
      const t = this.actual();

      if (t.tipo === TIPO.SEPARADOR && t.texto === '.') {
        this.siguiente();
        const miembro = this.exige('el nombre del campo o del método', {
          cumple: (x) => x.tipo === TIPO.IDENTIFICADOR,
          pista: 'Después del punto va un nombre, como en System.out.',
        });
        if (this.esSeparador('(')) {
          const argumentos = this.argumentosLlamada();
          expresion = A.llamada(expresion, miembro.valor, argumentos, A.posDe(t));
        } else {
          expresion = A.accesoMiembro(expresion, miembro.valor, A.posDe(t));
        }
        continue;
      }

      if (t.tipo === TIPO.SEPARADOR && t.texto === '[') {
        this.siguiente();
        const indice = this.expresion();
        this.exige('un corchete de cierre «]»', {
          cumple: (x) => x.tipo === TIPO.SEPARADOR && x.texto === ']',
          pista: 'Abriste el corchete con «[» y falta cerrarlo.',
        });
        expresion = A.indexado(expresion, indice, A.posDe(t));
        continue;
      }

      if (t.tipo === TIPO.OPERADOR && (t.valor === '++' || t.valor === '--')) {
        this.siguiente();
        expresion = A.unario(t.valor, expresion, false, A.posDe(t));
        continue;
      }

      return expresion;
    }
  }

  /** Los argumentos de una llamada, sin los paréntesis. */
  argumentosLlamada() {
    this.exige('un paréntesis de apertura «(» para los argumentos', {
      cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === '(',
      pista: 'Una llamada necesita paréntesis: saludar() o println(texto).',
    });

    const argumentos = [];
    if (!this.esSeparador(')')) {
      do {
        argumentos.push(this.expresion());
      } while (this.coma());
    }

    this.exige('un paréntesis de cierre «)»', {
      cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === ')',
      pista: 'Faltaba cerrar los argumentos de la llamada.',
    });
    return argumentos;
  }

  /**
   * La expresión más básica de todas: literales, nombres, this, new y paréntesis.
   */
  primaria() {
    const t = this.actual();

    switch (t.tipo) {
      case TIPO.ENTERO:
        this.siguiente();
        return A.literal(t.valor, 'entero', A.posDe(t));
      case TIPO.LARGO:
        this.siguiente();
        return A.literal(t.valor, 'largo', A.posDe(t));
      case TIPO.DECIMAL:
        this.siguiente();
        return A.literal(t.valor, 'decimal', A.posDe(t));
      case TIPO.DOBLE:
        this.siguiente();
        return A.literal(t.valor, 'doble', A.posDe(t));
      case TIPO.CARACTER:
        this.siguiente();
        return A.literal(t.valor, 'caracter', A.posDe(t));
      case TIPO.CADENA:
        this.siguiente();
        return A.literal(t.valor, 'cadena', A.posDe(t));
      default:
        break;
    }

    if (t.tipo === TIPO.PALABRA_CLAVE) {
      if (t.valor === 'true' || t.valor === 'false') {
        this.siguiente();
        return A.literal(t.valor === 'true', 'logico', A.posDe(t));
      }
      if (t.valor === 'null') {
        this.siguiente();
        return A.literal(null, 'nulo', A.posDe(t));
      }
      if (t.valor === 'this') {
        this.siguiente();
        return A.este(A.posDe(t));
      }
      if (t.valor === 'new') return this.nuevoArreglo();
      this.rechazaPalabra();
    }

    if (t.tipo === TIPO.IDENTIFICADOR) {
      /* Llamada suelta, sin objeto delante: main() o saludar(). */
      if (this.esSeparador('(', 1)) {
        this.siguiente();
        const argumentos = this.argumentosLlamada();
        return A.llamada(null, t.valor, argumentos, A.posDe(t));
      }
      this.siguiente();
      return A.identificador(t.valor, A.posDe(t));
    }

    if (t.tipo === TIPO.SEPARADOR && t.texto === '(') {
      this.siguiente();
      const dentro = this.expresion();
      this.exige('un paréntesis de cierre «)»', {
        cumple: (x) => x.tipo === TIPO.SEPARADOR && x.texto === ')',
        pista: 'Abriste un paréntesis y falta cerrarlo.',
      });
      return dentro;
    }

    this.rechazaPalabra();

    this.falla(
      t,
      `esperaba una expresión y encontré ${bonito(t)}.`,
      'Una expresión puede ser un número, un texto entre comillas, un nombre de variable o una llamada.',
    );
    return null;
  }

  /**
   * new. Solo se admite para arreglos: new int[5], new String[] {"a", "b"}.
   * Cualquier otra cosa da el mensaje de la tabla central.
   */
  nuevoArreglo() {
    const inicio = this.siguiente(); // «new»
    const tipo = this.tipoBase();

    if (!this.esSeparador('[')) {
      const regla = restriccionDe('new');
      this.falla(
        inicio,
        `${regla.mensaje}. ${regla.alternativa}`,
        'Por ahora solo se crean arreglos con new.',
      );
    }

    /* Sin llaves: new int[5] son dimensiones. Con llaves: el contenido. */
    const dimensiones = [];
    while (this.esSeparador('[')) {
      this.siguiente();
      if (this.esSeparador(']')) {
        this.siguiente();
        dimensiones.push(null);
        continue;
      }
      dimensiones.push(this.expresion());
      this.exige('un corchete de cierre «]»', {
        cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === ']',
      });
    }

    let inicializador = null;
    if (this.esSeparador('{')) {
      this.siguiente();
      inicializador = [];
      if (!this.esSeparador('}')) {
        do {
          inicializador.push(this.expresion());
        } while (this.coma());
      }
      this.exige('una llave de cierre «}» del contenido del arreglo', {
        cumple: (t) => t.tipo === TIPO.SEPARADOR && t.texto === '}',
        pista: 'Abriste el contenido con «{» y falta cerrarlo.',
      });
    }

    return A.nuevoArreglo(tipo, dimensiones, inicializador, A.posDe(inicio));
  }
}

/**
 * Analiza un programa y devuelve su arbol de sintaxis.
 * @param {string} fuente Texto Java completo.
 */
export function analizar(fuente) {
  const tokens = leerTokens(fuente);
  return new Parser(tokens).analizar();
}

/** Texto de un tipo, para poder escribirlo en un mensaje de error. */
function tipoTexto(tipo) {
  switch (tipo.tipo) {
    case 'TipoPrimitivo':
      return tipo.nombre;
    case 'TipoClase':
      return tipo.nombre;
    case 'TipoArreglo':
      return `${tipoTexto(tipo.elemento)}[]`;
    default:
      return 'tipo';
  }
}

