# JavaLearn

Ruta interactiva y accesible para aprender Java de cero a nivel intermedio,
dentro del navegador y sin instalar nada.

- **Web:** https://notayeen.github.io/javalearn/
- **Licencia:** ISC
- **Publicación:** GitHub Pages, sitio estático sin servidor

## Qué problema resuelve

La mayoría de cursos de Java para principiantes obligan a instalar un JDK, un
IDE y a dealear con errores de compilación en inglés antes de escribir la
primera línea. JavaLearn quita las tres barreras: escribes Java en el
navegador, pulsas ejecutar y lees el resultado al instante, también desde el
móvil.

## Por qué un intérprete propio

La primera versión de este proyecto usó CheerpJ para compilar Java de verdad en
el navegador. Se descartó tras medirlo, y estos son los números:

| | CheerpJ 2.3 | Intérprete propio |
|---|---|---|
| Descarga inicial | 17,5 MB (`tools.jar`, licencia GPLv2) | 0 |
| Primera compilación en móvil | 24–36 s | menos de 100 ms |
| Compilación en caliente | 134 ms | 1–5 ms |
| Licencia | GPLv2, y el runtime prohíbe autoalojarlo | del proyecto |
| Bucle infinito | congela el proceso, hay que matarlo | se corta solo por límite de pasos |
| Mensajes de error | los de `javac`, en inglés | escritos en castellano |

Un alumno con datos móviles no puede permitirse medio minuto de espera por
`println`. Además, controlando el motor podemos **diseñar el error** en vez de
traducirlo: en lugar de `';' expected` el alumno lee *"falta un punto y coma en
la línea 4"*, con el cursor bajo el carácter exacto y una explicación enlazada
al glosario.

**Lo que esto no es:** JavaLearn no es una JVM. Es un intérprete del subconjunto
de Java 8 que necesitan las misiones. Cuando el alumno escribe algo fuera del
subconjunto, el aviso lo dice con claridad en lugar de fallar de forma rara. La
app muestra este aviso de forma permanente, en la propia portada.

## La garantía: contraste contra el JDK real

El riesgo de un intérprete propio es que se desvíe de Java. Por eso
`npm run validate` ejecuta **cada solución de misión dos veces**: con el
intérprete y con el `javac` real, y exige que las dos salidas sean idénticas.
Además, el código de las misiones de *Depuración* tiene que **fallar** en el
`javac` de verdad, o la misión estaría mal planteada.

Esa comprobación corre también en la CI, con un JDK instalado. Si un día el
motor diverge de Java, la CI lo detecta antes de que lo detecte un alumno.

## Accesibilidad

El objetivo es **WCAG 2.2 AA**, y cada punto es comprobable en lugar de
declarativo:

- Skip link, landmarks (`banner`, `navigation`, `main`, `contentinfo`) y regiones
  de anuncio para lector de pantalla.
- Todo control es un `<button>` o un `<a>` nativo. Nada que dependa de un clic
  con el ratón.
- Auditoría de la interfaz con `axe-core` en cada `npm test`.
- Contraste de color auditado con la matemática real de WCAG
  (`npm run contrast`): 36 combinaciones comprobadas en los dos temas, y la CI
  falla si alguien cambia un color y lo rompe.
- Objetivos táctiles de 44×44 px, `viewport-fit=cover` y respeto de las zonas
  seguras del móvil.
- `prefers-reduced-motion`, `prefers-color-scheme` con escucha en vivo,
  `forced-colors` y foco visible en todo el documento.

El test de accesibilidad y el de contraste corren ya en esta fase, para no
acumular deuda mientras crece la interfaz.

## Puesta en marcha

```bash
npm install
npm run dev        # servidor de desarrollo
npm run build      # genera dist/
npm run preview    # sirve dist/ tal cual se publicara
```

### Comprobaciones

```bash
npm test                      # 232 pruebas: motor, scripts, accesibilidad
npm run validate -- --jdk     # contrasta las misiones contra el JDK real
npm run contrast              # auditoria de contraste WCAG sobre los tokens
npm run budget                # presupuesto de tamano del bundle
npm run audit                 # audita la build en Edge o Chrome de verdad
node scripts/generate-icons.mjs
```

Cada capa cubre lo que las anteriores no ven. `npm test` corre `axe-core`
sobre `jsdom`, que no calcula diseño y por eso no puede evaluar el contraste
real; `npm run contrast` sí lo hace, pero sobre los tokens del CSS; y
`npm run audit` abre la build en un navegador y comprueba el contraste ya
calculado, que además incluye los colores que solo existen al componer la
página. También detecta desbordamiento horizontal en un móvil de 360 px,
texto por debajo de 16 px y objetivos táctiles menores de 44×44.

