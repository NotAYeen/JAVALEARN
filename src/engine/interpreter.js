/* Intérprete de Java (subconjunto JavaLearn).
   Evalúa el AST producido por parser.js contra la biblioteca estándar de stdlib.js. */

import { parse } from './parser.js';
import { buildStdlib } from './stdlib.js';
import {
    RuntimeClass, JavaObject, Env, BreakSignal, ContinueSignal, ReturnSignal, YieldSignal,
    toJavaString, promote, truncate, isObject, isNumericType, isIntegralType
} from './runtime.js';
import { JavaCompileError, JavaThrow, StepLimitError, EngineError } from './errors.js';

const DEFAULT_STEP_LIMIT = 8000000;
const MAX_CALL_DEPTH = 2000;
const ARITHMETIC = new Set(['+', '-', '*', '/', '%']);
const COMPARISON = new Set(['<', '>', '<=', '>=']);
const EQUALITY = new Set(['==', '!=']);
const BITWISE = new Set(['&', '|', '^']);
const SHIFTS = new Set(['<<', '>>', '>>>']);
const COMPOUND = new Set(['+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=', '>>>=']);
/** Traduce el `kind` que emite el parser para literales al nombre de tipo Java. */
const LITERAL_TYPES = {
    string: 'String', int: 'int', long: 'long', short: 'short', byte: 'byte',
    double: 'double', float: 'float', char: 'char', boolean: 'boolean', null: 'null'
};

export class JavaEngine {
    constructor(options = {}) {
        this.stepLimit = options.stepLimit || DEFAULT_STEP_LIMIT;
        this.stdout = '';
        this.stderr = '';
        this.steps = 0;
        this.depth = 0;
        this.currentLine = 0;
        this.currentSource = '';
        this.seed = options.seed === undefined ? 123456789 : options.seed;
        this.classes = new Map();
        this.staticEnv = new Env(null);
        this.identityIds = new Map();
        this.nextIdentity = 0x10a1b2;

        const engine = this;
        this.host = {
            write: (text) => { engine.stdout += text; },
            error: (text) => { engine.stderr += text; },
            toString: (value) => engine.valueToString(value),
            equals: (a, b) => engine.valuesEqual(a, b),
            identityHash: (value) => engine.identity(value),
            random: () => engine.nextRandom(),
            throwJava: (className, message) => engine.throwJava(className, message),
            callMethod: (target, name, args) => engine.callFromHost(target, name, args),
            newArray: (elemType, values) => engine.arrayFrom(elemType, values)
        };

        this.stdlib = buildStdlib(this.host);
        for (const [name, cls] of this.stdlib.classes) this.classes.set(name, cls);
        this.classes.set('void', new RuntimeClass('void', { kind: 'class' }));
    }

    /* ================================================================
       PUNTO DE ENTRADA
       ================================================================ */
    run(source) {
        this.currentSource = String(source == null ? '' : source);
        this.stdout = '';
        this.stderr = '';
        this.steps = 0;
        this.depth = 0;
        try {
            const unit = parse(this.currentSource);
            if (unit.types.length === 0) {
                // Programa vacío: como javac, no hace nada y no es un error.
                return { ok: true, stdout: this.stdout, stderr: this.stderr };
            }
            this.link(unit);
            this.invokeMain();
            return { ok: true, stdout: this.stdout, stderr: this.stderr };
        } catch (err) {
            return this.toFailure(err);
        }
    }

    toFailure(err) {
        if (err instanceof JavaCompileError) {
            return {
                ok: false, stdout: this.stdout, stderr: this.stderr,
                error: { kind: 'compilacion', message: err.format(), line: err.line, col: err.col }
            };
        }
        if (err instanceof JavaThrow) {
            const obj = err.javaObject;
            const cls = obj.cls ? obj.cls.name : 'Throwable';
            const msg = obj.get('message');
            const where = this.currentLine > 0 ? ` (línea ${this.currentLine})` : '';
            const text = msg ? `${cls}: ${msg}` : cls;
            return {
                ok: false, stdout: this.stdout, stderr: this.stderr,
                error: { kind: 'excepcion', message: `Exception in thread "main" java.lang.${text}${where}`, line: this.currentLine, col: 0 }
            };
        }
        if (err instanceof StepLimitError) {
            return {
                ok: false, stdout: this.stdout, stderr: this.stderr,
                error: { kind: 'motor', message: err.message, line: this.currentLine, col: 0 }
            };
        }
        if (err instanceof EngineError) {
            return {
                ok: false, stdout: this.stdout, stderr: this.stderr,
                error: { kind: 'motor', message: `Error del motor: ${err.message}`, line: this.currentLine, col: 0 }
            };
        }
        return {
            ok: false, stdout: this.stdout, stderr: this.stderr,
            error: {
                kind: 'motor',
                message: `Error del motor: ${err && err.message ? err.message : String(err)}`,
                line: this.currentLine, col: 0,
                detail: err && err.constructor ? `(${err.constructor.name})` : ''
            }
        };
    }

    /* ================================================================
       ENLAZADO: construye las clases del programa
       ================================================================ */
    link(unit) {
        this.unit = unit;

        // 0) Aplanar la jerarquía: los tipos anidados viven en decl.methods y también
        //    necesitan RuntimeClass propio para que `new Caja()` y `Caja.ROJO` funcionen.
        const all = [];
        const collect = (decl) => {
            all.push(decl);
            for (const m of decl.methods || []) if (m.isNestedType && m.decl) collect(m.decl);
        };
        for (const decl of unit.types) collect(decl);

        this.simplifyTypeNames(all);
        this.defineTypes(all);
    }

    /**
     * `java.util.ArrayList<String>` y `ArrayList<String>` son el mismo tipo: reducimos
     * las referencias cualificadas a su nombre simple cuando la biblioteca lo define.
     */
    simplifyTypeNames(all) {
        const seen = new Set();
        const visit = (node) => {
            if (!node || typeof node !== 'object' || seen.has(node)) return;
            seen.add(node);
            if (Array.isArray(node)) { node.forEach(visit); return; }
            for (const key of ['name', 'superName']) {
                const value = node[key];
                if (typeof value !== 'string' || !value.includes('.')) continue;
                const simple = value.slice(value.lastIndexOf('.') + 1);
                if (this.classes.has(simple)) node[key] = simple;
            }
            for (const value of Object.values(node)) visit(value);
        };
        for (const decl of all) visit(decl);
    }

    /**
     * Crea RuntimeClass, resuelve herencia, declara miembros e inicializa estáticos.
     * Se reutiliza para los tipos locales (`class` dentro de un método), que Java 16
     * permite y el enlazado inicial no puede conocer.
     */
    defineTypes(all, options = {}) {
        // 1) Crear las clases
        for (const decl of all) {
            const cls = new RuntimeClass(decl.name, {
                kind: decl.kind,
                modifiers: decl.modifiers,
                abstract: decl.modifiers.includes('abstract') || decl.kind === 'interface',
                line: decl.line
            });
            cls.decl = decl;
            cls.isLocal = !!options.local;
            this.classes.set(decl.name, cls);
        }

        // 2) Resolver herencia e interfaces
        for (const decl of all) {
            const cls = this.classes.get(decl.name);
            if (decl.superName) {
                const sup = this.classes.get(decl.superName.name);
                if (!sup) {
                    throw new JavaCompileError(`cannot find symbol\n  symbol: class ${decl.superName.name}`, decl.line, decl.col);
                }
                cls.superClass = sup;
            } else if (decl.kind === 'class' && decl.name !== 'Object') {
                cls.superClass = this.stdlib.objectClass;
            }
            cls.interfaces = (decl.interfaces || [])
                .map((i) => this.classes.get(i.name))
                .filter(Boolean);
        }

        // 3) Miembros: campos, métodos, constructores
        for (const decl of all) this.declareMembers(decl, this.classes.get(decl.name));

        // 4) Records: constructores canónicos y accesores
        for (const decl of all) {
            if (decl.kind !== 'record') continue;
            const cls = this.classes.get(decl.name);
            for (const comp of decl.components) {
                cls.fields.set(comp.name, {
                    name: comp.name, type: comp.type, dims: 0, isStatic: false, isFinal: true, init: null
                });
                cls.accessors.set(comp.name, comp.type);
                if (!cls.methodsNamed(comp.name).length) {
                    cls.addMethod({
                        name: comp.name, params: [], returnType: comp.type, body: null,
                        modifiers: ['public'], isAccessor: true, component: comp.name
                    });
                }
            }
            if (!cls.methodsNamed('<init>').length) {
                cls.addMethod({
                    name: '<init>',
                    params: decl.components.map((c) => ({ name: c.name, type: c.type, varargs: false, isFinal: true })),
                    returnType: { name: 'void' }, body: null, modifiers: ['public'],
                    isConstructor: true, implicit: true, recordComponents: decl.components
                });
            }
        }

        // 5) Enumeraciones: constantes estáticas
        for (const decl of all) {
            if (decl.kind !== 'enum') continue;
            this.buildEnum(decl);
        }

        // 6) Inicializadores estáticos en orden de declaración
        for (const decl of all) {
            const cls = this.classes.get(decl.name);
            this.staticEnv.staticClass = cls;
            this.staticEnv.thisObj = null;
            this.initStaticFields(cls, decl.fields);
            for (const stmt of decl.staticInit || []) this.execStatement(stmt, this.staticEnv);
        }
    }

