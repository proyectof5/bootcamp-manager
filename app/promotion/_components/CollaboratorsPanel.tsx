'use client';

/**
 * CollaboratorsPanel.tsx — sección "Colaboradores" de /promotion (spec 0014 Fase C).
 *
 * 12º bloque extraído del orquestador (1ª sección FUERA de Contenido del Programa). Reemplaza el
 * contenido del `#collaborators-tab` (cabecera + lista de colaboradores) que vivía en body.ts por un
 * componente React montado por portal.
 *
 * ⚠️ El body.ts legacy tenía DOS `#collaborators-tab` (id duplicado): una versión list-group
 * ("Program Collaborators", #collaborators-list) y una tabla ("Colaboradores del Programa",
 * #collaborators-list-body). `switchTab` usa getElementById → mostraba SIEMPRE la PRIMERA (list-group);
 * la tabla era código muerto (oculto). Aquí: se migra la list-group (la visible) y se ELIMINA la tabla
 * duplicada del body.ts (arregla el id duplicado). Los ids `collaborators-list-body`/`add-collaborator-btn`
 * desaparecen, pero sus consumidores en el orquestador están guardados (`if (el)`) → no-op.
 *
 * Patrón "markup en React, lógica legacy por id": React renderiza el markup conservando
 * `#collaborators-list`; el orquestador lo puebla con displayCollaborators() (null-safe), disparado por
 * loadCollaborators() (lo llama switchTab('collaborators') al abrir + la carga inicial + el CRUD). El
 * botón llama a window.openCollaboratorModal(); las filas (que crea el legacy) llaman a
 * window.openCollaboratorModulesModal/removeCollaborator (modales ya shadcn). React dispara
 * loadCollaborators() tras montar (poll) como red de seguridad.
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

export function CollaboratorsPanelHost() {
  const host = usePortalNode('collaborators-tab');
  if (!host) return null;
  return createPortal(<CollaboratorsPanel />, host);
}

function CollaboratorsPanel() {
  // switchTab('collaborators') ya llama loadCollaborators al abrir; esto es red de seguridad para el
  // primer pintado si el portal monta después de la carga inicial.
  useEffect(() => {
    let tries = 0;
    const iv = setInterval(() => {
      tries += 1;
      if (typeof w().loadCollaborators === 'function') { w().loadCollaborators(); clearInterval(iv); }
      else if (tries > 40) clearInterval(iv);
    }, 100);
    return () => clearInterval(iv);
  }, []);

  return (
    <>
      <div className="d-flex justify-content-between align-items-center my-4">
        <h2>Program Collaborators</h2>
        <button type="button" className="btn btn-primary" onClick={() => w().openCollaboratorModal?.()}>
          <i className="bi bi-person-plus me-2" />Agregar colaborador
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          <p className="text-muted mb-3">Personas del equipo con acceso para modificar este programa:</p>
          <div id="collaborators-list" className="list-group">
            {/* Lo puebla el legacy (displayCollaborators) por innerHTML. */}
          </div>
        </div>
      </div>
    </>
  );
}
