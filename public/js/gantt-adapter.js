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
 * Parsea un string ISO "YYYY-MM-DD" (lo que se guarda ahora en
 * startDate/endDate de módulos/items/bloques — spec "roadmap por fechas") a
 * un Date en medianoche LOCAL — nunca `new Date(str)` a secas, que lo
 * interpretaría como UTC y podría desplazar el día según el huso horario del
 * navegador.
 * @param {*} s
 * @returns {Date|null} null si `s` no es un string con esa forma
 */
function parseISODate(s) {
    if (typeof s !== 'string') return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Formatea un Date a string ISO "YYYY-MM-DD" (fecha local, sin hora) — el
 * formato que se guarda en startDate/endDate.
 * @param {Date} d
 * @returns {string}
 */
function formatISODate(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/**
 * Nº de días que cubre un rango [startDate, endDate] con AMBOS extremos
 * inclusive (mismo criterio que el resto del código: `endDate` es el último
 * día activo, no el día siguiente) — es el valor que espera `duration` de
 * DHTMLX Gantt.
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {number}
 */
function daysSpanInclusive(startDate, endDate) {
    return Math.max(1, Math.round((endDate - startDate) / 86400000) + 1);
}

/**
 * Nº de días LECTIVOS en el rango [startDate, endDate], AMBOS extremos
 * inclusive. Un día cuenta si su día de semana (0=domingo…6=sábado) está en
 * `workingDaysSet` Y su fecha ISO "YYYY-MM-DD" no está en `holidaysSet`.
 *
 * Mismo criterio que el conteo del backend (`countWorkingDaysInclusive` en
 * roadmap-manager-service/server.js y en scripts/migrate-roadmap-dates.mjs),
 * más la exclusión de festivos que pide la spec de "horas lectivas"
 * (docs/tasks/horas-lectivas.md) — `promotion.holidays` es la MISMA lista que
 * el Gantt ya pinta en gris y que define la Lista de Asistencia. Si
 * `endDate` < `startDate` el rango está vacío y devuelve 0.
 *
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {Set<number>} workingDaysSet - nº de día de semana lectivos
 * @param {Set<string>} [holidaysSet] - fechas ISO "YYYY-MM-DD" no lectivas
 * @returns {number}
 */
function countWorkingDaysInclusive(startDate, endDate, workingDaysSet, holidaysSet) {
    if (!(startDate instanceof Date) || !(endDate instanceof Date)) return 0;
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
    if (endDate < startDate) return 0;
    const working = workingDaysSet instanceof Set ? workingDaysSet : new Set([1, 2, 3, 4, 5]);
    const holidays = holidaysSet instanceof Set ? holidaysSet : new Set();
    let count = 0;
    const cur = new Date(startDate.getTime());
    while (cur <= endDate) {
        if (working.has(cur.getDay()) && !holidays.has(formatISODate(cur))) count++;
        cur.setDate(cur.getDate() + 1);
    }
    return count;
}

/**
 * Horas lectivas que suma el rango [startDate, endDate] (ambos inclusive) =
 * nº de días lectivos (ver `countWorkingDaysInclusive`) × `hoursPerDay`.
 *
 * Cómputo puramente derivado para el panel "Cómputo de horas"
 * (docs/tasks/horas-lectivas.md): NO cambia cómo se dibuja ni se guarda el
 * roadmap — la barra del Gantt sigue continua sobre fines de semana/festivos.
 * Devuelve 0 si `hoursPerDay` no es un número > 0.
 *
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {Set<number>} workingDaysSet
 * @param {Set<string>} holidaysSet
 * @param {number} hoursPerDay - jornada de la promoción (ej. 7 o 7.5)
 * @returns {number}
 */
function computeLectiveHours(startDate, endDate, workingDaysSet, holidaysSet, hoursPerDay) {
    const perDay = Number(hoursPerDay);
    if (!Number.isFinite(perDay) || perDay <= 0) return 0;
    return countWorkingDaysInclusive(startDate, endDate, workingDaysSet, holidaysSet) * perDay;
}

window.countWorkingDaysInclusive = countWorkingDaysInclusive;
window.computeLectiveHours = computeLectiveHours;

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
 *
 * NOTA (spec "roadmap por fechas", Fase 1): esta función es ahora solo el
 * CAMINO DE RESPALDO de `getModuleDateRange()` — se usa exclusivamente
 * cuando el módulo todavía no tiene `startDate`/`endDate` literales. No se
 * ha tocado ni un bit de su lógica para que una promoción sin migrar se siga
 * viendo exactamente igual que antes de este cambio.
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
 *
 * NOTA (spec "roadmap por fechas", Fase 1): igual que `getModuleStartWeeks`,
 * ahora es solo el camino de respaldo de `getItemDateRange()`.
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
 * Rango de fechas [startDate, endDate] (ambas inclusive) de un módulo.
 * Prefiere `module.startDate`/`module.endDate` literales si el módulo ya fue
 * migrado (creado/editado tras la spec "roadmap por fechas") o arrastrado en
 * el Gantt; si no, cae al cálculo legacy en semanas — sin cambiar nada de esa
 * rama, así que una promoción sin ningún módulo migrado se ve exactamente
 * igual que antes.
 * @param {Array<Object>} modules
 * @param {number} moduleIndex
 * @param {Date} baseDate - `promotion.startDate` (o "hoy" si no está definida)
 * @returns {{ startDate: Date, endDate: Date }}
 */
function getModuleDateRange(modules, moduleIndex, baseDate) {
    const m = modules[moduleIndex] || {};
    const literalStart = parseISODate(m.startDate);
    const literalEnd = parseISODate(m.endDate);
    if (literalStart && literalEnd) {
        return { startDate: literalStart, endDate: literalEnd };
    }

    const startWeeks = getModuleStartWeeks(modules, moduleIndex);
    const durationWeeks = Number(m.duration) || 1;
    const startDate = addDays(baseDate, startWeeks * 7);
    return { startDate, endDate: addDays(startDate, durationWeeks * 7 - 1) };
}

/**
 * Rango de fechas [startDate, endDate] (ambas inclusive) de un curso/
 * proyecto/lección. Prefiere `item.startDate`/`item.endDate` literales; si
 * no, cae al cálculo legacy en semanas (relativo al módulo, o absoluto si
 * tiene `absoluteStartOffset`) — sin cambios respecto al comportamiento
 * anterior a esta spec.
 * @param {Object} item - tal como lo devuelve `getModulePlannerItems()`
 * @param {number} moduleStartWeeks - inicio absoluto (semanas) del módulo
 *   padre, SOLO se usa en el camino de respaldo
 * @param {Date} baseDate
 * @returns {{ startDate: Date, endDate: Date }}
 */
function getItemDateRange(item, moduleStartWeeks, baseDate) {
    const literalStart = parseISODate(item.startDate);
    const literalEnd = parseISODate(item.endDate);
    if (literalStart && literalEnd) {
        return { startDate: literalStart, endDate: literalEnd };
    }

    const startWeeks = getItemStartWeeks(item, moduleStartWeeks);
    const durationWeeks = Number(item.duration) || 1;
    const startDate = addDays(baseDate, startWeeks * 7);
    return { startDate, endDate: addDays(startDate, durationWeeks * 7 - 1) };
}

/**
 * Rango de fechas [startDate, endDate] (ambas inclusive) de un bloque de
 * "Tiempo flexible". Mismo criterio preferir-fechas-literales que módulos/
 * items.
 * @param {Object} block
 * @param {Date} baseDate
 * @returns {{ startDate: Date, endDate: Date }}
 */
function getFlexibleBlockDateRange(block, baseDate) {
    const literalStart = parseISODate(block.startDate);
    const literalEnd = parseISODate(block.endDate);
    if (literalStart && literalEnd) {
        return { startDate: literalStart, endDate: literalEnd };
    }

    const startOffset = Number(block.startOffset) || 0;
    const durationWeeks = Number(block.duration) || 1;
    const startDate = addDays(baseDate, startOffset * 7);
    return { startDate, endDate: addDays(startDate, durationWeeks * 7 - 1) };
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
 * `startDate`/`endDate` (spec "roadmap por fechas"): se pasan a través tal
 * cual si el item ya los tiene (string ISO), o `null` si no — es
 * `getItemDateRange()` quien decide si usarlos o caer al cálculo legacy.
 *
 * @param {Object} module
 * @returns {Array<{ plannerItemId: string|null, type: string, name: string, url: string, duration: number, startOffset: number, absoluteStartOffset: number|null, startDate: string|null, endDate: string|null, links: Array }>}
 */
function getModulePlannerItems(module) {
    // Normaliza absoluteStartOffset: número válido tal cual, cualquier otra
    // cosa (undefined/null/NaN) se normaliza a null para que getItemStartWeeks()
    // sepa que debe caer al cálculo legacy relativo al módulo.
    const normalizeAbsolute = (v) => (typeof v === 'number' && !Number.isNaN(v)) ? v : null;
    const normalizeDateStr = (v) => (typeof v === 'string' && v) ? v : null;

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
                startDate: normalizeDateStr(item.startDate),
                endDate: normalizeDateStr(item.endDate),
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
            startDate: isObj ? normalizeDateStr(c.startDate) : null,
            endDate: isObj ? normalizeDateStr(c.endDate) : null,
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
            startDate: isObj ? normalizeDateStr(p.startDate) : null,
            endDate: isObj ? normalizeDateStr(p.endDate) : null,
            links: [],
        });
    });
    return items;
}

