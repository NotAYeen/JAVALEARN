/* Analizador léxico de Java 17 (subconjunto de JavaLearn).
   Produce una lista de tokens { type, value, subtype, line, col }. */

import { JavaCompileError } from './errors.js';

export const KEYWORDS = new Set([
    'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const',
    'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float',
    'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native',
    'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp',
    'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void',
    'volatile', 'while', 'var', 'record', 'sealed', 'permits', 'yield', 'true', 'false', 'null'
]);

const PRIMITIVES = new Set(['boolean', 'byte', 'short', 'int', 'long', 'char', 'float', 'double', 'void']);

export function isPrimitiveType(name) {
    return PRIMITIVES.has(name);
}

export function isKeyword(word) {
    return KEYWORDS.has(word);
}

const isIdStart = (ch) => /[A-Za-z_$¡-￿]/.test(ch);
const isIdPart = (ch) => /[0-9A-Za-z_$¡-￿]/.test(ch);
const isDigit = (ch) => ch >= '0' && ch <= '9';

/* Operadores de más larga a más corta para evitar coincidencias parciales. */
const OPERATORS = [
    '>>>=', '<<=', '>>=', '>>>', '...', '->', '::', '++', '--', '&&', '||', '==', '!=', '<=', '>=',
    '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<', '>>', '(', ')', '{', '}', '[', ']',
    ';', ',', '.', '=', '>', '<', '!', '~', '?', ':', '+', '-', '*', '/', '&', '|', '^', '%', '@'
];

class Lexer {
    constructor(source) {
        this.src = String(source == null ? '' : source);
        this.i = 0;
        this.line = 1;
        this.col = 1;
    }

    error(message) {
        throw new JavaCompileError(message, this.line, this.col);
    }

    peek(offset = 0) {
        return this.src[this.i + offset];
    }

    advance() {
        const ch = this.src[this.i++];
        if (ch === '\n') { this.line++; this.col = 1; } else { this.col++; }
        return ch;
    }

    skipTrivia() {
        for (;;) {
            const ch = this.peek();
            if (ch === undefined) return;
            if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n' || ch === '\f') { this.advance(); continue; }
            if (ch === '/' && this.peek(1) === '/') {
                while (this.peek() !== undefined && this.peek() !== '\n') this.advance();
                continue;
            }
            if (ch === '/' && this.peek(1) === '*') {
                const startLine = this.line;
                this.advance(); this.advance();
                for (;;) {
                    if (this.peek() === undefined) throw new JavaCompileError('unclosed comment', startLine, 1);
                    if (this.peek() === '*' && this.peek(1) === '/') { this.advance(); this.advance(); break; }
                    this.advance();
                }
                continue;
            }
            return;
        }
    }

    readEscape(line) {
        const ch = this.advance();
        switch (ch) {
            case 'n': return '\n';
            case 't': return '\t';
            case 'r': return '\r';
            case 'b': return '\b';
            case 'f': return '\f';
            case 's': return ' ';
            case '0': return '\0';
            case '\\': return '\\';
            case '\'': return '\'';
            case '"': return '"';
            case 'u': {
                let hex = '';
                for (let k = 0; k < 4; k++) {
                    const h = this.advance();
                    if (!/[0-9a-fA-F]/.test(h)) throw new JavaCompileError('illegal unicode escape', this.line, this.col);
                    hex += h;
                }
                return String.fromCharCode(parseInt(hex, 16));
            }
            case '\n': return '';
            default: return ch;
        }
    }

    readString() {
        const line = this.line;
        this.advance(); // comilla inicial
        let out = '';
        for (;;) {
            const ch = this.peek();
            if (ch === undefined || ch === '\n') throw new JavaCompileError('unclosed string literal', line, 1);
            this.advance();
            if (ch === '"') return out;
            if (ch === '\\') out += this.readEscape(line);
            else out += ch;
        }
    }

    readTextBlock() {
        const line = this.line;
        this.advance(); this.advance(); this.advance(); // apertura """
        if (this.peek() === '\r') this.advance();
        if (this.peek() === '\n') this.advance(); // el salto tras la apertura no forma parte del texto

        const raw = [];
        let closingIndent = '';
        for (;;) {
            if (this.peek() === undefined) throw new JavaCompileError('unclosed text block', line, 1);
            if (this.peek() === '"' && this.peek(1) === '"' && this.peek(2) === '"') {
                let j = this.i - 1;
                while (j >= 0 && this.src[j] !== '\n') j--;
                closingIndent = this.src.slice(j + 1, this.i).replace(/[^\s]/g, '');
                this.advance(); this.advance(); this.advance();
                break;
            }
            if (this.peek() === '\\') { this.advance(); raw.push(this.readEscape(line)); continue; }
            raw.push(this.advance());
        }

        // Java elimina el espacio en blanco final de cada línea (indentación incidental).
        while (raw.length && raw[raw.length - 1] === '') raw.pop();
        const lines = raw.join('\n').split('\n').map((l) => l.replace(/[ \t]+$/, ''));
        const body = lines.map((l) => (closingIndent && l.startsWith(closingIndent) ? l.slice(closingIndent.length) : l));
        return body.join('\n');
    }

