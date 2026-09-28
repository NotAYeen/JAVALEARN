/* Errores del motor: errores de compilación (estilo javac) y control de ejecución. */

/** Error de compilación con línea y columna, como los que muestra javac. */
export class JavaCompileError extends Error {
    constructor(message, line = 0, col = 0) {
        super(message);
        this.name = 'JavaCompileError';
        this.line = line;
        this.col = col;
    }

    /** Formato mostrado en el panel de resultados: "mensaje (línea L, columna C)". */
    format() {
        if (this.line > 0) return `${this.message} (línea ${this.line}, columna ${this.col})`;
        return this.message;
    }
}

/** Excepción Java en vuelo: transporta el objeto de excepción ya construido. */
export class JavaThrow extends Error {
    constructor(javaObject) {
        super('[java] excepción en vuelo');
        this.name = 'JavaThrow';
        this.javaObject = javaObject;
    }
}

/** Se lanza cuando el programa supera el presupuesto de pasos (posible bucle infinito). */
export class StepLimitError extends Error {
    constructor(limit) {
        super(`Límite de pasos superado (${limit.toLocaleString('es-ES')}). Posible bucle infinito.`);
        this.name = 'StepLimitError';
        this.limit = limit;
    }
}

/** Error interno del motor (bug), no del código del estudiante. */
export class EngineError extends Error {
    constructor(message) {
        super(message);
        this.name = 'EngineError';
    }
}
