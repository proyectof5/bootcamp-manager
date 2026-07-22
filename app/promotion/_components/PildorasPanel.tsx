'use client';

/**
 * PildorasPanel.tsx — sub-tab "Píldoras" de Contenido del Programa (spec 0014 Fase C).
 *
 * 11º bloque extraído del orquestador (último sub-tab de Contenido del Programa). Reemplaza el
 * contenido del pane #program-details-pildoras (cabecera con navegación de módulos + toggle
 * self-assignment + botones + #pildoras-list-body) que vivía en body.ts por un componente React
 * montado por portal.
 *
 * Patrón "markup en React, lógica legacy por id" (como Roadmap/VirtualClassroomPanel): el panel está
 * acoplado a estado del orquestador (promotionModules, extendedInfoData.modulesPildoras,
 * currentModuleIndex). React solo renderiza el MARKUP conservando los ids legacy; el orquestador los
 * puebla: displayPildoras() + updateModuleNavigation() (ambos null-safe) rellenan #pildoras-list-body,
 * #current-module-name, #module-pildoras-count y el estado disabled de los botones. Los controles
 * llaman a window.navigateToPreviousModule/navigateToNextModule/togglePildorasAssignment/addPildoraRow/
 * downloadPildorasExcelTemplate/importPildorasFromExcel.
 *
 * Trigger de render: switchProgramDetailsTab NO tiene rama 'pildoras' → el único render es
 * loadModulesPildoras() (on load, tras cargar datos) + el CRUD. Para garantizar el pintado tras montar
 * el portal, React llama a window.displayPildoras() en cuanto la fn + promotionModules existen (poll).
 * saveExtendedInfo lee las filas con querySelectorAll('#pildoras-list-body tr') → React mantiene la
 * <table id="pildoras-list-body"> y el legacy crea las filas por innerHTML (no hay conflicto).
 */

import { useEffect, useState } from 'react';
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

export function PildorasPanelHost() {
  const host = usePortalNode('program-details-pildoras');
  if (!host) return null;
  return createPortal(<PildorasPanel />, host);
}

function PildorasPanel() {
  // Tras montar, dispara el render legacy (switchProgramDetailsTab no lo hace para pildoras).
  // Espera a que displayPildoras exista y a que promotionModules esté cargado para no pintar
  // "No modules found"; tras un timeout llama igual (promo sin módulos).
  useEffect(() => {
    let tries = 0;
    const iv = setInterval(() => {
      tries += 1;
      const ww = w();
      const ready = typeof ww.displayPildoras === 'function' && (ww.promotionModules || []).length > 0;
      if (ready) { ww.displayPildoras(); clearInterval(iv); }
      else if (tries > 60) { if (typeof ww.displayPildoras === 'function') ww.displayPildoras(); clearInterval(iv); }
    }, 100);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="card">
      <div className="card-header bg-light">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2">
            <h6 className="mb-0"><i className="bi bi-lightbulb me-2" />Píldoras</h6>
            <div className="d-flex align-items-center gap-2" id="pildoras-module-nav">
              <button type="button" className="btn btn-sm btn-outline-secondary" id="prev-module-btn" onClick={() => w().navigateToPreviousModule?.()} disabled>
                <i className="bi bi-chevron-left" />
              </button>
              <span className="fw-semibold text-primary" id="current-module-name">Módulo I</span>
              <button type="button" className="btn btn-sm btn-outline-secondary" id="next-module-btn" onClick={() => w().navigateToNextModule?.()}>
                <i className="bi bi-chevron-right" />
              </button>
            </div>
            <div className="badge text-dark" id="current-module-stats">
              <span id="module-pildoras-count">0</span> píldoras
            </div>
          </div>
          <div className="form-check form-switch">
            <input className="form-check-input" type="checkbox" id="pildoras-assignment-toggle" onChange={(e) => w().togglePildorasAssignment?.(e.target.checked)} />
            <label className="form-check-label fw-semibold" htmlFor="pildoras-assignment-toggle">Self-Assignment</label>
          </div>
        </div>
      </div>
      <div className="card-header bg-white border-bottom pt-3 pb-2">
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => w().addPildoraRow?.()}>
            <i className="bi bi-plus" /> Agregar Píldora
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" id="pildoras-excel-template-btn" onClick={() => w().downloadPildorasExcelTemplate?.()}>
            <i className="bi bi-download" /> Plantilla Excel
          </button>
          <input type="file" id="pildoras-excel-input" accept=".xlsx,.xls,.csv" className="d-none" onChange={(e) => w().importPildorasFromExcel?.(e.target)} />
          <button type="button" className="btn btn-sm btn-outline-success" id="pildoras-import-excel-btn" onClick={() => document.getElementById('pildoras-excel-input')?.click()}>
            <i className="bi bi-file-earmark-spreadsheet" /> Importar Excel
          </button>
        </div>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Presentación</th>
                <th>Fecha</th>
                <th>Píldora</th>
                <th>Estudiante</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="pildoras-list-body" />
          </table>
        </div>
      </div>
    </div>
  );
}
