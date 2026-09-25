import { ErrorLexico } from './errores.js';
import { OPERADORES, PALABRAS_CLAVE, SEPARADORES, TIPO } from './tokens.js';

const ESPACIOS = new Set([' ', '\t', '\r', '\n', '\f', '\v']);
const RE_IDENT_INICIO = /[A-Za-z_$]/;
const RE_IDENT_PARTE = /[A-Za-z0-9_$]/;
const RE_DIGITO = /[0-9]/;
const RE_HEX = /[0-9a-fA-F]/;

const ESCAPES = {
  b: '\b',
  t: '\t',
  n: '\n',
  f: '\f',
  r: '\r',
  '"': '"',
  "'": "'",
  '\\': '\\',
  '/': '/',
  ' ': ' ',
};

const RE_CUERPO_DECIMAL = /[0-9_]/;
const RE_CUERPO_HEX = /[0-9a-fA-F_]/;
const RE_CUERPO_BINARIO = /[01_]/;
const RE_CUERPO_OCTAL = /[0-7_]/;

/**
 * Convierte texto Java en una lista de tokens.
 *
 * Cada token lleva linea, columna (1-based), longitud y el texto original, de
 * modo que el parser pueda señalar el caracter exacto y el formateador de
 * diagnosticos pueda dibujar un cursor debajo.
 */
export class Lector {
  constructor(fuente) {
    this.fuente = fuente;
    this.i = 0;
    this.linea = 1;
    this.columna = 1;
    this.tokens = [];
    this.anterior = null;
  }

  analizar() {
    const fuente = this.fuente;

    while (this.i < fuente.length) {
      const c = fuente[this.i];

      if (ESPACIOS.has(c)) {
        this.avanzar();
        continue;
      }
      if (c === '/' && fuente[this.i + 1] === '/') {
        this.comentarioLinea();
        continue;
      }
      if (c === '/' && fuente[this.i + 1] === '*') {
        this.comentarioBloque();
        continue;
      }
      if (RE_IDENT_INICIO.test(c)) {
        this.identificador();
        continue;
      }
      if (RE_DIGITO.test(c) || (c === '.' && RE_DIGITO.test(fuente[this.i + 1] ?? '') && this.puedeEmpezarNumero())) {
        this.numero();
        continue;
      }
      if (c === '"') {
        this.cadena();
        continue;
      }
      if (c === "'") {
        this.caracter();
        continue;
      }
      if (SEPARADORES.has(c)) {
        const marca = this.marca();
        this.avanzar();
        this.emitir(TIPO.SEPARADOR, c, this.i - 1, marca, 1);
        continue;
      }
      if (this.operador()) continue;

      this.fallar(`'${c}' no es un carácter válido en Java`, this.linea, this.columna, 1);
    }

    this.emitir(TIPO.FIN, '', this.i, this.marca(), 0);
    return this.tokens;
  }

  /* ------------------------------ utiles ------------------------------- */

  marca() {
    return { linea: this.linea, columna: this.columna };
  }

  avanzar(n = 1) {
    for (let k = 0; k < n; k += 1) {
      if (this.i >= this.fuente.length) return;
      if (this.fuente[this.i] === '\n') {
        this.linea += 1;
        this.columna = 1;
      } else {
        this.columna += 1;
      }
      this.i += 1;
    }
  }

  emitir(tipo, valor, inicio, marca, longitud) {
    const token = {
      tipo,
      valor,
      linea: marca.linea,
      columna: marca.columna,
      longitud: longitud ?? this.i - inicio,
      texto: this.fuente.slice(inicio, this.i),
      indice: inicio,
    };
    this.tokens.push(token);
    this.anterior = token;
    return token;
  }

  fallar(mensaje, linea, columna, longitud = 1) {
    throw new ErrorLexico(mensaje, { linea, columna, longitud });
  }

  /**
   * Un punto puede abrir un numero (".5") solo si lo que viene antes no
   * permite un acceso a miembro: en "texto.length" el punto es un separador.
   */
  puedeEmpezarNumero() {
    const previo = this.anterior;
    if (!previo) return true;
    if (previo.tipo === TIPO.IDENTIFICADOR) return false;
    if (previo.tipo === TIPO.CARACTER || previo.tipo === TIPO.CADENA) return false;
    if (previo.tipo === TIPO.ENTERO || previo.tipo === TIPO.LARGO) return false;
    if (previo.tipo === TIPO.DECIMAL || previo.tipo === TIPO.DOBLE) return false;
    if (previo.texto === ')' || previo.texto === ']') return false;
    return true;
  }

  /* --------------------------- categorias ------------------------------ */

