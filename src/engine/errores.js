/**
 * Jerarquia de errores del motor de Java.
 *
 * Todos los errores llevan posicion (linea, columna) y longitud, para poder
 * dibujar un cursor debajo del caracter exacto en el mensaje que ve el alumno.
 */

export class ErrorJava extends Error {
  constructor(mensaje, { linea = 0, columna = 0, longitud = 1, codigo = null } = {}) {
    super(mensaje);
    this.name = new.target.name;
    this.mensaje = mensaje;
    this.linea = linea;
    this.columna = columna;
    this.longitud = Math.max(1, longitud | 0);
    this.codigo = codigo;
  }
}

export class ErrorLexico extends ErrorJava {}

export class ErrorSintaxis extends ErrorJava {}

/**
 * Error de compilacion que no es de sintaxis: simbolo desconocido, tipo
 * incompatible, construccion fuera del subconjunto soportado...
 */
export class ErrorCompilacion extends ErrorJava {
  constructor(mensaje, opciones = {}) {
    super(mensaje, opciones);
    this.explicacion = opciones.explicacion ?? null;
  }
}

/**
 * Error en tiempo de ejecucion. `tipo` es el nombre del tipo de excepcion
 * Java equivalente, para poder mostrar algo como "NullPointerException" sin
 * tragarnos una JVM entera.
 */
export class ErrorEjecucion extends ErrorJava {
  constructor(tipo, mensaje, opciones = {}) {
    super(mensaje, opciones);
    this.tipo = tipo;
    this.traza = opciones.traza ?? [];
  }
}

/**
 * El programa supero el limite de pasos o de tiempo. Es un caso normal en
 * ejercicios con bucles: el mensaje explica como sair, no solo que fallo.
 */
export class ErrorTiempoAgotado extends ErrorEjecucion {
  constructor(mensaje, opciones = {}) {
    super('TiempoAgotado', mensaje, opciones);
  }
}
