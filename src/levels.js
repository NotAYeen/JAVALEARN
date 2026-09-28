export const LEVELS = [
  {
    "id_nivel": "mision_01",
    "title": "Hola Java",
    "dificultad": "Básico",
    "modalidad": "Terminal",
    "briefing_mision": "Tu aventura en Java arranca con un saludo. Es hora de demostrar que el motor te obedece: haz que muestre por consola el mensaje más famoso de la programación.",
    "init_code": "public class Mision {\n    public static void main(String[] args) {\n        // Completa el saludo\n    }\n}\n",
    "solution_code": "public class Mision {\n    public static void main(String[] args) {\n        System.out.println(\"Hola, mundo\");\n    }\n}\n",
    "expected_output": "Hola, mundo",
    "conceptos": [
      "System.out.println(...) escribe una línea en la consola.",
      "El texto va entre comillas dobles.",
      "main es el punto de entrada y recibe String[] args."
    ],
    "pistas": [
      "Busca en la Enciclopedia Java la ficha de System.out.println().",
      "El saludo va entre comillas dentro de los paréntesis."
    ],
    "keywords": ["System", "out", "println", "main", "String"]
  },
  {
    "id_nivel": "mision_02",
    "title": "Variables y Detective",
    "dificultad": "Básico",
    "modalidad": "Depuración",
    "briefing_mision": "Un recluta novato dejó su código roto: el compilador se quejó del último println. Encuentra el fallo y haz que el programa muestre el nombre y la edad correctos.",
    "init_code": "",
    "query_defectuoso": "public class Mision {\n    public static void main(String[] args) {\n        String nombre = \"Ada\";\n        System.out.println(nombre);\n        int edad = 36;\n        System.out.println(edadd);\n    }\n}\n",
    "solution_code": "public class Mision {\n    public static void main(String[] args) {\n        String nombre = \"Ada\";\n        System.out.println(nombre);\n        int edad = 36;\n        System.out.println(edad);\n    }\n}\n",
    "expected_output": "Ada\n36",
    "explicacion": "El error estaba en println(edadd): no existe ninguna variable llamada edadd, el compilador avisa con 'cannot find symbol'. La variable se llama edad, y Java distingue mayúsculas de minúsculas.",
    "conceptos": [
      "Una variable guarda un valor y su tipo se declara con int, String, double...",
      "El nombre de una variable debe existir y ser exacto al usarla.",
      "Los errores de compilación se muestran antes de ejecutar nada."
    ],
    "pistas": [
      "Ejecuta el código y lee el error: el símbolo que falta aparece citado.",
      "La variable que se imprime se llama 'edad', no 'edadd'."
    ],
    "keywords": ["String", "int", "edad", "println"]
  },
  {
    "id_nivel": "mision_03",
    "title": "Aritmética del Cuartel",
    "dificultad": "Básico",
    "modalidad": "Terminal",
    "briefing_mision": "El cuartel necesita calcular cuentas con dos códigos de serie. Muestra el resultado de las seis operaciones aritméticas básicas entre dos números: suma, resta, multiplicación, división, división entera y módulo.",
    "init_code": "public class Mision {\n    public static void main(String[] args) {\n        int a = 10;\n        int b = 3;\n        // Escribe las operaciones\n    }\n}\n",
    "solution_code": "public class Mision {\n    public static void main(String[] args) {\n        int a = 10;\n        int b = 3;\n        System.out.println(a + b);\n        System.out.println(a - b);\n        System.out.println(a * b);\n        System.out.println((double) a / b);\n        System.out.println(a / b);\n        System.out.println(a % b);\n    }\n}\n",
    "expected_output": "13\n7\n30\n3.3333333333333335\n3\n1",
    "conceptos": [
      "+ suma, - resta, * multiplica.",
      "/ divide; con dos int da división entera, y con double da decimales.",
      "% es el módulo (resto de la división)."
    ],
    "pistas": [
      "Usa los operadores sobre a y b.",
      "Para la división con decimales convierte uno de los operandos: (double) a / b."
    ],
    "keywords": ["int", "double", "println", "%"]
  },
  {
    "id_nivel": "mision_04",
    "title": "Texto Unido",
    "dificultad": "Básico",
    "modalidad": "Terminal",
    "briefing_mision": "Los agentes tienen nombre y código de identificación. Usa la concatenación de strings para construir el mensaje de presentación con su puntaje.",
    "init_code": "public class Mision {\n    public static void main(String[] args) {\n        String nombre = \"Ada\";\n        int puntaje = 95;\n        // Construye el mensaje\n    }\n}\n",
    "solution_code": "public class Mision {\n    public static void main(String[] args) {\n        String nombre = \"Ada\";\n        int puntaje = 95;\n        System.out.println(\"Hola \" + nombre + \", tu puntaje es \" + puntaje);\n    }\n}\n",
    "expected_output": "Hola Ada, tu puntaje es 95",
    "conceptos": [
      "El signo + une textos (concatenación).",
      "Al concatenar un String, el int se convierte solo a texto.",
      "String.format(\"%s\", x) es la alternativa con marcadores."
    ],
    "pistas": [
      "Abre y cierra el texto con comillas, sin dejar huecos tras el signo +.",
      "El mensaje completo es: Hola <nombre>, tu puntaje es <puntaje>"
    ],
    "keywords": ["String", "+", "println"]
  },
  {
    "id_nivel": "mision_05",
    "title": "Verdad o Falso",
    "dificultad": "Básico",
    "modalidad": "Terminal",
    "briefing_mision": "Una sonda robótica evalúa condiciones de seguridad. Muestra el resultado (true o false) de las cinco comparaciones y combinaciones lógicas entre los valores indicados.",
    "init_code": "public class Mision {\n    public static void main(String[] args) {\n        int a = 7;\n        // Evalúa las condiciones\n    }\n}\n",
    "solution_code": "public class Mision {\n    public static void main(String[] args) {\n        int a = 7;\n        System.out.println(a > 5);\n        System.out.println(a == 7);\n        System.out.println(a != 8);\n        System.out.println(a >= 10 && a < 20);\n        System.out.println(a > 10 || a == 7);\n    }\n}\n",
    "expected_output": "true\ntrue\ntrue\nfalse\ntrue",
    "conceptos": [
      "Java imprime los booleanos en minúsculas: true y false.",
      "> , < , == , >= , <= , != comparan valores.",
      "&& exige que las dos condiciones sean ciertas; || basta con que una lo sea."
    ],
    "pistas": [
      "Cada println muestra el resultado de una expresión booleana.",
      "a >= 10 es falso, así que el && completo también lo es."
    ],
    "keywords": ["int", "println", "==", "!=", "&&", "||"]
  },
  {
    "id_nivel": "mision_06",
    "title": "Transformación de Datos",
    "dificultad": "Básico",
    "modalidad": "Terminal",
    "briefing_mision": "Los datos llegan como texto y el sistema necesita números. Convierte los valores con las clases envoltorio y muestra los tres resultados de la misión.",
    "init_code": "public class Mision {\n    public static void main(String[] args) {\n        String numTexto = \"250\";\n        String precio = \"19.99\";\n        // Convierte y opera\n    }\n}\n",
    "solution_code": "public class Mision {\n    public static void main(String[] args) {\n        String numTexto = \"250\";\n        String precio = \"19.99\";\n        int cantidad = Integer.parseInt(numTexto);\n        double valor = Double.parseDouble(precio);\n        System.out.println(cantidad * 2);\n        System.out.println(valor);\n        System.out.println(String.valueOf(7) + \" unidades\");\n    }\n}\n",
    "expected_output": "500\n19.99\n7 unidades",
    "conceptos": [
      "Integer.parseInt(\"250\") convierte texto a int.",
      "Double.parseDouble(\"19.99\") convierte texto a double.",
      "String.valueOf(7) convierte un número a texto."
    ],
    "pistas": [
      "Las conversiones de texto a número usan parseInt y parseDouble.",
      "Para pasar de número a texto, envuélvelo con String.valueOf."
    ],
    "keywords": ["String", "Integer", "Double", "parseInt", "valueOf"]
  },
  {
    "id_nivel": "mision_07",
    "title": "Jefe de Escuadrón",
    "dificultad": "Intermedio",
    "modalidad": "Terminal",
    "briefing_mision": "Un sistema califica a los reclutas según su puntuación. Escribe la lógica de decisión que asigne la calificación correcta a un escuadrón aprobado y a uno suspenso.",
    "init_code": "public class Mision {\n    public static void main(String[] args) {\n        int puntuacion = 85;\n        int segunda = 40;\n        // Decide el rango de cada uno\n    }\n}\n",
    "solution_code": "public class Mision {\n    public static void main(String[] args) {\n        int puntuacion = 85;\n        String rango;\n        if (puntuacion >= 90) {\n            rango = \"excelente\";\n        } else if (puntuacion >= 70) {\n            rango = \"aprobado\";\n        } else if (puntuacion >= 50) {\n            rango = \"justo\";\n        } else {\n            rango = \"suspenso\";\n        }\n        System.out.println(rango);\n\n        int segunda = 40;\n        if (segunda >= 90) {\n            System.out.println(\"excelente\");\n        } else if (segunda >= 70) {\n            System.out.println(\"aprobado\");\n        } else if (segunda >= 50) {\n            System.out.println(\"justo\");\n        } else {\n            System.out.println(\"suspenso\");\n        }\n    }\n}\n",
    "expected_output": "aprobado\nsuspenso",
    "conceptos": [
      "if / else if / else ejecuta el primer bloque que cumple la condición.",
      "El orden importa: se comprueba de mayor a menor umbral.",
      "Cada bloque se delimita con llaves { }."
    ],
    "pistas": [
      "Los umbrales son 90, 70 y 50; por debajo de 50 es suspenso.",
      "Con 85 se cumple la segunda rama, no la primera."
    ],
    "keywords": ["int", "if", "else", "println", "String"]
  },
  {
    "id_nivel": "mision_08",
    "title": "Licencia de Conducción",
    "dificultad": "Intermedio",
    "modalidad": "Depuración",
    "briefing_mision": "El registro civil tiene un fallo: el candidato que cumple todos los requisitos aparece rechazado. Corrige la condición para que solo se acepte a quien tiene 18 años o más Y licencia en vigor.",
    "init_code": "",
    "query_defectuoso": "public class Mision {\n    public static void main(String[] args) {\n        int edad = 22;\n        boolean tieneLicencia = true;\n        if (tieneLicencia == \"true\") {\n            System.out.println(\"puede conducir\");\n        } else {\n            System.out.println(\"no puede conducir\");\n        }\n    }\n}\n",
    "solution_code": "public class Mision {\n    public static void main(String[] args) {\n        int edad = 22;\n        boolean tieneLicencia = true;\n        if (edad >= 18 && tieneLicencia) {\n            System.out.println(\"puede conducir\");\n        } else {\n            System.out.println(\"no puede conducir\");\n        }\n    }\n}\n",
    "expected_output": "puede conducir",
    "explicacion": "El if comparaba un boolean con un texto: el compilador lo rechaza con 'bad operand types for binary operator'. Además faltaba la edad. La condición correcta es edad >= 18 && tieneLicencia, usando el boolean directamente.",
    "conceptos": [
      "Un boolean no se compara con comillas: no es un String.",
      "&& combina dos condiciones y exige que ambas sean ciertas.",
      "El compilador detecta el error antes de ejecutar el programa."
    ],
    "pistas": [
      "Ejecuta el código y lee el error: el compilador señala el operador ==.",
      "La edad también entra en la condición, junto a la licencia."
    ],
    "keywords": ["int", "boolean", "if", "&&", "println"]
  },
  {
    "id_nivel": "mision_09",
    "title": "Suma Repetitiva",
    "dificultad": "Intermedio",
    "modalidad": "Terminal",
    "briefing_mision": "El cuartel suma intensidades de señal del 1 al 10. Escribe el bucle que recorra esos valores y acumule la suma, y muestra el total.",
    "init_code": "public class Mision {\n    public static void main(String[] args) {\n        int total = 0;\n        // Acumula del 1 al 10\n    }\n}\n",
    "solution_code": "public class Mision {\n    public static void main(String[] args) {\n        int total = 0;\n        for (int i = 1; i <= 10; i++) {\n            total = total + i;\n        }\n        System.out.println(total);\n    }\n}\n",
    "expected_output": "55",
    "conceptos": [
      "for (inicio; condición; avance) repite el bloque mientras la condición sea cierta.",
      "La variable del bucle (i) se declara en la propia cabecera.",
      "Acumular es sumar el valor actual a una variable que empieza en 0."
    ],
    "pistas": [
      "El bucle va de 1 a 10 incluido: i <= 10.",
      "Dentro del bloque: total = total + i;"
    ],
    "keywords": ["int", "for", "total", "println"]
  },
  {
    "id_nivel": "mision_10",
    "title": "Cuenta Regresiva",
    "dificultad": "Intermedio",
    "modalidad": "Depuración",
    "briefing_mision": "La torre de lanzamiento informa pero se salta el último número. El bucle termina antes de tiempo. Corrige la condición del while para que cuente de 5 hasta el 1.",
    "init_code": "",
    "query_defectuoso": "public class Mision {\n    public static void main(String[] args) {\n        int contador = 5;\n        while (contador >= 2) {\n            System.out.println(contador);\n            contador = contador - 1;\n        }\n    }\n}\n",
    "solution_code": "public class Mision {\n    public static void main(String[] args) {\n        int contador = 5;\n        while (contador > 0) {\n            System.out.println(contador);\n            contador = contador - 1;\n        }\n    }\n}\n",
    "expected_output": "5\n4\n3\n2\n1",
    "explicacion": "La condición era contador >= 2, así que al llegar a 1 el bucle se detenía y el 1 nunca se mostraba. Con contador > 0 el bucle sigue mientras quede algo que contar.",
    "conceptos": [
      "while repite el bloque mientras la condición sea verdadera.",
      "La condición se comprueba antes de cada vuelta.",
      "Olvidar avanzar la variable de control puede crear un bucle infinito."
    ],
    "pistas": [
      "El programa imprime 5, 4, 3, 2 y se detiene: falta el 1.",
      "La condición debe ser cierta también cuando contador vale 1."
    ],
    "keywords": ["int", "while", "contador", "println"]
  },
  {
    "id_nivel": "mision_11",
    "title": "Escape de Bucle",
    "dificultad": "Intermedio",
    "modalidad": "Auditoría",
    "briefing_mision": "El radar debe saltarse el valor 3 y seguir mostrando los demás. Algo interrumpe el escaneo por completo y solo aparecen el 1 y el 2. Ubica la instrucción que provoca el fallo.",
    "init_code": "",
    "audit_tokens": [
      "public class Mision {",
      "    public static void main(String[] args) {",
      "        for (int i = 1; i <= 5; i++) {",
      "            if (i == 3) {",
      "                break;",
      "            }",
      "            System.out.println(i);",
      "        }",
      "    }",
      "}"
    ],
    "token_error_index": 4,
    "solution_code": "public class Mision {\n    public static void main(String[] args) {\n        for (int i = 1; i <= 5; i++) {\n            if (i == 3) {\n                continue;\n            }\n            System.out.println(i);\n        }\n    }\n}\n",
    "expected_output": "1\n2\n4\n5",
    "explicacion": "break termina el bucle entero, por eso solo se mostraban 1 y 2. La instrucción correcta es continue, que salta a la siguiente iteración y sigue mostrando 4 y 5.",
    "conceptos": [
      "break termina el bucle.",
      "continue salta a la siguiente vuelta del bucle."
    ],
    "pistas": [
      "Fíjate en qué línea interrumpe el escaneo.",
      "Se quiere saltar SOLO el 3, no detener todo."
    ],
    "keywords": ["for", "if", "break", "continue"]
  },
  {
    "id_nivel": "mision_12",
    "title": "El Escondite Indexado",
    "dificultad": "Intermedio",
    "modalidad": "Terminal",
    "briefing_mision": "Un archivo de colores está cifrado por posición. Recupera el primer, el tercero y el último elemento, modifica el segundo y muestra la cadena final unida por guiones.",
    "init_code": "public class Mision {\n    public static void main(String[] args) {\n        String[] colores = {\"rojo\", \"verde\", \"azul\"};\n        // Accede y modifica posiciones\n    }\n}\n",
    "solution_code": "public class Mision {\n    public static void main(String[] args) {\n        String[] colores = {\"rojo\", \"verde\", \"azul\"};\n        System.out.println(colores[0]);\n        System.out.println(colores[2]);\n        System.out.println(colores[colores.length - 1]);\n        colores[1] = \"amarillo\";\n        System.out.println(String.join(\"-\", colores));\n    }\n}\n",
    "expected_output": "rojo\nazul\nazul\nrojo-amarillo-azul",
    "conceptos": [
      "Los arrays se indexan desde 0: el primer elemento es [0].",
      "El campo length da el número de elementos; el último es [length - 1].",
      "String.join(\"-\", array) une todos los elementos con un separador."
    ],
    "pistas": [
      "El tercer color (azul) está en la posición 2.",
      "Asigna a colores[1] el valor \"amarillo\"."
    ],
    "keywords": ["String[]", "length", "String", "join", "println"]
  },
  {
    "id_nivel": "mision_13",
    "title": "Orden de Batalla",
    "dificultad": "Intermedio",
    "modalidad": "Terminal",
    "briefing_mision": "Una lista de códigos llega desordenada y le falta un elemento. Añade el código que falta, ordena el array, muestra su tamaño y luego invierte el recorrido mostrando cada código.",
    "init_code": "import java.util.Arrays;\n\npublic class Mision {\n    public static void main(String[] args) {\n        int[] codigos = {7, 2, 9, 4};\n        // Completa, ordena y muestra\n    }\n}\n",
    "solution_code": "import java.util.Arrays;\n\npublic class Mision {\n    public static void main(String[] args) {\n        int[] codigos = {7, 2, 9, 4};\n        int[] orden = new int[codigos.length + 1];\n        for (int i = 0; i < codigos.length; i++) {\n            orden[i] = codigos[i];\n        }\n        orden[codigos.length] = 5;\n        Arrays.sort(orden);\n        System.out.println(Arrays.toString(orden));\n        System.out.println(orden.length);\n        for (int i = orden.length - 1; i >= 0; i--) {\n            System.out.println(orden[i]);\n        }\n    }\n}\n",
    "expected_output": "[2, 4, 5, 7, 9]\n5\n9\n7\n5\n4\n2",
    "conceptos": [
      "new int[codigos.length + 1] reserva un array con una hueco más.",
      "Arrays.sort(orden) ordena el array de menor a mayor.",
      "Arrays.toString(orden) imprime el array como texto entre corchetes."
    ],
    "pistas": [
      "El código que falta es el 5 y va en la última posición del array nuevo.",
      "Para recorrerlo al revés, empieza en orden.length - 1 y baja hasta 0."
    ],
    "keywords": ["int[]", "Arrays", "sort", "toString", "length"]
  },
  {
    "id_nivel": "mision_14",
    "title": "Coordenadas Fijas",
    "dificultad": "Intermedio",
    "modalidad": "Depuración",
    "briefing_mision": "El GPS necesita corregir la primera coordenada, pero la lista creada con List.of() es inmutable y no deja modificarla. Crea una lista modificable con el mismo contenido y actualiza la coordenada.",
    "init_code": "",
    "query_defectuoso": "import java.util.List;\n\npublic class Mision {\n    public static void main(String[] args) {\n        List<Integer> coords = List.of(3, 4);\n        coords.set(0, 5);\n        System.out.println(coords);\n    }\n}\n",
    "solution_code": "import java.util.ArrayList;\nimport java.util.List;\n\npublic class Mision {\n    public static void main(String[] args) {\n        List<Integer> coords = new ArrayList<>(List.of(3, 4));\n        coords.set(0, 5);\n        System.out.println(coords);\n    }\n}\n",
    "expected_output": "[5, 4]",
    "explicacion": "List.of() crea una lista inmutable: cualquier llamada a set, add o remove lanza UnsupportedOperationException. Para modificarla hay que copiarla en un ArrayList con new ArrayList<>(List.of(3, 4)).",
    "conceptos": [
      "List.of(...) devuelve una lista inmutable.",
      "new ArrayList<>(otraLista) crea una copia modificable.",
      "Una colección inmutable lanza UnsupportedOperationException al mutarla."
    ],
    "pistas": [
      "Ejecuta el código: verás UnsupportedOperationException en la línea del set.",
      "Envuelve List.of(3, 4) dentro de un new ArrayList<>(...)."
    ],
    "keywords": ["List", "ArrayList", "of", "set", "println"]
  },
  {
    "id_nivel": "mision_15",
    "title": "Agenda Secreta",
    "dificultad": "Intermedio",
    "modalidad": "Terminal",
    "briefing_mision": "La central tiene una agenda de contactos. Consulta el teléfono de un agente, comprueba si otro existe, añade un contacto nuevo, muestra cuántos hay y lista los nombres ordenados.",
    "init_code": "import java.util.HashMap;\nimport java.util.Map;\n\npublic class Mision {\n    public static void main(String[] args) {\n        Map<String, String> agenda = new HashMap<>();\n        // Consulta y muestra la agenda\n    }\n}\n",
    "solution_code": "import java.util.ArrayList;\nimport java.util.Collections;\nimport java.util.HashMap;\nimport java.util.List;\nimport java.util.Map;\n\npublic class Mision {\n    public static void main(String[] args) {\n        Map<String, String> agenda = new HashMap<>();\n        agenda.put(\"Ada\", \"6001\");\n        agenda.put(\"Alan\", \"6002\");\n        System.out.println(agenda.get(\"Ada\"));\n        System.out.println(agenda.containsKey(\"Grace\"));\n        System.out.println(agenda.size());\n\n        List<String> nombres = new ArrayList<>(agenda.keySet());\n        Collections.sort(nombres);\n        for (String n : nombres) {\n            System.out.println(n);\n        }\n    }\n}\n",
    "expected_output": "6001\nfalse\n2\nAda\nAlan",
    "conceptos": [
      "Un HashMap guarda pares clave: valor.",
      "get(clave) devuelve el valor o null si no existe; containsKey dice si está.",
      "keySet() devuelve las claves; Collections.sort las ordena."
    ],
    "pistas": [
      "El teléfono de Ada se obtiene con agenda.get(\"Ada\").",
      "new ArrayList<>(agenda.keySet()) permite ordenar las claves."
    ],
    "keywords": ["Map", "HashMap", "put", "get", "keySet", "Collections"]
  },
  {
    "id_nivel": "mision_16",
    "title": "Filtro de Datos",
    "dificultad": "Intermedio",
    "modalidad": "Terminal",
    "briefing_mision": "El escáner genera una tanda de números. Recorre el array y crea dos listas: una con los pares y otra con los cuadrados de cada valor.",
    "init_code": "import java.util.ArrayList;\nimport java.util.List;\n\npublic class Mision {\n    public static void main(String[] args) {\n        int[] datos = {1, 2, 3, 4, 5, 6};\n        List<Integer> pares = new ArrayList<>();\n        List<Integer> cuadrados = new ArrayList<>();\n        // Rellena las dos listas\n    }\n}\n",
    "solution_code": "import java.util.ArrayList;\nimport java.util.List;\n\npublic class Mision {\n    public static void main(String[] args) {\n        int[] datos = {1, 2, 3, 4, 5, 6};\n        List<Integer> pares = new ArrayList<>();\n        List<Integer> cuadrados = new ArrayList<>();\n        for (int d : datos) {\n            if (d % 2 == 0) {\n                pares.add(d);\n            }\n            cuadrados.add(d * d);\n        }\n        System.out.println(pares);\n        System.out.println(cuadrados);\n    }\n}\n",
    "expected_output": "[2, 4, 6]\n[1, 4, 9, 16, 25, 36]",
    "conceptos": [
      "for (int d : datos) recorre los valores de un array.",
      "new ArrayList<>() crea una lista vacía y modificable.",
      "add() añade al final; println de una lista muestra [a, b, c]."
    ],
    "pistas": [
      "Un número es par si d % 2 == 0.",
      "El cuadrado de d es d * d, y se añade siempre, no solo si es par."
    ],
    "keywords": ["int[]", "List", "ArrayList", "add", "%", "for"]
  },
  {
    "id_nivel": "mision_17",
    "title": "Función del Área",
    "dificultad": "Avanzado",
    "modalidad": "Terminal",
    "briefing_mision": "Construye un método estático que calcule el área de un rectángulo a partir de su base y su altura. Úsalo con dos terrenos distintos y muestra ambos resultados.",
    "init_code": "public class Mision {\n\n    // Declara aquí el método area\n\n    public static void main(String[] args) {\n        System.out.println(area(4, 3));\n        System.out.println(area(10, 2.5));\n    }\n}\n",
    "solution_code": "public class Mision {\n\n    static double area(double base, double altura) {\n        return base * altura;\n    }\n\n    public static void main(String[] args) {\n        System.out.println(area(4, 3));\n        System.out.println(area(10, 2.5));\n    }\n}\n",
    "expected_output": "12.0\n25.0",
    "conceptos": [
      "Un método static se declara con tipo de retorno, nombre y parámetros.",
      "return entrega el resultado y termina el método.",
      "double conserva decimales: por eso 4 * 3 se muestra como 12.0."
    ],
    "pistas": [
      "Firma: static double area(double base, double altura).",
      "El cuerpo es una sola línea: return base * altura;"
    ],
    "keywords": ["static", "double", "return", "println"]
  },
  {
    "id_nivel": "mision_18",
    "title": "Saludo Flexible",
    "dificultad": "Avanzado",
    "modalidad": "Terminal",
    "briefing_mision": "Diseña dos saludos: uno sin argumentos que devuelve un saludo genérico y otro que recibe un nombre. Además, un método que sume cualquier cantidad de números, incluso ninguno. Muestra las cuatro llamadas.",
    "init_code": "public class Mision {\n\n    // Declara aquí saludar() , saludar(String) y sumar(int...)\n\n    public static void main(String[] args) {\n        System.out.println(saludar());\n        System.out.println(saludar(\"Ada\"));\n        System.out.println(sumar(1, 2, 3));\n        System.out.println(sumar());\n    }\n}\n",
    "solution_code": "public class Mision {\n\n    static String saludar() {\n        return \"Hola\";\n    }\n\n    static String saludar(String nombre) {\n        return \"Hola \" + nombre;\n    }\n\n    static int sumar(int... numeros) {\n        int total = 0;\n        for (int n : numeros) {\n            total = total + n;\n        }\n        return total;\n    }\n\n    public static void main(String[] args) {\n        System.out.println(saludar());\n        System.out.println(saludar(\"Ada\"));\n        System.out.println(sumar(1, 2, 3));\n        System.out.println(sumar());\n    }\n}\n",
    "expected_output": "Hola\nHola Ada\n6\n0",
    "conceptos": [
      "Dos métodos con el mismo nombre y distintos parámetros se denominan sobrecarga.",
      "int... numeros declara un parámetro variable (varargs).",
      "Con varargs, el for-each recorre los valores recibidos uno a uno."
    ],
    "pistas": [
      "saludar() y saludar(String) pueden convivir: cambia la firma.",
      "sumar(int... numeros) acepta 0, 1 o muchos argumentos."
    ],
    "keywords": ["static", "String", "int...", "return", "for"]
  },
  {
    "id_nivel": "mision_19",
    "title": "Mapa del Termómetro",
    "dificultad": "Avanzado",
    "modalidad": "Ensamblaje",
    "briefing_mision": "La estación meteorológica perdió el orden de su programa. Coloca las piezas para que recorra las dos mediciones de cada muestra y etiquete cada temperatura como calido o frio.",
    "init_code": "",
    "dnd_blocks": [
      "public class Mision {",
      "    public static void main(String[] args) {",
      "        int[][] muestras = { {18, 24}, {30, 12} };",
      "        for (int[] par : muestras) {",
      "            for (int t : par) {",
      "                if (t >= 20) {",
      "                    System.out.println(t + \" calido\");",
      "                } else {",
      "                    System.out.println(t + \" frio\");",
      "                }",
      "            }",
      "        }",
      "    }",
      "}"
    ],
    "solution_code": "public class Mision {\n    public static void main(String[] args) {\n        int[][] muestras = { {18, 24}, {30, 12} };\n        for (int[] par : muestras) {\n            for (int t : par) {\n                if (t >= 20) {\n                    System.out.println(t + \" calido\");\n                } else {\n                    System.out.println(t + \" frio\");\n                }\n            }\n        }\n    }\n}\n",
    "expected_output": "18 frio\n24 calido\n30 calido\n12 frio",
    "conceptos": [
      "Un array de arrays es una matriz: int[][] guarda filas de int.",
      "El for-each exterior recorre cada fila (int[] par).",
      "El for-each interior recorre cada temperatura (int t).",
      "La condición t >= 20 decide qué rama del if se ejecuta."
    ],
    "pistas": [
      "El bucle de las filas va fuera del bucle de las temperaturas.",
      "La llave del else va pegada al if: } else { en la misma pieza."
    ],
    "keywords": ["int[][]", "for", "if", "else", ">="]
  },
  {
    "id_nivel": "mision_20",
    "title": "Sumario de Turnos",
    "dificultad": "Avanzado",
    "modalidad": "Depuración",
    "briefing_mision": "El panel de turnos muestra un total que no cuadra con los horarios reales. Ejecuta el programa, compara el total con los turnos y corrige la línea que rompe la suma.",
    "init_code": "",
    "query_defectuoso": "public class Mision {\n    public static void main(String[] args) {\n        int[] turnos = {8, 6, 10, 12};\n        int total = 0;\n        for (int i = 0; i < turnos.length; i++) {\n            total = total + i;\n        }\n        System.out.println(\"total \" + total);\n        System.out.println(\"media \" + (total / turnos.length));\n    }\n}\n",
    "solution_code": "public class Mision {\n    public static void main(String[] args) {\n        int[] turnos = {8, 6, 10, 12};\n        int total = 0;\n        for (int i = 0; i < turnos.length; i++) {\n            total = total + turnos[i];\n        }\n        System.out.println(\"total \" + total);\n        System.out.println(\"media \" + (total / turnos.length));\n    }\n}\n",
    "expected_output": "total 36\nmedia 9",
    "explicacion": "Dentro del bucle se estaba sumando i, el índice, en lugar del valor del turno. Sumando los índices 0, 1, 2 y 3 el total era 6; la solución suma turnos[i], que da 8 + 6 + 10 + 12 = 36.",
    "conceptos": [
      "El índice i va de 0 a turnos.length - 1.",
      "turnos[i] accede al turno que toca, i solo es la posición.",
      "La media entera se obtiene con división entre dos int."
    ],
    "pistas": [
      "El total sale mucho más bajo que 8 + 6 + 10 + 12.",
      "Dentro del bucle se está sumando el índice en vez del valor del turno."
    ],
    "keywords": ["for", "i", "turnos[i]", "total"]
  },
  {
    "id_nivel": "mision_21",
    "title": "Semáforo de Envíos",
    "dificultad": "Avanzado",
    "modalidad": "Terminal",
    "briefing_mision": "El centro logístico clasifica sus pedidos con un enum. Recorre los tres estados posibles y muestra, para cada pedido, su posición y su mensaje.",
    "init_code": "public class Mision {\n    enum Pedido {\n        // declara aqui los estados del pedido\n    }\n\n    public static void main(String[] args) {\n        // recorre el array de pedidos y usa switch\n    }\n}\n",
    "solution_code": "public class Mision {\n    enum Pedido { PENDIENTE, ENVIADO, ENTREGADO }\n\n    public static void main(String[] args) {\n        Pedido[] pedidos = { Pedido.ENTREGADO, Pedido.PENDIENTE, Pedido.ENVIADO };\n        for (Pedido p : pedidos) {\n            switch (p) {\n                case PENDIENTE:\n                    System.out.println(\"pedido \" + p.ordinal() + \" pendiente\");\n                    break;\n                case ENVIADO:\n                    System.out.println(\"pedido \" + p.ordinal() + \" en camino\");\n                    break;\n                case ENTREGADO:\n                    System.out.println(\"pedido \" + p.ordinal() + \" completado\");\n                    break;\n            }\n        }\n        System.out.println(Pedido.values().length);\n    }\n}\n",
    "expected_output": "pedido 2 completado\npedido 0 pendiente\npedido 1 en camino\n3",
    "conceptos": [
      "Un enum declara los valores constantes posibles.",
      "ordinal() devuelve la posición del valor empezando en 0.",
      "values() devuelve un array con todos los valores del enum.",
      "switch sobre enum usa los nombres de las constantes, sin comillas."
    ],
    "pistas": [
      "Los estados se escriben separados por comas: PENDIENTE, ENVIADO, ENTREGADO.",
      "En cada case del switch hay un break para no seguir con el siguiente."
    ],
    "keywords": ["enum", "switch", "case", "break", "ordinal()", "values()"]
  },
  {
    "id_nivel": "mision_22",
    "title": "Cálculo de Áreas",
    "dificultad": "Avanzado",
    "modalidad": "Terminal",
    "briefing_mision": "La fábrica necesita una misma receta para cada figura. Crea la interfaz Forma con area() y nombre(), implementa un triángulo y un círculo, y suma todas las áreas en un array de formas.",
    "init_code": "public class Mision {\n    interface Forma {\n        // declara area() y nombre()\n    }\n\n    public static void main(String[] args) {\n        // crea un array Forma con un triángulo y un círculo\n    }\n}\n",
    "solution_code": "public class Mision {\n    interface Forma {\n        double area();\n        String nombre();\n    }\n\n    static class Triangulo implements Forma {\n        double base;\n        double altura;\n        Triangulo(double base, double altura) { this.base = base; this.altura = altura; }\n        public double area() { return base * altura / 2; }\n        public String nombre() { return \"triangulo\"; }\n    }\n\n    static class Circulo implements Forma {\n        double radio;\n        Circulo(double radio) { this.radio = radio; }\n        public double area() { return Math.PI * radio * radio; }\n        public String nombre() { return \"circulo\"; }\n    }\n\n    public static void main(String[] args) {\n        Forma[] formas = { new Triangulo(4, 5), new Circulo(2) };\n        double total = 0;\n        for (Forma f : formas) {\n            System.out.println(f.nombre() + \" \" + f.area());\n            total = total + f.area();\n        }\n        System.out.println(\"total \" + total);\n    }\n}\n",
    "expected_output": "triangulo 10.0\ncirculo 12.566370614359172\ntotal 22.566370614359172",
    "conceptos": [
      "Una interfaz declara métodos que toda clase que la implemente debe definir.",
      "implements Forma obliga a escribir area() y nombre() en la clase.",
      "Un array de interfaz admite clases distintas: eso es polimorfismo.",
      "El bucle llama a area() en la versión de cada objeto."
    ],
    "pistas": [
      "Los métodos de la interfaz se declaran sin cuerpo: double area();",
      "Triangulo(4, 5) usa base 4 y altura 5; Circulo(2) usa radio 2."
    ],
    "keywords": ["interface", "implements", "static class", "new", "for"]
  },
  {
    "id_nivel": "mision_23",
    "title": "Almacén Vacío",
    "dificultad": "Avanzado",
    "modalidad": "Terminal",
    "briefing_mision": "Un pedido sin existencias no debe tumbar el programa. Lanza la excepción, captura el aviso y confirma cada revisión del almacén en el bloque finally.",
    "init_code": "public class Mision {\n    public static void main(String[] args) {\n        int[] stock = {5, 0, 3};\n        int[] pedido = {2, 4, 1};\n        for (int i = 0; i < pedido.length; i++) {\n            // try: lanza la excepcion si no hay stock\n            // catch: muestra el mensaje del error\n            // finally: confirma la revision del item\n        }\n    }\n}\n",
    "solution_code": "public class Mision {\n    public static void main(String[] args) {\n        int[] stock = {5, 0, 3};\n        int[] pedido = {2, 4, 1};\n        for (int i = 0; i < pedido.length; i++) {\n            try {\n                if (stock[i] < pedido[i]) {\n                    throw new IllegalStateException(\"sin stock del item \" + i);\n                }\n                System.out.println(\"enviado \" + pedido[i]);\n            } catch (IllegalStateException e) {\n                System.out.println(\"error: \" + e.getMessage());\n            } finally {\n                System.out.println(\"revisado item \" + i);\n            }\n        }\n    }\n}\n",
    "expected_output": "enviado 2\nrevisado item 0\nerror: sin stock del item 1\nrevisado item 1\nenviado 1\nrevisado item 2",
    "conceptos": [
      "throw lanza una excepción y detiene el bloque actual.",
      "try ejecuta el código que puede fallar.",
      "catch captura la excepción indicada y permite seguir.",
      "finally se ejecuta siempre, haya error o no."
    ],
    "pistas": [
      "El item 1 no tiene existencias: por eso aparece un error en medio.",
      "getMessage() devuelve el texto que se pasó al constructor de la excepción."
    ],
    "keywords": ["try", "throw", "catch", "finally", "getMessage()"]
  },
  {
    "id_nivel": "mision_24",
    "title": "Informe de Tareas",
    "dificultad": "Avanzado",
    "modalidad": "Terminal",
    "briefing_mision": "El informe se compone por partes para no crear una cadena en cada paso. Monta el texto con StringBuilder, numera las tareas con formato y cierra con printf.",
    "init_code": "public class Mision {\n    public static void main(String[] args) {\n        StringBuilder informe = new StringBuilder();\n        String[] tareas = {\"recoger\", \"revisar\", \"enviar\"};\n        // cabecera, separador, lista numerada y pie\n    }\n}\n",
    "solution_code": "public class Mision {\n    public static void main(String[] args) {\n        StringBuilder informe = new StringBuilder();\n        informe.append(\"Informe de \").append(2026).append(\"\\n\");\n        informe.append(\"----------------\\n\");\n        String[] tareas = {\"recoger\", \"revisar\", \"enviar\"};\n        for (int i = 0; i < tareas.length; i++) {\n            informe.append(String.format(\"%d. %s\\n\", i + 1, tareas[i]));\n        }\n        System.out.print(informe.toString());\n        System.out.printf(\"total de tareas: %d%n\", tareas.length);\n        System.out.printf(\"media: %.2f%n\", 2.5);\n    }\n}\n",
    "expected_output": "Informe de 2026\n----------------\n1. recoger\n2. revisar\n3. enviar\ntotal de tareas: 3\nmedia: 2.50",
    "conceptos": [
      "StringBuilder acumula texto con append sin crear cadenas intermedias.",
      "append devuelve el mismo StringBuilder, así que se pueden encadenar.",
      "String.format(\"%d. %s\", ...) rellena los huecos con los valores.",
      "printf imprime con formato: %d entero, %s texto, %.2f double con dos decimales."
    ],
    "pistas": [
      "El \\n dentro de una cadena es el salto de línea.",
      "Usa print en vez de println para no añadir un salto extra al informe."
    ],
    "keywords": ["StringBuilder", "append", "String.format", "printf", "\\n"]
  },
  {
    "id_nivel": "mision_25",
    "title": "Boletín de Notas",
    "dificultad": "Avanzado",
    "modalidad": "Auditoría",
    "briefing_mision": "El boletín declara la nota más alta pero muestra un valor que no es el máximo. Una sola instrucción está al revés: localízala.",
    "init_code": "",
    "audit_tokens": [
      "public class Mision {",
      "    public static void main(String[] args) {",
      "        int[] notas = {5, 8, 2, 10};",
      "        int suma = 0;",
      "        int maxima = notas[0];",
      "        for (int i = 0; i < notas.length; i++) {",
      "            suma = suma + notas[i];",
      "            if (notas[i] < maxima) {",
      "                maxima = notas[i];",
      "            }",
      "        }",
      "        System.out.println(\"suma \" + suma);",
      "        System.out.println(\"maxima \" + maxima);",
      "        System.out.println(\"media \" + (suma / notas.length));",
      "    }",
      "}"
    ],
    "token_error_index": 7,
    "solution_code": "public class Mision {\n    public static void main(String[] args) {\n        int[] notas = {5, 8, 2, 10};\n        int suma = 0;\n        int maxima = notas[0];\n        for (int i = 0; i < notas.length; i++) {\n            suma = suma + notas[i];\n            if (notas[i] > maxima) {\n                maxima = notas[i];\n            }\n        }\n        System.out.println(\"suma \" + suma);\n        System.out.println(\"maxima \" + maxima);\n        System.out.println(\"media \" + (suma / notas.length));\n    }\n}\n",
    "expected_output": "suma 25\nmaxima 10\nmedia 6",
    "explicacion": "La comparación estaba invertida: con notas[i] < maxima la variable se queda siempre con la primera nota (5) en lugar de subir cuando aparece un valor mayor. Lo correcto es notas[i] > maxima, así la máxima termina en 10.",
    "conceptos": [
      "Para guardar el máximo hay que guardar el valor cuando es MAYOR que el actual.",
      "maxima se inicializa con notas[0] para que el bucle tenga con qué comparar."
    ],
    "pistas": [
      "La media y la suma son correctas: solo falla el valor de la máxima.",
      "Fíjate en el signo de la comparación dentro del if."
    ],
    "keywords": ["if", "<", ">", "maxima", "notas[i]"]
  },
  {
    "id_nivel": "mision_26",
    "title": "Nómina del Equipo",
    "dificultad": "Avanzado",
    "modalidad": "Terminal",
    "briefing_mision": "Cada empleado cobra según su categoría. Crea la clase abstracta Empleado con el método abstracto salarioHora(), dos subclases que la implementan y un array que mezcle a ambos.",
    "init_code": "public class Mision {\n    abstract static class Empleado {\n        String nombre;\n        int horas;\n        // constructor, metodo abstracto y nomina()\n    }\n\n    public static void main(String[] args) {\n        // array de empleados con dos categorias distintas\n    }\n}\n",
    "solution_code": "public class Mision {\n    abstract static class Empleado {\n        String nombre;\n        int horas;\n        Empleado(String nombre, int horas) { this.nombre = nombre; this.horas = horas; }\n        abstract double salarioHora();\n        double nomina() { return salarioHora() * horas; }\n        String ficha() { return nombre + \" \" + nomina(); }\n    }\n\n    static class Junior extends Empleado {\n        Junior(String nombre, int horas) { super(nombre, horas); }\n        double salarioHora() { return 12.5; }\n    }\n\n    static class Senior extends Empleado {\n        Senior(String nombre, int horas) { super(nombre, horas); }\n        double salarioHora() { return 22.0; }\n    }\n\n    public static void main(String[] args) {\n        Empleado[] equipo = { new Junior(\"Ana\", 10), new Senior(\"Luis\", 8) };\n        for (Empleado e : equipo) {\n            System.out.println(e.ficha());\n        }\n    }\n}\n",
    "expected_output": "Ana 125.0\nLuis 176.0",
    "conceptos": [
      "Una clase abstracta no se puede instanciar, pero sí usar como tipo.",
      "abstract double salarioHora(); se implementa en cada subclase.",
      "extends Empleado declara la herencia y super(...) inicializa la clase padre.",
      "nomina() usa el método abstracto, así que cada objeto cobra su precio."
    ],
    "pistas": [
      "El método abstracto se escribe sin llaves ni return.",
      "El constructor de la subclase debe llamar a super(nombre, horas)."
    ],
    "keywords": ["abstract class", "extends", "super", "implements", "abstract"]
  },
  {
    "id_nivel": "mision_27",
    "title": "Caja Genérica",
    "dificultad": "Avanzado",
    "modalidad": "Terminal",
    "briefing_mision": "El almacén de la guildia sirve igual para textos y para números. Crea la clase genérica Caja<T> con un valor, un contador de cambios y toString, y úsala con dos tipos distintos.",
    "init_code": "public class Mision {\n    static class Caja<T> {\n        // campo de tipo T, contador y metodos\n    }\n\n    public static void main(String[] args) {\n        // una Caja<String> y una Caja<Integer>\n    }\n}\n",
    "solution_code": "public class Mision {\n    static class Caja<T> {\n        private T valor;\n        private int veces;\n\n        Caja(T valor) { this.valor = valor; this.veces = 0; }\n\n        void guardar(T nuevo) { this.valor = nuevo; this.veces = this.veces + 1; }\n        T sacar() { return valor; }\n        int cambios() { return veces; }\n        public String toString() { return \"Caja(\" + valor + \")\"; }\n    }\n\n    public static void main(String[] args) {\n        Caja<String> textos = new Caja<>(\"vacio\");\n        textos.guardar(\"hola\");\n        textos.guardar(\"adios\");\n        System.out.println(textos);\n        System.out.println(textos.cambios());\n\n        Caja<Integer> numeros = new Caja<>(0);\n        numeros.guardar(42);\n        System.out.println(numeros.sacar() + 1);\n    }\n}\n",
    "expected_output": "Caja(adios)\n2\n43",
    "conceptos": [
      "El parámetro de tipo T permite que la clase trabaje con cualquier tipo.",
      "private oculta el campo para que solo se use dentro de la clase.",
      "new Caja<>(\"vacio\") usa la inferencia de tipo del diamante.",
      "toString() define cómo se muestra un objeto al imprimirlo."
    ],
    "pistas": [
      "El campo es private T valor, y el contador private int veces.",
      "guardar() suma 1 a veces, y cambios() devuelve ese contador."
    ],
    "keywords": ["class Caja<T>", "private", "T", "toString()", "new Caja<>(...)"]
  },
  {
    "id_nivel": "mision_28",
    "title": "Impresor de Líneas",
    "dificultad": "Avanzado",
    "modalidad": "Ensamblaje",
    "briefing_mision": "El módulo de impresión llegó en piezas sueltas. Ordénalas para que el bucle añada tres líneas numeradas al StringBuilder y las muestre de golpe.",
    "init_code": "",
    "dnd_blocks": [
      "public class Mision {",
      "    public static void main(String[] args) {",
      "        StringBuilder sb = new StringBuilder();",
      "        for (int i = 1; i <= 3; i++) {",
      "            sb.append(\"linea \");",
      "            sb.append(i);",
      "            sb.append(\"\\n\");",
      "        }",
      "        System.out.print(sb.toString());",
      "    }",
      "}"
    ],
    "solution_code": "public class Mision {\n    public static void main(String[] args) {\n        StringBuilder sb = new StringBuilder();\n        for (int i = 1; i <= 3; i++) {\n            sb.append(\"linea \");\n            sb.append(i);\n            sb.append(\"\\n\");\n        }\n        System.out.print(sb.toString());\n    }\n}\n",
    "expected_output": "linea 1\nlinea 2\nlinea 3",
    "conceptos": [
      "El StringBuilder debe crearse antes del bucle.",
      "append(\"linea \") escribe texto fijo y append(i) el número de la vuelta.",
      "El salto de línea se añade al final de cada línea con \"\\n\".",
      "print escribe el resultado sin añadir un salto extra."
    ],
    "pistas": [
      "Las llaves del for encierran los tres append.",
      "toString() convierte el StringBuilder en texto para poder imprimirlo."
    ],
    "keywords": ["StringBuilder", "append", "for", "\\n", "toString()"]
  },
  {
    "id_nivel": "mision_29",
    "title": "MCD y Dígitos",
    "dificultad": "Experto",
    "modalidad": "Terminal",
    "briefing_mision": "Dos retos de recursión: el máximo común divisor por Euclides y la suma de los dígitos de un número. Cada función se llama a sí misma hasta llegar al caso base.",
    "init_code": "public class Mision {\n    static int mcd(int a, int b) {\n        // caso base y llamada recursiva\n    }\n\n    public static void main(String[] args) {\n        // llama a las dos funciones\n    }\n}\n",
    "solution_code": "public class Mision {\n    static int mcd(int a, int b) {\n        if (b == 0) {\n            return a;\n        }\n        return mcd(b, a % b);\n    }\n\n    static int sumaDigitos(int n) {\n        if (n == 0) {\n            return 0;\n        }\n        return n % 10 + sumaDigitos(n / 10);\n    }\n\n    public static void main(String[] args) {\n        System.out.println(mcd(48, 18));\n        System.out.println(sumaDigitos(1234));\n    }\n}\n",
    "expected_output": "6\n10",
    "conceptos": [
      "Una función recursiva se llama a sí misma con datos más pequeños.",
      "El caso base corta la recursión y devuelve el resultado.",
      "a % b y a / b con int division entera, sin decimales.",
      "mcd(48, 18) va encogiendo el segundo número hasta llegar a 0."
    ],
    "pistas": [
      "Si b vale 0, el máximo común divisor es a.",
      "El último dígito de un número es n % 10 y el resto son las cifras n / 10."
    ],
    "keywords": ["static", "if", "return", "%", "/"]
  },
  {
    "id_nivel": "mision_30",
    "title": "Almacén Ordenado",
    "dificultad": "Experto",
    "modalidad": "Terminal",
    "briefing_mision": "Las existencias están en un mapa artículo-cantidad, pero salen desordenadas. Pásalas a una lista, ordénalas por clave y localiza el artículo con más unidades.",
    "init_code": "import java.util.ArrayList;\nimport java.util.Collections;\nimport java.util.HashMap;\nimport java.util.List;\nimport java.util.Map;\n\npublic class Mision {\n    public static void main(String[] args) {\n        Map<String, Integer> almacen = new HashMap<>();\n        // carga tres articulos\n        // lista ordenada de claves\n    }\n}\n",
    "solution_code": "import java.util.ArrayList;\nimport java.util.Collections;\nimport java.util.HashMap;\nimport java.util.List;\nimport java.util.Map;\n\npublic class Mision {\n    public static void main(String[] args) {\n        Map<String, Integer> almacen = new HashMap<>();\n        almacen.put(\"arroz\", 3);\n        almacen.put(\"lentejas\", 7);\n        almacen.put(\"aceite\", 1);\n\n        List<String> claves = new ArrayList<>(almacen.keySet());\n        Collections.sort(claves);\n        for (String clave : claves) {\n            System.out.println(clave + \" x\" + almacen.get(clave));\n        }\n        System.out.println(\"total \" + almacen.size());\n        int maximo = 0;\n        String articulo = \"\";\n        for (String clave : claves) {\n            if (almacen.get(clave) > maximo) {\n                maximo = almacen.get(clave);\n                articulo = clave;\n            }\n        }\n        System.out.println(\"mayor \" + articulo + \" \" + maximo);\n    }\n}\n",
    "expected_output": "aceite x1\narroz x3\nlentejas x7\ntotal 3\nmayor lentejas 7",
    "conceptos": [
      "Map<String, Integer> guarda pares clave-valor.",
      "put(clave, valor) añade o reemplaza, get(clave) recupera el valor.",
      "keySet() devuelve las claves, que se copian en una ArrayList para ordenarlas.",
      "Collections.sort ordena la lista; un HashMap no mantiene el orden de inserción."
    ],
    "pistas": [
      "Sin ordenar, el mapa devolvería las claves en otro orden.",
      "size() da el número de artículos guardados."
    ],
    "keywords": ["Map", "HashMap", "ArrayList", "Collections.sort", "keySet()", "get"]
  },
  {
    "id_nivel": "mision_31",
    "title": "Lista de Debate",
    "dificultad": "Experto",
    "modalidad": "Auditoría",
    "briefing_mision": "La lista de participantes imprime los nombres recortados: la primera letra desaparece en cada uno. Una sola instrucción está mal escrita.",
    "init_code": "",
    "audit_tokens": [
      "public class Mision {",
      "    public static void main(String[] args) {",
      "        String nombres = \"Ana,Luis,Marta\";",
      "        String[] partes = nombres.split(\",\");",
      "        for (int i = 0; i < partes.length; i++) {",
      "            String n = partes[i].trim();",
      "            System.out.println((i + 1) + \". \" + n.toUpperCase());",
      "        }",
      "        System.out.println(\"total \" + partes.length);",
      "    }",
      "}"
    ],
    "token_error_index": 5,
    "solution_code": "public class Mision {\n    public static void main(String[] args) {\n        String nombres = \"Ana,Luis,Marta\";\n        String[] partes = nombres.split(\",\");\n        for (int i = 0; i < partes.length; i++) {\n            String n = partes[i].trim().substring(1);\n            System.out.println((i + 1) + \". \" + n.toUpperCase());\n        }\n        System.out.println(\"total \" + partes.length);\n    }\n}\n",
    "expected_output": "1. NA\n2. UIS\n3. ARTA\ntotal 3",
    "explicacion": "substring(1) devuelve el texto desde la posición 1, es decir, sin la primera letra: Ana se convertía en NA. La solución usa solo trim(), que quita los espacios sobrantes y conserva el nombre entero.",
    "conceptos": [
      "substring(inicio) corta la cadena desde la posición indicada.",
      "substring(0) devuelve la cadena completa, así que es un error común.",
      "trim() elimina los espacios de los extremos y no toca las letras."
    ],
    "pistas": [
      "El número de participantes y el total salen bien: solo falla el nombre.",
      "Compara lo que imprime el código con lo que debería imprimir."
    ],
    "keywords": ["split", "trim()", "substring", "toUpperCase()"]
  },
  {
    "id_nivel": "mision_32",
    "title": "Cuadrilla de Agentes",
    "dificultad": "Experto",
    "modalidad": "Ensamblaje",
    "briefing_mision": "El planificador reparte misiones entre los agentes, pero su programa se ha desmontado. Vuelve a colocar las piezas del mapa para mostrar el trabajo de cada agente y cuántos hay en total.",
    "init_code": "",
    "dnd_blocks": [
      "public class Mision {",
      "    public static void main(String[] args) {",
      "        String[] agentes = {\"Ada\", \"Alan\"};",
      "        java.util.Map<String, Integer> misiones = new java.util.HashMap<>();",
      "        for (int i = 0; i < agentes.length; i++) {",
      "            misiones.put(agentes[i], (i + 1) * 10);",
      "        }",
      "        for (String agente : agentes) {",
      "            System.out.println(agente + \" -> \" + misiones.get(agente));",
      "        }",
      "        System.out.println(\"agentes \" + misiones.size());",
      "    }",
      "}"
    ],
    "solution_code": "public class Mision {\n    public static void main(String[] args) {\n        String[] agentes = {\"Ada\", \"Alan\"};\n        java.util.Map<String, Integer> misiones = new java.util.HashMap<>();\n        for (int i = 0; i < agentes.length; i++) {\n            misiones.put(agentes[i], (i + 1) * 10);\n        }\n        for (String agente : agentes) {\n            System.out.println(agente + \" -> \" + misiones.get(agente));\n        }\n        System.out.println(\"agentes \" + misiones.size());\n    }\n}\n",
    "expected_output": "Ada -> 10\nAlan -> 20\nagentes 2",
    "conceptos": [
      "Un mapa con el nombre completo de la clase, java.util.HashMap, evita importar.",
      "El primer bucle reparte las misiones del array y las guarda en el mapa.",
      "El segundo bucle recorre los agentes y lee su misión con get.",
      "size() devuelve cuántos agentes tienen misión asignada."
    ],
    "pistas": [
      "El bucle que rellena el mapa va antes del que lo lee.",
      "Cada agente recibe (i + 1) * 10 misiones, así que 10 y 20."
    ],
    "keywords": ["java.util.Map", "java.util.HashMap", "put", "get", "for", "size()"]
  }
];
