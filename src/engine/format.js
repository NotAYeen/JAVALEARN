/* Formato numérico y printf compatibles con java.lang.String / java.io.PrintStream.
   Objetivo: reproducir exactamente la salida de JDK 17 para los casos que usan
   las misiones (ver scripts/validate-levels.mjs, que contrasta con `java` real). */

/* ---------- Dígitos decimales más cortos que hacen round-trip ---------- */
function decimalParts(abs) {
    for (let p = 1; p <= 17; p++) {
        if (Number(abs.toPrecision(p)) === abs) {
            const [mant, expStr] = abs.toExponential(p - 1).split('e');
            return { digits: mant.replace('.', '').replace('-', ''), exp: parseInt(expStr, 10) };
        }
    }
    const [mant, expStr] = abs.toExponential(16).split('e');
    return { digits: mant.replace('.', '').replace('-', ''), exp: parseInt(expStr, 10) };
}

/** Equivalente a Double.toString(double) en JDK 17. */
export function javaDoubleToString(d) {
    if (Number.isNaN(d)) return 'NaN';
    if (d === Infinity) return 'Infinity';
    if (d === -Infinity) return '-Infinity';
    if (d === 0) return Object.is(d, -0) ? '-0.0' : '0.0';

    const neg = d < 0;
    const abs = Math.abs(d);
    const { digits, exp } = decimalParts(abs);
    let out;

    if (abs >= 1e-3 && abs < 1e7) {
        if (exp >= 0) {
            const intPart = digits.slice(0, exp + 1).padEnd(exp + 1, '0');
            const frac = digits.slice(exp + 1);
            out = frac.length ? `${intPart}.${frac}` : `${intPart}.0`;
        } else {
            out = `0.${'0'.repeat(-exp - 1)}${digits}`;
        }
    } else {
        const mant = digits.length > 1 ? `${digits[0]}.${digits.slice(1)}` : `${digits[0]}.0`;
        out = `${mant}E${exp}`;
    }
    return neg ? `-${out}` : out;
}

/** Equivalente a Float.toString(float): mismo criterio, aritmética de precisión simple. */
export function javaFloatToString(f) {
    if (Number.isNaN(f)) return 'NaN';
    if (f === Infinity) return 'Infinity';
    if (f === -Infinity) return '-Infinity';
    if (f === 0) return Object.is(f, -0) ? '-0.0' : '0.0';
    // Reduce a precisión float: el decimal más corto que vuelve a leerse como float32.
    let best = null;
    for (let p = 1; p <= 9; p++) {
        const cand = Number(f.toPrecision(p));
        if (Math.fround(cand) === f) { best = cand; break; }
    }
    return javaDoubleToString(best === null ? f : best);
}

export function javaLongToString(n) {
    if (!Number.isFinite(n)) return n > 0 ? 'Infinity' : '-Infinity';
    // 2^63 no es representable en un number: cubrimos los extremos de long.
    if (n === 9223372036854775808) return '9223372036854775807';
    if (n === -9223372036854775808) return '-9223372036854775808';
    return Number.isInteger(n) ? String(n) : javaDoubleToString(n);
}

const RADIX_DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

export function javaIntegerToString(n, radix = 10) {
    if (radix === 10) return javaLongToString(n);
    if (n < 0) return '-' + javaIntegerToString(-n, radix);
    if (n === 0) return '0';
    let out = '';
    let v = Math.floor(n);
    while (v > 0) {
        out = RADIX_DIGITS[v % radix] + out;
        v = Math.floor(v / radix);
    }
    return out;
}

export function javaCharToString(code) {
    return String.fromCharCode(code);
}

export function javaBooleanToString(b) {
    return b ? 'true' : 'false';
}

/* ---------- String.format / System.out.printf (locale fijo en-US) ---------- */

/**
 * Redondea la cadena de dígitos a `keep` posiciones con HALF_UP (la semántica de
 * Java para %f, %e y %g), devolviendo además si el redondeo desborda la mantisa.
 */
function roundDigits(digits, keep) {
    if (digits.length <= keep) return { str: digits.padEnd(keep, '0'), carry: false };
    const head = digits.slice(0, keep);
    const next = digits.charCodeAt(keep) - 48;
    if (!(next >= 5)) return { str: head, carry: false };
    const arr = head.split('');
    let i = arr.length - 1;
    let carry = true;
    while (carry && i >= 0) {
        if (arr[i] === '9') { arr[i] = '0'; i--; } else { arr[i] = String(Number(arr[i]) + 1); carry = false; }
    }
    return { str: (carry ? '1' : '') + arr.join(''), carry };
}

