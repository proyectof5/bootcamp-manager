'use client';

/**
 * ResourcesManager.tsx — card "Recursos del Programa" del sub-tab Recursos (spec 0014 Fase C).
 *
 * 6º bloque extraído del orquestador. Reemplaza la tabla #resources-list-body (que poblaba
 * displayResources() en promotion-detail.js) por un componente React montado por portal en
 * #program-details-resources-template (contenedor nuevo en body.ts; la 2ª card del pane,
 * "Recursos de la Promoción", sigue siendo legacy por ahora — es otra feature con endpoints
 * propios).
 *
 * Patrón PUENTE inverso (igual que Team): los datos viven en el global de módulo
 * extendedInfoData.resources, que mutan el modal de catálogo (addResourceFromCatalog/
 * removeResourceFromCatalog) y deleteResource ANTES de llamar a displayResources(). Por eso:
 *  - El orquestador expone window.__getPromotionResources() y displayResources() solo dispara
 *    window.__refreshResources() (re-render de este componente).
 *  - El modal de catálogo (openResourceModal/resourceModal, con filtros y grid) sigue en el
 *    orquestador; la cabecera llama a window.openResourceModal() y el borrado de fila a
 *    window.deleteResource(index) (muestra su confirm propio).
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

interface NamedRef { id?: string; name: string; }
interface ProgramResource {
  title: string;
  category?: string;
  url: string;
  types?: NamedRef[];
  areas?: NamedRef[];
  tools?: NamedRef[];
  externalId?: string | number;
}

export function ResourcesManagerHost() {
  const host = usePortalNode('program-details-resources-template');
  if (!host) return null;
  return createPortal(<ResourcesManager />, host);
}

function ResourcesManager() {
  const [, force] = useReducer((x: number) => x + 1, 0);

  // El orquestador dispara este refresco desde displayResources() tras cada mutación de
  // extendedInfoData.resources (modal de catálogo + deleteResource).
  useEffect(() => {
    w().__refreshResources = () => force();
    force(); // primer pintado por si los datos ya estaban cargados al montar
    return () => { if (w().__refreshResources) delete w().__refreshResources; };
  }, []);

  const resources: ProgramResource[] = (w().__getPromotionResources?.() || []) as ProgramResource[];

  return (
    <div className="card">
      <div className="card-header bg-light d-flex justify-content-between align-items-center">
        <h6 className="mb-0"><i className="bi bi-tools me-2" />Recursos del Programa</h6>
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => w().openResourceModal?.()}>
          <i className="bi bi-plus" /> Agrega Recurso
        </button>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>Título</th>
                <th>Categoría (tipo)</th>
                <th>URL</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {resources.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-3">Sin recursos del programa.</td>
                </tr>
              ) : (
                resources.map((res, index) => {
                  const areas = (res.areas || []).slice(0, 3);
                  const tools = (res.tools || []).slice(0, 4);
                  const hasExtra = areas.length > 0 || tools.length > 0;
                  return (
                    <tr key={res.externalId ?? index}>
                      <td>
                        <div className="fw-semibold">{res.title}</div>
                        {hasExtra && (
                          <div className="mt-1">
                            {areas.map((a, i) => (
                              <span key={`a${i}`} className="badge bg-light text-dark border small me-1">{a.name}</span>
                            ))}
                            {tools.map((t, i) => (
                              <span key={`t${i}`} className="badge bg-secondary-subtle text-secondary border border-secondary-subtle small me-1">{t.name}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        {res.types && res.types.length ? (
                          res.types.map((t, i) => (
                            <span key={i} className="badge bg-primary-subtle text-primary border border-primary-subtle me-1">{t.name}</span>
                          ))
                        ) : (
                          <span className="badge bg-info text-dark">{res.category || ''}</span>
                        )}
                      </td>
                      <td>
                        <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-truncate d-inline-block" style={{ maxWidth: 180 }}>{res.url}</a>
                      </td>
                      <td>
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => w().deleteResource?.(index)}>
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