    declareMembers(decl, cls) {
        for (const f of decl.fields) {
            const def = {
                name: f.name,
                type: f.type,
                dims: f.dims || 0,
                isStatic: (f.modifiers || []).includes('static'),
                isFinal: (f.modifiers || []).includes('final'),
                init: f.init,
                line: f.line,
                col: f.col
            };
            if (def.isStatic) cls.staticFields.set(f.name, { t: this.typeLabel(def.type, def.dims), v: this.defaultValue(def) });
            else if (!cls.fields.has(f.name)) cls.fields.set(f.name, def);
        }

        for (const m of decl.methods) {
            if (m.isNestedType) continue;   // ya registrado en el paso 0
            if (m.isInitializer) {
                if (!cls.instanceInit) cls.instanceInit = [];
                cls.instanceInit.push(...(m.body || []));
                continue;
            }
            const def = {
                name: m.isConstructor || m.isCompactConstructor ? '<init>' : m.name,
                params: (m.params || []).map((p) => ({
                    name: p.name,
                    type: p.type,
                    varargs: !!p.varargs,
                    isFinal: (p.modifiers || []).includes('final')
                })),
                returnType: m.returnType,
                body: m.body,
                modifiers: m.modifiers || [],
                isStatic: (m.modifiers || []).includes('static'),
                isAbstract: m.body === null,
                isConstructor: !!m.isConstructor || !!m.isCompactConstructor,
                isCompactConstructor: !!m.isCompactConstructor,
                isInitializer: false,
                recordName: decl.name,
                line: m.line || decl.line,
                col: m.col || decl.col
            };
            if (m.isCompactConstructor) {
                def.params = (decl.components || []).map((c) => ({ name: c.name, type: c.type, varargs: false, isFinal: true }));
            }
            cls.addMethod(def);
        }

        // Constructores implícitos: el de la clase sin super()
        if (!cls.methodsNamed('<init>').length && decl.kind === 'class' && decl.name !== 'Object') {
            if (!decl.methods.some((m) => m.isConstructor || m.isCompactConstructor)) {
                const superCtor = this.findInheritedConstructor(cls, []);
                cls.addMethod({
                    name: '<init>', params: [], returnType: { name: 'void' }, body: null,
                    modifiers: ['public'], isConstructor: true, implicit: true, superArgs: superCtor
                });
            }
        }
    }

    findInheritedConstructor(cls, args) {
        let sup = cls.superClass;
        while (sup) {
            const ctors = sup.methodsNamed('<init>');
            if (ctors.length) {
                const exact = ctors.find((c) => c.params.length === args.length);
                if (exact) return exact;
            }
            sup = sup.superClass;
        }
        return null;
    }

    buildEnum(decl) {
        const cls = this.classes.get(decl.name);
        const constants = [];
        decl.enumConstants.forEach((c, index) => {
            const obj = new JavaObject(cls, {});
            obj.native = { ordinal: index, enumName: c.name };
            obj.set('name', 'String', c.name);
            obj.set('ordinal', 'int', index);
            cls.staticFields.set(c.name, { t: decl.name, v: obj });
            cls.enumConstants.push(obj);
            constants.push(obj);
        });
        cls.enumValues = constants;

        // Métodos que java.lang.Enum hereda de todas las constantes.
        const ordinalOf = (obj) => (obj && obj.native && obj.native.ordinal) || 0;
        const nameOf = (obj) => (obj && obj.native && obj.native.enumName) || String(obj);
        cls.natives.set('ordinal/0', (argv) => ordinalOf(argv[0]));
        cls.natives.set('name/0', (argv) => nameOf(argv[0]));
        cls.natives.set('compareTo/1', (argv) => ordinalOf(argv[0]) - ordinalOf(argv[1]));
        cls.natives.set('equals/1', (argv) => argv[0] === argv[1]);
        cls.natives.set('hashCode/0', (argv) => ordinalOf(argv[0]));
        cls.natives.set('toString/0', (argv) => nameOf(argv[0]));
        cls.natives.set('getDeclaringClass/0', () => cls);
        cls.nativeReturns.set('ordinal/0', 'int');
        cls.nativeReturns.set('name/0', 'String');
        cls.nativeReturns.set('compareTo/1', 'int');
        cls.nativeReturns.set('equals/1', 'boolean');
        cls.nativeReturns.set('hashCode/0', 'int');
        cls.nativeReturns.set('toString/0', 'String');
        cls.nativeReturns.set('getDeclaringClass/0', 'Class');

        // El cuerpo de la clase enum se ejecuta para cada constante, como en javac.
        const ctor = this.pickMethod(cls, '<init>', 0, [], false);
        if (ctor) {
            for (const obj of constants) {
                const env = new Env(this.staticEnv);
                env.staticClass = cls;
                this.invokeUserMethod(ctor, obj, [], [], cls);
            }
        }
    }

    initStaticFields(cls, fields) {
        for (const f of fields) {
            if (!(f.modifiers || []).includes('static')) continue;
            if (f.init) {
                const cell = cls.staticFields.get(f.name);
                if (!cell) continue;
                const value = this.evalVarInit(f.init, cell.t, this.staticEnv);
                cell.v = value;
            }
        }
    }

    /* ================================================================
       MAIN
       ================================================================ */
    invokeMain() {
        let entry = null;
        if (this.classes.has('Mision')) entry = this.classes.get('Mision');
        if (!entry) {
            for (const cls of this.classes.values()) {
                if (cls.decl && this.findMainMethod(cls)) { entry = cls; break; }
            }
        }
        if (!entry) {
            throw new JavaCompileError('no se encontró el método main. Crea una clase Mision con public static void main(String[] args)');
        }
        const main = this.findMainMethod(entry);
        if (!main) {
            throw new JavaCompileError(`no se encontró el método main en ${entry.name}. Añade: public static void main(String[] args)`);
        }
        const args = this.newArray('String', 0);
        this.invokeUserMethod(main, null, [args], ['String[]'], entry);
    }

    findMainMethod(cls) {
        const list = cls.methodsNamed('main');
        if (!list.length) return null;
        const exact = list.find((m) => m.isStatic && m.params.length === 1);
        return exact || list[0] || null;
    }

    /* ================================================================
       UTILIDADES DE VALOR
       ================================================================ */
    typeLabel(type, dims) {
        let name = type.isVar ? 'var' : type.name;
        const total = (type.dims || 0) + (dims || 0);
        for (let i = 0; i < total; i++) name += '[]';
        return name;
    }

    defaultValue(fieldDef) {
        const type = this.typeLabel(fieldDef.type, fieldDef.dims);
        if (fieldDef.dims > 0 || (fieldDef.type.dims || 0) > 0) return null;
        switch (type) {
            case 'int': case 'long': case 'short': case 'byte': case 'char': return 0;
            case 'double': case 'float': return 0;
            case 'boolean': return false;
            default: return null;
        }
    }

    valueToString(value, type) {
        const text = toJavaString(value, type);
        if (text !== null) return text;
        if (!isObject(value)) return String(value);
        const cls = value.cls;
        if (cls && cls.kind === 'array') {
            const elem = value.native && value.native.elemType ? value.native.elemType : 'Object';
            const jvm = { int: 'I', long: 'J', double: 'D', float: 'F', char: 'C', boolean: 'Z', byte: 'B', short: 'S' };
            return `[${jvm[elem] || 'L' + (elem || 'java.lang.Object').replace(/^java\.lang\./, '').split('.').join('.')}@${this.identity(value).toString(16)}`;
        }
        const userToString = this.findUserMethod(cls, 'toString', 0);
        if (userToString) {
            const saved = this.depth;
            const result = this.invokeUserMethod(userToString, value, [], [], cls);
            this.depth = saved;
            return toJavaString(result, 'String') ?? String(result);
        }
        if (cls && cls.kind === 'record' && cls.accessors.size) {
            const parts = [];
            for (const [name, type] of cls.accessors) {
                parts.push(`${name}=${this.valueToString(value.get(name), type)}`);
            }
            return `${cls.name}[${parts.join(', ')}]`;
        }
        if (isObject(value) && value.native && typeof value.native.enumName === 'string') {
            return value.native.enumName;
        }
        const nat = this.nativeMethod(cls, 'toString', 0);
        if (nat) {
            const result = nat([value], { types: [cls ? cls.name : 'Object'] });
            return toJavaString(result, 'String') ?? String(result);
        }
        return `${cls ? cls.name : 'Object'}@${this.identity(value).toString(16)}`;
    }

    valuesEqual(a, b) {
        if (a === b) return true;
        if (a === null || b === null) return false;
        const ta = typeof a;
        if (ta !== typeof b) return false;
        if (ta === 'string' || ta === 'number' || ta === 'boolean') return a === b;
        if (!isObject(a) || !isObject(b)) return false;
        if (a.cls === b.cls) {
            const eq = this.findUserMethod(a.cls, 'equals', 1);
            if (eq) return Boolean(this.invokeUserMethod(eq, a, [b], [b.cls.name], a.cls));
        }
        if (a.cls && a.cls.accessors && a.cls.accessors.size) {
            for (const [name] of a.cls.accessors) {
                if (!this.valuesEqual(a.get(name), b.get ? b.get(name) : null)) return false;
            }
            return a.cls === b.cls;
        }
        return false;
    }

    identity(value) {
        if (!isObject(value)) return 0;
        let id = this.identityIds.get(value);
        if (id === undefined) {
            id = this.nextIdentity;
            this.nextIdentity = (this.nextIdentity + 0x1f3d7) & 0x7fffffff;
            this.identityIds.set(value, id);
        }
        return id;
    }

    nextRandom() {
        // xorshift determinista: las misiones pueden depender de aleatoriedad reproducible
        let x = this.seed | 0;
        x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
        this.seed = x | 0;
        return ((x >>> 0) % 1000000) / 1000000;
    }

    throwJava(className, message) {
        const cls = this.classes.get(className) || this.stdlib.classes.get('RuntimeException');
        const obj = new JavaObject(cls, {});
        if (message !== undefined && message !== null) obj.set('message', 'String', String(message));
        throw new JavaThrow(obj);
    }

    callFromHost(target, name, args) {
        const list = this.classes.get(target && target.cls ? target.cls.name : 'Object');
        const def = this.findUserMethod(list, name, args.length);
        if (!def) throw new EngineError(`el método nativo no encuentra ${name}(${args.length})`);
        return this.invokeUserMethod(def, target, args, args.map(() => 'Object'), list);
    }

    /* ================================================================
       PRESUPUESTO DE PASOS
       ================================================================ */
    tick(line) {
        this.steps++;
        if ((this.steps & 1023) === 0 && this.steps > this.stepLimit) {
            throw new StepLimitError(this.stepLimit);
        }
        if (line) this.currentLine = line;
    }

    /* ================================================================
       EJECUCIÓN DE SENTENCIAS
       ================================================================ */
    execBlock(node, env) {
        const scope = env.child();
        for (const stmt of node.body) this.execStatement(stmt, scope);
    }

