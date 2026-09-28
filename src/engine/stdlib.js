/* Biblioteca estÃ¡ndar de JavaLearn: implementa en JavaScript las clases de java.lang,
   java.util y java.io que usan las misiones. Cada clase nativa expone sus mÃ©todos en
   `natives` ("nombre/aridad" o "nombre/#" como comodÃ­n) y sus campos estÃ¡ticos en `staticFields`. */

import { RuntimeClass, JavaObject, toJavaString, truncate } from './runtime.js';
import { javaFormat, javaDoubleToString, javaIntegerToString, javaCharToString } from './format.js';

const LINE_SEP = '\n';

function def(cls, name, arity, fn) {
    cls.natives.set(`${name}/${arity}`, fn);
}

/** Declara el tipo de retorno estÃ¡tico de un mÃ©todo nativo (necesario para char/int/long). */
function ret(cls, name, arity, type) {
    cls.nativeReturns.set(`${name}/${arity}`, type);
}

function field(cls, name, type, value) {
    cls.staticFields.set(name, { t: type, v: value });
}

/** Tipo estÃ¡tico del argumento `i` de una llamada nativa. */
function typeAt(ctx, i) {
    return ctx && ctx.types ? ctx.types[i] : undefined;
}

/* Convierte una expresiÃ³n regular de Java a una de JavaScript (subconjunto). */
function toJsRegExp(pattern) {
    return new RegExp(String(pattern), 'g');
}