Durante el desarrollo de esta fase detectó un fallo real: el enlace del pie
medía 22 px de alto.

## Estructura

```
src/
  engine/     el motor de Java: lexer, parser y AST (hechos), interprete y biblioteca
  worker/     ejecucion aislada del motor (pendiente)
  ui/         rutas, vistas, tema, anuncios a lector de pantalla
  data/       unidades, misiones y la tabla de lo que el motor admite
  state/      almacenamiento, progreso
css/          tokens de tema y estilos
scripts/      validacion, contraste, iconos, presupuesto, auditoria de navegador
tests/        pruebas unitarias, de scripts y de accesibilidad
```

## El motor

El texto del alumno pasa por tres capas: `lexer` (caracteres a tokens), `parser`
(tokens a árbol) y, más adelante, `interprete` (árbol a valores).

El parser es descendente recursivo con una tabla de precedencia escrita a mano
porque tiene que ser **la de Java y no la de JavaScript**: en Java
`a < b == c` es `(a < b) == c`, y en JavaScript sería `a < (b == c)`. En
JavaScript además el orden de precedencia está fijo en el lenguaje y no se
puede cambiar, así que no había opción de «usar el del lenguaje».

Dos cosas que costaron un tropiezo y conviene no volver a tropezar:

- El lector emite `>>` como un token único, porque en el resto de Java es un
  desplazamiento. En `List<List<String>>` hay que partirlo en dos `>`.
- En el AST, `tipo` es el nombre del nodo. Un dato con la misma clave lo
  machacaba en silencio y el árbol quedaba lleno de nodos mal etiquetados que
  no fallaban hasta mucho después. `nodo()` ahora lo lanza.

`src/data/motor.js` es la lista de lo que el motor admite y lo que no. La
consulta el parser para redactar sus mensajes, así que la interfaz y los errores
no pueden contar historias distintas. Hay una prueba que recorre la tabla y
falla si promete algo que el parser no acepta.

Las pruebas del parser contrastan con `javac` real: para todo lo que el motor
dice admitir, tienen que coincidir en qué se acepta y en qué se rechaza. Los
errores de tipo quedan fuera a propósito, porque esa capa todavía no existe;
está escrito en la propia prueba para que nadie lo lea como un descuido.

## Temario

Nueve unidades, de lo más básico a intermedio, sin nivel experto:

1. Fundamentos
2. Variables y tipos
3. Condiciones
4. Bucles
5. Métodos y clases
6. Cadenas y arreglos
7. Colecciones
8. Herencia y polimorfismo
9. Excepciones

Cada misión se practica con una de seis modalidades: leer, escribir en la
terminal, depurar, auditar, ensamblar y relacionar.

## Estado del proyecto

Publicado en <https://notayeen.github.io/JAVALEARN/>.

| Fase | Estado |
|---|---|
| 0. Andamiaje, diseño, CI, accesibilidad base | completada |
| 1. Lector léxico | completada |
| 2. Navegación, rutas y vistas de lectura | completada |
| 2b. Misiones de la unidad 1 (modo lectura) | completada, 5 de 43 |
| 3. Parser y AST | completada |
| 4. Verificador de tipos, intérprete y biblioteca | pendiente |
| 5. Editor y ejecución en el navegador | pendiente |
| 6. Modalidades de interacción | pendiente |
| 7. Misiones restantes y glosario | pendiente |
| 8. PWA, logros, pulido | pendiente |

**Lo que se puede hacer hoy:** navegar por la unidad 1 y leer sus cinco
lecciones, con ejemplos de código, tablas, pistas y glosario. El motor ya
entiende la sintaxis de Java de esos cinco programas: el parser los analiza y
una prueba lo comprueba contra el JDK real. Lo que todavía no hace es mirar los
tipos.

**Lo que no:** escribir ni ejecutar código. El intérprete todavía no existe, y
la portada lo dice en el sitio en lugar de esconderlo detrás de un botón que no
hace nada.

Los bloques de código de las lecciones se compilan y se ejecutan con el `javac`
real antes de publicarse, así que la salida que se muestra junto a cada ejemplo
está comprobada, no escrita a mano.

## Créditos

`pylearn` sirvió de **referencia de enfoque** —SPA estática, intérprete en
worker, script que valida las misiones contra el runtime real, datos de
contenido como módulo único— y en ningún caso de código. Los patrones que se
decidieron **no** copiar están anotados en `AGENTS.md`.
