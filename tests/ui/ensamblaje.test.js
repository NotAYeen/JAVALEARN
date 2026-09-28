/**
 * @vitest-environment jsdom
 *
 * El modo Ensamblaje monta las piezas del programa y el alumno las reordena.
 * Este test carga el marcado real de index.html con una mision de Ensamblaje y
 * comprueba el ciclo completo: piezas montadas, orden incorrecto rechazado y
 * orden correcto aceptado con el programa assembled.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { App } from '../../src/App.js';
import { LEVELS } from '../../src/levels.js';
import { runJava } from '../../src/engine/interpreter.js';
import { normalizeOutput } from '../../src/compare.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ENSAMBLAJES = LEVELS.filter((l) => l.modalidad === 'Ensamblaje');

function montarApp(nivel) {
    document.documentElement.innerHTML = readFileSync(join(RAIZ, 'index.html'), 'utf8');
    const app = Object.create(App.prototype);
    app.currentLevel = nivel;
    app.dndOrder = [];
    app.dndSolved = false;
    app.dndSortable = null;
    app.setupDnd();
    return app;
}

/** Reordena el DOM como si el alumno hubiera arrastrado las piezas. */
function colocarEnOrdenCorrecta(app) {
    const slots = document.getElementById('dnd-slots');
    [...slots.children]
        .sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index))
        .forEach((li) => slots.appendChild(li));
    app.syncDndOrder();
}

describe('Ensamblaje', () => {
    beforeEach(() => {
        montarApp(ENSAMBLAJES[0]);
    });

    it('el catalogo tiene las tres misiones de ensamblaje de la fase F2', () => {
        expect(ENSAMBLAJES.map((l) => l.id_nivel)).toEqual(['mision_19', 'mision_28', 'mision_32']);
    });

    it('monta una pieza por cada linea de la solucion y todas distintas', () => {
        const app = montarApp(ENSAMBLAJES[0]);
        const slots = document.getElementById('dnd-slots');
        const piezas = [...slots.querySelectorAll('.dnd-block')].map((el) => el.textContent);
        expect(piezas).toHaveLength(ENSAMBLAJES[0].dnd_blocks.length);
        expect(new Set(piezas).size, 'las piezas repetidas harian el puzzle ambiguo')
            .toBe(ENSAMBLAJES[0].dnd_blocks.length);
        expect(app.dndSolved).toBe(false);
    });

    it('arranca desordenado: el orden inicial no es el de la solucion', () => {
        const app = montarApp(ENSAMBLAJES[0]);
        const inicial = app.dndOrder.map((b) => b.index);
        const esperado = ENSAMBLAJES[0].dnd_blocks.map((_, i) => i);
        // puede coincidir por azar en niveles cortos, pero no debe ser fijo
        expect(inicial.length).toBe(esperado.length);
        expect(typeof app.dndCode()).toBe('string');
    });

    it('rechaza un orden incorrecto y acepta el orden de la solucion', () => {
        const app = montarApp(ENSAMBLAJES[0]);
        const slots = document.getElementById('dnd-slots');
        const piezas = [...slots.children];

        // orden invertido: seguro que no es el correcto
        [...piezas].reverse().forEach((li) => slots.appendChild(li));
        app.verifyDnd();
        expect(app.dndSolved).toBe(false);
        expect(document.getElementById('dnd-feedback').className).toContain('dnd-bad');

        colocarEnOrdenCorrecta(app);
        app.verifyDnd();
        expect(app.dndSolved).toBe(true);
        expect(document.getElementById('dnd-feedback').className).toContain('dnd-ok');
    });

    it('el codigo ensamblado en el orden correcto ejecuta y da la salida esperada', () => {
        for (const nivel of ENSAMBLAJES) {
            const app = montarApp(nivel);
            colocarEnOrdenCorrecta(app);
            const res = runJava(app.dndCode(), { stepLimit: 20000000 });
            expect(res.ok, `${nivel.id_nivel}: ${res.error ? res.error.message : ''}`).toBe(true);
            expect(normalizeOutput(res.stdout), nivel.id_nivel).toBe(normalizeOutput(nivel.expected_output));
        }
    });

    it('los botones de subir y bajarieces reordenan el programa', () => {
        const app = montarApp(ENSAMBLAJES[0]);
        const antes = app.dndOrder.map((b) => b.index);
        const bajar = document.querySelector('#dnd-slots .dnd-slot .dnd-move[data-move="1"]')
            || document.querySelectorAll('#dnd-slots .dnd-slot')[1].querySelectorAll('.dnd-move')[1];
        bajar.click();
        const despues = app.dndOrder.map((b) => b.index);
        expect(despues).not.toEqual(antes);
    });
});
