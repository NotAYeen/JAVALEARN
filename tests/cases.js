// Casos de referencia: cada fragmento se ejecutó con OpenJDK 17 real y su salida
// quedó grabada en tests/fixtures/differential.json. Regenera el fixture con:
//   node scripts/record-differential.mjs

export const CASES = [
  {
    "name": "hola",
    "code": "public class Mision { public static void main(String[] args) { System.out.println(\"Hola, Java!\"); } }"
  },
  {
    "name": "literales",
    "code": "public class Mision { public static void main(String[] args) {\nSystem.out.println(42);\nSystem.out.println(3.5);\nSystem.out.println(0.1 + 0.2);\nSystem.out.println(100L);\nSystem.out.println(1.0f);\nSystem.out.println(1e10);\nSystem.out.println(1.0e-5);\nSystem.out.println(1.0e7);\nSystem.out.println(0.0001);\nSystem.out.println(true);\nSystem.out.println('A');\nSystem.out.println(\"tab\\there\");\nSystem.out.println(1000000);\nSystem.out.println(1.0 / 3.0);\nSystem.out.println((float) 1.1);\n} }"
  },
  {
    "name": "aritmetica",
    "code": "public class Mision { public static void main(String[] args) {\nSystem.out.println(17 / 5);\nSystem.out.println(17 % 5);\nSystem.out.println(-17 / 5);\nSystem.out.println(-17 % 5);\nSystem.out.println(17.0 / 5);\nSystem.out.println(-7 / 2.0);\nSystem.out.println(2147483647 + 1);\nSystem.out.println(5 & 3);\nSystem.out.println(5 | 3);\nSystem.out.println(5 ^ 3);\nSystem.out.println(1 << 10);\nSystem.out.println(-16 >> 2);\nSystem.out.println(-16 >>> 28);\nSystem.out.println(~5);\n} }"
  },
  {
    "name": "cadenas",
    "code": "public class Mision { public static void main(String[] args) {\nString s = \"Hola\";\nSystem.out.println(s + \" \" + 42);\nSystem.out.println(s.length());\nSystem.out.println(s.charAt(1));\nSystem.out.println(s.toUpperCase() + s.toLowerCase());\nSystem.out.println(s.indexOf('l'));\nSystem.out.println(s.contains(\"ol\"));\nSystem.out.println(s.startsWith(\"Ho\") && s.endsWith(\"a\"));\nSystem.out.println(s.replace('l', 'L'));\nSystem.out.println(\"a,b,c\".split(\",\").length);\nSystem.out.println(String.join(\"-\", \"x\", \"y\", \"z\"));\nSystem.out.println(\"  padded  \".trim() + \"|\");\nSystem.out.println(\"abc\".compareTo(\"abd\"));\nSystem.out.println(\"x\".repeat(3));\nSystem.out.println(String.valueOf(1.0));\n} }"
  },
  {
    "name": "conversiones",
    "code": "public class Mision { public static void main(String[] args) {\nSystem.out.println((int) 3.99);\nSystem.out.println((int) -3.99);\nSystem.out.println((long) 1e18);\nSystem.out.println((double) 7 / 2);\nSystem.out.println((float) 7 / 2);\nSystem.out.println((char) 66);\nSystem.out.println((int) 'A');\nSystem.out.println(\"\" + (char) 66);\nSystem.out.println(Integer.parseInt(\"123\") + 1);\nSystem.out.println(Integer.toString(255, 16));\nSystem.out.println(Long.parseLong(\"900000\"));\nSystem.out.println(Double.parseDouble(\"2.5\"));\nSystem.out.println(Character.isDigit('7'));\nSystem.out.println(Character.toUpperCase('q'));\nSystem.out.println(Boolean.parseBoolean(\"TRUE\"));\n} }"
  },
  {
    "name": "condicionales",
    "code": "public class Mision { public static void main(String[] args) {\nint n = 7;\nif (n % 2 == 0) System.out.println(\"par\"); else System.out.println(\"impar\");\nString t = n > 5 ? \"grande\" : \"chico\";\nSystem.out.println(t);\nboolean a = true, b = false;\nSystem.out.println(a && b);\nSystem.out.println(a || b);\nSystem.out.println(!a);\nSystem.out.println(1 < 2 == true);\n} }"
  },
  {
    "name": "bucles",
    "code": "public class Mision { public static void main(String[] args) {\nint s = 0;\nfor (int i = 0; i < 5; i++) s += i;\nSystem.out.println(s);\nint k = 0;\nwhile (k < 3) { k++; }\nSystem.out.println(k);\nint d = 0;\ndo { d++; } while (d < 4);\nSystem.out.println(d);\nint[] arr = {1, 2, 3, 4, 5};\nint t = 0;\nfor (int v : arr) t += v;\nSystem.out.println(t);\nint w = 0;\nouter: for (int i = 0; i < 3; i++) { for (int j = 0; j < 3; j++) { if (j == 1) continue; w += i * 10 + j; } }\nSystem.out.println(w);\nint n = 0;\nloop: while (true) { n++; if (n == 3) break loop; }\nSystem.out.println(n);\n} }"
  },
  {
    "name": "arreglos",
    "code": "public class Mision { public static void main(String[] args) {\nint[] a = {5, 3, 9, 1};\nSystem.out.println(a.length);\nSystem.out.println(a[0] + a[3]);\na[1] = 30;\nSystem.out.println(a[1]);\nint[][] m = {{1, 2}, {3, 4}};\nSystem.out.println(m[1][0]);\nSystem.out.println(m[0].length);\nint[] b = new int[3];\nSystem.out.println(b[0]);\nString[] s = {\"hola\", \"adios\"};\nSystem.out.println(s[1]);\nSystem.out.println(new int[]{7, 8, 9}[2]);\n} }"
  },
  {
    "name": "var",
    "code": "public class Mision { public static void main(String[] args) {\nvar n = 5;\nvar d = 1.5;\nvar s = \"texto\";\nvar t = true;\nvar c = 'z';\nSystem.out.println(n);\nSystem.out.println(d);\nSystem.out.println(s);\nSystem.out.println(t);\nSystem.out.println(c);\nvar lista = new int[]{1, 2};\nSystem.out.println(lista[0] + lista[1]);\n} }"
  },
  {
    "name": "clases",
    "code": "public class Mision {\n    static class Caja {\n        int valor;\n        static int contador = 0;\n        Caja(int v) { this.valor = v; contador++; }\n        int get() { return valor; }\n        void set(int v) { this.valor = v; }\n        int doble() { return valor * 2; }\n        public String toString() { return \"Caja(\" + valor + \")\"; }\n    }\n    public static void main(String[] args) {\n        Caja c = new Caja(5);\n        System.out.println(c.get());\n        c.set(9);\n        System.out.println(c.doble());\n        System.out.println(c);\n        Caja d = new Caja(1);\n        System.out.println(Caja.contador);\n        System.out.println(c.equals(d));\n        System.out.println(c == d);\n        System.out.println(c instanceof Caja);\n    }\n}"
  },
  {
    "name": "herencia",
    "code": "public class Mision {\n    static class Animal {\n        protected String nombre;\n        Animal(String n) { this.nombre = n; }\n        String sonido() { return \"...\"; }\n        String getNombre() { return nombre; }\n    }\n    static class Perro extends Animal {\n        Perro(String n) { super(n); }\n        @Override String sonido() { return \"Guau\"; }\n        String ladrido() { return getNombre() + \": \" + sonido(); }\n    }\n    public static void main(String[] args) {\n        Perro p = new Perro(\"Rex\");\n        System.out.println(p.ladrido());\n        Animal a = p;\n        System.out.println(a.sonido());\n        System.out.println(a.getNombre());\n        System.out.println(a instanceof Perro);\n    }\n}"
  },
  {
    "name": "interfaces",
    "code": "public class Mision {\n    interface Saludo { String texto(); default String linea() { return \">\" + texto(); } }\n    static class Saludador implements Saludo {\n        String quien;\n        Saludador(String q) { quien = q; }\n        public String texto() { return \"Hola \" + quien; }\n    }\n    public static void main(String[] args) {\n        Saludo s = new Saludador(\"Ana\");\n        System.out.println(s.texto());\n        System.out.println(s.linea());\n    }\n}"
  },
  {
    "name": "enum",
    "code": "public class Mision {\n    enum Color {\n        ROJO, VERDE, AZUL;\n        final int codigo;\n        Color() { this.codigo = ordinal() + 1; }\n        int getCodigo() { return codigo; }\n    }\n    public static void main(String[] args) {\n        Color c = Color.VERDE;\n        System.out.println(c);\n        System.out.println(c.ordinal());\n        System.out.println(c.name());\n        System.out.println(c.getCodigo());\n        System.out.println(Color.values().length);\n        System.out.println(Color.valueOf(\"AZUL\").ordinal());\n        for (Color x : Color.values()) System.out.print(x + \" \");\n        System.out.println();\n        switch (c) { case ROJO: System.out.println(\"r\"); break; case VERDE: System.out.println(\"v\"); break; default: System.out.println(\"otro\"); }\n    }\n}"
  },
  {
    "name": "record",
    "code": "public class Mision {\n    record Punto(int x, int y) {\n        int suma() { return x + y; }\n    }\n    public static void main(String[] args) {\n        Punto p = new Punto(3, 4);\n        System.out.println(p.x());\n        System.out.println(p.y());\n        System.out.println(p.suma());\n        System.out.println(p);\n        System.out.println(p.equals(new Punto(3, 4)));\n    }\n}"
  },
  {
    "name": "excepciones",
    "code": "public class Mision {\n    static class MiError extends Exception {\n        int codigo;\n        MiError(String m, int c) { super(m); codigo = c; }\n    }\n    static int risky(int n) throws MiError {\n        if (n < 0) throw new MiError(\"negativo\", 1);\n        return n * 2;\n    }\n    public static void main(String[] args) {\n        try {\n            System.out.println(risky(5));\n            System.out.println(risky(-1));\n        } catch (MiError e) {\n            System.out.println(\"error \" + e.getMessage() + \" \" + e.codigo);\n        } finally {\n            System.out.println(\"fin\");\n        }\n        try { int z = 10 / 0; } catch (ArithmeticException e) { System.out.println(\"div\"); }\n        try { Integer.parseInt(\"x\"); } catch (NumberFormatException e) { System.out.println(e.getMessage()); }\n        try { String s = null; s.length(); } catch (NullPointerException e) { System.out.println(\"npe\"); }\n        try {\n            try { throw new IllegalStateException(\"a\"); } finally { System.out.println(\"f1\"); }\n        } catch (RuntimeException e) { System.out.println(\"caught \" + e.getMessage()); }\n        try { throw new IllegalArgumentException(\"iae\"); } catch (IllegalArgumentException | NullPointerException e) { System.out.println(\"multi\"); }\n    }\n}"
  },
  {
    "name": "switch-moderno",
    "code": "public class Mision {\n    static String clase(int n) {\n        return switch (n) {\n            case 1 -> \"uno\";\n            case 2, 3 -> \"pocos\";\n            default -> \"muchos\";\n        };\n    }\n    public static void main(String[] args) {\n        System.out.println(clase(1));\n        System.out.println(clase(3));\n        System.out.println(clase(9));\n        int dia = 3;\n        String nombre = switch (dia) {\n            case 1: yield \"lunes\"; break;\n            default: yield \"otro\";\n        };\n        System.out.println(nombre);\n        String texto = \"hola\";\n        switch (texto) {\n            case \"hola\" -> System.out.println(\"saludo\");\n            case \"adios\" -> System.out.println(\"despedida\");\n            default -> System.out.println(\"?\");\n        }\n    }\n}"
  },
  {
    "name": "lambdas",
    "code": "public class Mision {\n    interface Operacion { int aplicar(int a, int b); }\n    static int aplicar(Operacion op, int a, int b) { return op.aplicar(a, b); }\n    public static void main(String[] args) {\n        Operacion suma = (a, b) -> a + b;\n        System.out.println(aplicar(suma, 2, 3));\n        System.out.println(aplicar((a, b) -> a * b, 4, 5));\n        System.out.println(aplicar((a, b) -> {\n            int r = a - b;\n            return r * 2;\n        }, 10, 4));\n        Operacion cuerpo = (a, b) -> { return Math.max(a, b); };\n        System.out.println(aplicar(cuerpo, 8, 9));\n    }\n}"
  },
  {
    "name": "stringbuilder",
    "code": "public class Mision {\n    public static void main(String[] args) {\n        StringBuilder sb = new StringBuilder();\n        sb.append(\"Hola\");\n        sb.append(' ');\n        sb.append(42);\n        sb.append(true);\n        System.out.println(sb.toString());\n        System.out.println(sb.length());\n        StringBuilder b2 = new StringBuilder(\"abc\");\n        b2.insert(0, \"x\");\n        System.out.println(b2);\n        b2.reverse();\n        System.out.println(b2);\n        System.out.println(new StringBuilder(\"hola\").append('!'));\n    }\n}"
  },
  {
    "name": "math",
    "code": "public class Mision {\n    public static void main(String[] args) {\n        System.out.println(Math.abs(-5));\n        System.out.println(Math.max(3, 7));\n        System.out.println(Math.min(3, 7));\n        System.out.println(Math.sqrt(2.0));\n        System.out.println(Math.pow(2, 10));\n        System.out.println(Math.floor(2.7));\n        System.out.println(Math.ceil(2.1));\n        System.out.println(Math.round(2.5));\n        System.out.println(Math.round(-2.5));\n        System.out.println(Math.PI);\n        System.out.println(3.0 / 0.0);\n        System.out.println(-3.0 / 0.0);\n        System.out.println(0.0 / 0.0);\n        System.out.println((int) Math.abs(-2.7));\n    }\n}"
  },
  {
    "name": "printf",
    "code": "public class Mision {\n    public static void main(String[] args) {\n        System.out.printf(\"%d %s %f%n\", 5, \"x\", 2.5);\n        System.out.printf(\"%5d|%-5d|%05d%n\", 42, 42, 42);\n        System.out.printf(\"%.3f %.1f%n\", 3.14159, 2.55);\n        System.out.printf(\"%s%n\", true);\n        System.out.printf(\"%,d%n\", 1234567);\n        System.out.printf(\"%x %X %o%n\", 255, 255, 8);\n        System.out.printf(\"100%% listo%n\");\n    }\n}"
  },
  {
    "name": "sobrecarga",
    "code": "public class Mision {\n    static class Calc {\n        int sumar(int a, int b) { return a + b; }\n        double sumar(double a, double b) { return a + b; }\n        String sumar(String a, String b) { return a + b; }\n        int sumar(int a, int b, int c) { return a + b + c; }\n    }\n    static int f(int x) { return x * 2; }\n    static double f(double x) { return x / 2; }\n    public static void main(String[] args) {\n        Calc c = new Calc();\n        System.out.println(c.sumar(1, 2));\n        System.out.println(c.sumar(1.5, 2.5));\n        System.out.println(c.sumar(\"a\", \"b\"));\n        System.out.println(c.sumar(1, 2, 3));\n        System.out.println(f(4));\n        System.out.println(f(4.0));\n    }\n}"
  },
  {
    "name": "final-y-estatica",
    "code": "public class Mision {\n    static final int LIMITE = 10;\n    static int total = 0;\n    static { total = LIMITE * 2; }\n    public static void main(String[] args) {\n        System.out.println(LIMITE);\n        System.out.println(total);\n        final int x = 5;\n        System.out.println(x);\n    }\n}"
  },
  {
    "name": "inicializadores",
    "code": "public class Mision {\n    static class A {\n        int v;\n        { v = 1; System.out.println(\"bloque\"); }\n        A() { v += 10; }\n    }\n    static class B extends A {\n        int w;\n        { w = 2; System.out.println(\"bloque B\"); }\n        B() { super(); w *= 3; }\n    }\n    public static void main(String[] args) {\n        B b = new B();\n        System.out.println(b.v);\n        System.out.println(b.w);\n    }\n}"
  },
  {
    "name": "varargs",
    "code": "public class Mision {\n    static int suma(int... nums) {\n        int t = 0;\n        for (int n : nums) t += n;\n        return t;\n    }\n    static String unir(String sep, String... partes) {\n        String r = \"\";\n        for (String p : partes) r += sep + p;\n        return r;\n    }\n    public static void main(String[] args) {\n        System.out.println(suma(1, 2, 3));\n        System.out.println(suma());\n        System.out.println(unir(\"-\", \"a\", \"b\", \"c\"));\n        System.out.println(suma(10, 20));\n    }\n}"
  },
  {
    "name": "orden-eval",
    "code": "public class Mision {\n    static String p = \"campo\";\n    static String leer() { return p; }\n    public static void main(String[] args) {\n        System.out.println(leer());\n    }\n}"
  },
  {
    "name": "listas",
    "code": "import java.util.ArrayList;\nimport java.util.List;\npublic class Mision {\n  public static void main(String[] args) {\n    List<String> l = new ArrayList<>();\n    l.add(\"a\"); l.add(\"b\");\n    System.out.println(l.size());\n    System.out.println(l.get(0) + l.get(1));\n    for (String s : l) System.out.print(s + \"-\");\n    System.out.println();\n    int[] arr = {3, 1, 2};\n    java.util.Arrays.sort(arr);\n    System.out.println(java.util.Arrays.toString(arr));\n  }\n}"
  },
  {
    "name": "mapas",
    "code": "import java.util.HashMap;\nimport java.util.Map;\npublic class Mision {\n  public static void main(String[] args) {\n    Map<String, Integer> m = new HashMap<>();\n    m.put(\"a\", 1);\n    m.put(\"b\", 2);\n    System.out.println(m.get(\"a\") + m.get(\"b\"));\n    System.out.println(m.containsKey(\"c\"));\n    System.out.println(m.size());\n  }\n}"
  },
  {
    "name": "abstracta",
    "code": "public class Mision {\n  abstract static class Figura {\n    abstract double area();\n    String nombre() { return \"figura \" + area(); }\n  }\n  static class Cuad extends Figura {\n    double l; Cuad(double l) { this.l = l; }\n    double area() { return l * l; }\n  }\n  public static void main(String[] args) {\n    Figura f = new Cuad(3);\n    System.out.println(f.nombre());\n    System.out.println(f instanceof Cuad);\n  }\n}"
  },
  {
    "name": "interfaz-estatica",
    "code": "public class Mision {\n  interface Matematica {\n    static int dobro(int x) { return x * 2; }\n    int aplica(int x);\n  }\n  public static void main(String[] args) {\n    System.out.println(Matematica.dobro(21));\n    Matematica m = x -> x + 1;\n    System.out.println(m.aplica(41));\n  }\n}"
  },
  {
    "name": "cadenas2",
    "code": "public class Mision {\n  public static void main(String[] args) {\n    String s = \"Java\";\n    System.out.println(s.toUpperCase() + \" \" + s.length() + \" \" + s.charAt(0));\n    System.out.println(\"a-b-c\".split(\"-\").length);\n    System.out.println(String.format(\"%s tiene %d\", \"x\", 5));\n    char[] cs = {'h', 'o', 'l', 'a'};\n    System.out.println(new String(cs));\n    System.out.println(\"  Hola  \".strip() + \"|\" + \"x\".repeat(3) + \"|\" + \"abc\".substring(1, 3));\n  }\n}"
  },
  {
    "name": "numeros",
    "code": "public class Mision {\n  public static void main(String[] args) {\n    long l = 9_000_000_000L;\n    System.out.println(l);\n    System.out.println((int) l);\n    System.out.println(Integer.MAX_VALUE + 1);\n    System.out.println(Long.MAX_VALUE);\n    System.out.println((float) 1 / 3);\n    System.out.println(0.1 + 0.2);\n    System.out.println(7 / 2.0);\n    System.out.println(Math.abs(-5) + \" \" + Math.max(2, 3) + \" \" + (int) Math.min(2.5, 1.5));\n    System.out.println(Integer.toBinaryString(5) + \" \" + Integer.parseInt(\"ff\", 16));\n  }\n}"
  }
];
