const JAVA_KEYWORDS = [
    'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const',
    'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float',
    'for', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new',
    'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp', 'super',
    'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void', 'volatile',
    'while', 'true', 'false', 'null', 'var',
    'System', 'out', 'err', 'println', 'printf', 'String', 'Integer', 'Double', 'Math', 'StringBuilder',
    'List', 'ArrayList', 'Map', 'HashMap', 'Set', 'HashSet', 'Arrays', 'Collections', 'Scanner', 'Random'
];

export class JavaEditor {
    constructor() {
        this.textarea = document.getElementById('java-editor');
        this.editor = null;
        this.currentWords = JAVA_KEYWORDS;
        this.init();
    }

    init() {
        if (typeof CodeMirror !== 'undefined' && this.textarea) {
            this.editor = CodeMirror.fromTextArea(this.textarea, {
                mode: 'text/x-java',
                theme: 'monokai',
                lineNumbers: true,
                indentUnit: 4,
                tabSize: 4,
                smartIndent: true,
                indentWithTabs: false,
                lineWrapping: false,
                autofocus: false,
                extraKeys: {
                    'Ctrl-Space': 'autocomplete'
                },
                hintOptions: { completeSingle: false }
            });
        }

        if (!this.editor) return;

        CodeMirror.registerHelper('hint', 'javaSim', (cm) => {
            const cursor = cm.getCursor();
            const token = cm.getTokenAt(cursor);
            const start = token ? token.start : cursor.ch;
            const end = cursor.ch;
            const prefix = cm.getRange({ line: cursor.line, ch: start }, cursor);
            const lastWord = (prefix.match(/[\w$]+$/) || [''])[0].toLowerCase();

            if (this.currentWords && lastWord.length >= 1) {
                const source = this.currentWords.filter((w) => w.toLowerCase().startsWith(lastWord));
                return {
                    list: source.length ? source : JAVA_KEYWORDS,
                    from: CodeMirror.Pos(cursor.line, start),
                    to: CodeMirror.Pos(cursor.line, end)
                };
            }

            return { list: [], from: CodeMirror.Pos(cursor.line, end), to: CodeMirror.Pos(cursor.line, end) };
        });

        CodeMirror.commands.autocomplete = (cm) => {
            CodeMirror.showHint(cm, { hint: CodeMirror.hint.javaSim });
        };

        this.editor.on('inputRead', (cm) => {
            if (cm.state.completionActive) return;
            const ch = cm.getCursor().ch;
            const last = cm.getLine(cm.getCursor().line).charAt(ch - 1);
            if (/[\w$]/.test(last)) {
                CodeMirror.showHint(cm, { hint: CodeMirror.hint.javaSim });
            }
        });
    }

    setValue(code) {
        if (this.editor) this.editor.setValue(code);
        else if (this.textarea) this.textarea.value = code;
    }

    getValue() {
        return this.editor ? this.editor.getValue() : (this.textarea ? this.textarea.value : '');
    }

    setTheme(dark) {
        if (this.editor) this.editor.setOption('theme', dark ? 'monokai' : 'eclipse');
    }

    setLineWrapping(enabled) {
        if (this.editor) this.editor.setOption('lineWrapping', !!enabled);
    }

    onchange(cb) {
        if (this.editor) this.editor.on('change', () => cb(this.getValue()));
        else if (this.textarea) this.textarea.addEventListener('input', () => cb(this.getValue()));
    }

    updateHints(words) {
        this.currentWords = (words || []).concat(JAVA_KEYWORDS);
    }

    focus() {
        if (this.editor) this.editor.focus();
    }
}