/* ------------------------------------------------------------------ */
/* ConstrucciÃ³n de la biblioteca estÃ¡ndar                               */
/* ------------------------------------------------------------------ */
export function buildStdlib(host) {
    const classes = new Map();

    const makeClass = (name, opts) => {
        const cls = new RuntimeClass(name, { kind: 'class', ...opts });
        classes.set(name, cls);
        return cls;
    };

    // ConversiÃ³n a texto con el tipo estÃ¡tico que Java usarÃ­a en ese punto.
    const text = (value, type) => {
        if (value === null || value === undefined) return 'null';
        return toJavaString(value, type) ?? host.toString(value);
    };
    // Textificador para String.format / printf: recibe el Ã­ndice del argumento para
    // respetar su tipo estÃ¡tico (%s sobre un char debe imprimir el carÃ¡cter, no su cÃ³digo).
    const fmtText = (value, index, types) => {
        if (value === null || value === undefined) return 'null';
        if (typeof value === 'object') return host.toString(value);
        const t = types && types[index];
        return toJavaString(value, t || (typeof value === 'number' ? 'int' : null)) ?? String(value);
    };
    // Envoltorio de fmtText que ya conoce la lista de tipos de la llamada.
    const formatArgs = (args, types) => (value, index) => fmtText(value, index, types);

    /* ---------------- Object ---------------- */
    const objectClass = makeClass('Object', {});
    def(objectClass, 'toString', '#', (argv, ctx) => {
        if (argv[0] === null) return 'null';
        if (typeof argv[0] === 'string') return argv[0];
        if (typeof argv[0] === 'boolean' || typeof argv[0] === 'number') return toJavaString(argv[0], ctx.types[0]);
        return host.toString(argv[0]);
    });
    def(objectClass, 'equals', 1, (argv) => host.equals(argv[0], argv[1]));
    def(objectClass, 'hashCode', 0, (argv) => host.identityHash(argv[0]) % 2147483647);

    /* ---------------- String ---------------- */
    const stringClass = makeClass('String', {});
    // new String(...) admite char[], String y boolean como en el constructor real.
    // El motor representa los String como primitivos, asÃ­ que devolvemos el texto.
    stringClass.natives.set('__construct/#', (argv) => {
        const arg = argv[0];
        if (arg === null || arg === undefined) host.throwJava('NullPointerException', 'null');
        if (isObj(arg) && arg.native && Array.isArray(arg.native.elements)) {
            return arg.native.elements.map((c) => (typeof c === 'number' ? String.fromCharCode(c) : String(c))).join('');
        }
        return String(arg);
    });
    classes.set('CharSequence', stringClass);
    const S = (argv) => (argv[0] === null ? null : String(argv[0]));
    const needStr = (argv, i = 0) => {
        if (argv[i] === null || argv[i] === undefined) host.throwJava('NullPointerException', 'null');
        return String(argv[i]);
    };
    // El motor representa un char como su cÃ³digo: aquÃ­ se recupera el carÃ¡cter.
    const charArg = (argv, i) => (typeof argv[i] === 'number' ? String.fromCharCode(argv[i]) : needStr(argv, i));

    def(stringClass, 'length', 0, (argv) => needStr(argv).length);
    def(stringClass, 'isEmpty', 0, (argv) => needStr(argv).length === 0);
    def(stringClass, 'isBlank', 0, (argv) => needStr(argv).trim().length === 0);
    def(stringClass, 'charAt', 1, (argv) => {
        const s = needStr(argv);
        const i = argv[1];
        if (i < 0 || i >= s.length) {
            host.throwJava('StringIndexOutOfBoundsException', `index ${i}, length ${s.length}`);
        }
        return s.charCodeAt(i);
    });
    def(stringClass, 'substring', 1, (argv) => {
        const s = needStr(argv);
        if (argv[1] < 0 || argv[1] > s.length) host.throwJava('StringIndexOutOfBoundsException', `begin ${argv[1]}, length ${s.length}`);
        return s.slice(argv[1]);
    });
    def(stringClass, 'substring', 2, (argv) => {
        const s = needStr(argv);
        if (argv[1] < 0 || argv[1] > argv[2] || argv[2] > s.length) {
            host.throwJava('StringIndexOutOfBoundsException', `begin ${argv[1]}, end ${argv[2]}, length ${s.length}`);
        }
        return s.slice(argv[1], argv[2]);
    });
    def(stringClass, 'indexOf', 1, (argv) => needStr(argv).indexOf(charArg(argv, 1)));
    def(stringClass, 'indexOf', 2, (argv) => needStr(argv).indexOf(charArg(argv, 1), argv[2]));
    def(stringClass, 'lastIndexOf', 1, (argv) => needStr(argv).lastIndexOf(charArg(argv, 1)));
    def(stringClass, 'lastIndexOf', 2, (argv) => needStr(argv).lastIndexOf(charArg(argv, 1), argv[2]));
    def(stringClass, 'contains', 1, (argv) => needStr(argv).includes(charArg(argv, 1)));
    def(stringClass, 'startsWith', 1, (argv) => needStr(argv).startsWith(charArg(argv, 1)));
    def(stringClass, 'endsWith', 1, (argv) => needStr(argv).endsWith(charArg(argv, 1)));
    def(stringClass, 'toUpperCase', 0, (argv) => needStr(argv).toUpperCase());
    def(stringClass, 'toLowerCase', 0, (argv) => needStr(argv).toLowerCase());
    def(stringClass, 'trim', 0, (argv) => needStr(argv).replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, ''));
    def(stringClass, 'strip', 0, (argv) => needStr(argv).trim());
    def(stringClass, 'stripLeading', 0, (argv) => needStr(argv).replace(/^[\s\uFEFF\xA0]+/, ''));
    def(stringClass, 'stripTrailing', 0, (argv) => needStr(argv).replace(/[\s\uFEFF\xA0]+$/, ''));
    def(stringClass, 'concat', 1, (argv) => needStr(argv) + needStr(argv, 1));
    def(stringClass, 'repeat', 1, (argv) => needStr(argv).repeat(Math.max(0, argv[1])));
    def(stringClass, 'equals', 1, (argv) => argv[0] !== null && argv[1] !== null && String(argv[0]) === String(argv[1]));
    def(stringClass, 'equalsIgnoreCase', 1, (argv) => argv[0] !== null && argv[1] !== null
        && String(argv[0]).toLowerCase() === String(argv[1]).toLowerCase());
    def(stringClass, 'compareTo', 1, (argv) => {
        const a = needStr(argv); const b = needStr(argv, 1);
        return a < b ? -1 : (a > b ? 1 : 0);
    });
    def(stringClass, 'replace', 2, (argv) => {
        const from = charArg(argv, 1);
        const to = charArg(argv, 2);
        if (from === '') return needStr(argv);
        return needStr(argv).split(from).join(to);
    });
    def(stringClass, 'replaceAll', 2, (argv) => {
        const re = toJsRegExp(needStr(argv, 1));
        const rep = needStr(argv, 2).replace(/\$(\d)/g, '$$$1').replace(/\$\{(\d+)\}/g, '$$$1');
        return needStr(argv).replace(re, rep);
    });
    def(stringClass, 'matches', 1, (argv) => {
        const re = new RegExp(`^(?:${needStr(argv, 1)})$`);
        return re.test(needStr(argv));
    });
    def(stringClass, 'split', 1, (argv) => javaSplit(needStr(argv), needStr(argv, 1), 0));
    def(stringClass, 'split', 2, (argv) => javaSplit(needStr(argv), needStr(argv, 1), argv[2]));
    def(stringClass, 'toString', 0, (argv) => S(argv) || 'null');
    def(stringClass, 'formatted', '#', (argv, ctx) => javaFormat(S(argv), argv.slice(1), formatArgs(argv.slice(1), ctx.types.slice(1))));

    def(stringClass, 'valueOf', 1, (argv, ctx) => text(argv[0], ctx.types[0]));
    def(stringClass, 'format', '#', (argv, ctx) => javaFormat(S(argv), argv.slice(1), formatArgs(argv.slice(1), ctx.types.slice(1))));
    def(stringClass, 'join', '#', (argv, ctx) => {
        const sep = S(argv);
        const parts = [];
        for (let i = 1; i < argv.length; i++) {
            const v = argv[i];
            if (v && v.native && (Array.isArray(v.native.items) || Array.isArray(v.native.elements))) {
                const list = v.native.items || v.native.elements;
                parts.push(list.map((x) => text(x, null)).join(sep));
            } else {
                parts.push(text(v, ctx.types[i]));
            }
        }
        return parts.join(sep);
    });

    /* ---------------- StringBuilder ---------------- */
    const sbClass = makeClass('StringBuilder', {});
    classes.set('StringBuffer', sbClass);
    sbClass.natives.set('__construct/#', (argv) => {
        const obj = new JavaObject(sbClass);
        const seed = argv.length ? argv[0] : null;
        obj.native = { value: seed === null || seed === undefined ? '' : (toJavaString(seed, null) ?? host.toString(seed)) };
        return obj;
    });
    const sbBuf = (argv) => {
        let obj = argv[0];
        if (!(obj instanceof JavaObject) || !obj.native) {
            obj = new JavaObject(sbClass);
            obj.native = { value: '' };
            argv[0] = obj;
        }
        return obj.native;
    };
    def(sbClass, 'append', '#', (argv, ctx) => { sbBuf(argv).value += text(argv[1], typeAt(ctx, 1)); return argv[0]; });
    def(sbClass, 'toString', 0, (argv) => sbBuf(argv).value);
    def(sbClass, 'length', 0, (argv) => sbBuf(argv).value.length);
    def(sbClass, 'reverse', 0, (argv) => { sbBuf(argv).value = sbBuf(argv).value.split('').reverse().join(''); return argv[0]; });
    def(sbClass, 'insert', 2, (argv, ctx) => {
        const b = sbBuf(argv);
        b.value = b.value.slice(0, argv[1]) + text(argv[2], typeAt(ctx, 2)) + b.value.slice(argv[1]);
        return argv[0];
    });
    def(sbClass, 'deleteCharAt', 1, (argv) => {
        const b = sbBuf(argv);
        b.value = b.value.slice(0, argv[1]) + b.value.slice(argv[1] + 1);
        return argv[0];
    });
    def(sbClass, 'setLength', 1, (argv) => { sbBuf(argv).value = sbBuf(argv).value.slice(0, argv[1]); return; });
    def(sbClass, 'charAt', 1, (argv) => sbBuf(argv).value.charCodeAt(argv[1]));

    /* ---------------- Math ---------------- */
    const mathClass = makeClass('Math', {});
    field(mathClass, 'PI', 'double', Math.PI);
    field(mathClass, 'E', 'double', Math.E);
    field(mathClass, 'TAU', 'double', Math.PI * 2);
    def(mathClass, 'abs', 1, (argv, ctx) => Math.abs(argv[0]));
    def(mathClass, 'max', 2, (argv, ctx) => (argv[0] > argv[1] ? argv[0] : argv[1]));
    def(mathClass, 'min', 2, (argv, ctx) => (argv[0] < argv[1] ? argv[0] : argv[1]));
    def(mathClass, 'sqrt', 1, (argv) => Math.sqrt(argv[0]));
    def(mathClass, 'cbrt', 1, (argv) => Math.cbrt(argv[0]));
    def(mathClass, 'pow', 2, (argv) => Math.pow(argv[0], argv[1]));
    def(mathClass, 'floor', 1, (argv) => Math.floor(argv[0]));
    def(mathClass, 'ceil', 1, (argv) => Math.ceil(argv[0]));
    def(mathClass, 'round', 1, (argv) => Math.floor(argv[0] + 0.5));   // Math.round(double) devuelve long
    def(mathClass, 'signum', 1, (argv) => (argv[0] > 0 ? 1 : (argv[0] < 0 ? -1 : 0)));
    def(mathClass, 'log', 1, (argv) => Math.log(argv[0]));
    def(mathClass, 'log10', 1, (argv) => Math.log10(argv[0]));
    def(mathClass, 'exp', 1, (argv) => Math.exp(argv[0]));
    def(mathClass, 'sin', 1, (argv) => Math.sin(argv[0]));
    def(mathClass, 'cos', 1, (argv) => Math.cos(argv[0]));
    def(mathClass, 'tan', 1, (argv) => Math.tan(argv[0]));
    def(mathClass, 'atan', 1, (argv) => Math.atan(argv[0]));
    def(mathClass, 'atan2', 2, (argv) => Math.atan2(argv[0], argv[1]));
    def(mathClass, 'hypot', 2, (argv) => Math.hypot(argv[0], argv[1]));
    def(mathClass, 'random', 0, () => host.random());
    def(mathClass, 'toIntExact', 1, (argv) => {
        if (!Number.isInteger(argv[0])) host.throwJava('ArithmeticException', 'overflow');
        return argv[0];
    });

    /* ---------------- Envoltorios numÃ©ricos ---------------- */
    const intClass = makeClass('Integer', {});
    classes.set('Number', makeClass('Number', {}));
    field(intClass, 'MAX_VALUE', 'int', 2147483647);
    field(intClass, 'MIN_VALUE', 'int', -2147483648);
    field(intClass, 'BYTES', 'int', 4);
    def(intClass, 'parseInt', 1, (argv) => parseIntegral(host, argv[0], 'int'));
    def(intClass, 'parseInt', 2, (argv) => parseIntegral(host, argv[0], 'int', argv[1]));
    def(intClass, 'valueOf', 1, (argv) => parseIntegral(host, argv[0], 'int'));
    def(intClass, 'toString', 1, (argv) => String(argv[0]));
    def(intClass, 'toString', 2, (argv) => javaIntegerToString(argv[0], argv[1]));
    def(intClass, 'toBinaryString', 1, (argv) => javaIntegerToString(argv[0], 2));
    def(intClass, 'toHexString', 1, (argv) => javaIntegerToString(argv[0], 16));
    def(intClass, 'toOctalString', 1, (argv) => javaIntegerToString(argv[0], 8));
    def(intClass, 'compare', 2, (argv) => (argv[0] < argv[1] ? -1 : (argv[0] > argv[1] ? 1 : 0)));
    def(intClass, 'sum', 2, (argv) => truncate(argv[0] + argv[1], 'int'));
    def(intClass, 'max', 2, (argv) => Math.max(argv[0], argv[1]));
    def(intClass, 'min', 2, (argv) => Math.min(argv[0], argv[1]));
    def(intClass, 'intValue', 0, (argv) => truncate(argv[0], 'int'));
    def(intClass, 'toString', 0, (argv, ctx) => toJavaString(argv[0], ctx.types[0]));

    const longClass = makeClass('Long', {});
    field(longClass, 'MAX_VALUE', 'long', 9223372036854775807);
    field(longClass, 'MIN_VALUE', 'long', -9223372036854775808);
    def(longClass, 'parseLong', 1, (argv) => parseIntegral(host, argv[0], 'long'));
    def(longClass, 'valueOf', 1, (argv) => parseIntegral(host, argv[0], 'long'));
    def(longClass, 'toString', 1, (argv) => String(argv[0]));
    def(longClass, 'toBinaryString', 1, (argv) => javaIntegerToString(argv[0], 2));
    def(longClass, 'toHexString', 1, (argv) => javaIntegerToString(argv[0], 16));
    def(longClass, 'compare', 2, (argv) => (argv[0] < argv[1] ? -1 : (argv[0] > argv[1] ? 1 : 0)));
    def(longClass, 'longValue', 0, (argv) => argv[0]);

    const doubleClass = makeClass('Double', {});
    classes.set('Float', makeClass('Float', {}));
    field(doubleClass, 'MAX_VALUE', 'double', Number.MAX_VALUE);
    field(doubleClass, 'MIN_VALUE', 'double', Number.MIN_VALUE);
    field(doubleClass, 'POSITIVE_INFINITY', 'double', Infinity);
    field(doubleClass, 'NEGATIVE_INFINITY', 'double', -Infinity);
    field(doubleClass, 'NaN', 'double', NaN);
    def(doubleClass, 'parseDouble', 1, (argv) => parseFloating(host, argv[0]));
    def(doubleClass, 'valueOf', 1, (argv) => parseFloating(host, argv[0]));
    def(doubleClass, 'isNaN', 1, (argv) => Number.isNaN(argv[0]));
    def(doubleClass, 'compare', 2, (argv) => (argv[0] < argv[1] ? -1 : (argv[0] > argv[1] ? 1 : 0)));
    def(doubleClass, 'doubleValue', 0, (argv) => argv[0]);
    def(doubleClass, 'toString', 1, (argv) => javaDoubleToString(argv[0]));
    const floatClass = classes.get('Float');
    def(floatClass, 'parseFloat', 1, (argv) => Math.fround(parseFloating(host, argv[0])));
    def(floatClass, 'toString', 1, (argv) => javaDoubleToString(argv[0]));

    const booleanClass = makeClass('Boolean', {});
    field(booleanClass, 'TRUE', 'boolean', true);
    field(booleanClass, 'FALSE', 'boolean', false);
    def(booleanClass, 'parseBoolean', 1, (argv) => String(argv[0]).toLowerCase() === 'true');
    def(booleanClass, 'valueOf', 1, (argv) => String(argv[0]).toLowerCase() === 'true');
    def(booleanClass, 'toString', 1, (argv) => String(argv[0]));
    def(booleanClass, 'booleanValue', 0, (argv) => Boolean(argv[0]));
    def(booleanClass, 'compare', 2, (argv) => (argv[0] === argv[1] ? 0 : (argv[0] ? 1 : -1)));

    const charClass = makeClass('Character', {});
    field(charClass, 'MAX_VALUE', 'char', 65535);
    field(charClass, 'MIN_VALUE', 'char', 0);
    def(charClass, 'isDigit', 1, (argv) => /[0-9]/.test(javaCharToString(argv[0])));
    def(charClass, 'isLetter', 1, (argv) => /[A-Za-z]/.test(javaCharToString(argv[0])));
    def(charClass, 'isLetterOrDigit', 1, (argv) => /[A-Za-z0-9]/.test(javaCharToString(argv[0])));
    def(charClass, 'isUpperCase', 1, (argv) => /[A-Z]/.test(javaCharToString(argv[0])));
    def(charClass, 'isLowerCase', 1, (argv) => /[a-z]/.test(javaCharToString(argv[0])));
    def(charClass, 'isWhitespace', 1, (argv) => /\s/.test(javaCharToString(argv[0])));
    def(charClass, 'isAlphabetic', 1, (argv) => /\p{L}/u.test(javaCharToString(argv[0])));
    def(charClass, 'toUpperCase', 1, (argv) => javaCharToString(argv[0]).toUpperCase().charCodeAt(0));
    def(charClass, 'toLowerCase', 1, (argv) => javaCharToString(argv[0]).toLowerCase().charCodeAt(0));
    def(charClass, 'charValue', 0, (argv) => argv[0]);
    def(charClass, 'getNumericValue', 1, (argv) => {
        const c = javaCharToString(argv[0]);
        return /[0-9]/.test(c) ? c.charCodeAt(0) - 48 : -1;
    });
    def(charClass, 'toString', 1, (argv) => javaCharToString(argv[0]));

    /* ---------------- Excepciones ---------------- */
    const throwable = makeClass('Throwable', {});
    const errorClass = makeClass('Error', {});
    errorClass.superClass = throwable;
    const exceptionClass = makeClass('Exception', {});
    exceptionClass.superClass = throwable;
    const runtimeClass = makeClass('RuntimeException', {});
    runtimeClass.superClass = exceptionClass;

    const simpleException = (name, parent) => {
        const c = makeClass(name, {});
        c.superClass = parent;
        return c;
    };
    // Throwable: constructor con mensaje y los accesores que usan las misiones.
    const throwableCtor = (base) => {
        base.natives.set('__construct/#', (argv) => {
            const obj = new JavaObject(base, {});
            if (argv[0] !== undefined && argv[0] !== null) obj.set('message', 'String', String(argv[0]));
            return obj;
        });
    };
    for (const base of [throwable, errorClass, exceptionClass, runtimeClass]) throwableCtor(base);
    simpleException('IllegalArgumentException', runtimeClass);
    simpleException('IllegalStateException', runtimeClass);
    simpleException('NullPointerException', runtimeClass);
    simpleException('ArithmeticException', runtimeClass);
    simpleException('NumberFormatException', classes.get('IllegalArgumentException'));
    simpleException('IndexOutOfBoundsException', runtimeClass);
    simpleException('ArrayIndexOutOfBoundsException', classes.get('IndexOutOfBoundsException'));
    simpleException('StringIndexOutOfBoundsException', classes.get('IndexOutOfBoundsException'));
    simpleException('ClassCastException', runtimeClass);
    simpleException('UnsupportedOperationException', runtimeClass);
    simpleException('NegativeArraySizeException', runtimeClass);
    simpleException('NoSuchElementException', runtimeClass);
    simpleException('ClassNotFoundException', exceptionClass);
    simpleException('StackOverflowError', errorClass);
    simpleException('OutOfMemoryError', errorClass);
    for (const c of classes.values()) if (c.isSubclassOf(throwable)) throwableCtor(c);
    def(throwable, 'getMessage', 0, (argv) => {
        const cell = argv[0] && argv[0].fields ? argv[0].fields.get('message') : null;
        return cell ? cell.v : null;
    });
    def(throwable, 'getLocalizedMessage', 0, (argv, ctx) => {
        const cell = argv[0] && argv[0].fields ? argv[0].fields.get('message') : null;
        return cell ? cell.v : null;
    });
    def(throwable, 'toString', 0, (argv) => {
        const name = argv[0] && argv[0].cls ? argv[0].cls.name : 'Throwable';
        const cell = argv[0] && argv[0].fields ? argv[0].fields.get('message') : null;
        return cell && cell.v ? `${name}: ${cell.v}` : name;
    });
    def(throwable, 'printStackTrace', 0, (argv, ctx) => {
        const name = argv[0] && argv[0].cls ? argv[0].cls.name : 'Throwable';
        const cell = argv[0] && argv[0].fields ? argv[0].fields.get('message') : null;
        host.err.write((cell && cell.v ? `${name}: ${cell.v}` : name) + LINE_SEP);
    });
    def(throwable, 'getCause', 0, (argv) => {
        const cell = argv[0] && argv[0].fields ? argv[0].fields.get('cause') : null;
        return cell ? cell.v : null;
    });
    def(throwable, 'initCause', 1, (argv) => { argv[0].set('cause', 'Throwable', argv[1]); return argv[0]; });

    /* ---------------- Colecciones ---------------- */
    // La carga Ãºtil vive en `obj.native`: `items` para listas y conjuntos, `entries`
    // para mapas. El iterador de for-each del motor lee esas mismas listas.
    const newCollection = (cls, kind, immutable) => {
        const obj = new JavaObject(cls, {});
        obj.native = kind === 'map' ? { kind, entries: new Map() } : { kind, items: [], immutable: !!immutable };
        return obj;
    };
    // List.of(...) y Set.of(...) crean colecciones inmutables: cualquier mutaciÃ³n
    // lanza UnsupportedOperationException sin mensaje, igual que en el JDK.
    const notMutable = (obj) => {
        if (obj && obj.native && obj.native.immutable) {
            host.throwJava('UnsupportedOperationException');
        }
    };
    const immutableOf = (cls, kind, values) => {
        const obj = newCollection(cls, kind, true);
        if (kind === 'set') {
            for (const v of values) if (!obj.native.items.some((x) => sameValue(x, v))) obj.native.items.push(v);
        } else {
            obj.native.items = values.slice();
        }
        return obj;
    };
    const itemsOf = (obj) => {
        if (!obj || !obj.native) host.throwJava('NullPointerException', 'no se puede usar una colecciÃ³n nula');
        if (!Array.isArray(obj.native.items)) host.throwJava('NullPointerException', 'no es una colecciÃ³n iterable');
        return obj.native.items;
    };
    const entriesOf = (obj) => {
        if (!obj || !obj.native || !obj.native.entries) {
            host.throwJava('NullPointerException', 'no es un mapa');
        }
        return obj.native.entries;
    };
    const isObj = (v) => v instanceof JavaObject;
    const sameValue = (a, b) => (isObj(a) && isObj(b) ? a === b : a === b || String(a) === String(b));
    const listToString = (obj) => {
        const items = itemsOf(obj);
        return '[' + items.map((v) => (v === null ? 'null' : toJavaString(v, null))).join(', ') + ']';
    };
    const setToString = (obj) => {
        const items = itemsOf(obj);
        return '[' + items.map((v) => (v === null ? 'null' : toJavaString(v, null))).join(', ') + ']';
    };
    const mapToString = (obj) => {
        const parts = [];
        for (const [k, v] of entriesOf(obj)) {
            parts.push(`${toJavaString(k, null)}=${v === null ? 'null' : toJavaString(v, null)}`);
        }
        return '{' + parts.join(', ') + '}';
    };

    const listClass = makeClass('ArrayList', { kind: 'class' });
    const listIface = makeClass('List', { kind: 'interface' });
    listClass.interfaces = [listIface];
    listIface.superClass = objectClass;
    classes.set('List', listIface);
    classes.set('ArrayList', listClass);
    classes.set('LinkedList', listClass);

    listClass.natives.set('__construct/#', (argv) => {
        // new ArrayList<>(coleccion) copia los elementos; new ArrayList<>() arranca vacÃ­a.
        const obj = newCollection(listClass, 'list');
        const src = argv && argv[0];
        if (src && src.native && Array.isArray(src.native.items)) obj.native.items = src.native.items.slice();
        else if (src && src.native && Array.isArray(src.native.elements)) obj.native.items = src.native.elements.slice();
        return obj;
    });
    listIface.natives.set('of/#', (argv) => immutableOf(listClass, 'list', argv || []));
    listIface.nativeReturns.set('of/#', 'List');
    for (let n = 1; n <= 2; n++) {
        def(listClass, 'add', n, (argv) => {
            notMutable(argv[0]);
            if (n === 2) itemsOf(argv[0]).splice(argv[1], 0, argv[2]);
            else itemsOf(argv[0]).push(argv[1]);
            return n === 2 ? null : true;
        });
    }
    listClass.natives.set('add/#', (argv) => { notMutable(argv[0]); itemsOf(argv[0]).push(argv[1]); return true; });
    def(listClass, 'get', 1, (argv) => {
        const items = itemsOf(argv[0]);
        const i = argv[1];
        if (i < 0 || i >= items.length) host.throwJava('IndexOutOfBoundsException', `Index ${i} out of bounds for length ${items.length}`);
        return items[i];
    });
    def(listClass, 'set', 2, (argv) => {
        notMutable(argv[0]);
        const items = itemsOf(argv[0]);
        const i = argv[1];
        if (i < 0 || i >= items.length) host.throwJava('IndexOutOfBoundsException', `Index ${i} out of bounds for length ${items.length}`);
        const old = items[i];
        items[i] = argv[2];
        return old;
    });
    def(listClass, 'remove', 1, (argv, ctx) => {
        notMutable(argv[0]);
        const items = itemsOf(argv[0]);
        if (ctx && ctx.types && ctx.types[1] === 'int') {
            if (argv[1] < 0 || argv[1] >= items.length) host.throwJava('IndexOutOfBoundsException', `Index ${argv[1]} out of bounds for length ${items.length}`);
            return items.splice(argv[1], 1)[0];
        }
        const i = items.findIndex((v) => sameValue(v, argv[1]));
        if (i < 0) return false;
        items.splice(i, 1);
        return true;
    });
    def(listClass, 'size', 0, (argv) => itemsOf(argv[0]).length);
    def(listClass, 'isEmpty', 0, (argv) => itemsOf(argv[0]).length === 0);
    def(listClass, 'contains', 1, (argv) => itemsOf(argv[0]).some((v) => sameValue(v, argv[1])));
    def(listClass, 'indexOf', 1, (argv) => itemsOf(argv[0]).findIndex((v) => sameValue(v, argv[1])));
    def(listClass, 'lastIndexOf', 1, (argv) => {
        const items = itemsOf(argv[0]);
        for (let i = items.length - 1; i >= 0; i--) if (sameValue(items[i], argv[1])) return i;
        return -1;
    });
    def(listClass, 'clear', 0, (argv) => { notMutable(argv[0]); itemsOf(argv[0]).length = 0; return null; });
    def(listClass, 'addAll', 1, (argv) => {
        notMutable(argv[0]);
        const target = itemsOf(argv[0]);
        for (const v of itemsOf(argv[1])) target.push(v);
        return true;
    });
    def(listClass, 'toString', 0, (argv) => listToString(argv[0]));
    def(listClass, 'equals', 1, (argv) => {
        if (!argv[1] || !Array.isArray(argv[1].native && argv[1].native.items)) return false;
        const a = itemsOf(argv[0]); const b = argv[1].native.items;
        return a.length === b.length && a.every((v, i) => sameValue(v, b[i]));
    });
    def(listClass, 'hashCode', 0, (argv) => itemsOf(argv[0]).length);
    ret(listClass, 'add', 1, 'boolean');
    ret(listClass, 'size', 0, 'int');
    ret(listClass, 'isEmpty', 0, 'boolean');
    ret(listClass, 'contains', 1, 'boolean');
    ret(listClass, 'indexOf', 1, 'int');
    ret(listClass, 'remove', 1, 'boolean');
    ret(listClass, 'toString', 0, 'String');
    ret(listClass, 'hashCode', 0, 'int');
    ret(listClass, 'equals', 1, 'boolean');

    const setClass = makeClass('HashSet', { kind: 'class' });
    const setIface = makeClass('Set', { kind: 'interface' });
    setClass.interfaces = [setIface];
    setIface.superClass = objectClass;
    classes.set('Set', setIface);
    classes.set('HashSet', setClass);
    classes.set('LinkedHashSet', setClass);
    setClass.natives.set('__construct/#', (argv) => {
        const obj = newCollection(setClass, 'set');
        const src = argv && argv[0];
        if (src && src.native && Array.isArray(src.native.items)) {
            for (const v of src.native.items) if (!obj.native.items.some((x) => sameValue(x, v))) obj.native.items.push(v);
        }
        return obj;
    });
    setIface.natives.set('of/#', (argv) => immutableOf(setClass, 'set', argv || []));
    setIface.nativeReturns.set('of/#', 'Set');
    def(setClass, 'add', 1, (argv) => {
        notMutable(argv[0]);
        const items = itemsOf(argv[0]);
        if (items.some((v) => sameValue(v, argv[1]))) return false;
        items.push(argv[1]);
        return true;
    });
    def(setClass, 'remove', 1, (argv) => {
        notMutable(argv[0]);
        const items = itemsOf(argv[0]);
        const i = items.findIndex((v) => sameValue(v, argv[1]));
        if (i < 0) return false;
        items.splice(i, 1);
        return true;
    });
    def(setClass, 'contains', 1, (argv) => itemsOf(argv[0]).some((v) => sameValue(v, argv[1])));
    def(setClass, 'size', 0, (argv) => itemsOf(argv[0]).length);
    def(setClass, 'isEmpty', 0, (argv) => itemsOf(argv[0]).length === 0);
    def(setClass, 'clear', 0, (argv) => { notMutable(argv[0]); itemsOf(argv[0]).length = 0; return null; });
    def(setClass, 'addAll', 1, (argv) => {
        notMutable(argv[0]);
        const target = itemsOf(argv[0]);
        for (const v of itemsOf(argv[1])) if (!target.some((x) => sameValue(x, v))) target.push(v);
        return true;
    });
    def(setClass, 'toString', 0, (argv) => setToString(argv[0]));
    def(setClass, 'hashCode', 0, (argv) => itemsOf(argv[0]).length);
    ret(setClass, 'add', 1, 'boolean');
    ret(setClass, 'remove', 1, 'boolean');
    ret(setClass, 'contains', 1, 'boolean');
    ret(setClass, 'size', 0, 'int');
    ret(setClass, 'isEmpty', 0, 'boolean');
    ret(setClass, 'toString', 0, 'String');
    ret(setClass, 'hashCode', 0, 'int');

    const mapClass = makeClass('HashMap', { kind: 'class' });
    const mapIface = makeClass('Map', { kind: 'interface' });
    mapClass.interfaces = [mapIface];
    mapIface.superClass = objectClass;
    classes.set('Map', mapIface);
    classes.set('HashMap', mapClass);
    classes.set('LinkedHashMap', mapClass);
    classes.set('TreeMap', mapClass);

    const entryClass = makeClass('Entry', { kind: 'interface' });
    entryClass.interfaces = [mapIface];
    classes.set('Entry', entryClass);
    def(entryClass, 'getKey', 0, (argv) => argv[0].native.key);
    def(entryClass, 'getValue', 0, (argv) => argv[0].native.value);
    def(entryClass, 'setValue', 1, (argv) => {
        argv[0].native.value = argv[1];
        return null;
    });
    def(entryClass, 'toString', 0, (argv) => `${toJavaString(argv[0].native.key, null)}=${toJavaString(argv[0].native.value, null)}`);
    ret(entryClass, 'getKey', 0, 'Object');
    ret(entryClass, 'getValue', 0, 'Object');

    const entryOf = (k, v) => {
        const e = new JavaObject(entryClass, {});
        e.native = { kind: 'entry', key: k, value: v };
        return e;
    };
    mapClass.natives.set('__construct/#', (argv) => newCollection(mapClass, 'map'));
    def(mapClass, 'put', 2, (argv) => {
        const entries = entriesOf(argv[0]);
        for (const [k, v] of entries) {
            if (sameValue(k, argv[1])) { entries.set(k, argv[2]); return v === undefined ? null : v; }
        }
        entries.set(argv[1], argv[2]);
        return null;
    });
    def(mapClass, 'get', 1, (argv) => {
        const entries = entriesOf(argv[0]);
        for (const [k, v] of entries) if (sameValue(k, argv[1])) return v;
        return null;
    });
    def(mapClass, 'getOrDefault', 2, (argv) => {
        const entries = entriesOf(argv[0]);
        for (const [k, v] of entries) if (sameValue(k, argv[1])) return v;
        return argv[2];
    });
    def(mapClass, 'containsKey', 1, (argv) => {
        for (const k of entriesOf(argv[0]).keys()) if (sameValue(k, argv[1])) return true;
        return false;
    });
    def(mapClass, 'containsValue', 1, (argv) => {
        for (const v of entriesOf(argv[0]).values()) if (sameValue(v, argv[1])) return true;
        return false;
    });
    def(mapClass, 'remove', 1, (argv) => {
        const entries = entriesOf(argv[0]);
        for (const [k, v] of entries) {
            if (sameValue(k, argv[1])) { entries.delete(k); return v; }
        }
        return null;
    });
    def(mapClass, 'size', 0, (argv) => entriesOf(argv[0]).size);
    def(mapClass, 'isEmpty', 0, (argv) => entriesOf(argv[0]).size === 0);
    def(mapClass, 'clear', 0, (argv) => { entriesOf(argv[0]).clear(); return null; });
    def(mapClass, 'keySet', 0, (argv) => {
        const set = newCollection(setClass, 'set');
        set.native.items = [...entriesOf(argv[0]).keys()];
        return set;
    });
    def(mapClass, 'values', 0, (argv) => {
        const list = newCollection(listClass, 'list');
        list.native.items = [...entriesOf(argv[0]).values()];
        return list;
    });
    def(mapClass, 'entrySet', 0, (argv) => {
        const set = newCollection(setClass, 'set');
        set.native.items = [...entriesOf(argv[0])].map(([k, v]) => entryOf(k, v));
        return set;
    });
    def(mapClass, 'toString', 0, (argv) => mapToString(argv[0]));
    ret(mapClass, 'get', 1, 'Object');
    ret(mapClass, 'containsKey', 1, 'boolean');
    ret(mapClass, 'containsValue', 1, 'boolean');
    ret(mapClass, 'size', 0, 'int');
    ret(mapClass, 'isEmpty', 0, 'boolean');
    ret(mapClass, 'toString', 0, 'String');

    const arraysClass = makeClass('Arrays', {});
    const cmpDefault = (a, b) => (a < b ? -1 : (a > b ? 1 : 0));
    /** Convierte un Comparator en una funciÃ³n de orden. */
    const cmpFrom = (obj) => {
        if (!obj || !obj.native) return null;
        return (a, b) => Number(host.callMethod(obj, 'compare', [a, b]));
    };
    const sortArray = (arr, cmp) => {
        const els = arr && arr.native && Array.isArray(arr.native.elements) ? arr.native.elements : arr;
        if (!Array.isArray(els)) host.throwJava('NullPointerException', 'null');
        els.sort(cmp || cmpDefault);
        return null;
    };
    def(arraysClass, 'sort', 1, (argv) => sortArray(argv[0], null));
    def(arraysClass, 'sort', 2, (argv) => sortArray(argv[0], cmpFrom(argv[1])));
    def(arraysClass, 'toString', 1, (argv) => {
        const els = argv[0] && argv[0].native && Array.isArray(argv[0].native.elements) ? argv[0].native.elements : argv[0];
        if (!Array.isArray(els)) return 'null';
        return '[' + els.map((v) => (typeof v === 'string' ? v : toJavaString(v, null))).join(', ') + ']';
    });
    def(arraysClass, 'fill', 2, (argv) => {
        const arr = argv[0];
        const els = arr && arr.native && Array.isArray(arr.native.elements) ? arr.native.elements : arr;
        if (!Array.isArray(els)) host.throwJava('NullPointerException', 'null');
        for (let i = 0; i < els.length; i++) els[i] = argv[1];
        return null;
    });
    def(arraysClass, 'copyOf', 2, (argv) => {
        const arr = argv[0];
        const els = arr && arr.native && Array.isArray(arr.native.elements) ? arr.native.elements : arr;
        if (!Array.isArray(els)) host.throwJava('NullPointerException', 'null');
        const copy = els.slice(0, argv[1]);
        const filler = els.length ? els[els.length - 1] : 0;
        while (copy.length < argv[1]) copy.push(filler);
        return host.newArray('Object', copy);
    });
    def(arraysClass, 'binarySearch', 2, (argv) => {
        const arr = argv[0];
        const els = arr && arr.native && Array.isArray(arr.native.elements) ? arr.native.elements : arr;
        if (!Array.isArray(els)) host.throwJava('NullPointerException', 'null');
        let lo = 0; let hi = els.length - 1;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (cmpDefault(els[mid], argv[1]) < 0) lo = mid + 1;
            else if (cmpDefault(els[mid], argv[1]) > 0) hi = mid - 1;
            else return mid;
        }
        return -(lo + 1);
    });
    ret(arraysClass, 'sort', 1, 'void');
    ret(arraysClass, 'toString', 1, 'String');
    ret(arraysClass, 'fill', 2, 'void');
    ret(arraysClass, 'copyOf', 2, 'Object[]');
    ret(arraysClass, 'binarySearch', 2, 'int');

    const collectionsClass = makeClass('Collections', {});
    def(collectionsClass, 'sort', 1, (argv) => {
        const items = itemsOf(argv[0]);
        items.sort(cmpDefault);
        return null;
    });
    def(collectionsClass, 'reverse', 1, (argv) => { itemsOf(argv[0]).reverse(); return null; });
    def(collectionsClass, 'max', 1, (argv) => itemsOf(argv[0]).reduce((a, b) => (cmpDefault(b, a) > 0 ? b : a), null));
    def(collectionsClass, 'min', 1, (argv) => itemsOf(argv[0]).reduce((a, b) => (a === null || cmpDefault(b, a) < 0 ? b : a), null));
    def(collectionsClass, 'unmodifiableList', 1, (argv) => argv[0]);
    def(collectionsClass, 'emptyList', 0, () => newCollection(listClass, 'list'));
    ret(collectionsClass, 'sort', 1, 'void');
    ret(collectionsClass, 'reverse', 1, 'void');
    ret(collectionsClass, 'max', 1, 'Object');
    ret(collectionsClass, 'min', 1, 'Object');

    /* ---------------- System y PrintStream ---------------- */
    const printStream = makeClass('PrintStream', {});
    const print = (argv, ctx) => {
        if (argv.length === 0) { host.write(LINE_SEP); return; }
        const parts = [];
        for (let i = 0; i < argv.length; i++) parts.push(text(argv[i], ctx.types[i]));
        host.write(parts.join(' ') + LINE_SEP);
    };
    def(printStream, 'println', 0, (argv, ctx) => print(argv, ctx));
    for (let n = 1; n <= 4; n++) def(printStream, 'println', n, (argv, ctx) => print(argv, ctx));
    // println/print son sobrecargados hasta con 4 argumentos en el subconjunto, pero
    // el comodÃ­n cubre cualquier aridad como hace el varargs de java.io.PrintStream.
    printStream.natives.set('println/#', (argv, ctx) => print(argv, ctx));
    const printNoNl = (argv, ctx) => {
        const parts = [];
        for (let i = 0; i < argv.length; i++) parts.push(text(argv[i], ctx.types[i]));
        host.write(parts.join(' '));
    };
    for (let n = 1; n <= 4; n++) def(printStream, 'print', n, (argv, ctx) => printNoNl(argv, ctx));
    printStream.natives.set('print/#', (argv, ctx) => printNoNl(argv, ctx));
    printStream.natives.set('printf/#', (argv, ctx) => host.write(javaFormat(String(argv[0]), argv.slice(1), formatArgs(argv.slice(1), (ctx.types || []).slice(1)))));
    def(printStream, 'write', 1, (argv) => host.write(text(argv[0], null)));
    def(printStream, 'flush', 0, () => { });
    def(printStream, 'close', 0, () => { });

    const systemClass = makeClass('System', {});
    const stdout = new JavaObject(printStream, {});
    const stderr = new JavaObject(printStream, {});
    field(systemClass, 'out', 'PrintStream', stdout);
    field(systemClass, 'err', 'PrintStream', stderr);
    field(systemClass, 'in', 'Object', null);
    def(systemClass, 'currentTimeMillis', 0, () => 0);
    def(systemClass, 'nanoTime', 0, () => 0);
    def(systemClass, 'lineSeparator', 0, () => LINE_SEP);
    def(systemClass, 'getProperty', 1, (argv) => (argv[0] === 'line.separator' ? LINE_SEP : null));
    def(systemClass, 'exit', 0, () => { });

    /* ---------------- Envoltorios con instancia (Integer, Double, ...) ---------------- */
    // El motor no materializa wrappers: int/double son primitivos. Estos mÃ©todos cubren
    // el uso habitual deinstanceof/equals sobre tipos numÃ©ricos.
    for (const [clsName, prim] of [['Integer', 'int'], ['Long', 'long'], ['Double', 'double'], ['Float', 'float'], ['Short', 'short'], ['Byte', 'byte']]) {
        const c = classes.get(clsName);
        if (!c) continue;
        def(c, 'equals', 1, (argv) => argv[0] === argv[1]);
        def(c, 'compareTo', 1, (argv) => (argv[0] < argv[1] ? -1 : (argv[0] > argv[1] ? 1 : 0)));
        def(c, 'toString', 0, (argv, ctx) => toJavaString(argv[0], ctx.types[0] || prim));
        def(c, 'hashCode', 0, (argv) => Math.trunc(argv[0]) | 0);
    }
    classes.get('Boolean').natives.set('equals/1', (argv) => argv[0] === argv[1]);
    classes.get('Boolean').natives.set('toString/0', (argv) => String(argv[0]));

    /* ---------------- Tipos de retorno de los mÃ©todos nativos ---------------- */
    // Sin esto el motor no sabe que charAt devuelve char y lo imprimirÃ­a como nÃºmero.
    ret(stringClass, 'length', 0, 'int');
    ret(stringClass, 'charAt', 1, 'char');
    ret(stringClass, 'indexOf', 1, 'int');
    ret(stringClass, 'indexOf', 2, 'int');
    ret(stringClass, 'lastIndexOf', 1, 'int');
    ret(stringClass, 'compareTo', 1, 'int');
    ret(stringClass, 'compareToIgnoreCase', 1, 'int');
    ret(stringClass, 'hashCode', 0, 'int');
    ret(stringClass, 'isEmpty', 0, 'boolean');
    ret(stringClass, 'isBlank', 0, 'boolean');
    ret(stringClass, 'contains', 1, 'boolean');
    ret(stringClass, 'startsWith', 1, 'boolean');
    ret(stringClass, 'endsWith', 1, 'boolean');
    ret(stringClass, 'equals', 1, 'boolean');
    ret(stringClass, 'equalsIgnoreCase', 1, 'boolean');
    ret(stringClass, 'matches', 1, 'boolean');
    ret(stringClass, 'split', 1, 'String[]');
    ret(stringClass, 'split', 2, 'String[]');
    ret(stringClass, 'substring', 1, 'String');
    ret(stringClass, 'substring', 2, 'String');
    ret(stringClass, 'toUpperCase', 0, 'String');
    ret(stringClass, 'toLowerCase', 0, 'String');
    ret(stringClass, 'trim', 0, 'String');
    ret(stringClass, 'strip', 0, 'String');
    ret(stringClass, 'stripLeading', 0, 'String');
    ret(stringClass, 'stripTrailing', 0, 'String');
    ret(stringClass, 'concat', 1, 'String');
    ret(stringClass, 'repeat', 1, 'String');
    ret(stringClass, 'replace', 2, 'String');
    ret(stringClass, 'replaceAll', 2, 'String');
    ret(stringClass, 'toString', 0, 'String');
    ret(stringClass, 'valueOf', 1, 'String');
    ret(stringClass, 'formatted', '#', 'String');
    ret(stringClass, 'intern', 0, 'String');

    ret(sbClass, 'toString', 0, 'String');
    ret(sbClass, 'length', 0, 'int');
    ret(sbClass, 'charAt', 1, 'char');
    ret(sbClass, 'indexOf', 1, 'int');
    ret(sbClass, 'append', '#', 'StringBuilder');
    ret(sbClass, 'insert', 2, 'StringBuilder');
    ret(sbClass, 'reverse', 0, 'StringBuilder');
    ret(sbClass, 'deleteCharAt', 1, 'StringBuilder');
    ret(sbClass, 'setLength', 1, 'void');

    for (const n of ['sqrt', 'cbrt', 'pow', 'floor', 'ceil', 'log', 'log10', 'exp',
        'sin', 'cos', 'tan', 'atan', 'atan2', 'hypot', 'random']) {
        ret(mathClass, n, '#', 'double');
    }
    // Math.round(double) devuelve long, igual que floor/ceil para valores enteros.
    ret(mathClass, 'round', 1, 'long');
    ret(mathClass, 'rint', 1, 'double');
    ret(mathClass, 'abs', 1, 'int');
    ret(mathClass, 'max', 2, 'int');
    ret(mathClass, 'min', 2, 'int');
    ret(mathClass, 'signum', 1, 'int');
    ret(mathClass, 'toIntExact', 1, 'int');
    ret(mathClass, 'floorDiv', 2, 'int');
    ret(mathClass, 'floorMod', 2, 'int');
    ret(mathClass, 'addExact', 2, 'int');
    ret(mathClass, 'subtractExact', 2, 'int');
    ret(mathClass, 'multiplyExact', 2, 'int');

    ret(intClass, 'parseInt', 1, 'int');
    ret(intClass, 'parseInt', 2, 'int');
    ret(intClass, 'valueOf', 1, 'Integer');
    ret(intClass, 'toString', 1, 'String');
    ret(intClass, 'toBinaryString', 1, 'String');
    ret(intClass, 'toHexString', 1, 'String');
    ret(intClass, 'toOctalString', 1, 'String');
    ret(intClass, 'compare', 2, 'int');
    ret(intClass, 'sum', 2, 'int');
    ret(intClass, 'max', 2, 'int');
    ret(intClass, 'min', 2, 'int');
    ret(intClass, 'bitCount', 1, 'int');

    ret(longClass, 'parseLong', 1, 'long');
    ret(longClass, 'valueOf', 1, 'Long');
    ret(longClass, 'toString', 1, 'String');
    ret(longClass, 'toBinaryString', 1, 'String');
    ret(longClass, 'toHexString', 1, 'String');
    ret(longClass, 'compare', 2, 'int');
    ret(longClass, 'sum', 2, 'long');
    ret(longClass, 'max', 2, 'long');
    ret(longClass, 'min', 2, 'long');

    ret(doubleClass, 'parseDouble', 1, 'double');
    ret(doubleClass, 'valueOf', 1, 'Double');
    ret(doubleClass, 'isNaN', 1, 'boolean');
    ret(doubleClass, 'compare', 2, 'int');
    ret(doubleClass, 'toString', 1, 'String');
    ret(doubleClass, 'doubleToLongBits', 1, 'long');
    ret(floatClass, 'parseFloat', 1, 'float');
    ret(floatClass, 'toString', 1, 'String');

    ret(booleanClass, 'parseBoolean', 1, 'boolean');
    ret(booleanClass, 'valueOf', 1, 'Boolean');
    ret(booleanClass, 'toString', 1, 'String');
    ret(booleanClass, 'compare', 2, 'int');

    ret(charClass, 'isDigit', 1, 'boolean');
    ret(charClass, 'isLetter', 1, 'boolean');
    ret(charClass, 'isLetterOrDigit', 1, 'boolean');
    ret(charClass, 'isUpperCase', 1, 'boolean');
    ret(charClass, 'isLowerCase', 1, 'boolean');
    ret(charClass, 'isWhitespace', 1, 'boolean');
    ret(charClass, 'isAlphabetic', 1, 'boolean');
    ret(charClass, 'toUpperCase', 1, 'char');
    ret(charClass, 'toLowerCase', 1, 'char');
    ret(charClass, 'charValue', 0, 'char');
    ret(charClass, 'getNumericValue', 1, 'int');
    ret(charClass, 'toString', 1, 'String');
    ret(charClass, 'compare', 2, 'int');
    ret(charClass, 'digit', 2, 'int');
    ret(charClass, 'forDigit', 2, 'char');

    ret(throwable, 'getMessage', 0, 'String');
    ret(throwable, 'getLocalizedMessage', 0, 'String');
    ret(throwable, 'toString', 0, 'String');
    ret(throwable, 'getCause', 0, 'Throwable');
    ret(objectClass, 'toString', 0, 'String');
    ret(objectClass, 'equals', 1, 'boolean');
    ret(objectClass, 'hashCode', 0, 'int');

    /* ---------------- EnumeraciÃ³n de clases disponibles ---------------- */
    return {
        classes,
        exceptionClass,
        objectClass,
        stringClass,
        lineSeparator: LINE_SEP
    };
}