/**
 * Reconstruye los arrays legacy `module.courses`/`module.projects` a partir
 * de `module.plannerItems` (fuente de verdad cuando existe) — copia
 * `startDate`/`endDate` cuando el item ya está migrado a fechas literales, o
 * `duration`/`startOffset`/`absoluteStartOffset` cuando todavía no (superset
 * de campos: nunca fuerza una forma sobre el item). Consolida un patrón que
 * antes vivía duplicado en `applyGanttTaskChange`, `deleteGanttPlannerItem`,
 * `persistGanttRowOrder` y los guardados de `#item-edit-form`/
 * `#create-item-form` en promotion-detail.js.
 * @param {Object} module - se muta in-place (`module.courses`/`module.projects`)
 */
function syncLegacyCoursesProjects(module) {
    if (!Array.isArray(module.plannerItems)) return;

    const mapCommon = (i) => {
        const out = { name: i.name, url: i.url || '' };
        if (typeof i.startDate === 'string' && typeof i.endDate === 'string') {
            out.startDate = i.startDate;
            out.endDate = i.endDate;
        } else {
            out.duration = Number(i.duration) || 1;
            out.startOffset = Number(i.startOffset) || 0;
            out.absoluteStartOffset = (typeof i.absoluteStartOffset === 'number' ? i.absoluteStartOffset : null);
        }
        return out;
    };

    module.courses = module.plannerItems
        .filter(i => i.type === 'curso')
        .map(mapCommon);
    module.projects = module.plannerItems
        .filter(i => i.type === 'proyecto')
        .map(i => ({ ...mapCommon(i), competenceIds: i.competenceIds || [] }));
}

