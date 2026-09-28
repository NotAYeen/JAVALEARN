/**
 * @vitest-environment jsdom
 *
 * El selector de misiones agrupa por dificultad. Al cerrar la fase F2 el grupo
 * Experto pasa a tener misiones reales, asi que conviene vigilar que la lista
 * completa se monta y que el nivel guardado sigue siendo valido.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { App } from '../../src/App.js';
import { Storage } from '../../src/storage.js';
import { LEVELS } from '../../src/levels.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function montarApp(indice) {
    document.documentElement.innerHTML = readFileSync(join(RAIZ, 'index.html'), 'utf8');
    const app = Object.create(App.prototype);
    app.levelIndex = indice;
    app.currentLevel = LEVELS[indice];
    app.getCompleted = () => Storage.getItem('java_sim_completed', []) || [];
    app.buildSelector();
    return app;
}

describe('Selector de misiones', () => {
    beforeEach(() => {
        Storage.removeItem('java_sim_completed');
    });

    it('monta las 32 misiones agrupadas en los cuatro niveles de dificultad', () => {
        montarApp(0);
        const select = document.getElementById('db-selector');
        const grupos = [...select.querySelectorAll('optgroup')];
        expect(grupos.map((g) => g.label)).toEqual(['Básico', 'Intermedio', 'Avanzado', 'Experto']);
        expect(select.querySelectorAll('option')).toHaveLength(32);
        expect(grupos.reduce((n, g) => n + g.children.length, 0)).toBe(32);
    });

    it('el grupo Experto contiene las cuatro misiones finales', () => {
        montarApp(28);
        const grupos = [...document.getElementById('db-selector').querySelectorAll('optgroup')];
        const experto = grupos.find((g) => g.label === 'Experto');
        expect(experto).toBeDefined();
        expect([...experto.children].map((o) => o.textContent)).toEqual([
            '29. MCD y Dígitos',
            '30. Almacén Ordenado',
            '31. Lista de Debate',
            '32. Cuadrilla de Agentes'
        ]);
    });

    it('deja seleccionado el nivel que se está mostrando', () => {
        for (const indice of [0, 18, 19, 24, 31]) {
            montarApp(indice);
            expect(document.getElementById('db-selector').value).toBe(String(indice));
        }
    });
});