    execStatement(node, env) {
        this.tick(node.line);
        switch (node.type) {
            case 'Block':
                return this.execBlock(node, env);

            case 'Empty':
                return;

            case 'ExprStmt': {
                this.eval(node.expr, env);
                return;
            }

            case 'LocalVarDecl': {
                for (const d of node.decls) {
                    let label = this.typeLabel(d.type);
                    const value = d.init ? this.evalVarInit(d.init, label, env) : this.zeroFor(label);
                    if (d.type.isVar && d.init) label = this.inferType(d.init, env);
                    env.declare(d.name, label, value, (d.modifiers || []).includes('final'));
                }
                return;
            }

            case 'LocalType': {
                // `class`/`record`/`interface` declarado dentro de un método: se enlaza
                // al alcanzarse la declaración, igual que hace javac.
                const decl = node.decl;
                if (!this.classes.has(decl.name)) this.defineTypes([decl], { local: true });
                return;
            }

            case 'If':
                if (this.evalCondition(node.cond, env)) this.execStatement(node.then, env);
                else if (node.otherwise) this.execStatement(node.otherwise, env);
                return;

            case 'While': {
                const mine = node.labels || [];
                try {
                    while (this.evalCondition(node.cond, env)) {
                        try {
                            this.execStatement(node.body, env);
                        } catch (sig) {
                            if (sig instanceof BreakSignal) {
                                if (sig.label && !mine.includes(sig.label)) throw sig;
                                break;
                            }
                            if (sig instanceof ContinueSignal) {
                                if (sig.label && !mine.includes(sig.label)) throw sig;
                                continue;
                            }
                            throw sig;
                        }
                    }
                } catch (sig) {
                    if (sig instanceof BreakSignal) {
                        if (sig.label && !mine.includes(sig.label)) throw sig;
                        return;
                    }
                    throw sig;
                }
                return;
            }

            case 'DoWhile': {
                const mine = node.labels || [];
                try {
                    do {
                        try {
                            this.execStatement(node.body, env);
                        } catch (sig) {
                            if (sig instanceof BreakSignal) {
                                if (sig.label && !mine.includes(sig.label)) throw sig;
                                break;
                            }
                            if (sig instanceof ContinueSignal) {
                                if (sig.label && !mine.includes(sig.label)) throw sig;
                                continue;
                            }
                            throw sig;
                        }
                    } while (this.evalCondition(node.cond, env));
                } catch (sig) {
                    if (sig instanceof BreakSignal) {
                        if (sig.label && !mine.includes(sig.label)) throw sig;
                        return;
                    }
                    throw sig;
                }
                return;
            }

            case 'For': {
                const scope = env.child();
                if (node.init) {
                    if (node.init.type === 'LocalVarDecl') this.execStatement(node.init, scope);
                    else for (const e of node.init.exprs) this.eval(e, scope);
                }
                const mine = node.labels || [];
                try {
                    for (;;) {
                        this.tick(node.line);
                        if (node.cond && !this.evalCondition(node.cond, scope)) break;
                        let stop = false;
                        try {
                            this.execStatement(node.body, scope);
                        } catch (sig) {
                            if (sig instanceof BreakSignal) {
                                if (sig.label && !mine.includes(sig.label)) throw sig;
                                stop = true;
                            } else if (sig instanceof ContinueSignal) {
                                // `continue` no salta la sección de actualización.
                                if (sig.label && !mine.includes(sig.label)) throw sig;
                            } else {
                                throw sig;
                            }
                        }
                        for (const u of node.updates) this.eval(u, scope);
                        if (stop) break;
                    }
                } catch (sig) {
                    if (sig instanceof BreakSignal) {
                        if (sig.label && !mine.includes(sig.label)) throw sig;
                        return;
                    }
                    throw sig;
                }
                return;
            }

            case 'ForEach': {
                const iterable = this.eval(node.iterable, env);
                const items = this.iterate(iterable, node.line);
                let label = node.varType && node.varType.isVar
                    ? this.inferType(node.iterable, env)
                    : this.typeLabel(node.varType || { name: 'Object', dims: 0, isVar: false });
                if (label.endsWith('[]')) label = label.slice(0, -2);
                const mine = node.labels || [];
                for (const item of items) {
                    this.tick(node.line);
                    const scope = env.child();
                    scope.declare(node.name, label, item);
                    try {
                        this.execStatement(node.body, scope);
                    } catch (sig) {
                        if (sig instanceof BreakSignal) {
                            if (sig.label && !mine.includes(sig.label)) throw sig;
                            return;
                        }
                        if (sig instanceof ContinueSignal) {
                            if (sig.label && !mine.includes(sig.label)) throw sig;
                            continue;
                        }
                        throw sig;
                    }
                }
                return;
            }

            case 'Return': {
                const value = node.expr ? this.eval(node.expr, env) : null;
                throw new ReturnSignal(value);
            }

            case 'Break':
                throw new BreakSignal(node.label);

            case 'Continue':
                throw new ContinueSignal(node.label);

            case 'Throw':
                throw this.makeThrow(this.eval(node.expr, env));

            case 'Try':
                return this.execTry(node, env);

            case 'Sync':
                this.eval(node.expr, env);
                return this.execStatement(node.body, env);

            case 'Labeled': {
                // La etiqueta pertenece al bucle que envuelve: la anotamos para que
                // `continue etiqueta;` no sea capturado por los bucles interiores.
                (node.body.labels = node.body.labels || []).push(node.label);
                try {
                    this.execStatement(node.body, env);
                } catch (sig) {
                    if ((sig instanceof BreakSignal || sig instanceof ContinueSignal) && sig.label === node.label) {
                        if (sig instanceof ContinueSignal) return;
                        return;
                    }
                    throw sig;
                }
                return;
            }

            case 'Assert': {
                if (!this.evalCondition(node.cond, env)) {
                    const msg = node.msg ? toJavaString(this.eval(node.msg, env), 'String') : 'assertion failed';
                    this.throwJava('IllegalStateException', msg);
                }
                return;
            }

            case 'Switch':
                return this.execSwitch(node, env);

            default:
                throw new EngineError(`sentencia no soportada: ${node.type}`);
        }
    }

    execTry(node, env) {
        const scope = env.child();
        for (const res of node.resources) {
            const value = res.init ? this.eval(res.init, scope) : null;
            scope.declare(res.name, this.typeLabel(res.type), value);
        }
        const runFinally = () => {
            if (!node.finallyBlock) return;
            this.execBlock(node.finallyBlock, scope);
        };
        let pending = null;
        let handled = false;
        try {
            this.execBlock(node.block, scope);
        } catch (err) {
            if (err instanceof ReturnSignal || err instanceof BreakSignal
                || err instanceof ContinueSignal || err instanceof YieldSignal) {
                runFinally();
                throw err;
            }
            for (const c of node.catches) {
                const classes = c.types.map((t) => this.classes.get(t.name)).filter(Boolean);
                if (err instanceof JavaThrow && classes.some((k) => err.javaObject.cls && err.javaObject.cls.isSubclassOf(k))) {
                    const cscope = env.child();
                    cscope.declare(c.name, c.types[0].name, err.javaObject);
                    try {
                        this.execBlock(c.body, cscope);
                    } catch (inner) {
                        pending = inner;
                    }
                    handled = true;
                    break;
                }
            }
            if (!handled) pending = err;
        }
        runFinally();
        if (pending) throw pending;
    }

    makeThrow(value) {
        if (value instanceof JavaThrow) return value;
        if (isObject(value) && value.cls) return new JavaThrow(value);
        this.throwJava('IllegalStateException', `no se puede lanzar el valor: ${String(value)}`);
        return null;
    }

    /* ------------------------------ switch ------------------------------ */
    execSwitch(node, env) {
        const selector = this.eval(node.selector, env);
        const selClass = isObject(selector) ? selector.cls : null;
        const start = this.findClause(node, selector, selClass, env);
        if (start < 0) return;
        try {
            for (let i = start; i < node.clauses.length; i++) {
                const clause = node.clauses[i];
                for (const stmt of clause.body) this.execStatement(stmt, env);
                if (clause.arrow) return; // las flechas no caen al siguiente caso
            }
        } catch (sig) {
            // `break` sale del switch; el de una etiqueta externa sigue su camino.
            if (sig instanceof BreakSignal) {
                if (sig.label) throw sig;
                return;
            }
            throw sig;
        }
    }

    findClause(node, selector, selClass, env) {
        let fallback = -1;
        for (let i = 0; i < node.clauses.length; i++) {
            const clause = node.clauses[i];
            if (clause.isDefault) { if (fallback < 0) fallback = i; continue; }
            for (const label of clause.labels) {
                const value = this.evalCaseLabel(label, env, selClass);
                if (this.caseMatches(selector, value)) return i;
            }
        }
        return fallback;
    }

    evalCaseLabel(label, env, selClass) {
        if (label.type === 'Name' && selClass) {
            const cell = selClass.staticFields.get(label.name);
            if (cell) return cell.v;
        }
        return this.eval(label, env);
    }

    caseMatches(selector, value) {
        if (value === null || selector === null) return value === selector;
        if (typeof selector === 'string' || typeof value === 'string') return selector === value;
        if (isObject(selector) && selector.native && typeof selector.native.ordinal === 'number') {
            return isObject(value) && value.native && value.native.ordinal === selector.native.ordinal;
        }
        return selector === value;
    }

    /* ================================================================
       EXPRESIONES
       ================================================================ */
    eval(node, env) {
        this.tick(node.line);
        switch (node.type) {
            case 'Literal':
                return node.value;

            case 'Name': {
                const cell = env.lookup(node.name);
                if (cell) return cell.v;
                const fieldDef = this.lookupField(node.name, env);
                if (fieldDef) return fieldDef.value;
                if (this.classes.has(node.name)) return this.classes.get(node.name);
                throw new JavaCompileError(`cannot find symbol\n  symbol: variable ${node.name}`, node.line, node.col);
            }

            case 'Paren':
                return this.eval(node.expr, env);

            case 'FieldAccess':
                return this.readField(node, env);

            case 'MethodCall':
                return this.evalCall(node, env);

            case 'ArrayAccess': {
                const array = this.eval(node.array, env);
                const index = this.eval(node.index, env);
                const elements = this.arrayElements(array, node.line);
                const i = Math.trunc(index);
                if (i < 0 || i >= elements.length) {
                    this.throwJava('ArrayIndexOutOfBoundsException',
                        `Index ${i} out of bounds for length ${elements.length}`);
                }
                return elements[i];
            }

            case 'Unary':
                return this.evalUnary(node, env);

            case 'Binary':
                return this.evalBinary(node, env);

            case 'Assign':
                return this.evalAssign(node, env);

            case 'Ternary':
                return this.evalCondition(node.cond, env) ? this.eval(node.then, env) : this.eval(node.otherwise, env);

            case 'Cast':
                return this.evalCast(node, env);

            case 'InstanceOf':
                return this.evalInstanceOf(node, env);

            case 'This':
                return env.thisObj;

            case 'Super':
                return env.thisObj;

            case 'ThisQualified':
                return this.eval(node.target, env);

            case 'New':
                return this.evalNew(node, env);

            case 'NewArray':
                return this.evalNewArray(node, env);

            case 'ArrayInit':
                return node.items.map((item) => this.eval(item, env));

            case 'SwitchExpr':
                return this.evalSwitchExpr(node, env);

            case 'ClassLiteral':
                return node.targetType ? `${node.targetType.name}.class` : (node.name ? `${node.name}.class` : 'Object.class');

            case 'Lambda':
                return this.makeLambda(node, env);

            case 'MethodRef':
                return this.makeMethodRef(node, env);

            default:
                throw new EngineError(`expresión no soportada: ${node.type}`);
        }
    }

