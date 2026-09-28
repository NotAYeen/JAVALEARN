/**
 * @vitest-environment jsdom
 *
 * Las pestanas moviles deciden que panel se ve. Este test carga el marcado real
 * de index.html y comprueba que los tres paneles existen y que se pueden cambiar,
 * que es justo lo que rompia en telefono.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { App } from '../../src/App.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const PANELES = [
    { tab: 'tab-btn-editor', panel: 'layout-mid' },
    { tab: 'tab-btn-schema', panel: 'layout-left' },
    { tab: 'tab-btn-mission', panel: 'layout-right' }
];

function montarApp() {
    document.documentElement.innerHTML = readFileSync(join(RAIZ, 'index.html'), 'utf8');
    const app = Object.create(App.prototype);
    app.setupTabs();
    return app;
}

const visible = (id) => !document.getElementById(id).classList.contains('mobile-hide-panel');

describe('Pestanas moviles', () => {
    beforeEach(() => {
        montarApp();
    });

    it('el marcado declara los tres paneles que controla la barra de pestanas', () => {
        for (const { panel } of PANELES) {
            expect(document.getElementById(panel), `falta #${panel}`).not.toBeNull();
        }
        const barra = document.getElementById('mobile-tab-bar');
        expect(barra).not.toBeNull();
        expect(barra.querySelectorAll('button.mobile-tab-btn')).toHaveLength(3);
    });

    it('arranca mostrando el editor y ocultando los otros paneles', () => {
        expect(visible('layout-mid')).toBe(true);
        expect(visible('layout-left')).toBe(false);
        expect(visible('layout-right')).toBe(false);
    });

    it('al pulsar Conceptos muestra el panel de conceptos y oculta los demas', () => {
        document.getElementById('tab-btn-schema').click();
        expect(visible('layout-left')).toBe(true);
        expect(visible('layout-mid')).toBe(false);
        expect(visible('layout-right')).toBe(false);
        expect(document.getElementById('tab-btn-schema').getAttribute('aria-selected')).toBe('true');
    });

    it('al pulsar Misión muestra el panel de misión y oculta los demas', () => {
        document.getElementById('tab-btn-mission').click();
        expect(visible('layout-right')).toBe(true);
        expect(visible('layout-mid')).toBe(false);
        expect(visible('layout-left')).toBe(false);
    });

    it('vuelve al editor y mantiene el estado de las tres pestanas', () => {
        document.getElementById('tab-btn-mission').click();
        document.getElementById('tab-btn-editor').click();
        expect(visible('layout-mid')).toBe(true);
        expect(visible('layout-left')).toBe(false);
        expect(visible('layout-right')).toBe(false);
        expect(document.getElementById('tab-btn-editor').getAttribute('aria-selected')).toBe('true');
        expect(document.getElementById('tab-btn-mission').getAttribute('aria-selected')).toBe('false');
    });

    it('ninguna pulsacion lanza errores de JavaScript', () => {
        for (const { tab } of PANELES) {
            expect(() => document.getElementById(tab).click()).not.toThrow();
        }
    });
});
