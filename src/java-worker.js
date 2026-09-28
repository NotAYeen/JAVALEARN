import { runJava } from './engine/interpreter.js';

const DEFAULT_STEP_LIMIT = 20000000;

self.onmessage = function (event) {
    const data = event.data || {};

    if (data.type === 'init') {
        const probe = runJava('public class Mision { public static void main(String[] args) { } }', { stepLimit: 100000 });
        self.postMessage({ type: 'ready', ok: probe.ok === true });
        return;
    }

    if (data.type === 'run') {
        const stepLimit = data.stepLimit || DEFAULT_STEP_LIMIT;
        const result = runJava(data.code || '', { stepLimit });
        self.postMessage({
            type: 'result',
            ok: result.ok === true,
            stdout: result.stdout || '',
            stderr: result.stderr || '',
            error: result.error || null
        });
    }
};