    evalCondition(node, env) {
        const value = this.eval(node, env);
        return Boolean(value);
    }

    evalSwitchExpr(node, env) {
        const selector = this.eval(node.selector, env);
        const selClass = isObject(selector) ? selector.cls : null;
        const idx = this.findClause(node, selector, selClass, env);
        if (idx < 0) {
            this.throwJava('IllegalStateException',
                'switch expression does not cover all possible input values');
        }
        const clause = node.clauses[idx];
        if (clause.value) return this.eval(clause.value, env);
        for (const stmt of clause.body || []) {
            try {
                this.execStatement(stmt, env);
            } catch (sig) {
                if (sig instanceof YieldSignal) return sig.value;
                throw sig;
            }
        }
        return null;
    }

    /* ------------------------------ literales y variables ------------------------------ */
    evalVarInit(node, declaredType, env) {
        if (node.type === 'ArrayInit') return this.arrayInitValue(node, declaredType, env);
        const value = this.eval(node, env);
        return this.coerce(value, this.inferType(node, env), declaredType);
    }

    /** Construye `{1, 2}, {3, 4}` respetando las dimensiones del tipo declarado. */
    arrayInitValue(node, declaredType, env) {
        const elemType = declaredType.endsWith('[]') ? declaredType.slice(0, -2) : 'Object';
        const values = node.items.map((item) => {
            if (item.type === 'ArrayInit') return this.arrayInitValue(item, elemType, env);
            const v = this.eval(item, env);
            if (elemType.endsWith('[]') && Array.isArray(v) && !isObject(v)) {
                return this.arrayFrom(elemType.slice(0, -2), v);
            }
            return v;
        });
        return this.arrayFrom(elemType, values);
    }

    zeroFor(type) {
        switch (type) {
            case 'int': case 'long': case 'short': case 'byte': case 'char': return 0;
            case 'double': case 'float': return 0;
            case 'boolean': return false;
            default: return null;
        }
    }

    /** Convierte un valor al tipo declarado (emulación de las conversiones implícitas). */
    coerce(value, fromType, toType) {
        // Un lambda adopta la interfaz funcional de destino para que el despacho
        // de `op.metodo(...)` encuentre su método abstracto.
        if (isObject(value) && value.native && value.native.kind === 'lambda' && toType) {
            const iface = this.classes.get(toType);
            if (iface && iface !== value.cls && iface.isFunctional) this.adoptLambda(value, iface);
        }
        // Un array de Java siempre es un objeto del motor, incluso si el tipo inferido
        // coincide con el declarado (p. ej. el retorno String[] de String.split).
        if (toType && toType.endsWith('[]') && Array.isArray(value) && !isObject(value)) {
            return this.arrayFrom(toType.slice(0, -2), value);
        }
        if (!toType || toType === 'var' || fromType === toType) {
            // Aun con el mismo tipo hay que ajustar el ancho (desbordamiento de int).
            if (typeof value === 'number' && isIntegralType(toType)) return truncate(value, toType);
            if (typeof value === 'number' && toType === 'float') return Math.fround(value);
            return value;
        }
        if (value === null || value === undefined) return null;
        if (toType.endsWith('[]')) {
            if (Array.isArray(value) && !isObject(value)) return this.arrayFrom(toType.slice(0, -2), value);
            return value;
        }
        if (isIntegralType(toType) && typeof value === 'number') return truncate(value, toType);
        if ((toType === 'double' || toType === 'float') && typeof value === 'number') {
            return toType === 'float' ? Math.fround(value) : value;
        }
        if (toType === 'boolean' && typeof value === 'boolean') return value;
        if (toType === 'String' && fromType === 'char' && typeof value === 'number') return String.fromCharCode(value);
        if (toType === 'String' && typeof value === 'object') return value;
        return value;
    }

    /* ------------------------------ campos ------------------------------ */
    lookupField(name, env) {
        let obj = env.thisObj;
        while (obj) {
            let cls = obj.cls;
            while (cls) {
                const def = cls.fields.get(name);
                if (def) {
                    const cell = obj.fields.get(name);
                    return { value: cell ? cell.v : null, def, obj };
                }
                cls = cls.superClass;
            }
            obj = obj.native && obj.native.super ? obj.native.super : null;
        }
        if (env.staticClass) {
            const cell = env.staticClass.staticFields.get(name);
            if (cell) return { value: cell.v, def: { isStatic: true, type: { name: cell.t } }, obj: null };
        }
        return null;
    }

    readField(node, env) {
        const target = node.target;

        // Acceso estático: Clase.campo
        const staticInfo = this.resolveStaticTarget(target, env);
        if (staticInfo) {
            const cell = staticInfo.cls.staticFields.get(node.name);
            if (!cell) {
                if (staticInfo.cls.natives.has(`${node.name}/0`)) {
                    return staticInfo.cls.natives.get(`${node.name}/0`)([], { types: [] });
                }
                throw new JavaCompileError(`cannot find symbol\n  symbol: variable ${node.name}`, node.line, node.col);
            }
            return cell.v;
        }

        const value = this.eval(target, env);
        if (value === null) this.throwJava('NullPointerException', `No se puede leer el campo "${node.name}" porque el objeto es null`);

        if (isObject(value)) {
            if (value.cls.kind === 'array' && node.name === 'length') return value.native.elements.length;
            const cell = value.fields.get(node.name);
            if (cell) return cell.v;
            const staticCell = value.cls.staticFields.get(node.name);
            if (staticCell) return staticCell.v;
            const native = this.nativeMethod(value.cls, node.name, 0);
            if (native) return native([value], { types: [value.cls.name] });
            throw new JavaCompileError(`cannot find symbol\n  symbol: variable ${node.name}\n  location: class ${value.cls.name}`, node.line, node.col);
        }

        // Primitivos: delega en la clase envoltorio (Integer.MAX_VALUE, intValue()...)
        const wrapper = this.wrapperFor(this.inferType(target, env));
        if (wrapper) {
            const cell = wrapper.staticFields.get(node.name);
            if (cell) return cell.v;
            const native = wrapper.natives.get(`${node.name}/0`);
            if (native) return native([value], { types: [this.inferType(target, env)] });
        }
        throw new JavaCompileError(`cannot find symbol\n  symbol: variable ${node.name}`, node.line, node.col);
    }

    wrapperFor(type) {
        switch (type) {
            case 'int': case 'short': case 'byte': return this.classes.get('Integer');
            case 'long': return this.classes.get('Long');
            case 'double': return this.classes.get('Double');
            case 'float': return this.classes.get('Float');
            case 'boolean': return this.classes.get('Boolean');
            case 'char': return this.classes.get('Character');
            case 'String': return this.classes.get('String');
            default: return this.classes.get(type);
        }
    }

    resolveStaticTarget(node, env) {
        if (node.type === 'Name') {
            if (env.lookup(node.name)) return null;
            const cls = this.classes.get(node.name);
            if (cls) return { cls, isStatic: true };
            return null;
        }
        if (node.type === 'FieldAccess' || node.type === 'Paren') {
            const inner = this.resolveStaticTarget(node.type === 'Paren' ? node.expr : node.target, env);
            if (!inner) return null;
            const cell = inner.cls.staticFields.get(node.name);
            if (cell && isObject(cell.v)) return { cls: cell.v.cls, isStatic: true };
        }
        return null;
    }

    /** `java.util.Arrays` → `Arrays`, para aceptar llamadas estáticas cualificadas. */
    qualifiedName(node) {
        if (!node) return null;
        if (node.type === 'Name') return node.name;
        if (node.type === 'FieldAccess') {
            const base = this.qualifiedName(node.target);
            return base ? `${base}.${node.name}` : node.name;
        }
        if (node.type === 'Paren') return this.qualifiedName(node.expr);
        return null;
    }

    classFor(name) {
        if (!name) return null;
        const direct = this.classes.get(name);
        if (direct) return direct;
        if (name.includes('.')) {
            const simple = name.slice(name.lastIndexOf('.') + 1);
            return this.classes.get(simple) || null;
        }
        return null;
    }

    /* ------------------------------ llamadas ------------------------------ */
    evalCall(node, env) {
        const argTypes = node.args.map((a) => this.inferType(a, env));

        // 1) ¿Llamada estática a una clase?  (Integer.parseInt, Math.max, java.util.Arrays.sort)
        if (node.target) {
            const staticInfo = this.resolveStaticTarget(node.target, env)
                || (this.qualifiedName(node.target) ? { cls: this.classFor(this.qualifiedName(node.target)), isStatic: true } : null);
            if (staticInfo && staticInfo.cls) {
                const args = this.evalArgs(node.args, env, argTypes);
                return this.invokeStatic(staticInfo.cls, node.name, args, argTypes, node);
            }
        }

        // 2) ¿Llamada sobre valor local/campo?
        let receiver = null;
        let receiverType = null;
        if (node.target) {
            const staticInfo = this.resolveStaticTarget(node.target, env);
            if (!staticInfo) {
                receiver = this.eval(node.target, env);
                receiverType = this.inferType(node.target, env);
            }
        }

        if (node.target && receiver === null) {
            this.throwJava('NullPointerException', `No se puede invocar "${node.name}" porque la referencia es null`);
        }

        if (receiver !== null) {
            if (isObject(receiver)) {
                if (receiver.cls.kind === 'array' && node.name === 'length') return receiver.native.elements.length;
                const args = this.evalArgs(node.args, env, argTypes);
                return this.invokeInstance(receiver, node.name, args, argTypes, node);
            }
            // Método sobre primitivo: usamos la clase envoltorio
            const wrapper = this.wrapperFor(receiverType);
            if (wrapper) {
                const args = this.evalArgs(node.args, env, argTypes);
                return this.invokeInstanceOnClass(wrapper, receiver, node.name, args, argTypes, node, receiverType);
            }
        }

        // 3) Método heredado o estático sin receptor explícito: this.metodo()
        if (node.target) {
            const name = this.targetMemberName(node.target);
            if (name) {
                const args = this.evalArgs(node.args, env, argTypes);
                return this.invokeOnThis(env, name, args, argTypes, node);
            }
        }

        // 4) Método local de la clase actual sin calificar
        if (env.thisObj) {
            const args = this.evalArgs(node.args, env, argTypes);
            return this.invokeOnThis(env, node.name, args, argTypes, node);
        }

        // 4 bis) Método estático de la clase actual sin calificar (main y compañía)
        if (env.staticClass) {
            const args = this.evalArgs(node.args, env, argTypes);
            return this.invokeStatic(env.staticClass, node.name, args, argTypes, node);
        }

        const args = this.evalArgs(node.args, env, argTypes);
        return this.invokeStatic(this.classes.get('Object'), node.name, args, argTypes, node);
    }

