/**
 * Coherencia entre el marcado y el codigo: si la UI pide un id que no existe,
 * la parte afectada se queda en blanco sin avisar. Esto ya paso con las
 * pestanas moviles, asi que se comprueba de forma estatica.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const html = readFileSync(join(RAIZ, 'index.html'), 'utf8');

const idsHtml = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));

// Ids que la aplicacion crea en tiempo de ejecucion, no en el HTML inicial.
const DINAMICOS = new Set(['reset-progress-btn']);

function listarJs(dir = join(RAIZ, 'src')) {
    const salida = [];
    for (const entrada of readdirSync(dir)) {
        const ruta = join(dir, entrada);
        if (statSync(ruta).isDirectory()) salida.push(...listarJs(ruta));
        else if (entrada.endsWith('.js')) salida.push(ruta);
    }
    return salida;
}

describe('Coherencia del marcado', () => {
    it('todos los ids que pide la UI existen en index.html', () => {
        const ausentes = [];
        for (const archivo of listarJs()) {
            const fuente = readFileSync(archivo, 'utf8');
            for (const m of fuente.matchAll(/\$\('([^']+)'\)/g)) {
                const id = m[1];
                if (!idsHtml.has(id) && !DINAMICOS.has(id)) {
                    ausentes.push(`${archivo.replace(RAIZ, '.')}: #${id}`);
                }
            }
        }
        expect(ausentes, `ids inexistentes: ${ausentes.join(', ')}`).toHaveLength(0);
    });

    it('cada aria-controls apunta a un elemento real', () => {
        const rotos = [...html.matchAll(/aria-controls="([^"]+)"/g)]
            .map((m) => m[1])
            .filter((id) => !idsHtml.has(id));
        expect(rotos).toHaveLength(0);
    });

    it('el marcado no conserva nombres de Python del proyecto anterior', () => {
        const sospechosos = ['pylearn', 'pyodide', 'python', 'difficulty-select', 'dnd-source', 'dnd-target'];
        const bajo = html.toLowerCase();
        const encontrados = sospechosos.filter((t) => bajo.includes(t));
        expect(encontrados).toHaveLength(0);
    });
});
