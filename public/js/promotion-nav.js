/**
 * promotion-nav.js — navegación de la vista de promoción por SECCIONES
 * (docs/tasks/navegacion-promocion.md, Fase 1).
 *
 * Sustituye los tres niveles de antes (barra lateral → grupo → pestaña, más las
 * subpestañas del "Área de administración") por dos: ocho secciones en la barra
 * lateral y, dentro de cada una, sus pestañas.
 *
 * NO reescribe ningún panel: cada destino llama a las funciones legacy que ya
 * existen en promotion-detail.js (`switchTab`, `switchTeacherAreaSubTab`,
 * `switchProgramDetailsTab`), así que el contenido se sigue pintando igual.
 * Lo que cambia es cómo se llega y que el destino vive en la URL
 * (`#/planificacion/roadmap`), de modo que se puede compartir el enlace y el
 * botón atrás del navegador funciona.
 */

(function () {
    'use strict';

    const S = (fn, ...args) => () => { if (typeof window[fn] === 'function') window[fn](...args); };

    // Un destino = sección + pestaña. `go` usa SOLO funciones legacy ya existentes.
    const SECTIONS = [
        {
            id: 'inicio', label: 'Inicio', icon: 'bi-house-door',
            tabs: [{ id: 'resumen', label: 'Resumen', go: S('switchTab', 'overview') }],
        },
        {
            id: 'planificacion', label: 'Planificación', icon: 'bi-calendar3',
            tabs: [
                { id: 'roadmap', label: 'Roadmap', go: programTab('roadmap') },
                { id: 'calendario', label: 'Calendario', go: programTab('calendar') },
                { id: 'horario', label: 'Horario', go: programTab('schedule') },
                { id: 'horas', label: 'Horas lectivas', go: programTab('hours') },
                { id: 'pildoras', label: 'Píldoras', go: programTab('pildoras') },
            ],
        },
        {
            id: 'proyectos', label: 'Proyectos', icon: 'bi-folder2-open',
            // El Aula Virtual ya no es una pestaña: cada proyecto se publica desde
            // su propia fila en "Proyectos", con su fecha de entrega y su briefing.
            tabs: [
                { id: 'lista', label: 'Proyectos', go: teacherTab('evaluation') },
                { id: 'competencias', label: 'Competencias y criterios', go: programTab('evaluation') },
            ],
        },
        {
            id: 'estudiantes', label: 'Estudiantes', icon: 'bi-people',
            tabs: [
                { id: 'lista', label: 'Lista', go: teacherTab('students') },
                { id: 'asistencia', label: 'Asistencia', go: teacherTab('attendance') },
            ],
        },
        {
            // Pinta MetricsPanel.tsx en #metrics-tab (openspec add-promotion-metrics-and-student-followup).
            id: 'metricas', label: 'Métricas', icon: 'bi-bar-chart',
            tabs: [{ id: 'resumen', label: 'Resumen', go: S('switchTab', 'metrics') }],
        },
        {
            id: 'portal', label: 'Portal del estudiante', icon: 'bi-globe',
            tabs: [
                { id: 'acceso', label: 'Acceso', go: teacherTab('accesos') },
                { id: 'recursos', label: 'Recursos', go: programTab('resources') },
                { id: 'enlaces', label: 'Enlaces rápidos', go: programTab('quicklinks') },
                { id: 'secciones', label: 'Secciones', go: programTab('sections') },
            ],
        },
        {
            id: 'equipo', label: 'Equipo', icon: 'bi-person-badge',
            tabs: [
                { id: 'formadores', label: 'Equipo formativo', go: programTab('team') },
                { id: 'colaboradores', label: 'Colaboradores', go: S('switchTab', 'collaborators') },
            ],
        },
        {
            id: 'ajustes', label: 'Ajustes de la promoción', icon: 'bi-gear', foot: true,
            tabs: [
                { id: 'datos', label: 'Datos de la promoción', go: S('switchTab', 'ajustes') },
            ],
        },
    ];

    // Una pestaña de "Contenido del Programa": entra en #info-tab y abre su sub-pestaña.
    function programTab(tabId) {
        return () => {
            if (typeof window.switchTab === 'function') window.switchTab('info');
            if (typeof window.switchProgramDetailsTab === 'function') window.switchProgramDetailsTab(tabId);
        };
    }

    // Una pestaña del antiguo "Área de administración".
    function teacherTab(tabId) {
        return () => {
            if (typeof window.switchTab === 'function') window.switchTab('teacher-area');
            if (typeof window.switchTeacherAreaSubTab === 'function') window.switchTeacherAreaSubTab(tabId);
        };
    }

    const findSection = (id) => SECTIONS.find(s => s.id === id) || SECTIONS[0];
    const findTab = (section, id) => section.tabs.find(t => t.id === id) || section.tabs[0];

    let current = { section: 'inicio', tab: 'resumen' };

    /**
     * Lleva a un destino: pinta el contenido con las funciones legacy, deja la
     * dirección en el hash y avisa a la cabecera de página (React) y a la barra lateral.
     * @param {string} sectionId
     * @param {string} [tabId] - si falta, la primera pestaña de la sección
     * @param {{ replace?: boolean, silent?: boolean }} [opts] - `replace` no añade
     *   entrada al historial; `silent` no toca el hash (se usa al leerlo).
     */
    function goTo(sectionId, tabId, opts = {}) {
        const section = findSection(sectionId);
        const tab = findTab(section, tabId);

        if (typeof tab.go === 'function') tab.go();

        // `keepsCurrent` es para destinos que abren una ventana encima (no cambian de sección).
        if (!tab.keepsCurrent) current = { section: section.id, tab: tab.id };

        if (!opts.silent && !tab.keepsCurrent) {
            const hash = `#/${current.section}/${current.tab}`;
            if (location.hash !== hash) {
                if (opts.replace) history.replaceState(null, '', hash);
                else history.pushState(null, '', hash);
            }
        }

        // El título del documento lo pone la cabecera (PromotionNav.tsx), que ya
        // conoce el nombre de la promoción cuando termina de cargarse.
        window.dispatchEvent(new CustomEvent('promotion-destination-changed', { detail: { ...current } }));
        return current;
    }

    function fromHash() {
        const m = /^#\/([a-z-]+)(?:\/([a-z-]+))?/.exec(location.hash || '');
        return m ? { section: m[1], tab: m[2] } : null;
    }

    /** Resuelve el destino inicial: hash de la URL, o Inicio. */
    function start() {
        const dest = fromHash();
        goTo(dest ? dest.section : 'inicio', dest ? dest.tab : null, { replace: true });
    }

    window.addEventListener('popstate', () => {
        const dest = fromHash();
        if (dest) goTo(dest.section, dest.tab, { silent: true });
    });

    window.PROMOTION_SECTIONS = SECTIONS;
    window.goToPromotionDestination = goTo;
    window.getPromotionDestination = () => ({ ...current });
    window.startPromotionNav = start;
})();