    targetMemberName(target) {
        if (target.type === 'Super') return target.isSuperClassOnly ? 'super' : null;
        if (target.type === 'Name') return target.name;
        if (target.type === 'FieldAccess') return target.name;
        return null;
    }

    evalArgs(nodes, env, types) {
        return nodes.map((n, i) => {
            const value = this.eval(n, env);
            return this.coerce(value, types[i], 'Object') === value ? value : value;
        });
    }

    invokeStatic(cls, name, args, argTypes, node) {
        if (!cls) {
            throw new JavaCompileError(`cannot find symbol\n  symbol: method ${name}()`, node ? node.line : 0, node ? node.col : 0);
        }
        // Enums: values(), valueOf(String), name(), ordinal()
        if (cls.kind === 'enum') {
            if (name === 'values' && args.length === 0) return this.arrayFrom(cls.name, cls.enumConstants.slice());
            if (name === 'valueOf' && args.length === 1) {
                const found = cls.enumConstants.find((o) => o.get('name') === args[0]);
                if (!found) {
                    this.throwJava('IllegalArgumentException',
                        `No enum constant ${cls.name}.${String(args[0])}`);
                }
                return found;
            }
        }
        const def = this.pickMethod(cls, name, args.length, argTypes, true);
        if (def) return this.invokeUserMethod(def, null, args, argTypes, cls);
        const native = this.nativeMethod(cls, name, args.length);
        if (native) return this.wrapNative(native(args, { types: argTypes, interp: this }), cls, name, args.length);
        // Herencia: buscar en la superclase
        let sup = cls.superClass;
        while (sup) {
            const sdef = this.pickMethod(sup, name, args.length, argTypes, true);
            if (sdef) return this.invokeUserMethod(sdef, null, args, argTypes, sup);
            const snative = this.nativeMethod(sup, name, args.length);
            if (snative) return this.wrapNative(snative(args, { types: argTypes, interp: this }), sup, name, args.length);
            sup = sup.superClass;
        }
        throw new JavaCompileError(`cannot find symbol\n  symbol: method ${name}(${this.prettyTypes(argTypes)})\n  location: class ${cls.name}`, node ? node.line : 0, node ? node.col : 0);
    }

    /**
     * Un nativo puede devolver un array de JavaScript; lo convertimos en el objeto
     * de arreglo del motor para que `.length`, los bucles y la indexación funcionen.
     */
    wrapNative(value, cls, name, arity) {
        if (Array.isArray(value) && !isObject(value)) {
            const t = cls ? cls.nativeReturnType(name, arity) : null;
            return this.arrayFrom(t && t.endsWith('[]') ? t.slice(0, -2) : 'Object', value);
        }
        return value;
    }

    invokeInstance(obj, name, args, argTypes, node) {
        // Lambdas y referencias a métodos: el cuerpo no está en una tabla de clases.
        if (obj.native && obj.native.kind === 'lambda' && (!obj.native.method || obj.native.method === name)) {
            return this.wrapNative(obj.native.invoke(args), obj.cls, name, args.length);
        }
        const cls = obj.cls;
        const def = this.pickMethod(cls, name, args.length, argTypes, false);
        if (def) return this.invokeUserMethod(def, obj, args, argTypes, cls);

        const native = this.nativeMethod(cls, name, args.length);
        if (native) return this.wrapNative(native([obj, ...args], { types: [cls.name, ...argTypes], interp: this }), cls, name, args.length);

        // Interfaces / clases base
        let cur = cls;
        while (cur) {
            for (const iface of cur.interfaces || []) {
                const idef = this.pickMethod(iface, name, args.length, argTypes, false);
                if (idef) return this.invokeUserMethod(idef, obj, args, argTypes, iface);
            }
            const sdef = cur.superClass ? this.pickMethod(cur.superClass, name, args.length, argTypes, false) : null;
            if (sdef) return this.invokeUserMethod(sdef, obj, args, argTypes, cur.superClass);
            const snative = cur.superClass ? this.nativeMethod(cur.superClass, name, args.length) : null;
            if (snative) return this.wrapNative(snative([obj, ...args], { types: [cur.superClass.name, ...argTypes], interp: this }), cur.superClass, name, args.length);
            cur = cur.superClass;
        }

        const objNative = this.nativeMethod(this.classes.get('Object'), name, args.length);
        if (objNative) return objNative([obj, ...args], { types: [cls.name, ...argTypes], interp: this });

        throw new JavaCompileError(`cannot find symbol\n  symbol: method ${name}(${this.prettyTypes(argTypes)})\n  location: class ${cls.name}`, node ? node.line : 0, node ? node.col : 0);
    }

    invokeInstanceOnClass(cls, receiver, name, args, argTypes, node, receiverType) {
        const native = this.nativeMethod(cls, name, args.length);
        if (native) return this.wrapNative(native([receiver, ...args], { types: [receiverType, ...argTypes], interp: this }), cls, name, args.length);
        if (name === 'toString') return toJavaString(receiver, receiverType);
        if (name === 'equals') return args[0] === receiver;
        throw new JavaCompileError(`cannot find symbol\n  symbol: method ${name}(${this.prettyTypes(argTypes)})\n  location: class ${cls.name}`, node ? node.line : 0, node ? node.col : 0);
    }

    invokeOnThis(env, name, args, argTypes, node) {
        const obj = env.thisObj;
        if (!obj) {
            throw new JavaCompileError(`cannot find symbol\n  symbol: method ${name}()`, node ? node.line : 0, node ? node.col : 0);
        }
        if (name === 'super' || (node.target && node.target.type === 'Super')) {
            const sup = obj.cls.superClass;
            if (!sup) throw new EngineError('no hay superclase');
            const def = this.pickMethod(sup, name, args.length, argTypes, false);
            if (def) return this.invokeUserMethod(def, obj, args, argTypes, sup);
            return this.invokeInstance(obj, name, args, argTypes, node);
        }
        return this.invokeInstance(obj, name, args, argTypes, node);
    }

    nativeMethod(cls, name, arity) {
        let cur = cls;
        while (cur) {
            const exact = cur.natives.get(`${name}/${arity}`);
            if (exact) return exact;
            cur = cur.superClass;
        }
        let c = cls;
        while (c) {
            const wild = c.natives.get(`${name}/#`);
            if (wild) return wild;
            c = c.superClass;
        }
        return null;
    }

    findUserMethod(cls, name, arity) {
        let cur = cls;
        while (cur) {
            const list = cur.methodsNamed(name).filter((m) => arity === undefined || m.params.length === arity);
            if (list.length) return list[0];
            cur = cur.superClass;
        }
        return null;
    }

    /** Elige la sobrecarga más adecuada según aridad y tipos de los argumentos. */
    pickMethod(cls, name, arity, argTypes, isStatic) {
        const all = cls.methodsNamed(name);
        if (name === '<init>') {
            // Un constructor varargs acepta aridades >= params.length - 1.
            const exact = all.filter((m) => m.params.length === arity);
            if (exact.length) return this.bestOverload(exact, argTypes, isStatic);
            const varargs = all.filter((m) => isVarargs(m) && arity >= m.params.length - 1);
            if (varargs.length) {
                return this.bestOverload(varargs, argTypes, isStatic)
                    || varargs.reduce((a, b) => (b.params.length > a.params.length ? b : a));
            }
            return null;
        }
        const exact = all.filter((m) => m.params.length === arity);
        if (exact.length) return this.bestOverload(exact, argTypes, isStatic);
        const varargs = all.filter((m) => isVarargs(m) && arity >= m.params.length - 1);
        if (varargs.length) {
            return this.bestOverload(varargs, argTypes, isStatic)
                || varargs.reduce((a, b) => (b.params.length > a.params.length ? b : a));
        }
        return null;
    }

    bestOverload(pool, argTypes, isStatic) {
        const candidates = pool.filter((m) => m.isStatic === isStatic);
        const usable = candidates.length ? candidates : pool;
        if (!usable.length) return null;

        let best = null;
        let bestScore = Infinity;
        for (const m of usable) {
            let score = 0;
            let ok = true;
            for (let i = 0; i < m.params.length; i++) {
                const paramType = this.typeLabel(m.params[i].type);
                const argType = argTypes[i] || 'Object';
                const s = this.matchScore(paramType, argType);
                if (s === null) { ok = false; break; }
                score += s;
            }
            if (ok && score < bestScore) { bestScore = score; best = m; }
        }
        if (best) return best;
        return usable.length === 1 ? usable[0] : null;
    }

    matchScore(paramType, argType) {
        if (!argType || argType === 'unknown' || argType === 'var' || argType === 'null') return 1;
        if (paramType === argType) return 0;
        if (paramType === 'Object' || paramType === 'Serializable' || paramType === 'Comparable') return 3;
        if (paramType.endsWith('[]') && argType.endsWith('[]')) return 1;
        if (isNumericType(paramType) && isNumericType(argType)) {
            const rank = { byte: 0, short: 1, char: 2, int: 3, long: 4, float: 5, double: 6 };
            return paramType === 'double' || paramType === 'float' || paramType === 'long' || paramType === 'int' ? 1 : 4;
        }
        if (isNumericType(argType) && paramType === 'String') return 5; // concatenación sólo si procede
        const pcls = this.classes.get(paramType);
        const acls = this.classes.get(argType);
        if (pcls && acls && acls.isSubclassOf(pcls)) return 2;
        return null;
    }

    prettyTypes(types) {
        return (types || []).map((t) => t || 'Object').join(', ');
    }

