# JavaLearn

Ruta interactiva para aprender Java de cero a nivel intermedio, dentro del
navegador y sin instalar nada.

- **Web:** https://notayeen.github.io/JAVALEARN/
- **Licencia:** ISC
- **Publicación:** GitHub Pages, sitio estático sin servidor

## Qué problema resuelve

Instalar un JDK, un IDE y dealear con errores de compilación en inglés son las
tres barreras habituales para quien empieza con Java. JavaLearn las quita:
escribes Java, pulsas ejecutar y lees el resultado al instante, también desde
el móvil.

## Por qué un intérprete propio

La primera versión de este proyecto usó CheerpJ para compilar Java de verdad en
el navegador. Se descartó tras medirlo:

| | CheerpJ 2.3 | Intérprete propio |
|---|---|---|
| Descarga inicial | 17,5 MB (`tools.jar`, licencia GPLv2) | 0 |
| Primera compilación en móvil | 24–36 s | menos de 100 ms |
| Compilación en caliente | 134 ms | 1–5 ms |
| Licencia | GPLv2, y el runtime prohíbe autoalojarlo | del proyecto |
| Bucle infinito | congela el proceso, hay que matarlo | se corta solo por límite de pasos |
| Mensajes de error | los de `javac`, en inglés | escritos en castellano |

## Verificación contra el JDK real

Cada nivel tiene su salida esperada, y esa salida **no está escrita a mano**: se
graba ejecutando el mismo código con OpenJDK 17 real.

```bash
npm run validate -- --jdk     # exige JAVA_HOME apuntando a un JDK 17
```

El validador comprueba, para cada misión:

1. El esquema del nivel y los campos que exige su modalidad.
2. Que la solución compila y produce `expected_output` en el motor propio.
3. Que el JDK real produce exactamente la misma salida.
4. Que el código defectuoso de un nivel de Depuración no pasa la misión.
5. Que el código auditado de un nivel de Auditoría no pasa la misión y que
   `token_error_index` apunta a la única línea distinta de la solución.
6. Que el programa ensamblado de un nivel de Ensamblaje compila y produce la
   salida esperada.

Además hay un banco de 31 casos diferenciales (`tests/cases.js`) con su
resultado grabado en `tests/fixtures/differential.json`, que se ejecuta en cada
`npm test`.

## Puesta en marcha

```bash
npm install
npm run dev        # servidor de desarrollo
npm test           # 79 tests (motor, niveles, worker y modos)
npm run validate   # valida los 32 niveles sin JDK
npm run build      # genera bundle.js y assets/java-worker.js en la raíz
```

## Estructura

```
index.html              marcado de la aplicación
bundle.js               salida de build, se despliega tal cual
assets/java-worker.js   motor Java en un Web Worker
src/main.js             arranque
src/App.js              interfaz y modos de juego
src/levels.js           las 32 misiones
src/JavaRunner.js       worker con repliegue en línea y límites de tiempo
src/editor.js           editor CodeMirror con sugerencias
src/compare.js          comparación de salidas
src/storage.js          progreso y preferencias
src/docs.js             documentación consultable
src/engine/             intérprete de Java
  lexer.js              analizador léxico
  parser.js             analizador sintáctico a AST
  interpreter.js        evaluación, tipos, excepciones y límites de pasos
  stdlib.js             biblioteca estándar (String, Math, colecciones)
  runtime.js            utilidades de valor
  format.js             formateo numérico al estilo de Java
  errors.js             clases de error
tests/                  tests de motor, niveles, worker y differential
scripts/                validación y grabación diferencial
```

## Modos de juego

| Modo | Qué hace el alumno | Misiones |
|---|---|---|
| Terminal | Completa el programa hasta que la salida coincide | 21 |
| Depuración | Arregla un programa con un fallo concreto | 5 |
| Auditoría | Señala la línea responsable del fallo | 3 |
| Ensamblaje | Reordena las piezas hasta formar un programa válido | 3 |

## Motor

- Límite de pasos: 20 000 000 en Web Worker, 5 000 000 en el repliegue en línea.
- Tiempo máximo: 8 segundos.
- Errores de compilación y excepciones con línea, columna y mensaje en
  castellano, en el formato de `javac`.
- El repliegue en línea existe para cuando el navegador bloquea el Web Worker
  (algunos proveedores de móviles lo hacen bajo HTTPS estricto).
