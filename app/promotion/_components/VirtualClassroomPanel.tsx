'use client';

/**
 * VirtualClassroomPanel.tsx — sub-tab "Aula Virtual" de Contenido del Programa (spec 0014 Fase C,
 * multi-proyecto spec 0015).
 *
 * 9º bloque extraído del orquestador. Reemplaza el panel #virtual-classroom-panel (form de
 * activación del Aula Virtual) que vivía en body.ts por un componente React montado por portal en
 * #program-details-virtual-classroom.
 *
 * Patrón "markup en React, lógica legacy por id" (igual que ScheduleSettings): React SOLO renderiza
 * el shell (cabecera + badge de estado global + contenedor vacío #vc-projects-list); todo el
 * contenido variable (una fila por proyecto, cada una con su propio estado activo/inactivo) lo
 * inyecta el orquestador vía innerHTML — igual que #groups-modal-body o #epcp-list.
 *  - initVirtualClassroomPanel(ext, promo) (lo llama switchProgramDetailsTab al abrir la pestaña y
 *    loadEvaluation) construye window._evalState.virtualClassrooms y llama a
 *    _renderVirtualClassroomList(), que puebla #vc-projects-list con una fila por proyecto definido
 *    en Evaluación (projectCompetences). Es null-safe (early-return si los nodos no existen), así
 *    que el timing de montaje del portal no rompe nada.
 *  - Cada fila trae sus propios botones, que llaman a window._vcToggleProject(this, true|false) —
 *    activa/actualiza o desactiva SOLO ese proyecto, sin afectar a los demás que estén activos.
 *  - #vc-projects-list lo puebla el legacy vía innerHTML → se renderiza vacío y NO se re-renderiza
 *    (el componente no tiene estado), evitando que React pise lo que inyecta el orquestador.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

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
              Activa uno o varios proyectos a la vez (por ejemplo, uno por especialización) para que
              el estudiantado entregue su repositorio desde la vista pública.
            </p>
          </div>
          <div className="text-end">
            <span className="badge bg-secondary" id="vc-status-badge">Sin proyectos activos</span>
          </div>
        </div>

        <div id="vc-projects-list">
          <div className="text-center text-muted small py-3">
            <div className="spinner-border spinner-border-sm me-2" role="status" />Cargando proyectos…
          </div>
        </div>
      </div>
    </div>
  );
}
