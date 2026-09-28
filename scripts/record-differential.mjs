// Graba la salida de cada caso de tests/cases.js usando un JDK real.
// Sirve para regenerar la referencia cuando el motor mejora:
//
//   npm run record
//
// Requiere javac/java en el PATH o JAVA_HOME configurado.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CASES } from '../tests/cases.js';

const JAVA_HOME = process.env.JAVA_HOME || '';
const tool = (name) => (JAVA_HOME ? join(JAVA_HOME, 'bin', name) : name);

function runReal(source, dir) {
    writeFileSync(join(dir, 'Mision.java'), source, 'utf8');
    try {
        execFileSync(tool('javac'), ['-d', dir, join(dir, 'Mision.java')], { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
        return { ok: false, stdout: '', error: String(e.stderr || e.message).split('\n')[0].trim() };
    }
    try {
        const stdout = execFileSync(tool('java'), ['-Dfile.encoding=UTF-8', '-cp', dir, 'Mision'], {
            encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
        });
        return { ok: true, stdout: stdout.replace(/\r\n/g, '\n') };
    } catch (e) {
        return { ok: false, stdout: String(e.stdout || ''), error: String(e.stderr || e.message).split('\n')[0].trim() };
    }
}

function main() {
    const dir = mkdtempSync(join(tmpdir(), 'javalearn-record-'));
    const recorded = [];
    const rejected = [];

    for (const c of CASES) {
        const r = runReal(c.code, dir);
        if (!r.ok) rejected.push(`${c.name} (${r.error})`);
        recorded.push({ name: c.name, ok: r.ok, stdout: r.stdout });
    }

    rmSync(dir, { recursive: true, force: true });

    const fixture = new URL('../tests/fixtures/differential.json', import.meta.url);
    writeFileSync(fixture, JSON.stringify(recorded, null, 2) + '\n', 'utf8');
    console.log(`Grabados ${recorded.length} casos en tests/fixtures/differential.json`);
    if (rejected.length) {
        console.log(`Casos que el JDK real rechaza a propósito: ${rejected.join('; ')}`);
    }
}

main();
