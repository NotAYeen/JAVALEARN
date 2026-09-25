import { describe, expect, it } from 'vitest';
import { ErrorLexico } from '../../src/engine/errores.js';
import { leerTokens } from '../../src/engine/lexer.js';
import { TIPO } from '../../src/engine/tokens.js';

const sinFin = (fuente) => leerTokens(fuente).filter((t) => t.tipo !== TIPO.FIN);
const tipos = (fuente) => sinFin(fuente).map((t) => t.tipo);
const textos = (fuente) => sinFin(fuente).map((t) => t.texto);
const primero = (fuente) => sinFin(fuente)[0];

function esperarError(fuente, fragmento) {
  try {
    leerTokens(fuente);
  } catch (error) {
    expect(error).toBeInstanceOf(ErrorLexico);
    expect(error.mensaje).toContain(fragmento);
    return error;
  }
  throw new Error(`Se esperaba un error lexico al leer: ${JSON.stringify(fuente)}`);
}

describe('identificadores y palabras clave', () => {
  it('distingue palabras clave de identificadores', () => {
    expect(tipos('int x')).toEqual([TIPO.PALABRA_CLAVE, TIPO.IDENTIFICADOR]);
  });

  it('acepta identificadores largos, con digitos, $ y _', () => {
    expect(textos('MiClase _privado $contador contador2')).toEqual([
      'MiClase',
      '_privado',
      '$contador',
      'contador2',
    ]);
  });

  it('reconoce los literales true, false y null como palabras clave', () => {
    expect(textos('true false null')).toEqual(['true', 'false', 'null']);
  });
});

describe('literales enteros', () => {
  it('lee decimales', () => {
    expect(primero('42')).toMatchObject({ tipo: TIPO.ENTERO, valor: 42 });
  });

  it('lee hexadecimales', () => {
    expect(primero('0xFF')).toMatchObject({ valor: 255 });
    expect(primero('0X1a')).toMatchObject({ valor: 26 });
  });

  it('lee binarios', () => {
    expect(primero('0b1010')).toMatchObject({ valor: 10 });
    expect(primero('0B11')).toMatchObject({ valor: 3 });
  });

  it('lee octales modernos', () => {
    expect(primero('0o17')).toMatchObject({ valor: 15 });
    expect(primero('0O20')).toMatchObject({ valor: 16 });
  });

  it('ignora los separadores de miles', () => {
    expect(primero('1_000_000')).toMatchObject({ valor: 1000000 });
  });

  it('distingue int de long por el sufijo', () => {
    expect(primero('100')).toMatchObject({ tipo: TIPO.ENTERO });
    expect(primero('100L')).toMatchObject({ tipo: TIPO.LARGO, valor: 100 });
    expect(primero('100l')).toMatchObject({ tipo: TIPO.LARGO });
  });
});

describe('literales decimales', () => {
  it('distingue float de double', () => {
    expect(primero('1.5')).toMatchObject({ tipo: TIPO.DOBLE, valor: 1.5 });
    expect(primero('1.5f')).toMatchObject({ tipo: TIPO.DECIMAL, valor: 1.5 });
    expect(primero('1.5F')).toMatchObject({ tipo: TIPO.DECIMAL });
    expect(primero('1.5d')).toMatchObject({ tipo: TIPO.DOBLE });
  });

  it('acepta notacion cientifica', () => {
    expect(primero('1e3')).toMatchObject({ tipo: TIPO.DOBLE, valor: 1000 });
    expect(primero('2.5E-3')).toMatchObject({ tipo: TIPO.DOBLE, valor: 0.0025 });
  });

  it('acepta 1. y .5', () => {
    expect(primero('1.')).toMatchObject({ tipo: TIPO.DOBLE, valor: 1 });
    expect(primero('.5')).toMatchObject({ tipo: TIPO.DOBLE, valor: 0.5 });
  });

  it('trata el punto de texto.length como separador, no como decimal', () => {
    expect(tipos('texto.length')).toEqual([
      TIPO.IDENTIFICADOR,
      TIPO.SEPARADOR,
      TIPO.IDENTIFICADOR,
    ]);
  });

  it('trata el punto de arr[0] como separador', () => {
    expect(tipos('arr[0].x')).toEqual([
      TIPO.IDENTIFICADOR,
      TIPO.SEPARADOR,
      TIPO.ENTERO,
      TIPO.SEPARADOR,
      TIPO.SEPARADOR,
      TIPO.IDENTIFICADOR,
    ]);
  });
});

describe('números mal formados', () => {
  it('rechaza 123abc', () => {
    esperarError('123abc', 'sobran caracteres');
  });

  it('rechaza hexadecimales sin digitos', () => {
    esperarError('0x', 'no es un número válido');
    esperarError('0b', 'no es un número válido');
  });

  it('rechaza partes decimales en hexadecimales', () => {
    esperarError('0x1F.5', 'no admiten parte decimal');
  });

  it('rechaza la forma octal antigua y explica la trampa', () => {
    const error = esperarError('010', 'octal antiguo');
    expect(error.mensaje).toContain('vale 8');
    expect(error.mensaje).toContain('0o8');
    expect(error.mensaje).toContain('0b1000');
  });

  it('rechaza 1.2.3', () => {
    esperarError('1.2.3', 'no es un número válido');
  });
});

