import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LEVELS } from '../src/levels.js';
import { runJava } from '../src/engine/interpreter.js';
import { compareOutput, normalizeOutput } from '../src/compare.js';

const STEP_LIMIT = 20000000;
const USE_JDK = process.argv.includes('--jdk');
const JAVA_HOME = process.env.JAVA_HOME || '';

function jdkTool(name) {
    if (!JAVA_HOME) return null;
    const path = join(JAVA_HOME, 'bin', name + (process.platform === 'win32' ? '.exe' : ''));
    try {
        execFileSync(path, ['-version'], { stdio: 'ignore' });
        return path;
    } catch (e) {
        return null;
    }
}

function runEngine(code) {
    const res = runJava(code, { stepLimit: STEP_LIMIT });
    return {
        ok: res.ok === true,
        stdout: normalizeOutput(res.stdout),
        error: res.error ? res.error.message : ''
    };
}

function runJdk(javac, java, dir, code) {
    writeFileSync(join(dir, 'Mision.java'), code, 'utf8');
    try {
        execFileSync(javac, ['-d', dir, join(dir, 'Mision.java')], { stdio: ['ignore', 'pipe', 'pipe'] });
        const out = execFileSync(java, ['-cp', dir, 'Mision'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        return { ok: true, stdout: normalizeOutput(out), error: '' };
    } catch (e) {
        const msg = (e.stderr || e.stdout || '').split('\n').filter(Boolean)[0] || 'error';
        return { ok: false, stdout: '', error: msg.trim() };
    }
}

function checkSchema(level, problems) {
    const id = level.id_nivel;
    if (!level.title) problems.push(`${id}: falta title`);
    if (!level.briefing_mision) problems.push(`${id}: falta briefing_mision`);
    if (!level.solution_code) problems.push(`${id}: falta solution_code`);
    if (!level.expected_output) problems.push(`${id}: falta expected_output`);
    if (level.dificultad === undefined) problems.push(`${id}: falta dificultad`);
    if (!level.modalidad) problems.push(`${id}: falta modalidad`);
    if (!Array.isArray(level.conceptos) || !level.conceptos.length) problems.push(`${id}: sin conceptos`);
    if (!Array.isArray(level.pistas) || !level.pistas.length) problems.push(`${id}: sin pistas`);

    if (level.modalidad === 'Depuración' && !level.query_defectuoso) {
        problems.push(`${id}: modalidad Depuración sin query_defectuoso`);
    }
    if (level.modalidad === 'Auditoría') {
        if (!Array.isArray(level.audit_tokens) || !level.audit_tokens.length) {
            problems.push(`${id}: auditoría sin audit_tokens`);
        } else if (level.token_error_index === undefined || level.token_error_index < 0 ||
            level.token_error_index >= level.audit_tokens.length) {
            problems.push(`${id}: token_error_index fuera de rango`);
        } else {
            const solLines = level.solution_code.replace(/\n$/, '').split('\n');
            if (level.audit_tokens.length !== solLines.length) {
                problems.push(`${id}: audit_tokens (${level.audit_tokens.length}) != líneas solución (${solLines.length})`);
            } else {
                const diff = level.audit_tokens.filter((line, i) => line !== solLines[i]);
                if (diff.length !== 1) {
                    problems.push(`${id}: se espera exactamente 1 línea distinta entre audit_tokens y la solución (hay ${diff.length})`);
                } else if (!level.explicacion) {
                    problems.push(`${id}: auditoría sin explicacion`);
                }
            }
        }
    }
    if (level.modalidad === 'Ensamblaje') {
        if (!Array.isArray(level.dnd_blocks) || !level.dnd_blocks.length || level.dnd_blocks.length > 14) {
            problems.push(`${id}: dnd_blocks inválido o mayor a 14`);
        } else {
            const solLines = level.solution_code.split('\n').filter((l) => l.trim());
            if (level.dnd_blocks.length !== solLines.length) {
                problems.push(`${id}: dnd_blocks (${level.dnd_blocks.length}) != líneas solución (${solLines.length})`);
            }
        }
    }
}

function main() {
    const problems = [];
    const warnings = [];
    let okCount = 0;
    let jdkCount = 0;

    const javac = USE_JDK ? jdkTool('javac') : null;
    const java = USE_JDK ? jdkTool('java') : null;
    const dir = mkdtempSync(join(tmpdir(), 'javalearn-validate-'));

    for (const level of LEVELS) {
        const id = level.id_nivel;
        checkSchema(level, problems);

        if (!level.solution_code) continue;

        const engine = runEngine(level.solution_code);
        if (!engine.ok) {
            problems.push(`${id}: la solución falla en el motor -> ${engine.error}`);
            continue;
        }

        const cmp = compareOutput(engine.stdout, level.expected_output);
        if (!cmp.pass) {
            problems.push(`${id}: la salida del motor no coincide con expected_output`);
            problems.push(`  esperado: ${JSON.stringify(cmp.expected)}`);
            problems.push(`  obtenido: ${JSON.stringify(cmp.actual)}`);
            continue;
        }
        okCount++;

        if (javac && java) {
            const jdk = runJdk(javac, java, dir, level.solution_code);
            if (!jdk.ok) {
                problems.push(`${id}: la solución no compila con el JDK real -> ${jdk.error}`);
            } else if (jdk.stdout !== cmp.actual) {
                problems.push(`${id}: el JDK real produce otra salida`);
                problems.push(`  jdk:    ${JSON.stringify(jdk.stdout)}`);
                problems.push(`  motor:  ${JSON.stringify(cmp.actual)}`);
            } else {
                jdkCount++;
            }
        }
    }

    for (const level of LEVELS.filter((l) => l.modalidad === 'Depuración')) {
        if (!level.query_defectuoso) continue;
        const buggy = runEngine(level.query_defectuoso);
        if (buggy.ok && compareOutput(buggy.stdout, level.expected_output).pass) {
            problems.push(`${level.id_nivel}: query_defectuoso ya pasa la misión (el modo Depuración no tendría sentido)`);
        } else if (buggy.ok) {
            warnings.push(`${level.id_nivel}: query_defectuoso compila y produce otra salida (revisar si es intencionado)`);
        }
    }

    for (const level of LEVELS.filter((l) => l.modalidad === 'Auditoría')) {
        if (!Array.isArray(level.audit_tokens) || !level.audit_tokens.length) continue;
        const buggy = runEngine(level.audit_tokens.join('\n'));
        if (buggy.ok && compareOutput(buggy.stdout, level.expected_output).pass) {
            problems.push(`${level.id_nivel}: el código auditado ya pasa la misión (la auditoría no tendría sentido)`);
        }
        const idx = level.token_error_index;
        if (idx !== undefined && idx >= 0) {
            const solLines = (level.solution_code || '').replace(/\n$/, '').split('\n');
            if (level.audit_tokens[idx] === solLines[idx]) {
                problems.push(`${level.id_nivel}: token_error_index apunta a una línea idéntica a la solución`);
            }
        }
    }

    for (const level of LEVELS.filter((l) => l.modalidad === 'Ensamblaje')) {
        if (!Array.isArray(level.dnd_blocks) || !level.dnd_blocks.length) continue;
        const assembled = level.dnd_blocks.join('\n');
        const engine = runEngine(assembled);
        if (!engine.ok) {
            problems.push(`${level.id_nivel}: el programa ensamblado no compila -> ${engine.error}`);
        } else if (!compareOutput(engine.stdout, level.expected_output).pass) {
            problems.push(`${level.id_nivel}: el programa ensamblado no produce la salida esperada`);
        }
    }

    rmSync(dir, { recursive: true, force: true });

    console.log(`Niveles válidos: ${okCount}/${LEVELS.length}`);
    if (javac && java) {
        console.log(`Verificados contra OpenJDK 17: ${jdkCount}/${LEVELS.length}`);
    } else {
        console.log('Verificación con JDK real: omitida (usa `npm run validate -- --jdk` con JAVA_HOME configurado)');
    }

    if (warnings.length) {
        console.log('\nAvisos:');
        warnings.forEach((w) => console.log('  - ' + w));
    }

    if (problems.length) {
        console.log('\nProblemas:');
        problems.forEach((p) => console.log('  - ' + p));
        process.exit(1);
    }

    console.log('Todo correcto.');
}

main();
