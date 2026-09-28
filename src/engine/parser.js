/* Analizador sintáctico descendente recursivo para el subconjunto de Java 17.
   Convierte los tokens en un AST que el intérprete evalúa. */

import { tokenize, isPrimitiveType } from './lexer.js';
import { JavaCompileError } from './errors.js';

const MODIFIERS = new Set([
    'public', 'private', 'protected', 'static', 'final', 'abstract', 'synchronized',
    'native', 'transient', 'volatile', 'strictfp', 'default'
]);

const ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=', '>>>=']);

/* Tipos de java.lang/java.util que usamos: sirven para desambiguar casts y declaraciones. */
const KNOWN_TYPES = new Set([
    'String', 'Object', 'Integer', 'Long', 'Double', 'Float', 'Short', 'Byte', 'Character', 'Boolean',
    'Number', 'Math', 'System', 'StringBuilder', 'CharSequence', 'Class', 'Exception', 'RuntimeException',
    'IllegalArgumentException', 'IllegalStateException', 'NullPointerException', 'ArithmeticException',
    'NumberFormatException', 'IndexOutOfBoundsException', 'ArrayIndexOutOfBoundsException',
    'StringIndexOutOfBoundsException', 'ClassCastException', 'UnsupportedOperationException',
    'List', 'ArrayList', 'LinkedList', 'Map', 'HashMap', 'LinkedHashMap', 'TreeMap', 'Set', 'HashSet',
    'LinkedHashSet', 'TreeSet', 'Collection', 'Collections', 'Arrays', 'Objects', 'Comparator', 'Optional',
    'Stream', 'IntStream', 'LongStream', 'DoubleStream', 'Iterable', 'Iterator', 'Function', 'Predicate',
    'Consumer', 'Supplier', 'BiFunction', 'UnaryOperator', 'BinaryOperator', 'Runnable', 'Entry',
    'Thread', 'Runnable', 'StringJoiner', 'Scanner'
]);

const FUNCTIONAL_SIMPLE = new Set([
    'Function', 'Predicate', 'Consumer', 'Supplier', 'UnaryOperator', 'BinaryOperator',
    'Comparator', 'ToIntFunction', 'ToLongFunction', 'ToDoubleFunction', 'Runnable'
]);

// Raíces de paquete: permiten continuar `java.util.ArrayList` como un solo nombre.
const PACKAGE_ROOTS = new Set(['java', 'javax', 'sun', 'jdk', 'com', 'org', 'net', 'io', 'edu']);

class Parser {
    constructor(source) {
        this.tokens = tokenize(source);
        this.pos = 0;
    }