  identificador() {
    const inicio = this.i;
    const marca = this.marca();
    while (this.i < this.fuente.length && RE_IDENT_PARTE.test(this.fuente[this.i])) this.avanzar();
    const texto = this.fuente.slice(inicio, this.i);
    const tipo = PALABRAS_CLAVE.has(texto) ? TIPO.PALABRA_CLAVE : TIPO.IDENTIFICADOR;
    this.emitir(tipo, texto, inicio, marca);
  }

  comentarioLinea() {
    this.avanzar(2);
    while (this.i < this.fuente.length && this.fuente[this.i] !== '\n') this.avanzar();
  }

  comentarioBloque() {
    const marca = this.marca();
    this.avanzar(2);
    for (;;) {
      if (this.i >= this.fuente.length) {
        this.fallar("falta el cierre del comentario: se esperaba '*/'", marca.linea, marca.columna, 2);
      }
      if (this.fuente[this.i] === '*' && this.fuente[this.i + 1] === '/') {
        this.avanzar(2);
        return;
      }
      this.avanzar();
    }
  }

  operador() {
    for (const op of OPERADORES) {
      if (this.fuente.startsWith(op, this.i)) {
        const inicio = this.i;
        const marca = this.marca();
        this.avanzar(op.length);
        this.emitir(TIPO.OPERADOR, op, inicio, marca, op.length);
        return true;
      }
    }
    return false;
  }

  /* ---------------------------- literales ------------------------------ */

  numero() {
    const inicio = this.i;
    const marca = this.marca();
    const fuente = this.fuente;

    let base = 10;
    if (fuente[this.i] === '0' && (fuente[this.i + 1] === 'x' || fuente[this.i + 1] === 'X')) {
      base = 16;
      this.avanzar(2);
    } else if (fuente[this.i] === '0' && (fuente[this.i + 1] === 'b' || fuente[this.i + 1] === 'B')) {
      base = 2;
      this.avanzar(2);
    } else if (fuente[this.i] === '0' && (fuente[this.i + 1] === 'o' || fuente[this.i + 1] === 'O')) {
      base = 8;
      this.avanzar(2);
    }

    if (base === 10 && fuente[this.i] === '0' && RE_DIGITO.test(fuente[this.i + 1] ?? '')) {
      let j = this.i;
      while (j < fuente.length && (RE_DIGITO.test(fuente[j]) || fuente[j] === '_')) j += 1;
      const texto = fuente.slice(this.i, j);
      this.fallar(
        `'${texto}' es un octal antiguo: en Java vale ${parseInt(texto, 8)}, no ${Number(texto)}, y esa forma está obsoleta. Escribe 0o${parseInt(texto, 8)} o 0b${parseInt(texto, 8).toString(2)}`,
        marca.linea,
        marca.columna,
        texto.length,
      );
    }

    this.consumirRun(
      base === 16 ? RE_CUERPO_HEX : base === 2 ? RE_CUERPO_BINARIO : base === 8 ? RE_CUERPO_OCTAL : RE_CUERPO_DECIMAL,
    );

    let esFraccion = false;
    let esExponente = false;

    if (base === 10) {
      const punto = this.puntoDeFraccion();
      if (punto) {
        esFraccion = true;
        this.avanzar();
        this.consumirRun(RE_CUERPO_DECIMAL);
      }
      if (this.exponenteValido()) {
        esExponente = true;
        this.avanzar();
        if (fuente[this.i] === '+' || fuente[this.i] === '-') this.avanzar();
        this.consumirRun(RE_CUERPO_DECIMAL);
      }
    }

    if (base !== 10 && fuente[this.i] === '.') {
      this.fallar(
        `'${fuente.slice(inicio, this.i + 1)}' no es un número válido: los literales hexadecimales y binarios no admiten parte decimal`,
        marca.linea,
        marca.columna,
        this.i - inicio + 1,
      );
    }

    let sufijo = null;
    const c = fuente[this.i];
    if (c === 'l' || c === 'L') {
      sufijo = 'l';
      this.avanzar();
    } else if (c === 'f' || c === 'F') {
      sufijo = 'f';
      this.avanzar();
    } else if (c === 'd' || c === 'D') {
      sufijo = 'd';
      this.avanzar();
    }

    const cuerpo = fuente.slice(inicio, this.i - (sufijo ? 1 : 0));
    if (cuerpo.replace(/^0[xXbBoO]/, '').replace(/_/g, '') === '' && !esFraccion) {
      this.fallar(`'${cuerpo}' no es un número válido`, marca.linea, marca.columna, cuerpo.length);
    }

    const posterior = fuente[this.i];
    if (posterior && (RE_IDENT_INICIO.test(posterior) || posterior === '.')) {
      const hasta = this.i + 1;
      this.fallar(
        `'${fuente.slice(inicio, hasta)}' no es un número válido: sobran caracteres '${fuente.slice(this.i, hasta)}'`,
        marca.linea,
        marca.columna,
        hasta - inicio,
      );
    }

    const limpio = cuerpo.replace(/_/g, '');
    let tipo;
    if (sufijo === 'l') tipo = TIPO.LARGO;
    else if (sufijo === 'f') tipo = TIPO.DECIMAL;
    else if (sufijo === 'd') tipo = TIPO.DOBLE;
    else if (esFraccion || esExponente) tipo = TIPO.DOBLE;
    else tipo = TIPO.ENTERO;

    const valor =
      base === 16
        ? parseInt(limpio.slice(2), 16)
        : base === 2
          ? parseInt(limpio.slice(2), 2)
          : base === 8
            ? parseInt(limpio.slice(2), 8)
            : Number(limpio);

    this.emitir(tipo, valor, inicio, marca);
  }

