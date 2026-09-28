import { LEVELS } from './levels.js';
import { JavaEditor } from './editor.js';
import { JavaRunner } from './JavaRunner.js';
import { compareOutput } from './compare.js';
import { JavaDocs } from './docs.js';
import { Storage } from './storage.js';
import Sortable from 'sortablejs';

const $ = (id) => document.getElementById(id);
const DIFFICULTY_ORDER = ['Básico', 'Intermedio', 'Avanzado', 'Experto'];
const MODE_ICON = { 'Terminal': '💻', 'Depuración': '🔧', 'Auditoría': '🔍', 'Ensamblaje': '🧩' };
const SPECIAL_MODES = ['Auditoría', 'Ensamblaje'];

export class App {
    constructor() {
        this.levelIndex = 0;
        this.currentLevel = null;
        this.editor = null;
        this.engine = null;
        this.running = false;
        this.theme = 'dark';
        this.lastFocused = null;
        this.auditSolved = false;
        this.dndOrder = [];
        this.dndSolved = false;
        this.dndSortable = null;
        this._modalKeyHandler = null;
        this._modalOnOk = null;
        this._modalOnNext = null;
        this._modalOnCancel = null;
    }

    /* ============================================================
       INIT
       ============================================================ */
    init() {
        this.loadTheme();
        this.editor = new JavaEditor();
        this.applyTheme(this.theme);

        this.engine = new JavaRunner((status) => {
            const el = $('java-status');
            if (el) el.textContent = status;
        });
        this.engine.init();

        this.bindEvents();
        this.buildSelector();
        this.renderDocs();

        const saved = Storage.getItem('java_sim_current_level', '0');
        let startIndex = parseInt(saved, 10);
        if (isNaN(startIndex) || startIndex < 0 || startIndex >= LEVELS.length) startIndex = 0;
        this.loadLevel(startIndex);
    }

    /* ============================================================
       TEMA
       ============================================================ */
    applyTheme(theme) {
        const dark = theme !== 'light';
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';

        const icon = $('theme-icon');
        if (icon) icon.className = dark ? 'ph ph-moon' : 'ph ph-sun';

        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', dark ? '#1e1e1e' : '#eef0f3');

        if (this.editor) this.editor.setTheme(dark);
    }