    /* ---------- utilidades de token ---------- */
    peek(offset = 0) { return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)]; }
    next() { const t = this.tokens[this.pos]; if (this.pos < this.tokens.length - 1) this.pos++; return t; }
    at(type, value) {
        const t = this.peek();
        if (t.type !== type) return false;
        return value === undefined ? true : t.value === value;
    }
    atKw(...words) { const t = this.peek(); return t.type === 'keyword' && words.includes(t.value); }
    atOp(...ops) { const t = this.peek(); return t.type === 'op' && ops.includes(t.value); }
    eat(type, value) { if (this.at(type, value)) { return this.next(); } return null; }
    eatKw(...words) { if (this.atKw(...words)) return this.next(); return null; }
    eatOp(...ops) { if (this.atOp(...ops)) return this.next(); return null; }

    expect(type, value, what) {
        if (this.at(type, value)) return this.next();
        const t = this.peek();
        const found = t.type === 'eof' ? 'end of file' : `"${t.value}"`;
        throw new JavaCompileError(`${what || `expected '${value}'`}, found ${found}`, t.line, t.col);
    }
    expectKw(word) {
        if (this.atKw(word)) return this.next();
        const t = this.peek();
        const found = t.type === 'eof' ? 'end of file' : `"${t.value}"`;
        throw new JavaCompileError(`expected '${word}', found ${found}`, t.line, t.col);
    }
    expectOp(op) {
        if (this.atOp(op)) return this.next();
        const t = this.peek();
        const found = t.type === 'eof' ? 'end of file' : `"${t.value}"`;
        throw new JavaCompileError(`'${op}' expected`, t.line, t.col);
    }

    state() { return { pos: this.pos, tokens: this.tokens.slice(this.pos) }; }
    restore(s) { this.pos = s.pos; this.tokens.splice(this.pos, this.tokens.length, ...s.tokens); }

    /** Divide '>>', '>>>' o '>=' en un '>' para poder cerrar genéricos anidados. */
    /** Divide `>>`, `>>>`, `>=`… para poder cerrar los genéricos anidados. */
    splitGt() {
        const t = this.peek();
        if (t.type === 'op' && t.value.length > 1 && /^>+=?$/.test(t.value)) {
            t.value = t.value.slice(1);
            this.tokens.splice(this.pos, 0, { type: 'op', value: '>', line: t.line, col: t.col + 1 });
        }
    }

    /* ---------- tipos ---------- */
    isTypeNameToken(tok) {
        if (!tok) return false;
        if (tok.type === 'keyword' && isPrimitiveType(tok.value)) return true;
        if (tok.type !== 'ident') return false;
        return KNOWN_TYPES.has(tok.value) || /^[A-Z]/.test(tok.value) || PACKAGE_ROOTS.has(tok.value);
    }

    /** Nombre de tipopossibly cualificado: `ArrayList` o `java.util.ArrayList`. */
    parseTypeName() {
        let name = this.expect('ident', undefined, 'expected type name').value;
        while (this.atOp('.') && this.peek(1).type === 'ident' && this.continuesTypeName(name, this.peek(1).value)) {
            this.next();
            name += '.' + this.next().value;
        }
        return name;
    }

    /** Un segmento en minúsculas sólo se continúa si es la raíz de un paquete conocido. */
    continuesTypeName(current, next) {
        if (/^[A-Z]/.test(next)) return true;
        const root = current.split('.')[0];
        return PACKAGE_ROOTS.has(root);
    }

    parseTypeArgs() {
        if (!this.atOp('<')) return [];
        this.next();
        const args = [];
        if (this.atOp('>')) { this.splitGt(); this.next(); return args; }
        for (;;) {
            args.push(this.parseTypeRef(false));
            if (this.eatOp(',')) continue;
            if (this.atOp('>')) { this.splitGt(); this.next(); break; }
            if (this.atOp('>>') || this.atOp('>>>') || this.atOp('>=')) { this.splitGt(); this.next(); break; }
            const t = this.peek();
            throw new JavaCompileError("expected '>' to close type arguments", t.line, t.col);
        }
        return args;
    }

    /** Devuelve { name, args, dims, isVar, line, col }. */
    parseTypeRef(allowVar = true) {
        const start = this.peek();
        if (allowVar && this.atKw('var') && this.peek(1).type === 'ident') {
            this.next();
            return { name: 'var', args: [], dims: 0, isVar: true, line: start.line, col: start.col };
        }
        if (this.atKw('var') && allowVar && this.peek(1).type === 'ident') return this.parseTypeRef(false);
        if (!this.isTypeNameToken(this.peek())) {
            const t = this.peek();
            const found = t.type === 'eof' ? 'end of file' : `"${t.value}"`;
            throw new JavaCompileError('expected type, found ' + found, t.line, t.col);
        }
        if (this.peek().type === 'keyword') this.next();
        else this.next();

        let name = this.tokens[this.pos - 1].value;
        while (this.atOp('.') && this.peek(1).type === 'ident' && this.continuesTypeName(name, this.peek(1).value)) {
            this.next();
            name += '.' + this.next().value;
        }
        const args = this.parseTypeArgs();
        let dims = 0;
        while (this.atOp('[') && this.peek(1).type === 'op' && this.peek(1).value === ']') {
            this.next(); this.next(); dims++;
        }
        return { name, args, dims, isVar: false, line: start.line, col: start.col };
    }

    typeLabel(type) {
        let s = type.name + (type.args && type.args.length ? '<' + type.args.map((a) => this.typeLabel(a)).join(', ') + '>' : '');
        for (let i = 0; i < type.dims; i++) s += '[]';
        return s;
    }

    /* ---------- modificadores y anotaciones ---------- */
    /** Consume anotaciones @Anno y @Anno(args). Se descartan: no afectan a la evaluación. */
    parseAnnotations() {
        const found = [];
        while (this.atOp('@')) {
            this.next();
            const name = this.expect('ident', undefined, 'expected annotation name').value;
            if (this.atOp('(')) this.skipBalanced('(', ')');
            found.push(name);
        }
        return found;
    }

    skipBalanced(open, close) {
        this.expectOp(open);
        let depth = 1;
        while (depth > 0) {
            if (this.at('eof')) {
                const t = this.peek();
                throw new JavaCompileError(`'${close}' expected`, t.line, t.col);
            }
            if (this.atOp(open)) depth++;
            else if (this.atOp(close)) depth--;
            this.next();
        }
    }

    parseModifiers() {
        this.parseAnnotations();
        const mods = [];
        for (;;) {
            const t = this.peek();
            if (t.type === 'keyword' && MODIFIERS.has(t.value)) { mods.push(t.value); this.next(); continue; }
            if (t.type === 'keyword' && t.value === 'sealed') { mods.push('sealed'); this.next(); continue; }
            if (t.type === 'ident' && t.value === 'non' && this.peek(1).value === '-'
                && this.peek(2).type === 'ident' && this.peek(2).value === 'sealed') {
                this.next(); this.next(); this.next();
                mods.push('non-sealed');
                continue;
            }
            break;
        }
        return mods;
    }

    /* ---------- unidad de compilación ---------- */
    parseCompilationUnit() {
        const unit = { packageName: null, imports: [], types: [] };
        while (this.atKw('package')) {
            this.next();
            unit.packageName = this.parseTypeName();
            this.expectOp(';');
        }
        while (this.atKw('import')) {
            this.next();
            let name = '';
            if (this.atOp('*')) { this.next(); name = '*'; } else {
                name = this.parseTypeName();
                if (this.eatOp('.')) { this.next(); name += '.*'; }
            }
            unit.imports.push(name);
            this.expectOp(';');
        }
        while (!this.at('eof')) {
            const decl = this.parseTypeDecl();
            if (decl) unit.types.push(decl);
        }
        if (unit.types.length === 0) {
            // Como javac, una unidad vacía (solo comentarios o espacios) es válida.
            const t = this.peek();
            if (this.at('eof') && !unit.packageName && unit.imports.length === 0) return unit;
            throw new JavaCompileError('class, interface, enum, or record expected', t.line, t.col);
        }
        return unit;
    }

    parseTypeDecl() {
        const start = this.peek();
        const mods = this.parseModifiers();

        if (this.atKw('class')) return this.parseClassDecl(mods, start, 'class');
        if (this.atKw('interface')) return this.parseClassDecl(mods, start, 'interface');
        if (this.atKw('enum')) return this.parseEnumDecl(mods, start);
        if (this.atKw('record') && this.peek(1).type === 'ident') return this.parseRecordDecl(mods, start);
        if (this.at('eof')) return null;

        const t = this.peek();
        const found = t.type === 'eof' ? 'end of file' : `"${t.value}"`;
        throw new JavaCompileError(`class, interface, enum, or record expected, found ${found}`, t.line, t.col);
    }

    parseClassDecl(mods, start, kind) {
        this.next(); // class | interface
        const name = this.expect('ident', undefined, 'expected class name').value;
        const typeParams = this.parseTypeParams();
        let superName = null;
        const interfaces = [];
        if (this.atKw('extends')) {
            this.next();
            const list = [this.parseTypeRef(false)];
            while (this.eatOp(',')) list.push(this.parseTypeRef(false));
            if (kind === 'interface') interfaces.push(...list);
            else superName = list[0];
        }
        if (this.atKw('implements')) {
            this.next();
            interfaces.push(this.parseTypeRef(false));
            while (this.eatOp(',')) interfaces.push(this.parseTypeRef(false));
        }
        if (this.atKw('permits')) {
            this.next();
            this.parseTypeRef(false);
            while (this.eatOp(',')) this.parseTypeRef(false);
        }
        const body = this.parseBodyWithName(name, kind, null);
        return {
            kind, name, modifiers: mods, typeParams, superName, interfaces,
            fields: body.fields, methods: body.methods, staticInit: body.staticInit, line: start.line, col: start.col
        };
    }

    /** Analiza el cuerpo de un tipo garantizando que los constructores se detecten bien. */
    parseBodyWithName(name, kind, recordComponents) {
        const previous = this.currentTypeName;
        this.currentTypeName = name;
        try {
            return this.parseClassBody(kind, recordComponents);
        } finally {
            this.currentTypeName = previous;
        }
    }

    /** Igual que parseBodyWithName pero el cuerpo ya está abierto (llamado desde parseEnumDecl). */
    parseMembersWithName(name, kind, recordComponents) {
        const previous = this.currentTypeName;
        this.currentTypeName = name;
        try {
            return this.parseClassBodyMembers(kind, recordComponents);
        } finally {
            this.currentTypeName = previous;
        }
    }

    parseTypeParams() {
        if (!this.atOp('<')) return [];
        this.next();
        const params = [];
        for (;;) {
            this.parseModifiers();
            const name = this.expect('ident', undefined, 'expected type parameter').value;
            if (this.atKw('extends')) { this.next(); this.parseTypeRef(false); while (this.eatOp('&')) this.parseTypeRef(false); }
            params.push(name);
            if (this.eatOp(',')) continue;
            if (this.atOp('>')) { this.splitGt(); this.next(); break; }
            if (this.atOp('>>') || this.atOp('>>>')) { this.splitGt(); this.next(); break; }
            break;
        }
        return params;
    }

    parseRecordDecl(mods, start) {
        this.next(); // record
        const name = this.expect('ident', undefined, 'expected record name').value;
        const typeParams = this.parseTypeParams();
        this.expectOp('(');
        const components = [];
        if (!this.atOp(')')) {
            for (;;) {
                const type = this.parseTypeRef(false);
                const cname = this.expect('ident', undefined, 'expected component name').value;
                components.push({ type, name: cname });
                if (this.eatOp(',')) continue;
                break;
            }
        }
        this.expectOp(')');
        let superName = null;
        const interfaces = [];
        if (this.atKw('implements')) {
            this.next();
            interfaces.push(this.parseTypeRef(false));
            while (this.eatOp(',')) interfaces.push(this.parseTypeRef(false));
        }
        const body = this.parseBodyWithName(name, 'record', components);
        return {
            kind: 'record', name, modifiers: mods, typeParams, superName, interfaces,
            components, fields: body.fields, methods: body.methods, staticInit: body.staticInit,
            line: start.line, col: start.col
        };
    }

    parseEnumDecl(mods, start) {
        this.next(); // enum
        const name = this.expect('ident', undefined, 'expected enum name').value;
        this.expectOp('{');
        const constants = [];
        while (!this.atOp(';') && !this.atOp('}')) {
            const cname = this.expect('ident', undefined, 'expected enum constant').value;
            let args = [];
            if (this.atOp('(')) args = this.parseArguments();
            let cbody = null;
            if (this.atOp('{')) cbody = this.parseBodyWithName(cname, 'enum', null);
            constants.push({ name: cname, args, body: cbody });
            if (!this.eatOp(',')) break;
        }
        let body = { fields: [], methods: [], staticInit: [] };
        if (this.eatOp(';')) body = this.parseMembersWithName(name, 'enum', null);
        this.expectOp('}');
        return {
            kind: 'enum', name, modifiers: mods, typeParams: [], superName: null, interfaces: [],
            enumConstants: constants, fields: body.fields, methods: body.methods, staticInit: body.staticInit,
            line: start.line, col: start.col
        };
    }

    parseClassBody(kind, recordComponents) {
        this.expectOp('{');
        const body = this.parseClassBodyMembers(kind, recordComponents);
        this.expectOp('}');
        return body;
    }

    parseClassBodyMembers(kind, recordComponents) {
        const body = { fields: [], methods: [], staticInit: [] };
        while (!this.atOp('}') && !this.at('eof')) {
            this.parseMember(body, kind, recordComponents);
        }
        return body;
    }

    parseMember(body, kind, recordComponents) {
        if (this.atOp(';')) { this.next(); return; }
        const start = this.peek();
        const mods = this.parseModifiers();

        // Tipos anidados
        if (this.atKw('class') || this.atKw('interface') || this.atKw('enum')
            || (this.atKw('record') && this.peek(1).type === 'ident')) {
            const nested = this.parseTypeDeclFromMods(mods, start);
            body.methods.push({ isNestedType: true, decl: nested, modifiers: mods, name: nested.name });
            return;
        }

        // Bloques estáticos / de instancia
        if (this.atOp('{')) {
            const block = this.parseBlock();
            if (mods.includes('static')) body.staticInit.push(...block.body);
            else body.methods.push({ isInitializer: true, modifiers: mods, name: '<init-block>', body: block.body });
            return;
        }

        const typeParams = this.parseTypeParams();

        // Constructor: identificador igual al nombre de la clase seguido de '('
        if (this.peek().type === 'ident' && this.peek().value === this.currentTypeName && this.peek(1).value === '(') {
            this.next();   // nombre del constructor
            const params = this.parseParams();
            const throwsList = this.parseThrows();
            const bodyBlock = this.parseBlock();
            body.methods.push({
                isConstructor: true, modifiers: mods, name: this.currentTypeName, params, body: bodyBlock.body,
                throws: throwsList, line: start.line, col: start.col
            });
            return;
        }

        // Constructor compacto de record:  Nombre { ... }
        if (kind === 'record' && recordComponents && this.peek().type === 'ident'
            && this.peek().value === this.currentTypeName && this.peek(1).value === '{') {
            this.next();   // nombre del constructor
            const bodyBlock = this.parseBlock();
            body.methods.push({
                isCompactConstructor: true, modifiers: mods, name: this.currentTypeName, params: [],
                body: bodyBlock.body, line: start.line, col: start.col
            });
            return;
        }

        // Método o método abstracto de interfaz
        let returnType = null;
        if (this.atKw('void')) { this.next(); returnType = { name: 'void', args: [], dims: 0, isVar: false, line: start.line, col: start.col }; }
        else returnType = this.parseTypeRef(true);

        if (this.peek().type !== 'ident') {
            const t = this.peek();
            const found = t.type === 'eof' ? 'end of file' : `"${t.value}"`;
            throw new JavaCompileError(`expected identifier, found ${found}`, t.line, t.col);
        }
        const name = this.next().value;

        if (this.atOp('(')) {
            const params = this.parseParams();
            let extraDims = 0;
            while (this.atOp('[') && this.peek(1).value === ']') { this.next(); this.next(); extraDims++; }
            const throwsList = this.parseThrows();
            let mbody = null;
            if (this.atOp('{')) mbody = this.parseBlock().body;
            else if (kind === 'class' || kind === 'record' || kind === 'enum') this.expectOp(';');
            body.methods.push({
                modifiers: mods, typeParams, returnType: this.withDims(returnType, extraDims), name,
                params, throws: throwsList, body: mbody, line: start.line, col: start.col
            });
            return;
        }

        // Campo(s). El nombre ya se consumió antes de saber si era método o campo.
        if (!mods.includes('static') && !mods.includes('final') && kind === 'class' && returnType.isVar) {
            const t = this.peek();
            throw new JavaCompileError('not a statement', t.line, t.col);
        }
        let fname = name;
        for (;;) {
            let fdims = 0;
            while (this.atOp('[') && this.peek(1).value === ']') { this.next(); this.next(); fdims++; }
            let init = null;
            if (this.atOp('=')) { this.next(); init = this.parseVariableInitializer(); }
            body.fields.push({ modifiers: mods, type: returnType, name: fname, dims: fdims, init, line: start.line, col: start.col });
            if (this.eatOp(',')) { fname = this.expect('ident', undefined, 'expected field name').value; continue; }
            break;
        }
        this.expectOp(';');
    }

    parseTypeDeclFromMods(mods, start) {
        if (this.atKw('class')) return this.parseClassDecl(mods, start, 'class');
        if (this.atKw('interface')) return this.parseClassDecl(mods, start, 'interface');
        if (this.atKw('enum')) return this.parseEnumDecl(mods, start);
        return this.parseRecordDecl(mods, start);
    }

    withDims(type, extra) {
        return extra ? { ...type, dims: type.dims + extra } : type;
    }

    parseParams() {
        this.expectOp('(');
        const params = [];
        if (!this.atOp(')')) {
            for (;;) {
                const pmods = this.parseModifiers();
                const type = this.parseTypeRef(false);
                let varargs = false;
                if (this.atOp('...')) {
                    this.next();
                    varargs = true;
                    const td = { ...type, dims: type.dims + 1 };
                    const pname = this.expect('ident', undefined, 'expected parameter name').value;
                    params.push({ modifiers: pmods, type: td, name: pname, varargs: true });
                    if (this.eatOp(',')) continue;
                    break;
                }
                const pname = this.expect('ident', undefined, 'expected parameter name').value;
                let pdims = 0;
                while (this.atOp('[') && this.peek(1).value === ']') { this.next(); this.next(); pdims++; }
                params.push({ modifiers: pmods, type: pdims ? { ...type, dims: type.dims + pdims } : type, name: pname, varargs: false });
                if (this.eatOp(',')) continue;
                break;
            }
        }
        this.expectOp(')');
        return params;
    }

    parseThrows() {
        if (!this.atKw('throws')) return [];
        this.next();
        const list = [this.parseTypeRef(false)];
        while (this.eatOp(',')) list.push(this.parseTypeRef(false));
        return list;
    }

    /* ---------- sentencias ---------- */
    parseBlock() {
        this.expectOp('{');
        const body = [];
        while (!this.atOp('}') && !this.at('eof')) body.push(this.parseStatement());
        this.expectOp('}');
        return { type: 'Block', body };
    }

    parseStatement() {
        const t = this.peek();

        if (this.atOp('{')) return this.parseBlock();
        if (this.atOp(';')) { this.next(); return { type: 'Empty' }; }

        if (this.atKw('if')) return this.parseIf();
        if (this.atKw('while')) return this.parseWhile();
        if (this.atKw('do')) return this.parseDoWhile();
        if (this.atKw('for')) return this.parseFor();
        if (this.atKw('switch')) return this.parseSwitchStatement();
        if (this.atKw('return')) return this.parseReturn();
        if (this.atKw('break') || this.atKw('continue')) return this.parseBreakContinue();
        if (this.atKw('throw')) {
            this.next();
            const expr = this.parseExpression();
            this.expectOp(';');
            return { type: 'Throw', expr, line: t.line, col: t.col };
        }
        if (this.atKw('try')) return this.parseTry();
        if (this.atKw('synchronized') && this.peek(1).value === '(') {
            this.next();
            this.expectOp('(');
            const expr = this.parseExpression();
            this.expectOp(')');
            const body = this.parseBlock();
            return { type: 'Sync', expr, body, line: t.line, col: t.col };
        }
        if (this.atKw('assert')) {
            this.next();
            const cond = this.parseExpression();
            let msg = null;
            if (this.eatOp(':')) msg = this.parseExpression();
            this.expectOp(';');
            return { type: 'Assert', cond, msg, line: t.line, col: t.col };
        }

        // Declaración de tipo local
        if (this.isLocalTypeDecl()) {
            const start = this.peek();
            const mods = this.parseModifiers();
            const decl = this.parseTypeDeclFromMods(mods, start);
            return { type: 'LocalType', decl, line: t.line, col: t.col };
        }

        // Sentencia etiquetada:  etiqueta : sentencia
        if (t.type === 'ident' && this.peek(1).value === ':') {
            const label = this.next().value;
            this.next();
            return { type: 'Labeled', label, body: this.parseStatement(), line: t.line, col: t.col };
        }

        // Un tipo primitivo no puede iniciar una expresión (salvo `int.class`).
        if (t.type === 'keyword' && isPrimitiveType(t.value) && t.value !== 'void'
            && !(this.peek(1).value === '.' && this.peek(2).value === 'class')) {
            // Podría ser una declaración: `int x = 1;` se resuelve más abajo.
            if (!this.looksLikeLocalVarDecl()) throw new JavaCompileError('illegal start of expression', t.line, t.col);
        }

        // Declaración local de variables
        if (this.looksLikeLocalVarDecl()) {
            const decl = this.parseLocalVarDecl();
            this.expectOp(';');
            return decl;
        }

        // Llamadas explícita a constructor: super(...) o this(...)
        if ((this.atKw('super') || this.atKw('this')) && this.peek(1).value === '(') {
            const kw = this.next();
            const args = this.parseArguments();
            this.expectOp(';');
            const targetType = kw.value === 'super' ? 'Super' : 'This';
            const call = { type: 'MethodCall', target: { type: targetType, line: kw.line, col: kw.col }, name: '<init>', args, line: kw.line, col: kw.col };
            return { type: 'ExprStmt', expr: call, line: t.line, col: t.col };
        }

        const expr = this.parseExpression();
        this.expectOp(';');
        return { type: 'ExprStmt', expr, line: t.line, col: t.col };
    }

    isLocalTypeDecl() {
        const s = this.state();
        try {
            this.parseModifiers();
            if (this.atKw('class') || this.atKw('interface') || this.atKw('enum')) return true;
            if (this.atKw('record') && this.peek(1).type === 'ident') return true;
            return false;
        } catch (e) {
            return false;
        } finally {
            this.restore(s);
        }
    }

    looksLikeLocalVarDecl() {
        const s = this.state();
        try {
            if (this.atKw('final') || this.atKw('var')) {
                this.parseModifiers();
                if (this.atKw('var')) {
                    this.next();
                    return this.peek().type === 'ident';
                }
            }
            if (!this.isTypeNameToken(this.peek())) return false;
            this.parseTypeRef(false);
            if (this.peek().type === 'ident') return true;
            // List<String> x = ... ya cubierto arriba; ArrayList<String>[] también.
            return false;
        } catch (e) {
            return false;
        } finally {
            this.restore(s);
        }
    }

    parseLocalVarDecl() {
        const start = this.peek();
        const mods = this.parseModifiers();
        let baseType;
        if (this.atKw('var')) {
            this.next();
            baseType = { name: 'var', args: [], dims: 0, isVar: true, line: start.line, col: start.col };
        } else {
            baseType = this.parseTypeRef(false);
        }
        const decls = [];
        for (;;) {
            const name = this.expect('ident', undefined, 'expected variable name').value;
            let dims = 0;
            while (this.atOp('[') && this.peek(1).value === ']') { this.next(); this.next(); dims++; }
            let init = null;
            if (this.atOp('=')) { this.next(); init = this.parseVariableInitializer(); }
            decls.push({ name, type: this.withDims(baseType, dims), init, modifiers: mods });
            if (this.eatOp(',')) continue;
            break;
        }
        return { type: 'LocalVarDecl', modifiers: mods, decls, line: start.line, col: start.col };
    }

    parseVariableInitializer() {
        if (this.atOp('{')) return this.parseArrayInitializer();
        return this.parseExpression();
    }

    parseArrayInitializer() {
        this.expectOp('{');
        const items = [];
        while (!this.atOp('}')) {
            items.push(this.parseVariableInitializer());
            if (!this.eatOp(',')) break;
        }
        this.expectOp('}');
        return { type: 'ArrayInit', items };
    }

    parseIf() {
        const start = this.next();
        this.expectOp('(');
        const cond = this.parseExpression();
        this.expectOp(')');
        const then = this.parseStatement();
        let otherwise = null;
        if (this.atKw('else')) { this.next(); otherwise = this.parseStatement(); }
        return { type: 'If', cond, then, otherwise, line: start.line, col: start.col };
    }

    parseWhile() {
        const start = this.next();
        this.expectOp('(');
        const cond = this.parseExpression();
        this.expectOp(')');
        const body = this.parseStatement();
        return { type: 'While', cond, body, line: start.line, col: start.col };
    }

    parseDoWhile() {
        const start = this.next();
        const body = this.parseStatement();
        this.expectKw('while');
        this.expectOp('(');
        const cond = this.parseExpression();
        this.expectOp(')');
        this.expectOp(';');
        return { type: 'DoWhile', body, cond, line: start.line, col: start.col };
    }

    parseFor() {
        const start = this.next();
        this.expectOp('(');

        // ¿for-each?  intentamos leer la cabecera como declaración de variable.
        const s = this.state();
        let header = null;
        let isEach = false;
        try {
            const mods = this.parseModifiers();
            if (this.peek().type === 'ident' || this.isTypeNameToken(this.peek())) {
                const type = this.parseTypeRef(false);
                if (this.peek().type === 'ident' && this.peek(1).value === ':') {
                    const name = this.next().value;
                    this.next(); // ':'
                    const iterable = this.parseExpression();
                    header = { mods, varType: type, name, iterable };
                    isEach = true;
                }
            }
        } catch (e) {
            isEach = false;
        }
        if (!isEach) this.restore(s);

        if (isEach) {
            this.expectOp(')');
            const body = this.parseStatement();
            return { type: 'ForEach', ...header, body, line: start.line, col: start.col };
        }

        let init = null;
        if (!this.atOp(';')) {
            if (this.looksLikeLocalVarDecl()) init = this.parseLocalVarDecl();
            else {
                const exprs = [this.parseExpression()];
                while (this.eatOp(',')) exprs.push(this.parseExpression());
                init = { type: 'ExprList', exprs };
            }
        }
        this.expectOp(';');
        const cond = this.atOp(';') ? null : this.parseExpression();
        this.expectOp(';');
        const updates = [];
        if (!this.atOp(')')) {
            updates.push(this.parseExpression());
            while (this.eatOp(',')) updates.push(this.parseExpression());
        }
        this.expectOp(')');
        const body = this.parseStatement();
        return { type: 'For', init, cond, updates, body, line: start.line, col: start.col };
    }

    parseReturn() {
        const start = this.next();
        const expr = this.atOp(';') ? null : this.parseExpression();
        this.expectOp(';');
        return { type: 'Return', expr, line: start.line, col: start.col };
    }

    parseBreakContinue() {
        const start = this.next();
        const keyword = start.value;
        let label = null;
        if (this.peek().type === 'ident') label = this.next().value;
        this.expectOp(';');
        return { type: keyword === 'break' ? 'Break' : 'Continue', label, line: start.line, col: start.col };
    }

    parseTry() {
        const start = this.next();
        const resources = [];
        if (this.atOp('(')) {
            this.next();
            for (;;) {
                const mods = this.parseModifiers();
                const type = this.parseTypeRef(false);
                const name = this.expect('ident', undefined, 'expected resource name').value;
                let init = null;
                if (this.eatOp('=')) init = this.parseExpression();
                resources.push({ modifiers: mods, type, name, init });
                if (this.eatOp(';')) { if (this.atOp(')')) break; continue; }
                break;
            }
            this.expectOp(')');
        }
        const block = this.parseBlock();
        const catches = [];
        while (this.atKw('catch')) {
            const cstart = this.next();
            this.expectOp('(');
            const mods = this.parseModifiers();
            const types = [this.parseTypeRef(false)];
            while (this.eatOp('|')) types.push(this.parseTypeRef(false));
            let name = '_';
            if (this.peek().type === 'ident') name = this.next().value;
            this.expectOp(')');
            catches.push({ types, name, body: this.parseBlock(), line: cstart.line, col: cstart.col });
        }
        let finallyBlock = null;
        if (this.atKw('finally')) { this.next(); finallyBlock = this.parseBlock(); }
        if (catches.length === 0 && !finallyBlock) {
            throw new JavaCompileError("'catch' or 'finally' expected", start.line, start.col);
        }
        return { type: 'Try', resources, block, catches, finallyBlock, line: start.line, col: start.col };
    }

    /* ---------- switch (clásico y expresión con flechas) ---------- */
    parseSwitchStatement() {
        const start = this.next();
        this.expectOp('(');
        const selector = this.parseExpression();
        this.expectOp(')');
        this.expectOp('{');
        const clauses = [];
        while (!this.atOp('}') && !this.at('eof')) {
            if (this.atKw('case') || this.atKw('default')) {
                const isDefault = this.atKw('default');
                if (isDefault) this.next(); else this.next();
                const labels = [];
                if (!isDefault) {
                    labels.push(this.parseCaseLabel());
                    while (this.eatOp(',')) labels.push(this.parseCaseLabel());
                }
                let arrow = false;
                let value = null;
                if (this.atOp('->')) {
                    this.next();
                    arrow = true;
                    if (this.atOp('{')) {
                        clauses.push({ labels, isDefault, arrow, body: this.parseBlock().body, value: null });
                        continue;
                    }
                    if (this.atKw('throw')) {
                        const t = this.next();
                        const expr = this.parseExpression();
                        this.expectOp(';');
                        clauses.push({ labels, isDefault, arrow, body: [{ type: 'Throw', expr, line: t.line, col: t.col }], value: null });
                        continue;
                    }
                    const st = this.parseStatement();
                    clauses.push({ labels, isDefault, arrow, body: [st], value: null });
                    continue;
                }
                this.expectOp(':');
                const body = [];
                while (!this.atOp('}') && !this.atKw('case') && !this.atKw('default') && !this.at('eof')) {
                    body.push(this.parseStatement());
                }
                clauses.push({ labels, isDefault, arrow: false, body, value });
            } else {
                const t = this.peek();
                const found = t.type === 'eof' ? 'end of file' : `"${t.value}"`;
                throw new JavaCompileError(`"case", "default", or "}" expected, found ${found}`, t.line, t.col);
            }
        }
        this.expectOp('}');
        return { type: 'Switch', selector, clauses, isExpression: false, line: start.line, col: start.col };
    }

    parseCaseLabel() {
        if (this.atKw('null')) { this.next(); return { type: 'Literal', kind: 'null', value: null }; }
        return this.parseTernary();
    }

    /* ---------- switch como expresión ---------- */
    parseSwitchExpression() {
        const start = this.peek();
        this.expectKw('switch');
        this.expectOp('(');
        const selector = this.parseExpression();
        this.expectOp(')');
        this.expectOp('{');
        const clauses = [];
        while (!this.atOp('}') && !this.at('eof')) {
            if (this.atKw('default')) {
                this.next();
                this.expectOp('->');
                const value = this.parseExpression();
                this.expectOp(';');
                clauses.push({ labels: [], isDefault: true, arrow: true, body: [], value });
                continue;
            }
            this.expectKw('case');
            const labels = [this.parseCaseLabel()];
            while (this.eatOp(',')) labels.push(this.parseCaseLabel());
            this.expectOp('->');
            if (this.atKw('yield')) {
                this.next();
                const value = this.parseExpression();
                this.expectOp(';');
                clauses.push({ labels, isDefault: false, arrow: true, body: [], value });
            } else {
                const value = this.parseExpression();
                this.expectOp(';');
                clauses.push({ labels, isDefault: false, arrow: true, body: [], value });
            }
        }
        this.expectOp('}');
        return { type: 'SwitchExpr', selector, clauses, isExpression: true, line: start.line, col: start.col };
    }

    /* ---------- expresiones ---------- */
    parseExpression() {
        if (this.atKw('switch')) {
            // switch-expresión sólo es válido como expresión completa o tras '('
            return this.parseSwitchExpression();
        }
        return this.parseAssignment();
    }

    parseAssignment() {
        const lambda = this.tryParseLambda();
        if (lambda) return lambda;
        const start = this.peek();
        const left = this.parseTernary();
        if (this.peek().type === 'op' && ASSIGN_OPS.has(this.peek().value)) {
            const op = this.next().value;
            const right = this.parseAssignment();
            return { type: 'Assign', op, target: left, value: right, line: start.line, col: start.col };
        }
        return left;
    }

    tryParseLambda() {
        const t = this.peek();
        // ident ->
        if (t.type === 'ident' && this.peek(1).type === 'op' && this.peek(1).value === '->') {
            this.next(); this.next();
            const param = { name: t.value, implicitType: true, type: { name: 'var', args: [], dims: 0, isVar: true } };
            return this.parseLambdaBody([param], t);
        }
        // ( params ) ->
        if (t.type === 'op' && t.value === '(') {
            const s = this.state();
            const close = this.matchParen(this.pos);
            if (close > 0) {
                const after = this.tokens[close + 1];
                if (after && after.type === 'op' && after.value === '->') {
                    this.next(); // (
                    const params = [];
                    if (!this.atOp(')')) {
                        for (;;) {
                            const pmods = this.parseModifiers();
                            if (this.atOp('...')) this.next();
                            // Tipo explícito o sólo nombre
                            if (this.peek().type === 'ident' && (this.peek(1).value === ',' || this.peek(1).value === ')')) {
                                params.push({ modifiers: pmods, type: { name: 'var', args: [], dims: 0, isVar: true }, name: this.next().value, implicitType: true });
                            } else {
                                const ptype = this.parseTypeRef(false);
                                const pname = this.expect('ident', undefined, 'expected parameter name').value;
                                params.push({ modifiers: pmods, type: ptype, name: pname, implicitType: false });
                            }
                            if (this.eatOp(',')) continue;
                            break;
                        }
                    }
                    this.expectOp(')');
                    this.expectOp('->');
                    return this.parseLambdaBody(params, t);
                }
            }
            this.restore(s);
        }
        return null;
    }

    parseLambdaBody(params, startTok) {
        if (this.atOp('{')) {
            const body = this.parseBlock();
            return { type: 'Lambda', params, body: body.body, isExpression: false, line: startTok.line, col: startTok.col };
        }
        const expr = this.parseExpression();
        return { type: 'Lambda', params, body: expr, isExpression: true, line: startTok.line, col: startTok.col };
    }

    matchParen(startIdx) {
        let depth = 0;
        for (let i = startIdx; i < this.tokens.length; i++) {
            const t = this.tokens[i];
            if (t.type === 'op' && t.value === '(') depth++;
            else if (t.type === 'op' && t.value === ')') { depth--; if (depth === 0) return i; }
        }
        return -1;
    }

    parseTernary() {
        const start = this.peek();
        const cond = this.parseBinary(0);
        if (this.atOp('?')) {
            this.next();
            const thenExpr = this.parseAssignment();
            this.expectOp(':');
            const elseExpr = this.parseAssignment();
            return { type: 'Ternary', cond, then: thenExpr, otherwise: elseExpr, line: start.line, col: start.col };
        }
        return cond;
    }

    parseArguments() {
        this.expectOp('(');
        const args = [];
        if (!this.atOp(')')) {
            for (;;) {
                args.push(this.parseExpression());
                if (this.eatOp(',')) continue;
                break;
            }
        }
        this.expectOp(')');
        return args;
    }

    /* Tabla de precedencia binaria (de menor a mayor). */
    parseBinary(level) {
        const LEVELS = [
            ['||'], ['&&'], ['|'], ['^'], ['&'], ['==', '!='], ['<', '>', '<=', '>='], ['instanceof'],
            ['<<', '>>', '>>>'], ['+', '-'], ['*', '/', '%']
        ];
        if (level >= LEVELS.length) return this.parseUnary();
        const ops = LEVELS[level];
        let left = this.parseBinary(level + 1);
        for (;;) {
            if (ops[0] === 'instanceof') {
                if (!this.atKw('instanceof')) break;
                this.next();
                const type = this.parseTypeRef(false);
                let binding = null;
                if (this.peek().type === 'ident') binding = this.next().value;
                left = { type: 'InstanceOf', expr: left, targetType: type, binding };
                continue;
            }
            const t = this.peek();
            if (t.type !== 'op' || !ops.includes(t.value)) break;
            this.next();
            const right = this.parseBinary(level + 1);
            left = { type: 'Binary', op: t.value, left, right, line: t.line, col: t.col };
        }
        return left;
    }

    parseUnary() {
        const t = this.peek();
        if (t.type === 'op' && (t.value === '+' || t.value === '-' || t.value === '!' || t.value === '~')) {
            this.next();
            return { type: 'Unary', op: t.value, expr: this.parseUnary(), prefix: true, line: t.line, col: t.col };
        }
        if (t.type === 'op' && (t.value === '++' || t.value === '--')) {
            this.next();
            return { type: 'Unary', op: t.value, expr: this.parseUnary(), prefix: true, line: t.line, col: t.col };
        }
        const cast = this.tryParseCast();
        if (cast) return cast;
        return this.parsePostfix();
    }

    tryParseCast() {
        const t = this.peek();
        if (!(t.type === 'op' && t.value === '(')) return null;
        const s = this.state();
        const close = this.matchParen(this.pos);
        if (close < 0) return null;
        const after = this.tokens[close + 1];
        if (!after) return null;

        // ¿La construcción dentro de los paréntesis es un tipo?
        this.next(); // (
        let isType = false;
        try {
            this.parseModifiers();
            this.parseTypeRef(false);
            //sólo el tipo, sin nombre ni expresión
            const cur = this.peek();
            if (cur.type === 'op' && (cur.value === ')' || cur.value === '[')) isType = true;
        } catch (e) {
            isType = false;
        }
        this.restore(s);
        if (!isType) return null;

        const afterVal = after.type === 'op' ? after.value : after.value;
        const canFollow = after.type === 'ident' || after.type === 'number' || after.type === 'string'
            || after.type === 'char' || after.type === 'textblock'
            || (after.type === 'keyword' && ['this', 'super', 'new', 'true', 'false', 'null', 'switch',
                'int', 'long', 'double', 'float', 'char', 'boolean', 'byte', 'short', 'var'].includes(after.value))
            || (after.type === 'op' && ['(', '!', '~', '[', '+', '-'].includes(after.value));
        if (!canFollow) return null;
        // (a) + b  → no es un cast salvo que 'a' sea un tipo
        if (after.type === 'op' && (afterVal === '+' || afterVal === '-')) {
            const inside = this.tokens[this.pos + 1];
            const insideLooksType = inside && ((inside.type === 'keyword' && isPrimitiveType(inside.value))
                || (inside.type === 'ident' && (KNOWN_TYPES.has(inside.value) || /^[A-Z]/.test(inside.value))));
            if (!insideLooksType) return null;
        }
        if (after.type === 'op' && (afterVal === '>' || afterVal === '&' || afterVal === '*' || afterVal === '/')) return null;

        this.next(); // (
        const type = this.parseTypeRef(false);
        this.expectOp(')');
        return { type: 'Cast', targetType: type, expr: this.parseUnary(), line: t.line, col: t.col };
    }

    parsePostfix() {
        let expr = this.parsePrimary();
        for (;;) {
            const t = this.peek();
            if (t.type !== 'op') break;
            if (t.value === '.') {
                this.next();
                if (this.atKw('new')) {
                    this.next();
                    const type = this.parseTypeRef(false);
                    const args = this.parseArguments();
                    expr = { type: 'New', type, args, qualified: expr };
                    continue;
                }
                if (this.atKw('this')) { this.next(); expr = { type: 'ThisQualified', target: expr }; continue; }
                if (this.atKw('class')) { this.next(); expr = { type: 'ClassLiteral', targetType: null, name: expr.type === 'Name' ? expr.name : null }; continue; }
                if (this.atKw('super')) { this.next(); expr = { type: 'SuperRef', target: expr }; continue; }
                const name = this.expect('ident', undefined, 'expected member name after \'.\'').value;
                if (this.atOp('(')) {
                    const args = this.parseArguments();
                    expr = { type: 'MethodCall', target: expr, name, args, line: t.line, col: t.col };
                } else {
                    expr = { type: 'FieldAccess', target: expr, name, line: t.line, col: t.col };
                }
                continue;
            }
            if (t.value === '[') {
                this.next();
                const index = this.parseExpression();
                this.expectOp(']');
                expr = { type: 'ArrayAccess', array: expr, index, line: t.line, col: t.col };
                continue;
            }
            if (t.value === '::') {
                this.next();
                if (this.atKw('new')) { this.next(); expr = { type: 'MethodRef', target: expr, name: 'new' }; continue; }
                const name = this.expect('ident', undefined, 'expected method name').value;
                expr = { type: 'MethodRef', target: expr, name, line: t.line, col: t.col };
                continue;
            }
            if (t.value === '++' || t.value === '--') {
                this.next();
                expr = { type: 'Unary', op: t.value, expr, prefix: false, line: t.line, col: t.col };
                continue;
            }
            break;
        }
        return expr;
    }

    parsePrimary() {
        const t = this.peek();

        if (t.type === 'number') {
            this.next();
            let kind = t.subtype === 'long' ? 'long' : (t.subtype === 'float' || t.subtype === 'double') ? 'double' : 'int';
            let v = t.value;
            if (kind === 'int' && !Number.isInteger(v)) kind = 'double';
            return { type: 'Literal', kind, value: v, line: t.line, col: t.col };
        }
        if (t.type === 'string' || t.type === 'textblock') {
            this.next();
            return { type: 'Literal', kind: 'string', value: t.value, line: t.line, col: t.col };
        }
        if (t.type === 'char') {
            this.next();
            return { type: 'Literal', kind: 'char', value: t.value, line: t.line, col: t.col };
        }
        if (this.atKw('true') || this.atKw('false')) {
            this.next();
            return { type: 'Literal', kind: 'boolean', value: t.value === 'true', line: t.line, col: t.col };
        }
        if (this.atKw('null')) {
            this.next();
            return { type: 'Literal', kind: 'null', value: null, line: t.line, col: t.col };
        }
        if (this.atKw('this')) { this.next(); return { type: 'This', line: t.line, col: t.col }; }
        if (this.atKw('super')) { this.next(); return { type: 'Super', line: t.line, col: t.col }; }
        if (this.atKw('switch')) return this.parseSwitchExpression();
        if (this.atKw('new')) return this.parseNew();
        if (this.atOp('(')) {
            const lambda = this.tryParseLambda();
            if (lambda) return lambda;
            this.next();
            const expr = this.parseExpression();
            this.expectOp(')');
            return { type: 'Paren', expr, line: t.line, col: t.col };
        }
        if (t.type === 'ident') {
            const lambda = this.tryParseLambda();
            if (lambda) return lambda;
            this.next();
            if (this.atOp('(')) {
                const args = this.parseArguments();
                return { type: 'MethodCall', target: null, name: t.value, args, line: t.line, col: t.col };
            }
            return { type: 'Name', name: t.value, line: t.line, col: t.col };
        }
        if (t.type === 'keyword' && isPrimitiveType(t.value)) {
            // p.ej. int.class  o algo similar en un contexto inesperado
            const type = this.parseTypeRef(false);
            return { type: 'ClassLiteral', targetType: type, name: null, line: t.line, col: t.col };
        }

        const found = t.type === 'eof' ? 'end of file' : `"${t.value}"`;
        throw new JavaCompileError(`illegal start of expression, found ${found}`, t.line, t.col);
    }

    parseNew() {
        const start = this.next(); // new
        const type = this.parseTypeRef(false);
        if (this.atOp('<')) this.parseTypeArgs(); // diamante

        // `new T[]` ya dejó los corchetes consumidos en parseTypeRef
        if (type.dims > 0 || this.atOp('[')) {
            const dims = type.dims > 0 ? [null] : [];
            let arrayInit = null;
            while (this.atOp('[')) {
                this.next();
                if (this.atOp(']')) { this.next(); dims.push(null); continue; }
                if (this.atOp('{')) break; // new int[]{...}
                dims.push(this.parseExpression());
                this.expectOp(']');
            }
            if (this.atOp('{')) arrayInit = this.parseArrayInitializer();
            return {
                type: 'NewArray',
                arrayType: { ...type, dims: 0 },
                dims, arrayInit, line: start.line, col: start.col
            };
        }

        const args = this.parseArguments();
        return { type: 'New', targetType: type, args, line: start.line, col: start.col };
    }
}

/** Analiza el código fuente y devuelve la unidad de compilación (AST). */
export function parse(source) {
    const parser = new Parser(source);
    const unit = parser.parseCompilationUnit();
    return unit;
}