  consumirRun(re) {
    while (this.i < this.fuente.length && re.test(this.fuente[this.i])) this.avanzar();
  }

  /**
   * Decide si el punto actual abre la parte decimal. Acepta "3.14" y "1.",
   * pero no toca el punto de "texto.length" ni el segundo punto de "1..2".
   */
  puntoDeFraccion() {
    if (this.fuente[this.i] !== '.') return false;
    const siguiente = this.fuente[this.i + 1];
    if (siguiente === undefined) return true;
    if (RE_DIGITO.test(siguiente)) return true;
    return !RE_IDENT_INICIO.test(siguiente) && siguiente !== '.';
  }

  exponenteValido() {
    const c = this.fuente[this.i];
    if (c !== 'e' && c !== 'E') return false;
    const s1 = this.fuente[this.i + 1];
    const s2 = this.fuente[this.i + 2];
    return RE_DIGITO.test(s1 ?? '') || ((s1 === '+' || s1 === '-') && RE_DIGITO.test(s2 ?? ''));
  }

  cadena() {
    const inicio = this.i;
    const marca = this.marca();
    this.avanzar();
    let valor = '';

    for (;;) {
      if (this.i >= this.fuente.length || this.fuente[this.i] === '\n') {
        this.fallar("falta la comilla de cierre de la cadena ( \")", marca.linea, marca.columna, 1);
      }
      const c = this.fuente[this.i];
      if (c === '"') {
        this.avanzar();
        break;
      }
      if (c === '\\') {
        valor += this.escape();
        continue;
      }
      valor += c;
      this.avanzar();
    }

    this.emitir(TIPO.CADENA, valor, inicio, marca);
  }

  caracter() {
    const inicio = this.i;
    const marca = this.marca();
    this.avanzar();

    if (this.i >= this.fuente.length || this.fuente[this.i] === '\n') {
      this.fallar("falta la comilla de cierre del carácter ( ' )", marca.linea, marca.columna, 1);
    }
    if (this.fuente[this.i] === "'") {
      this.fallar(
        'un literal de carácter no puede estar vacío: escribí un carácter entre las comillas simples',
        marca.linea,
        marca.columna,
        2,
      );
    }

    let valor;
    if (this.fuente[this.i] === '\\') {
      valor = this.escape();
    } else {
      valor = this.fuente[this.i];
      this.avanzar();
    }

    if (this.i >= this.fuente.length || this.fuente[this.i] === '\n') {
      this.fallar("falta la comilla de cierre del carácter ( ' )", marca.linea, marca.columna, this.i - inicio);
    }
    if (this.fuente[this.i] !== "'") {
      this.fallar(
        'un literal de carácter solo admite un carácter entre comillas simples',
        marca.linea,
        marca.columna,
        this.i - inicio + 1,
      );
    }
    this.avanzar();

    this.emitir(TIPO.CARACTER, valor, inicio, marca);
  }

  escape() {
    const marca = this.marca();
    this.avanzar();
    const c = this.fuente[this.i];

    if (c === undefined || c === '\n') {
      this.fallar('falta el carácter después de la barra invertida', marca.linea, marca.columna, 1);
    }

    if (c === 'u') {
      this.avanzar();
      let hex = '';
      for (let k = 0; k < 4; k += 1) {
        const d = this.fuente[this.i];
        if (!RE_HEX.test(d ?? '')) {
          this.fallar("'\\u' debe ir seguido de cuatro dígitos hexadecimales (por ejemplo, '\\u00e1')", marca.linea, marca.columna, 2 + k);
        }
        hex += d;
        this.avanzar();
      }
      return String.fromCharCode(parseInt(hex, 16));
    }

    if (Object.prototype.hasOwnProperty.call(ESCAPES, c)) {
      this.avanzar();
      return ESCAPES[c];
    }

    this.fallar(`'\\${c}' no es una secuencia de escape válida en Java`, marca.linea, marca.columna, 2);
    return '';
  }
}

export function leerTokens(fuente) {
  return new Lector(fuente).analizar();
}
