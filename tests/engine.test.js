import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CASES } from './cases.js';
import { runJava } from '../src/engine/interpreter.js';

const fixture = JSON.parse(
    readFileSync(fileURLToPath(new URL('./fixtures/differential.json', import.meta.url)), 'utf8')
);

describe('Motor Java: diferencial contra OpenJDK 17', () => {
    it('el fixture cubre todos los casos de referencia', () => {
        expect(fixture).toHaveLength(CASES.length);
        expect(fixture.map((f) => f.name)).toEqual(CASES.map((c) => c.name));
    });

    for (let i = 0; i < CASES.length; i++) {
        const name = CASES[i].name;
        it(`produce la misma salida que el JDK real: ${name}`, () => {
            const expected = fixture[i];
            const res = runJava(CASES[i].code, { stepLimit: 20000000 });
            expect(res.ok, `el motor falló: ${res.error ? res.error.message : ''}`).toBe(expected.ok);
            expect(res.stdout).toBe(expected.stdout);
        });
    }
});

describe('Motor Java: contrato de errores', () => {
    const wrapper = (body, extra = '') => `public class Mision {
    ${extra}
    public static void main(String[] args) { ${body} }
}`;

    it('reporta error de compilación con línea y columna', () => {
        const res = runJava(wrapper('System.out.println(desconocido);'));
        expect(res.ok).toBe(false);
        expect(res.error.kind).toBe('compilacion');
        expect(res.error.message).toContain('cannot find symbol');
        expect(res.error.line).toBe(3);
    });

    it('reporta excepción no capturada como Exception in thread "main"', () => {
        const res = runJava(wrapper('int a = 1; int b = 0; System.out.println(a / b);'));
        expect(res.ok).toBe(false);
        expect(res.error.kind).toBe('excepcion');
        expect(res.error.message).toContain('Exception in thread "main"');
        expect(res.error.message).toContain('java.lang.ArithmeticException');
    });

    it('corta los bucles infinitos con el límite de pasos', () => {
        const res = runJava(wrapper('while (true) { }'), { stepLimit: 50000 });
        expect(res.ok).toBe(false);
        expect(res.error.kind).toBe('motor');
        expect(res.error.message).toMatch(/Límite de pasos/);
    });

    it('acepta try/catch y deja seguir el programa', () => {
        const res = runJava(wrapper(
            'try { int z = 1 / 0; } catch (ArithmeticException e) { System.out.println("atrapado"); }',
            'static int f() { return 1; }'
        ));
        expect(res.ok).toBe(true);
        expect(res.stdout).toBe('atrapado\n');
    });

    it('rechaza comparar un boolean con un String', () => {
        const res = runJava(wrapper('boolean b = true; if (b == "true") { System.out.println("si"); }'));
        expect(res.ok).toBe(false);
        expect(res.error.kind).toBe('compilacion');
        expect(res.error.message).toContain('bad operand types for binary operator');
    });

    it('sigue permitiendo comparaciones válidas entre boolean y null o referencias', () => {
        const conNull = runJava(wrapper('boolean b = true; Object o = null; if (b != (o != null)) { System.out.println("si"); } else { System.out.println("no"); }'));
        expect(conNull.ok).toBe(true);
        expect(conNull.stdout).toBe('si\n');

        const entreTextos = runJava(wrapper('String a = "x"; if (a == "x") { System.out.println("igual"); }'));
        expect(entreTextos.ok).toBe(true);
        expect(entreTextos.stdout).toBe('igual\n');
    });
});

describe('Motor Java: caso base de la clase Mision', () => {
    it('ejecuta main público en la clase pública Mision', () => {
        const res = runJava('public class Mision { public static void main(String[] args) { System.out.println("Hola, mundo"); } }');
        expect(res.ok).toBe(true);
        expect(res.stdout).toBe('Hola, mundo\n');
    });

    it('usa los argumentos de main', () => {
        const res = runJava('public class Mision { public static void main(String[] args) { System.out.println(args.length); } }');
        expect(res.ok).toBe(true);
        expect(res.stdout).toBe('0\n');
    });
});
