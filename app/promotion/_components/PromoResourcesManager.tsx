'use client';

/**
 * PromoResourcesManager.tsx — card "Recursos de la Promoción" del sub-tab Recursos (spec 0014 Fase C).
 *
 * 7º bloque extraído del orquestador. Reemplaza la card legacy #promo-resources-list (que poblaba
 * loadPromoResources/renderPromoResources en promotion-detail.js) por un componente React montado
 * por portal en #program-details-promo-resources (contenedor nuevo en body.ts).
 *
 * Self-fetch (como Quick Links): el componente pide /promotion-resources/all y rinde los accordions
 * agrupados por módulo con badges de estado (borrador/programado/publicado). El colapso lo controla
 * React (no el shim de Bootstrap). El modal de alta/edición (promoResourceModal) y las acciones
 * (editar/publicar/despublicar/eliminar) SIGUEN en el orquestador; las llamamos por window.* y el
 * orquestador refresca esta lista vía window.__refreshPromoResources() (loadPromoResources reducido
 * a ese bridge, lo llaman init + guardado del modal + publish/unpublish/delete).
 */

import { useCallback, useEffect, useReducer, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '@/lib/api';

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

interface TypeMeta { icon: string; color: string; label: string; }
const PROMO_RESOURCE_TYPE_ICONS: Record<string, TypeMeta> = {
  video: { icon: 'bi-play-btn-fill', color: '#dc3545', label: 'Vídeo' },
  repository: { icon: 'bi-github', color: '#333', label: 'Repositorio' },
  canva: { icon: 'bi-palette-fill', color: '#7c3aed', label: 'Canva' },
  powerpoint: { icon: 'bi-file-earmark-slides-fill', color: '#e55a1c', label: 'PowerPoint' },
  other: { icon: 'bi-paperclip', color: '#6c757d', label: 'Otro' },
};

interface PromoResource {
  id: string;
  title: string;
  description?: string;
  type?: string;
  url: string;
  module?: string;
  status?: string;
  publishAt?: string | null;
}

export function PromoResourcesManagerHost() {
  const [promotionId, setPromotionId] = useState<string | null>(null);
  useEffect(() => { setPromotionId(new URLSearchParams(window.location.search).get('id')); }, []);
  const host = usePortalNode('program-details-promo-resources');
  if (!host || !promotionId) return null;
  return createPortal(<PromoResourcesManager promotionId={promotionId} />, host);
}

function StatusBadge({ r, now }: { r: PromoResource; now: number }) {
  if (r.status === 'published') {
    return <span className="badge bg-success"><i className="bi bi-check-circle me-1" />Publicado</span>;
  }
  if (r.publishAt && new Date(r.publishAt).getTime() <= now) {
    return <span className="badge bg-success"><i className="bi bi-clock-history me-1" />Publicado (programado)</span>;
  }
  if (r.publishAt) {
    const dateStr = new Date(r.publishAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    return <span className="badge bg-warning text-dark"><i className="bi bi-calendar-event me-1" />Programado: {dateStr}</span>;
  }
  return <span className="badge bg-secondary"><i className="bi bi-pencil-square me-1" />Borrador</span>;
}

function PromoResourcesManager({ promotionId }: { promotionId: string }) {
  const [resources, setResources] = useState<PromoResource[]>([]);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [, force] = useReducer((x: number) => x + 1, 0);

  const load = useCallback(async () => {
    try {
      const r = await apiFetch(`/api/promotions/${promotionId}/promotion-resources/all`);
      if (r.ok) setResources(await r.json());
    } catch {
      /* noop */
    }
  }, [promotionId]);

  useEffect(() => {
    load();
    // El orquestador llama esto tras init + guardado del modal + publish/unpublish/delete.
    w().__refreshPromoResources = () => { load(); force(); };
    return () => { if (w().__refreshPromoResources) delete w().__refreshPromoResources; };
  }, [load]);

  const toggle = (id: string) => setOpen((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // Group by module (igual que renderPromoResources del legacy).
  const grouped: Record<string, PromoResource[]> = {};
  resources.forEach((r) => {
    const key = r.module || '__sin_modulo__';
    (grouped[key] ||= []).push(r);
  });
  const now = Date.now();

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-light d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-collection-play text-primary" />
          <h6 className="mb-0">Recursos de la Promoción</h6>
          <span className="badge bg-secondary">{resources.length}</span>
        </div>
        <button type="button" className="btn btn-sm btn-primary" onClick={() => w().openPromoResourceModal?.()}>
          <i className="bi bi-plus-circle me-1" />Nuevo Recurso
        </button>
      </div>
      <div className="card-body p-3">
        <p className="text-muted small mb-3">
          <i className="bi bi-info-circle me-1" />
          Los recursos en <strong>borrador</strong> solo los ves tú. Los <strong>publicados</strong> (o programados y con fecha cumplida) aparecen en la página pública bajo &quot;En Progreso&quot;.
        </p>

        {resources.length === 0 ? (
          <div className="text-center text-muted py-4">
            <i className="bi bi-collection-play fs-2 d-block mb-2 opacity-25" />
            <span className="small">Sin recursos aún. Crea el primero.</span>
          </div>
        ) : (
          Object.entries(grouped).map(([moduleName, items]) => (
            <div key={moduleName} className="mb-4">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="fw-bold text-primary"><i className="bi bi-folder2-open me-1" />{moduleName === '__sin_modulo__' ? 'Sin módulo' : moduleName}</span>
                <span className="badge bg-light text-dark border">{items.length}</span>
              </div>
              <div className="accordion">
                {items.map((r) => {
                  const meta = PROMO_RESOURCE_TYPE_ICONS[r.type || 'other'] || PROMO_RESOURCE_TYPE_ICONS.other;
                  const isOpen = open.has(r.id);
                  return (
                    <div key={r.id} className="accordion-item border rounded mb-2 shadow-sm">
                      <h2 className="accordion-header">
                        <button type="button" className={`accordion-button py-2 px-3${isOpen ? '' : ' collapsed'}`} aria-expanded={isOpen} onClick={() => toggle(r.id)}>
                          <div className="d-flex align-items-center gap-2 w-100 flex-wrap">
                            <i className={`bi ${meta.icon} fs-5`} style={{ color: meta.color, minWidth: '1.2rem' }} />
                            <span className="fw-semibold flex-grow-1">{r.title}</span>
                            <div className="d-flex gap-1 flex-wrap">
                              <span className="badge bg-light text-dark border" style={{ fontSize: '0.7rem' }}>{meta.label}</span>
                              <StatusBadge r={r} now={now} />
                            </div>
                          </div>
                        </button>
                      </h2>
                      <div className={`accordion-collapse collapse${isOpen ? ' show' : ''}`}>
                        <div className="accordion-body py-2 px-3">
                          {r.description && <p className="text-muted small mb-2">{r.description}</p>}
                          <div className="mb-2">
                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">
                              <i className="bi bi-box-arrow-up-right me-1" />Abrir recurso
                            </a>
                          </div>
                          <div className="d-flex gap-2 flex-wrap mt-2">
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => w().editPromoResource?.(r.id)}>
                              <i className="bi bi-pencil me-1" />Editar
                            </button>
                            {r.status !== 'published' ? (
                              <button type="button" className="btn btn-sm btn-success" onClick={() => w().publishPromoResource?.(r.id)}>
                                <i className="bi bi-globe me-1" />Publicar
                              </button>
                            ) : (
                              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => w().unpublishPromoResource?.(r.id)}>
                                <i className="bi bi-eye-slash me-1" />Volver a borrador
                              </button>
                            )}
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => w().deletePromoResource?.(r.id)}>
                              <i className="bi bi-trash me-1" />Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
