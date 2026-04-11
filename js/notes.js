/**
 * ================================================================================
 * MÓDULO DE BLOC DE NOTAS — COMPARTIDO ENTRE COLABORADORES
 * ================================================================================
 * Las notas se guardan en el servidor (extended-info.sharedNotes) y son visibles
 * para todos los colaboradores de la promoción.
 * ================================================================================
 */

class NotesManager {
    constructor(storageKey = 'promotionNotes', promotionId = null) {
        // storageKey kept for API compatibility but not used for localStorage
        this.promotionId = promotionId;
        this.notes = [];
        this.editingNoteId = null;
        this._apiBase = window.API_URL || '';
    }

    _token() {
        return localStorage.getItem('token') || '';
    }

    async loadNotes() {
        if (!this.promotionId) return [];
        try {
            const res = await fetch(`${this._apiBase}/api/promotions/${this.promotionId}/shared-notes`, {
                headers: { 'Authorization': `Bearer ${this._token()}` }
            });
            if (!res.ok) throw new Error('fetch failed');
            const data = await res.json();
            this.notes = Array.isArray(data.sharedNotes) ? data.sharedNotes : [];
        } catch (e) {
            console.warn('[NotesManager] Could not load shared notes, falling back to localStorage:', e.message);
            // Fallback: try to recover from old localStorage key
            try {
                const old = localStorage.getItem(`promotionNotes_${this.promotionId}`);
                this.notes = old ? JSON.parse(old) : [];
            } catch (_) { this.notes = []; }
        }
        return this.notes;
    }