/** Formato %f de Java: valor con exactamente `precision` decimales (por defecto 6). */
export function javaFixed(n, precision) {
    if (Number.isNaN(n)) return 'NaN';
    if (!Number.isFinite(n)) return n > 0 ? 'Infinity' : '-Infinity';
    const p = precision === null || precision === undefined ? 6 : precision;
    const neg = n < 0 || Object.is(n, -0);
    const abs = Math.abs(n);
    if (abs === 0) return (neg ? '-' : '') + (p > 0 ? `0.${'0'.repeat(p)}` : '0');
    const { digits, exp } = decimalParts(abs);
    // `exp + 1` es la cantidad de dígitos enteros; si es <= 0 hay ceros delante.
    const intRaw = exp + 1;
    const intDigits = Math.max(1, intRaw);
    const all = intRaw > 0
        ? digits.slice(0, intRaw).padEnd(intRaw, '0') + digits.slice(intRaw)
        : `0${'0'.repeat(-intRaw)}${digits}`;
    const { str } = roundDigits(all, intDigits + p);
    const intPart = str.slice(0, Math.max(0, str.length - p)).replace(/^$/, '0') || '0';
    const fracPart = p > 0 ? str.slice(Math.max(0, str.length - p)).padStart(p, '0') : '';
    return (neg ? '-' : '') + intPart + (p > 0 ? '.' + fracPart : '');
}

/** Formato %e de Java: mantisa con `precision` decimales y exponente de al menos dos dígitos. */
export function javaSci(n, precision) {
    if (Number.isNaN(n)) return 'NaN';
    if (!Number.isFinite(n)) return n > 0 ? 'Infinity' : '-Infinity';
    const p = precision === null || precision === undefined ? 6 : precision;
    const neg = n < 0 || Object.is(n, -0);
    const abs = Math.abs(n);
    if (abs === 0) return (neg ? '-' : '') + `0.${'0'.repeat(p)}e+00`;
    const { digits, exp } = decimalParts(abs);
    const { str, carry } = roundDigits(digits, p + 1);
    const e = exp + (carry ? 1 : 0);
    // Si el redondeo desborda la mantisa (9.99 -> 10.0), el primer dígito pasa a ser entero.
    const mant = p > 0 ? `${str[0]}.${str.slice(1).padEnd(p, '0')}` : (carry ? str[0] : str);
    const sign = e < 0 ? '-' : '+';
    return (neg ? '-' : '') + mant + 'e' + sign + String(Math.abs(e)).padStart(2, '0');
}

/**
 * Conversión %g de Java: `precision` cifras significativas, notación exponencial si
 * exp < -4 o exp >= precision. Java 17 no elimina los ceros finales en la práctica,
 * así que conservamos todos los decimales que pide la precisión.
 */
export function javaGeneral(n, precision) {
    if (Number.isNaN(n)) return 'NaN';
    if (!Number.isFinite(n)) return n > 0 ? 'Infinity' : '-Infinity';
    const p = precision === null || precision === undefined ? 6 : (precision === 0 ? 1 : precision);
    const neg = n < 0 || Object.is(n, -0);
    const abs = Math.abs(n);
    if (abs === 0) {
        const frac = '0'.repeat(Math.max(0, p - 1));
        return (neg ? '-' : '') + (frac ? `0.${frac}` : '0');
    }
    const { exp } = decimalParts(abs);
    const body = (exp < -4 || exp >= p)
        ? javaSci(abs, p - 1)
        : javaFixed(abs, Math.max(0, p - 1 - exp));
    return (neg ? '-' : '') + body;
}