    readChar() {
        const line = this.line;
        this.advance(); // '
        const ch = this.peek();
        if (ch === undefined || ch === '\n') throw new JavaCompileError('unclosed character literal', line, 1);
        let value;
        if (ch === '\\') { this.advance(); value = this.readEscape(line); } else { value = this.advance(); }
        if (this.peek() !== "'") throw new JavaCompileError("unclosed character literal", line, this.col);
        this.advance();
        return value.charCodeAt(0);
    }

    readNumber() {
        const line = this.line;
        const col = this.col;
        const start = this.i;
        let isFloat = false;
        let radix = 10;

        if (this.peek() === '0' && (this.peek(1) === 'x' || this.peek(1) === 'X')) {
            this.advance(); this.advance();
            radix = 16;
            while (this.peek() !== undefined && /[0-9a-fA-F_]/.test(this.peek())) this.advance();
        } else if (this.peek() === '0' && (this.peek(1) === 'b' || this.peek(1) === 'B')) {
            this.advance(); this.advance();
            radix = 2;
            while (this.peek() !== undefined && /[01_]/.test(this.peek())) this.advance();
        } else {
            while (this.peek() !== undefined && /[0-9_]/.test(this.peek())) this.advance();
            if (this.peek() === '.' && isDigit(this.peek(1) || '')) {
                isFloat = true;
                this.advance();
                while (this.peek() !== undefined && /[0-9_]/.test(this.peek())) this.advance();
            }
            if (this.peek() === 'e' || this.peek() === 'E') {
                const saveI = this.i;
                const saveCol = this.col;
                this.advance();
                if (this.peek() === '+' || this.peek() === '-') this.advance();
                if (isDigit(this.peek() || '')) {
                    isFloat = true;
                    while (this.peek() !== undefined && isDigit(this.peek())) this.advance();
                } else {
                    this.i = saveI;
                    this.col = saveCol;
                }
            }
        }

        const digitsEnd = this.i;
        const suffix = this.peek();
        let subtype = isFloat ? 'double' : 'int';
        if (suffix === 'l' || suffix === 'L') { this.advance(); subtype = 'long'; }
        else if (suffix === 'f' || suffix === 'F') { this.advance(); isFloat = true; subtype = 'float'; }
        else if (suffix === 'd' || suffix === 'D') { this.advance(); isFloat = true; subtype = 'double'; }

        const text = this.src.slice(start, digitsEnd).replace(/_/g, '');
        let value;
        if (isFloat) value = Number(text);
        else if (radix === 16) value = parseInt(text.slice(2), 16);
        else if (radix === 2) value = parseInt(text.slice(2), 2);
        else if (/^0[0-7]+$/.test(text)) value = parseInt(text, 8);
        else value = Number(text);

        if (Number.isNaN(value) && !isFloat) throw new JavaCompileError('malformed floating point literal', line, col);
        return { type: 'number', value, subtype, line, col };
    }

    next() {
        this.skipTrivia();
        const line = this.line;
        const col = this.col;
        const ch = this.peek();
        if (ch === undefined) return { type: 'eof', value: null, line, col };

        if (isIdStart(ch)) {
            const start = this.i;
            while (this.peek() !== undefined && isIdPart(this.peek())) this.advance();
            const word = this.src.slice(start, this.i);
            if (KEYWORDS.has(word)) return { type: 'keyword', value: word, line, col };
            return { type: 'ident', value: word, line, col };
        }

        if (isDigit(ch) || (ch === '.' && isDigit(this.peek(1) || ''))) {
            return this.readNumber();
        }

        if (ch === '"') {
            if (this.peek(1) === '"' && this.peek(2) === '"') return { type: 'textblock', value: this.readTextBlock(), line, col };
            return { type: 'string', value: this.readString(), line, col };
        }

        if (ch === "'") return { type: 'char', value: this.readChar(), line, col };

        for (const op of OPERATORS) {
            if (this.src.startsWith(op, this.i)) {
                for (let k = 0; k < op.length; k++) this.advance();
                return { type: 'op', value: op, line, col };
            }
        }

        this.error(`illegal character: '${ch}'`);
        return null;
    }

    tokenize() {
        const tokens = [];
        for (;;) {
            const tok = this.next();
            tokens.push(tok);
            if (tok.type === 'eof') break;
        }
        return tokens;
    }
}

/** Analiza el código fuente y devuelve la lista de tokens. */
export function tokenize(source) {
    return new Lexer(source).tokenize();
}
