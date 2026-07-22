'use client';

/**
 * VirtualClassroomPanel.tsx — sub-tab "Aula Virtual" de Contenido del Programa (spec 0014 Fase C).
 *
 * 9º bloque extraído del orquestador. Reemplaza el panel #virtual-classroom-panel (form de
 * activación del Aula Virtual) que vivía en body.ts por un componente React montado por portal en
 * #program-details-virtual-classroom.
 *
 * Patrón "markup en React, lógica legacy por id" (igual que ScheduleSettings): el panel es un form
 * stateful muy acoplado a window._evalState (proyectos + competencias, que carga loadEvaluation).
 * En vez de replicar ~250 líneas de initVirtualClassroomPanel/updateVirtualClassroomCompetencesPreview/
 * onVirtualClassroomProjectChange/saveVirtualClassroom, React solo renderiza el MARKUP conservando
 * TODOS los ids legacy (vc-*), y el orquestador sigue poblándolos/leyéndolos por id:
 *  - initVirtualClassroomPanel(ext, promo) (lo llama switchProgramDetailsTab al abrir la pestaña y
 *    loadEvaluation) puebla el <select>, inputs, badge de estado y la preview de competencias. Es
 *    null-safe (early-return si los nodos no existen), así que el timing de montaje del portal no
 *    rompe nada: cuando el usuario abre la pestaña, el panel ya está montado.
 *  - El <select> dispara window.onVirtualClassroomProjectChange(); los botones llaman a
 *    window.saveVirtualClassroom(true) / window.deactivateVirtualClassroom().
 *  - #vc-project-select y #vc-competences-list los puebla el legacy vía innerHTML → se renderizan
 *    con contenido mínimo y NO se re-renderizan (el componente no tiene estado), evitando que React
 *    pise lo que inyecta el orquestador.
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

export function VirtualClassroomPanelHost() {
  const host = usePortalNode('program-details-virtual-classroom');
  if (!host) return null;
  return createPortal(<VirtualClassroomPanel />, host);
}

function VirtualClassroomPanel() {
  return (
    <div className="card mb-3" id="virtual-classroom-panel">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <div>
            <h5 className="mb-1"><i className="bi bi-laptop me-2 text-primary" />Aula Virtual</h5>
            <p className="text-muted small mb-0">
              Activa un proyecto para que el estudiantado entregue su repositorio desde la vista pública.
            </p>
          </div>
          <div className="text-end">
            <span className="badge bg-secondary" id="vc-status-badge">Sin proyecto activo</span>
          </div>
        </div>

        <div className="row g-3 align-items-end">
          <div className="col-md-5">
            <label htmlFor="vc-project-select" className="form-label small fw-semibold text-muted">Proyecto vinculado</label>
            <select id="vc-project-select" className="form-select form-select-sm" onChange={() => w().onVirtualClassroomProjectChange?.()}>
              <option value="">Selecciona módulo y proyecto…</option>
            </select>
            <div className="form-text small" id="vc-project-help">Los proyectos se configuran en la sección Evaluación.</div>
          </div>
          <div className="col-md-3">
            <label htmlFor="vc-repo-base" className="form-label small fw-semibold text-muted">
              URL base del repositorio
              <span id="vc-repo-base-source" className="badge bg-success text-white ms-1 small d-none"><i className="bi bi-github me-1" />desde GitHub</span>
            </label>
            <input type="text" id="vc-repo-base" className="form-control form-control-sm" placeholder="https://github.com/proyectof5/" />
            <div id="vc-repo-base-hint" className="form-text small text-muted d-none">URL tomada del quick link de GitHub. Puedes editarla manualmente.</div>
          </div>
          <div className="col-md-4">
            <label htmlFor="vc-briefing-url" className="form-label small fw-semibold text-muted">
              Link al briefing del proyecto
              <span id="vc-briefing-source" className="badge bg-info text-dark ms-1 small d-none"><i className="bi bi-link-45deg me-1" />desde roadmap</span>
            </label>
            <input type="text" id="vc-briefing-url" className="form-control form-control-sm" placeholder="https://github.com/organizacion/briefing-proyecto" />
            <div id="vc-briefing-hint" className="form-text small text-muted d-none">URL definida en el roadmap. Puedes editarla manualmente si lo necesitas.</div>
          </div>
        </div>

        <div className="row g-3 align-items-end mt-1">
          <div className="col-md-3">
            <label htmlFor="vc-due-date" className="form-label small fw-semibold text-muted">
              <i className="bi bi-calendar-event me-1" />Fecha de entrega <span className="text-muted fw-normal">(opcional)</span>
            </label>
            <input type="date" id="vc-due-date" className="form-control form-control-sm" />
            <div className="form-text small text-muted">Se mostrará de forma destacada en el Aula Virtual pública.</div>
          </div>
        </div>

        <div className="row g-3 mt-3">
          <div className="col-md-8">
            <div className="border rounded p-2 bg-light">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small fw-semibold text-muted">Competencias a evaluar (definidas en Evaluación)</span>
                <span className="badge bg-light text-dark border small" id="vc-competences-count">0 competencias</span>
              </div>
              <div id="vc-competences-list" className="small text-muted">
                <span className="fst-italic">Selecciona un proyecto para ver sus competencias.</span>
              </div>
            </div>
          </div>
          <div className="col-md-4 d-flex justify-content-md-end align-items-start gap-2 mt-2 mt-md-0">
            <button type="button" className="btn btn-sm btn-outline-secondary" id="vc-deactivate-btn" onClick={() => w().deactivateVirtualClassroom?.()} disabled>
              <i className="bi bi-x-circle me-1" />Desactivar
            </button>
            <button type="button" className="btn btn-sm btn-primary" id="vc-activate-btn" onClick={() => w().saveVirtualClassroom?.(true)}>
              <i className="bi bi-play-circle me-1" />Activar Aula Virtual
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
