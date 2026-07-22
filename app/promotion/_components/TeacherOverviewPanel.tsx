'use client';

/**
 * TeacherOverviewPanel.tsx — sub-tab "Accesos Rápidos" (overview) de la Teacher-Area (spec 0014 Fase C).
 *
 * 14º bloque. Reemplaza el contenido del pane #teacher-area-overview (#teacher-area-quick-actions) por
 * un componente React montado por portal. Patrón "markup en React, lógica legacy por id":
 * loadTeacherAreaOverview() + displayTeacherAreaQuickActions() (ambos null-safe) pueblan
 * #teacher-area-quick-actions; lo dispara switchTeacherAreaSubTab('overview') al abrir la teacher-area.
 * React dispara loadTeacherAreaOverview() tras montar (poll) como red de seguridad. CERO cambios en el
 * orquestador.
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

export function TeacherOverviewPanelHost() {
  const host = usePortalNode('teacher-area-overview');
  if (!host) return null;
  return createPortal(<TeacherOverviewPanel />, host);
}

function TeacherOverviewPanel() {
  useEffect(() => {
    let tries = 0;
    const iv = setInterval(() => {
      tries += 1;
      if (typeof w().loadTeacherAreaOverview === 'function') { w().loadTeacherAreaOverview(); clearInterval(iv); }
      else if (tries > 40) clearInterval(iv);
    }, 100);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="mb-4">
      <h6 className="mb-3 text-dark fw-bold">
        <i className="bi bi-lightning-charge text-warning me-2" />Accesos Rápidos
      </h6>
      <div id="teacher-area-quick-actions" className="p-3 bg-light rounded-3 border">
        {/* Lo puebla el legacy (displayTeacherAreaQuickActions) por innerHTML. */}
        <div className="text-center py-4">
          <div className="spinner-border text-primary spinner-border-sm" role="status" />
          <span className="ms-2">Cargando acciones...</span>
        </div>
      </div>
    </div>
  );
}
