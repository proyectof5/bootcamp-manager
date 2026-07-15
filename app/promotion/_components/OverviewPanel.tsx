'use client';

/**
 * OverviewPanel.tsx — sección "Overview" del programa (spec 0014 Fase C).
 *
 * 17º bloque. Reemplaza el contenido del pane #overview-tab (título + Acciones Rápidas +
 * Progreso del Curso + Agenda con iframe de calendario + Avisos: próxima píldora / asistencia /
 * bloc de notas) por un componente React montado por portal. Es la VISTA POR DEFECTO del programa.
 *
 * Patrón "markup en React, lógica legacy por id": React renderiza el MARKUP conservando TODOS los
 * ids legacy; el orquestador puebla/lee por id:
 *   - loadPromotion()            → #promo-subtitle / #promotion-title / #promotion-desc + progreso
 *   - loadQuickActions()         → #quick-actions-container (+ loadTeacherArea)
 *   - updateCourseProgressBar()/updateProgressInfo() → #progress-bar / #progress-label /
 *     #active-students-count / #withdrawn-students-* / #progress-start-info / #progress-end-info
 *   - loadOverviewCalendarId()   → #calendar-preview-iframe (vía window.setupCalendarPreview)
 *   - loadOverviewPildoraAlert() → #next-pildora-content
 *   - loadOverviewAttendanceAlert() → #attendance-alert-content
 *
 * Todos esos loaders ya son null-safe (early-return si el id no está montado) y los dispara la
 * secuencia de init + switchTab('overview'). React los re-dispara tras montar (poll) como red de
 * seguridad por si el portal monta después de que corrieran. CERO setState tras montar → el
 * componente no re-renderiza, así que el innerHTML/textContent que pone el legacy sobrevive y el
 * portal anidado de NotesPanel (#notes-container) no se pisa.
 *
 * Único cambio en el orquestador: setupCalendarPreviewHandler ahora define
 * window.setupCalendarPreview SIEMPRE y resuelve #calendar-preview-iframe en cada llamada (antes lo
 * capturaba en init, cuando el portal aún no existía → quedaba sin definir y la agenda no cargaba).
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

export function OverviewPanelHost() {
  const host = usePortalNode('overview-tab');
  if (!host) return null;
  return createPortal(<OverviewPanel />, host);
}

function OverviewPanel() {
  useEffect(() => {
    let tries = 0;
    const iv = setInterval(() => {
      tries += 1;
      if (typeof w().loadPromotion === 'function') {
        // (re)poblar el overview por si el portal montó después de la secuencia de init.
        w().loadPromotion?.();
        w().loadQuickActions?.();
        w().loadOverviewCalendarId?.();
        w().loadOverviewPildoraAlert?.();
        w().loadOverviewAttendanceAlert?.();
        clearInterval(iv);
      } else if (tries > 60) {
        clearInterval(iv);
      }
    }, 100);
    return () => clearInterval(iv);
  }, []);

  return (
    <>
      <div className="my-4">
        <p id="promo-subtitle" className="promo-subtitle mb-2" />
        <h1 id="promotion-title" className="promotion-title-styled">Loading...</h1>
        <p id="promotion-desc" className="text-muted" />
      </div>

      {/* Quick Actions Widget */}
      <div className="mb-4">
        <h6 className="mb-3 text-dark">
          <i className="bi bi-lightning-charge text-warning me-2" />Acciones Rápidas
        </h6>
        <div id="quick-actions-container">
          {/* Las tarjetas de acción rápida se cargan aquí (legacy displayQuickActionsFiltered) */}
        </div>
      </div>

      {/* Course Progress Bar */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div className="d-flex align-items-center gap-3">
            <h6 className="mb-0 text-dark">
              <i className="bi bi-graph-up me-2 text-warning" />Progreso del Curso
            </h6>
            <div className="d-flex align-items-center gap-2 px-3 py-1 bg-light rounded">
              <i className="bi bi-people-fill text-warning" />
              <small className="fw-bold text-dark" id="active-students-count">-</small>
            </div>
            {/* Withdrawn Students Block */}
            <div id="withdrawn-students-container" className="d-flex align-items-center gap-2 px-3 py-1 bg-withdrawn rounded">
              <i className="bi bi-person-x text-withdrawn" />
              <small className="fw-bold text-withdrawn" id="withdrawn-students-count">-</small>
            </div>
          </div>
        </div>
        <div className="progress" style={{ height: 28, borderRadius: 8, backgroundColor: '#f0f0f0', position: 'relative' }}>
          <div
            id="progress-bar"
            className="progress-bar progress-bar-striped"
            role="progressbar"
            aria-valuenow={0}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 12 }}
          />
          <div
            id="progress-label"
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', fontWeight: 600, color: '#666', whiteSpace: 'nowrap', pointerEvents: 'none' }}
          />
        </div>
        <div className="d-flex justify-content-between mt-2" style={{ fontSize: '0.85rem' }}>
          <small className="text-muted" id="progress-start-info">-</small>
          <small className="text-muted" id="progress-end-info">-</small>
        </div>
      </div>
      {/* End Quick Actions Widget */}

      {/* Overview Dashboard Section */}
      <div className="row g-3">
        {/* Left Column: Agenda */}
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header border-0 bg-light d-flex align-items-center gap-2">
              <i className="bi bi-calendar3 text-primary" />
              <h6 className="mb-0">Agenda del Día</h6>
            </div>
            <div className="card-body p-0 d-flex flex-column">
              <div className="agenda-container flex-grow-1">
                <div className="ratio ratio-16x9">
                  {/* sin src="" en JSX: dispara warning de React; el legacy setupCalendarPreview() setea .src por DOM */}
                  <iframe id="calendar-preview-iframe" title="Agenda del Día" style={{ border: 0 }} loading="lazy" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Alerts */}
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header border-0 bg-light d-flex align-items-center gap-2">
              <i className="bi bi-lightning text-warning" />
              <h6 className="mb-0">Avisos</h6>
            </div>
            <div className="card-body p-0 d-flex flex-column">
              {/* Próxima Píldora */}
              <div className="aviso-item border-bottom">
                <div className="d-flex align-items-center gap-2">
                  <div className="aviso-icon">
                    <i className="bi bi-lightbulb" />
                  </div>
                  <div className="aviso-content">
                    <h6 className="mb-1 text-warning">Próxima Píldora</h6>
                    <div id="next-pildora-content" className="aviso-text">
                      <p className="text-muted small mb-0">
                        <i className="bi bi-hourglass-split me-1" />Cargando...
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recuento de Asistencias */}
              <div className="aviso-item">
                <div className="d-flex align-items-center gap-2">
                  <div className="aviso-icon">
                    <i className="bi bi-check-circle" />
                  </div>
                  <div className="aviso-content">
                    <h6 className="mb-1 text-info">Asistencia</h6>
                    <div id="attendance-alert-content" className="aviso-text">
                      <p className="text-muted small mb-0">
                        <i className="bi bi-hourglass-split me-1" />Cargando...
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloc de Notas Docente — #notes-container es el target del portal de NotesPanel */}
              <div className="aviso-item border-top pt-3 mt-3">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="aviso-icon">
                    <i className="bi bi-sticky" />
                  </div>
                  <div className="aviso-content">
                    <h6 className="mb-0">Anotaciones</h6>
                  </div>
                </div>
                <div id="notes-container" className="notes-section">
                  {/* Bloc de notas se renderiza aquí (NotesPanel portal) */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
