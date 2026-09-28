import JavaEngineWorker from './java-worker.js?worker';
import { runJava } from './engine/interpreter.js';

const WORKER_STEP_LIMIT = 20000000;
const INLINE_STEP_LIMIT = 5000000;
const TIMEOUT_MS = 8000;

export class JavaRunner {
    constructor(onStatus) {
        this.worker = null;
        this.inline = false;
        this.pending = null;
        this.onStatus = onStatus || (() => {});
    }

    init() {
        if (typeof Worker === 'undefined') {
            this.useInline('Worker no disponible: modo directo');
            return;
        }
        try {
            this.worker = new JavaEngineWorker();
            this.worker.onmessage = (e) => this.onWorkerMessage(e);
            this.worker.onerror = (e) => {
                this.useInline('No se pudo iniciar el worker: modo directo');
                if (e && e.preventDefault) e.preventDefault();
            };
            this.worker.postMessage({ type: 'init' });
            this.onStatus('Motor Java: iniciando…');
        } catch (e) {
            this.useInline('Worker bloqueado: modo directo');
        }
    }

    useInline(reason) {
        this.stopWorker();
        this.inline = true;
        this.onStatus(reason ? `Motor Java: modo directo (${reason})` : 'Motor Java: modo directo listo ✓');
    }

    stopWorker() {
        if (this.worker) {
            try { this.worker.terminate(); } catch (e) {}
            this.worker = null;
        }
    }

    onWorkerMessage(e) {
        const data = e.data || {};
        if (data.type === 'ready') {
            if (data.ok) this.onStatus('Motor Java listo ✓');
            else this.useInline('worker no disponible');
            return;
        }
        if (data.type === 'result' && this.pending) {
            const p = this.pending;
            this.pending = null;
            p.resolve(this.normalize(data, 'worker'));
        }
    }

    run(code) {
        if (!code || !code.trim()) {
            return Promise.resolve({ ok: true, stdout: '', stderr: '', error: null, mode: this.inline ? 'directo' : 'worker' });
        }
        if (this.worker && !this.inline) return this.runInWorker(code);
        return Promise.resolve(this.runInline(code));
    }

    runInWorker(code) {
        return new Promise((resolve) => {
            this.pending = { resolve };
            const timer = setTimeout(() => {
                if (!this.pending) return;
                this.pending = null;
                this.useInline('tiempo agotado');
                resolve({
                    ok: false, stdout: '', error: null, mode: 'worker',
                    stderr: `Tiempo de ejecución agotado (${TIMEOUT_MS / 1000}s). ¿Bucle infinito?`
                });
            }, TIMEOUT_MS);

            const original = this.worker.onmessage;
            this.worker.onmessage = (e) => {
                clearTimeout(timer);
                this.worker.onmessage = original;
                original(e);
            };

            this.worker.postMessage({ type: 'run', code, stepLimit: WORKER_STEP_LIMIT });
        });
    }

    runInline(code) {
        let result;
        try {
            result = runJava(code, { stepLimit: INLINE_STEP_LIMIT });
        } catch (e) {
            return {
                ok: false, stdout: '', error: null, mode: 'directo',
                stderr: `Error del motor Java: ${e && e.message ? e.message : String(e)}`
            };
        }
        return this.normalize(result, 'directo');
    }

    normalize(result, mode) {
        return {
            ok: result.ok === true,
            stdout: result.stdout || '',
            stderr: result.stderr || '',
            error: result.error || null,
            mode
        };
    }
}
