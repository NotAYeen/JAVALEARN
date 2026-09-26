/**
 * Nodos del arbol de sintaxis.
 *
 * Cada nodo es un objeto plano con dos cosas siempre presentes:
 *
 *   - `tipo`: que clase de nodo es, en castellano ('Si', 'Llamada', 'Binario').
 *   - `pos`: { linea, columna, longitud } para señalar el fragmento exacto.
 *
 * No hay clases ni herencia a proposito. El arbol solo lo consumen el
 * verificador de tipos y el interprete, y un objeto plano se puede comparar,
 * volcar y leer en un test sin ceremonia ninguna.
 *
 * Los nombres van sin tildes, como todo el codigo del proyecto; los mensajes de
 * error al alumno, en cambio, si las llevan.
 */

/**
 * Crea un nodo del arbol.
 *
 * @param {string} tipo    Nombre del nodo.
 * @param {object} pos     { linea, columna, longitud } de donde empieza.
 * @param {object} [datos] Propiedades especificas del nodo.
 *
 * `tipo` va al final a proposito, y se avisa si los datos ya traian uno. La
 * razon es concreta: `nodo('Declaracion', pos, { tipo: tipoJava })` dejaba el
 * nodo diciendo que era un `TipoPrimitivo`, y `buscar(arbol, 'Declaracion')` no
 * encontraba ninguna en todo el arbol. Nada fallaba de forma visible: el arbol
 * se llenaba de nodos mal etiquetados y el error aparecia mucho despues, en la
 * parte que los consume. Un guardia barato aqui es mejor que eso.
 */
export function nodo(tipo, pos, datos = {}) {
  if (Object.prototype.hasOwnProperty.call(datos, 'tipo')) {
    throw new Error(`El nodo «${tipo}» trae un dato llamado «tipo», que pisa su propio nombre. Renómbralo.`);
  }
  return { ...datos, tipo, pos: { linea: pos.linea, columna: pos.columna, longitud: pos.longitud } };
}

/** Posicion a partir de un token del lector lexico. */
export function posDe(token) {
  return { linea: token.linea, columna: token.columna, longitud: Math.max(1, token.longitud) };
}

/**
 * Posicion que abarca un grupo de tokens, del primero al ultimo.
 * Se usa para "aquí va la declaración entera", no un carácter suelto.
 */
export function posEntre(inicio, fin) {
  const longitud = Math.max(1, fin.indice + fin.longitud - inicio.indice);
  return { linea: inicio.linea, columna: inicio.columna, longitud };
}

/**
 * Posicion que abarca dos nodos del arbol, del primero al ultimo.
 *
 * Hace falta porque posEntre() trabaja con tokens, que llevan indice, y en las
 * expresiones se combinan nodos ya construidos. Si los dos nodos estan en
 * lineas distintas, la longitud se mide hasta el final de la linea del
 * primero: señalar "desde aqui" es mas util que una longitud sin sentido.
 */
export function posNodos(a, b) {
  if (!a) return b?.pos ?? { linea: 0, columna: 0, longitud: 1 };
  if (!b) return a.pos;
  if (a.pos.linea === b.pos.linea) {
    return { linea: a.pos.linea, columna: a.pos.columna, longitud: b.pos.columna + b.pos.longitud - a.pos.columna };
  }
  return { linea: a.pos.linea, columna: a.pos.columna, longitud: a.pos.longitud };
}

/* --------------------------- nodos de tipo --------------------------- */

/** Tipo primitivo: int, double, char... */
export function tipoPrimitivo(nombre, pos) {
  return nodo('TipoPrimitivo', pos, { nombre });
}

/**
 * Tipo de clase: String, Persona, o algo parametrizado como Map<String, Integer>.
 * `argumentos` es null cuando no lleva parentesis angulares.
 */
export function tipoClase(nombre, argumentos, pos) {
  return nodo('TipoClase', pos, { nombre, argumentos });
}

/** Arreglo: el tipo del que son sus elementos. `int[]` -> elemento int. */
export function tipoArreglo(elemento, pos) {
  return nodo('TipoArreglo', pos, { elemento });
}

/* -------------------------- nodos de programa ------------------------- */

export function programa(clase, pos) {
  return nodo('Programa', pos, { clase });
}

export function clase(nombre, modificadores, miembros, pos) {
  return nodo('Clase', pos, { nombre, modificadores, miembros });
}

/** Campo de clase. El tipo va en `tipoCampo`. */
export function campo(modificadores, tipoCampo, nombre, pos, inicializador = null, otros = null) {
  return nodo('Campo', pos, { modificadores, tipoCampo, nombre, inicializador, otros });
}

