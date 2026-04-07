/**
 * program-competences.js
 * Módulo de Competencias para Program Info
 * Gestiona el catálogo de competencias del programa por área.
 * El catálogo se carga dinámicamente desde /api/competences (MongoDB Atlas).
 *
 * Expone: window.ProgramCompetences
 */
(function (window) {
    'use strict';

    const API_URL = window.APP_CONFIG?.API_URL || window.location.origin;

    // ─── Catálogo cargado desde la BD (reemplaza el hardcoded) ────────────────
    let COMPETENCES_CATALOG = [];
    let AREAS = [];

    // ─── Estado interno ────────────────────────────────────────────────────────
    let _programCompetences = []; // competencias seleccionadas para este programa (con selectedTools)
    let _catalogLoaded = false;
    let _viewOnlyMode = false;    // true when competences come from Evaluation tab (read-only display)

    // ─── Carga el catálogo desde la API ───────────────────────────────────────
    async function _loadCatalog() {
        if (_catalogLoaded) return;
        const token = localStorage.getItem('token');
        //console.log('[ProgramCompetences] Cargando desde /api/competences y /api/areas...');
        try {
            // Fetch competences AND all areas in parallel
            const [resComp, resAreas] = await Promise.all([
                fetch(`${API_URL}/api/competences`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/areas`,       { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (!resComp.ok) {
                console.error('[ProgramCompetences] Error HTTP /api/competences:', resComp.status, resComp.statusText);
            }
            if (!resAreas.ok) {
                console.error('[ProgramCompetences] Error HTTP /api/areas:', resAreas.status, resAreas.statusText);
            }

            const [data, allAreasFromDB] = await Promise.all([resComp.json(), resAreas.json()]);

            //console.log('[ProgramCompetences] /api/competences → recibidas:', data.length, 'competencias');
            //console.log('[ProgramCompetences] /api/areas → recibidas:', allAreasFromDB.length, 'áreas:', allAreasFromDB.map(a => `${a.id}:${a.name}`));
            //console.log('[ProgramCompetences] Detalle primera competencia:', data[0]);

            // Normalize DB shape → internal shape
            COMPETENCES_CATALOG = data.map(comp => {
                const areaName = (comp.areas && comp.areas[0]) ? comp.areas[0].name : 'Sin área';
                const areaNames = (comp.areas || []).map(a => a.name);
                const levels = (comp.levels || []).map(l => ({
                    level: l.levelId,
                    description: l.levelName || `Nivel ${l.levelId}`,
                    indicators: (l.indicators || []).map(i => i.name)
                }));
                const allTools = (comp.tools || []).map(t => t.name);
                return {
                    id: comp.id,
                    area: areaName,       // primary area (first)
                    areas: areaNames,     // ALL areas for this competence
                    name: comp.name,
                    description: comp.description || '',
                    levels,
                    allTools
                };
            });

            //console.log('[ProgramCompetences] Catálogo normalizado:', COMPETENCES_CATALOG.length, 'competencias');
            //console.log('[ProgramCompetences] Áreas únicas en competencias:', [...new Set(COMPETENCES_CATALOG.map(c => c.area))]);

            // Use ALL areas from DB for the filter (not just ones assigned to competences)
            AREAS = allAreasFromDB.length > 0
                ? allAreasFromDB.map(a => a.name)
                : [...new Set(COMPETENCES_CATALOG.map(c => c.area))];

            //console.log('[ProgramCompetences] Filtro de área rellenado con:', AREAS);
            _catalogLoaded = true;
        } catch (e) {
            console.error('[ProgramCompetences] Excepción al cargar catálogo:', e);
        }
    }

    // ─── Inicialización ────────────────────────────────────────────────────────
    async function init(savedCompetences) {
        _viewOnlyMode = false;
        _programCompetences = Array.isArray(savedCompetences) ? savedCompetences : [];
        await _loadCatalog();
        _populateAreaFilter();
        _render();
    }

    /**
     * View-only mode: competences are defined per-project in the Evaluation tab.
     * Renders the same accordion but without add/remove/edit action buttons.
     */
    async function initViewOnly(aggregatedCompetences) {
        _viewOnlyMode = true;
        _programCompetences = Array.isArray(aggregatedCompetences) ? aggregatedCompetences : [];
        await _loadCatalog();
        _populateAreaFilter();
        _renderViewOnly();
    }

    // ─── Rellena el selector de área en promotion-detail con las áreas de la BD
    function _populateAreaFilter() {
        const sel = document.getElementById('competences-area-filter');
        if (!sel) return;
        // Keep only the first "Todas las áreas" option, then append DB areas
        sel.innerHTML = '<option value="">Todas las áreas</option>';
        AREAS.forEach(area => {
            const opt = document.createElement('option');
            opt.value = area;
            opt.textContent = area;
            sel.appendChild(opt);
        });
        //console.log('[ProgramCompetences] Filtro de área rellenado con:', AREAS);
    }

    // ─── Obtiene las competencias actuales para guardar ───────────────────────
    function getCompetences() {
        return JSON.parse(JSON.stringify(_programCompetences));

    }

    // ─── Renderiza el panel de competencias como acordeón (modo edición) ─────
    function _render() {
        const container = document.getElementById('competences-list-container');
        if (!container) return;

        const filterArea = document.getElementById('competences-area-filter')?.value || '';

        if (!_programCompetences.length) {
            container.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="bi bi-award fs-1 d-block mb-2 opacity-50"></i>
                    <span>No hay competencias añadidas al programa. Usa el botón "Añadir Competencia".</span>
                </div>`;
            return;
        }

        const filtered = filterArea
            ? _programCompetences.filter(c => c.area === filterArea)
            : _programCompetences;

        if (!filtered.length) {
            container.innerHTML = `<div class="text-center py-3 text-muted"><i class="bi bi-filter-circle me-2"></i>No hay competencias en el área seleccionada.</div>`;
            return;
        }

        const items = filtered.map((comp) => {
            const realIdx = _programCompetences.indexOf(comp);
            return _renderAccordionItem(comp, realIdx);
        }).join('');

        container.innerHTML = `<div class="accordion" id="competences-accordion">${items}</div>`;
    }

    // ─── Renderiza en modo sólo-lectura (competencias definidas en Evaluación) ─
    function _renderViewOnly() {
        const container = document.getElementById('competences-list-container');
        if (!container) return;

        const filterArea = document.getElementById('competences-area-filter')?.value || '';

        if (!_programCompetences.length) {
            container.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="bi bi-award fs-1 d-block mb-2 opacity-50"></i>
                    <p class="mb-1">Aún no hay competencias definidas.</p>
                    <small>Ve a la sección <strong>Evaluación</strong> y haz clic en el badge de competencias de cada proyecto para definirlas.</small>
                </div>`;
            return;
        }

        const filtered = filterArea
            ? _programCompetences.filter(c => c.area === filterArea)
            : _programCompetences;

        if (!filtered.length) {
            container.innerHTML = `<div class="text-center py-3 text-muted"><i class="bi bi-filter-circle me-2"></i>No hay competencias en el área seleccionada.</div>`;
            return;
        }

        const items = filtered.map((comp, i) => _renderViewOnlyItem(comp, i)).join('');
        container.innerHTML = `<div class="accordion" id="competences-accordion">${items}</div>`;
    }

    function _renderViewOnlyItem(comp, idx) {
        const areaColor = _areaColor(comp.area);
        const selectedToolsCount = (comp.selectedTools || []).length;
        const allToolsCount      = (comp.allTools || []).length;
        const toolBadges = (comp.selectedTools || []).map(t =>
            `<span class="badge bg-light text-dark border me-1 mb-1"><i class="bi bi-tools me-1 opacity-50"></i>${_esc(t)}</span>`
        ).join('');
        const levelRows = (comp.levels || []).map(l => `
            <div class="d-flex align-items-start gap-2 mb-2">
                <span class="badge bg-${_levelColor(l.level)} flex-shrink-0" style="min-width:2rem;text-align:center;">${l.level}</span>
                <div>
                    <strong class="small">${_esc(l.description)}</strong>
                    <ul class="mb-0 ps-3 small text-muted">
                        ${(l.indicators || []).map(i => `<li>${_esc(i)}</li>`).join('')}
                    </ul>
                </div>
            </div>`).join('');

        const collapseId = `vo-comp-${idx}`;
        return `
        <div class="accordion-item mb-2 border rounded">
            <h2 class="accordion-header">
                <button class="accordion-button collapsed py-2" type="button"
                    data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false">
                    <span class="badge bg-${areaColor} me-2" style="font-size:.7rem;">${_esc(comp.area || 'Sin área')}</span>
                    <span class="fw-semibold me-2">${_esc(comp.name)}</span>
                    <span class="badge bg-light text-muted border ms-auto me-3" style="font-size:.7rem;">
                        <i class="bi bi-tools me-1"></i>${selectedToolsCount}/${allToolsCount} herramientas
                    </span>
                </button>
            </h2>
            <div id="${collapseId}" class="accordion-collapse collapse">
                <div class="accordion-body pt-2">
                    ${comp.description ? `<p class="small text-muted mb-2">${_esc(comp.description)}</p>` : ''}
                    ${toolBadges ? `<div class="mb-3"><strong class="small text-muted d-block mb-1"><i class="bi bi-tools me-1"></i>Herramientas seleccionadas:</strong>${toolBadges}</div>` : ''}
                    ${levelRows ? `<div><strong class="small text-muted d-block mb-1"><i class="bi bi-bar-chart-steps me-1"></i>Niveles:</strong>${levelRows}</div>` : ''}
                </div>
            </div>
        </div>`;
    }


    function _renderAccordionItem(comp, idx) {
        const areaColor = _areaColor(comp.area);
        const selectedToolsCount = (comp.selectedTools || []).length;
        const allToolsCount = (comp.allTools || []).length;
        const levelsCount = (comp.levels || []).length;

        // Multi-module selector (checkboxes)
        const modules = (window.promotionModules && window.promotionModules.length)
            ? window.promotionModules
            : [];

        // Migrate legacy startModule → evalModules if needed
        if (!comp.evalModules && comp.startModule) {
            comp.evalModules = [{ id: comp.startModule.id, name: comp.startModule.name }];
        }
        if (!comp.evalModules) comp.evalModules = [];

        const selectedModuleIds = new Set((comp.evalModules || []).map(m => String(m.id)));

        const moduleCheckboxes = modules.map(m => {
            const checked = selectedModuleIds.has(String(m.id)) ? 'checked' : '';
            return `<div class="form-check">
                <input class="form-check-input" type="checkbox" value="${_esc(String(m.id))}"
                    id="comp-mod-${idx}-${_esc(String(m.id))}"
                    data-mod-name="${_esc(m.name || m.title || `Módulo`)}"
                    onchange="window.ProgramCompetences._toggleEvalModule(${idx}, this)"
                    ${checked}>
                <label class="form-check-label small" for="comp-mod-${idx}-${_esc(String(m.id))}">
                    ${_esc(m.name || m.title || `Módulo ${m.id}`)}
                </label>
            </div>`;
        }).join('');

        // Module badges for collapsed header
        const evalModuleBadges = (comp.evalModules || []).map(m =>
            `<span class="badge ms-1 small" style="background:#E85D26;color:#fff;"><i class="bi bi-folder2 me-1"></i>${_esc(m.name)}</span>`
        ).join('');

        // Tools badges
        const toolBadges = (comp.selectedTools || []).map(t =>
            `<span class="badge bg-light text-dark border me-1 mb-1"><i class="bi bi-tools me-1 opacity-50"></i>${_esc(t)}</span>`
        ).join('');

        // Level rows
        const levelRows = (comp.levels || []).map(l => `
            <div class="d-flex align-items-start gap-2 mb-2">
                <span class="badge bg-${_levelColor(l.level)} flex-shrink-0" style="min-width:2rem; text-align:center;">${l.level}</span>
                <div>
                    <strong class="small">${_esc(l.description)}</strong>
                    <ul class="mb-0 ps-3 small text-muted">
                        ${(l.indicators || []).map(i => `<li>${_esc(i)}</li>`).join('')}
                    </ul>
                </div>
            </div>`).join('');

        return `
        <div class="accordion-item border-start border-4" style="border-color:#E85D26 !important;" data-competence-idx="${idx}">
            <h2 class="accordion-header" id="comp-header-${idx}">
                <button class="accordion-button collapsed py-2" type="button"
                    data-bs-toggle="collapse" data-bs-target="#comp-body-${idx}"
                    aria-expanded="false" aria-controls="comp-body-${idx}">
                    <div class="d-flex align-items-center flex-wrap gap-2 w-100 me-3">
                        <span class="badge" style="background:#E85D26;">${_esc(comp.area)}</span>
                        <strong>${_esc(comp.name)}</strong>
                        ${evalModuleBadges}
                        <span class="ms-auto d-flex gap-2 small text-muted">
                            <span title="Herramientas seleccionadas"><i class="bi bi-tools me-1"></i>${selectedToolsCount}/${allToolsCount}</span>
                            <span title="Niveles"><i class="bi bi-bar-chart-steps me-1"></i>${levelsCount}</span>
                        </span>
                    </div>
                </button>
            </h2>
            <div id="comp-body-${idx}" class="accordion-collapse collapse"
                aria-labelledby="comp-header-${idx}" data-bs-parent="#competences-accordion">
                <div class="accordion-body pt-2 pb-3">
                    ${comp.description ? `<p class="text-muted small mb-3">${_esc(comp.description)}</p>` : ''}

                    <!-- Módulos de evaluación (multi-selección) -->
                    <div class="mb-3 p-3 rounded border" style="background:#fff8f5; border-color:#E85D26 !important;">
                        <label class="form-label small fw-semibold mb-2" style="color:#E85D26;">
                            <i class="bi bi-folder2-open me-1"></i>Módulos en los que se evalúa esta competencia
                        </label>
                        <p class="small text-muted mb-2">
                            <i class="bi bi-info-circle me-1"></i>Al guardar, la competencia se añade automáticamente a todos los proyectos de los módulos seleccionados.
                        </p>
                        ${modules.length === 0
                            ? '<small class="text-muted fst-italic">Crea módulos en el Roadmap para poder asignarlos aquí.</small>'
                            : `<div class="d-flex flex-wrap gap-3">${moduleCheckboxes}</div>`
                        }
                    </div>

                    <div class="row g-3">
                        <div class="col-lg-6">
                            <h6 class="small text-uppercase text-muted mb-2">
                                <i class="bi bi-bar-chart-steps me-1"></i>Niveles e indicadores
                            </h6>
                            ${levelRows || '<span class="text-muted small fst-italic">Sin niveles definidos.</span>'}
                        </div>
                        <div class="col-lg-6">
                            <h6 class="small text-uppercase text-muted mb-2">
                                <i class="bi bi-tools me-1"></i>Herramientas seleccionadas
                            </h6>
                            <div class="mb-2">
                                ${toolBadges || '<span class="text-muted small fst-italic">Sin herramientas seleccionadas.</span>'}
                            </div>
                            <button class="btn btn-sm btn-outline-secondary mt-1"
                                onclick="window.ProgramCompetences._openToolsEditor(${idx})">
                                <i class="bi bi-pencil me-1"></i>Editar herramientas
                            </button>
                        </div>
                    </div>

                    <div class="d-flex justify-content-end mt-3 pt-2 border-top">
                        <button class="btn btn-sm btn-outline-danger"
                            onclick="window.ProgramCompetences._removeCompetence(${idx})">
                            <i class="bi bi-trash me-1"></i>Quitar competencia
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    }

    // ─── Helper: obtener o crear instancia de Modal ───────────────────────────
    function _getOrCreateModalInstance(el) {
        return bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el);
    }

    // ─── Abre modal para añadir competencia del catálogo ──────────────────────
    function openAddCompetenceModal() {
        _buildAddCompetenceModal();
        const el = document.getElementById('addCompetenceModal');
        _getOrCreateModalInstance(el).show();
    }

    function _buildAddCompetenceModal() {
        let modal = document.getElementById('addCompetenceModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'addCompetenceModal';
            modal.className = 'modal fade';
            modal.tabIndex = -1;
            document.body.appendChild(modal);
        }

        const areaOptions = AREAS.map(a =>
            `<option value="${_esc(a)}">${_esc(a)}</option>`
        ).join('');

        const catalogCards = COMPETENCES_CATALOG.map((comp, i) => {
            const alreadyAdded = _programCompetences.some(pc => pc.id === comp.id);
            return `
            <div class="catalog-card col-12 mb-2" data-area="${_esc(comp.area)}" data-catalog-idx="${i}">
                <div class="card ${alreadyAdded ? 'border-success' : ''}">
                    <div class="card-body py-2 px-3 d-flex justify-content-between align-items-center">
                        <div>
                            <span class="badge bg-${_areaColor(comp.area)} me-2">${_esc(comp.area)}</span>
                            <strong>${_esc(comp.name)}</strong>
                            <small class="text-muted ms-2 d-none d-md-inline">${_esc(comp.description)}</small>
                        </div>
                        <button class="btn btn-sm ${alreadyAdded ? 'btn-success' : 'btn-outline-primary'}"
                            ${alreadyAdded ? 'disabled' : `onclick="window.ProgramCompetences._addFromCatalog(${i})"`}>
                            ${alreadyAdded ? '<i class="bi bi-check-lg"></i> Añadida' : '<i class="bi bi-plus"></i> Añadir'}
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');

        modal.innerHTML = `
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"><i class="bi bi-award me-2"></i>Añadir Competencia al Programa</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label">Filtrar por área</label>
                        <select class="form-select" id="catalog-area-filter" onchange="window.ProgramCompetences._filterCatalog()">
                            <option value="">Todas las áreas</option>
                            ${areaOptions}
                        </select>
                    </div>
                    <div class="row" id="catalog-cards-container">
                        ${catalogCards}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                </div>
            </div>
        </div>`;
    }

    function _filterCatalog() {
        const filterVal = document.getElementById('catalog-area-filter')?.value || '';
        document.querySelectorAll('#catalog-cards-container .catalog-card').forEach(el => {
            const area = el.dataset.area;
            el.style.display = (!filterVal || area === filterVal) ? '' : 'none';
        });
    }

    function _addFromCatalog(catalogIdx) {
        const source = COMPETENCES_CATALOG[catalogIdx];
        if (!source) return;
        if (_programCompetences.some(pc => pc.id === source.id)) return;

        _programCompetences.push({
            id: source.id,
            area: source.area,
            name: source.name,
            description: source.description,
            levels: JSON.parse(JSON.stringify(source.levels)),
            allTools: [...(source.allTools || [])],
            selectedTools: [],
            evalModules: []
        });

        // Rebuild modal content to update "Añadida" buttons, keep it open
        _buildAddCompetenceModal();
        const filterVal = document.getElementById('catalog-area-filter')?.value || '';
        if (filterVal) {
            document.querySelectorAll('#catalog-cards-container .catalog-card').forEach(el => {
                el.style.display = el.dataset.area === filterVal ? '' : 'none';
            });
        }

        _render();
        _markUnsaved();
    }

    // ─── Activa/desactiva un módulo de evaluación para una competencia ────────
    function _toggleEvalModule(idx, checkbox) {
        if (!_programCompetences[idx]) return;
        if (!_programCompetences[idx].evalModules) _programCompetences[idx].evalModules = [];

        const moduleId = checkbox.value;
        const moduleName = checkbox.dataset.modName || moduleId;

        if (checkbox.checked) {
            if (!_programCompetences[idx].evalModules.some(m => String(m.id) === String(moduleId))) {
                _programCompetences[idx].evalModules.push({ id: moduleId, name: moduleName });
            }
        } else {
            _programCompetences[idx].evalModules = _programCompetences[idx].evalModules.filter(
                m => String(m.id) !== String(moduleId)
            );
        }

        // Update collapsed header badges without full re-render
        const headerBtn = document.querySelector(`#comp-header-${idx} .accordion-button`);
        if (headerBtn) {
            headerBtn.querySelectorAll('.eval-mod-badge').forEach(b => b.remove());
            _programCompetences[idx].evalModules.forEach(m => {
                const badge = document.createElement('span');
                badge.className = 'badge ms-1 small eval-mod-badge';
                badge.style.cssText = 'background:#E85D26;color:#fff;';
                badge.innerHTML = `<i class="bi bi-folder2 me-1"></i>${_esc(m.name)}`;
                headerBtn.querySelector('strong').insertAdjacentElement('afterend', badge);
            });
        }

        _markUnsaved();
    }

    /**
     * Returns an array of { moduleId, competenceId } pairs for syncing to the roadmap.
     * Used by promotion-detail.js saveExtendedInfo to auto-apply competences to module projects.
     */
    function getEvalModulesSyncData() {
        const result = [];
        _programCompetences.forEach(comp => {
            // Migrate legacy
            const mods = comp.evalModules || (comp.startModule ? [comp.startModule] : []);
            mods.forEach(m => {
                result.push({ moduleId: String(m.id), competenceId: String(comp.id) });
            });
        });
        return result;
    }

    // ─── Quitar competencia ───────────────────────────────────────────────────
    function _removeCompetence(idx) {
        if (!confirm(`¿Quitar la competencia "${_programCompetences[idx]?.name}" del programa?`)) return;
        _programCompetences.splice(idx, 1);
        _render();
        _markUnsaved();
    }

    // ─── Editor de herramientas seleccionadas ─────────────────────────────────
    function _openToolsEditor(idx) {
        const comp = _programCompetences[idx];
        if (!comp) return;

        let modal = document.getElementById('toolsEditorModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'toolsEditorModal';
            modal.className = 'modal fade';
            modal.tabIndex = -1;
            document.body.appendChild(modal);
        }

        // Store current editing index on the modal element for use by _addCustomToolToEditor
        modal._editingIdx = idx;

        const checkboxes = (comp.allTools || []).map(tool => {
            const checked = (comp.selectedTools || []).includes(tool) ? 'checked' : '';
            const isCustom = !(COMPETENCES_CATALOG.find(c => c.id === comp.id)?.allTools || []).includes(tool);
            return `
            <div class="form-check d-flex align-items-center gap-2" id="tool-row-${_esc(tool.replace(/[\s/]/g, '-'))}">
                <input class="form-check-input tools-checkbox" type="checkbox"
                    value="${_esc(tool)}" id="tool-${_esc(tool.replace(/[\s/]/g, '-'))}" ${checked}>
                <label class="form-check-label flex-grow-1" for="tool-${_esc(tool.replace(/[\s/]/g, '-'))}">
                    ${_esc(tool)}
                    ${isCustom ? '<span class="badge bg-primary ms-1" style="font-size:.65rem;">personalizada</span>' : ''}
                </label>
                ${isCustom ? `<button type="button" class="btn btn-sm btn-link text-danger p-0 ms-auto"
                    title="Eliminar herramienta personalizada"
                    onclick="window.ProgramCompetences._removeCustomToolFromEditor('${_esc(tool)}', ${idx})">
                    <i class="bi bi-x-circle" style="font-size:.9rem;"></i>
                </button>` : ''}
            </div>`;
        }).join('');

        modal.innerHTML = `
        <div class="modal-dialog modal-dialog-scrollable">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"><i class="bi bi-tools me-2"></i>Herramientas — ${_esc(comp.name)}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p class="text-muted small mb-3">
                        Selecciona las herramientas del catálogo y/o añade herramientas personalizadas.
                    </p>

                    <!-- Tool checklist -->
                    <div id="tools-checklist" class="mb-3">
                        ${checkboxes || '<span class="text-muted small fst-italic">No hay herramientas en el catálogo para esta competencia.</span>'}
                    </div>

                    <!-- Add custom tool -->
                    <div class="border-top pt-3 mt-2">
                        <label class="form-label small fw-semibold">
                            <i class="bi bi-plus-circle me-1 text-primary"></i>Añadir herramienta personalizada
                        </label>
                        <div class="d-flex gap-2">
                            <input type="text" id="custom-tool-editor-input" class="form-control form-control-sm"
                                placeholder="Ej: Figma, Storybook, Postman..."
                                onkeydown="if(event.key==='Enter'){event.preventDefault(); window.ProgramCompetences._addCustomToolToEditor(${idx});}">
                            <button type="button" class="btn btn-sm btn-outline-primary px-3" style="white-space:nowrap;"
                                onclick="window.ProgramCompetences._addCustomToolToEditor(${idx})">
                                <i class="bi bi-plus-lg me-1"></i>Añadir
                            </button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="button" class="btn btn-primary" onclick="window.ProgramCompetences._saveToolsSelection(${idx})">
                        <i class="bi bi-floppy me-1"></i>Guardar
                    </button>
                </div>
            </div>
        </div>`;

        bootstrap.Modal.getInstance(modal)?.hide();
        _getOrCreateModalInstance(modal).show();
    }

    // Add a custom tool to the checklist inside the modal (does NOT save yet)
    function _addCustomToolToEditor(idx) {
        const input = document.getElementById('custom-tool-editor-input');
        if (!input) return;
        const name = input.value.trim();
        if (!name) return;

        const comp = _programCompetences[idx];
        if (!comp) return;

        // Check for duplicate (case-insensitive)
        const allLower = (comp.allTools || []).map(t => t.toLowerCase());
        if (allLower.includes(name.toLowerCase())) {
            // Just check the existing checkbox if unchecked
            const existingCb = document.getElementById(`tool-${name.replace(/[\s/]/g, '-')}`);
            if (existingCb && !existingCb.checked) existingCb.checked = true;
            input.value = '';
            return;
        }

        // Add to allTools immediately so it persists when saved
        if (!comp.allTools) comp.allTools = [];
        comp.allTools.push(name);

        // Build and insert a new checkbox row into the checklist
        const checklist = document.getElementById('tools-checklist');
        if (checklist) {
            // Remove "no tools" placeholder if present
            const placeholder = checklist.querySelector('span.text-muted');
            if (placeholder) placeholder.remove();

            const row = document.createElement('div');
            row.className = 'form-check d-flex align-items-center gap-2';
            row.id = `tool-row-${name.replace(/[\s/]/g, '-')}`;
            row.innerHTML = `
                <input class="form-check-input tools-checkbox" type="checkbox"
                    value="${_esc(name)}" id="tool-${_esc(name.replace(/[\s/]/g, '-'))}" checked>
                <label class="form-check-label flex-grow-1" for="tool-${_esc(name.replace(/[\s/]/g, '-'))}">
                    ${_esc(name)}
                    <span class="badge bg-primary ms-1" style="font-size:.65rem;">personalizada</span>
                </label>
                <button type="button" class="btn btn-sm btn-link text-danger p-0 ms-auto"
                    title="Eliminar herramienta personalizada"
                    onclick="window.ProgramCompetences._removeCustomToolFromEditor('${_esc(name)}', ${idx})">
                    <i class="bi bi-x-circle" style="font-size:.9rem;"></i>
                </button>`;
            checklist.appendChild(row);
        }

        input.value = '';
        input.focus();
    }

    // Remove a custom tool row from the modal checklist AND from allTools
    function _removeCustomToolFromEditor(toolName, idx) {
        const comp = _programCompetences[idx];
        if (!comp) return;

        // Remove from allTools and selectedTools arrays
        comp.allTools = (comp.allTools || []).filter(t => t !== toolName);
        comp.selectedTools = (comp.selectedTools || []).filter(t => t !== toolName);

        // Remove the DOM row
        const rowId = `tool-row-${toolName.replace(/[\s/]/g, '-')}`;
        document.getElementById(rowId)?.remove();

        // Show placeholder if no tools left
        const checklist = document.getElementById('tools-checklist');
        if (checklist && !checklist.querySelector('.form-check')) {
            checklist.innerHTML = '<span class="text-muted small fst-italic">No hay herramientas en el catálogo para esta competencia.</span>';
        }
    }

    function _saveToolsSelection(idx) {
        const selected = Array.from(
            document.querySelectorAll('#toolsEditorModal .tools-checkbox:checked')
        ).map(cb => cb.value);
        _programCompetences[idx].selectedTools = selected;
        const toolsModal = document.getElementById('toolsEditorModal');
        bootstrap.Modal.getInstance(toolsModal)?.hide();
        _render();
        _markUnsaved();
    }

    // ─── Filtro de área en la vista del programa ───────────────────────────────
    function filterByArea() {
        if (_viewOnlyMode) _renderViewOnly();
        else _render();
    }

    // ─── Notifica al sistema principal que hay cambios sin guardar ────────────
    function _markUnsaved() {
        // Integración con promotion-detail.js: activa el badge de "unsaved"
        const badge = document.getElementById('competences-unsaved-badge');
        if (badge) badge.classList.remove('d-none');
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────
    function _esc(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function _areaColor(area) {
        const map = {
            'web': 'primary',
            'ai': 'dark',
            'accessibility': 'info',
            'green': 'success',
            'inmersivo': 'warning'
        };
        return map[area] || 'secondary';
    }

    function _levelColor(level) {
        return { 1: 'secondary', 2: 'warning', 3: 'primary', 4: 'success' }[level] || 'secondary';
    }

    // ─── API pública ──────────────────────────────────────────────────────────
    window.ProgramCompetences = {
        init,
        initViewOnly,
        getCompetences,
        getEvalModulesSyncData,
        openAddCompetenceModal,
        filterByArea,
        _addFromCatalog,
        _filterCatalog,
        _removeCompetence,
        _openToolsEditor,
        _addCustomToolToEditor,
        _removeCustomToolFromEditor,
        _saveToolsSelection,
        _toggleEvalModule
    };

}(window));