    /* ------------------------------ invocación de métodos de usuario ------------------------------ */
    invokeUserMethod(def, obj, args, argTypes, cls) {
        this.depth++;
        if (this.depth > MAX_CALL_DEPTH) {
            this.depth--;
            this.throwJava('StackOverflowError', null);
        }
        const env = new Env(this.staticEnv);
        env.thisObj = def.isStatic ? null : obj;
        // staticClass siempre: desde un método de instancia también se ven los campos estáticos.
        env.staticClass = cls;

        if (def.params) {
            def.params.forEach((p, i) => {
                let value = args[i];
                const paramType = this.typeLabel(p.type);
                if (p.varargs) {
                    const elemType = paramType.slice(0, -2);
                    const alreadyArray = isObject(value) && value.native && Array.isArray(value.native.elements);
                    // `suma(1, 2, 3)` empaqueta los argumentos en un arreglo nuevo.
                    env.declare(p.name, paramType, alreadyArray ? value : this.arrayFrom(elemType, args.slice(i)));
                } else {
                    value = this.coerce(value, argTypes[i], paramType);
                    env.declare(p.name, paramType, value);
                }
            });
        }

        try {
            if (def.isConstructor) {
                this.initInstance(obj, args, argTypes, def, cls, env);
                return null;
            }
            if (def.isAccessor && obj) return obj.get(def.component);
            if (!def.body) {
                // Método abstracto o interfaz: sin cuerpo devolvemos el tipo por defecto.
                return this.zeroFor(this.typeLabel(def.returnType || { name: 'void' }));
            }
            this.execBlock({ type: 'Block', body: def.body }, env);
            return null;
        } catch (sig) {
            if (sig instanceof ReturnSignal) return sig.value;
            throw sig;
        } finally {
            this.depth--;
        }
    }

    initInstance(obj, args, argTypes, def, cls, env) {
        const targetCls = obj.cls;
        // Cada constructor de la cadena ejecuta su parte una sola vez: el de la
        // subclase llama a super(...) y ambos deben correr sus inicializadores.
        const key = `__init_${(cls || targetCls).name}`;
        if (obj[key]) return;
        obj[key] = true;
        obj.__initialized = true;
        const body = def.body || [];

        // Delegación this(...): el constructor real es otro de la misma clase.
        const head = body[0];
        if (head && head.type === 'ExprStmt' && head.expr.type === 'MethodCall'
            && head.expr.target && head.expr.target.type === 'This') {
            const dArgs = this.evalArgs(head.expr.args, env, head.expr.args.map(() => 'Object'));
            const dTypes = head.expr.args.map(() => 'Object');
            const other = this.pickMethod(targetCls, '<init>', dArgs.length, dTypes, false);
            if (other && other !== def) {
                delete obj[key];
                obj.__initialized = false;
                this.invokeUserMethod(other, obj, dArgs, dTypes, targetCls);
                return;
            }
        }

        // 1) Constructor de la superclase
        const sup = targetCls.superClass;
        if (sup && def.recordComponents === undefined) {
            const supCall = head && head.type === 'ExprStmt' && head.expr.type === 'MethodCall'
                && head.expr.target && head.expr.target.type === 'Super' ? head.expr : null;
            const supArgs = supCall ? this.evalArgs(supCall.args, env, supCall.args.map(() => 'Object')) : [];
            const supTypes = supCall ? supCall.args.map(() => 'Object') : [];
            const supCtor = this.pickMethod(sup, '<init>', supArgs.length, supTypes, false);
            if (supCtor) {
                this.invokeUserMethod(supCtor, obj, supArgs, supTypes, sup);
            } else {
                // Constructor nativo (p. ej. Throwable(String)): copiamos lo que fija.
                const build = sup.natives && sup.natives.get('__construct/#');
                if (build) {
                    const built = build(supArgs, { types: supTypes, interp: this });
                    if (built && built !== obj) {
                        for (const [k, cell] of built.fields) obj.set(k, cell.t, cell.v);
                    }
                }
            }
        }

        // 2) Valores por defecto de todos los campos declarados
        // La cadena va de la raíz hasta la clase cuyo constructor se está ejecutando:
        // la superclase se inicializa antes (ya lo hizo su propio constructor).
        const chain = [];
        let cur = targetCls;
        while (cur) {
            chain.unshift(cur);
            if (cur === (cls || targetCls)) break;
            cur = cur.superClass;
        }
        for (const c of chain) {
            for (const [name, fdef] of c.fields) {
                if (!obj.fields.get(name)) obj.fields.set(name, { t: this.typeLabel(fdef.type, fdef.dims), v: this.defaultValue(fdef) });
            }
        }

        // 3) Inicializadores de instancia y campos con valor inicial (de la base a la derivada)
        for (const c of chain) {
            const ckey = `__fields_${c.name}`;
            if (obj[ckey]) continue;
            obj[ckey] = true;
            const cenv = new Env(this.staticEnv);
            cenv.thisObj = obj;
            cenv.staticClass = c;
            if (c.instanceInit) {
                for (const stmt of c.instanceInit) this.execStatement(stmt, cenv);
            }
            for (const [name, fdef] of c.fields) {
                if (fdef.init) {
                    const cell = obj.fields.get(name);
                    cell.v = this.evalVarInit(fdef.init, this.typeLabel(fdef.type, fdef.dims), cenv);
                }
            }
        }

        // 4) Componentes de un record: se asignan desde los argumentos posicionales.
        if (def.recordComponents) {
            def.recordComponents.forEach((c, i) => {
                const value = args[i];
                const label = this.typeLabel(c.type);
                obj.fields.set(c.name, { t: label, v: this.coerce(value, argTypes[i], label) });
            });
        } else if (targetCls.kind === 'record' && targetCls.accessors.size) {
            // Constructor canónico explícito: los parámetros coinciden con los componentes.
            let i = 0;
            for (const [name] of targetCls.accessors) {
                const cell = obj.fields.get(name);
                if (cell && i < (def.params || []).length) {
                    const p = def.params[i];
                    cell.v = this.coerce(args[i], argTypes[i], this.typeLabel(p.type));
                }
                i++;
            }
        }

        // 5) Cuerpo del constructor (la llamada a super(...) no se ejecuta otra vez)
        const startAt = (head && head.type === 'ExprStmt' && head.expr.type === 'MethodCall'
            && head.expr.target && (head.expr.target.type === 'Super' || head.expr.target.type === 'This')) ? 1 : 0;
        for (let i = startAt; i < body.length; i++) {
            const stmt = body[i];
            if (stmt.type === 'Return') break;
            this.execStatement(stmt, env);
        }
        void args; void argTypes; void cls;
    }

    /* ------------------------------ construcción ------------------------------ */
    evalNew(node, env) {
        const typeName = node.targetType.name;
        const argTypes = node.args.map((a) => this.inferType(a, env));
        const args = this.evalArgs(node.args, env, argTypes);

        const cls = this.classes.get(typeName);
        if (!cls) {
            throw new JavaCompileError(`cannot find symbol\n  symbol: class ${typeName}\n  location: class ${this.currentClassName(env)}`, node.line, node.col);
        }
        if (cls.kind === 'interface' || cls.abstract) {
            throw new JavaCompileError(`${cls.name} is abstract; cannot be instantiated`, node.line, node.col);
        }
        if (cls.kind === 'enum') {
            // new solo llega aquí para enums con cuerpo; usamos la primera constante
            if (cls.enumConstants && cls.enumConstants.length) return cls.enumConstants[0];
        }
        const obj = new JavaObject(cls);
        obj.__initialized = false;
        if (cls.natives.has('__construct/#')) {
            const built = cls.natives.get('__construct/#')(args, { types: argTypes, interp: this });
            return built || obj;
        }
        const ctor = this.pickMethod(cls, '<init>', args.length, argTypes, false);
        if (ctor) {
            this.invokeUserMethod(ctor, obj, args, argTypes, cls);
        } else {
            const env = new Env(this.staticEnv);
            env.thisObj = obj;
            this.initInstance(obj, args, argTypes, { body: [] }, cls, env);
        }
        return obj;
    }

    currentClassName(env) {
        if (env && env.thisObj && env.thisObj.cls) return env.thisObj.cls.name;
        return 'Mision';
    }

    newArray(elemType, length) {
        const cls = this.classes.get('array') || this.ensureArrayClass();
        const obj = new JavaObject(cls, {});
        obj.native = { elements: new Array(length).fill(this.zeroFor(elemType)), elemType };
        return obj;
    }

    ensureArrayClass() {
        let cls = this.classes.get('array');
        if (!cls) {
            cls = new RuntimeClass('array', { kind: 'array' });
            this.classes.set('array', cls);
        }
        return cls;
    }

    arrayFrom(elemType, values) {
        const arr = this.newArray(elemType, values.length);
        arr.native.elements = values.map((v, i) => {
            if (v && v.__boxed) return v.__boxed;
            if (elemType.endsWith('[]') && Array.isArray(v) && !isObject(v)) {
                return this.arrayFrom(elemType.slice(0, -2), v);
            }
            return v;
        });
        return arr;
    }

    arrayElements(array, line) {
        if (array === null || array === undefined) this.throwJava('NullPointerException', 'no se puede usar un arreglo nulo');
        if (!isObject(array) || !array.native || !Array.isArray(array.native.elements)) {
            throw new EngineError(`se esperaba un arreglo en la línea ${line || 0}`);
        }
        return array.native.elements;
    }

    evalNewArray(node, env) {
        const elemType = node.arrayType.name;
        if (node.arrayInit) {
            if (node.dims && node.dims.length) {
                // new int[][]{{1,2},{3,4}}
                let sub = this.arrayInitValue(node.arrayInit, `${elemType}${'[]'.repeat(node.dims.length)}`, env);
                return sub;
            }
            const values = node.arrayInit.items.map((item) => (item.type === 'ArrayInit'
                ? this.arrayInitValue(item, `${elemType}[]`, env)
                : this.eval(item, env)));
            return this.arrayFrom(elemType, values);
        }
        const dims = node.dims.map((d) => (d ? this.eval(d, env) : 0));
        if (dims.length === 1) return this.newArray(elemType, dims[0]);
        if (dims.length === 2) {
            const outer = this.newArray(elemType + '[]', dims[0]);
            for (let i = 0; i < dims[0]; i++) {
                outer.native.elements[i] = this.newArray(elemType, dims[1]);
            }
            return outer;
        }
        throw new EngineError('sólo se admiten arreglos de 1 o 2 dimensiones');
    }

