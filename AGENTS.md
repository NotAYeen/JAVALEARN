# AGENTS.md

Convenciones del proyecto. Léelo antes de tocar código: casi todas son
decisiones que costaron tiempo discutir, y que conviene no volver a
discutir una por una.

## Idioma

- **Todo el código y la documentación, en español.** Esto incluye los
  identificadores: `leerTokens`, `puntoDeFraccion`, `salidaEsperada`,
  `mision`, no `readTokens` ni `expectedOutput`.
- Los identificadores van **sin tildes ni ñ**: `mision`, no `misión`. El
  español se ve igual de bien y evita líos con el teclado y con las
  herramientas.
- El texto que ve el alumno **sí** lleva tildes y ñ, en UTF-8. En el HTML se
  pueden usar entidades (`&aacute;`) o el carácter directamente.
- Los comentarios y los nombres están sin tildes por legibilidad en terminal;
  los mensajes de error al alumno, con tildes.

## Errores: la regla que más importa

Un mensaje de error debe **decir qué hacer**, no solo qué falló.

- Bien: `falta un punto y coma en la línea 4`.
- Mal: `error de sintaxis`, `SyntaxError`, `token inesperado`.

Reglas concretas:

- Todo error de sintaxis lleva **línea, columna y longitud**, para poder dibujar
  el cursor bajo el carácter exacto (`src/engine/errores.js`).
- Cuando el alumno use algo fuera del subconjunto soportado, el mensaje lo dice
  de forma explícita. Nunca "error desconocido".
- Los errores de ejecución usan el nombre del tipo de excepción de Java
  (`NullPointerException`, `ArrayIndexOutOfBoundsException`) porque el alumno
  tiene que reconocerlos: ese es el vocabulario que le va a encontrar fuera.

## Motor: la puerta para añadir lenguaje

Añadir una construcción al subconjunto **obliga** a cuatro cosas, en el mismo
commit:

1. Prueba del lector léxico si toca el vocabulario.
2. Prueba del parser.
3. Prueba de ejecución que **se compare con el JDK real**. No vale una prueba
   que solo compruebe que nuestro motor se comporta como él mismo.
4. Actualizar la lista de "soportado / no soportado" de la app.

El motivo es que un intérprete propio se desvía de Java de formas sutiles
—división entera, desbordamiento de `int`, reglas de concatenación, aritmética
de `char`— y sin un contraste automático contra el JDK real esos desvíos se
instalan solos.

- Nunca aceptar un literal en la forma octal antigua (`010`). En Java vale 8 y
  es una trampa; el lector lo rechaza explicando por qué.
- Recordar que el lector emite `>>` como un solo token. El parser tiene que
  partirlo al analizar los genéricos `List<List<String>>`.
- `long` se representa con `Number`, no con `BigInt`. Está por debajo de 2^53:
  documentado, y suficiente para estas misiones.
- La precedencia es **la de Java, no la de JavaScript**. `a < b == c` en Java es
  `(a < b) == c`; en JavaScript sería `a < (b == c)`. La tabla está escrita a
  mano en `parser.js` y en JavaScript el orden de precedencia está *hardcodeado
  en el lenguaje*, así que copiarlo no es opción. El caso que más se nota:
  `&&` liga más fuerte que `||`, y en los dos lo hace igual; pero `|` liga más
  flojo que `==`, cosa que en JavaScript no ocurre.
- En el AST, `tipo` es el nombre del nodo. Un dato que se llame `tipo`
  machacaría ese nombre y el nodo dejaría de poder localizarse: ya pasó, y el
  síntoma fue un árbol lleno de nodos mal etiquetados que no fallaba hasta
  mucho después. `nodo()` lo lanza si lo ves, y los datos llevan `tipoDeclarado`,
  `tipoParametro`, `tipoCampo`, `tipoElemento` o `tipoDestino`.
- La tabla de «soportado / no soportado» vive en `src/data/motor.js` y la
  consulta el parser para redactar sus mensajes. Si añades una fila, hay que
  enseñarle al parser a rechazarla: hay una prueba que recorre la tabla y falla
  si promete algo que el parser no acepta.
- El contraste con el JDK en `tests/engine/parser.test.js` compara **sintaxis**.
  Los errores de tipo los detecta el verificador de tipos, que aún no existe;
  hay una prueba que deja escrito que esos casos se aceptan hoy a propósito.

## Accesibilidad: no es un extra

