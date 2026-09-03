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
 * Devuelve el inicio (en semanas, absoluto desde `promotion.startDate`) de un
 * curso/proyecto/lección. Si el item tiene `absoluteStartOffset` explícito (se
 * movió libremente en el Gantt, o se fijó desde el planificador — Fase 5), se
 * usa ese valor tal cual, **independiente de dónde esté su módulo**. Si no,
 * cae al cálculo legacy relativo al módulo (`moduleStartWeeks + item.startOffset`)
 * — compatibilidad con items que nunca se movieron.
 * @param {{ startOffset: number, absoluteStartOffset?: number|null }} item
 * @param {number} moduleStartWeeks - inicio absoluto (semanas) del módulo padre
 * @returns {number}
 */
function getItemStartWeeks(item, moduleStartWeeks) {
    const explicitOffset = item.absoluteStartOffset;
    if (typeof explicitOffset === 'number' && !Number.isNaN(explicitOffset)) {
        return explicitOffset;
    }
    return moduleStartWeeks + (Number(item.startOffset) || 0);
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
    // Normaliza absoluteStartOffset: número válido tal cual, cualquier otra
    // cosa (undefined/null/NaN) se normaliza a null para que getItemStartWeeks()
    // sepa que debe caer al cálculo legacy relativo al módulo.
    const normalizeAbsolute = (v) => (typeof v === 'number' && !Number.isNaN(v)) ? v : null;

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
                absoluteStartOffset: normalizeAbsolute(item.absoluteStartOffset),
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
            absoluteStartOffset: isObj ? normalizeAbsolute(c.absoluteStartOffset) : null,
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
            absoluteStartOffset: isObj ? normalizeAbsolute(p.absoluteStartOffset) : null,
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

    // Filas de nivel superior (módulos y bloques de "Tiempo flexible"), cada una
    // con las filas que arrastra consigo (un módulo trae sus cursos/proyectos/
    // lecciones). Se acumulan aquí en vez de en `data` directamente porque el
    // ORDEN VISUAL final no es el de inserción, sino por fecha de inicio — ver
    // el sort más abajo (antes los bloques de tiempo flexible se pegaban
    // siempre al final de `data`, después de TODOS los módulos, sin importar
    // su fecha; visualmente caían siempre en la última fila del Gantt y no
    // había forma de "moverlos" entre módulos con drag de fila — reportado
    // como bug: 'si arrastro el bloque hacia arriba, al recargar vuelve a
    // dejarlo abajo del todo', porque nunca se leía/escribía ningún orden: la
    // posición en pantalla se recalculaba siempre igual, al final).
    const topLevelGroups = [];

    // ── Módulos y sus cursos/proyectos/lecciones ────────────────────────────────
    modules.forEach((module, moduleIndex) => {
        const moduleId = `module-${moduleIndex}`;
        const moduleStartWeeks = getModuleStartWeeks(modules, moduleIndex);
        const moduleStartDate = addDays(baseDate, moduleStartWeeks * 7);
        const moduleDurationWeeks = Number(module.duration) || 1;
        const moduleRows = [];

        moduleRows.push({
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

            const startDate = addDays(baseDate, getItemStartWeeks(item, moduleStartWeeks) * 7);

            // Índice dentro del array legacy correspondiente — solo se usa
            // cuando el módulo no tiene plannerItems (fallback de compatibilidad).
            let legacyIndex;
            if (!item.plannerItemId) {
                if (itemType === 'course') legacyIndex = legacyCourseIndex++;
                else if (itemType === 'project') legacyIndex = legacyProjectIndex++;
            }

            const idSuffix = item.plannerItemId || `legacy-${itemType}-${legacyIndex}`;

            moduleRows.push({
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

        // ── Grupo "Lecciones" del módulo (nodo desplegable, puramente visual) ──
        // Fase 5: ya no tiene posición propia editable (no se lee/escribe
        // `module.lessonsBlock`) — su rango se calcula como el min/max de las
        // semanas absolutas de sus lecciones hijas, que ahora se posicionan de
        // forma individual e independiente (ver `getItemStartWeeks`).
        if (lessonItems.length > 0) {
            const lessonsGroupId = `module-${moduleIndex}-lecciones`;
            const lessonWeekRanges = lessonItems.map(item => {
                const startWeeks = getItemStartWeeks(item, moduleStartWeeks);
                return { startWeeks, endWeeks: startWeeks + (Number(item.duration) || 1) };
            });
            const groupStartWeeks = Math.min(...lessonWeekRanges.map(r => r.startWeeks));
            const groupEndWeeks = Math.max(...lessonWeekRanges.map(r => r.endWeeks));
            const groupDurationWeeks = Math.max(1, groupEndWeeks - groupStartWeeks);
            const groupStartDate = addDays(baseDate, groupStartWeeks * 7);

            moduleRows.push({
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
                const startDate = addDays(baseDate, getItemStartWeeks(item, moduleStartWeeks) * 7);
                const firstLink = Array.isArray(item.links) && item.links.length > 0 ? item.links[0] : null;

                moduleRows.push({
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

        topLevelGroups.push({ startWeeks: moduleStartWeeks, order: topLevelGroups.length, rows: moduleRows });
    });

    // ── Bloques de "Tiempo flexible" (vacaciones/festivos) ──────────────────────
    // Nivel superior, sin `parent` (mismo nivel que un módulo). Posición y
    // duración son siempre absolutas (`startOffset`/`duration` en semanas desde
    // `promotion.startDate`) y no dependen de módulos vecinos. Su FILA se
    // intercala entre las de los módulos según esa misma fecha (ver sort más
    // abajo) — no se guarda un "orden" aparte: la posición temporal ES el orden.
    (promotion.flexibleBlocks || []).forEach((block) => {
        const blockStartOffset = Number(block.startOffset) || 0;
        const blockDurationWeeks = Number(block.duration) || 1;
        const blockStartDate = addDays(baseDate, blockStartOffset * 7);

        topLevelGroups.push({
            startWeeks: blockStartOffset,
            order: topLevelGroups.length,
            rows: [{
                id: `flexible-${block.id}`,
                text: block.name || 'Tiempo flexible',
                start_date: formatGanttDate(blockStartDate),
                duration: blockDurationWeeks * 7,
                progress: 0,
                itemType: 'flexible',
                flexibleBlockId: block.id,
            }],
        });
    });

    // Orden visual: por fecha de inicio ascendente. `order` (posición original,
    // módulos antes que flexibles) desempata cuando dos filas empiezan la misma
    // semana, para que el resultado sea determinista.
    topLevelGroups.sort((a, b) => (a.startWeeks - b.startWeeks) || (a.order - b.order));
    topLevelGroups.forEach((group) => { group.rows.forEach((row) => data.push(row)); });

    return { data, links };
}

window.buildGanttDataset = buildGanttDataset;
window.formatGanttDate = formatGanttDate;
window.GANTT_DATE_FORMAT = GANTT_DATE_FORMAT;

const GANTT_ITEM_TYPE_LABELS = {
    module: 'Módulo',
    course: 'Curso',
    project: 'Proyecto',
    leccion: 'Lección',
    flexible: 'Tiempo flexible',
};

/**
 * Construye filas planas (una por módulo/curso/proyecto/lección/bloque de
 * tiempo flexible) listas para exportar a Excel — reutiliza el mismo dataset
 * que alimenta el Gantt (`buildGanttDataset`), así que las fechas exportadas
 * son exactamente las que se ven dibujadas.
 * @param {Object} promotion
 * @returns {Array<{Módulo: string, Elemento: string, Tipo: string, Inicio: string, Fin: string, 'Duración (días)': number}>}
 */
function buildRoadmapExportRows(promotion) {
    const { data } = buildGanttDataset(promotion);
    const moduleNameByIndex = {};
    data.forEach(row => {
        if (row.itemType === 'module') moduleNameByIndex[row.itemIndex] = row.text;
    });

    return data
        .filter(row => row.itemType !== 'leccion-group')
        .map(row => {
            // start_date viene en formato "%d-%m-%Y" (GANTT_DATE_FORMAT) — se
            // parsea a mano para no depender de que dhtmlxgantt esté cargado.
            const [dd, mm, yyyy] = row.start_date.split('-').map(Number);
            const startDate = new Date(yyyy, mm - 1, dd);
            const durationDays = Math.max(1, Math.round(row.duration));
            const endDate = addDays(startDate, durationDays - 1); // último día activo (inclusive)

            const fmt = (d) => d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

            return {
                'Módulo': row.itemType === 'module' ? row.text : (moduleNameByIndex[row.moduleIndex] || ''),
                'Elemento': row.itemType === 'module' ? '' : row.text,
                'Tipo': GANTT_ITEM_TYPE_LABELS[row.itemType] || row.itemType,
                'Inicio': fmt(startDate),
                'Fin': fmt(endDate),
                'Duración (días)': durationDays,
            };
        });
}

window.buildRoadmapExportRows = buildRoadmapExportRows;

/**
 * Traduce el cambio hecho por el docente (drag/resize) sobre una tarea del
 * Gantt de vuelta al modelo de dominio de la promoción (in-place).
 *
 * Precisión por día: `startOffset`/`duration` siguen expresándose en la misma
 * unidad de siempre ("semanas absolutas desde `promotion.startDate`"), pero
 * ya NO se redondean a la semana completa más cercana — se redondea al DÍA
 * más cercano y se expresa como fracción de semana (p.ej. 15 días = 15/7
 * semanas). Como `buildGanttDataset()`/`getModuleStartWeeks()`/
 * `getItemStartWeeks()` ya multiplican esta misma cifra por 7 para obtener
 * días, esto basta para que el Gantt (en cualquier zoom, incluido "Día")
 * refleje y persista posiciones/duraciones con precisión de un día, sin tocar
 * el resto del pipeline de lectura/render ni los datos de promociones
 * existentes (un valor entero de semanas sigue significando exactamente lo
 * mismo que antes — es un caso particular de esta misma fracción).
 *
 * Reglas de negocio (siguen la misma convención que el Gantt original):
 * - Módulos: se puede cambiar tanto su posición (`startOffset`, semanas
 *   absolutas desde `promotion.startDate`) como su `duration`. Si un módulo
 *   nunca se movió, `startOffset` no existe y su posición se sigue derivando
 *   secuencialmente (ver `getModuleStartWeeks`) — mover otro módulo cercano
 *   no lo afecta hasta que también se mueva explícitamente.
 * - Cursos/Proyectos/Lecciones (Fase 5): tienen `duration` y
 *   `absoluteStartOffset` (semanas absolutas desde `promotion.startDate`,
 *   independientes de su módulo — mover el módulo padre no los afecta). Si el
 *   módulo tiene `plannerItems` (fuente de verdad), se actualiza ahí por `id`
 *   y se resincronizan los arrays legacy `courses`/`projects` derivados
 *   (igual que hace el modal de módulo al guardar). Si el módulo es legacy
 *   (sin plannerItems), se actualiza directamente el array `courses`/`projects`
 *   por índice. El `startOffset` legacy (relativo al módulo) ya no se escribe
 *   aquí — ver `getItemStartWeeks()`.
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
    // Redondeo al día (no a la semana): así el Gantt es editable día a día en
    // cualquier zoom, no solo en semana completa.
    const startDaysRounded = Math.round((task.start_date - baseDate) / 86400000);
    const durationDaysRounded = Math.max(1, Math.round(Number(task.duration) || 1));
    const startWeeksPrecise = Math.max(0, startDaysRounded) / 7;
    const durationWeeksPrecise = durationDaysRounded / 7;

    if (task.itemType === 'module') {
        const module = (promotion.modules || [])[task.itemIndex];
        if (!module) return false;
        module.startOffset = startWeeksPrecise;
        module.duration = durationWeeksPrecise;
        return true;
    }

    if (task.itemType === 'flexible') {
        const block = (promotion.flexibleBlocks || []).find(b => b.id === task.flexibleBlockId);
        if (!block) return false;

        block.startOffset = startWeeksPrecise;
        block.duration = durationWeeksPrecise;
        return true;
    }

    // Nota: el grupo "Lecciones" (itemType 'leccion-group') es puramente visual
    // desde la Fase 5 — no tiene rama aquí porque no se puede arrastrar/
    // redimensionar como unidad (bloqueado en onBeforeTaskDrag). Su rango se
    // deriva siempre de sus lecciones hijas en buildGanttDataset().

    if (task.itemType === 'course' || task.itemType === 'project' || task.itemType === 'leccion') {
        const module = (promotion.modules || [])[task.moduleIndex];
        if (!module) return false;

        // Fase 5: la posición se guarda como semana ABSOLUTA (independiente del
        // módulo), no relativa. `startOffset` legacy ya no se escribe en este
        // flujo — se conserva tal cual para lectura de compatibilidad (TASK-19).
        const absoluteStartOffset = startWeeksPrecise;

        if (Array.isArray(module.plannerItems) && module.plannerItems.length > 0 && task.plannerItemId) {
            const plannerItem = module.plannerItems.find(i => i.id === task.plannerItemId);
            if (!plannerItem) return false;

            plannerItem.duration = durationWeeksPrecise;
            plannerItem.absoluteStartOffset = absoluteStartOffset;

            // Resincroniza los arrays legacy derivados (mismo criterio que
            // usa el modal de módulo al guardar el planificador).
            module.courses = module.plannerItems
                .filter(i => i.type === 'curso')
                .map(i => ({ name: i.name, url: i.url || '', duration: Number(i.duration) || 1, startOffset: Number(i.startOffset) || 0, absoluteStartOffset: (typeof i.absoluteStartOffset === 'number' ? i.absoluteStartOffset : null) }));
            module.projects = module.plannerItems
                .filter(i => i.type === 'proyecto')
                .map(i => ({ name: i.name, url: i.url || '', duration: Number(i.duration) || 1, startOffset: Number(i.startOffset) || 0, absoluteStartOffset: (typeof i.absoluteStartOffset === 'number' ? i.absoluteStartOffset : null), competenceIds: i.competenceIds || [] }));

            return true;
        }

        // Fallback legacy: módulo sin plannerItems, se edita el array directamente.
        const list = task.itemType === 'course' ? module.courses : task.itemType === 'project' ? module.projects : null;
        if (!Array.isArray(list) || task.legacyIndex === undefined || !list[task.legacyIndex]) return false;

        const current = list[task.legacyIndex];
        if (typeof current === 'string') {
            list[task.legacyIndex] = { name: current, duration: durationWeeksPrecise, absoluteStartOffset };
        } else {
            current.duration = durationWeeksPrecise;
            current.absoluteStartOffset = absoluteStartOffset;
        }
        return true;
    }

    return false;
}

window.applyGanttTaskChange = applyGanttTaskChange;