function formatOne(conversion, flags, width, precision, arg, toText, argIndex) {
    const leftAlign = flags.includes('-');
    const plusSign = flags.includes('+');
    const spaceSign = flags.includes(' ');
    const zeroPad = flags.includes('0');
    const grouping = flags.includes(',');
    let body = '';
    let sign = '';

    const applyWidth = (str) => {
        if (!width || str.length >= width) return str;
        const padLen = width - str.length;
        if (leftAlign) return str + ' '.repeat(padLen);
        if (zeroPad) {
            // El relleno con ceros se aplica después del signo (y del prefijo 0x).
            const m = /^([-+ ]?)(0[xX])?(.*)$/.exec(str);
            return m[1] + (m[2] || '') + m[3].padStart(m[3].length + padLen, '0');
        }
        return ' '.repeat(padLen) + str;
    };

    switch (conversion) {
        case 'd': {
            const n = Math.trunc(Number(arg));
            if (n < 0) sign = '-';
            else if (plusSign) sign = '+';
            else if (spaceSign) sign = ' ';
            body = javaIntegerToString(Math.abs(n));
            if (grouping) body = body.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            break;
        }
        case 'f': {
            const n = Number(arg);
            if (n < 0 || Object.is(n, -0)) sign = '-';
            else if (plusSign) sign = '+';
            else if (spaceSign) sign = ' ';
            body = javaFixed(Math.abs(n), precision);
            if (grouping) {
                const [ip, fp] = body.split('.');
                body = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fp ? '.' + fp : '');
            }
            break;
        }
        case 'e': {
            const n = Number(arg);
            if (n < 0 || Object.is(n, -0)) sign = '-';
            else if (plusSign) sign = '+';
            else if (spaceSign) sign = ' ';
            body = javaSci(Math.abs(n), precision);
            break;
        }
        case 'g': {
            const n = Number(arg);
            body = javaGeneral(n, precision);
            if (n >= 0) {
                if (plusSign) sign = '+';
                else if (spaceSign) sign = ' ';
            }
            if (grouping) {
                const [ip, fp] = body.split('.');
                body = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fp !== undefined ? '.' + fp : '');
            }
            break;
        }
        case 'x':
            body = javaIntegerToString(Math.trunc(Number(arg)), 16);
            if (flags.includes('#') && body !== '0') body = `0x${body}`;
            break;
        case 'X':
            body = javaIntegerToString(Math.trunc(Number(arg)), 16).toUpperCase();
            if (flags.includes('#') && body !== '0') body = `0X${body}`;
            break;
        case 'o':
            body = javaIntegerToString(Math.trunc(Number(arg)), 8);
            if (flags.includes('#') && body !== '0') body = `0${body}`;
            break;
        case 'b': {
            if (typeof arg === 'boolean') body = arg ? 'true' : 'false';
            else body = (Math.trunc(Number(arg)) !== 0).toString();
            break;
        }
        case 'c':
            body = typeof arg === 'number' ? javaCharToString(arg) : toText(arg, argIndex);
            break;
        case 'n':
            return '\n';
        case 's':
        case 'S': {
            body = arg === null || arg === undefined ? 'null' : toText(arg, argIndex);
            if (precision !== null && precision < body.length) body = body.slice(0, precision);
            if (conversion === 'S') body = body.toUpperCase();
            break;
        }
        case '%':
            return '%'.repeat(width || 1);
        default:
            body = toText(arg, argIndex);
    }
    return applyWidth(sign + body);
}

const FORMAT_RE = /%(?<arg>\d+\$)?(?<flags>[-#+ 0,(]*)(?<width>\d+)?(?:\.(?<prec>\d+))?(?<conv>[a-zA-Z%n%])/g;

/**
 * Implementa String.format(fmt, args...) con el subconjunto usado en las misiones.
 * `toText(valor, indice)` debe devolver el texto que Java produciría para ese argumento.
 */
export function javaFormat(fmt, args, toText) {
    const text = toText || ((v) => (v === null || v === undefined ? 'null' : String(v)));
    let out = '';
    let argIndex = 0;
    let last = 0;
    let m;
    FORMAT_RE.lastIndex = 0;
    while ((m = FORMAT_RE.exec(fmt)) !== null) {
        out += fmt.slice(last, m.index);
        last = FORMAT_RE.lastIndex;
        const g = m.groups;
        if (g.conv === '%') { out += '%'; continue; }
        if (g.conv === 'n') { out += '\n'; continue; }
        if (g.arg) argIndex = parseInt(g.arg, 10) - 1;
        const index = argIndex;
        const arg = args[argIndex++];
        out += formatOne(g.conv, g.flags || '', g.width ? parseInt(g.width, 10) : null,
            g.prec !== undefined ? parseInt(g.prec, 10) : null, arg, text, index);
    }
    out += fmt.slice(last);
    return out;
}