    /* ------------------------------ unarios, binarios, asignaciones ------------------------------ */
    evalUnary(node, env) {
        if (node.op === '++' || node.op === '--') {
            const current = this.eval(node.expr, env);
            const next = this.coerce(current + (node.op === '++' ? 1 : -1), this.inferType(node.expr, env), this.inferType(node.expr, env));
            this.assignTo(node.expr, next, env);
            return node.prefix ? next : current;
        }
        const value = this.eval(node.expr, env);
        const type = this.inferType(node.expr, env);
        switch (node.op) {
            case '+': return this.coerce(value, type, promote(type, 'int'));
            case '-': return this.coerce(-value, type, promote(type, 'int'));
            case '!': return !value;
            case '~': return truncate(~Math.trunc(value), type === 'long' ? 'long' : 'int');
            default: throw new EngineError(`operador unario no soportado: ${node.op}`);
        }
    }

    evalBinary(node, env) {
        const { op } = node;

        if (op === '&&') {
            return Boolean(this.eval(node.left, env)) ? Boolean(this.eval(node.right, env)) : false;
        }
        if (op === '||') {
            return Boolean(this.eval(node.left, env)) ? true : Boolean(this.eval(node.right, env));
        }

        const leftType = this.inferType(node.left, env);
        const rightType = this.inferType(node.right, env);
        const left = this.eval(node.left, env);
        const right = this.eval(node.right, env);

        if (op === '+' && (leftType === 'String' || rightType === 'String')) {
            const l = toJavaString(left, leftType) ?? this.valueToString(left, leftType);
            const r = toJavaString(right, rightType) ?? this.valueToString(right, rightType);
            return l + r;
        }

        if (ARITHMETIC.has(op)) {
            const type = promote(leftType, rightType);
            const a = this.coerce(left, leftType, type);
            const b = this.coerce(right, rightType, type);
            switch (op) {
                case '+': return this.coerce(a + b, type, type);
                case '-': return this.coerce(a - b, type, type);
                case '*': return this.coerce(a * b, type, type);
                case '/':
                    if (isIntegralType(type) || type === 'char') {
                        // División entera: Java lanza ArithmeticException ante divisor cero.
                        if (b === 0) this.throwJava('ArithmeticException', '/ by zero');
                        return this.coerce(Math.trunc(a / b), type, type);
                    }
                    return this.coerce(a / b, type, type);
                case '%':
                    if (isIntegralType(type) || type === 'char') {
                        if (b === 0) this.throwJava('ArithmeticException', '/ by zero');
                        return this.coerce(a % b, type, type);
                    }
                    return this.coerce(a % b, type, type);
                default: break;
            }
        }

        if (COMPARISON.has(op)) {
            const type = promote(leftType, rightType);
            const a = this.coerce(left, leftType, type);
            const b = this.coerce(right, rightType, type);
            switch (op) {
                case '<': return a < b;
                case '>': return a > b;
                case '<=': return a <= b;
                case '>=': return a >= b;
                default: break;
            }
        }

        if (EQUALITY.has(op)) {
            this.checkEqualityTypes(leftType, rightType, op, node);
            const bothNumeric = isNumericType(leftType) && isNumericType(rightType);
            let result;
            if (bothNumeric) {
                const type = promote(leftType, rightType);
                result = this.coerce(left, leftType, type) === this.coerce(right, rightType, type);
            } else if (leftType === 'boolean' && rightType === 'boolean') {
                result = left === right;
            } else if (leftType === 'null' || rightType === 'null') {
                result = left === right;
            } else if (typeof left === 'string' && typeof right === 'string') {
                result = left === right;
            } else {
                result = left === right;
            }
            return op === '==' ? result : !result;
        }

        if (BITWISE.has(op)) {
            const type = promote(leftType, rightType);
            const a = this.coerce(left, leftType, type);
            const b = this.coerce(right, rightType, type);
            if (op === '&') return this.coerce(a & b, type, type);
            if (op === '|') return this.coerce(a | b, type, type);
            return this.coerce(a ^ b, type, type);
        }

        if (SHIFTS.has(op)) {
            const a = Math.trunc(left);
            const b = Math.trunc(right);
            const type = promote(leftType, 'int');
            if (op === '<<') return this.coerce(a << b, type, type);
            if (op === '>>') return this.coerce(a >> b, type, type);
            return this.coerce(a >>> b, type, type);
        }

        throw new EngineError(`operador binario no soportado: ${op}`);
    }

    /**
     * Java no permite comparar un boolean con un tipo referencia. Solo se comprueba
     * ese caso (siempre inválido en el JDK); el resto sigue siendo dinámico para no
     * rechazar código válido que el motor todavía no tipa por completo.
     */
    checkEqualityTypes(leftType, rightType, op, node) {
        const booleanish = (t) => t === 'boolean' || t === 'Boolean';
        const referenceish = (t) => typeof t === 'string' && t !== 'unknown' && t !== 'null'
            && t !== 'void' && t !== 'var' && !isNumericType(t) && !booleanish(t);
        if ((booleanish(leftType) && referenceish(rightType)) || (booleanish(rightType) && referenceish(leftType))) {
            throw new JavaCompileError(
                `bad operand types for binary operator '${op}'\n  ${leftType} and ${rightType}`,
                node.line, node.col
            );
        }
    }

    evalAssign(node, env) {        const value = this.eval(node.value, env);
        if (node.op === '=') {
            const targetType = this.inferType(node.target, env);
            const coerced = this.coerce(value, this.inferType(node.value, env), targetType);
            this.assignTo(node.target, coerced, env);
            return coerced;
        }
        const op = node.op.slice(0, -1);
        const current = this.eval(node.target, env);
        const synthetic = { type: 'Binary', op, left: node.target, right: node.value, line: node.line, col: node.col };
        const combined = this.evalBinary(synthetic, env);
        this.assignTo(node.target, combined, env);
        return combined;
    }

    assignTo(node, value, env) {
        switch (node.type) {
            case 'Name': {
                const cell = env.lookup(node.name);
                if (cell) {
                    if (cell.final) {
                        throw new JavaCompileError(`cannot assign a value to final variable ${node.name}`, node.line, node.col);
                    }
                    cell.v = value;
                    return;
                }
                let obj = env.thisObj;
                let cls = obj ? obj.cls : null;
                while (obj) {
                    const def = cls && cls.fields.get(node.name);
                    if (def) {
                        if (def.isFinal) {
                            throw new JavaCompileError(`cannot assign a value to final ${def.isStatic ? '' : 'variable '}${node.name}`, node.line, node.col);
                        }
                        const cell2 = obj.fields.get(node.name);
                        if (cell2) cell2.v = value;
                        else obj.set(node.name, this.typeLabel(def.type, def.dims), value);
                        return;
                    }
                    // Subimos por la jerarquía de la clase, no por los enlaces nativos.
                    if (cls && cls.superClass) { cls = cls.superClass; continue; }
                    obj = obj.native && obj.native.super ? obj.native.super : null;
                    cls = obj ? obj.cls : null;
                }
                if (env.staticClass) {
                    const cell = env.staticClass.staticFields.get(node.name);
                    if (cell) { cell.v = value; return; }
                }
                const fieldDef = this.lookupField(node.name, env);
                if (fieldDef && fieldDef.obj) {
                    fieldDef.obj.fields.get(node.name).v = value;
                    return;
                }
                throw new JavaCompileError(`cannot find symbol\n  symbol: variable ${node.name}`, node.line, node.col);
            }

            case 'Paren':
                return this.assignTo(node.expr, value, env);

            case 'FieldAccess': {
                const staticInfo = this.resolveStaticTarget(node.target, env);
                if (staticInfo) {
                    const cell = staticInfo.cls.staticFields.get(node.name);
                    if (!cell) throw new JavaCompileError(`cannot find symbol\n  symbol: variable ${node.name}`, node.line, node.col);
                    if (node.name === 'length') throw new JavaCompileError('no se puede asignar a length', node.line, node.col);
                    cell.v = value;
                    return;
                }
                const target = this.eval(node.target, env);
                if (target === null) this.throwJava('NullPointerException', `No se puede asignar a "${node.name}" porque el objeto es null`);
                if (isObject(target)) {
                    const cell = target.fields.get(node.name);
                    if (cell) { cell.v = value; return; }
                    target.set(node.name, this.inferType(node, env), value);
                    return;
                }
                throw new JavaCompileError(`cannot find symbol\n  symbol: variable ${node.name}`, node.line, node.col);
            }

            case 'ArrayAccess': {
                const array = this.eval(node.array, env);
                const index = Math.trunc(this.eval(node.index, env));
                const elements = this.arrayElements(array, node.line);
                if (index < 0 || index >= elements.length) {
                    this.throwJava('ArrayIndexOutOfBoundsException', `Index ${index} out of bounds for length ${elements.length}`);
                }
                elements[index] = value;
                return;
            }

            default:
                throw new EngineError(`no se puede asignar a ${node.type}`);
        }
    }

    /* ------------------------------ casts e instanceof ------------------------------ */
    evalCast(node, env) {
        const value = this.eval(node.expr, env);
        const target = this.typeLabel(node.targetType);
        const from = this.inferType(node.expr, env);

        if (target.endsWith('[]')) {
            if (Array.isArray(value) && !isObject(value)) return this.arrayFrom(target.slice(0, -2), value);
            return value;
        }
        if (isObject(value)) {
            const cls = this.classes.get(target);
            if (target === 'Object') return value;
            if (cls && value.cls && !value.cls.isSubclassOf(cls) && !(value.cls.isSubclassOf && cls.isSubclassOf(value.cls))) {
                // Puede ser upcast entre interfaces: lo permitimos salvo tipos incompatibles claros
                if (!(cls.isInterface || value.cls.isInterface)) {
                    this.throwJava('ClassCastException', `class ${value.cls.name} cannot be cast to class ${target}`);
                }
            }
            return value;
        }
        switch (target) {
            case 'int': return truncate(Math.trunc(value), 'int');
            case 'long': return Math.trunc(value);
            case 'short': return truncate(value, 'short');
            case 'byte': return truncate(value, 'byte');
            case 'char': return truncate(value, 'char');
            case 'double': case 'float': return value;
            case 'boolean': return Boolean(value);
            case 'String':
                if (from === 'char') return String.fromCharCode(value);
                return toJavaString(value, from);
            default: return value;
        }
    }

    evalInstanceOf(node, env) {
        const value = this.eval(node.expr, env);
        const target = this.typeLabel(node.targetType);
        if (value === null) return false;
        if (isObject(value)) {
            const cls = this.classes.get(target);
            if (!cls) return false;
            const ok = value.cls.isSubclassOf(cls);
            if (ok && node.binding) env.declare(node.binding, target, value);
            return ok;
        }
        return false;
    }

