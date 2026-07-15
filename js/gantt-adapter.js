// gantt-adapter.js
// Adaptador de datos entre el modelo de dominio de la promoción
// (promotion.modules[] / promotion.employability[]) y el formato
// de dataset que espera DHTMLX Gantt (gantt.parse({ data, links })).
//
// No depende de Express/HTTP — es una función pura de transformación,
// consumida por promotion-detail.js.

const GANTT_DATE_FORMAT = '%d-%m-%Y'; // debe coincidir con gantt.config.date_format

/**
 * Formatea un objeto Date al formato "DD-MM-YYYY" usado por DHTMLX Gantt.
 * @param {Date} date
 * @returns {string}
 */
function formatGanttDate(date) {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
}

/**
 * Suma N días a una fecha base sin mutarla.
 * @param {Date} baseDate
 * @param {number} days
 * @returns {Date}
 */
function addDays(baseDate, days) {
    const result = new Date(baseDate.getTime());
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Traduce el `type` de un plannerItem ('curso'/'proyecto'/'leccion') al
 * `itemType` que usa el Gantt ('course'/'project'/'leccion').
 */
function plannerTypeToItemType(type) {
    if (type === 'curso') return 'course';
    if (type === 'proyecto') return 'project';
    return 'leccion';
}

/**
 * Devuelve el inicio (en semanas, absoluto desde `promotion.startDate`) del
 * módulo en `moduleIndex`. Si el módulo tiene `startOffset` explícito (se
 * movió libremente en el Gantt), se usa ese valor. Si no, se deriva
 * encadenando secuencialmente desde el fin del módulo anterior — mismo
 * comportamiento que antes de soportar `startOffset` (compatibilidad con
 * promociones ya creadas que nunca movieron un módulo).
 * @param {Array<Object>} modules
 * @param {number} moduleIndex
 * @returns {number}
 */
function getModuleStartWeeks(modules, moduleIndex) {
    let cursor = 0;
    for (let i = 0; i <= moduleIndex; i++) {
        const m = modules[i] || {};
        const explicitOffset = m.startOffset;
        const startWeeks = (typeof explicitOffset === 'number' && !Number.isNaN(explicitOffset))
            ? explicitOffset
            : cursor;
        if (i === moduleIndex) return startWeeks;
        cursor = startWeeks + (Number(m.duration) || 1);
    }
    return cursor;
}

/**
 * Devuelve la lista unificada de items de un módulo (cursos + proyectos + lecciones).
 * Fuente de verdad: `module.plannerItems[]` (TASK-RM-05c) cuando existe y no está
 * vacío — es la única fuente que incluye las `leccion`. Si el módulo es legacy
 * (sin plannerItems), se reconstruye desde `module.courses[]`/`module.projects[]`
 * (mismo criterio que `buildInitialPlannerFromLegacy` en promotion-detail.js).
 *
 * Nota: los items de tipo `leccion` no usan `name`/`url` como cursos/proyectos —
 * usan `title` (nombre) y `links[]` (0..N enlaces), sin `duration`/`startOffset`
 * propios (no se planifican en el tiempo desde el planificador de módulo).
 *
 * @param {Object} module
 * @returns {Array<{ plannerItemId: string|null, type: string, name: string, url: string, duration: number, startOffset: number, links: Array }>}
 */
function getModulePlannerItems(module) {
    if (Array.isArray(module.plannerItems) && module.plannerItems.length > 0) {
        return module.plannerItems.map(item => {
            const isLeccion = item.type === 'leccion';
            return {
                plannerItemId: item.id || null,
                type: item.type || 'curso',
                name: isLeccion ? (item.title || 'Sin nombre') : (item.name || 'Sin nombre'),
                url: isLeccion ? '' : (item.url || ''),
                duration: Number(item.duration) || 1,
                startOffset: Number(item.startOffset) || 0,
                links: isLeccion ? (item.links || []) : [],
            };
        });
    }

    const items = [];
    (module.courses || []).forEach(c => {
        const isObj = c && typeof c === 'object';
        items.push({
            plannerItemId: null,
            type: 'curso',
            name: isObj ? (c.name || 'Sin nombre') : String(c),
            url: isObj ? (c.url || '') : '',
            duration: isObj ? (Number(c.duration) || 1) : 1,
            startOffset: isObj ? (Number(c.startOffset) || 0) : 0,
            links: [],
        });
    });
    (module.projects || []).forEach(p => {
        const isObj = p && typeof p === 'object';
        items.push({
            plannerItemId: null,
            type: 'proyecto',
            name: isObj ? (p.name || 'Sin nombre') : String(p),
            url: isObj ? (p.url || '') : '',
            duration: isObj ? (Number(p.duration) || 1) : 1,
            startOffset: isObj ? (Number(p.startOffset) || 0) : 0,
            links: [],
        });
    });
    return items;
}

/**
 * Construye el dataset { data, links } que DHTMLX Gantt puede cargar con gantt.parse().
 * Cada módulo es una tarea padre; cada curso/proyecto/lección es una subtarea hija.
 *
 * @param {Object} promotion - Objeto promotion tal como lo devuelve la API (con modules[], startDate)
 * @returns {{ data: Array<Object>, links: Array<Object> }}
 */
function buildGanttDataset(promotion) {
    const data = [];
    const links = [];

    if (!promotion || !Array.isArray(promotion.modules) || promotion.modules.length === 0) {
        return { data, links };
    }

    // Fecha base: startDate de la promoción, o "hoy" si no está definida.
    const baseDate = promotion.startDate ? new Date(promotion.startDate) : new Date();

    const modules = promotion.modules || [];

    // Nota: la empleabilidad ya NO se representa en el Gantt (decisión del
    // docente). Su gestión (modal "Sesiones Empleabilidad") sigue intacta,
    // solo se dejó de alimentar el dataset de DHTMLX Gantt con sus tareas.

    // ── Módulos y sus cursos/proyectos/lecciones ────────────────────────────────
    modules.forEach((module, moduleIndex) => {
        const moduleId = `module-${moduleIndex}`;
        const moduleStartWeeks = getModuleStartWeeks(modules, moduleIndex);
        const moduleStartDate = addDays(baseDate, moduleStartWeeks * 7);
        const moduleDurationWeeks = Number(module.duration) || 1;

        data.push({
            id: moduleId,
            text: `M${moduleIndex + 1}: ${module.name || 'Sin nombre'}`,
            type: 'project',
            open: true,
            start_date: formatGanttDate(moduleStartDate),
            duration: moduleDurationWeeks * 7,
            progress: 0,
            itemType: 'module',
            itemIndex: moduleIndex,
            moduleId: module.id,
        });

        let legacyCourseIndex = 0;
        let legacyProjectIndex = 0;
        const lessonItems = [];

        getModulePlannerItems(module).forEach((item) => {
            const itemType = plannerTypeToItemType(item.type);

            // Las lecciones no se pintan una a una bajo el módulo: se agrupan
            // todas dentro de un único nodo desplegable "Lecciones" (ver abajo).
            if (itemType === 'leccion') {
                lessonItems.push(item);
                return;
            }

            const startDate = addDays(baseDate, (moduleStartWeeks + item.startOffset) * 7);

            // Índice dentro del array legacy correspondiente — solo se usa
            // cuando el módulo no tiene plannerItems (fallback de compatibilidad).
            let legacyIndex;
            if (!item.plannerItemId) {
                if (itemType === 'course') legacyIndex = legacyCourseIndex++;
                else if (itemType === 'project') legacyIndex = legacyProjectIndex++;
            }

            const idSuffix = item.plannerItemId || `legacy-${itemType}-${legacyIndex}`;

            data.push({
                id: `item-${moduleIndex}-${idSuffix}`,
                text: item.name,
                parent: moduleId,
                start_date: formatGanttDate(startDate),
                duration: item.duration * 7,
                progress: 0,
                url: item.url,
                itemType,
                moduleIndex,
                moduleId: module.id,
                plannerItemId: item.plannerItemId,
                legacyIndex,
            });
        });

        // ── Grupo "Lecciones" del módulo (nodo desplegable único) ──────────────
        // Su posición/duración se guarda en `module.lessonsBlock` para poder
        // moverla/redimensionarla igual que cualquier otra tarea del Gantt.
        // Por defecto ocupa todo el rango del módulo si aún no se ha ajustado.
        if (lessonItems.length > 0) {
            const lessonsGroupId = `module-${moduleIndex}-lecciones`;
            const lessonsBlock = module.lessonsBlock || {};
            const groupStartOffset = Number(lessonsBlock.startOffset) || 0;
            const groupDurationWeeks = Number(lessonsBlock.duration) || moduleDurationWeeks;
            const groupStartDate = addDays(baseDate, (moduleStartWeeks + groupStartOffset) * 7);

            data.push({
                id: lessonsGroupId,
                text: 'Lecciones',
                parent: moduleId,
                type: 'project',
                open: false,
                start_date: formatGanttDate(groupStartDate),
                duration: groupDurationWeeks * 7,
                progress: 0,
                itemType: 'leccion-group',
                moduleIndex,
                moduleId: module.id,
            });

            lessonItems.forEach((item) => {
                const startDate = addDays(baseDate, (moduleStartWeeks + item.startOffset) * 7);
                const firstLink = Array.isArray(item.links) && item.links.length > 0 ? item.links[0] : null;

                data.push({
                    id: `item-${moduleIndex}-${item.plannerItemId}`,
                    text: item.name,
                    parent: lessonsGroupId,
                    start_date: formatGanttDate(startDate),
                    duration: item.duration * 7,
                    progress: 0,
                    url: firstLink ? (firstLink.url || '') : '',
                    links: item.links || [],
                    itemType: 'leccion',
                    moduleIndex,
                    moduleId: module.id,
                    plannerItemId: item.plannerItemId,
                });
            });
        }
    });

    // ── Bloques de "Tiempo flexible" (vacaciones/festivos) ──────────────────────
    // Nivel superior, sin `parent` (mismo nivel que un módulo). Posición y
    // duración son siempre absolutas (`startOffset`/`duration` en semanas desde
    // `promotion.startDate`) y no dependen de módulos vecinos.
    (promotion.flexibleBlocks || []).forEach((block) => {
        const blockStartOffset = Number(block.startOffset) || 0;
        const blockDurationWeeks = Number(block.duration) || 1;
        const blockStartDate = addDays(baseDate, blockStartOffset * 7);

        data.push({
            id: `flexible-${block.id}`,
            text: block.name || 'Tiempo flexible',
            start_date: formatGanttDate(blockStartDate),
            duration: blockDurationWeeks * 7,
            progress: 0,
            itemType: 'flexible',
            flexibleBlockId: block.id,
        });
    });

    return { data, links };
}

window.buildGanttDataset = buildGanttDataset;
window.formatGanttDate = formatGanttDate;
window.GANTT_DATE_FORMAT = GANTT_DATE_FORMAT;

/**
 * Traduce el cambio hecho por el docente (drag/resize) sobre una tarea del
 * Gantt de vuelta al modelo de dominio de la promoción (in-place).
 *
 * Reglas de negocio (siguen la misma convención que el Gantt original):
 * - Módulos: se puede cambiar tanto su posición (`startOffset`, semanas
 *   absolutas desde `promotion.startDate`) como su `duration`. Si un módulo
 *   nunca se movió, `startOffset` no existe y su posición se sigue derivando
 *   secuencialmente (ver `getModuleStartWeeks`) — mover otro módulo cercano
 *   no lo afecta hasta que también se mueva explícitamente.
 * - Cursos/Proyectos/Lecciones: tienen `duration` y `startOffset` (semanas
 *   relativas al inicio de su módulo). Si el módulo tiene `plannerItems`
 *   (fuente de verdad), se actualiza ahí por `id` y se resincronizan los
 *   arrays legacy `courses`/`projects` derivados (igual que hace el modal
 *   de módulo al guardar). Si el módulo es legacy (sin plannerItems), se
 *   actualiza directamente el array `courses`/`projects` por índice.
 * - La empleabilidad ya no se representa en el Gantt (TASK-7), por lo que
 *   no hay una rama `employability` que traducir aquí.
 *
 * @param {Object} promotion - Promotion completa (se muta in-place)
 * @param {Object} task - Tarea de DHTMLX Gantt ya actualizada (gantt.getTask(id))
 * @returns {boolean} true si se aplicó algún cambio sobre `promotion`
 */
function applyGanttTaskChange(promotion, task) {
    if (!promotion || !task) return false;

    const baseDate = promotion.startDate ? new Date(promotion.startDate) : new Date();
    const startDays = Math.round((task.start_date - baseDate) / 86400000);
    const durationDays = Number(task.duration) || 1;
    const durationWeeks = Math.max(1, Math.round(durationDays / 7));

    if (task.itemType === 'module') {
        const module = (promotion.modules || [])[task.itemIndex];
        if (!module) return false;
        const startWeeks = Math.max(0, Math.round(startDays / 7));
        module.startOffset = startWeeks;
        module.duration = durationWeeks;
        return true;
    }

    if (task.itemType === 'flexible') {
        const block = (promotion.flexibleBlocks || []).find(b => b.id === task.flexibleBlockId);
        if (!block) return false;

        const startWeeks = Math.max(0, Math.round(startDays / 7));
        block.startOffset = startWeeks;
        block.duration = durationWeeks;
        return true;
    }

    if (task.itemType === 'leccion-group') {
        const module = (promotion.modules || [])[task.moduleIndex];
        if (!module) return false;

        const moduleStartWeeks = getModuleStartWeeks(promotion.modules, task.moduleIndex);
        const startWeeks = Math.round(startDays / 7);
        const startOffset = Math.max(0, startWeeks - moduleStartWeeks);

        module.lessonsBlock = { startOffset, duration: durationWeeks };
        return true;
    }

    if (task.itemType === 'course' || task.itemType === 'project' || task.itemType === 'leccion') {
        const module = (promotion.modules || [])[task.moduleIndex];
        if (!module) return false;

        const moduleStartWeeks = getModuleStartWeeks(promotion.modules, task.moduleIndex);
        const startWeeks = Math.round(startDays / 7);
        const startOffset = Math.max(0, startWeeks - moduleStartWeeks);

        if (Array.isArray(module.plannerItems) && module.plannerItems.length > 0 && task.plannerItemId) {
            const plannerItem = module.plannerItems.find(i => i.id === task.plannerItemId);
            if (!plannerItem) return false;

            plannerItem.duration = durationWeeks;
            plannerItem.startOffset = startOffset;

            // Resincroniza los arrays legacy derivados (mismo criterio que
            // usa el modal de módulo al guardar el planificador).
            module.courses = module.plannerItems
                .filter(i => i.type === 'curso')
                .map(i => ({ name: i.name, url: i.url || '', duration: Number(i.duration) || 1, startOffset: Number(i.startOffset) || 0 }));
            module.projects = module.plannerItems
                .filter(i => i.type === 'proyecto')
                .map(i => ({ name: i.name, url: i.url || '', duration: Number(i.duration) || 1, startOffset: Number(i.startOffset) || 0, competenceIds: i.competenceIds || [] }));

            return true;
        }

        // Fallback legacy: módulo sin plannerItems, se edita el array directamente.
        const list = task.itemType === 'course' ? module.courses : task.itemType === 'project' ? module.projects : null;
        if (!Array.isArray(list) || task.legacyIndex === undefined || !list[task.legacyIndex]) return false;

        const current = list[task.legacyIndex];
        if (typeof current === 'string') {
            list[task.legacyIndex] = { name: current, duration: durationWeeks, startOffset };
        } else {
            current.duration = durationWeeks;
            current.startOffset = startOffset;
        }
        return true;
    }

    return false;
}

window.applyGanttTaskChange = applyGanttTaskChange;
