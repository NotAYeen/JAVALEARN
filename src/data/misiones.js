/**
 * Catalogo de misiones.
 *
 * Se construye por tandas de cinco. Ninguna mision se publica hasta que pasa
 * scripts/validate-missions.mjs, que contrasta su solucion contra el JDK real.
 *
 * Forma de cada mision:
 *
 * {
 *   id: 'fundamentos-01',
 *   unidad: 'fundamentos',
 *   titulo: 'Hola, mundo',
 *   modalidad: 'terminal',
 *   objetivos: ['Escribir tu primer programa en Java'],
 *   vocabulario: ['System', 'out', 'println', 'String'],
 *   glosario: ['clase', 'metodo', 'main'],
 *   codigoInicial: 'public class Main {\n  ...',
 *   solucion: 'public class Main { ... }',
 *   entrada: [],                       // argumentos de main
 *   salidaEsperada: 'Hola, mundo',
 *   pistas: [{ nivel: 1, texto: '...' }],
 *   explicacion: '...',
 *   // solo para 'auditoria'
 *   lineas: ['...'], indiceFallo: 2,
 *   // solo para 'ensamblaje'
 *   bloques: ['...'],
 *   // solo para 'relacion'
 *   pares: [{ izquierda: '...', derecha: '...' }],
 * }
 *
 * En la modalidad 'lectura' el campo `explicacion` es una lista de bloques, no
 * una cadena, para que la leccion pueda intercalar parrafos, listas, codigo,
 * avisos y tablas:
 *
 *   { tipo: 'parrafo', texto: '...' }
 *   { tipo: 'lista',   titulo: '...', items: ['...'] }
 *   { tipo: 'codigo',  titulo: '...', codigo: '...', nota: '...', salida: '...' }
 *   { tipo: 'aviso',   tono: 'info' | 'atencion', texto: '...' }
 *   { tipo: 'tabla',   cabeceras: ['...'], filas: [['...', '...']] }
 *
 * Las misiones de lectura declaran tambien `salidaEsperada` aunque no hace
 * falta para mostrarla: declarandola, el validador compila y ejecuta su
 * solucion con el JDK real y comprueba que la salida es exactamente esa. Asi
 * ningun ejemplo de una leccion se afirma sin demostrar.
 */