    loadTheme() {
        let stored = null;
        try { stored = localStorage.getItem('java_sim_theme'); } catch (e) {}

        if (!stored) {
            stored = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
        }
        this.theme = stored === 'light' ? 'light' : 'dark';
    }

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        Storage.setItem('java_sim_theme', this.theme);
        this.applyTheme(this.theme);
    }

    /* ============================================================
       EVENTOS
       ============================================================ */
    bindEvents() {
        $('btn-theme-toggle').addEventListener('click', () => this.toggleTheme());
        $('btn-settings').addEventListener('click', () => this.showSettings());
        $('btn-contact').addEventListener('click', () => this.showContact());
        $('btn-run').addEventListener('click', () => this.run());
        $('btn-reset').addEventListener('click', () => this.confirmResetLevel());
        $('btn-hint').addEventListener('click', () => this.showHint());
        $('btn-solution').addEventListener('click', () => this.revealSolution());
        $('dnd-verify').addEventListener('click', () => this.verifyDnd());
        $('toggle-hints-btn').addEventListener('click', () => this.toggleHints());
        $('db-selector').addEventListener('change', (e) => this.loadLevel(parseInt(e.target.value, 10)));

        $('retro-modal-ok').addEventListener('click', () => {
            const cb = this._modalOnOk;
            this.closeModal();
            if (cb) cb();
        });
        $('retro-modal-cancel').addEventListener('click', () => {
            const cb = this._modalOnCancel;
            this.closeModal();
            if (cb) cb();
        });
        $('retro-modal-next').addEventListener('click', () => {
            const cb = this._modalOnNext;
            this.closeModal();
            if (cb) cb();
        });
        $('retro-modal-x').addEventListener('click', () => this.closeModal());
        $('retro-modal-overlay').addEventListener('click', (e) => {
            if (e.target === $('retro-modal-overlay')) this.closeModal();
        });
        $('docs-close').addEventListener('click', () => this.closeDocs());

        this.editor.onchange((code) => {
            if (this.currentLevel && this.currentLevel.modalidad === 'Terminal') {
                Storage.setItem(`java_sim_editor_${this.currentLevel.id_nivel}`, code);
            }
        });

        const wrapMq = window.matchMedia('(max-width: 560px)');
        const applyWrap = () => this.editor.setLineWrapping(wrapMq.matches);
        applyWrap();
        if (typeof wrapMq.addEventListener === 'function') wrapMq.addEventListener('change', applyWrap);

        this.setupResizer();
        this.setupTabs();

        document.addEventListener('click', (e) => {
            const target = e.target.closest('.docs-item');
            if (target) {
                const item = this.findDocItem(target.dataset.doc);
                if (item) this.showDoc(item);
            }
        });

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.run();
            }
        });
    }

    setupResizer() {
        const resizer = $('vertical-resizer');
        const results = $('results-panel');
        let dragging = false;

        resizer.addEventListener('pointerdown', (e) => {
            dragging = true;
            e.preventDefault();
            resizer.classList.add('resizing');
        });
        document.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            const bounds = $('layout-mid').getBoundingClientRect();
            const resizerRect = resizer.getBoundingClientRect();
            const newHeight = results.getBoundingClientRect().height + (resizerRect.top - e.clientY) * -1;
            const min = 80;
            const max = bounds.bottom - $('editor-container').getBoundingClientRect().top - min;
            results.style.height = `${Math.max(min, Math.min(newHeight, max))}px`;
        });
        document.addEventListener('pointerup', () => {
            dragging = false;
            resizer.classList.remove('resizing');
        });
        resizer.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    }

    setupTabs() {
        // En movil solo se ve un panel a la vez: el mapa es explicito porque los
        // ids de los paneles no siguen el nombre de la pestana.
        const tabs = [
            { name: 'editor', layout: 'layout-mid' },
            { name: 'schema', layout: 'layout-left' },
            { name: 'mission', layout: 'layout-right' }
        ];

        this.selectTab = (active) => {
            tabs.forEach(({ name, layout }) => {
                const panel = $(layout);
                const btn = $(`tab-btn-${name}`);
                const isActive = name === active;
                if (panel) {
                    panel.classList.toggle('mobile-show-panel', isActive);
                    panel.classList.toggle('mobile-hide-panel', !isActive);
                }
                if (btn) {
                    btn.classList.toggle('active', isActive);
                    btn.setAttribute('aria-selected', String(isActive));
                }
            });
        };

        tabs.forEach(({ name }) => {
            const btn = $(`tab-btn-${name}`);
            if (btn) btn.addEventListener('click', () => this.selectTab(name));
        });
    }

    /* ============================================================
       PROGRESO / SELECTOR
       ============================================================ */
    getCompleted() {
        try {
            return JSON.parse(Storage.getItem('java_sim_completed', '[]') || '[]');
        } catch (e) {
            return [];
        }
    }

    updateProgress() {
        const badge = $('progress-badge');
        if (badge) badge.textContent = `${this.getCompleted().length} / ${LEVELS.length}`;
    }

    buildSelector() {
        const select = $('db-selector');
        const completed = this.getCompleted();
        select.innerHTML = '';

        DIFFICULTY_ORDER.forEach((difficulty) => {
            const levels = LEVELS.filter((l) => l.dificultad === difficulty);
            if (!levels.length) return;

            const group = document.createElement('optgroup');
            group.label = difficulty;
            levels.forEach((l) => {
                const idx = LEVELS.indexOf(l);
                const opt = document.createElement('option');
                opt.value = String(idx);
                opt.textContent = `${String(idx + 1).padStart(2, '0')}. ${l.title}${completed.includes(l.id_nivel) ? ' ✓' : ''}`;
                group.appendChild(opt);
            });
            select.appendChild(group);
        });

        select.value = String(this.levelIndex);
        this.updateProgress();
    }

    /* ============================================================
       CARGA DE NIVEL
       ============================================================ */
    loadLevel(index) {
        this.levelIndex = index;
        this.currentLevel = LEVELS[index];
        if (!this.currentLevel) return;

        $('db-selector').value = String(index);
        Storage.setItem('java_sim_current_level', String(index));
        document.title = `${String(index + 1).padStart(2, '0')}. ${this.currentLevel.title} · JavaLearn`;

        this.renderMission();
        this.renderConcepts();
        this.renderResources();
        this.renderExpected();
        this.renderEnv();
        this.editor.updateHints(this.currentLevel.keywords || []);
        this.setupMode();
        this.buildSelector();
    }

    setupMode() {
        this.hideResults();
        this.clearDiff();
        this.auditSolved = false;
        this.dndSolved = false;

        const mode = this.currentLevel.modalidad;
        const isSpecial = SPECIAL_MODES.includes(mode);

        $('audit-panel').classList.toggle('hidden', mode !== 'Auditoría');
        $('dnd-panel').classList.toggle('hidden', mode !== 'Ensamblaje');
        $('editor-container').classList.toggle('hidden', isSpecial);
        $('vertical-resizer').classList.toggle('hidden', isSpecial);
        $('btn-reset').textContent = isSpecial ? 'Reiniciar' : 'Restablecer Código';
        $('btn-solution').textContent = mode === 'Auditoría' ? 'Ver Explicación' : 'Ver Solución';
        $('btn-solution').setAttribute('aria-label',
            mode === 'Auditoría' ? 'Ver la explicación de la línea con fallo' : 'Ver Solución sugerida del nivel');

        if (mode === 'Depuración') {
            this.editor.setValue(this.currentLevel.query_defectuoso || '');
        } else if (!isSpecial) {
            const saved = Storage.getItem(`java_sim_editor_${this.currentLevel.id_nivel}`);
            this.editor.setValue(saved != null ? saved : (this.currentLevel.init_code || ''));
        }

        if (mode === 'Auditoría') this.setupAudit();
        if (mode === 'Ensamblaje') this.setupDnd();

        if (!isSpecial) this.editor.focus();
    }

    /* ============================================================
       AUDITORÍA: señalar la línea con el fallo
       ============================================================ */
    setupAudit() {
        const list = $('audit-code');
        list.innerHTML = '';
        this.auditSolved = false;
        $('audit-feedback').textContent = '';
        $('audit-feedback').className = 'audit-feedback';
        $('audit-hint').textContent = 'Haz clic en la línea que provoca el fallo. Puedes ejecutar el programa para observar su comportamiento.';

        (this.currentLevel.audit_tokens || []).forEach((line, index) => {
            const li = document.createElement('li');
            li.className = 'audit-line';
            li.dataset.index = String(index);
            li.tabIndex = 0;
            li.setAttribute('role', 'option');
            li.setAttribute('aria-selected', 'false');

            const num = document.createElement('span');
            num.className = 'audit-line-num';
            num.textContent = String(index + 1);

            const code = document.createElement('code');
            code.className = 'audit-line-code';
            code.textContent = line === '' ? ' ' : line;

            li.appendChild(num);
            li.appendChild(code);
            li.addEventListener('click', () => this.checkAuditLine(index));
            li.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.checkAuditLine(index);
                }
            });
            list.appendChild(li);
        });
    }

    checkAuditLine(index) {
        if (this.auditSolved) return;
        const list = $('audit-code');
        const items = Array.from(list.querySelectorAll('.audit-line'));
        const feedback = $('audit-feedback');

        if (index === this.currentLevel.token_error_index) {
            this.auditSolved = true;
            items.forEach((li) => {
                li.classList.remove('audit-wrong');
                li.classList.add('audit-locked');
            });
            items[index].classList.add('audit-correct');
            items[index].setAttribute('aria-selected', 'true');
            feedback.className = 'audit-feedback audit-ok';
            feedback.textContent = this.currentLevel.explicacion || 'Línea correcta.';
            this.storageLevelComplete();
            this.buildSelector();

            const nextIndex = this.levelIndex + 1 < LEVELS.length ? this.levelIndex + 1 : -1;
            const opts = { okLabel: 'Cerrar' };
            if (nextIndex >= 0) {
                opts.nextLabel = 'Nivel siguiente →';
                opts.onNext = () => this.loadLevel(nextIndex);
            }
            this.showModal('¡Auditoría resuelta!', 'Has identificado la línea responsable del fallo.', opts);
            return;
        }

        items.forEach((li) => li.classList.remove('audit-wrong'));
        items[index].classList.add('audit-wrong');
        feedback.className = 'audit-feedback audit-bad';
        feedback.textContent = 'Esa línea no es la culpable. Vuelve a revisar el programa.';
    }

    /* ============================================================
       ENSAMBLAJE: reordenar bloques
       ============================================================ */
    setupDnd() {
        const slots = $('dnd-slots');
        slots.innerHTML = '';
        $('dnd-feedback').textContent = '';
        $('dnd-feedback').className = 'dnd-feedback';
        this.dndSolved = false;

        const blocks = this.currentLevel.dnd_blocks || this.assembleDndBlocks();
        this.dndOrder = this.shuffle(blocks.map((code, index) => ({ code, index })));

        this.dndOrder.forEach((block) => this.renderDndSlot(block));

        if (this.dndSortable) {
            this.dndSortable.destroy();
            this.dndSortable = null;
        }
        if (typeof Sortable === 'function') {
            this.dndSortable = Sortable.create(slots, {
                animation: 150,
                handle: '.dnd-block',
                ghostClass: 'dnd-ghost',
                onEnd: () => this.syncDndOrder()
            });
        }
    }

    /** Deriva las piezas del código solución cuando el nivel no las declara. */
    assembleDndBlocks() {
        const lines = (this.currentLevel.solution_code || '').replace(/\n$/, '').split('\n');
        return lines.map((line) => (line.trim() === '' ? '' : line));
    }

    shuffle(list) {
        const copy = list.slice();
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    renderDndSlot(block) {
        const li = document.createElement('li');
        li.className = 'dnd-slot';
        li.dataset.index = String(block.index);

        const handle = document.createElement('div');
        handle.className = 'dnd-block';
        handle.tabIndex = 0;
        handle.textContent = block.code === '' ? ' ' : block.code;

        const up = document.createElement('button');
        up.type = 'button';
        up.className = 'dnd-move';
        up.setAttribute('aria-label', 'Subir pieza');
        up.textContent = '↑';
        up.addEventListener('click', () => this.moveDndBlock(li, -1));

        const down = document.createElement('button');
        down.type = 'button';
        down.className = 'dnd-move';
        down.setAttribute('aria-label', 'Bajar pieza');
        down.textContent = '↓';
        down.addEventListener('click', () => this.moveDndBlock(li, 1));

        li.appendChild(handle);
        li.appendChild(up);
        li.appendChild(down);
        $('dnd-slots').appendChild(li);
    }

    moveDndBlock(li, delta) {
        const slots = $('dnd-slots');
        if (delta < 0 && li.previousElementSibling) {
            slots.insertBefore(li, li.previousElementSibling);
        } else if (delta > 0 && li.nextElementSibling) {
            slots.insertBefore(li.nextElementSibling, li);
        }
        this.syncDndOrder();
    }

    syncDndOrder() {
        this.dndOrder = Array.from($('dnd-slots').querySelectorAll('.dnd-slot'))
            .map((li) => ({ code: li.querySelector('.dnd-block').textContent, index: parseInt(li.dataset.index, 10) }));
    }

    dndCode() {
        return this.dndOrder.map((b) => (b.code === ' ' ? '' : b.code)).join('\n');
    }

    verifyDnd() {
        if (this.dndSolved) return;
        this.syncDndOrder();
        const expected = (this.currentLevel.dnd_blocks || this.assembleDndBlocks());
        const wanted = expected.map((_, i) => i);
        const ok = this.dndOrder.length === expected.length
            && this.dndOrder.every((b, i) => b.index === wanted[i]);
        const feedback = $('dnd-feedback');

        if (!ok) {
            feedback.className = 'dnd-feedback dnd-bad';
            feedback.textContent = 'El programa aún no es correcto. Revisa el orden de las piezas.';
            return;
        }

        this.dndSolved = true;
        Array.from($('dnd-slots').querySelectorAll('.dnd-slot')).forEach((li) => li.classList.add('dnd-correct'));
        feedback.className = 'dnd-feedback dnd-ok';
        feedback.textContent = '¡Programa ensamblado correctamente!';
        this.storageLevelComplete();
        this.buildSelector();

        const nextIndex = this.levelIndex + 1 < LEVELS.length ? this.levelIndex + 1 : -1;
        const opts = { okLabel: 'Cerrar' };
        if (nextIndex >= 0) {
            opts.nextLabel = 'Nivel siguiente →';
            opts.onNext = () => this.loadLevel(nextIndex);
        }
        this.showModal('¡Ensamblaje completado!', 'Las piezas forman un programa válido.', opts);
    }

    /** Código que debe ejecutarse según la modalidad del nivel. */
    runnableCode() {
        const mode = this.currentLevel.modalidad;
        if (mode === 'Auditoría') return (this.currentLevel.audit_tokens || []).join('\n');
        if (mode === 'Ensamblaje') return this.dndCode();
        return this.editor.getValue();
    }

    confirmResetLevel() {
        this.showModal('Reiniciar Nivel', 'Se restablecerá el código de este nivel a su estado inicial. ¿Continuar?', {
            okLabel: 'Reiniciar',
            showCancel: true,
            onOk: () => this.resetLevel()
        });
    }

    resetLevel() {
        Storage.removeItem(`java_sim_editor_${this.currentLevel.id_nivel}`);
        this.setupMode();
        if (!SPECIAL_MODES.includes(this.currentLevel.modalidad)) this.editor.focus();
    }

    /* ============================================================
       RENDER
       ============================================================ */
    renderMission() {
        $('mission-briefing').textContent = this.currentLevel.briefing_mision;
        $('mobile-mission-briefing').textContent = `${this.levelIndex + 1}. ${this.currentLevel.title}`;
    }

    renderConcepts() {
        const list = $('conceptos-list');
        list.innerHTML = '';
        (this.currentLevel.conceptos || []).forEach((c) => {
            const li = document.createElement('li');
            li.textContent = c;
            list.appendChild(li);
        });
    }

    renderResources() {
        const list = $('resources-list');
        list.innerHTML = '';
        (this.currentLevel.pistas || []).forEach((p, i) => {
            const li = document.createElement('li');
            li.textContent = `${i + 1}. ${p}`;
            list.appendChild(li);
        });

        const btn = $('toggle-hints-btn');
        btn.textContent = 'Mostrar';
        btn.setAttribute('aria-expanded', 'false');
        list.style.display = 'none';
    }

    toggleHints() {
        const list = $('resources-list');
        const btn = $('toggle-hints-btn');
        const hidden = list.style.display === 'none';
        list.style.display = hidden ? 'block' : 'none';
        btn.textContent = hidden ? 'Ocultar' : 'Mostrar';
        btn.setAttribute('aria-expanded', String(!hidden));
    }

    renderExpected() {
        const panel = $('expected-panel');
        const out = this.currentLevel.expected_output || '';
        $('expected-output').textContent = out;
        panel.style.display = out ? 'block' : 'none';
    }

    renderEnv() {
        const mode = this.currentLevel.modalidad;
        const icon = MODE_ICON[mode] || '💻';
        $('env-info-content').innerHTML = `
            <div class="env-row">Motor: Java (intérprete propio en JS)</div>
            <div class="env-row">Verificado contra: OpenJDK 17</div>
            <div class="env-row">Modalidad: ${icon} ${mode}</div>
            <div class="env-row">Nivel: ${this.levelIndex + 1} / ${LEVELS.length}</div>
            <div class="env-row">Dificultad: ${this.currentLevel.dificultad}</div>
        `;
    }

    renderDocs() {
        const list = $('docs-list');
        list.innerHTML = '';
        JavaDocs.forEach((cat) => {
            const li = document.createElement('li');
            li.style.margin = '0 0 8px 0';
            li.innerHTML = `<strong style="color: var(--mono-cyan);">${cat.category}</strong><ul style="margin-top:4px; padding-left:14px;">${cat.items.map((it) =>
                `<li><button class="docs-item" data-doc="${it.name}">${it.name}</button></li>`
            ).join('')}</ul>`;
            list.appendChild(li);
        });
    }

    findDocItem(name) {
        for (const cat of JavaDocs) {
            const found = cat.items.find((i) => i.name === name);
            if (found) return found;
        }
        return null;
    }

    showDoc(item) {
        $('docs-item-name').textContent = item.name;
        $('docs-item-desc').textContent = item.desc;
        $('docs-item-example').textContent = item.example;
        $('docs-window').classList.remove('hidden');
        const close = $('docs-close');
        if (close) close.focus();
    }

    closeDocs() {
        $('docs-window').classList.add('hidden');
        this.editor.focus();
    }

    /* ============================================================
       EJECUCIÓN / RESULTADOS
       ============================================================ */
    async run() {
        if (this.running) return;

        const code = this.runnableCode();
        if (!code || !code.trim()) {
            this.showModal('Práctica Java', 'Escribe tu código antes de ejecutar.', { okLabel: 'Aceptar' });
            return;
        }

        this.running = true;
        const runBtn = $('btn-run');
        runBtn.disabled = true;

        try {
            this.showResults();
            $('results-output').textContent = 'Ejecutando…';
            $('results-output').classList.remove('java-error');
            this.clearDiff();

            const result = await this.engine.run(code);
            const stdout = result.stdout || '';
            const stderr = [result.stderr || '', (result.error && result.error.message) || ''].join('');

            if (!result.ok) {
                $('results-output').textContent = stdout + stderr || 'Error de ejecución.';
                $('results-output').classList.add('java-error');
                this.showModal('Error de Ejecución', 'Tu programa no terminó correctamente. Revisa el mensaje en los resultados.', { okLabel: 'Aceptar' });
                return;
            }

            $('results-output').classList.remove('java-error');
            $('results-output').textContent = stdout || '(Sin salida)';
            this.checkAnswer(stdout);
        } finally {
            this.running = false;
            runBtn.disabled = false;
        }
    }

    showResults() {
        $('results-placeholder').style.display = 'none';
        $('results-content').style.display = 'block';
    }

    hideResults() {
        $('results-placeholder').style.display = 'block';
        $('results-content').style.display = 'none';
        $('results-output').textContent = '';
        $('results-output').classList.remove('java-error');
    }

    renderDiff(actual, expected) {
        const wrap = $('results-content');
        let compare = wrap.querySelector('.output-compare');
        if (!compare) {
            compare = document.createElement('div');
            compare.className = 'output-compare';
            wrap.appendChild(compare);
        }
        compare.innerHTML = `
            <span class="compare-status status-bad" role="status">✗ No coincide con la salida esperada</span>
            <div class="compare-block compare-bad"><div class="compare-block-label">Obtenido</div><pre></pre></div>
            <div class="compare-block compare-ok"><div class="compare-block-label">Esperado</div><pre></pre></div>
        `;
        compare.querySelectorAll('pre')[0].textContent = actual || '(sin salida)';
        compare.querySelectorAll('pre')[1].textContent = expected || '(vacío)';
    }

    clearDiff() {
        const compare = $('results-content').querySelector('.output-compare');
        if (compare) compare.remove();
    }

    checkAnswer(stdout) {
        const { pass, actual, expected } = compareOutput(stdout, this.currentLevel.expected_output);

        if (SPECIAL_MODES.includes(this.currentLevel.modalidad)) {
            if (pass) {
                this.renderDiff(actual, expected);
                this.showModal(this.currentLevel.modalidad === 'Auditoría' ? 'Comportamiento Confirmado' : 'Programa Correcto',
                    this.currentLevel.explicacion || 'El programa se ejecuta correctamente.', { okLabel: 'Aceptar' });
            } else {
                this.renderDiff(actual, expected);
            }
            return;
        }

        if (pass) {
            this.clearDiff();
            this.storageLevelComplete();
            this.buildSelector();

            const nextIndex = this.levelIndex + 1 < LEVELS.length ? this.levelIndex + 1 : -1;
            const opts = { okLabel: 'Continuar' };
            if (nextIndex >= 0) {
                opts.nextLabel = 'Nivel siguiente →';
                opts.onNext = () => this.loadLevel(nextIndex);
            }
            this.showModal('¡Misión Completada!', 'Excelente, agente. Tu programa produce exactamente la salida esperada.', opts);
        } else {
            this.renderDiff(actual, expected);
            this.showModal('Salida Incorrecta', 'Tu programa se ejecutó pero la salida no coincide con la esperada. En los resultados verás ambos bloques para compararlos.', { okLabel: 'Reintentar' });
        }
    }

    storageLevelComplete() {
        const completados = this.getCompleted();
        if (!completados.includes(this.currentLevel.id_nivel)) {
            completados.push(this.currentLevel.id_nivel);
            Storage.setItem('java_sim_completed', JSON.stringify(completados));
        }
    }

    /* ============================================================
       PISTAS / SOLUCIÓN / AJUSTES
       ============================================================ */
    showHint() {
        const pistas = this.currentLevel.pistas || [];
        const hint = pistas.length ? pistas[0] : 'No hay pistas extras para este nivel.';
        this.showModal('Pista', hint, { okLabel: 'Aceptar' });
    }

    revealSolution() {
        const mode = this.currentLevel.modalidad;

        if (mode === 'Auditoría') {
            const items = Array.from($('audit-code').querySelectorAll('.audit-line'));
            items.forEach((li) => li.classList.remove('audit-wrong'));
            const target = items[this.currentLevel.token_error_index];
            if (target) {
                target.classList.add('audit-correct');
                target.setAttribute('aria-selected', 'true');
            }
            $('audit-feedback').className = 'audit-feedback audit-ok';
            $('audit-feedback').textContent = `Línea ${this.currentLevel.token_error_index + 1}: ${this.currentLevel.explicacion || ''}`;
            this.showModal(`Explicación - ${this.currentLevel.title}`,
                `La línea ${this.currentLevel.token_error_index + 1} provoca el fallo. ${this.currentLevel.explicacion || ''}`.trim(),
                { okLabel: 'Entendido' });
            return;
        }

        if (mode === 'Ensamblaje') {
            this.syncDndOrder();
            this.dndOrder.sort((a, b) => a.index - b.index);
            $('dnd-slots').innerHTML = '';
            this.dndOrder.forEach((block) => this.renderDndSlot(block));
            $('dnd-feedback').className = 'dnd-feedback dnd-ok';
            $('dnd-feedback').textContent = 'Programa ordenado según la solución.';
            this.showModal(`Solución - ${this.currentLevel.title}`,
                'Las piezas se han colocado en el orden correcto. Pulsa Verificar Programa para comprobarlo.',
                { okLabel: 'Aceptar' });
            return;
        }

        this.editor.setValue(this.currentLevel.solution_code || '');
        this.showModal(`Solución - ${this.currentLevel.title}`, 'Se ha colocado el código solución en el editor. Pulsa Ejecutar para verificar el resultado.', { okLabel: 'Ejecutar Después' });
    }

    showSettings() {
        $('retro-modal-title').textContent = 'Ajustes';
        $('retro-modal-msg').innerHTML = `
            <strong>Simulador JavaLearn</strong><br>
            Motor: intérprete de Java propio en JavaScript, sin WebAssembly.<br>
            Las salidas están verificadas contra OpenJDK 17 real.<br><br>
            <button id="reset-progress-btn" class="nav-btn" style="margin-top:6px;">Restablecer Progreso</button>
        `;
        this.openModal({ okLabel: 'Cerrar' });

        const resetBtn = $('reset-progress-btn');
        if (resetBtn) {
            resetBtn.onclick = () => {
                Storage.removeItem('java_sim_completed');
                Storage.removeItem('java_sim_current_level');
                try {
                    for (let i = 0; i < localStorage.length; i++) {
                        const k = localStorage.key(i);
                        if (k && k.startsWith('java_sim_editor_')) localStorage.removeItem(k);
                    }
                } catch (e) {}
                location.reload();
            };
        }
    }

    showContact() {
        $('retro-modal-title').textContent = 'Contacto';
        $('retro-modal-msg').innerHTML = '¿Encontraste un error en el motor o quieres proponer un desafío Java?<br><br>Proyecto <strong>JavaLearn</strong>, autor <strong>notayeen</strong>.';
        this.openModal({ okLabel: 'Cerrar' });
    }

    /* ============================================================
       MODAL
       ============================================================ */
    showModal(title, msg, opts = {}) {
        $('retro-modal-title').textContent = title;
        $('retro-modal-msg').innerHTML = String(msg)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
        this.openModal(opts);
    }

    openModal(opts = {}) {
        const overlay = $('retro-modal-overlay');
        const ok = $('retro-modal-ok');
        const cancel = $('retro-modal-cancel');
        const next = $('retro-modal-next');

        ok.textContent = opts.okLabel || 'Aceptar';
        cancel.style.display = opts.showCancel === true ? 'inline-block' : 'none';
        next.style.display = opts.nextLabel && opts.onNext ? 'inline-block' : 'none';
        if (opts.nextLabel) next.textContent = opts.nextLabel;

        this._modalOnOk = opts.onOk || null;
        this._modalOnNext = opts.onNext || null;
        this._modalOnCancel = opts.onCancel || null;

        overlay.classList.remove('hidden');
        this.lastFocused = document.activeElement;

        const app = document.querySelector('.app-container');
        const docs = $('docs-window');
        try {
            if (app) app.inert = true;
            if (docs) docs.inert = true;
        } catch (e) {}

        this._modalKeyHandler = (e) => {
            if (e.key === 'Escape') { this.closeModal(); return; }
            if (e.key === 'Tab') this.trapFocus(e);
        };
        document.addEventListener('keydown', this._modalKeyHandler);

        const focusable = this.modalFocusables();
        if (focusable.length) focusable[0].focus();
    }

    modalFocusables() {
        return Array.from($('retro-modal-overlay').querySelectorAll('button, [href], input, select, textarea'))
            .filter((el) => el.getClientRects().length > 0);
    }

    trapFocus(e) {
        const f = this.modalFocusables();
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    closeModal() {
        const overlay = $('retro-modal-overlay');
        if (overlay.classList.contains('hidden')) return;
        overlay.classList.add('hidden');

        const app = document.querySelector('.app-container');
        const docs = $('docs-window');
        try {
            if (app) app.inert = false;
            if (docs) docs.inert = false;
        } catch (e) {}

        if (this._modalKeyHandler) {
            document.removeEventListener('keydown', this._modalKeyHandler);
            this._modalKeyHandler = null;
        }

        if (this.lastFocused && this.lastFocused.focus) {
            setTimeout(() => this.lastFocused.focus(), 0);
        }
    }
}
