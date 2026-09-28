/* Modelo de datos en tiempo de ejecución.
 *
 * Representación de valores Java en JavaScript:
 *   int, short, byte, long, float, double -> number
 *   char                                  -> number (código UTF-16)
 *   boolean                               -> boolean
 *   String                                -> string
 *   null                                  -> null
 *   objetos, arrays, colecciones          -> JavaObject
 *
 * El *tipo estático* se propaga aparte (cadena de texto: 'int', 'String', 'Mision'...)
 * porque Java necesita distinguir `int` de `char` al imprimir y `String` de `Object`
 * al concatenar.
 */

import { javaDoubleToString, javaFloatToString, javaBooleanToString, javaCharToString, javaLongToString } from './format.js';
import { EngineError } from './errors.js';

/* ------------------------------ clases ------------------------------ */
export class RuntimeClass {
    constructor(name, opts = {}) {
        this.name = name;
        this.kind = opts.kind || 'class';           // class | interface | enum | record | array
        this.modifiers = opts.modifiers || [];
        this.superClass = null;
        this.interfaces = [];
        this.methods = new Map();                   // nombre -> [def]
        this.fields = new Map();                    // nombre -> def (campos de instancia)
        this.staticFields = new Map();              // nombre -> def (campos estáticos)
        this.natives = new Map();                   // "nombre/aridad" -> función nativa
        this.nativeReturns = new Map();             // "nombre/aridad" -> tipo de retorno estático
        this.accessors = new Map();                 // record: nombre -> tipo
        this.enumConstants = [];
        this.abstract = opts.abstract || false;
        this.line = opts.line || 0;
        this.isFunctional = !!opts.isFunctional;
        this.functionalMethod = opts.functionalMethod || null;
    }

    addMethod(def) {
        const list = this.methods.get(def.name) || [];
        list.push(def);
        this.methods.set(def.name, list);
    }

    methodsNamed(name) {
        return this.methods.get(name) || [];
    }

    /** Busca el método declarado en esta clase o en alguna ancestro (incluidas interfaces). */
    findMethod(name, arity) {
        let cls = this;
        while (cls) {
            const list = cls.methodsNamed(name);
            const exact = arity === undefined ? list : list.filter((m) => m.params.length === arity);
            if (exact && exact.length) return exact;
            for (const iface of cls.interfaces || []) {
                const ifound = iface && iface.findMethod ? iface.findMethod(name, arity) : null;
                if (ifound) return ifound;
            }
            cls = cls.superClass;
        }
        return null;
    }

    /** Tipo de retorno estático declarado para un método nativo ("nombre/aridad" o "nombre/#"). */
    nativeReturnType(name, arity) {
        let cls = this;
        while (cls) {
            if (cls.nativeReturns) {
                const exact = cls.nativeReturns.get(`${name}/${arity}`);
                if (exact) return exact;
                const wild = cls.nativeReturns.get(`${name}/#`);
                if (wild) return wild;
            }
            for (const iface of cls.interfaces || []) {
                const found = iface && iface.nativeReturnType ? iface.nativeReturnType(name, arity) : null;
                if (found) return found;
            }
            cls = cls.superClass;
        }
        return null;
    }

    isSubclassOf(other) {
        let cls = this;
        while (cls) {
            if (cls === other) return true;
            for (const i of cls.interfaces || []) {
                if (i === other || (i && i.isSubclassOf && i.isSubclassOf(other))) return true;
            }
            cls = cls.superClass;
        }
        return false;
    }

    /** Cadena de nombres de la jerarquía, para mensajes de error. */
    lineage() {
        const out = [];
        let cls = this;
        while (cls) {
            out.push(cls.name);
            cls = cls.superClass;
        }
        return out.join(' -> ');
    }
}

/* ------------------------------ objetos ------------------------------ */
export class JavaObject {
    constructor(cls, fields) {
        this.cls = cls;
        this.fields = fields instanceof Map ? fields : new Map();   // Map nombre -> {t, v}
        this.native = null;           // carga útil para implementaciones nativas
    }

    get(name) {
        const cell = this.fields.get(name);
        return cell ? cell.v : undefined;
    }