/* String.split con semÃ¡ntica de Java: regex, lÃ­mite opcional y sin cadenas vacÃ­as al final. */
function javaSplit(text, regex, limit) {
    const parts = text.split(toJsRegExp(regex));
    if (limit > 0) return parts.slice(0, limit);
    const out = parts.slice();
    while (out.length && out[out.length - 1] === '') out.pop();
    return out;
}

/* Integer.parseInt / Long.parseLong con las excepciones de Java. */
function parseIntegral(host, value, type, radix) {
    const bad = (text) => host.throwJava('NumberFormatException', `For input string: "${text}"`);
    const text = String(value).trim();
    const base = radix === undefined ? 10 : radix;
    if (text === '' || !/^[+-]?[0-9a-zA-Z]+$/.test(text)) bad(text);
    const negative = text[0] === '-';
    const body = /^[+-]/.test(text) ? text.slice(1) : text;
    if (radix === 10 && !/^\d+$/.test(body)) bad(text);
    if (base < 2 || base > 36) throw new Error(`radix fuera de rango: ${base}`);
    const n = parseInt(body, base);
    if (Number.isNaN(n)) bad(text);
    if (base === 10 && type === 'int' && (n > 2147483647 || n < -2147483648)) bad(text);
    return negative ? -n : n;
}

function parseFloating(host, value) {
    const bad = (text) => host.throwJava('NumberFormatException', `For input string: "${text}"`);
    const text = String(value).trim();
    if (text === '' || !/^[+-]?((\d+\.?\d*)|(\.\d+))([eE][+-]?\d+)?[fFdD]?$/.test(text)) bad(text);
    const n = Number(text.replace(/[fFdD]$/, ''));
    if (Number.isNaN(n)) bad(text);
    return n;
}