- Todo control interactivo es `<button>` o `<a>` **nativo**. Nada de `<div>`
  con `onclick`. En Auditoría, cada línea es un botón real: en la versión de
  referencia esas líneas eran `<span>` y la misión era imposible sin ratón.
- Todo objetivo táctil, al menos 44×44 CSS px.
- Los modales gestionan el foco: `inert` en el fondo, trampa de foco, `Esc` con
  **un único manejador**, foco inicial en la acción principal y devuelto al
  origen al cerrar.
- Nada se comunica solo con color. Siempre icono **y** texto.
- Los cambios de estado se anuncian con las regiones de `src/ui/anuncios.js`.
  Las regiones viven en el HTML desde el arranque, no se crean al vuelo.
- El editor no debe atrapar el foco: `Esc` y luego `Tab` salen. `Ctrl/Cmd+Enter`
  ejecuta.
- Después de tocar la interfaz: `npm test` incluye la auditoría con `axe-core`.

## Color

- **Ningún color literal fuera de los dos bloques de tema de `css/style.css`.**
  Todo lo demás usa `var(--token)`.
- Los bloques van delimitados con `INICIO TEMA` / `FIN TEMA` porque
  `scripts/check-contrast.mjs` los lee de ahí. Si rompes un delimitador, el
  auditor deja de ver el tema y hay una prueba que lo detecta.
- Hay exactamente dos paletas. La preferencia del sistema se resuelve en
  JavaScript y se aplica como `data-tema`; **no** se dupliquen colores en media
  queries de CSS, porque esas copias no las audita nadie.
- Cambiar un color obliga a pasar `npm run contrast`.

## Dependencias

Criterio: **casi ninguna**. El presupuesto del bundle lo vigila
`scripts/check-budget.mjs` (300 KB comprimidos) y la CI lo bloquea.

- Sin framework de interfaz. DOM directo.
- CodeMirror 6, y solo los paquetes necesarios.
- La PWA está escrita a mano: `sw.js` más un manifest, sin `vite-plugin-pwa`.
- `SHELL` en `sw.js` solo puede contener archivos cuyo nombre no dependa del
  build. `cache.addAll` es **atómico**: un solo 404 y no se instala nada, así
  que un service worker roto deja la página funcionando y la PWA apagada, sin
  un error visible. Por eso `npm run audit` comprueba que lo de `SHELL` exista
  en `dist/` **y** que el worker llegue a instalarse en un navegador de verdad.
- Los iconos se generan con un codificador PNG propio sobre `node:zlib`
  (`scripts/generate-icons.mjs`) en lugar de una librería de imagen.
- Si añades una dependencia, explica en el PR qué elimina y cuánto pesa.

## Pruebas

- Todo componente, función y archivo nuevo del motor o de la interfaz lleva
  pruebas. Un archivo sin pruebas es un archivo que nadie sabe si funciona.
- La excepción son los scripts que **son** una comprobación (`check-budget`,
  `check-contrast`, `auditar-navegador`): ejecutarlos ya es la prueba, salen
  con código distinto de cero cuando fallan y corren en la CI. Envolverlos en
  un test solo añadiría tiempo, no confianza.

## Comprobaciones obligatorias antes de dar algo por terminado

```bash
npm test
npm run validate -- --jdk
npm run contrast
npm run build
npm run budget
npm run audit
```

Las seis, en verde. `npm run validate -- --jdk` es la que más importa: es la
que detecta que hemos dejado de parecernos a Java. `npm run audit` es la que
detecta que la interfaz ha dejado de ser accesible en un navegador de verdad.

## No copiar de la referencia

`pylearn` se usó para el enfoque. Estos son los problemas que se detectaron en
él y que **no** hay que arrastrar:

- Modo Auditoría inaccesible por teclado: las líneas no eran controles.
- Contraste de 1.51:1 en un elemento de texto.
- El editor atrapaba el `Tab`.
- Sin enlace de salto.
- La explicación de la misión se ocultaba en móvil.
- `solutionRevealed` se escribía y nunca se leía: la solución no costaba nada.
- El panel de resultados tenía altura fija y se comía el editor en móvil.
- Ningún service worker, y `base` sin declarar en la configuración de Vite.

## Al sumar una misión

1. Que su `solucion` pase el contraste contra el JDK real.
2. Si la modalidad es *Depuración*, que su código **falle** en el JDK real.
3. Objetivos y pistas en castellano, y las pistas reveladas de menor a mayor.
4. Vocabulario y entradas de glosario asociadas.
5. Varios casos de prueba cuando la misión lo admita: `entrada` y
   `salidaEsperada`.
