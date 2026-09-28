export const JavaDocs = [
    {
        "category": "Salida por consola",
        "items": [
            { "name": "System.out.println()", "desc": "Escribe un valor y salta de línea. Acepta cualquier tipo: texto, int, double o boolean.", "example": "System.out.println(\"Hola, mundo\");\n// Hola, mundo" },
            { "name": "System.out.print()", "desc": "Igual que println pero sin salto de línea final.", "example": "System.out.print(\"A\");\nSystem.out.print(\"B\");\n// AB" },
            { "name": "System.out.printf()", "desc": "Imprime con formato estilo C: %s texto, %d entero, %f decimal, %n salto de línea.", "example": "System.out.printf(\"%s tiene %d puntos%n\", \"Ada\", 95);\n// Ada tiene 95 puntos" },
            { "name": "String.format()", "desc": "Devuelve un texto con formato en lugar de imprimirlo.", "example": "String s = String.format(\"%.2f\", 3.14159);\n// s vale \"3.14\"" }
        ]
    },
    {
        "category": "Tipos y variables",
        "items": [
            { "name": "int / long", "desc": "Números enteros. int va de -2.147.483.647 a 2.147.483.647; long usa 64 bits.", "example": "int edad = 36;\nlong grande = 9000000000L;" },
            { "name": "double / float", "desc": "Números con decimales. double es el tipo habitual; float tiene menos precisión.", "example": "double precio = 19.99;\nfloat f = 1.5f;" },
            { "name": "boolean", "desc": "Solo admite true o false.", "example": "boolean activo = true;" },
            { "name": "char", "desc": "Un único carácter entre comillas simples.", "example": "char inicial = 'A';" },
            { "name": "String", "desc": "Texto inmutable entre comillas dobles. No es un tipo primitivo.", "example": "String nombre = \"Ada\";\nint largo = nombre.length();" },
            { "name": "var", "desc": "Java 10+ deduce el tipo de la variable a partir del valor.", "example": "var total = 3 + 4;  // int" }
        ]
    },
    {
        "category": "Operadores",
        "items": [
            { "name": "Aritméticos", "desc": "+ suma, - resta, * multiplica, / divide y % devuelve el resto.", "example": "int a = 10, b = 3;\nSystem.out.println(a / b);   // 3\nSystem.out.println(a % b);   // 1" },
            { "name": "División con decimales", "desc": "Si ambos operandos son int, la división es entera. Convierte con (double).", "example": "System.out.println((double) 10 / 3);\n// 3.3333333333333335" },
            { "name": "Incremento", "desc": "++ y -- suman o restan 1.", "example": "int i = 0;\ni++;\nSystem.out.println(i);  // 1" },
            { "name": "Comparación", "desc": "== != < > <= >= comparan valores; && || ! combinan condiciones.", "example": "if (edad >= 18 && edad < 65) {\n    System.out.println(\"en rango\");\n}" },
            { "name": "Concatenación", "desc": "El signo + une textos. Si un operando es String, el otro se convierte.", "example": "int p = 95;\nSystem.out.println(\"Puntaje: \" + p);\n// Puntaje: 95" }
        ]
    },
    {
        "category": "Estructuras de control",
        "items": [
            { "name": "if / else if / else", "desc": "Ejecuta un bloque u otro según una condición booleana.", "example": "if (a > b) {\n    System.out.println(\"mayor\");\n} else {\n    System.out.println(\"menor\");\n}" },
            { "name": "for", "desc": "Repite un bloque un número determinado de veces. El cuerpo se delimita con llaves.", "example": "for (int i = 1; i <= 5; i++) {\n    System.out.println(i);\n}" },
            { "name": "for-each", "desc": "Recorre los elementos de un array o de una colección.", "example": "String[] noms = {\"Ada\", \"Alan\"};\nfor (String n : noms) {\n    System.out.println(n);\n}" },
            { "name": "while / do-while", "desc": "while repite mientras la condición sea cierta; do-while ejecuta al menos una vez.", "example": "int n = 3;\nwhile (n > 0) {\n    System.out.println(n);\n    n--;\n}" },
            { "name": "break / continue", "desc": "break sale del bucle; continue salta a la siguiente iteración.", "example": "for (int i = 1; i <= 5; i++) {\n    if (i == 3) continue;\n    System.out.println(i);\n}" },
            { "name": "switch", "desc": "Selecciona un caso según el valor de una expresión. break corta el caso.", "example": "switch (dia) {\n    case 1: System.out.println(\"lunes\"); break;\n    default: System.out.println(\"otro\");\n}" }
        ]
    },
    {
        "category": "Métodos y clases",
        "items": [
            { "name": "public static void main", "desc": "Punto de entrada del programa. static permite llamarlo sin crear objetos.", "example": "public static void main(String[] args) {\n    System.out.println(\"Hola\");\n}" },
            { "name": "Parámetros y retorno", "desc": "Un método declara sus parámetros y el tipo que devuelve. void significa que no devuelve nada.", "example": "static int suma(int a, int b) {\n    return a + b;\n}" },
            { "name": "class", "desc": "Plantilla con atributos y métodos. Los atributos se declaran con tipo y nombre.", "example": "class Perro {\n    String nombre;\n    void ladrar() {\n        System.out.println(\"guau\");\n    }\n}" },
            { "name": "new y this", "desc": "new crea un objeto; this apunta al objeto actual.", "example": "Perro p = new Perro();\np.nombre = \"Rex\";" },
            { "name": "extends / super", "desc": "extends hereda de otra clase; super(...) llama al constructor padre.", "example": "class Cachorro extends Perro {\n    Cachorro() {\n        super();\n    }\n}" },
            { "name": "Modificadores", "desc": "public/private/protected control el acceso; static pertenece a la clase; final no se reasigna.", "example": "private static final int MAX = 10;" }
        ]
    },
    {
        "category": "Excepciones",
        "items": [
            { "name": "try / catch", "desc": "Captura las excepciones en tiempo de ejecución para que el programa continúe.", "example": "try {\n    int n = Integer.parseInt(\"abc\");\n} catch (NumberFormatException e) {\n    System.out.println(\"no válido\");\n}" },
            { "name": "throw", "desc": "Lanza una excepción manualmente.", "example": "if (edad < 0) {\n    throw new IllegalArgumentException(\"edad inválida\");\n}" },
            { "name": "ArithmeticException", "desc": "Error clásico al dividir entre cero.", "example": "int a = 1, b = 0;\nSystem.out.println(a / b);  // ArithmeticException" }
        ]
    },
    {
        "category": "Colecciones y utilidades",
        "items": [
            { "name": "ArrayList", "desc": "Lista ordenada y modificable. Se crea con new ArrayList<>().", "example": "List<String> l = new ArrayList<>();\nl.add(\"Ada\");\nl.add(\"Alan\");" },
            { "name": "HashMap", "desc": "Mapa de clave a valor. get devuelve null si la clave no existe.", "example": "Map<String, Integer> m = new HashMap<>();\nm.put(\"Ada\", 36);\nint e = m.get(\"Ada\");" },
            { "name": "HashSet", "desc": "Conjunto sin elementos repetidos.", "example": "Set<String> s = new HashSet<>();\ns.add(\"A\");\ns.add(\"A\");\nSystem.out.println(s.size());  // 1" },
            { "name": "String.length()", "desc": "Devuelve el número de caracteres del texto.", "example": "System.out.println(\"Java\".length());  // 4" },
            { "name": "String.toUpperCase()", "desc": "Devuelve una copia del texto en mayúsculas.", "example": "System.out.println(\"hola\".toUpperCase());\n// HOLA" }
        ]
    }
];
