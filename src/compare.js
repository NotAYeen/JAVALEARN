export function normalizeOutput(text) {
    if (text == null) return '';
    const fixed = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = fixed.split('\n').map((line) => line.replace(/\s+$/, ''));
    while (lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop();
    }
    return lines.join('\n');
}

export function compareOutput(actual, expected) {
    const a = normalizeOutput(actual);
    const e = normalizeOutput(expected);
    return { pass: a === e, actual: a, expected: e };
}