    /* ------------------------------ iteración ------------------------------ */
    iterate(value, line) {
        if (value === null) this.throwJava('NullPointerException', 'no se puede iterar un valor null');
        if (isObject(value) && value.native && Array.isArray(value.native.elements)) return value.native.elements.slice();
        // Colecciones de java.util: la carga útil es `items` (listas y conjuntos).
        if (isObject(value) && value.native && Array.isArray(value.native.items)) return value.native.items.slice();
        // Un mapa itera sus entradas, como en Java.
        if (isObject(value) && value.native && value.native.entries) {
            return [...value.native.entries].map(([k, v]) => {
                const e = new JavaObject(this.classes.get('Entry') || this.classes.get('Object'), {});
                e.native = { kind: 'entry', key: k, value: v };
                return e;
            });
        }
        const iter = this.nativeMethod(value.cls || this.classes.get('Object'), 'iterator', 0);
        if (iter) {
            const it = iter([value], { types: [value.cls.name], interp: this });
            const out = [];
            for (;;) {
                const has = this.host.callMethod(it, 'hasNext', []);
                if (!has) break;
                out.push(this.host.callMethod(it, 'next', []));
                if (out.length > 1000000) throw new EngineError('iteración demasiado larga');
            }
            return out;
        }
        throw new EngineError(`el valor de la línea ${line || 0} no se puede iterar`);
    }

    /* ------------------------------ lambdas y referencias a métodos ------------------------------ */
    makeLambda(node, env) {
        const engine = this;
        const closureEnv = env;
        const obj = new JavaObject(this.classes.get('Lambda') || this.ensureLambdaClass(), {});
        obj.native = {
            kind: 'lambda',
            invoke(args) {
                const scope = closureEnv.child();
                node.params.forEach((p, i) => {
                    const label = (p.implicitType || !p.type) ? 'var' : engine.typeLabel(p.type);
                    scope.declare(p.name, label, args[i]);
                });
                if (node.isExpression) return engine.eval(node.body, scope);
                try {
                    engine.execBlock({ type: 'Block', body: node.body }, scope);
                } catch (sig) {
                    if (sig instanceof ReturnSignal) return sig.value;
                    throw sig;
                }
                return null;
            }
        };
        return obj;
    }

    ensureLambdaClass() {
        let cls = this.classes.get('Lambda');
        if (!cls) {
            cls = new RuntimeClass('Lambda', { kind: 'interface', isFunctional: true });
            this.classes.set('Lambda', cls);
        }
        return cls;
    }

    /** Vincula un objeto lambda con la interfaz funcional que lo implementa. */
    adoptLambda(obj, iface) {
        obj.cls = iface;
        obj.native.iface = iface;
        let target = null;
        for (const list of iface.methods.values()) {
            for (const m of list) {
                if (m.name !== '<init>' && !m.body) { target = m.name; break; }
            }
            if (target) break;
        }
        if (target) obj.native.method = target;
        return obj;
    }

    makeMethodRef(node, env) {
        const engine = this;
        const target = node.target;
        if (target.type === 'ClassLiteral' && target.name) {
            const cls = this.classes.get(target.name);
            const obj = new JavaObject(this.ensureLambdaClass(), {});
            obj.native = {
                kind: 'lambda',
                invoke(args) {
                    if (node.name === 'new') return engine.evalNew({ targetType: { name: target.name, args: [], dims: 0, isVar: false }, args: args.map((a) => ({ type: 'Literal', kind: 'object', value: a, line: 0, col: 0 })) }, env);
                    const def = cls ? engine.findUserMethod(cls, node.name, args.length) : null;
                    if (def) return engine.invokeUserMethod(def, null, args, args.map(() => 'Object'), cls);
                    throw new EngineError(`referencia a método no soportada: ${target.name}::${node.name}`);
                }
            };
            return obj;
        }

        const receiver = this.eval(target, env);
        const receiverType = this.inferType(target, env);
        const obj = new JavaObject(this.ensureLambdaClass(), {});
        obj.native = {
            kind: 'lambda',
            invoke(args) {
                if (isObject(receiver)) {
                    const cls = receiver.cls;
                    const def = engine.findUserMethod(cls, node.name, args.length);
                    if (def) return engine.invokeUserMethod(def, receiver, args, args.map(() => 'Object'), cls);
                    const native = engine.nativeMethod(cls, node.name, args.length);
                    if (native) return native([receiver, ...args], { types: [cls.name, ...args.map(() => 'Object')], interp: engine });
                    throw new EngineError(`referencia a método no soportada: ${node.name}`);
                }
                const wrapper = engine.wrapperFor(receiverType);
                const native = wrapper ? engine.nativeMethod(wrapper, node.name, args.length) : null;
                if (native) return native([receiver, ...args], { types: [receiverType, ...args.map(() => 'Object')], interp: engine });
                throw new EngineError(`referencia a método no soportada: ${node.name}`);
            }
        };
        return obj;
    }

    /* ================================================================
       TIPADO ESTÁTICO (necesario para println, concatenación y sobrecargas)
       ================================================================ */
    inferType(node, env) {
        try {
            return this.inferTypeInner(node, env);
        } catch (e) {
            return 'unknown';
        }
    }

    inferTypeInner(node, env) {
        switch (node.type) {
            case 'Literal':
                return node.kind === 'null' ? 'null' : (LITERAL_TYPES[node.kind] || node.kind);
            case 'Paren':
                return this.inferType(node.expr, env);
            case 'Name': {
                const cell = env.lookup(node.name);
                if (cell) return cell.t;
                const def = this.lookupField(node.name, env);
                if (def) return def.def.type ? this.typeLabel(def.def.type, def.def.dims) : 'Object';
                if (this.classes.has(node.name)) return 'class';
                return 'unknown';
            }
            case 'This':
            case 'Super':
                return env.thisObj && env.thisObj.cls ? env.thisObj.cls.name : 'unknown';
            case 'FieldAccess': {
                const staticInfo = this.resolveStaticTarget(node.target, env);
                if (staticInfo) {
                    const cell = staticInfo.cls.staticFields.get(node.name);
                    return cell ? cell.t : 'Object';
                }
                const value = this.eval(node.target, env);
                if (isObject(value)) {
                    if (value.cls.kind === 'array' && node.name === 'length') return 'int';
                    const cell = value.fields.get(node.name);
                    if (cell) return cell.t;
                    const s = value.cls.staticFields.get(node.name);
                    return s ? s.t : 'Object';
                }
                return 'unknown';
            }
            case 'MethodCall': {
                const argTypes = node.args.map((a) => this.inferType(a, env));
                const nativeRet = (cls) => {
                    if (!cls) return null;
                    return cls.nativeReturnType(node.name, node.args.length) || null;
                };
                if (node.target) {
                    const staticInfo = this.resolveStaticTarget(node.target, env);
                    if (staticInfo) {
                        const def = this.pickMethod(staticInfo.cls, node.name, node.args.length, argTypes, true)
                            || this.pickMethod(staticInfo.cls, node.name, node.args.length, argTypes, false);
                        if (def && def.returnType) return this.typeLabel(def.returnType);
                        const nr = nativeRet(staticInfo.cls);
                        if (nr) return nr;
                        return 'unknown';
                    }
                    const targetType = this.inferType(node.target, env);
                    const cls = this.classes.get(targetType);
                    if (cls) {
                        const def = this.pickMethod(cls, node.name, node.args.length, argTypes, false);
                        if (def && def.returnType) return this.typeLabel(def.returnType);
                        const nr = nativeRet(cls);
                        if (nr) return nr;
                    }
                }
                if (env.thisObj) {
                    const def = this.pickMethod(env.thisObj.cls, node.name, node.args.length, argTypes, false);
                    if (def && def.returnType) return this.typeLabel(def.returnType);
                    const nr = nativeRet(env.thisObj.cls);
                    if (nr) return nr;
                }
                if (env.staticClass) {
                    const def = this.pickMethod(env.staticClass, node.name, node.args.length, argTypes, true);
                    if (def && def.returnType) return this.typeLabel(def.returnType);
                    const nr = nativeRet(env.staticClass);
                    if (nr) return nr;
                }
                return 'unknown';
            }
            case 'ArrayAccess': {
                const arrayType = this.inferType(node.array, env);
                return arrayType.endsWith('[]') ? arrayType.slice(0, -2) : 'Object';
            }
            case 'New':
                return this.typeLabel(node.targetType);
            case 'NewArray': {
                const total = node.dims.length;
                let t = node.arrayType.name;
                for (let i = 0; i < total; i++) t += '[]';
                return t;
            }
            case 'ArrayInit':
                return 'unknown';
            case 'Unary':
                if (node.op === '!') return 'boolean';
                if (node.op === '++' || node.op === '--') return this.inferType(node.expr, env);
                return promote(this.inferType(node.expr, env), 'int');
            case 'Binary': {
                if (['&&', '||', '<', '>', '<=', '>=', '==', '!='].includes(node.op)) return 'boolean';
                const lt = this.inferType(node.left, env);
                const rt = this.inferType(node.right, env);
                if (node.op === '+' && (lt === 'String' || rt === 'String')) return 'String';
                return promote(lt, rt);
            }
            case 'Assign':
                return node.op === '=' ? this.inferType(node.target, env) : this.inferType(node.target, env);
            case 'Ternary':
                return this.inferType(node.then, env) !== 'unknown' ? this.inferType(node.then, env) : this.inferType(node.otherwise, env);
            case 'Cast':
                return this.typeLabel(node.targetType);
            case 'InstanceOf':
                return 'boolean';
            case 'Lambda':
                return 'Lambda';
            case 'MethodRef':
                return 'Lambda';
            case 'SwitchExpr':
                return 'unknown';
            case 'ClassLiteral':
                return 'Class';
            default:
                return 'unknown';
        }
    }
}

function flattenInit(values) {
    const out = [];
    const walk = (v) => {
        if (Array.isArray(v) && !isObject(v)) v.forEach(walk);
        else out.push(v);
    };
    values.forEach(walk);
    return out;
}

/** ¿El método declarado acepta un número variable de argumentos en su último parámetro? */
function isVarargs(m) {
    const last = m.params && m.params[m.params.length - 1];
    return !!(last && last.varargs);
}

/** Ejecuta código Java y devuelve { ok, stdout, stderr, error }. */
export function runJava(source, options = {}) {
    return new JavaEngine(options).run(source);
}
