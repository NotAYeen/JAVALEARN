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
  }
];
