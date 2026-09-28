import { describe, it, expect, beforeAll } from 'vitest';

let handle = null;
const posted = [];

function send(data) {
    posted.length = 0;
    handle({ data });
    return posted[0];
}

beforeAll(async () => {
    globalThis.self = {
        postMessage: (msg) => posted.push(msg)
    };
    await import('../src/java-worker.js');
    handle = globalThis.self.onmessage;
});

describe('Worker del motor Java', () => {
    it('responde ready con ok al inicializar', () => {
        const res = send({ type: 'init' });
        expect(res).toEqual({ type: 'ready', ok: true });
    });

    it('ejecuta un programa y devuelve stdout', () => {
        const res = send({
            type: 'run',
            code: 'public class Mision { public static void main(String[] args) { System.out.println("Hola, mundo"); } }'
        });
        expect(res.type).toBe('result');
        expect(res.ok).toBe(true);
        expect(res.stdout).toBe('Hola, mundo\n');
        expect(res.stderr).toBe('');
        expect(res.error).toBeNull();
    });

    it('devuelve el error de compilación sin lanzar excepciones', () => {
        const res = send({ type: 'run', code: 'public class Mision { public static void main(String[] args) { System.out.println(zz); } }' });
        expect(res.ok).toBe(false);
        expect(res.stdout).toBe('');
        expect(res.error.kind).toBe('compilacion');
        expect(res.error.message).toContain('cannot find symbol');
    });

    it('acepta código vacío sin errores', () => {
        const res = send({ type: 'run', code: '' });
        expect(res.ok).toBe(true);
        expect(res.stdout).toBe('');
    });

    it('respeta el límite de pasos recibido', () => {
        const res = send({
            type: 'run',
            stepLimit: 30000,
            code: 'public class Mision { public static void main(String[] args) { while (true) { } } }'
        });
        expect(res.ok).toBe(false);
        expect(res.error.kind).toBe('motor');
    });
});