    async saveNotesToStorage() {
        if (!this.promotionId) return;
        try {
            await fetch(`${this._apiBase}/api/promotions/${this.promotionId}/shared-notes`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this._token()}`
                },
                body: JSON.stringify({ sharedNotes: this.notes })
            });
        } catch (e) {
            console.error('[NotesManager] Error saving shared notes:', e.message);
        }
    }

    async createNote(text, category = 'note') {
        if (!text || !text.trim()) return null;
        const note = {
            id: Date.now().toString(),
            text: text.trim(),
            category,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            authorName: window._currentUserName || ''
        };
        this.notes.push(note);
        await this.saveNotesToStorage();
        return note;
    }

    async updateNote(noteId, text, category = null) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return null;
        if (text && text.trim()) note.text = text.trim();
        if (category) note.category = category;
        note.updatedAt = new Date().toISOString();
        await this.saveNotesToStorage();
        return note;
    }

    async deleteNote(noteId) {
        const idx = this.notes.findIndex(n => n.id === noteId);
        if (idx === -1) return false;
        this.notes.splice(idx, 1);
        await this.saveNotesToStorage();
        return true;
    }

    getAllNotes() { return [...this.notes]; }
    getNotesByCategory(cat) { return this.notes.filter(n => n.category === cat); }
    getNoteById(id) { return this.notes.find(n => n.id === id) || null; }
    clearAllNotes() { this.notes = []; return this.saveNotesToStorage(); }
    exportNotesAsJSON() { return JSON.stringify(this.notes, null, 2); }
}

/**
 * ================================================================================
 * INTERFAZ DE USUARIO DEL BLOC DE NOTAS
 * ================================================================================
 */

class NotesUI {
    constructor(notesManager, containerId = 'notes-container') {
        this.notesManager = notesManager;
        this.containerId = containerId;
    }

    async init() {
        await this.notesManager.loadNotes();
        this.render();
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const notes = this.notesManager.getAllNotes();

        container.innerHTML = `
            <div class="notes-wrapper">
                <div class="notes-controls mb-3">
                    <div class="d-flex gap-2 flex-wrap align-items-center">
                        <input type="text" class="form-control notes-input" id="notes-input"
                            placeholder="Añade una anotación…" style="flex:1;min-width:200px;"/>
                        <select class="form-select notes-category" id="notes-category" style="min-width:130px;">
                            <option value="note">📝 Nota</option>
                            <option value="reminder">⏰ Recordatorio</option>
                        </select>
                        <button class="btn btn-sm btn-primary" id="notes-add-btn">
                            <i class="bi bi-plus-lg"></i> Añadir
                        </button>
                    </div>
                </div>
                <div class="notes-list" id="notes-list">${this.renderNotesList(notes)}</div>
            </div>
        `;

        this.attachEventListeners();
    }

    renderNotesList(notes) {
        if (!notes.length) return `
            <div class="text-center py-4 text-muted">
                <i class="bi bi-sticky display-6 mb-2 d-block opacity-50"></i>
                <p class="mb-0">Sin notas por el momento. ¡Añade la primera!</p>
            </div>`;
        return notes.map(n => this.renderSingleNote(n)).join('');
    }

    renderSingleNote(note) {
        const icon  = note.category === 'reminder' ? '⏰' : '📝';
        const label = note.category === 'reminder' ? 'Recordatorio' : 'Nota';
        const author = note.authorName ? `<span class="ms-2 text-muted" style="font-size:0.7rem;">· ${this.escapeHtml(note.authorName)}</span>` : '';
        return `
            <div class="note-card" data-note-id="${note.id}">
                <div class="note-header">
                    <div class="note-category">
                        <span class="note-category-badge">${icon} ${label}</span>${author}
                    </div>
                    <div class="note-actions">
                        <button class="note-action-btn note-edit-btn" title="Editar" data-note-id="${note.id}">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button class="note-action-btn note-delete-btn" title="Eliminar" data-note-id="${note.id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="note-content"><p class="note-text">${this.escapeHtml(note.text)}</p></div>
                <div class="note-footer">
                    <small class="note-date"><i class="bi bi-clock-history me-1"></i>${this.formatDateRelative(note.createdAt)}</small>
                </div>
            </div>`;
    }

    attachEventListeners() {
        document.getElementById('notes-add-btn')?.addEventListener('click', () => this.handleAddNote());
        document.getElementById('notes-input')?.addEventListener('keypress', e => {
            if (e.key === 'Enter') this.handleAddNote();
        });
        document.querySelectorAll('.note-edit-btn').forEach(btn =>
            btn.addEventListener('click', e => this.handleEditNote(e.currentTarget.dataset.noteId)));
        document.querySelectorAll('.note-delete-btn').forEach(btn =>
            btn.addEventListener('click', e => this.handleDeleteNote(e.currentTarget.dataset.noteId)));
    }

    async handleAddNote() {
        const input = document.getElementById('notes-input');
        const sel   = document.getElementById('notes-category');
        if (!input || !sel) return;
        const text = input.value.trim();
        if (!text) { this.showToast('Por favor, escribe algo', 'warning'); return; }
        const btn = document.getElementById('notes-add-btn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>'; }
        const note = await this.notesManager.createNote(text, sel.value);
        if (note) {
            input.value = '';
            sel.value = 'note';
            this.render();
            this.showToast('Nota añadida y compartida con el equipo', 'success');
        }
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-plus-lg"></i> Añadir'; }
    }

    async handleEditNote(noteId) {
        const note = this.notesManager.getNoteById(noteId);
        if (!note) return;
        const newText = prompt('Editar nota:', note.text);
        if (newText && newText.trim()) {
            await this.notesManager.updateNote(noteId, newText);
            this.render();
            this.showToast('Nota actualizada', 'success');
        }
    }

    async handleDeleteNote(noteId) {
        if (!confirm('¿Eliminar esta nota?')) return;
        if (await this.notesManager.deleteNote(noteId)) {
            this.render();
            this.showToast('Nota eliminada', 'info');
        }
    }

    escapeHtml(text) {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    formatDateRelative(dateString) {
        const now  = new Date();
        const date = new Date(dateString);
        const diffMins  = Math.floor((now - date) / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays  = Math.floor(diffHours / 24);
        if (diffMins < 1)  return 'Justo ahora';
        if (diffMins < 60) return `hace ${diffMins}m`;
        if (diffHours < 24) return `hace ${diffHours}h`;
        if (diffDays < 7)  return `hace ${diffDays}d`;
        return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    }

    showToast(message, type = 'info') {
        if (window.showToast) window.showToast(message, type);
        //else console.log(`[Notes] ${type}: ${message}`);
    }
}

// Exportar para uso global
window.NotesManager = NotesManager;
window.NotesUI = NotesUI;
