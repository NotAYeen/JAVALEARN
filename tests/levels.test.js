import { describe, it, expect } from 'vitest';
import { LEVELS } from '../src/levels.js';
import { normalizeOutput, compareOutput } from '../src/compare.js';
import { runJava } from '../src/engine/interpreter.js';

describe('Niveles JavaLearn', () => {
    it('deben existir 32 niveles tras la fase F2', () => {
        expect(LEVELS).toHaveLength(32);
    });

    it('deben tener ids únicos y consecutivos mision_XX', () => {
        const ids = LEVELS.map((l) => l.id_nivel);
        expect(new Set(ids).size).toBe(LEVELS.length);
        LEVELS.forEach((l, i) => {
            const num = String(i + 1).padStart(2, '0');
            expect(l.id_nivel).toBe(`mision_${num}`);
        });
    });

    it('deben tener dificultad, modalidad, briefing, conceptos y solución', () => {
        for (const l of LEVELS) {
            expect(l.dificultad).toBeTruthy();
            expect(['Básico', 'Intermedio', 'Avanzado', 'Experto']).toContain(l.dificultad);
            expect(l.modalidad).toBeTruthy();
            expect(['Terminal', 'Depuración', 'Auditoría', 'Ensamblaje']).toContain(l.modalidad);
            expect(l.briefing_mision).toBeTruthy();
            expect(l.solution_code).toBeTruthy();
            expect(l.expected_output).toBeTruthy();
            expect(l.conceptos.length).toBeGreaterThan(0);
            expect(l.pistas.length).toBeGreaterThan(0);
        }
    });

    it('las modalidades especiales deben traer sus campos', () => {
        const dep = LEVELS.filter((l) => l.modalidad === 'Depuración');
        expect(dep.length).toBeGreaterThan(0);
        for (const l of dep) {
            expect(l.query_defectuoso).toBeTruthy();
            expect(l.query_defectuoso).not.toBe(l.solution_code);
            expect(l.explicacion).toBeTruthy();
        }
    });

    it('la auditoría debe traer tokens alineados con la solución y un índice válido', () => {
        const aud = LEVELS.filter((l) => l.modalidad === 'Auditoría');
        expect(aud.length).toBeGreaterThan(0);
        for (const l of aud) {
            expect(Array.isArray(l.audit_tokens)).toBe(true);
            const solutionLines = l.solution_code.replace(/\n$/, '').split('\n');
            expect(l.audit_tokens.length, `${l.id_nivel}: tokens desalineados`).toBe(solutionLines.length);
            expect(Number.isInteger(l.token_error_index)).toBe(true);
            expect(l.token_error_index).toBeGreaterThanOrEqual(0);
            expect(l.token_error_index).toBeLessThan(l.audit_tokens.length);
            expect(l.explicacion).toBeTruthy();
            const distintos = l.audit_tokens.filter((line, i) => line !== solutionLines[i]);
            expect(distintos.length, `${l.id_nivel}: debe haber una sola línea con fallo`).toBe(1);
            expect(l.audit_tokens[l.token_error_index], `${l.id_nivel}: el índice debe apuntar a la línea distinta`)
                .toBe(distintos[0]);
        }
    });

    it('el código auditado no debe pasar la misión', () => {
        for (const l of LEVELS.filter((x) => x.modalidad === 'Auditoría')) {
            const res = runJava(l.audit_tokens.join('\n'), { stepLimit: 20000000 });
            const passes = res.ok && compareOutput(res.stdout, l.expected_output).pass;
            expect(passes, `${l.id_nivel}: el código auditado ya pasa`).toBe(false);
        }
    });

    it('el ensamblaje debe traer piezas coherentes y un programa ejecutable', () => {
        const ens = LEVELS.filter((x) => x.modalidad === 'Ensamblaje');
        expect(ens.length).toBeGreaterThan(0);
        for (const l of ens) {
            expect(Array.isArray(l.dnd_blocks), `${l.id_nivel}: sin dnd_blocks`).toBe(true);
            expect(l.dnd_blocks.length, `${l.id_nivel}: máximo 14 piezas`).toBeLessThanOrEqual(14);
            const solutionLines = l.solution_code.split('\n').filter((line) => line.trim());
            expect(l.dnd_blocks.length, `${l.id_nivel}: piezas desalineadas con la solución`)
                .toBe(solutionLines.length);
            expect(l.dnd_blocks, `${l.id_nivel}: las piezas deben ser las líneas de la solución`)
                .toEqual(solutionLines);
            const res = runJava(l.dnd_blocks.join('\n'), { stepLimit: 20000000 });
            expect(res.ok, `${l.id_nivel}: el programa ensamblado no compila`).toBe(true);
            expect(normalizeOutput(res.stdout), `${l.id_nivel}: la salida ensamblada`).toBe(normalizeOutput(l.expected_output));
        }
    });

    it('debe mantener la distribución de modalidades acordada para 32 misiones', () => {
        const full = [
            'Terminal', 'Depuración', 'Terminal', 'Terminal', 'Terminal', 'Terminal',
            'Terminal', 'Depuración', 'Terminal', 'Depuración', 'Auditoría', 'Terminal',
            'Terminal', 'Depuración', 'Terminal', 'Terminal', 'Terminal', 'Terminal',
            'Ensamblaje', 'Depuración', 'Terminal', 'Terminal', 'Terminal', 'Terminal',
            'Auditoría', 'Terminal', 'Terminal', 'Ensamblaje', 'Terminal', 'Terminal',
            'Auditoría', 'Ensamblaje'
        ];
        expect(full).toHaveLength(32);
        expect(full.filter((m) => m === 'Terminal')).toHaveLength(21);
        expect(LEVELS.map((l) => l.modalidad)).toEqual(full.slice(0, LEVELS.length));
    });

    it('cada solución debe producir la salida esperada con el motor', () => {
        for (const l of LEVELS) {
            const res = runJava(l.solution_code, { stepLimit: 20000000 });
            expect(res.ok, `${l.id_nivel}: ${res.error ? res.error.message : ''}`).toBe(true);
            expect(normalizeOutput(res.stdout), l.id_nivel).toBe(normalizeOutput(l.expected_output));
        }
    });

    it('el código defectuoso no debe pasar la misión', () => {
        for (const l of LEVELS.filter((x) => x.modalidad === 'Depuración')) {
            const res = runJava(l.query_defectuoso, { stepLimit: 20000000 });
            const passes = res.ok && compareOutput(res.stdout, l.expected_output).pass;
            expect(passes, `${l.id_nivel} el código defectuoso ya pasa`).toBe(false);
        }
    });

    it('deben usar la clase pública Mision', () => {
        for (const l of LEVELS) {
            expect(l.solution_code).toContain('public class Mision');
            expect(l.solution_code).toContain('public static void main(String[] args)');
        }
    });
});

describe('compareOutput', () => {
    it('normaliza retornos de carro y saltos finales', () => {
        expect(normalizeOutput('hola\r\nmundo\r\n')).toBe('hola\nmundo');
        expect(normalizeOutput(' hola \n mundo  \n\n')).toBe(' hola\n mundo');
    });

    it('compara salidas sin importar espacios al final de línea', () => {
        const r = compareOutput('a  \nb', 'a\nb');
        expect(r.pass).toBe(true);
        expect(r.actual).toBe('a\nb');
    });

    it('detecta salidas distintas', () => {
        const r = compareOutput('a\nc', 'a\nb');
        expect(r.pass).toBe(false);
    });

    it('trata entradas nulas como vacío', () => {
        expect(normalizeOutput(null)).toBe('');
        expect(normalizeOutput('')).toBe('');
    });
});