    getCell(name) {
        return this.fields.get(name);
    }

    set(name, type, value) {
        const cell = this.fields.get(name);
        if (cell) cell.v = value;
        else this.fields.set(name, { t: type, v: value });
    }
}

export function isObject(value) {
    return value instanceof JavaObject;
}

export function isArrayObject(value) {
    return value instanceof JavaObject && value.cls && value.cls.kind === 'array';
}

/* ------------------------------ entornos ------------------------------ */
export class Env {
    constructor(parent = null) {
        this.vars = new Map();
        this.parent = parent;
    }

    lookup(name) {
        let env = this;
        while (env) {
            const cell = env.vars.get(name);
            if (cell) return cell;
            env = env.parent;
        }
        return null;
    }

    declare(name, type, value, isFinal = false) {
        this.vars.set(name, { t: type, v: value, final: !!isFinal });
    }

    assign(name, value) {
        const cell = this.lookup(name);
        if (!cell) return false;
        cell.v = value;
        return true;
    }

    child() {
        const env = new Env(this);
        // this/static se heredan: los bloques anidados deben seguir viendo el receptor.
        env.thisObj = this.thisObj;
        env.staticClass = this.staticClass;
        return env;
    }
}

/* ------------------------------ señales de control ------------------------------ */
export class BreakSignal {
    constructor(label = null) { this.label = label; }
}
export class ContinueSignal {
    constructor(label = null) { this.label = label; }
}
export class ReturnSignal {
    constructor(value) { this.value = value; }
}
export class YieldSignal {
    constructor(value) { this.value = value; }
}

/* ------------------------------ utilidades de valor ------------------------------ */
const NUMERIC = new Set(['byte', 'short', 'int', 'long', 'float', 'double', 'char']);
const INTEGRAL = new Set(['byte', 'short', 'int', 'long', 'char']);

export function isNumericType(t) {
    return NUMERIC.has(t);
}

export function isIntegralType(t) {
    return INTEGRAL.has(t);
}

/** Convierte un valor a texto exactamente como String.valueOf con ese tipo estático. */
export function toJavaString(value, type) {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return javaBooleanToString(value);
    if (typeof value === 'string') return value;
    if (typeof value === 'number') {
        if (type === 'char') return javaCharToString(value);
        if (type === 'float') return javaFloatToString(value);
        if (type === 'double') return javaDoubleToString(value);
        if (type === 'long') return javaLongToString(value);
        return String(value);
    }
    return null; // objetos: lo resuelve el intérprete (toString)
}

/** promotedType según las reglas de Java para una operación binaria numérica. */
export function promote(a, b) {
    if (a === 'double' || b === 'double') return 'double';
    if (a === 'float' || b === 'float') return 'float';
    if (a === 'long' || b === 'long') return 'long';
    return 'int';
}

/** Ancho en bits de un tipo numérico. */
export function bitsOf(type) {
    switch (type) {
        case 'byte': return 8;
        case 'short': return 16;
        case 'char': return 16;
        case 'int': return 32;
        case 'long': return 64;
        case 'float': return 32;
        case 'double': return 64;
        default: return 32;
    }
}

/** Trunca un entero al ancho del tipo (emulación de la semántica de Java). */
export function truncate(value, type) {
    if (type === 'char') return Math.trunc(value) & 0xffff;
    const bits = bitsOf(type);
    if (bits === 32) {
        const m = ((Math.trunc(value) % 4294967296) + 4294967296) % 4294967296;
        return m >= 2147483648 ? m - 4294967296 : m;
    }
    if (bits === 64) return Math.trunc(value);
    if (bits === 16) {
        const m = ((Math.trunc(value) % 65536) + 65536) % 65536;
        return m > 32767 ? m - 65536 : m;
    }
    if (bits === 8) {
        const v = Math.trunc(value);
        const m = ((v % 256) + 256) % 256;
        return m > 127 ? m - 256 : m;
    }
    return value;
}

export function assertObject(value, where) {
    if (!isObject(value)) throw new EngineError(`se esperaba un objeto en ${where}`);
    return value;
}