/** Metodo. El tipo de vuelta va en `tipoRetorno`, libre de colisiones. */
export function metodo(modificadores, tipoRetorno, nombre, parametros, cuerpo, pos) {
  return nodo('Metodo', pos, { modificadores, tipoRetorno, nombre, parametros, cuerpo });
}

/** Parametro de un metodo. El tipo va en `tipoParametro`. */
export function parametro(tipoParametro, nombre, pos) {
  return nodo('Parametro', pos, { tipoParametro, nombre });
}

/* ------------------------- nodos de instruccion ----------------------- */

/**
 * Declaracion de variable. El tipo va en `tipoDeclarado`: llamarlo `tipo`
 * sobreescribiria el nombre del nodo, que es justo lo que paso antes.
 */
export function declaracion(tipoDeclarado, nombre, inicializador, pos) {
  return nodo('Declaracion', pos, { tipoDeclarado, nombre, inicializador });
}

/** Varias variables en una linea: int a = 1, b = 2; */
export function declaracionesMultiples(tipoDeclarado, variables, pos) {
  return nodo('DeclaracionesMultiples', pos, { tipoDeclarado, variables });
}

export function expresion(operacion, pos) {
  return nodo('Expresion', pos, { operacion });
}

export function bloque(instrucciones, pos) {
  return nodo('Bloque', pos, { instrucciones });
}

export function si(condicion, entonces, otro, pos) {
  return nodo('Si', pos, { condicion, entonces, otro });
}

export function mientras(condicion, cuerpo, pos) {
  return nodo('Mientras', pos, { condicion, cuerpo });
}

export function hacer(cuerpo, condicion, pos) {
  return nodo('Hacer', pos, { cuerpo, condicion });
}

/** Bucle for clasico. `cabecera` guarda la inicializacion, la prueba y el avance. */
export function para(inicializacion, condicion, avance, cuerpo, pos) {
  return nodo('Para', pos, { inicializacion, condicion, avance, cuerpo });
}

/** Bucle for each: `para (T x : coleccion)`. */
export function paraCada(declarado, coleccion, cuerpo, pos) {
  return nodo('ParaCada', pos, { declarado, coleccion, cuerpo });
}

export function romper(pos) {
  return nodo('Romper', pos);
}

export function continuar(pos) {
  return nodo('Continuar', pos);
}

export function devolver(valor, pos) {
  return nodo('Devolver', pos, { valor });
}

/* -------------------------- nodos de expresion ----------------------- */

/** Literal. `tipoLiteral` —y no `tipo`— para no chocar con el nombre del nodo. */
export function literal(valor, tipoLiteral, pos) {
  return nodo('Literal', pos, { valor, tipoLiteral });
}

export function identificador(nombre, pos) {
  return nodo('Identificador', pos, { nombre });
}

/** this y super. */
export function este(pos) {
  return nodo('Este', pos);
}

/**
 * Acceso a un miembro: `objeto.miembro`. Si `objeto` es null es un acceso
 * implicito, como `saludo.length` dentro de la propia clase.
 */
export function accesoMiembro(objeto, miembro, pos) {
  return nodo('AccesoMiembro', pos, { objeto, miembro });
}

/** Llamada: `nombre(...)` o `objeto.nombre(...)`. `receptor` es null si es suelta. */
export function llamada(receptor, nombre, argumentos, pos) {
  return nodo('Llamada', pos, { receptor, nombre, argumentos });
}

/** Indexado: `arreglo[indice]`. */
export function indexado(base, indice, pos) {
  return nodo('Indexado', pos, { base, indice });
}

/** Asignacion: objetivo, operador (=, +=...) y valor. El objetivo es una expression. */
export function asignacion(objetivo, operador, valor, pos) {
  return nodo('Asignacion', pos, { objetivo, operador, valor });
}

/** Operador binario. `operador` es el texto: '+', '==', '&&', '>>='... */
export function binario(operador, izquierda, derecha, pos) {
  return nodo('Binario', pos, { operador, izquierda, derecha });
}

/** Operador unario. `prefijo` distingue `!x` de `x++`. */
export function unario(operador, operando, prefijo, pos) {
  return nodo('Unario', pos, { operador, operando, prefijo });
}

/** Condicional: `condicion ? a : b`. */
export function condicional(condicion, entonces, otro, pos) {
  return nodo('Condicional', pos, { condicion, entonces, otro });
}

/** Arreglo nuevo: `new int[3]` o `new int[]{1, 2, 3}`. */
export function nuevoArreglo(tipoElemento, dimensiones, inicializador, pos) {
  return nodo('NuevoArreglo', pos, { tipoElemento, dimensiones, inicializador });
}

/** Conversion por cast. El tipo destino va en `tipoDestino`. */
export function conversion(tipoDestino, operando, pos) {
  return nodo('Conversion', pos, { tipoDestino, operando });
}
