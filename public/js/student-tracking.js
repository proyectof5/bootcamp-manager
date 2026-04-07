/**
 * student-tracking.js
 * Módulo de Fichas de Seguimiento Integral del Coder
 * Funcionalidad independiente de promotion-detail.js
 * 
 * Expone: window.StudentTracking
 */

(function (window) {
    'use strict';

    const API_URL = window.APP_CONFIG?.API_URL || window.location.origin;

    // ─── Estado interno ───────────────────────────────────────────────────────
    let _promotionId = null;
    let _currentStudentId = null;
    let _currentStudent = null;
    let _promotionModules = [];
    let _promotionPildoras = [];
    let _promotionProjects = [];      // [{name, moduleId, moduleName, competenceIds:[]}]
    let _modulesPildarasExtended = []; // ExtendedInfo modulesPildoras con status/fecha
    let _catalogCompetences = [];      // [{id, name, description}] from DB competences collection
    let _promotionCompetences = [];    // program-level competences from extendedInfo [{id, name, area, ...}]
    let _hasUnsavedTechnical = false;
    let _teacherNotes = [];
    let _teams = [];
    let _competences = [];
    let _completedModules = [];
    let _completedPildoras = [];

    // ─── Constantes UI ────────────────────────────────────────────────────────
    const LEVEL_LABELS = { 1: 'Insuficiente', 2: 'Básico', 3: 'Competente', 4: 'Excelente' };
    const LEVEL_COLORS = { 1: 'danger', 2: 'warning', 3: 'primary', 4: 'success' };


    // ─── Inicialización ───────────────────────────────────────────────────────

    function init(promotionId) {
        _promotionId = promotionId;
        _loadPromotionModules();
    }

    async function _loadPromotionModules() {
        try {
            const token = localStorage.getItem('token');
            // Fetch promotion data (modules, projects, employability) + competences catalog + program competences
            const [promoRes, pildarasRes, competencesRes, extInfoRes] = await Promise.all([
                fetch(`${API_URL}/api/promotions/${_promotionId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_URL}/api/promotions/${_promotionId}/modules-pildoras`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_URL}/api/competences`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_URL}/api/promotions/${_promotionId}/extended-info`)
            ]);
            if (promoRes.ok) {
                const promo = await promoRes.json();
                _promotionModules = promo.modules || [];
                _promotionPildoras = [];
                _promotionProjects = [];
                _promotionModules.forEach(m => {
                    (m.pildoras || []).forEach(p => {
                        _promotionPildoras.push({ ...p, moduleName: m.name, moduleId: m.id });
                    });
                    (m.projects || []).forEach(p => {
                        _promotionProjects.push({ name: p.name, url: p.url, moduleId: m.id, moduleName: m.name, competenceIds: p.competenceIds || [] });
                    });
                });
            }
            if (pildarasRes.ok) {
                const pildarasData = await pildarasRes.json();
                _modulesPildarasExtended = pildarasData.modulesPildoras || [];
            }
            if (competencesRes.ok) {
                _catalogCompetences = await competencesRes.json();
            }
            if (extInfoRes.ok) {
                const extInfo = await extInfoRes.json();
                _promotionCompetences = extInfo.competences || [];
            }
        } catch (e) {
            console.error('[StudentTracking] Error cargando módulos:', e);
        }
    }

    // ─── Abrir ficha de seguimiento ───────────────────────────────────────────

    async function openFicha(studentId) {
        _currentStudentId = studentId;
        _hasUnsavedTechnical = false;

        // Mostrar spinner mientras carga
        _showFichaModal();
        _setFichaLoading(true);

        try {
            const token = localStorage.getItem('token');
            // Fetch student + pildoras + extended-info in parallel
            const [studentRes, pildarasRes, extRes] = await Promise.all([
                fetch(`${API_URL}/api/promotions/${_promotionId}/students/${studentId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_URL}/api/promotions/${_promotionId}/modules-pildoras`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_URL}/api/promotions/${_promotionId}/extended-info`)
            ]);

            if (!studentRes.ok) throw new Error('No se pudo cargar el estudiante');
            _currentStudent = await studentRes.json();

            if (pildarasRes.ok) {
                const pildarasData = await pildarasRes.json();
                _modulesPildarasExtended = pildarasData.modulesPildoras || [];
            }

            // Merge project evaluations from ExtendedInfo into the student's technicalTracking.teams
            // so that evaluations done from the Evaluación tab are always visible in the ficha
            if (extRes.ok) {
                const ext = await extRes.json();
                const projectEvaluations = ext.projectEvaluations || [];
                _mergeProjectEvaluationsIntoFicha(projectEvaluations, studentId);
            }
        } catch (e) {
            console.error('[StudentTracking] Error cargando estudiante:', e);
            _setFichaLoading(false);
            _showToast('Error cargando datos del estudiante', 'danger');
            return;
        }

        // Cargar datos en memoria
        const tt = _currentStudent.technicalTracking || {};
        _teacherNotes = (tt.teacherNotes || []).map(n => ({ ...n }));
        _teams = (tt.teams || []).map(t => ({ ...t }));
        _competences = (tt.competences || []).map(c => ({ ...c }));
        _completedModules = (tt.completedModules || []).map(m => ({ ...m }));
        _completedPildoras = (tt.completedPildoras || []).map(p => ({ ...p }));

        // Overlay: inject evaluations from ExtendedInfo that are not yet in technicalTracking
        _overlayEvaluationsIntoTeams(studentId);

        _renderFicha();
    }

    // ─── Modal principal ──────────────────────────────────────────────────────

    /**
     * Stores the fetched projectEvaluations from ExtendedInfo so _overlayEvaluationsIntoTeams can use them.
     * Called during openFicha before data is loaded into memory.
     */
    let _extProjectEvaluations = [];

    function _mergeProjectEvaluationsIntoFicha(projectEvaluations, studentId) {
        _extProjectEvaluations = projectEvaluations || [];
    }

    /**
     * After _teams is populated from technicalTracking, overlay any project evaluations from ExtendedInfo
     * that don't yet have a corresponding entry in _teams (i.e. evaluations saved before sync existed,
     * or evaluations that were never synced). This ensures they always appear in the ficha.
     */
    function _overlayEvaluationsIntoTeams(studentId) {
        const LEVEL_LABELS_MAP = { 0: 'Sin nivel', 1: 'Básico', 2: 'Medio', 3: 'Avanzado' };
        for (const projEval of _extProjectEvaluations) {
            // Find the entry for this student (individual) or any group (grupal) that contains this student
            let evalEntry = null;
            if (projEval.type === 'grupal') {
                // Find which group the student belongs to
                const group = (projEval.groups || []).find(g => (g.studentIds || []).includes(String(studentId)));
                if (group) {
                    evalEntry = (projEval.evaluations || []).find(e => e.targetId === group.groupName);
                }
            } else {
                evalEntry = (projEval.evaluations || []).find(e => String(e.targetId) === String(studentId));
            }
            if (!evalEntry) continue;
            if (!(evalEntry.competences || []).length && !evalEntry.feedback) continue;

            // Check if this project is already in _teams (it will be if _syncEvaluationsToStudentTracking ran)
            const alreadyInTeams = _teams.some(
                t => t.teamName === projEval.projectName && t.moduleId === projEval.moduleId
            );
            if (alreadyInTeams) continue;

            // Build a synthetic team entry from the evaluation data
            const teamEntry = {
                teamName: projEval.projectName || '',
                projectType: projEval.type || 'individual',
                role: '',
                moduleName: projEval.moduleName || '',
                moduleId: projEval.moduleId || '',
                assignedDate: evalEntry.evaluatedAt ? evalEntry.evaluatedAt.split('T')[0] : '',
                teacherNote: evalEntry.feedback || '',
                studentComment: evalEntry.studentComment || '',
                members: [],
                competences: (evalEntry.competences || []).map(ce => ({
                    competenceId: ce.competenceId,
                    competenceName: ce.competenceName,
                    level: ce.level,
                    toolsUsed: ce.toolsUsed || []
                })),
                _fromEvaluation: true  // marker so we know it came from ExtendedInfo
            };
            _teams.push(teamEntry);
        }
    }

    function _showFichaModal() {
        const modal = _getOrCreateModal();
        const bsModal = bootstrap.Modal.getOrCreateInstance(modal);
        bsModal.show();
    }

    function _getOrCreateModal() {
        let modal = document.getElementById('fichaModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.innerHTML = _fichaModalTemplate();
            document.body.appendChild(modal.firstElementChild);
            modal = document.getElementById('fichaModal');
        }
        return modal;
    }

    function _fichaModalTemplate() {
        return `
        <div class="modal fade" id="fichaModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
            <div class="modal-dialog modal-xl modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header bg-light">
                        <div>
                            <h5 class="modal-title mb-0">
                                <i class="bi bi-person-lines-fill me-2 text-primary"></i>
                                Ficha de Seguimiento del Coder
                            </h5>
                            <small class="text-muted" id="ficha-student-subtitle">—</small>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-0">
                        <!-- Loading overlay -->
                        <div id="ficha-loading" class="text-center p-5 d-none">
                            <div class="spinner-border text-primary" role="status"></div>
                            <p class="mt-2 text-muted">Cargando datos del coder...</p>
                        </div>

                        <!-- Content -->
                        <div id="ficha-content">
                            <!-- Tabs -->
                            <ul class="nav nav-tabs nav-fill border-bottom px-3 pt-3 bg-light" id="fichaTabList" role="tablist">
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link active" id="ficha-tab-personal" data-bs-toggle="tab"
                                        data-bs-target="#ficha-panel-personal" type="button" role="tab">
                                        <i class="bi bi-person-vcard me-1"></i> Datos Personales
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="ficha-tab-technical" data-bs-toggle="tab"
                                        data-bs-target="#ficha-panel-technical" type="button" role="tab">
                                        <i class="bi bi-gear me-1"></i> Seguimiento Técnico
                                        <span class="badge bg-danger ms-1 d-none" id="badge-technical-unsaved">●</span>
                                    </button>
                                </li>
                            </ul>

                            <div class="tab-content p-4" id="fichaTabContent">
                                <!-- Datos Personales -->
                                <div class="tab-pane fade show active" id="ficha-panel-personal" role="tabpanel">
                                    <form id="ficha-personal-form">
                                        <div class="row g-3">
                                            <div class="col-md-6">
                                                <label class="form-label fw-bold">Nombre(s)</label>
                                                <input type="text" class="form-control" id="ficha-student-name" required>
                                            </div>
                                            <div class="col-md-6">
                                                <label class="form-label fw-bold">Apellido(s)</label>
                                                <input type="text" class="form-control" id="ficha-student-lastname" required>
                                            </div>
                                            <div class="col-md-12">
                                                <label class="form-label fw-bold">Email</label>
                                                <input type="email" class="form-control" id="ficha-student-email" readonly>
                                                <div class="form-text">El email no puede ser modificado.</div>
                                            </div>
                                        </div>
                                        <div class="mt-4 text-end">
                                            <button type="submit" class="btn btn-primary px-4">
                                                <i class="bi bi-save me-1"></i> Guardar Cambios
                                            </button>
                                        </div>
                                    </form>

                                    <!-- Withdrawal Section -->
                                    <div id="ficha-baja-content" class="mt-5 pt-4 border-top">
                                        <!-- Rendered via _renderBajaSection -->
                                    </div>
                                </div>

                                <!-- Seguimiento Técnico -->
                                <div class="tab-pane fade" id="ficha-panel-technical" role="tabpanel">
                                    <div id="ficha-modules-progress-summary" class="mb-4">
                                        <!-- Global progress rendered here -->
                                    </div>

                                    <div class="row g-4">
                                        <!-- Columna Izquierda: Notas del Profesor -->
                                        <div class="col-lg-4 border-end">
                                            <div class="d-flex justify-content-between align-items-center mb-3">
                                                <h6 class="mb-0 fw-bold"><i class="bi bi-journal-text me-1"></i> Notas del Profesor</h6>
                                                <button class="btn btn-sm btn-outline-primary" onclick="window.StudentTracking._openNoteForm()">
                                                    <i class="bi bi-plus-lg"></i> Nueva
                                                </button>
                                            </div>
                                            <div id="ficha-teacher-notes-list" style="max-height: 500px; overflow-y: auto;">
                                                <!-- Notas rendered here -->
                                            </div>
                                        </div>

                                        <!-- Columna Derecha: Proyectos y Competencias -->
                                        <div class="col-lg-8">
                                            <!-- Proyectos -->
                                            <div class="mb-4">
                                                <div class="d-flex justify-content-between align-items-center mb-3">
                                                    <h6 class="mb-0 fw-bold"><i class="bi bi-kanban me-1"></i> Proyectos Realizados</h6>
                                                    <button class="btn btn-sm btn-outline-primary" onclick="window.StudentTracking._openTeamForm()">
                                                        <i class="bi bi-plus-lg"></i> Añadir Proyecto
                                                    </button>
                                                </div>
                                                <div id="ficha-teams-list">
                                                    <!-- Proyectos rendered here -->
                                                </div>
                                            </div>
                                            
                                            <!-- Resumen Módulos / Píldoras -->
                                            <div class="row">
                                                <div class="col-md-6">
                                                    <h6 class="mb-3 fw-bold fs-7"><i class="bi bi-box me-1"></i> Módulos Completados</h6>
                                                    <div id="ficha-modules-list" class="list-group list-group-flush border rounded">
                                                        <!-- Módulos rendered here -->
                                                    </div>
                                                </div>
                                                <div class="col-md-6">
                                                    <h6 class="mb-3 fw-bold fs-7"><i class="bi bi-lightning me-1"></i> Píldoras (Presentaciones)</h6>
                                                    <div id="ficha-pildoras-list" class="list-group list-group-flush border rounded">
                                                        <!-- Píldoras rendered here -->
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="mt-4 pt-3 border-top text-end">
                                        <button class="btn btn-success px-4" id="btn-save-technical" onclick="window.StudentTracking.saveTechnical()">
                                            <i class="bi bi-cloud-arrow-up me-1"></i> Guardar Seguimiento Técnico
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    function _setFichaLoading(isLoading) {
        const loading = document.getElementById('ficha-loading');
        const content = document.getElementById('ficha-content');
        if (loading) loading.classList.toggle('d-none', !isLoading);
        if (content) content.classList.toggle('d-none', isLoading);
    }

    function _renderFicha() {
        const s = _currentStudent;
        if (!s) return;

        // Subtítulo del modal
        const sub = document.getElementById('ficha-student-subtitle');
        if (sub) sub.textContent = `${s.name || ''} ${s.lastname || ''} — ${s.email || ''}`;

        // ── Datos Personales ──
        _setVal('ficha-student-name', s.name);
        _setVal('ficha-student-lastname', s.lastname);
        _setVal('ficha-student-email', s.email);

        // ── Tracking técnico ──
        _renderTeacherNotes();
        _renderTeams();
        _renderModules();
        _renderPildoras();

        // ── Formulario personal: submit ──
        const form = document.getElementById('ficha-personal-form');
        if (form) {
            form.onsubmit = (e) => { e.preventDefault(); _savePersonal(); };
        }

        // ── Sección de baja ──
        _renderBajaSection();

        // Finalizar carga
        _setFichaLoading(false);
    }

    // ─── Helpers de UI ────────────────────────────────────────────────────────

    function _setVal(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = (value !== null && value !== undefined) ? value : '';
    }

    function _markSaved(type) {
        if (type === 'technical') {
            _hasUnsavedTechnical = false;
            const badge = document.getElementById('badge-technical-unsaved');
            if (badge) badge.classList.add('d-none');
        }
    }

    function _showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} alert-dismissible fade show position-fixed shadow`;
        toast.style.cssText = 'top:20px;right:20px;z-index:99999;min-width:280px;max-width:380px;';
        const icon = type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill';
        toast.innerHTML = `<i class="bi ${icon} me-2"></i>${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
        document.body.appendChild(toast);
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 4000);
    }

    function _emptyState(icon, text) {
        return `<div class="text-center text-muted py-3">
            <i class="bi bi-${icon} fs-3 d-block mb-1 opacity-50"></i>
            <small>${text}</small>
        </div>`;
    }

    function _todayISO() {
        return new Date().toISOString().split('T')[0];
    }

    // ─── Renderizado: Notas del profesor ──────────────────────────────────────

    function _renderTeacherNotes() {
        const container = document.getElementById('ficha-teacher-notes-list');
        if (!container) return;
        if (!_teacherNotes.length) {
            container.innerHTML = _emptyState('journal-text', 'Sin notas registradas');
            return;
        }
        container.innerHTML = _teacherNotes.map((n, i) => `
            <div class="card mb-2 border-start border-4 border-info">
                <div class="card-body py-2 px-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <p class="mb-1">${_esc(n.text || n.note || '')}</p>
                            <small class="text-muted">
                                <i class="bi bi-calendar3 me-1"></i>${_fmtDate(n.date || n.createdAt)}
                            </small>
                        </div>
                        <button class="btn btn-sm btn-link text-danger p-0 ms-2" onclick="window.StudentTracking._removeNote(${i})" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>`).join('');
    }

    function _openNoteForm() {
        _showInlineForm('ficha-teacher-notes-list', `
            <div class="card border-primary mb-2">
                <div class="card-body py-2 px-3">
                    <div class="row g-2">
                        <div class="col-12">
                            <label class="form-label small fw-semibold">Nota / Observación</label>
                            <textarea class="form-control form-control-sm" id="note-content" rows="3" placeholder="Escribe aquí la nota del profesor..."></textarea>
                        </div>
                    </div>
                    <div class="d-flex justify-content-end gap-2 mt-2">
                        <button class="btn btn-sm btn-secondary" onclick="window.StudentTracking._cancelInlineForm('ficha-teacher-notes-list')">Cancelar</button>
                        <button class="btn btn-sm btn-primary" onclick="window.StudentTracking._saveNote()">Añadir</button>
                    </div>
                </div>
            </div>`, true);
    }

    function _saveNote() {
        const note = document.getElementById('note-content')?.value?.trim() || '';
        if (!note) { _showToast('La nota no puede estar vacía', 'warning'); return; }
        // Use 'text' + 'date' to match the Student model schema (prevents Mongoose strict mode stripping the fields)
        _teacherNotes.push({ text: note, date: new Date().toISOString() });
        _markUnsaved('technical');
        _renderTeacherNotes();
        _cancelInlineForm('ficha-teacher-notes-list');
    }

    function _removeNote(i) {
        _teacherNotes.splice(i, 1);
        _markUnsaved('technical');
        _renderTeacherNotes();
    }

    function _markUnsaved(section) {
        _hasUnsavedTechnical = true;
        const tabLink = document.querySelector(`a[href="#teacher-area"]`);
        if (tabLink && !tabLink.querySelector('.unsaved-indicator')) {
            const indicator = document.createElement('span');
            indicator.className = 'unsaved-indicator';
            indicator.textContent = ' *';
            indicator.style.color = 'red';
            tabLink.appendChild(indicator);
        }
    }

    function _markSaved() {
        _hasUnsavedTechnical = false;
        const indicators = document.querySelectorAll('.unsaved-indicator');
        indicators.forEach(i => i.remove());
    }

    // ─── Renderizado: Equipos ─────────────────────────────────────────────────

    function _renderTeams() {
        const container = document.getElementById('ficha-teams-list');
        if (!container) return;
        if (!_teams.length) {
            container.innerHTML = _emptyState('folder2-open', 'Sin proyectos registrados');
            return;
        }
        const PROJ_LEVEL_COLORS = { 0: 'secondary', 1: 'danger', 2: 'warning', 3: 'success' };
        const PROJ_LEVEL_LABELS = { 0: 'Sin nivel', 1: 'Básico', 2: 'Medio', 3: 'Avanzado' };
        container.innerHTML = _teams.map((t, i) => {
            const typeBadge = t.projectType === 'individual'
                ? `<span class="badge bg-info text-dark"><i class="bi bi-person me-1"></i>Individual</span>`
                : `<span class="badge bg-success"><i class="bi bi-people-fill me-1"></i>Grupal</span>`;
            const membersList = (t.members && t.members.length)
                ? `<div class="small text-muted mt-1"><i class="bi bi-people me-1"></i>${t.members.map(m => _esc(m.name)).join(', ')}</div>`
                : '';
            const noteBlock = t.teacherNote
                ? `<div class="mt-2 pt-2 border-top small">
                    <i class="bi bi-chat-left-quote text-info me-1"></i>
                    <span class="text-muted fst-italic">${_esc(t.teacherNote)}</span>
                   </div>`
                : '';
            const commentBlock = t.studentComment
                ? `<div class="mt-1 small">
                    <i class="bi bi-chat-right-text text-primary me-1"></i>
                    <span class="text-primary fst-italic">${_esc(t.studentComment)}</span>
                   </div>`
                : '';
            const competencesList = (t.competences && t.competences.length)
                ? `<div class="mt-2 pt-2 border-top">
                    <div class="small fw-semibold text-muted mb-1"><i class="bi bi-award me-1"></i>Competencias trabajadas:</div>
                    <div class="d-flex flex-wrap gap-1">
                      ${t.competences.map(c => {
                          const lvlColor = PROJ_LEVEL_COLORS[c.level] ?? 'secondary';
                          const lvlLabel = PROJ_LEVEL_LABELS[c.level] ?? c.level;
                          const toolTags = (c.toolsUsed || []).map(tool =>
                              `<span class="badge bg-light text-dark border"><i class="bi bi-tools me-1 text-secondary" style="font-size:.65rem;"></i>${_esc(tool)}</span>`
                          ).join(' ');
                          // Group achieved indicators by tool
                          const indsByTool = {};
                          (c.achievedIndicators || []).forEach(ai => {
                              if (!indsByTool[ai.toolName]) indsByTool[ai.toolName] = [];
                              indsByTool[ai.toolName].push(ai);
                          });
                          const LEVEL_COLORS_IND = { 1: '#ffc107', 2: '#0d6efd', 3: '#198754' };
                          const indicatorsHtml = Object.entries(indsByTool).map(([toolName, inds]) =>
                              `<div class="mt-1 ms-2">
                                  <span class="small text-muted"><i class="bi bi-tools me-1"></i>${_esc(toolName)}:</span>
                                  <div class="d-flex flex-wrap gap-1 mt-1">
                                      ${inds.map(ai => `<span class="badge rounded-pill" style="font-size:.65rem;background:#f0f0f0;color:#333;border:1px solid ${LEVEL_COLORS_IND[ai.levelId]??'#999'}">
                                          <span style="color:${LEVEL_COLORS_IND[ai.levelId]??'#999'}">Nv.${ai.levelId}</span> ${_esc(ai.indicatorName)}
                                      </span>`).join('')}
                                  </div>
                              </div>`
                          ).join('');
                          return `<div class="w-100 small mb-1">
                              <span class="badge bg-${lvlColor} me-1">Nv.${c.level ?? '—'} ${lvlLabel}</span>
                              <strong>${_esc(c.competenceName)}</strong>
                              ${toolTags ? `<span class="ms-1">${toolTags}</span>` : ''}
                              ${indicatorsHtml}
                          </div>`;
                      }).join('')}
                    </div>
                  </div>`
                : '';
            const current = _currentStudent || {};
            const fullName = `${current.name || ''} ${current.lastname || ''}`.trim() || (current.fullName || '');
            const email = current.email || '';
            const feedback = (t.teacherNote || '').trim();
            const subject = encodeURIComponent(`Feedback proyecto - ${fullName || 'Coder'}`);

            // Si no hay nota del profesor, no pre-rellenamos el cuerpo del email
            let body = '';
            if (feedback) {
                const compLines = (t.competences || []).map(c => {
                    const lvlColor = PROJ_LEVEL_COLORS[c.level] ?? 'secondary';
                    const lvlLabel = PROJ_LEVEL_LABELS[c.level] ?? c.level;
                    const levelText = c.level != null ? `Nivel ${c.level} - ${lvlLabel}` : `${lvlLabel}`;
                    return `- ${c.competenceName || 'Competencia'}: ${levelText}`;
                });

                const bodyLines = [
                    fullName ? `Hola ${fullName},` : 'Hola,',
                    '',
                    `Te comparto el feedback del proyecto "${t.teamName || 'Proyecto'}".`,
                    '',
                    feedback,
                    ...(compLines.length ? ['', 'Competencias trabajadas:', ...compLines] : []),
                    '',
                    'Un abrazo,',
                    'Equipo formador Factoria F5'
                ];
                body = encodeURIComponent(bodyLines.join('\n'));
            }

            // Usar Gmail web compose en lugar de mailto para evitar restricciones del navegador
            const gmailComposeUrl = email
                ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${subject}&body=${body}`
                : '';

            return `
            <div class="card mb-2 border-start border-4 border-success">
                <div class="card-body py-2 px-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="fw-semibold mb-1">
                                <i class="bi bi-folder-fill text-success me-1"></i>${_esc(t.teamName || 'Proyecto')}
                                &nbsp;${typeBadge}
                            </div>
                            <small class="text-muted">Módulo: <strong>${_esc(t.moduleName || '—')}</strong></small>
                            ${membersList}
                            ${noteBlock}
                            ${commentBlock}
                            ${competencesList}
                        </div>
                        <div class="d-flex flex-column gap-1 ms-2">
                            ${gmailComposeUrl ? `
                            <a class="btn btn-sm btn-outline-success py-0 px-1"
                                title="Enviar feedback por email (Gmail)"
                                href="${gmailComposeUrl}" target="_blank" rel="noopener noreferrer">
                                <i class="bi bi-envelope-fill" style="font-size:.85rem;"></i>
                            </a>` : ''}
                            <button class="btn btn-sm btn-outline-secondary py-0 px-1"
                                title="Exportar PDF de este proyecto"
                                onclick="if(window.Reports){ window.Reports.printProjectReport(${i}, window.StudentTracking._getCurrentStudentId(), window.StudentTracking._getPromotionId()) } else { alert('La librería de informes no está cargada.') }">
                                <i class="bi bi-file-earmark-pdf" style="font-size:.85rem;"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-primary py-0 px-1"
                                title="Editar proyecto"
                                onclick="window.StudentTracking._openTeamEdit(${i})">
                                <i class="bi bi-pencil" style="font-size:.85rem;"></i>
                            </button>
                            <button class="btn btn-sm btn-link text-danger p-0"
                                onclick="window.StudentTracking._removeTeam(${i})">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    function _openTeamForm() {
        // Project dropdown
        const projectOptions = _promotionProjects.length
            ? _promotionProjects.map((p, i) => `<option value="${i}">${_esc(p.name)}</option>`).join('')
            : '';
        const projectField = _promotionProjects.length
            ? `<select class="form-select form-select-sm" id="team-project-select"
                onchange="window.StudentTracking._onProjectSelectChange()">
                <option value="">Seleccionar proyecto...</option>
                ${projectOptions}
              </select>`
            : `<input type="text" class="form-control form-control-sm" id="team-project-select" placeholder="Nombre del proyecto">`;

        // Teammates searchable dropdown
        const allStudents = (window.currentStudents || []).filter(s => s.id !== _currentStudentId);
        const studentItems = allStudents.length
            ? allStudents.map(s => {
                const fullName = _esc(s.name + (s.lastname ? ' ' + s.lastname : ''));
                return `<li class="team-member-option px-3 py-1" style="cursor:pointer;"
                    data-id="${_esc(s.id)}" data-name="${fullName}">
                    <div class="form-check mb-0">
                        <input class="form-check-input team-member-check" type="checkbox"
                            value="${_esc(s.id)}" data-name="${fullName}" id="tm-${_esc(s.id)}">
                        <label class="form-check-label small w-100" style="cursor:pointer;" for="tm-${_esc(s.id)}">${fullName}</label>
                    </div>
                </li>`;
            }).join('')
            : `<li class="px-3 py-2 text-muted small">No hay más estudiantes en la promoción.</li>`;

        // Competences dropdown options — initially show all (no project selected yet)
        const compOptions = _buildCompetenceOptions(null);

        _showInlineForm('ficha-teams-list', `
            <div class="card border-success mb-2">
                <div class="card-body py-2 px-3">
                    <div class="row g-2">
                        <div class="col-md-5">
                            <label class="form-label small fw-semibold">Proyecto del roadmap</label>
                            ${projectField}
                        </div>
                        <div class="col-md-7">
                            <label class="form-label small fw-semibold">Tipo</label>
                            <select class="form-select form-select-sm" id="team-project-type"
                                onchange="window.StudentTracking._toggleTeamMembersSection(this.value)">
                                <option value="grupal">Grupal</option>
                                <option value="individual">Individual</option>
                            </select>
                        </div>

                        <!-- Teammates -->
                        <div class="col-12" id="team-members-section">
                            <label class="form-label small fw-semibold">
                                <i class="bi bi-people me-1"></i>Compañeros de equipo
                                <span class="text-muted fw-normal">(se actualizará su ficha automáticamente)</span>
                            </label>
                            <div class="form-control form-control-sm d-flex flex-wrap gap-1 align-items-center"
                                id="team-members-display" style="min-height:34px; cursor:text;"
                                onclick="document.getElementById('team-member-search').focus()">
                                <input type="text" id="team-member-search" class="border-0 flex-grow-1"
                                    placeholder="Buscar estudiante..." autocomplete="off"
                                    style="min-width:120px; outline:none;"
                                    oninput="window.StudentTracking._filterTeamMemberDropdown(this.value)"
                                    onfocus="document.getElementById('team-member-list').classList.remove('d-none')"
                                    onblur="setTimeout(()=>document.getElementById('team-member-list')?.classList.add('d-none'),300)">
                            </div>
                            <ul id="team-member-list" class="list-unstyled border rounded bg-white w-100 d-none mt-0"
                                style="max-height:160px; overflow-y:auto;">
                                ${studentItems}
                            </ul>
                            <div id="team-members-selected-pills" class="d-flex flex-wrap gap-1 mt-1"></div>
                        </div>

                        <!-- Competences sub-section -->
                        <div class="col-12 mt-1">
                            <div class="border rounded p-2 bg-light">
                                <div class="small fw-semibold text-primary mb-2">
                                    <i class="bi bi-award me-1"></i>Competencias trabajadas en este proyecto
                                </div>
                                <!-- Add competence row -->
                                <div class="row g-2 align-items-end mb-2" id="comp-add-row">
                                    <div class="col-md-5">
                                        <label class="form-label small mb-1">Competencia</label>
                                        <select class="form-select form-select-sm" id="proj-comp-select"
                                            onchange="window.StudentTracking._onProjectCompetenceChange()">
                                            <option value="">Seleccionar...</option>
                                            ${compOptions}
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label small mb-1">Nivel (0–3)</label>
                                        <select class="form-select form-select-sm" id="proj-comp-level">
                                            <option value="0">0 – Sin nivel</option>
                                            <option value="1">1 – Básico</option>
                                            <option value="2" selected>2 – Medio</option>
                                            <option value="3">3 – Avanzado</option>
                                        </select>
                                    </div>
                                    <div class="col-md-4 d-flex align-items-end">
                                        <button class="btn btn-sm btn-outline-primary w-100"
                                            onclick="window.StudentTracking._addProjectCompetence()">
                                            <i class="bi bi-plus-lg me-1"></i>Añadir
                                        </button>
                                    </div>
                                    <!-- Tools pills for selected competence -->
                                    <div class="col-12">
                                        <div id="proj-comp-tools-preview" class="d-flex flex-wrap gap-1 mt-1"></div>
                                    </div>
                                </div>
                                <!-- List of added competences -->
                                <div id="proj-comp-list"></div>
                            </div>
                        </div>

                        <!-- Teacher note -->
                        <div class="col-12">
                            <label class="form-label small fw-semibold">
                                <i class="bi bi-chat-left-quote me-1 text-info"></i>Nota del profesor sobre este proyecto
                                <span class="fw-normal text-muted">(opcional)</span>
                            </label>
                            <textarea class="form-control form-control-sm" id="team-teacher-note" rows="2"
                                placeholder="Valoración, observaciones, feedback..."></textarea>
                        </div>
                    </div>

                    <div class="d-flex justify-content-end gap-2 mt-2">
                        <button class="btn btn-sm btn-secondary" onclick="window.StudentTracking._cancelInlineForm('ficha-teams-list')">Cancelar</button>
                        <button class="btn btn-sm btn-success" onclick="window.StudentTracking._saveTeam()">
                            <i class="bi bi-folder-plus me-1"></i>Guardar proyecto
                        </button>
                    </div>
                </div>
            </div>`, true);

        // Wire teammate checkbox clicks — use a stable Set so selections survive list filtering/re-renders
        window._selectedTeamMembers = window._selectedTeamMembers || new Map();
        window._selectedTeamMembers.clear();

        document.querySelectorAll('.team-member-option').forEach(li => {
            const cb = li.querySelector('.team-member-check');

            // Clicking anywhere on the row toggles the checkbox
            li.addEventListener('mousedown', (e) => {
                // Prevent the search input from losing focus (which would close the list)
                e.preventDefault();
            });

            li.addEventListener('click', (e) => {
                // If click landed directly on the checkbox, the browser already toggled it;
                // otherwise toggle it manually.
                if (e.target !== cb) {
                    cb.checked = !cb.checked;
                }
                if (cb.checked) {
                    window._selectedTeamMembers.set(cb.value, cb.dataset.name);
                } else {
                    window._selectedTeamMembers.delete(cb.value);
                }
                window.StudentTracking._updateTeamMemberPills();
            });

            cb.addEventListener('change', () => {
                if (cb.checked) {
                    window._selectedTeamMembers.set(cb.value, cb.dataset.name);
                } else {
                    window._selectedTeamMembers.delete(cb.value);
                }
                window.StudentTracking._updateTeamMemberPills();
            });
        });

        // Internal state for competences being added to this project
        window._pendingProjectCompetences = [];
        _renderPendingProjectCompetences();
    }

    // Called when user selects a competence from the dropdown — load its tools as removable pills
    function _onProjectCompetenceChange() {
        const sel = document.getElementById('proj-comp-select');
        const opt = sel?.options[sel.selectedIndex];
        if (!opt || !opt.value) {
            document.getElementById('proj-comp-tools-preview').innerHTML = '';
            return;
        }
        let tools = [];
        try { tools = JSON.parse(opt.dataset.tools || '[]'); } catch(e) {}
        _renderProjectCompToolPills(tools);
    }

    // Render removable tool pills in the preview area
    function _renderProjectCompToolPills(tools) {
        const container = document.getElementById('proj-comp-tools-preview');
        if (!container) return;
        if (!tools.length) {
            container.innerHTML = '<span class="small text-muted fst-italic">Sin herramientas definidas para esta competencia.</span>';
            return;
        }
        container.innerHTML = tools.map(t => `
            <span class="badge bg-secondary d-inline-flex align-items-center gap-1 proj-tool-pill" data-tool="${_esc(t)}" style="font-size:.78rem;">
                ${_esc(t)}
                <button type="button" class="btn-close btn-close-white" style="font-size:.55rem;"
                    onmousedown="event.preventDefault(); this.closest('.proj-tool-pill').remove();">
                </button>
            </span>`).join('');
    }

    // Add the currently selected competence + level + remaining tools to the pending list
    function _addProjectCompetence() {
        const sel = document.getElementById('proj-comp-select');
        const opt = sel?.options[sel.selectedIndex];
        if (!opt || !opt.value) { _showToast('Selecciona una competencia', 'warning'); return; }

        const name = opt.value;
        const compId = opt.dataset.id || null;
        const level = parseInt(document.getElementById('proj-comp-level')?.value) || 0;

        // Collect remaining (not removed) tools from pills
        const toolsUsed = Array.from(document.querySelectorAll('#proj-comp-tools-preview .proj-tool-pill'))
            .map(el => el.dataset.tool).filter(Boolean);

        // Avoid duplicate competence in the same project
        if (window._pendingProjectCompetences.some(c => c.competenceName === name)) {
            _showToast('Esta competencia ya fue añadida', 'warning'); return;
        }

        window._pendingProjectCompetences.push({ competenceId: compId, competenceName: name, level, toolsUsed });
        // Reset selector + tools preview
        sel.value = '';
        document.getElementById('proj-comp-tools-preview').innerHTML = '';
        document.getElementById('proj-comp-level').value = '2';
        _renderPendingProjectCompetences();
    }

    function _renderPendingProjectCompetences() {
        const container = document.getElementById('proj-comp-list');
        if (!container) return;
        const PROJ_LEVEL_COLORS = { 0: 'secondary', 1: 'danger', 2: 'warning', 3: 'success' };
        const PROJ_LEVEL_LABELS = { 0: 'Sin nivel', 1: 'Básico', 2: 'Medio', 3: 'Avanzado' };
        if (!(window._pendingProjectCompetences || []).length) {
            container.innerHTML = '<p class="small text-muted mb-0">Ninguna añadida aún.</p>';
            return;
        }
        container.innerHTML = (window._pendingProjectCompetences || []).map((c, i) => {
            const lvlColor = PROJ_LEVEL_COLORS[c.level] ?? 'secondary';
            const lvlLabel = PROJ_LEVEL_LABELS[c.level] ?? c.level;
            const toolTags = (c.toolsUsed || []).map(t => `<span class="badge bg-light text-dark border">${_esc(t)}</span>`).join(' ');
            return `<div class="d-flex align-items-center gap-2 mb-1 flex-wrap">
                <span class="badge bg-${lvlColor}">Nv.${c.level} ${lvlLabel}</span>
                <span class="small fw-semibold">${_esc(c.competenceName)}</span>
                ${toolTags}
                <button class="btn btn-sm btn-link text-danger p-0 ms-auto" style="font-size:.8rem;"
                    onmousedown="event.preventDefault(); window.StudentTracking._removePendingCompetence(${i})">
                    <i class="bi bi-x-circle"></i>
                </button>
            </div>`;
        }).join('');
    }

    function _removePendingCompetence(i) {
        if (window._pendingProjectCompetences) {
            window._pendingProjectCompetences.splice(i, 1);
            _renderPendingProjectCompetences();
        }
    }

    // Filter the dropdown list by search text
    function _filterTeamMemberDropdown(query) {
        const q = query.toLowerCase();
        document.querySelectorAll('.team-member-option').forEach(li => {
            const name = li.dataset.name?.toLowerCase() || '';
            li.style.display = name.includes(q) ? '' : 'none';
        });
        document.getElementById('team-member-list')?.classList.remove('d-none');
    }

    // Show/hide the teammates section based on project type
    function _toggleTeamMembersSection(type) {
        const section = document.getElementById('team-members-section');
        if (!section) return;
        if (type === 'individual') {
            section.classList.add('d-none');
        } else {
            section.classList.remove('d-none');
        }
    }

    // Rebuild the pills below the input from the stable _selectedTeamMembers Map
    function _updateTeamMemberPills() {
        const pills = document.getElementById('team-members-selected-pills');
        if (!pills) return;
        const selected = window._selectedTeamMembers || new Map();

        // Keep checkboxes in sync with the Map (some may be hidden by the filter)
        document.querySelectorAll('.team-member-check').forEach(cb => {
            cb.checked = selected.has(cb.value);
        });

        pills.innerHTML = [...selected.entries()].map(([id, name]) => `
            <span class="badge bg-success d-flex align-items-center gap-1" style="font-size:.8rem;">
                <i class="bi bi-person-fill"></i>${_esc(name)}
                <button type="button" class="btn-close btn-close-white" style="font-size:.6rem;"
                    onmousedown="event.preventDefault(); window._selectedTeamMembers.delete('${_esc(id)}'); window.StudentTracking._updateTeamMemberPills();">
                </button>
            </span>`).join('');
    }

    async function _saveTeam() {
        const selectEl = document.getElementById('team-project-select');
        let teamName = '', moduleName = '', moduleId = '';

        if (selectEl.tagName === 'SELECT') {
            const idx = parseInt(selectEl.value);
            if (isNaN(idx) || !_promotionProjects[idx]) {
                _showToast('Selecciona un proyecto del roadmap', 'warning');
                return;
            }
            teamName = _promotionProjects[idx].name;
            moduleName = _promotionProjects[idx].moduleName;
            moduleId = _promotionProjects[idx].moduleId || '';
        } else {
            teamName = selectEl.value.trim();
            if (!teamName) { _showToast('El nombre del proyecto es obligatorio', 'warning'); return; }
        }

        const projectType = document.getElementById('team-project-type')?.value || 'grupal';

        // Gather selected members from the stable Map (not DOM checkboxes)
        const selectedMap = window._selectedTeamMembers || new Map();
        const members = [...selectedMap.entries()].map(([id, name]) => ({ id, name }));

        // Build the full member list (selected teammates + current student)
        const currentStudentObj = (window.currentStudents || []).find(s => s.id === _currentStudentId);
        const currentStudentName = currentStudentObj
            ? (currentStudentObj.name + (currentStudentObj.lastname ? ' ' + currentStudentObj.lastname : ''))
            : _currentStudentId;
        const allMembers = [{ id: _currentStudentId, name: currentStudentName }, ...members];

        const competences = window._pendingProjectCompetences || [];
        const teacherNote = document.getElementById('team-teacher-note')?.value?.trim() || '';
        const teamEntry = { teamName, projectType, moduleName, moduleId, assignedDate: _todayISO(), members: allMembers, competences, teacherNote };

        // All student IDs to propagate to
        const memberStudentIds = allMembers.map(m => m.id);

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/promotions/${_promotionId}/teams`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ teamEntry, memberStudentIds })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                _showToast(err.error || 'Error al guardar el equipo', 'danger');
                return;
            }
            const result = await res.json();
            // Update local state for current student (members = teammates, not themselves)
            _teams.push({ ...teamEntry, members: members });
            window._pendingProjectCompetences = [];
            _markUnsaved('technical');
            _renderTeams();
            _cancelInlineForm('ficha-teams-list');
            const propagated = result.results?.filter(r => r.status === 'updated' && r.studentId !== _currentStudentId).length || 0;
            _showToast(`Equipo guardado${propagated > 0 ? ` y propagado a ${propagated} compañero(s)` : ''}`, 'success');
        } catch (e) {
            console.error('[StudentTracking] Error guardando equipo:', e);
            _showToast('Error de conexión al guardar el equipo', 'danger');
        }
    }

    function _removeTeam(i) {
        _teams.splice(i, 1);
        _markUnsaved('technical');
        _renderTeams();
    }

    function _openTeamEdit(i) {
        const t = _teams[i];
        if (!t) return;

        // Build the same form as _openTeamForm but pre-filled
        const projectOptions = _promotionProjects.length
            ? _promotionProjects.map((p, pi) => `<option value="${pi}" ${p.name === t.teamName ? 'selected' : ''}>${_esc(p.name)}</option>`).join('')
            : '';
        const projectField = _promotionProjects.length
            ? `<select class="form-select form-select-sm" id="team-project-select"
                onchange="window.StudentTracking._onProjectSelectChange()">
                <option value="">Seleccionar proyecto...</option>
                ${projectOptions}
               </select>`
            : `<input type="text" class="form-control form-control-sm" id="team-project-select" placeholder="Nombre del proyecto" value="${_esc(t.teamName || '')}">`;

        // Determine current project index (for pre-filtering competences)
        const currentProjIdx = _promotionProjects.findIndex(p => p.name === t.teamName);

        const allStudents = (window.currentStudents || []).filter(s => s.id !== _currentStudentId);
        // Pre-select existing members (excluding current student)
        const existingMemberIds = new Set((t.members || []).map(m => String(m.id)));
        const studentItems = allStudents.length
            ? allStudents.map(s => {
                const fullName = _esc(s.name + (s.lastname ? ' ' + s.lastname : ''));
                const checked = existingMemberIds.has(String(s.id)) ? 'checked' : '';
                return `<li class="team-member-option px-3 py-1" style="cursor:pointer;"
                    data-id="${_esc(s.id)}" data-name="${fullName}">
                    <div class="form-check mb-0">
                        <input class="form-check-input team-member-check" type="checkbox"
                            value="${_esc(s.id)}" data-name="${fullName}" id="tm-${_esc(s.id)}" ${checked}>
                        <label class="form-check-label small w-100" style="cursor:pointer;" for="tm-${_esc(s.id)}">${fullName}</label>
                    </div>
                </li>`;
            }).join('')
            : `<li class="px-3 py-2 text-muted small">No hay más estudiantes en la promoción.</li>`;

        // Competences dropdown — pre-filtered to current project's assigned competences
        const compOptions = _buildCompetenceOptions(currentProjIdx >= 0 ? currentProjIdx : null);

        _showInlineForm('ficha-teams-list', `
            <div class="card border-primary mb-2">
                <div class="card-header py-1 px-3 bg-light d-flex align-items-center gap-2">
                    <i class="bi bi-pencil-square text-primary"></i>
                    <span class="small fw-semibold text-primary">Editando: ${_esc(t.teamName || 'Proyecto')}</span>
                </div>
                <div class="card-body py-2 px-3">
                    <div class="row g-2">
                        <div class="col-md-5">
                            <label class="form-label small fw-semibold">Proyecto del roadmap</label>
                            ${projectField}
                        </div>
                        <div class="col-md-7">
                            <label class="form-label small fw-semibold">Tipo</label>
                            <select class="form-select form-select-sm" id="team-project-type"
                                onchange="window.StudentTracking._toggleTeamMembersSection(this.value)">
                                <option value="grupal" ${t.projectType !== 'individual' ? 'selected' : ''}>Grupal</option>
                                <option value="individual" ${t.projectType === 'individual' ? 'selected' : ''}>Individual</option>
                            </select>
                        </div>

                        <div class="col-12" id="team-members-section" ${t.projectType === 'individual' ? 'class="d-none"' : ''}>
                            <label class="form-label small fw-semibold">
                                <i class="bi bi-people me-1"></i>Compañeros de equipo
                            </label>
                            <div class="form-control form-control-sm d-flex flex-wrap gap-1 align-items-center"
                                id="team-members-display" style="min-height:34px; cursor:text;"
                                onclick="document.getElementById('team-member-search').focus()">
                                <input type="text" id="team-member-search" class="border-0 flex-grow-1"
                                    placeholder="Buscar estudiante..." autocomplete="off"
                                    style="min-width:120px; outline:none;"
                                    oninput="window.StudentTracking._filterTeamMemberDropdown(this.value)"
                                    onfocus="document.getElementById('team-member-list').classList.remove('d-none')"
                                    onblur="setTimeout(()=>document.getElementById('team-member-list')?.classList.add('d-none'),300)">
                            </div>
                            <ul id="team-member-list" class="list-unstyled border rounded bg-white w-100 d-none mt-0"
                                style="max-height:160px; overflow-y:auto;">
                                ${studentItems}
                            </ul>
                            <div id="team-members-selected-pills" class="d-flex flex-wrap gap-1 mt-1"></div>
                        </div>

                        <div class="col-12 mt-1">
                            <div class="border rounded p-2 bg-light">
                                <div class="small fw-semibold text-primary mb-2">
                                    <i class="bi bi-award me-1"></i>Competencias trabajadas en este proyecto
                                </div>
                                <div class="row g-2 align-items-end mb-2" id="comp-add-row">
                                    <div class="col-md-5">
                                        <label class="form-label small mb-1">Competencia</label>
                                        <select class="form-select form-select-sm" id="proj-comp-select"
                                            onchange="window.StudentTracking._onProjectCompetenceChange()">
                                            <option value="">Seleccionar...</option>
                                            ${compOptions}
                                        </select>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label small mb-1">Nivel (0–3)</label>
                                        <select class="form-select form-select-sm" id="proj-comp-level">
                                            <option value="0">0 – Sin nivel</option>
                                            <option value="1">1 – Básico</option>
                                            <option value="2" selected>2 – Medio</option>
                                            <option value="3">3 – Avanzado</option>
                                        </select>
                                    </div>
                                    <div class="col-md-4 d-flex align-items-end">
                                        <button class="btn btn-sm btn-outline-primary w-100"
                                            onclick="window.StudentTracking._addProjectCompetence()">
                                            <i class="bi bi-plus-lg me-1"></i>Añadir
                                        </button>
                                    </div>
                                    <div class="col-12">
                                        <div id="proj-comp-tools-preview" class="d-flex flex-wrap gap-1 mt-1"></div>
                                    </div>
                                </div>
                                <div id="proj-comp-list"></div>
                            </div>
                        </div>

                        <div class="col-12">
                            <label class="form-label small fw-semibold">
                                <i class="bi bi-chat-left-quote me-1 text-info"></i>Nota del profesor
                                <span class="fw-normal text-muted">(opcional)</span>
                            </label>
                            <textarea class="form-control form-control-sm" id="team-teacher-note" rows="2"
                                placeholder="Valoración, observaciones, feedback...">${_esc(t.teacherNote || '')}</textarea>
                        </div>
                    </div>

                    <div class="d-flex justify-content-end gap-2 mt-2">
                        <button class="btn btn-sm btn-secondary" onclick="window.StudentTracking._cancelInlineForm('ficha-teams-list')">Cancelar</button>
                        <button class="btn btn-sm btn-primary" onclick="window.StudentTracking._saveTeamEdit(${i})">
                            <i class="bi bi-floppy me-1"></i>Guardar cambios
                        </button>
                    </div>
                </div>
            </div>`, true);

        // Init selected members Map from existing members
        window._selectedTeamMembers = new Map();
        (t.members || []).forEach(m => {
            window._selectedTeamMembers.set(String(m.id), m.name);
        });

        // Wire checkbox events
        document.querySelectorAll('.team-member-option').forEach(li => {
            const cb = li.querySelector('.team-member-check');
            li.addEventListener('mousedown', e => e.preventDefault());
            li.addEventListener('click', e => {
                if (e.target !== cb) cb.checked = !cb.checked;
                if (cb.checked) window._selectedTeamMembers.set(cb.value, cb.dataset.name);
                else window._selectedTeamMembers.delete(cb.value);
                window.StudentTracking._updateTeamMemberPills();
            });
            cb.addEventListener('change', () => {
                if (cb.checked) window._selectedTeamMembers.set(cb.value, cb.dataset.name);
                else window._selectedTeamMembers.delete(cb.value);
                window.StudentTracking._updateTeamMemberPills();
            });
        });

        // Init pending competences from existing entry
        window._pendingProjectCompetences = JSON.parse(JSON.stringify(t.competences || []));
        _renderPendingProjectCompetences();
        _updateTeamMemberPills();

        // Hide members section if individual
        if (t.projectType === 'individual') {
            document.getElementById('team-members-section')?.classList.add('d-none');
        }
    }

    async function _saveTeamEdit(i) {
        const t = _teams[i];
        if (!t) return;

        const selectEl = document.getElementById('team-project-select');
        let teamName = t.teamName, moduleName = t.moduleName, moduleId = t.moduleId;

        if (selectEl) {
            if (selectEl.tagName === 'SELECT') {
                const idx = parseInt(selectEl.value);
                if (!isNaN(idx) && _promotionProjects[idx]) {
                    teamName   = _promotionProjects[idx].name;
                    moduleName = _promotionProjects[idx].moduleName;
                    moduleId   = _promotionProjects[idx].moduleId || '';
                }
            } else {
                teamName = selectEl.value.trim() || teamName;
            }
        }

        const projectType = document.getElementById('team-project-type')?.value || t.projectType;
        const selectedMap = window._selectedTeamMembers || new Map();
        const members = [...selectedMap.entries()].map(([id, name]) => ({ id, name }));
        const competences = window._pendingProjectCompetences || [];
        const teacherNote = document.getElementById('team-teacher-note')?.value?.trim() ?? t.teacherNote ?? '';

        _teams[i] = { ...t, teamName, projectType, moduleName, moduleId, members, competences, teacherNote };
        window._pendingProjectCompetences = [];
        _renderTeams();
        _cancelInlineForm('ficha-teams-list');
        // Persist immediately — same behaviour as the "Guardar Seguimiento Técnico" button
        await _saveTechnical();
    }

    // ─── Renderizado: Competencias ────────────────────────────────────────────

    // Builds <option> tags for the competence selector filtered by selected project.
    // If the project has assigned competenceIds, only those are shown.
    // Falls back to all catalog competences if none assigned or no project selected.
    function _buildCompetenceOptions(projectIdx) {
        let pool = [];
        const proj = (projectIdx !== null && projectIdx !== undefined && !isNaN(parseInt(projectIdx)))
            ? _promotionProjects[parseInt(projectIdx)]
            : null;

        const assignedIds = proj?.competenceIds || [];

        if (assignedIds.length && _promotionCompetences.length) {
            // Filter promotion-level competences to only those assigned to this project
            pool = _promotionCompetences.filter(c => assignedIds.map(id => String(id)).includes(String(c.id)));
        }

        // Fall back to full catalog if pool is empty
        if (!pool.length) {
            if (_promotionCompetences.length) {
                pool = _promotionCompetences;
            } else {
                pool = _catalogCompetences.map(c => ({
                    id: c.id,
                    name: c.name,
                    area: (c.areas && c.areas[0]?.name) || '',
                    tools: (c.tools || []).map(t => t.name)
                }));
            }
        }

        if (!pool.length) return '<option value="">Sin competencias en el programa</option>';

        // Group by area
        const byArea = {};
        pool.forEach(c => {
            const area = c.area || 'Sin área';
            if (!byArea[area]) byArea[area] = [];
            byArea[area].push(c);
        });

        // Build tools JSON — prefer program-level data (includes custom tools added in Program Details)
        // selectedTools = curated subset; allTools = full list including custom ones
        // Only fall back to raw catalog if not found in promotion competences at all
        const getTools = (c) => {
            // First priority: use selectedTools from the program competence (may include custom tools)
            if (c.selectedTools && c.selectedTools.length) {
                return JSON.stringify(c.selectedTools);
            }
            // Second priority: use allTools from the program competence
            if (c.allTools && c.allTools.length) {
                return JSON.stringify(c.allTools);
            }
            // Last resort: raw catalog tools (no custom additions)
            const fromCatalog = _catalogCompetences.find(cc => String(cc.id) === String(c.id));
            if (fromCatalog) return JSON.stringify((fromCatalog.tools || []).map(t => t.name));
            return JSON.stringify([]);
        };

        if (Object.keys(byArea).length === 1) {
            // No grouping needed
            return pool.map(c =>
                `<option value="${_esc(c.name)}" data-id="${c.id}" data-tools='${_esc(getTools(c))}'>${_esc(c.name)}</option>`
            ).join('');
        }

        return Object.entries(byArea).map(([area, comps]) => `
            <optgroup label="${_esc(area)}">
                ${comps.map(c => `<option value="${_esc(c.name)}" data-id="${c.id}" data-tools='${_esc(getTools(c))}'>${_esc(c.name)}</option>`).join('')}
            </optgroup>`).join('');
    }

    // Called when a project is selected in add/edit team form — refreshes competence dropdown
    function _onProjectSelectChange() {
        const sel = document.getElementById('team-project-select');
        const compSel = document.getElementById('proj-comp-select');
        if (!compSel) return;
        const idx = sel?.tagName === 'SELECT' ? parseInt(sel.value) : null;
        const opts = _buildCompetenceOptions(isNaN(idx) ? null : idx);
        compSel.innerHTML = `<option value="">Seleccionar...</option>${opts}`;
        // Also refresh tools preview
        _onProjectCompetenceChange();
    }

    function _renderCompetences() {
        const container = document.getElementById('ficha-competences-list');
        if (!container) return;
        if (!_competences.length) {
            container.innerHTML = _emptyState('trophy', 'Sin competencias registradas');
            return;
        }
        container.innerHTML = _competences.map((c, i) => {
            const indsByTool = {};
            (c.achievedIndicators || []).forEach(ai => {
                if (!indsByTool[ai.toolName]) indsByTool[ai.toolName] = [];
                indsByTool[ai.toolName].push(ai);
            });
            const IND_COLORS = { 1: '#ffc107', 2: '#0d6efd', 3: '#198754' };
            const indicatorsBlock = Object.keys(indsByTool).length
                ? `<div class="mt-2">` + Object.entries(indsByTool).map(([toolName, inds]) =>
                    `<div class="mb-1">
                        <span class="small fw-semibold text-secondary"><i class="bi bi-tools me-1"></i>${_esc(toolName)}</span>
                        <div class="d-flex flex-wrap gap-1 mt-1">
                            ${inds.map(ai => `<span class="badge rounded-pill" style="font-size:.65rem;background:#f8f9fa;color:#333;border:1px solid ${IND_COLORS[ai.levelId]??'#999'}">
                                <span style="color:${IND_COLORS[ai.levelId]??'#999'}">Nv.${ai.levelId}</span> ${_esc(ai.indicatorName)}
                            </span>`).join('')}
                        </div>
                    </div>`).join('') + `</div>`
                : '';
            const toolsBlock = (c.toolsUsed || []).length
                ? `<div class="mt-1 d-flex flex-wrap gap-1">` +
                  c.toolsUsed.map(t => `<span class="badge bg-light text-dark border" style="font-size:.7rem;"><i class="bi bi-tools me-1 text-secondary" style="font-size:.6rem;"></i>${_esc(t)}</span>`).join('') +
                  `</div>` : '';
            return `<div class="card mb-2 border-start border-4 border-warning">
                <div class="card-body py-2 px-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="fw-semibold"><i class="bi bi-award text-warning me-1"></i>${_esc(c.competenceName || `Competencia ${c.competenceId || i+1}`)}</div>
                            <small class="text-muted">
                                <span class="badge bg-${LEVEL_COLORS[c.level] || 'secondary'} me-1">Nivel ${c.level || '—'}: ${LEVEL_LABELS[c.level] || ''}</span>
                                ${c.evaluatedDate ? `<i class="bi bi-calendar3 me-1"></i>${_fmtDate(c.evaluatedDate)}` : ''}
                            </small>
                            ${toolsBlock}
                            ${indicatorsBlock}
                        </div>
                        <button class="btn btn-sm btn-link text-danger p-0" onclick="window.StudentTracking._removeCompetence(${i})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    function _openCompetenceForm() {
        let competenceField;
        if (_catalogCompetences.length) {
            // Group competences by area for optgroup display
            const byArea = {};
            _catalogCompetences.forEach(c => {
                const areaName = (c.areas && c.areas[0]?.name) ? c.areas[0].name : 'Sin área';
                if (!byArea[areaName]) byArea[areaName] = [];
                byArea[areaName].push(c);
            });
            const optgroups = Object.entries(byArea).map(([area, comps]) => `
                <optgroup label="${_esc(area)}">
                    ${comps.map(c => `<option value="${_esc(c.name)}" data-id="${c.id}">${_esc(c.name)}</option>`).join('')}
                </optgroup>`).join('');
            competenceField = `<select class="form-select form-select-sm" id="comp-name-select">
                <option value="">Seleccionar competencia...</option>
                ${optgroups}
              </select>`;
        } else {
            competenceField = `<input type="text" class="form-control form-control-sm" id="comp-name-select" placeholder="Nombre de la competencia">`;
        }

        _showInlineForm('ficha-competences-list', `
            <div class="card border-warning mb-2">
                <div class="card-body py-2 px-3">
                    <div class="row g-2">
                        <div class="col-md-5">
                            <label class="form-label small fw-semibold">Competencia</label>
                            ${competenceField}
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small fw-semibold">Nivel</label>
                            <select class="form-select form-select-sm" id="comp-level">
                                <option value="1">1 - Insuficiente</option>
                                <option value="2" selected>2 - Básico</option>
                                <option value="3">3 - Competente</option>
                                <option value="4">4 - Excelente</option>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-semibold">Fecha evaluación</label>
                            <input type="date" class="form-control form-control-sm" id="comp-date" value="${_todayISO()}">
                        </div>
                        <div class="col-12">
                            <label class="form-label small fw-semibold">Herramientas utilizadas (separadas por coma)</label>
                            <input type="text" class="form-control form-control-sm" id="comp-tools" placeholder="Ej: React, Node.js, Docker">
                        </div>
                    </div>
                    <div class="d-flex justify-content-end gap-2 mt-2">
                        <button class="btn btn-sm btn-secondary" onclick="window.StudentTracking._cancelInlineForm('ficha-competences-list')">Cancelar</button>
                        <button class="btn btn-sm btn-warning" onclick="window.StudentTracking._saveCompetence()">Añadir</button>
                    </div>
                </div>
            </div>`, true);
    }

    function _saveCompetence() {
        const selectEl = document.getElementById('comp-name-select');
        let name = '';
        let competenceId = null;
        if (selectEl.tagName === 'SELECT') {
            const opt = selectEl.options[selectEl.selectedIndex];
            name = opt?.value?.trim() || '';
            competenceId = opt?.dataset?.id ? parseInt(opt.dataset.id) : null;
        } else {
            name = selectEl?.value?.trim() || '';
        }
        const level = parseInt(document.getElementById('comp-level')?.value) || 2;
        const evaluatedDate = document.getElementById('comp-date')?.value || _todayISO();
        const toolsRaw = document.getElementById('comp-tools')?.value || '';
        const toolsUsed = toolsRaw.split(',').map(t => t.trim()).filter(Boolean);
        if (!name) { _showToast('El nombre de la competencia es obligatorio', 'warning'); return; }
        _competences.push({ competenceId, competenceName: name, level, evaluatedDate, toolsUsed });
        _markUnsaved('technical');
        _renderCompetences();
        _cancelInlineForm('ficha-competences-list');
    }

    function _removeCompetence(i) {
        _competences.splice(i, 1);
        _markUnsaved('technical');
        _renderCompetences();
    }

    // ─── Renderizado: Módulos completados ─────────────────────────────────────

    function _renderModulesSummary() {
        const summary = document.getElementById('ficha-modules-progress-summary');
        if (!summary) return;

        // Show summary if there are any tracked modules (auto or manual with courses)
        const trackedModules = _completedModules.filter(m =>
            (m.progressPercent !== undefined && m.progressPercent !== null) ||
            (m.completedCourses && m.completedCourses.length > 0)
        );
        const allModules = _promotionModules.length ? _promotionModules : trackedModules.map(m => ({ id: m.moduleId, name: m.moduleName }));

        if (!allModules.length || !trackedModules.length) {
            summary.innerHTML = '';
            return;
        }

        // Calculate overall bootcamp progress combining projects + courses
        let totalCombinedPct = 0, countForAvg = 0;
        let totalCoursesAll = 0, completedCoursesAll = 0;

        _completedModules.forEach(m => {
            const projPct = (m.progressPercent !== undefined && m.progressPercent !== null)
                ? Math.min(100, Math.max(0, parseInt(m.progressPercent) || 0)) : null;
            const roadmapModule = _promotionModules.find(rm => String(rm.id) === String(m.moduleId));
            const moduleCourses = roadmapModule ? (roadmapModule.courses || []) : [];
            const completedCourses = (m.completedCourses || []).length;
            const coursePct = moduleCourses.length ? Math.round((completedCourses / moduleCourses.length) * 100) : null;

            totalCoursesAll += moduleCourses.length;
            completedCoursesAll += completedCourses;

            if (projPct !== null || coursePct !== null) {
                const combined = (projPct !== null && coursePct !== null)
                    ? Math.round((projPct + coursePct) / 2)
                    : (projPct ?? coursePct);
                totalCombinedPct += combined;
                countForAvg++;
            }
        });

        const totalModules = allModules.length;
        const completedModulesCount = _completedModules.filter(m => {
            const projPct = (m.progressPercent !== undefined && m.progressPercent !== null) ? parseInt(m.progressPercent) : null;
            const roadmapModule = _promotionModules.find(rm => String(rm.id) === String(m.moduleId));
            const moduleCourses = roadmapModule ? (roadmapModule.courses || []) : [];
            const coursePct = moduleCourses.length ? Math.round(((m.completedCourses || []).length / moduleCourses.length) * 100) : null;
            
            // If it has both projects and courses, average them. If only one, use that one.
            const combined = (projPct !== null && coursePct !== null) 
                ? Math.round((projPct + coursePct) / 2) 
                : (projPct ?? coursePct ?? 0);
            
            return combined >= 100;
        }).length;

        const avgProgress = countForAvg > 0 ? Math.round(totalCombinedPct / countForAvg) : 0;

        const globalColor = avgProgress >= 100 ? '#198754'
                          : avgProgress >= 60  ? '#0d6efd'
                          : avgProgress >= 30  ? '#ffc107'
                          : '#dc3545';
        const globalBarColor = avgProgress >= 100 ? 'bg-success'
                             : avgProgress >= 60  ? 'bg-primary'
                             : avgProgress >= 30  ? 'bg-warning'
                             : 'bg-danger';

        summary.innerHTML = `
            <div class="card border-0 bg-light mb-3">
                <div class="card-body py-2 px-3">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="small fw-semibold text-secondary">
                            <i class="bi bi-bar-chart-fill me-1"></i>Progreso global del bootcamp
                        </span>
                        <span class="fw-bold" style="color:${globalColor}; font-size:1.1rem;">${avgProgress}%</span>
                    </div>
                    <div class="progress mb-2" style="height:10px;">
                        <div class="progress-bar ${globalBarColor}" role="progressbar"
                            style="width:${avgProgress}%; transition:width 0.6s ease;"
                            aria-valuenow="${avgProgress}" aria-valuemin="0" aria-valuemax="100">
                        </div>
                    </div>
                    <div class="d-flex gap-3 flex-wrap">
                        <small class="text-muted">
                            <i class="bi bi-check-circle-fill text-success me-1"></i>
                            <strong>${completedModulesCount}</strong> de <strong>${totalModules}</strong> módulos completados
                        </small>
                        <small class="text-muted">
                            <i class="bi bi-folder2-open me-1"></i>
                            <strong>${_teams.length}</strong> proyecto${_teams.length !== 1 ? 's' : ''} evaluado${_teams.length !== 1 ? 's' : ''}
                        </small>
                        ${totalCoursesAll > 0 ? `<small class="text-muted">
                            <i class="bi bi-journal-bookmark me-1"></i>
                            <strong>${completedCoursesAll}</strong>/<strong>${totalCoursesAll}</strong> cursos completados
                        </small>` : ''}
                    </div>
                </div>
            </div>`;
    }

    function _renderModules() {
        const container = document.getElementById('ficha-modules-list');
        if (!container) return;

        // Always render the global progress summary first
        _renderModulesSummary();

        if (!_completedModules.length) {
            container.innerHTML = _emptyState('book', 'Sin módulos registrados');
            return;
        }
        container.innerHTML = _completedModules.map((m, i) => {
            const pct = (m.progressPercent !== undefined && m.progressPercent !== null)
                ? Math.min(100, Math.max(0, parseInt(m.progressPercent) || 0))
                : null;
            const isAutoEntry = pct !== null;

            // Find roadmap courses for this module
            const roadmapModule = _promotionModules.find(rm => String(rm.id) === String(m.moduleId));
            const moduleCourses = roadmapModule ? (roadmapModule.courses || []) : [];
            const completedCourses = new Set((m.completedCourses || []).map(c => String(c)));

            // Courses checklist section
            const coursesSection = moduleCourses.length ? `
                <div class="mt-2 pt-2 border-top">
                    <div class="small fw-semibold text-secondary mb-1">
                        <i class="bi bi-journal-bookmark me-1"></i>Cursos del módulo
                        <span class="ms-1 text-muted fw-normal">(${completedCourses.size}/${moduleCourses.length} completados)</span>
                    </div>
                    <div class="d-flex flex-column gap-1">
                        ${moduleCourses.map((course, ci) => {
                            const courseName = typeof course === 'string' ? course : (course.name || `Curso ${ci+1}`);
                            const courseUrl = typeof course === 'object' ? (course.url || '') : '';
                            const courseKey = String(ci);
                            const checked = completedCourses.has(courseKey) ? 'checked' : '';
                            return `<div class="form-check form-check-sm d-flex align-items-center gap-2 mb-0">
                                <input class="form-check-input flex-shrink-0" type="checkbox" ${checked}
                                    id="course-${i}-${ci}"
                                    onchange="window.StudentTracking._toggleCourse(${i}, ${ci}, this.checked)">
                                <label class="form-check-label small ${checked ? 'text-decoration-line-through text-muted' : ''}" for="course-${i}-${ci}" style="cursor:pointer;">
                                    ${courseUrl
                                        ? `<a href="${_esc(courseUrl)}" target="_blank" rel="noopener noreferrer" class="text-decoration-none">${_esc(courseName)} <i class="bi bi-box-arrow-up-right" style="font-size:.65rem;"></i></a>`
                                        : _esc(courseName)
                                    }
                                </label>
                            </div>`;
                        }).join('')}
                    </div>
                </div>` : '';

            // Combined progress (projects + courses)
            const courseProgressPct = moduleCourses.length
                ? Math.round((completedCourses.size / moduleCourses.length) * 100)
                : null;

            const combinedPct = isAutoEntry
                ? (moduleCourses.length
                    ? Math.round((pct + (courseProgressPct ?? 0)) / 2)
                    : pct)
                : null;
            const displayPct = combinedPct ?? pct;

            // Color of progress bar based on percentage
            const barColor = displayPct >= 100 ? 'bg-success'
                           : displayPct >= 60  ? 'bg-primary'
                           : displayPct >= 30  ? 'bg-warning'
                           : 'bg-danger';

            const borderColor = displayPct >= 100 ? 'border-success'
                              : displayPct >= 60  ? 'border-primary'
                              : displayPct >= 30  ? 'border-warning'
                              : (isAutoEntry || moduleCourses.length) ? 'border-danger' : 'border-primary';

            const progressBar = (isAutoEntry || moduleCourses.length) ? `
                <div class="mt-2">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <small class="text-muted fw-semibold">
                            Progreso del módulo
                            ${moduleCourses.length && isAutoEntry ? `<span class="text-muted fw-normal">(proyectos + cursos)</span>` : ''}
                        </small>
                        <small class="fw-bold" style="color:${displayPct >= 100 ? '#198754' : displayPct >= 60 ? '#0d6efd' : displayPct >= 30 ? '#ffc107' : '#dc3545'}">${displayPct ?? '—'}%</small>
                    </div>
                    <div class="progress" style="height:8px;">
                        <div class="progress-bar ${barColor}" role="progressbar"
                            style="width:${displayPct ?? 0}%; transition: width 0.5s ease;"
                            aria-valuenow="${displayPct ?? 0}" aria-valuemin="0" aria-valuemax="100">
                        </div>
                    </div>
                    ${(displayPct ?? 0) >= 100 ? `<div class="mt-1"><span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Módulo completado</span></div>` : ''}
                </div>` : '';

            const gradeBadge = m.finalGrade
                ? `<span class="badge bg-${LEVEL_COLORS[m.finalGrade] || 'secondary'} ms-1">${LEVEL_LABELS[m.finalGrade] || m.finalGrade}</span>`
                : '';

            const dateInfo = m.completionDate
                ? `<i class="bi bi-calendar-check me-1"></i>${_fmtDate(m.completionDate)}`
                : ((displayPct ?? 0) >= 100 ? `<i class="bi bi-calendar-check me-1"></i>Completado` : '');

            const notesInfo = m.notes
                ? `<div class="mt-1 small text-muted fst-italic"><i class="bi bi-info-circle me-1"></i>${_esc(m.notes)}</div>`
                : '';

            const autoLabel = isAutoEntry
                ? `<span class="badge bg-light text-secondary border ms-2" style="font-size:.65rem;"><i class="bi bi-robot me-1"></i>Auto</span>`
                : '';

            return `
            <div class="card mb-2 border-start border-4 ${borderColor}">
                <div class="card-body py-2 px-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="fw-semibold">
                                <i class="bi bi-book-fill text-primary me-1"></i>${_esc(m.moduleName || '—')}
                                ${gradeBadge}${autoLabel}
                            </div>
                            <small class="text-muted">${dateInfo}</small>
                            ${notesInfo}
                            ${progressBar}
                            ${coursesSection}
                        </div>
                        <button class="btn btn-sm btn-link text-danger p-0 ms-2" onclick="window.StudentTracking._removeModule(${i})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    function _openModuleForm() {
        const moduleOptions = _promotionModules.length
            ? _promotionModules.map(m => `<option value="${_esc(m.name)}" data-id="${m.id}">${_esc(m.name)}</option>`).join('')
            : '<option value="">No hay módulos en el roadmap</option>';
        _showInlineForm('ficha-modules-list', `
            <div class="card border-primary mb-2">
                <div class="card-body py-2 px-3">
                    <div class="row g-2">
                        <div class="col-md-5">
                            <label class="form-label small fw-semibold">Módulo</label>
                            <select class="form-select form-select-sm" id="mod-select">
                                <option value="">Seleccionar módulo...</option>
                                ${moduleOptions}
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small fw-semibold">Nota final</label>
                            <select class="form-select form-select-sm" id="mod-grade">
                                <option value="1">1 - Insuficiente</option>
                                <option value="2">2 - Básico</option>
                                <option value="3" selected>3 - Competente</option>
                                <option value="4">4 - Excelente</option>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-semibold">Fecha completado</label>
                            <input type="date" class="form-control form-control-sm" id="mod-date" value="${_todayISO()}">
                        </div>
                        <div class="col-12">
                            <label class="form-label small fw-semibold">Observaciones</label>
                            <input type="text" class="form-control form-control-sm" id="mod-notes" placeholder="Observaciones opcionales">
                        </div>
                    </div>
                    <div class="d-flex justify-content-end gap-2 mt-2">
                        <button class="btn btn-sm btn-secondary" onclick="window.StudentTracking._cancelInlineForm('ficha-modules-list')">Cancelar</button>
                        <button class="btn btn-sm btn-primary" onclick="window.StudentTracking._saveModule()">Añadir</button>
                    </div>
                </div>
            </div>`, true);
    }

    function _saveModule() {
        const select = document.getElementById('mod-select');
        const moduleName = select?.options[select.selectedIndex]?.text || '';
        const moduleId = select?.options[select.selectedIndex]?.dataset?.id || '';
        const finalGrade = parseInt(document.getElementById('mod-grade')?.value) || 3;
        const completionDate = document.getElementById('mod-date')?.value || _todayISO();
        const notes = document.getElementById('mod-notes')?.value?.trim() || '';
        if (!moduleName || moduleName === 'Seleccionar módulo...') { _showToast('Selecciona un módulo', 'warning'); return; }
        _completedModules.push({ moduleId, moduleName, finalGrade, completionDate, notes });
        _markUnsaved('technical');
        _renderModules();
        _cancelInlineForm('ficha-modules-list');
    }

    function _removeModule(i) {
        _completedModules.splice(i, 1);
        _markUnsaved('technical');
        _renderModules();
    }

    /**
     * Toggles a course as completed/uncompleted within a module entry.
     * courseKey is the index (as string) of the course in the roadmap module's courses array.
     */
    function _toggleCourse(moduleIdx, courseIdx, checked) {
        const m = _completedModules[moduleIdx];
        if (!m) return;
        if (!m.completedCourses) m.completedCourses = [];

        const key = String(courseIdx);
        if (checked) {
            if (!m.completedCourses.includes(key)) m.completedCourses.push(key);
        } else {
            m.completedCourses = m.completedCourses.filter(k => k !== key);
        }

        // Set completion date if all courses done + auto-mark completionDate
        const roadmapModule = _promotionModules.find(rm => String(rm.id) === String(m.moduleId));
        const totalCourses = roadmapModule ? (roadmapModule.courses || []).length : 0;
        if (totalCourses > 0 && m.completedCourses.length >= totalCourses && !m.completionDate) {
            m.completionDate = _todayISO();
        }

        _markUnsaved('technical');
        _renderModules();
    }

    // ─── Renderizado: Píldoras completadas (automático desde BD) ─────────────

    function _renderPildoras() {
        const container = document.getElementById('ficha-pildoras-list');
        if (!container) return;

        //console.log('[StudentTracking] _modulesPildarasExtended:', JSON.stringify(_modulesPildarasExtended));
        //console.log('[StudentTracking] _currentStudentId:', _currentStudentId);

        const presented = [];
        const pending   = [];

        _modulesPildarasExtended.forEach(mp => {
            (mp.pildoras || []).forEach(p => {
                const studentIds = (p.students || []).map(s => String(s.id));
                if (!studentIds.includes(String(_currentStudentId))) return; // not assigned to this student

                const entry = {
                    pildoraName: p.title || '—',
                    moduleName:  mp.moduleName || '—',
                    date:        p.date || null,
                    mode:        p.mode || null,
                    status:      p.status || ''
                };

                if (p.status === 'Presentada') {
                    presented.push(entry);
                } else {
                    pending.push(entry);
                }
            });
        });

        // Update count badge
        const countBadge = document.getElementById('ficha-pildoras-count');
        const total = presented.length + pending.length;
        if (countBadge) {
            countBadge.textContent = total
                ? `${presented.length} presentada${presented.length !== 1 ? 's' : ''} · ${pending.length} pendiente${pending.length !== 1 ? 's' : ''}`
                : 'Automático';
        }

        if (!total) {
            container.innerHTML = _emptyState('lightning-charge', 'No hay píldoras asignadas a este coder');
            return;
        }

        let html = '';

        if (presented.length) {
            html += `<div class="small fw-semibold text-success mb-1 mt-2"><i class="bi bi-check-circle-fill me-1"></i>Presentadas (${presented.length})</div>`;
            html += presented.map(p => `
                <div class="card mb-2 border-start border-4 border-success">
                    <div class="card-body py-2 px-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <div class="fw-semibold">
                                    <i class="bi bi-lightning-charge-fill text-success me-1"></i>${_esc(p.pildoraName)}
                                </div>
                                <small class="text-muted">
                                    Módulo: <strong>${_esc(p.moduleName)}</strong>
                                    ${p.date ? `&nbsp;|&nbsp;<i class="bi bi-calendar3 me-1"></i>${_fmtDate(p.date)}` : ''}
                                    ${p.mode ? `&nbsp;|&nbsp;<i class="bi bi-display me-1"></i>${_esc(p.mode)}` : ''}
                                </small>
                            </div>
                            <span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Presentada</span>
                        </div>
                    </div>
                </div>`).join('');
        }

        if (pending.length) {
            html += `<div class="small fw-semibold text-danger mb-1 mt-3"><i class="bi bi-x-circle-fill me-1"></i>No presentadas / Pendientes (${pending.length})</div>`;
            html += pending.map(p => `
                <div class="card mb-2 border-start border-4 border-danger">
                    <div class="card-body py-2 px-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <div class="fw-semibold">
                                    <i class="bi bi-lightning-charge text-danger me-1"></i>${_esc(p.pildoraName)}
                                </div>
                                <small class="text-muted">
                                    Módulo: <strong>${_esc(p.moduleName)}</strong>
                                    ${p.date ? `&nbsp;|&nbsp;<i class="bi bi-calendar3 me-1"></i>${_fmtDate(p.date)}` : ''}
                                    ${p.mode ? `&nbsp;|&nbsp;<i class="bi bi-display me-1"></i>${_esc(p.mode)}` : ''}
                                </small>
                            </div>
                            <span class="badge bg-danger"><i class="bi bi-x-circle me-1"></i>${_esc(p.status || 'Pendiente')}</span>
                        </div>
                    </div>
                </div>`).join('');
        }

        container.innerHTML = html;
    }

    // (helper no longer needed — kept as no-op to avoid errors if called)
    function _getAssignedIdsForPildora() { return []; }

    // ─── Renderizado: Sesiones de empleabilidad ───────────────────────────────


    // ─── Formulario inline helper ─────────────────────────────────────────────

    function _showInlineForm(containerId, html, prepend = false) {
        const container = document.getElementById(containerId);
        if (!container) return;
        // Eliminar formulario previo si existe
        const prev = container.querySelector('.inline-form-wrapper');
        if (prev) prev.remove();
        const wrapper = document.createElement('div');
        wrapper.className = 'inline-form-wrapper';
        wrapper.innerHTML = html;
        if (prepend) container.prepend(wrapper);
        else container.append(wrapper);
        wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function _cancelInlineForm(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const wrapper = container.querySelector('.inline-form-wrapper');
        if (wrapper) wrapper.remove();
    }

    // ─── Dar de baja ──────────────────────────────────────────────────────────

    function _renderBajaSection() {
        const container = document.getElementById('ficha-baja-content');
        if (!container) return;
        const s = _currentStudent;
        if (!s) return;

        if (s.isWithdrawn && s.withdrawal) {
            const w = s.withdrawal;
            container.innerHTML = `
                <div class="alert alert-danger d-flex align-items-start gap-3 mb-3" role="alert">
                    <i class="bi bi-person-x-fill fs-4 text-danger mt-1 flex-shrink-0"></i>
                    <div class="flex-grow-1">
                        <h6 class="alert-heading mb-2">Este coder ha causado baja oficial</h6>
                        <div class="row g-2 small">
                            <div class="col-md-4"><span class="fw-semibold">Fecha de baja:</span><br>${_esc(w.date ? new Date(w.date).toLocaleDateString('es-ES') : '—')}</div>
                            <div class="col-md-4"><span class="fw-semibold">Representante F5:</span><br>${_esc(w.representative || '—')}</div>
                            <div class="col-12"><span class="fw-semibold">Motivo:</span><br>${_esc(w.reason || '—')}</div>
                        </div>
                        <div class="mt-3 d-flex gap-2 flex-wrap">
                            <button type="button" class="btn btn-sm btn-outline-danger"
                                onclick="window.StudentTracking._openBajaForm()">
                                <i class="bi bi-pencil me-1"></i>Editar datos de baja
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-secondary"
                                onclick="if(window.Reports){ window.Reports.printActaBaja(window.StudentTracking._getCurrentStudentId(), window.StudentTracking._getPromotionId()) } else { alert('La librería de informes no está cargada.') }">
                                <i class="bi bi-file-earmark-text me-1"></i>Descargar Acta de Baja
                            </button>
                            <button type="button" class="btn btn-sm btn-link text-secondary p-0 ms-auto align-self-center"
                                onclick="window.StudentTracking._cancelWithdrawal()">
                                <i class="bi bi-arrow-counterclockwise me-1"></i>Reactivar estudiante
                            </button>
                        </div>
                    </div>
                </div>`;
        } else {
            container.innerHTML = `
                <button type="button" class="btn btn-outline-danger btn-sm"
                        onclick="window.StudentTracking._openBajaForm()">
                    <i class="bi bi-person-x me-1"></i> Dar de Baja al Estudiante
                </button>`;
        }
    }

    function _openBajaForm() {
        const container = document.getElementById('ficha-baja-content');
        if (!container) return;
        const s = _currentStudent;
        const w = s?.withdrawal || {};
        const today = _todayISO();

        container.innerHTML = `
            <div class="card border-danger">
                <div class="card-header bg-danger text-white d-flex align-items-center gap-2">
                    <i class="bi bi-person-x-fill"></i>
                    <strong>${s?.isWithdrawn ? 'Editar datos de baja' : 'Registrar Baja Oficial'}</strong>
                </div>
                <div class="card-body">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label small fw-semibold">Fecha oficial de baja <span class="text-danger">*</span></label>
                            <input type="date" class="form-control form-control-sm" id="baja-date"
                                value="${_esc(w.date ? w.date.split('T')[0] : today)}">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-semibold">Representante Factoría F5 que firma <span class="text-danger">*</span></label>
                            <input type="text" class="form-control form-control-sm" id="baja-representative"
                                placeholder="Nombre y cargo del representante"
                                value="${_esc(w.representative || '')}">
                        </div>
                        <div class="col-12">
                            <label class="form-label small fw-semibold">Motivo de la baja <span class="text-danger">*</span></label>
                            <textarea class="form-control form-control-sm" id="baja-reason" rows="3"
                                placeholder="Describe el motivo de la baja del estudiante…">${_esc(w.reason || '')}</textarea>
                        </div>
                    </div>
                    <div class="d-flex justify-content-end gap-2 mt-3">
                        <button type="button" class="btn btn-sm btn-secondary"
                            onclick="window.StudentTracking._renderBajaSection()">Cancelar</button>
                        <button type="button" class="btn btn-sm btn-danger"
                            onclick="window.StudentTracking._saveWithdrawal()">
                            <i class="bi bi-check-lg me-1"></i>
                            ${s?.isWithdrawn ? 'Actualizar' : 'Registrar Baja y Generar Acta'}
                        </button>
                    </div>
                </div>
            </div>`;
    }

    async function _saveWithdrawal() {
        const date         = document.getElementById('baja-date')?.value?.trim();
        const reason       = document.getElementById('baja-reason')?.value?.trim();
        const representative = document.getElementById('baja-representative')?.value?.trim();

        if (!date || !reason || !representative) {
            _showToast('Completa todos los campos de baja (*)', 'warning');
            return;
        }

        const token = localStorage.getItem('token');
        const payload = {
            isWithdrawn: true,
            withdrawal: { date, reason, representative, processedAt: new Date().toISOString() }
        };

        try {
            const res = await fetch(`${API_URL}/api/promotions/${_promotionId}/students/${_currentStudentId}/ficha/personal`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Error al guardar');
            _currentStudent = { ..._currentStudent, ...payload };
            _syncStudentInTable(_currentStudent);
            _showToast('Baja registrada correctamente ✓');
            _renderBajaSection();
            // Generar PDF del acta
            window.Reports?.printActaBaja(_currentStudentId, _promotionId);
        } catch (e) {
            console.error('[StudentTracking] saveWithdrawal error:', e);
            _showToast(e.message || 'Error al registrar la baja', 'danger');
        }
    }

    async function _cancelWithdrawal() {
        if (!confirm('¿Reactivar a este estudiante? Se eliminará el registro de baja.')) return;
        const token = localStorage.getItem('token');
        const payload = { isWithdrawn: false, withdrawal: null };
        try {
            const res = await fetch(`${API_URL}/api/promotions/${_promotionId}/students/${_currentStudentId}/ficha/personal`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Error al reactivar');
            _currentStudent = { ..._currentStudent, isWithdrawn: false, withdrawal: null };
            _syncStudentInTable(_currentStudent);
            _showToast('Estudiante reactivado correctamente ✓');
            _renderBajaSection();
        } catch (e) {
            _showToast(e.message || 'Error al reactivar el estudiante', 'danger');
        }
    }

    // ─── Persistencia (API calls) ─────────────────────────────────────────────

    async function _savePersonal() {
        const token = localStorage.getItem('token');
        const payload = {
            name: document.getElementById('fp-name')?.value?.trim(),
            lastname: document.getElementById('fp-lastname')?.value?.trim(),
            email: document.getElementById('fp-email')?.value?.trim(),
            phone: document.getElementById('fp-phone')?.value?.trim(),
            age: parseInt(document.getElementById('fp-age')?.value) || null,
            administrativeSituation: document.getElementById('fp-admin-situation')?.value || '',
            nationality: document.getElementById('fp-nationality')?.value?.trim() || '',
            identificationDocument: document.getElementById('fp-document')?.value?.trim() || '',
            gender: document.getElementById('fp-gender')?.value || '',
            englishLevel: document.getElementById('fp-english-level')?.value || '',
            educationLevel: document.getElementById('fp-education-level')?.value || '',
            profession: document.getElementById('fp-profession')?.value?.trim() || '',
            community: document.getElementById('fp-community')?.value || '',
        };

        // Only validate the absolutely minimum fields
        if (!payload.name || !payload.lastname || !payload.email) {
            // Highlight missing fields
            ['fp-name', 'fp-lastname', 'fp-email'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.toggle('is-invalid', !el.value.trim());
            });
            _showToast('Nombre, apellido y email son obligatorios', 'warning');
            return;
        }

        // Clear any previous validation highlights
        ['fp-name', 'fp-lastname', 'fp-email', 'fp-phone', 'fp-age'].forEach(id => {
            document.getElementById(id)?.classList.remove('is-invalid');
        });

        try {
            const res = await fetch(`${API_URL}/api/promotions/${_promotionId}/students/${_currentStudentId}/ficha/personal`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Error ${res.status}`);
            }
            const updated = await res.json();
            _currentStudent = { ..._currentStudent, ...payload };
            // Actualizar nombre en el subtítulo
            const sub = document.getElementById('ficha-student-subtitle');
            if (sub) sub.textContent = `${payload.name} ${payload.lastname} — ${payload.email}`;
            // Actualizar la tabla de estudiantes si está visible
            _syncStudentInTable(updated.student || _currentStudent);
            _showToast('Datos personales guardados correctamente ✓');
        } catch (e) {
            console.error('[StudentTracking] savePersonal error:', e);
            _showToast(e.message || 'Error al guardar datos personales', 'danger');
        }
    }

    async function _saveTechnical() {
        const token = localStorage.getItem('token');

        // Compute completedPildoras from live ExtendedInfo data (status === 'Presentada' + student is in the list)
        const completedPildoras = [];
        _modulesPildarasExtended.forEach(mp => {
            (mp.pildoras || []).forEach(p => {
                if (p.status !== 'Presentada') return;
                const studentIds = (p.students || []).map(s => String(s.id));
                if (studentIds.includes(String(_currentStudentId))) {
                    completedPildoras.push({
                        pildoraTitle: p.title || '—',
                        moduleId: mp.moduleId || '',
                        moduleName: mp.moduleName || '—',
                        date: p.date || null
                    });
                }
            });
        });

        const payload = {
            teacherNotes: _teacherNotes,
            teams: _teams,
            competences: _competences,
            completedModules: _completedModules,
            completedPildoras
        };
        try {
            const res = await fetch(`${API_URL}/api/promotions/${_promotionId}/students/${_currentStudentId}/ficha/technical`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Error al guardar');
            _markSaved();
            _showToast('Seguimiento técnico guardado ✓');
        } catch (e) {
            console.error('[StudentTracking] saveTechnical error:', e);
            _showToast(e.message || 'Error al guardar seguimiento técnico', 'danger');
        }
    }


    // Actualiza la fila del estudiante en la tabla de students sin recargar la página
    function _syncStudentInTable(student) {
        if (!window.currentStudents) return;
        const idx = window.currentStudents.findIndex(s => s.id === _currentStudentId || s._id === _currentStudentId);
        if (idx !== -1) {
            window.currentStudents[idx] = { ...window.currentStudents[idx], ...student };
            // Refrescar sólo si displayStudents está disponible
            if (typeof window.displayStudents === 'function') {
                window.displayStudents(window.currentStudents);
            }
        }
    }

    // ─── Utilidades ───────────────────────────────────────────────────────────

    function _esc(text) {
        if (!text) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    function _fmtDate(dateStr) {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch { return dateStr; }
    }

    // ─── API pública ──────────────────────────────────────────────────────────

    window.StudentTracking = {
        init,
        openFicha,
        _getTeam: (i) => _teams[i],
        _getCurrentStudent: () => _currentStudent,
        // Exponer internos necesarios por onclick en HTML generado dinámicamente
        _openNoteForm, _saveNote, _removeNote,
        _openTeamForm, _saveTeam, _removeTeam, _openTeamEdit, _saveTeamEdit,
        _filterTeamMemberDropdown, _updateTeamMemberPills, _toggleTeamMembersSection,
        _onProjectSelectChange, _onProjectCompetenceChange, _addProjectCompetence, _removePendingCompetence,
        _openCompetenceForm, _saveCompetence, _removeCompetence,
        _openModuleForm, _saveModule, _removeModule, _toggleCourse,
        _cancelInlineForm,
        saveTechnical: _saveTechnical,
        _getCurrentStudentId: () => _currentStudentId,
        _getPromotionId: () => _promotionId,
        _renderBajaSection, _openBajaForm, _saveWithdrawal, _cancelWithdrawal
    };

})(window);