export const MISIONES = [
  /* ---------------------------------------------------------------------- */
  /* Unidad 1: Fundamentos                                                  */
  /* ---------------------------------------------------------------------- */
  {
    id: 'fundamentos-01',
    unidad: 'fundamentos',
    titulo: 'Tu primer programa',
    modalidad: 'lectura',
    objetivos: [
      'Reconocer las tres piezas de un programa Java: la clase, el metodo main y la instruccion que imprime',
      'Saber que las llaves delimitan bloques de codigo y que el orden de las llaves importa',
      'Escribir un programa que imprima una linea de texto',
    ],
    vocabulario: ['public', 'class', 'static', 'void', 'main', 'String', 'args', 'System', 'out', 'println'],
    glosario: ['clase', 'metodo', 'parametro', 'instruccion', 'llave', 'punto y coma'],
    solucion: `public class Main {
  public static void main(String[] args) {
    System.out.println("Hola, mundo");
  }
}`,
    salidaEsperada: 'Hola, mundo',
    explicacion: [
      {
        tipo: 'parrafo',
        texto: 'Todo programa de Java empieza dentro de una clase. Piensa en la clase como una caja con etiqueta: dentro van las cosas que pertenecen juntas, y la etiqueta es el nombre por el que puedes referirte a ellas.',
      },
      { tipo: 'codigo', titulo: 'El programa completo', codigo: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hola, mundo");\n  }\n}' },
      {
        tipo: 'lista',
        titulo: 'Las tres piezas, de fuera hacia dentro',
        items: [
          '`public class Main` declara una clase. `Main` es su nombre y tiene que coincidir con el nombre del archivo: `Main.java`.',
          '`public static void main(String[] args)` declara el metodo `main`. Java lo busca al arrancar, es el punto de entrada obligatorio.',
          '`System.out.println("Hola, mundo")` es la instruccion que imprime. El punto y coma cierra la instruccion.',
        ],
      },
      {
        tipo: 'codigo',
        titulo: 'Que imprime exactamente',
        codigo: 'System.out.println("Hola, mundo");',
        salida: 'Hola, mundo',
      },
      {
        tipo: 'aviso',
        tono: 'atencion',
        texto: 'El punto y coma no es opcional en Java. Si se te olvida, el compilador te dira exactamente en que linea falta, y esa es una de las razones por las que el entorno marca la posicion del error: no tienes que contar lineas a mano.',
      },
      {
        tipo: 'parrafo',
        texto: 'Fijate en que las llaves van siempre en pareja. Una llave abre un bloque y la siguiente lo cierra. Si sobran o faltan, Java se confunde a partir de ahi, y el error que te senala puede estar lejos de la causa real.',
      },
    ],
    pistas: [
      { nivel: 1, texto: 'El nombre de la clase va despues de la palabra `class`, y el del archivo antes de `.java`.' },
      { nivel: 2, texto: 'El metodo que Java busca al arrancar se llama `main` y su firma es siempre `public static void main(String[] args)`.' },
      { nivel: 3, texto: 'Para imprimir, el camino es `System.out.println(...)`, con el texto entre comillas dobles y un punto y coma al final.' },
    ],
  },

  {
    id: 'fundamentos-02',
    unidad: 'fundamentos',
    titulo: 'Imprimir con y sin salto de linea',
    modalidad: 'lectura',
    objetivos: [
      'Distinguir `print` de `println`',
      'Entender que `println` anade un salto de linea al final',
      'Componer una frase usando varias llamadas seguidas',
    ],
    vocabulario: ['print', 'println', 'System', 'out', 'consola'],
    glosario: ['salto de linea', 'consola', 'instruccion'],
    solucion: `public class Main {
  public static void main(String[] args) {
    System.out.print("Hola");
    System.out.print(" ");
    System.out.println("mundo");
    System.out.print("A");
    System.out.println("B");
  }
}`,
    salidaEsperada: 'Hola mundo\nAB',
    explicacion: [
      {
        tipo: 'parrafo',
        texto: 'Hay dos formas de imprimir. `println` imprime y ademas salta de linea. `print` imprime y se queda en la misma linea, esperando a que continues tu. La `ln` del final de `println` viene de "linea": es la abreviatura que significa "y salta".',
      },
      {
        tipo: 'codigo',
        titulo: 'Las dos, juntas',
        codigo: 'System.out.print("Hola");\nSystem.out.print(" ");\nSystem.out.println("mundo");\nSystem.out.print("A");\nSystem.out.println("B");',
        salida: 'Hola mundo\nAB',
        nota: 'La primera linea necesita tres llamadas porque `print` no anade nada: si solo pones `print("Hola")` y `print("mundo")` verias `HolaMundo` pegado, sin espacio.',
      },
      {
        tipo: 'tabla',
        cabeceras: ['Llamada', 'Imprime', 'Salta de linea despues'],
        filas: [
          ['`print("A")`', 'A', 'No'],
          ['`println("A")`', 'A', 'Si'],
        ],
      },
      {
        tipo: 'aviso',
        tono: 'info',
        texto: 'El salto de linea de `println` lo anade el propio metodo, invisible en el codigo. Por eso el codigo se ve igual en los dos casos y el resultado no.',
      },
      {
        tipo: 'parrafo',
        texto: 'Tambien existe `printf`, que permite decidir el formato. No lo necesitas todavia: `println` resuelve todo lo de esta unidad y conviene dominarla antes de complicarse.',
      },
    ],
    pistas: [
      { nivel: 1, texto: 'Si dos textos salen pegados, casi siempre falta un `print(" ")` o un `println` donde habia un `print`.' },
      { nivel: 2, texto: 'Usa `print` mientras quieras seguir en la misma linea y `println` cuando quieras cerrar la.' },
      { nivel: 3, texto: 'Para unir "Hola" y "mundo" en una linea necesitas tres llamadas: `print("Hola")`, `print(" ")` y `println("mundo")`.' },
    ],
  },

  {
    id: 'fundamentos-03',
    unidad: 'fundamentos',
    titulo: 'Comillas, acentos y barras',
    modalidad: 'lectura',
    objetivos: [
      'Escribir texto entre comillas dobles sin romper el programa',
      'Usar los escapes `\"` y `\\`',
      'Escribir en Castellano con tildes y ene sin miedo',
    ],
    vocabulario: ['String', 'escape', 'comillas', 'codificacion', 'UTF-8'],
    glosario: ['cadena de texto', 'caracter de escape', 'codificacion'],
    solucion: `public class Main {
  public static void main(String[] args) {
    System.out.println("Año 2026: la edición \\"especial\\" de Java");
    System.out.println("Ruta: C:\\\\Program Files\\\\Java");
    System.out.println("Para un salto de línea de verdad: \\\\n");
  }
}`,
    salidaEsperada: 'Año 2026: la edición "especial" de Java\nRuta: C:\\Program Files\\Java\nPara un salto de línea de verdad: \\n',
    explicacion: [
      {
        tipo: 'parrafo',
        texto: 'Un texto es una cadena de texto, y las cadenas van siempre entre comillas dobles. Las comillas son el sinal que le dice a Java "esto es texto, no es codigo". Todo lo que pongas dentro se imprime tal cual.',
      },
      {
        tipo: 'parrafo',
        texto: 'El problema aparece cuando el propio texto quiere contener una comilla. Java no puede saber si esa comilla cierra la cadena o es parte del texto, asi que hay que escaparla con una barra invertida delante: `\\"`.',
      },
      {
        tipo: 'codigo',
        titulo: 'Comillas y barras de verdad',
        codigo: 'System.out.println("Año 2026: la edición \\"especial\\" de Java");\nSystem.out.println("Ruta: C:\\\\Program Files\\\\Java");\nSystem.out.println("Para un salto de línea de verdad: \\\\n");',
        salida: 'Año 2026: la edición "especial" de Java\nRuta: C:\\Program Files\\Java\nPara un salto de línea de verdad: \\n',
        nota: 'La ultima linea es la trampa: para que se vea un `\\n` en pantalla hay que escribir `\\\\n`. La barra invertida se escapa a si misma.',
      },
      {
        tipo: 'aviso',
        tono: 'atencion',
        texto: 'En una cadena, la barra invertida siempre significa algo. Si escribes una sola, Java espera un caracter de escape detras y te dira que el escape no es valido. Para una barra de verdad: `\\\\`.',
      },
      {
        tipo: 'parrafo',
        texto: 'Sobre los acentos: escribe Castellano normal. Las cadenas de Java guardan texto en UTF-8, que incluye tildes y ene. Lo unico que hay que vigilar es que el archivo este guardado tambien en UTF-8, que es lo que hacen los editores y el entorno por defecto.',
      },
    ],
    pistas: [
      { nivel: 1, texto: 'Si el programa se niega a compilar y no entiendes por que, mira si te has comido una comilla de cierre.' },
      { nivel: 2, texto: 'Una comilla doble dentro de un texto se escribe `\\"` (barra invertida delante).' },
      { nivel: 3, texto: 'Para imprimir una barra invertida necesitas dos: `\\\\`.' },
    ],
  },

  {
    id: 'fundamentos-04',
    unidad: 'fundamentos',
    titulo: 'El orden de las instrucciones',
    modalidad: 'lectura',
    objetivos: [
      'Entender que Java ejecuta las instrucciones de arriba abajo',
      'Distinguir codigo que existe de codigo que se ejecuta',
      'Comprobar que al llamar a un metodo se vuelve al punto de la llamada',
    ],
    vocabulario: ['orden', 'ejecucion', 'metodo', 'llamada', 'flujo'],
    glosario: ['flujo de ejecucion', 'metodo', 'punto de retorno'],
    solucion: `public class Main {
  public static void main(String[] args) {
    System.out.println("1. Esta linea se imprime");
    System.out.println("2. Esta tambien");
    saludar();
    System.out.println("4. Y esta es la ultima");
  }

  static void saludar() {
    System.out.println("3. Esta la imprime otro metodo");
  }
}`,
    salidaEsperada: '1. Esta linea se imprime\n2. Esta tambien\n3. Esta la imprime otro metodo\n4. Y esta es la ultima',
    explicacion: [
      {
        tipo: 'parrafo',
        texto: 'Java ejecuta de arriba abajo, sin excepciones ni sorpresas al principio. La primera instruccion que encuentra, la ejecuta; luego la siguiente. Ese es todo el modelo mental que necesitas para empezar.',
      },
      {
        tipo: 'codigo',
        titulo: 'Un metodo que se llama a mitad del camino',
        codigo: 'public static void main(String[] args) {\n  System.out.println("1. Esta linea se imprime");\n  System.out.println("2. Esta tambien");\n  saludar();\n  System.out.println("4. Y esta es la ultima");\n}\n\nstatic void saludar() {\n  System.out.println("3. Esta la imprime otro metodo");\n}',
        salida: '1. Esta linea se imprime\n2. Esta tambien\n3. Esta la imprime otro metodo\n4. Y esta es la ultima',
      },
      {
        tipo: 'lista',
        titulo: 'Que pasa en la linea 3',
        items: [
          'Java encuentra `saludar()` y salta a ejecutarlo.',
          'El metodo imprime su linea y termina.',
          'Java vuelve justo despues de la llamada y sigue con la linea 4.',
        ],
      },
      {
        tipo: 'parrafo',
        texto: 'Aqui esta la idea que mas confunde al principio: que el codigo exista no significa que se ejecute. `saludar` esta escrito y no imprime nada hasta que alguien lo llama. Un metodo que nunca se llama es un metodo que nunca corre.',
      },
      {
        tipo: 'aviso',
        tono: 'info',
        texto: 'Los metodos seran el tema de la unidad 5. No hace falta que entiendas su sintaxis todavia: aqui solo importa el efecto que tiene sobre el orden en que se imprime cada cosa.',
      },
    ],
    pistas: [
      { nivel: 1, texto: 'El numero que lleva cada linea no es decorativo: sale en ese orden exacto porque asi esta escrito.' },
      { nivel: 2, texto: 'Escribe el codigo y luego pon los numeros al final, en el orden en que aparecen en pantalla. Si no cuadran, hay algo que se ejecuta antes de lo que pensabas.' },
      { nivel: 3, texto: 'Al llamar a `saludar()` el flujo salta a ese metodo, y cuando acaba vuelve a la linea siguiente de donde salio.' },
    ],
  },

  {
    id: 'fundamentos-05',
    unidad: 'fundamentos',
    titulo: 'Comentarios: hablar con quien relea el codigo',
    modalidad: 'lectura',
    objetivos: [
      'Escribir un comentario de una linea con `//`',
      'Escribir un comentario de varias lineas con `/* */`',
      'Entender que los comentarios no cambian lo que hace el programa',
    ],
    vocabulario: ['comentario', '//', '/*', '*/', 'documentacion'],
    glosario: ['comentario', 'documentacion', 'codigo muerto'],
    solucion: `public class Main {
  public static void main(String[] args) {
    // Esta linea es un comentario: no hace nada.
    System.out.println("El programa imprime esto");  // Comentario al final
    /* Este comentario
       ocupa varias lineas
       y tampoco hace nada. */
    System.out.println("Y esto");
  }
}`,
    salidaEsperada: 'El programa imprime esto\nY esto',
    explicacion: [
      {
        tipo: 'parrafo',
        texto: 'Un comentario es una nota para las personas. Java lo lee y lo descarta: no produce ningun efecto en el programa. Se escribe con dos barras `//` y termina en el salto de linea.',
      },
      {
        tipo: 'codigo',
        titulo: 'Las dos formas',
        codigo: '// Comentario de una linea\nSystem.out.println("Hola");  // Tambien al final de una instruccion\n\n/* Comentario\n   de varias\n   lineas */\nSystem.out.println("Adios");',
        salida: 'Hola\nAdios',
      },
      {
        tipo: 'aviso',
        tono: 'atencion',
        texto: 'Un comentario de varias lineas empieza con `/*` y termina con `*/`. Si te olvidas del cierre, todo lo que venga despues queda comentado y el programa deja de funcionar de forma inexplicable.',
      },
      {
        tipo: 'parrafo',
        texto: 'Cuando sirvan de algo: para explicar una decision que no es evidente, para separar bloques de un algoritmo, o para dejar claro por que algo esta hecho de una manera rara. Lo que no sirve es reescribir el codigo en Castellano: `// suma a mas` encima de `a + b` no ayuda a nadie.',
      },
      {
        tipo: 'parrafo',
        texto: 'Un caso especial son los comentarios que empiezan por tres barras, `/** ... */`. Esos no son solo notas: se convierten en documentacion que las herramientas leen al pasar el cursor por encima. Veras muchos en codigo de Java ajeno.',
      },
    ],
    pistas: [
      { nivel: 1, texto: 'Un comentario de una linea empieza por `//` y todo lo que haya hasta el final se ignora.' },
      { nivel: 2, texto: 'Para comentar varias lineas se abre con `/*` y se cierra con `*/`, en ese orden.' },
      { nivel: 3, texto: 'Si comentas algo y el programa deja de funcionar, comprueba que has cerrado el `*/` del comentario de bloque.' },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Consultas sobre el catalogo                                                */
/* -------------------------------------------------------------------------- */

/** Misiones escritas de una unidad, en el orden en que estan declaradas. */
export function misionesDeUnidad(unidadId) {
  return MISIONES.filter((mision) => mision.unidad === unidadId);
}

/** Busca una mision por id. Devuelve null en vez de undefined para que quien llama tenga que decidir. */
export function buscarMision(id) {
  return MISIONES.find((mision) => mision.id === id) ?? null;
}

/**
 * Cuantas misiones estan realmente escritas, frente a las previstas.
 *
 * La portada dice las dos cifras, no solo la grande. Anunciar «43 misiones»
 * cuando hay cinco escritas es la forma mas rapida de perder la confianza de
 * quien llega.
 */
export const TOTAL_MISIONES_ESCRITAS = MISIONES.length;

/** Unidades que ya tienen al menos una mision escrita. */
export function unidadesConContenido() {
  return new Set(MISIONES.map((mision) => mision.unidad));
}
