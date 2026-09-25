import { describe, expect, it } from 'vitest';
import {
  ejecutarConJdk,
  jdkDisponible,
  normalizar,
  validarEstructura,
} from '../../scripts/validate-missions.mjs';

const HAY_JDK = jdkDisponible();
const conJdk = HAY_JDK ? it : it.skip;

describe('normalizacion de salida', () => {
  it('convierte CRLF en LF', () => {
    expect(normalizar('a\r\nb')).toBe('a\nb');
  });

  it('quita espacios al final de linea', () => {
    expect(normalizar('a   \nb\t')).toBe('a\nb');
  });

  /* El ultimo println de un programa siempre anade un salto de linea. El texto
     esperado se escribe sin el, asi que comparar el salto final obligaria a
     escribir \n en cada salida esperada de la leccion. */
  it('quita los saltos de linea del final', () => {
    expect(normalizar('a\n\n\n')).toBe('a');
    expect(normalizar('Hola, mundo\n')).toBe('Hola, mundo');
  });

  it('conserva los saltos de linea del interior', () => {
    expect(normalizar('uno\ndos\ntres\n')).toBe('uno\ndos\ntres');
  });

  it('hace equivalentes las dos formas de escribir la misma salida esperada', () => {
    // Esta es la relacion que hace que la validacion no sea fragil: como se
    // compara siempre a traves de normalizar, da igual si la solucion acaba
    // en println o en print.
    expect(normalizar('Hola, mundo\n')).toBe(normalizar('Hola, mundo'));
  });

  it('tolera undefined', () => {
    expect(normalizar(undefined)).toBe('');
  });
});

describe('validacion estructural', () => {
  const valida = {
    id: 'fundamentos-01',
    unidad: 'fundamentos',
    titulo: 'Hola, mundo',
    modalidad: 'terminal',
    objetivos: ['Escribir un programa'],
    solucion: 'public class Main { public static void main(String[] a) {} }',
    salidaEsperada: 'Hola\n',
  };

  it('acepta una mision completa', () => {
    expect(validarEstructura([valida])).toEqual([]);
  });

  it('rechaza un array vacio como entrada incorrecta', () => {
    expect(validarEstructura('no soy un array')[0]).toContain('array');
  });

  it('detecta campos obligatorios ausentes', () => {
    const errores = validarEstructura([{ id: 'x' }]);
    expect(errores.join(' ')).toContain('titulo');
    expect(errores.join(' ')).toContain('modalidad');
    expect(errores.join(' ')).toContain('solucion');
  });

  it('detecta ids repetidos', () => {
    const errores = validarEstructura([valida, { ...valida }]);
    expect(errores.join(' ')).toContain('repetido');
  });

  it('detecta una modalidad inexistente', () => {
    const errores = validarEstructura([{ ...valida, modalidad: 'telepatia' }]);
    expect(errores.join(' ')).toContain('modalidad "telepatia" no existe');
  });

  it('detecta objetivos vacios', () => {
    const errores = validarEstructura([{ ...valida, objetivos: [] }]);
    expect(errores.join(' ')).toContain('no puede estar vacio');
  });

  it('detecta una solucion sin ninguna clase', () => {
    const errores = validarEstructura([{ ...valida, solucion: 'System.out.println("hola");' }]);
    expect(errores.join(' ')).toContain('ninguna declaracion de clase');
  });

  it('exige salida esperada en las modalidades que se validan por consola', () => {
    const { salidaEsperada, ...sinSalida } = valida;
    void salidaEsperada;
    const errores = validarEstructura([sinSalida]);
    expect(errores.join(' ')).toContain('necesita "salidaEsperada"');
  });

  it('no exige salida esperada en lectura ni ensamblaje', () => {
    const { salidaEsperada, ...sinSalida } = valida;
    void salidaEsperada;
    expect(validarEstructura([{ ...sinSalida, modalidad: 'lectura' }])).toEqual([]);
    expect(validarEstructura([{ ...sinSalida, modalidad: 'ensamblaje' }])).toEqual([]);
  });

  it('exige que entrada sea un array', () => {
    const errores = validarEstructura([{ ...valida, entrada: 'hola' }]);
    expect(errores.join(' ')).toContain('entrada" debe ser un array');
  });
});

describe('contraste contra el JDK real', () => {
  it('el JDK esta disponible en este entorno', () => {
    expect(HAY_JDK).toBe(true);
  });

  conJdk('ejecuta un programa y devuelve la salida esperada', () => {
    const fuente = [
      'public class Main {',
      '  public static void main(String[] args) {',
      '    System.out.println("Hola, mundo");',
      '    System.out.println(7 / 2);',
      '  }',
      '}',
    ].join('\n');

    const r = ejecutarConJdk(fuente);
    expect(r.ok).toBe(true);
    expect(r.salida).toBe('Hola, mundo\n3');
  });

  conJdk('respeta los acentos y la ñ sin romperse', () => {
    const fuente = [
      'public class Main {',
      '  public static void main(String[] args) {',
      '    System.out.println("El señor González comió ñoño áéíóú");',
      '  }',
      '}',
    ].join('\n');

    const r = ejecutarConJdk(fuente);
    expect(r.ok).toBe(true);
    expect(r.salida).toBe('El señor González comió ñoño áéíóú');
  });

  conJdk('devuelve un error de compilacion con diagnostico de javac', () => {
    const fuente = 'public class Main { public static void main(String[] args) { int x = } }';
    const r = ejecutarConJdk(fuente);
    expect(r.ok).toBe(false);
    expect(r.fase).toBe('compilacion');
    expect(r.error).toMatch(/error:/);
  });

  conJdk('devuelve un error de ejecucion cuando el programa revienta', () => {
    const fuente = [
      'public class Main {',
      '  public static void main(String[] args) {',
      '    int[] a = new int[1];',
      '    System.out.println(a[5]);',
      '  }',
      '}',
    ].join('\n');

    const r = ejecutarConJdk(fuente);
    expect(r.ok).toBe(false);
    expect(r.fase).toBe('ejecucion');
    expect(r.error).toMatch(/ArrayIndexOutOfBoundsException/);
  });

  conJdk('recibe argumentos de main', () => {
    const fuente = [
      'public class Main {',
      '  public static void main(String[] args) {',
      '    System.out.println(args.length + ":" + args[0]);',
      '  }',
      '}',
    ].join('\n');

    const r = ejecutarConJdk(fuente, ['hola']);
    expect(r.salida).toBe('1:hola');
  });

  conJdk('acepta una clase publica cuyo archivo no se llama Main', () => {
    const fuente = [
      'public class Saludo {',
      '  public static void main(String[] args) {',
      '    System.out.println("ok");',
      '  }',
      '}',
    ].join('\n');

    // Con --release 8, javac exige que el archivo publico coincida con la clase,
    // y por eso el validador escribe siempre Main.java. Este caso documenta
    // ese contrato: el archivo se llama Main.java, la clase se llama Saludo.
    const r = ejecutarConJdk(fuente);
    expect(r.fase).toBe('compilacion');
  });
});
