'use client';

/**
 * RoadmapPanel.tsx — sub-tab "Roadmap" (Roadmap & Módulos) de Contenido del Programa
 * (spec 0014 Fase C).
 *
 * 10º bloque extraído del orquestador. Reemplaza el contenido del pane #program-details-roadmap
 * (cabecera + #modules-list + #gantt-table) que vivía en body.ts por un componente React montado
 * por portal.
 *
 * Patrón "markup en React, lógica legacy por id" (como ScheduleSettings/VirtualClassroomPanel): el
 * roadmap es muy acoplado (gantt con botones de edición inline, drag, navegación). En vez de
 * replicar generateGanttChart (cientos de líneas), React solo renderiza el MARKUP conservando los
 * ids legacy (#modules-list, #gantt-container) y el orquestador los puebla:
 *  - loadModules() (fetch promo + displayModules + generateGanttChart) los rellena por id.
 *  - Los controles llaman a window.openEmployabilityModal / openModuleModal.
 *  - Fase 6 (dhtmlx-gantt-roadmap): el toggle "Mostrar Empleabilidad" se quitó — la empleabilidad
 *    ya no se pinta en el Gantt DHTMLX desde la Fase 2 (TASK-7), así que el toggle no tenía efecto.
 *    El botón "Sesiones Empleabilidad" se conserva: gestiona los datos (modal), algo independiente
 *    de si se muestran o no en el Gantt.
 *  - #modules-list (cuyo render de tarjetas está comentado en el legacy → casi siempre vacío) y
 *    #gantt-table los puebla el legacy vía innerHTML → se renderizan vacíos y el componente no
 *    re-renderiza (sin estado) → no hay pelea de reconciliación.
 *
 * displayModules/generateGanttChart NO eran null-safe (tocaban .innerHTML sin guard) → se añadieron
 * guards en el orquestador. Como el roadmap es la pestaña por defecto, loadModules puede correr antes
 * de montar el portal (→ no-op por los guards); por eso React llama a window.loadModules() en cuanto
 * está disponible (poll corto) para garantizar el render tras el montaje.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function w(): any { return (typeof window !== 'undefined' ? window : {}) as unknown as any; }

function usePortalNode(id: string): HTMLElement | null {
  const [node, setNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    let cancelled = false;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (cancelled) return;
      const n = document.getElementById(id);
      setNode((cur) => (n !== cur ? n : cur));
      t = setTimeout(tick, 300);
    };
    tick();
    return () => { cancelled = true; clearTimeout(t); };
  }, [id]);
  return node;
}

export function RoadmapPanelHost() {
  const host = usePortalNode('program-details-roadmap');
  if (!host) return null;
  return createPortal(<RoadmapPanel />, host);
}

// Dropdown de exportación con estado propio (useState + click-fuera para cerrar) en vez de
// data-bs-toggle="dropdown": esta página no carga el JS de Bootstrap (solo su CSS), así que
// data-bs-toggle no hace nada por sí solo — se comprobó en vivo (window.bootstrap === undefined).
//
// Causa raíz real de "el menú no se abre" (reproducida en dev Y en el export estático de
// producción, en cualquier navegador — no es cosa de bloqueadores de anuncios): shared.js trae un
// shim de Bootstrap (_bootstrapJsShim) que, en CADA clic de la página, cierra todo
// `.dropdown-menu.show` cuyo disparador no tenga `data-bs-toggle="dropdown"` — mi botón React no
// lo tiene, así que el propio clic que abre el menú (vía setOpen(true) más arriba en la cadena)
// burbujea hasta `document` y el shim le quita `show` a la clase en el mismo evento, dejando
// aria-expanded="true" (lo último que tocó React) pero la clase sin "show" (lo último que tocó el
// shim). e.stopPropagation() en el botón evita que ESE clic llegue al listener del shim; los clics
// fuera del menú (que sí deben cerrarlo) no lo llevan y siguen funcionando via el propio listener
// de abajo (mousedown) y, redundantemente, via el shim.
//
// Se evita además la palabra "Descargar"/"Download" y el icono de flecha-hacia-abajo por si acaso:
// los bloqueadores de anuncios (Brave Shields, uBlock...) traen filtros cosméticos genéricos que
// ocultan botones así por parecerse al patrón de "botón de descarga falso" tan común en publicidad
// maliciosa — no era la causa real de este bug, pero es una defensa razonable de todos modos.
function ExportDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const pick = (e: React.MouseEvent, format: 'png' | 'pdf' | 'xlsx' | 'ics') => {
    e.stopPropagation(); // ver comentario arriba: evita que shared.js cierre/reabra por su cuenta
    setOpen(false);
    w().exportRoadmap?.(format);
  };

  return (
    <div className="roadmap-export-menu" ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn btn-outline-primary btn-sm"
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
      >
        <i className="bi bi-box-arrow-up-right me-1" />Exportar
      </button>
      <ul className={`dropdown-menu dropdown-menu-end${open ? ' show' : ''}`} style={{ position: 'absolute', right: 0 }}>
        <li><button type="button" className="dropdown-item" onClick={(e) => pick(e, 'png')}><i className="bi bi-file-earmark-image me-2" />Imagen (PNG)</button></li>
        <li><button type="button" className="dropdown-item" onClick={(e) => pick(e, 'pdf')}><i className="bi bi-file-earmark-pdf me-2" />PDF</button></li>
        <li><button type="button" className="dropdown-item" onClick={(e) => pick(e, 'xlsx')}><i className="bi bi-file-earmark-excel me-2" />Excel (XLSX)</button></li>
        <li><button type="button" className="dropdown-item" onClick={(e) => pick(e, 'ics')}><i className="bi bi-calendar-event me-2" />Calendario (.ics, para Google Calendar)</button></li>
      </ul>
    </div>
  );
}

// Botón de sincronización directa con Google Calendar (opción "A2": la app
// crea y comparte el calendario vía cuenta de servicio en el backend — ver
// backend/services/googleCalendar.service.js en roadmap-manager-service).
// Estado propio de "sincronizando" para desactivar el botón y mostrar
// feedback inmediato mientras dura la llamada (puede tardar unos segundos:
// hace un insert/update por evento contra la API de Google, uno a uno).
function GoogleCalendarSyncButton() {
  const [syncing, setSyncing] = useState(false);

  const onClick = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await w().syncRoadmapGoogleCalendar?.();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button type="button" className="btn btn-outline-primary btn-sm" onClick={onClick} disabled={syncing}>
      {syncing
        ? <><span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />Sincronizando…</>
        : <><i className="bi bi-google me-1" />Google Calendar</>}
    </button>
  );
}

// Leyenda de colores por tipo de elemento — en la vista a pantalla completa la
// fila suelta de antes ocupaba espacio vertical valioso, así que pasa a un
// popover pequeño en la barra de herramientas. Mismos tokens
// --app-color-gantt-* que .gantt_task_line.gantt-task-* en promotion-detail.css.
function LegendPopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, [open]);
  const items: [string, string][] = [
    ['var(--app-color-gantt-module)', 'Módulo'],
    ['var(--app-color-gantt-course)', 'Curso'],
    ['var(--app-color-gantt-project)', 'Proyecto'],
    ['var(--app-color-gantt-leccion)', 'Lección'],
    ['var(--app-color-gantt-flexible)', 'Tiempo flexible'],
  ];
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm"
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
      >
        <i className="bi bi-palette me-1" />Leyenda
      </button>
      {open && (
        <div
          className="roadmap-legend-popover"
          style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 1010 }}
        >
          {items.map(([c, label]) => (
            <span key={label} className="gantt-legend-item">
              <span className="gantt-legend-dot" style={{ background: c }} />{label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function RoadmapPanel() {
  const wrapRef = useRef<HTMLDivElement>(null);

  // Tras montar, dispara el render legacy del roadmap. loadModules() puede no estar definido aún
  // (carga de promotion-detail.js) → poll corto hasta que exista y se llama una vez.
  useEffect(() => {
    let tries = 0;
    const iv = setInterval(() => {
      tries += 1;
      if (typeof w().loadModules === 'function') { w().loadModules(); clearInterval(iv); }
      else if (tries > 40) clearInterval(iv);
    }, 100);
    return () => clearInterval(iv);
  }, []);

  // Rediseño "Gantt a pantalla completa" (docs/tasks/gantt-pantalla-completa-drawer.md):
  // el diagrama ocupa TODO el alto disponible bajo las pestañas — sin la caja de
  // 500px con overflow:auto que sumaba una tercera barra de scroll. Las únicas
  // barras son las internas de DHTMLX (una vertical de filas, una horizontal de
  // línea de tiempo). Aquí solo se mide el alto: `--roadmap-h` en el wrapper la
  // consume el CSS (.roadmap-fullbleed). El ancho lo rompe el CSS con márgenes
  // negativos contra el padding de <main>.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const fit = () => {
      // Pestaña oculta (display:none del tab-pane) → getBoundingClientRect da 0.
      if (!wrap.offsetParent) return;
      const top = wrap.getBoundingClientRect().top;
      if (top <= 0) return;
      // El min-height/padding-bottom de <main> los neutraliza el CSS con :has()
      // mientras esta pestaña está activa, así que basta restar al alto del
      // viewport la distancia desde arriba + un colchón pequeño.
      const h = Math.max(360, Math.round(window.innerHeight - top - 6));
      if (wrap.style.getPropertyValue('--roadmap-h') !== h + 'px') {
        wrap.style.setProperty('--roadmap-h', h + 'px');
        const g = w().gantt;
        if (g) { g.setSizes?.(); g.render?.(); }
      }
    };
    fit();
    window.addEventListener('resize', fit);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(document.documentElement);
    // Cubre el caso "se abre la pestaña Roadmap después" (el pane pasa de
    // display:none a block y recién entonces top es real) y layout asíncrono.
    const iv = setInterval(fit, 500);
    const stopper = setTimeout(() => clearInterval(iv), 6000);
    w().__fitRoadmapGantt = fit;
    return () => {
      window.removeEventListener('resize', fit);
      ro?.disconnect();
      clearInterval(iv);
      clearTimeout(stopper);
      if (w().__fitRoadmapGantt === fit) delete w().__fitRoadmapGantt;
    };
  }, []);

  return (
    <div className="roadmap-fullbleed" ref={wrapRef}>
      {/* Barra compacta — una sola fila, reemplaza la cabecera "Roadmap & Módulos"
          + el subtítulo "Diagrama Gantt" + la fila de leyenda. */}
      <div className="roadmap-toolbar">
        <div className="roadmap-toolbar-group">
          <span className="roadmap-toolbar-title">Roadmap</span>
          <div className="btn-group btn-group-sm gantt-zoom-group" role="group" aria-label="Zoom del Gantt">
            <button type="button" className="btn btn-outline-secondary gantt-zoom-btn" data-zoom-level="day" onClick={() => w().setGanttZoomLevel?.('day')}>Día</button>
            <button type="button" className="btn btn-outline-secondary gantt-zoom-btn active" data-zoom-level="week" onClick={() => w().setGanttZoomLevel?.('week')}>Semana</button>
            <button type="button" className="btn btn-outline-secondary gantt-zoom-btn" data-zoom-level="month" onClick={() => w().setGanttZoomLevel?.('month')}>Mes</button>
          </div>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => w().ganttScrollToToday?.()}>
            <i className="bi bi-calendar-event me-1" />Hoy
          </button>
        </div>
        <div className="roadmap-toolbar-group roadmap-toolbar-group--end">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => w().openModuleModal?.()}>
            <i className="bi bi-plus-circle me-1" />Módulo
          </button>
          <button type="button" className="btn btn-brand-soft btn-sm" onClick={() => w().openEmployabilityModal?.()}>
            <i className="bi bi-briefcase me-1" />Empleabilidad
          </button>
          <LegendPopover />
          <GoogleCalendarSyncButton />
          <ExportDropdown />
        </div>
      </div>

      {/* Lista de tarjetas de módulo: su render está comentado en el legacy
          (displayModules) → casi siempre vacía. Se mantiene en el DOM oculta para
          no romper los `document.getElementById('modules-list')` del orquestador. */}
      <div id="modules-list" hidden />

      {/* Lo puebla el legacy (generateGanttChart → DHTMLX Gantt). Sin height ni
          overflow inline: el alto lo da .roadmap-fullbleed (flex:1) y el scroll
          es 100% interno de DHTMLX. */}
      <div id="gantt-container" className="roadmap-gantt-fill" />
    </div>
  );
}