describe('cadenas', () => {
  it('decodifica el contenido', () => {
    expect(primero('"hola"')).toMatchObject({ tipo: TIPO.CADENA, valor: 'hola' });
  });

  it('interpreta secuencias de escape', () => {
    expect(primero('"a\\nb"').valor).toBe('a\nb');
    expect(primero('"\\t\\" \\\\ \\/"').valor).toBe('\t" \\ /');
  });

  it('interpreta escapes unicode', () => {
    expect(primero('"\\u00e1"').valor).toBe('\u00e1');
  });

  it('admite la cadena vacia', () => {
    expect(primero('""')).toMatchObject({ tipo: TIPO.CADENA, valor: '' });
  });

  it('avisa de comilla de cierre ausente, senalando la apertura', () => {
    const error = esperarError('"sin cerrar', 'falta la comilla de cierre');
    expect(error.linea).toBe(1);
    expect(error.columna).toBe(1);
  });

  it('no permite cadenas en varias lineas', () => {
    esperarError('"una\ndos"', 'falta la comilla de cierre');
  });

  it('rechaza escapes inexistentes', () => {
    esperarError('"\\q"', 'no es una secuencia de escape válida');
  });

  it('rechaza \\u incompleto', () => {
    esperarError('"\\u12"', 'cuatro dígitos hexadecimales');
  });
});

describe('caracteres', () => {
  it('lee un caracter simple', () => {
    expect(primero("'a'")).toMatchObject({ tipo: TIPO.CARACTER, valor: 'a' });
  });

  it('lee escapes en un caracter', () => {
    expect(primero("'\\n'").valor).toBe('\n');
    expect(primero("'\\''").valor).toBe("'");
  });

  it('rechaza el caracter vacio', () => {
    esperarError("''", 'no puede estar vacío');
  });

  it('rechaza varios caracteres entre comillas simples', () => {
    esperarError("'ab'", 'solo admite un carácter');
  });

  it('avisa de comilla de cierre ausente', () => {
    esperarError("'a", 'falta la comilla de cierre');
  });
});

describe('comentarios', () => {
  it('ignora el comentario de linea', () => {
    expect(textos('int x; // esto es un comentario')).toEqual(['int', 'x', ';']);
  });

  it('ignora el comentario de bloque, incluso multilinea', () => {
    const fuente = 'int x;\n/* lignea\n   otra */ int y;';
    expect(textos(fuente)).toEqual(['int', 'x', ';', 'int', 'y', ';']);
  });

  it('avisa de comentario sin cerrar', () => {
    esperarError('/* sin cerrar', "falta el cierre del comentario");
  });
});

describe('operadores', () => {
  it('elige siempre el operador mas largo', () => {
    expect(textos('>>>=')).toEqual(['>>>=']);
    expect(textos('>>>')).toEqual(['>>>']);
    expect(textos('>>')).toEqual(['>>']);
    expect(textos('>')).toEqual(['>']);
    expect(textos('>=')).toEqual(['>=']);
  });

  it('separa asignaciones compuestas', () => {
    expect(textos('x >>>= 2; y <<= 1;')).toEqual(['x', '>>>=', '2', ';', 'y', '<<=', '1', ';']);
  });

  it('divide === en == y =', () => {
    expect(textos('a === b')).toEqual(['a', '==', '=', 'b']);
  });
});

describe('errores generales', () => {
  it('rechaza caracteres que no son de Java', () => {
    esperarError('int ¿ = 1;', 'no es un carácter válido');
  });

  it('rechaza el simbolo de euros fuera de una cadena', () => {
    esperarError('5 €', 'no es un carácter válido');
  });
});

describe('posiciones', () => {
  it('registra linea, columna y longitud', () => {
    const tokens = sinFin('int x = 42;');
    const numero = tokens[3];
    expect(numero).toMatchObject({ linea: 1, columna: 9, longitud: 2, texto: '42' });
  });

  it('cuenta lineas correctamente en un fuente multilinea', () => {
    const tokens = sinFin('int a;\nint b;\n  int c;');
    const c = tokens.find((t) => t.texto === 'c');
    expect(c).toMatchObject({ linea: 3, columna: 7 });
  });

  it('reinicia la columna tras un salto de linea', () => {
    const tokens = sinFin('int a;\nint b;');
    expect(tokens[3]).toMatchObject({ texto: 'int', linea: 2, columna: 1 });
  });
});

describe('casos comunes del subconjunto', () => {
  it('tokeniza una clase completa', () => {
    const fuente = 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hola");\n  }\n}\n';
    const t = tipos(fuente);
    expect(t[0]).toBe(TIPO.PALABRA_CLAVE);
    expect(t[1]).toBe(TIPO.PALABRA_CLAVE);
    expect(t[2]).toBe(TIPO.IDENTIFICADOR);
    expect(t).toContain(TIPO.CADENA);
  });

  it('produce siempre un token de fin', () => {
    const tokens = leerTokens('');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].tipo).toBe(TIPO.FIN);
  });

  it('emite >> como un solo token, algo que el parser debera partir en genericos', () => {
    expect(textos('List<List<String>>')).toContain('>>');
  });
});