window.syncLegacyCoursesProjects = syncLegacyCoursesProjects;

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
        // Necesario solo como camino de respaldo para items sin startDate/endDate
        // propios (getItemDateRange) — ver comentario en getModuleStartWeeks.
        const moduleStartWeeksForFallback = getModuleStartWeeks(modules, moduleIndex);
        const moduleRange = getModuleDateRange(modules, moduleIndex, baseDate);
        const moduleRows = [];

        moduleRows.push({
            id: moduleId,
            text: `M${moduleIndex + 1}: ${module.name || 'Sin nombre'}`,
            type: 'project',
            open: true,
            start_date: formatGanttDate(moduleRange.startDate),
            duration: daysSpanInclusive(moduleRange.startDate, moduleRange.endDate),
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

            const itemRange = getItemDateRange(item, moduleStartWeeksForFallback, baseDate);

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
                start_date: formatGanttDate(itemRange.startDate),
                duration: daysSpanInclusive(itemRange.startDate, itemRange.endDate),
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
        // fechas de sus lecciones hijas, que se posicionan de forma individual
        // e independiente (ver `getItemDateRange`).
        //
        // Nace ABIERTO (como el nodo del módulo): al editar una lección el Gantt
        // se reconstruye entero y, si naciera cerrado, "Lecciones" se
        // recolapsaba en cada guardado aunque el docente lo tuviera abierto. El
        // estado de plegado que el docente elige a mano se recuerda aparte, por
        // promoción, en sessionStorage — ver _getGanttCollapsedIds() y los
        // listeners onTaskClosed/onTaskOpened en promotion-detail.js. La
        // ausencia de entrada ahí = se respeta este `open: true`.
        if (lessonItems.length > 0) {
            const lessonsGroupId = `module-${moduleIndex}-lecciones`;
            const lessonRanges = lessonItems.map(item => getItemDateRange(item, moduleStartWeeksForFallback, baseDate));
            const groupStartDate = new Date(Math.min(...lessonRanges.map(r => r.startDate.getTime())));
            const groupEndDate = new Date(Math.max(...lessonRanges.map(r => r.endDate.getTime())));

            moduleRows.push({
                id: lessonsGroupId,
                text: 'Lecciones',
                parent: moduleId,
                type: 'project',
                open: true,
                start_date: formatGanttDate(groupStartDate),
                duration: daysSpanInclusive(groupStartDate, groupEndDate),
                progress: 0,
                itemType: 'leccion-group',
                moduleIndex,
                moduleId: module.id,
            });

            lessonItems.forEach((item, idx) => {
                const itemRange = lessonRanges[idx];
                const firstLink = Array.isArray(item.links) && item.links.length > 0 ? item.links[0] : null;

                moduleRows.push({
                    id: `item-${moduleIndex}-${item.plannerItemId}`,
                    text: item.name,
                    parent: lessonsGroupId,
                    start_date: formatGanttDate(itemRange.startDate),
                    duration: daysSpanInclusive(itemRange.startDate, itemRange.endDate),
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

        topLevelGroups.push({ startDate: moduleRange.startDate, order: topLevelGroups.length, rows: moduleRows });
    });

    // ── Bloques de "Tiempo flexible" (vacaciones/festivos) ──────────────────────
    // Nivel superior, sin `parent` (mismo nivel que un módulo). Posición y
    // duración son siempre absolutas (independientes de módulos vecinos). Su
    // FILA se intercala entre las de los módulos según esa misma fecha (ver
    // sort más abajo) — no se guarda un "orden" aparte: la posición temporal
    // ES el orden.
    (promotion.flexibleBlocks || []).forEach((block) => {
        const blockRange = getFlexibleBlockDateRange(block, baseDate);

        topLevelGroups.push({
            startDate: blockRange.startDate,
            order: topLevelGroups.length,
            rows: [{
                id: `flexible-${block.id}`,
                text: block.name || 'Tiempo flexible',
                start_date: formatGanttDate(blockRange.startDate),
                duration: daysSpanInclusive(blockRange.startDate, blockRange.endDate),
                progress: 0,
                itemType: 'flexible',
                flexibleBlockId: block.id,
            }],
        });
    });

    // Orden visual: por fecha de inicio ascendente. `order` (posición original,
    // módulos antes que flexibles) desempata cuando dos filas empiezan el mismo
    // día, para que el resultado sea determinista.
    topLevelGroups.sort((a, b) => (a.startDate - b.startDate) || (a.order - b.order));
    topLevelGroups.forEach((group) => { group.rows.forEach((row) => data.push(row)); });

    return { data, links };
}

window.buildGanttDataset = buildGanttDataset;
window.formatGanttDate = formatGanttDate;
window.GANTT_DATE_FORMAT = GANTT_DATE_FORMAT;

/**
 * Cómputo derivado de HORAS LECTIVAS de la formación, para el panel "Cómputo
 * de horas" (docs/tasks/horas-lectivas.md). Puramente derivado de las fechas
 * del roadmap + la jornada de la promoción — no cambia ni cómo se dibuja ni
 * cómo se guarda nada.
 *
 * Criterio:
 *  - `hoursPerDay` = `promotion.hoursPerDay` (jornada, ej. 7 o 7.5); fallback 7.
 *  - Días lectivos = `promotion.workingDays` (fallback Lun-Vie) menos
 *    `promotion.holidays` — mismo criterio que el Gantt (`countWorkingDaysInclusive`).
 *  - Horas de un módulo = días lectivos en su rango × `hoursPerDay`. El rango
 *    es el ENVOLVENTE de sus elementos (cursos + proyectos + lecciones): de la
 *    fecha más temprana a la más tardía entre `getItemDateRange` de todos
 *    ellos. Es EXACTAMENTE lo que dibuja la barra del módulo en el Gantt —
 *    DHTMLX recalcula toda tarea `type: 'project'` (una fila de módulo) para
 *    cubrir el rango de sus hijos en cuanto tiene alguno (ver
 *    `buildRoadmapGanttGridExport`). Solo si el módulo NO tiene elementos se
 *    cae a su rango propio (`getModuleDateRange`). Así el total reacciona a
 *    mover/redimensionar cualquier elemento del módulo. Asume módulos NO
 *    solapados entre sí (el roadmap es conceptualmente secuencial); si se
 *    solapan, la suma los cuenta dos veces — mismo supuesto que la conversión
 *    inversa fecha→semanas del backend (`durationWeeksFromDates`).
 *  - `total` = suma de las horas de todos los módulos.
 *  - `byProject` es un SUB-desglose informativo dentro de cada módulo (los
 *    proyectos pueden solaparse con cursos, así que sus horas NO tienen por
 *    qué sumar las del módulo).
 *  - `target` = `extendedInfo.totalHours` (el objetivo de la titulación, el
 *    mismo dato del syllabus/acta); `diff` = `total - target` (negativo =
 *    déficit, faltan horas; positivo = por encima del objetivo). `null` si no
 *    hay objetivo definido.
 *
 * @param {Object} promotion - tal como lo devuelve la API (modules[],
 *   startDate, workingDays, holidays, hoursPerDay)
 * @param {{ totalHours?: number|string }} [extendedInfo]
 * @returns {{
 *   hoursPerDay: number,
 *   total: number,
 *   byModule: Array<{ moduleIndex: number, name: string, hours: number, lectiveDays: number, startDate: string, endDate: string }>,
 *   byProject: Array<{ moduleIndex: number, moduleName: string, name: string, hours: number, lectiveDays: number, startDate: string, endDate: string }>,
 *   target: number|null,
 *   diff: number|null
 * }}
 */
function buildHoursBreakdown(promotion, extendedInfo) {
    const rawPerDay = Number(promotion && promotion.hoursPerDay);
    const hoursPerDay = Number.isFinite(rawPerDay) && rawPerDay > 0 ? rawPerDay : 7;

    const workingDaysArr = Array.isArray(promotion && promotion.workingDays) && promotion.workingDays.length
        ? promotion.workingDays
        : [1, 2, 3, 4, 5];
    const workingDaysSet = new Set(workingDaysArr.map(Number));
    const holidaysSet = new Set(
        Array.isArray(promotion && promotion.holidays) ? promotion.holidays.filter(h => typeof h === 'string') : []
    );

    const modules = (promotion && Array.isArray(promotion.modules)) ? promotion.modules : [];
    const baseDate = (promotion && promotion.startDate) ? new Date(promotion.startDate) : new Date();

    const byModule = [];
    const byProject = [];
    let total = 0;

    modules.forEach((module, moduleIndex) => {
        const moduleStartWeeksForFallback = getModuleStartWeeks(modules, moduleIndex);
        const items = getModulePlannerItems(module);

        // Rango ENVOLVENTE de los elementos del módulo (lo que dibuja la barra
        // del módulo en el Gantt). Si el módulo no tiene elementos, se cae a su
        // rango propio — mismo criterio que DHTMLX con las tareas `type:'project'`.
        let envStart = null;
        let envEnd = null;
        items.forEach((item) => {
            const r = getItemDateRange(item, moduleStartWeeksForFallback, baseDate);
            if (!envStart || r.startDate < envStart) envStart = r.startDate;
            if (!envEnd || r.endDate > envEnd) envEnd = r.endDate;
        });
        if (!envStart || !envEnd) {
            const ownRange = getModuleDateRange(modules, moduleIndex, baseDate);
            envStart = ownRange.startDate;
            envEnd = ownRange.endDate;
        }

        const lectiveDays = countWorkingDaysInclusive(envStart, envEnd, workingDaysSet, holidaysSet);
        const hours = lectiveDays * hoursPerDay;
        total += hours;

        const moduleName = `M${moduleIndex + 1}: ${module.name || 'Sin nombre'}`;
        byModule.push({
            moduleIndex,
            name: moduleName,
            hours,
            lectiveDays,
            startDate: formatISODate(envStart),
            endDate: formatISODate(envEnd),
        });

        items.forEach((item) => {
            if (item.type !== 'proyecto') return;
            const range = getItemDateRange(item, moduleStartWeeksForFallback, baseDate);
            const projDays = countWorkingDaysInclusive(range.startDate, range.endDate, workingDaysSet, holidaysSet);
            byProject.push({
                moduleIndex,
                moduleName,
                name: item.name || 'Sin nombre',
                hours: projDays * hoursPerDay,
                lectiveDays: projDays,
                startDate: formatISODate(range.startDate),
                endDate: formatISODate(range.endDate),
            });
        });
    });

    const rawTarget = Number(extendedInfo && extendedInfo.totalHours);
    const target = Number.isFinite(rawTarget) && rawTarget > 0 ? rawTarget : null;
    const diff = target === null ? null : Math.round((total - target) * 100) / 100;

    return { hoursPerDay, total: Math.round(total * 100) / 100, byModule, byProject, target, diff };
}

window.buildHoursBreakdown = buildHoursBreakdown;

const GANTT_ITEM_TYPE_LABELS = {
    module: 'Módulo',
    course: 'Curso',
    project: 'Proyecto',
    leccion: 'Lección',
    flexible: 'Tiempo flexible',
};

// Un colorId por tipo de elemento para los eventos que se sincronizan a
// Google Calendar (ver buildRoadmapCalendarEvents / syncRoadmapGoogleCalendar
// en promotion-detail.js) — Calendar solo acepta uno de los 11 colores fijos
// de su paleta (id "1".."11", no un hex arbitrario), así que se eligió el más
// parecido a cada color que ya usa el propio Gantt en CSS
// (.gantt-task-module/course/project/leccion/flexible en promotion-detail.css)
// para que un elemento se reconozca visualmente igual en ambos sitios.
const GANTT_ITEM_TYPE_COLOR_ID = {
    module: '9',    // Blueberry #3f51b5 ≈ #667eea del Gantt
    course: '2',    // Sage      #33b679 ≈ #6bbf9c del Gantt
    project: '6',   // Tangerine #f4511e ≈ #f59e0b del Gantt
    leccion: '1',   // Lavender  #7986cb ≈ #8e7cc3 del Gantt
    flexible: '3',  // Grape     #8e24aa ≈ #6f42c1 del Gantt
};

// Mismos colores (hex, sin '#') que .gantt_task_line.gantt-task-* en
// css/promotion-detail.css — reutilizados por el export a Excel
// "pintado" (_exportRoadmapXlsx/ExcelJS, ver buildRoadmapGanttGridExport)
// para que una barra se vea del mismo color en la app y en el Excel.
// 'leccion-group' comparte el color de 'leccion' — igual que
// gantt.templates.task_class en promotion-detail.js (que mapea
// leccion-group -> 'gantt-task-leccion').
const GANTT_ITEM_TYPE_HEX = {
    module: '667eea',
    course: '6bbf9c',
    project: 'ff8a5c',   // var(--app-color-brand-300) en design-system.css
    leccion: '8e7cc3',
    'leccion-group': '8e7cc3',
    flexible: '6f42c1',
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

const _GANTT_EXPORT_MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * Construye una grilla de TODO el roadmap (con la misma jerarquía módulo →
 * curso/proyecto/lección/grupo de lecciones → lección que ve el docente en
 * pantalla) lista para "pintar" un Gantt real en Excel — _exportRoadmapXlsx
 * (ExcelJS) la consume para reproducir el mismo diagrama que dibuja DHTMLX
 * Gantt, en vez de una tabla plana de fechas.
 *
 * `granularity` determina la unidad de columna — 'day'/'week'/'month', las
 * mismas tres que setGanttZoomLevel() en promotion-detail.js — para que el
 * Excel se pueda exportar en la MISMA granularidad que el docente esté
 * viendo en el Gantt en ese momento. Con 'week' (por defecto), la
 * numeración "Sem. N" coincide con _ganttWeekLabel (semana 1 = los 7 días
 * desde promotion.startDate, sin alinear a lunes).
 * @param {Object} promotion
 * @param {'day'|'week'|'month'} [granularity]
 * @returns {{
 *   granularity: 'day'|'week'|'month',
 *   columns: Array<{ index: number, label: string, monthLabel: string }>,
 *   rows: Array<{ id: string, text: string, itemType: string, typeLabel: string,
 *                 indent: number, startColIndex: number, colSpan: number, url: string }>
 * } | null} null si el roadmap no tiene módulos todavía.
 */
function buildRoadmapGanttGridExport(promotion, granularity) {
    const unit = (granularity === 'day' || granularity === 'month') ? granularity : 'week';
    const { data } = buildGanttDataset(promotion);
    if (!data.length) return null;

    // Misma normalización a medianoche local que _ganttWeekLabel — evita que
    // un cambio de horario de verano de por medio desplace el cálculo un día.
    const baseDateRaw = promotion.startDate ? new Date(promotion.startDate) : new Date();
    const baseDate = new Date(baseDateRaw.getFullYear(), baseDateRaw.getMonth(), baseDateRaw.getDate());

    // Cada fila expresada en DÍAS absolutos desde baseDate — unidad común de
    // partida, independiente de la granularidad de columna elegida.
    const rowsInDays = data.map((row) => {
        const [dd, mm, yyyy] = row.start_date.split('-').map(Number);
        const rowStartDate = new Date(yyyy, mm - 1, dd);
        const startDayIndex = Math.round((rowStartDate - baseDate) / 86400000);
        const durationDays = Math.max(1, Math.round(row.duration));
        // Mismo nivel de sangría que se ve en el árbol del Gantt: módulo (0)
        // → curso/proyecto/tiempo flexible/grupo "Lecciones" (1) → lección (2).
        const indent = row.itemType === 'leccion' ? 2 : (row.itemType === 'module' ? 0 : 1);
        return {
            base: {
                id: row.id,
                text: row.text,
                itemType: row.itemType,
                typeLabel: GANTT_ITEM_TYPE_LABELS[row.itemType] || row.itemType,
                indent,
                url: row.url || '',
            },
            startDayIndex,
            durationDays,
        };
    });

    // ── Rollup del rango de un módulo a partir de sus hijos ─────────────────
    // DHTMLX Gantt recalcula automáticamente el start/end de cualquier tarea
    // `type: 'project'` (que es lo que usa una fila de módulo) para que cubra
    // exactamente el rango de SUS HIJOS, en cuanto tiene alguno — así es como
    // se ve realmente la barra del módulo en pantalla. El start_date/duration
    // "en crudo" de la fila del módulo (derivado de module.duration/
    // startOffset) se desincroniza en cuanto CUALQUIER curso/proyecto/lección
    // del módulo se movió alguna vez a mano en el Gantt (queda con un
    // absoluteStartOffset propio que ya no coincide con el del módulo) — sin
    // este ajuste, el Excel mostraría el dato crudo del módulo en vez de lo
    // que el docente realmente ve dibujado.
    data.forEach((row, idx) => {
        if (row.itemType !== 'module') return;
        const childIdx = data
            .map((r, i) => i)
            .filter((i) => data[i].itemType !== 'module' && data[i].moduleIndex === row.itemIndex);
        if (!childIdx.length) return;
        const starts = childIdx.map((i) => rowsInDays[i].startDayIndex);
        const ends = childIdx.map((i) => rowsInDays[i].startDayIndex + rowsInDays[i].durationDays);
        const minStart = Math.min(...starts);
        const maxEnd = Math.max(...ends);
        rowsInDays[idx].startDayIndex = minStart;
        rowsInDays[idx].durationDays = Math.max(1, maxEnd - minStart);
    });

    if (unit === 'day' || unit === 'week') {
        const step = unit === 'day' ? 1 : 7;
        const startCol = (r) => Math.floor(r.startDayIndex / step);
        const endColExclusive = (r) => Math.ceil((r.startDayIndex + r.durationDays) / step);

        const minCol = Math.min(...rowsInDays.map(startCol));
        const maxCol = Math.max(...rowsInDays.map(endColExclusive));

        const columns = [];
        for (let c = minCol; c < maxCol; c++) {
            const colDate = addDays(baseDate, c * step);
            const label = unit === 'day'
                ? `${String(colDate.getDate()).padStart(2, '0')}/${String(colDate.getMonth() + 1).padStart(2, '0')}`
                : `Sem. ${c + 1}`;
            columns.push({
                index: c,
                label,
                monthLabel: `${_GANTT_EXPORT_MONTH_NAMES[colDate.getMonth()]} ${colDate.getFullYear()}`,
            });
        }

        const rows = rowsInDays.map((r) => ({
            ...r.base,
            startColIndex: startCol(r),
            colSpan: Math.max(1, endColExclusive(r) - startCol(r)),
        }));

        return { granularity: unit, columns, rows };
    }

    // ── 'month': columnas de mes de calendario (no un tamaño fijo de días) —
    //    una fila puede caer en 1 o varios meses según dónde empiece/acabe. ──
    const minDate = addDays(baseDate, Math.min(...rowsInDays.map((r) => r.startDayIndex)));
    const maxDate = addDays(baseDate, Math.max(...rowsInDays.map((r) => r.startDayIndex + r.durationDays)) - 1); // último día activo

    const columns = [];
    for (let cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1), end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
        cursor <= end;
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)) {
        const label = `${_GANTT_EXPORT_MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`;
        columns.push({ index: columns.length, label, monthLabel: label, year: cursor.getFullYear(), month: cursor.getMonth() });
    }
    const monthColIndex = (date) => columns.findIndex((c) => c.year === date.getFullYear() && c.month === date.getMonth());

    const rows = rowsInDays.map((r) => {
        const rStart = addDays(baseDate, r.startDayIndex);
        const rEnd = addDays(baseDate, r.startDayIndex + r.durationDays - 1); // último día activo
        const startColIndex = monthColIndex(rStart);
        const endColIndex = monthColIndex(rEnd);
        return { ...r.base, startColIndex, colSpan: Math.max(1, endColIndex - startColIndex + 1) };
    });

    return { granularity: 'month', columns, rows };
}

window.buildRoadmapGanttGridExport = buildRoadmapGanttGridExport;

/**
 * Construye la lista de eventos de día completo del roadmap (módulos,
 * cursos, proyectos, lecciones y bloques de tiempo flexible) como objetos
 * planos con fechas ya como Date — base común para el export .ics
 * (buildRoadmapIcsContent) y la sincronización directa con Google Calendar
 * (ver window.syncRoadmapGoogleCalendar en promotion-detail.js), para no
 * duplicar en dos sitios el cálculo de fechas/filtrado. Mismo criterio que
 * buildRoadmapExportRows: se omite el grupo "Lecciones" (leccion-group), un
 * nodo puramente visual sin fecha propia real (se deriva del min/max de sus
 * lecciones hijas, que sí se exportan cada una por separado).
 * @param {Object} promotion
 * @returns {Array<{ id: string, summary: string, description: string, startDate: Date, endDateExclusive: Date }>}
 *   endDateExclusive: un día DESPUÉS del último día activo (así lo exigen
 *   tanto RFC 5545 §3.6.1 como la propia API de Google Calendar para el
 *   campo `end.date` de un evento de día completo).
 */
function buildRoadmapCalendarEvents(promotion) {
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
            const endDateExclusive = addDays(startDate, durationDays);

            const moduleName = row.itemType === 'module' ? '' : (moduleNameByIndex[row.moduleIndex] || '');
            const summary = moduleName ? `${row.text} (${moduleName})` : row.text;
            const description = [GANTT_ITEM_TYPE_LABELS[row.itemType] || row.itemType, row.url]
                .filter(Boolean).join(' — ');

            return { id: row.id, summary, description, startDate, endDateExclusive, itemType: row.itemType };
        });
}

window.buildRoadmapCalendarEvents = buildRoadmapCalendarEvents;

/**
 * Construye el contenido de un archivo .ics (iCalendar) — pensado para
 * importarse en Google Calendar (Ajustes > Importar y exportar > Importar) u
 * otro calendario compatible con iCalendar.
 *
 * Folding de líneas largas (RFC 5545 §3.1) NO implementado a propósito — es
 * poco frecuente que SUMMARY/DESCRIPTION superen los 75 octetos aquí, y
 * Google Calendar importa líneas largas sin problema en la práctica; si algún
 * día hace falta soporte estricto para otros clientes, añadir folding aquí.
 * @param {Object} promotion
 * @returns {string} contenido completo del .ics (líneas separadas por CRLF)
 */
function buildRoadmapIcsContent(promotion) {
    const pad2 = (n) => String(n).padStart(2, '0');
    const icsDate = (d) => `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
    const dtstampNow = () => {
        const n = new Date();
        return `${n.getUTCFullYear()}${pad2(n.getUTCMonth() + 1)}${pad2(n.getUTCDate())}T${pad2(n.getUTCHours())}${pad2(n.getUTCMinutes())}${pad2(n.getUTCSeconds())}Z`;
    };
    // Escapa coma/punto y coma/barra invertida/salto de línea — caracteres con
    // significado especial en valores de texto de iCalendar (RFC 5545 §3.3.11).
    const escapeIcs = (s) => String(s || '')
        .replace(/\\/g, '\\\\')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;')
        .replace(/\r?\n/g, '\\n');

    const events = buildRoadmapCalendarEvents(promotion).map(ev => [
        'BEGIN:VEVENT',
        `UID:${ev.id}@bootcamp-manager`,
        `DTSTAMP:${dtstampNow()}`,
        `DTSTART;VALUE=DATE:${icsDate(ev.startDate)}`,
        `DTEND;VALUE=DATE:${icsDate(ev.endDateExclusive)}`,
        `SUMMARY:${escapeIcs(ev.summary)}`,
        ev.description ? `DESCRIPTION:${escapeIcs(ev.description)}` : null,
        'END:VEVENT',
    ].filter(Boolean).join('\r\n'));

    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Bootcamp Manager//Roadmap Export//ES',
        'CALSCALE:GREGORIAN',
        `X-WR-CALNAME:${escapeIcs(promotion.name || 'Roadmap')}`,
        ...events,
        'END:VCALENDAR',
    ].join('\r\n');
}

window.buildRoadmapIcsContent = buildRoadmapIcsContent;

/**
 * Traduce el cambio hecho por el docente (drag/resize) sobre una tarea del
 * Gantt de vuelta al modelo de dominio de la promoción (in-place).
 *
 * Spec "roadmap por fechas" (Fase 1): a diferencia de la versión anterior de
 * esta función (que convertía la posición arrastrada — ya en días exactos —
 * a una fracción de semana, `startWeeksPrecise = startDaysRounded / 7`,
 * perdiendo precisión y generando offsets como `0.142857...`), ahora se
 * guardan `startDate`/`endDate` LITERALES (string ISO "YYYY-MM-DD",
 * `endDate` = último día activo inclusive) — sin ninguna conversión con
 * pérdida por el medio. Se borran los campos viejos
 * (`duration`/`startOffset`/`absoluteStartOffset`) del item tocado: cada
 * arrastre migra ese item limpiamente de forma orgánica, incluso antes de
 * correr una migración masiva sobre el resto de la promoción.
 *
 * Reglas de negocio (siguen la misma convención que el Gantt original):
 * - Módulos: se puede cambiar tanto su posición como su duración.
 * - Cursos/Proyectos/Lecciones (Fase 5): su posición es siempre absoluta
 *   (independiente de su módulo — mover el módulo padre no los afecta). Si
 *   el módulo tiene `plannerItems` (fuente de verdad), se actualiza ahí por
 *   `id` y se resincronizan los arrays legacy `courses`/`projects`
 *   derivados vía `syncLegacyCoursesProjects()`. Si el módulo es legacy (sin
 *   plannerItems), se actualiza directamente el array `courses`/`projects`
 *   por índice.
 * - La empleabilidad ya no se representa en el Gantt (TASK-7), por lo que
 *   no hay una rama `employability` que traducir aquí.
 *
 * @param {Object} promotion - Promotion completa (se muta in-place)
 * @param {Object} task - Tarea de DHTMLX Gantt ya actualizada (gantt.getTask(id))
 * @returns {boolean} true si se aplicó algún cambio sobre `promotion`
 */
function applyGanttTaskChange(promotion, task) {
    if (!promotion || !task) return false;

    // Normaliza a medianoche local (task.start_date de DHTMLX ya viene a
    // medianoche, pero por si acaso) antes de formatear a ISO.
    const rawStart = task.start_date;
    const startDate = new Date(rawStart.getFullYear(), rawStart.getMonth(), rawStart.getDate());
    const durationDays = Math.max(1, Math.round(Number(task.duration) || 1));
    const endDate = addDays(startDate, durationDays - 1); // último día activo, inclusive
    const startDateStr = formatISODate(startDate);
    const endDateStr = formatISODate(endDate);

    if (task.itemType === 'module') {
        const module = (promotion.modules || [])[task.itemIndex];
        if (!module) return false;
        module.startDate = startDateStr;
        module.endDate = endDateStr;
        delete module.startOffset;
        delete module.duration;
        return true;
    }

    if (task.itemType === 'flexible') {
        const block = (promotion.flexibleBlocks || []).find(b => b.id === task.flexibleBlockId);
        if (!block) return false;

        block.startDate = startDateStr;
        block.endDate = endDateStr;
        delete block.startOffset;
        delete block.duration;
        return true;
    }

    // Nota: el grupo "Lecciones" (itemType 'leccion-group') es puramente visual
    // desde la Fase 5 — no tiene rama aquí porque no se puede arrastrar/
    // redimensionar como unidad (bloqueado en onBeforeTaskDrag). Su rango se
    // deriva siempre de sus lecciones hijas en buildGanttDataset().

    if (task.itemType === 'course' || task.itemType === 'project' || task.itemType === 'leccion') {
        const module = (promotion.modules || [])[task.moduleIndex];
        if (!module) return false;

        if (Array.isArray(module.plannerItems) && module.plannerItems.length > 0 && task.plannerItemId) {
            const plannerItem = module.plannerItems.find(i => i.id === task.plannerItemId);
            if (!plannerItem) return false;

            plannerItem.startDate = startDateStr;
            plannerItem.endDate = endDateStr;
            delete plannerItem.duration;
            delete plannerItem.startOffset;
            delete plannerItem.absoluteStartOffset;

            syncLegacyCoursesProjects(module);
            return true;
        }

        // Fallback legacy: módulo sin plannerItems, se edita el array directamente.
        const list = task.itemType === 'course' ? module.courses : task.itemType === 'project' ? module.projects : null;
        if (!Array.isArray(list) || task.legacyIndex === undefined || !list[task.legacyIndex]) return false;

        const current = list[task.legacyIndex];
        if (typeof current === 'string') {
            list[task.legacyIndex] = { name: current, startDate: startDateStr, endDate: endDateStr };
        } else {
            current.startDate = startDateStr;
            current.endDate = endDateStr;
            delete current.duration;
            delete current.startOffset;
            delete current.absoluteStartOffset;
        }
        return true;
    }

    return false;
}

window.applyGanttTaskChange = applyGanttTaskChange;
