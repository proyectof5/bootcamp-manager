'use client';

/**
 * TeamManager.tsx — sub-tab "Team" de Contenido del Programa (spec 0014 Fase C).
 *
 * 5º bloque extraído del orquestador. Reemplaza la tabla #team-list-body (que poblaba
 * displayTeam() en promotion-detail.js) por un componente React montado por portal en
 * #program-details-team (vaciado en body.ts).
 *
 * Patrón PUENTE (no self-fetch): los datos del equipo viven en el global de módulo
 * extendedInfoData.team, que mutan los modales shadcn de equipo (openTeamModal/addTeamMember,
 * openEditTeamModal/updateTeamMember, deleteTeamMember) y los flujos de colaboradores
 * (saveCollaboratorModules, removeCollaborator) ANTES de llamar a displayTeam(). Por eso:
 *  - El orquestador expone window.__getPromotionTeam() (lee extendedInfoData.team) y
 *    displayTeam() ahora solo dispara window.__refreshTeam() (re-render de este componente).
 *  - Los modales de alta/edición/borrado siguen en el orquestador (ya son shadcn); las
 *    filas llaman a window.openEditTeamModal(i) / window.deleteTeamMember(i) y la cabecera
 *    a window.openTeamModal().
 *
 * La celda "Módulo" NO sale de member.moduleIds: se recalcula igual que el legacy desde
 * window.currentPromotion (teacherId → ownerModules; si no, collaboratorModules) mapeando a
 * nombres con window.promotionModules. Ambos globales ya cuelgan de window.
 */

import { useEffect, useReducer, useState } from 'react';
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

interface TeamMember {
  collaboratorId?: string;
  name: string;
  role?: string;
  email?: string;
  linkedin?: string;
  moduleIds?: string[];
  moduleName?: string;
}
interface PromoModule { id: string; name: string; }

export function TeamManagerHost() {
  const host = usePortalNode('program-details-team');
  if (!host) return null;
  return createPortal(<TeamManager />, host);
}

// Replica el cálculo de módulos de displayTeam() del legacy.
function moduleNamesFor(member: TeamMember): string[] {
  const promo = w().currentPromotion || {};
  const modules: PromoModule[] = w().promotionModules || [];
  let moduleIds: string[] = [];
  const isOwner = promo.teacherId === member.collaboratorId;
  if (isOwner) {
    moduleIds = promo.ownerModules || [];
  } else {
    const entry = (promo.collaboratorModules || []).find(
      (m: { teacherId?: string }) => m.teacherId === member.collaboratorId,
    );
    moduleIds = entry ? (entry.moduleIds || []) : [];
  }
  const names: string[] = [];
  (moduleIds || []).forEach((mid) => {
    const found = modules.find((m) => String(m.id) === String(mid));
    if (found) names.push(found.name);
  });
  return names;
}

function TeamManager() {
  const [, force] = useReducer((x: number) => x + 1, 0);

  // El orquestador dispara este refresco desde displayTeam() tras cada mutación de
  // extendedInfoData.team (modales de equipo + flujos de colaboradores).
  useEffect(() => {
    w().__refreshTeam = () => force();
    force(); // primer pintado por si los datos ya estaban cargados al montar
    return () => { if (w().__refreshTeam) delete w().__refreshTeam; };
  }, []);

  const team: TeamMember[] = (w().__getPromotionTeam?.() || []) as TeamMember[];

  return (
    <div className="card">
      <div className="card-header bg-light d-flex justify-content-between align-items-center">
        <h6 className="mb-0"><i className="bi bi-people me-2" />Miembros del equipo</h6>
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => w().openTeamModal?.()}>
          <i className="bi bi-plus" /> Agregar miembro
        </button>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Role</th>
                <th>Email</th>
                <th>Módulo</th>
                <th>LinkedIn</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {team.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-3">Sin miembros del equipo.</td>
                </tr>
              ) : (
                team.map((member, index) => {
                  const modNames = moduleNamesFor(member);
                  return (
                    <tr key={member.collaboratorId || index}>
                      <td>{member.name}</td>
                      <td>{member.role || ''}</td>
                      <td>{member.email || ''}</td>
                      <td>
                        {modNames.length > 0 ? (
                          modNames.map((name, i) => (
                            <span key={i} className="badge bg-light text-dark border me-1">{name}</span>
                          ))
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                      <td>
                        {member.linkedin ? (
                          <a href={member.linkedin} target="_blank" rel="noopener noreferrer"><i className="bi bi-linkedin" /></a>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                      <td>
                        <button type="button" className="btn btn-sm btn-outline-primary me-1" title="Editar" onClick={() => w().openEditTeamModal?.(index)}>
                          <i className="bi bi-pencil" />
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-danger" title="Eliminar" onClick={() => w().deleteTeamMember?.(index)}>
                          <i className="bi bi-trash" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
