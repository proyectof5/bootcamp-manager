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
// Evita deliberadamente la palabra "Descargar"/"Download" y el icono de flecha-hacia-abajo: los
// bloqueadores de anuncios (Brave Shields, uBlock, AdBlock...) traen filtros cosméticos genéricos
// que ocultan botones así por parecerse al patrón de "botón de descarga falso" tan común en
// publicidad maliciosa — un usuario reportó que en Brave el menú ni siquiera se abría, y la lógica
// de exportación en sí ya estaba verificada como correcta (sin errores llamándola directamente).
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

  const pick = (format: 'png' | 'pdf' | 'xlsx') => {
    setOpen(false);
    w().exportRoadmap?.(format);
  };

  return (
    <div className="roadmap-export-menu" ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="btn btn-outline-primary btn-sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <i className="bi bi-box-arrow-up-right me-1" />Exportar roadmap
      </button>
      <ul className={`dropdown-menu dropdown-menu-end${open ? ' show' : ''}`} style={{ position: 'absolute', right: 0 }}>
        <li><button type="button" className="dropdown-item" onClick={() => pick('png')}><i className="bi bi-file-earmark-image me-2" />Imagen (PNG)</button></li>
        <li><button type="button" className="dropdown-item" onClick={() => pick('pdf')}><i className="bi bi-file-earmark-pdf me-2" />PDF</button></li>
        <li><button type="button" className="dropdown-item" onClick={() => pick('xlsx')}><i className="bi bi-file-earmark-excel me-2" />Excel (XLSX)</button></li>
      </ul>
    </div>
  );
}

function RoadmapPanel() {
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

  return (
    <>
      <div className="justify-content-between align-items-center mb-4 detail-card">
        <h5 className="mb-0">Roadmap &amp; Módulos</h5>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <button type="button" className="btn btn-outline-warning btn-sm" onClick={() => w().openEmployabilityModal?.()}>
            <i className="bi bi-briefcase me-2" />Sesiones Empleabilidad
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => w().openModuleModal?.()}>
            <i className="bi bi-plus-circle me-2" />Agregar Módulo
          </button>
        </div>
      </div>
      <div id="modules-list" className="row">
        {/* Lo puebla el legacy (displayModules) por innerHTML. */}
      </div>
      <div className="mt-4">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <h6 className="mb-0">Diagrama Gantt</h6>
          <div className="d-flex gap-2">
            <div className="btn-group btn-group-sm" role="group" aria-label="Zoom del Gantt">
              <button type="button" className="btn btn-outline-secondary gantt-zoom-btn" data-zoom-level="day" onClick={() => w().setGanttZoomLevel?.('day')}>Día</button>
              <button type="button" className="btn btn-outline-secondary gantt-zoom-btn active" data-zoom-level="week" onClick={() => w().setGanttZoomLevel?.('week')}>Semana</button>
              <button type="button" className="btn btn-outline-secondary gantt-zoom-btn" data-zoom-level="month" onClick={() => w().setGanttZoomLevel?.('month')}>Mes</button>
            </div>
            <ExportDropdown />
          </div>
        </div>
        {/* Lo puebla el legacy (generateGanttChart → DHTMLX Gantt, Fase 6). */}
        <div id="gantt-container" style={{ width: '100%', height: 500, overflow: 'auto' }} />
      </div>
    </>
  );
}
