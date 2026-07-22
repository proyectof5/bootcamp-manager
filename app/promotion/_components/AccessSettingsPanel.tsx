'use client';

/**
 * AccessSettingsPanel.tsx — sub-tab "Accesos" de la Teacher-Area (spec 0014 Fase C).
 *
 * 16º bloque. Reemplaza el contenido del pane #teacher-area-accesos (#teacher-area-accesos-content:
 * tarjetas Contraseña/link público + Planificador + Asana + Zoom) por un componente React montado por
 * portal.
 *
 * Patrón "markup en React, lógica legacy por id": React renderiza el MARKUP conservando TODOS los ids
 * legacy (teacher-area-*); el orquestador puebla/lee por id: loadAccessSettingsInTeacherArea() (null-safe,
 * gated por isTeacherOrAdmin, lo llama switchTeacherAreaSubTab('accesos')) rellena los inputs y togglea
 * los alerts/preview/status. Los controles llaman a window.* (togglePasswordVisibility, updateAccessPassword,
 * copyAccessLink, updateTeachingContent/removeTeachingContent, updateAsanaWorkspace/removeAsanaWorkspace,
 * saveZoomCredentials/removeZoomCredentials). React dispara loadAccessSettingsInTeacherArea() tras montar
 * (poll) como red de seguridad. CERO cambios en el orquestador. (Endpoints owner-only → 403 en promos no
 * propias; el panel se renderiza igual, los inputs quedan vacíos.)
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

export function AccessSettingsPanelHost() {
  const host = usePortalNode('teacher-area-accesos');
  if (!host) return null;
  return createPortal(<AccessSettingsPanel />, host);
}

function AccessSettingsPanel() {
  useEffect(() => {
    let tries = 0;
    const iv = setInterval(() => {
      tries += 1;
      if (typeof w().loadAccessSettingsInTeacherArea === 'function') { w().loadAccessSettingsInTeacherArea(); clearInterval(iv); }
      else if (tries > 40) clearInterval(iv);
    }, 100);
    return () => clearInterval(iv);
  }, []);

  return (
    <div id="teacher-area-accesos-content">
      <div className="d-flex justify-content-between align-items-center my-4">
        <h2 className="subtitle-page">Configuración de los Accesos</h2>
      </div>

      <div className="row g-4">
        {/* Student Access Password Card */}
        <div className="col-lg-6">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-header bg-gradient" style={{ background: 'linear-gradient(135deg, var(--principal-1) 0%, var(--complementario-2) 100%)' }}>
              <h6 className="mb-0 text-dark"><i className="bi bi-key me-2" />Acceso del estudiante</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label htmlFor="teacher-area-access-password-input" className="form-label small fw-bold">Contraseña</label>
                <div className="password-input-group">
                  <input type="password" className="form-control form-control-sm" id="teacher-area-access-password-input" placeholder="Enter password" />
                  <button type="button" className="password-toggle" onClick={() => w().togglePasswordVisibility?.('teacher-area-access-password-input')}>
                    <i className="bi bi-eye" />
                  </button>
                </div>
              </div>
              <button type="button" className="btn btn-sm w-100" style={{ backgroundColor: 'var(--green-f5)', color: 'var(--principal-2)', border: 'none', fontWeight: 600 }} onClick={() => w().updateAccessPassword?.('teacher-area')}>
                <i className="bi bi-save me-1" />Actualizar
              </button>
              <div id="teacher-area-password-alert" className="alert alert-sm mt-2 mb-0 hidden p-2" role="alert" style={{ fontSize: '0.85rem' }} />
            </div>
            <div className="card-footer bg-light border-top p-2">
              <small className="text-muted d-block mb-2">Link generado:</small>
              <div className="input-group input-group-sm">
                <input type="text" className="form-control form-control-sm" id="teacher-area-student-access-link" readOnly />
                <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => w().copyAccessLink?.('teacher-area')}>
                  <i className="bi bi-clipboard" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Teaching Content Card */}
        <div className="col-lg-6">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-header bg-gradient" style={{ background: 'linear-gradient(135deg, var(--blue-light-f5) 0%, var(--green-f5) 100%)' }}>
              <h6 className="mb-0 text-dark"><i className="bi bi-book me-2" />Planificador / Refactor</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label htmlFor="teacher-area-teaching-content-url" className="form-label small fw-bold">URL del contenido</label>
                <input type="url" className="form-control form-control-sm" id="teacher-area-teaching-content-url" placeholder="https://example.com" />
              </div>
              <button type="button" className="btn btn-sm w-100" style={{ backgroundColor: 'var(--green-f5)', color: 'var(--principal-2)', border: 'none', fontWeight: 600 }} onClick={() => w().updateTeachingContent?.('teacher-area')}>
                <i className="bi bi-save me-1" />Guardar
              </button>
              <div id="teacher-area-teaching-content-alert" className="alert alert-sm mt-2 mb-0 hidden p-2" role="alert" style={{ fontSize: '0.85rem' }} />
            </div>
            <div className="card-footer bg-light border-top p-2">
              <small className="text-muted d-block mb-2">Preview:</small>
              <div className="d-flex gap-1">
                <a id="teacher-area-teaching-content-preview-btn" href="#" className="btn btn-sm btn-outline-primary hidden" target="_blank" rel="noopener noreferrer">
                  <i className="bi bi-book me-1" />Vista
                </a>
                <button type="button" className="btn btn-sm btn-outline-danger" id="teacher-area-remove-teaching-btn" style={{ display: 'none' }} onClick={() => w().removeTeachingContent?.('teacher-area')}>
                  <i className="bi bi-trash" />
                </button>
                <small className="text-muted align-self-center ms-1" id="teacher-area-no-content-message">No hay contenido</small>
              </div>
            </div>
          </div>
        </div>

        {/* Asana Workspace Card */}
        <div className="col-lg-6">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-header bg-gradient" style={{ background: 'linear-gradient(135deg, #FF6B6B 0%, #F06595 100%)' }}>
              <h6 className="mb-0 text-dark"><i className="bi bi-kanban me-2" />Asana</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label htmlFor="teacher-area-asana-workspace-url" className="form-label small fw-bold">URL del espacio de trabajo</label>
                <input type="url" className="form-control form-control-sm" id="teacher-area-asana-workspace-url" placeholder="https://app.asana.com/0/..." />
              </div>
              <button type="button" className="btn btn-sm w-100" style={{ backgroundColor: '#FF6B6B', color: 'white', border: 'none', fontWeight: 600 }} onClick={() => w().updateAsanaWorkspace?.('teacher-area')}>
                <i className="bi bi-save me-1" />Guardar
              </button>
              <div id="teacher-area-asana-workspace-alert" className="alert alert-sm mt-2 mb-0 hidden p-2" role="alert" style={{ fontSize: '0.85rem' }} />
            </div>
            <div className="card-footer bg-light border-top p-2">
              <small className="text-muted d-block mb-2">Estado:</small>
              <div className="d-flex gap-1">
                <a id="teacher-area-asana-workspace-preview-btn" href="#" className="btn btn-sm btn-outline-danger hidden" target="_blank" rel="noopener noreferrer">
                  <i className="bi bi-kanban me-1" />Abrir
                </a>
                <button type="button" className="btn btn-sm btn-outline-danger" id="teacher-area-remove-asana-btn" style={{ display: 'none' }} onClick={() => w().removeAsanaWorkspace?.('teacher-area')}>
                  <i className="bi bi-trash" />
                </button>
                <small className="text-muted align-self-center ms-1" id="teacher-area-no-asana-message">No configurado</small>
              </div>
            </div>
          </div>
        </div>

        {/* Zoom Credentials Card */}
        <div className="col-lg-6">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-header" style={{ background: 'linear-gradient(135deg, #2D8CFF 0%, #4FA9FF 100%)' }}>
              <h6 className="mb-0 text-white"><i className="bi bi-camera-video me-2" />Zoom</h6>
            </div>
            <div className="card-body">
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label htmlFor="teacher-area-zoom-meeting-id" className="form-label small fw-bold">ID de reunión</label>
                  <input type="text" className="form-control form-control-sm" id="teacher-area-zoom-meeting-id" placeholder="123 456 7890" />
                </div>
                <div className="col-6">
                  <label htmlFor="teacher-area-zoom-passcode" className="form-label small fw-bold">Código de acceso</label>
                  <input type="text" className="form-control form-control-sm" id="teacher-area-zoom-passcode" placeholder="abc123" />
                </div>
                <div className="col-12">
                  <label htmlFor="teacher-area-zoom-host-key" className="form-label small fw-bold">Host Key <span className="text-muted fw-normal">(opcional)</span></label>
                  <input type="text" className="form-control form-control-sm" id="teacher-area-zoom-host-key" placeholder="123456" />
                </div>
                <div className="col-6">
                  <label htmlFor="teacher-area-zoom-email" className="form-label small fw-bold">Email de la cuenta <span className="text-muted fw-normal">(opcional)</span></label>
                  <input type="email" className="form-control form-control-sm" id="teacher-area-zoom-email" placeholder="docente@ejemplo.com" autoComplete="off" />
                </div>
                <div className="col-6">
                  <label htmlFor="teacher-area-zoom-password" className="form-label small fw-bold">Contraseña de la cuenta <span className="text-muted fw-normal">(opcional)</span></label>
                  <div className="password-input-group">
                    <input type="password" className="form-control form-control-sm" id="teacher-area-zoom-password" placeholder="••••••••" autoComplete="current-password" />
                    <button type="button" className="password-toggle" onClick={() => w().togglePasswordVisibility?.('teacher-area-zoom-password')}>
                      <i className="bi bi-eye" />
                    </button>
                  </div>
                </div>
              </div>
              <button type="button" className="btn btn-sm w-100" style={{ backgroundColor: '#2D8CFF', color: 'white', border: 'none', fontWeight: 600 }} onClick={() => w().saveZoomCredentials?.()}>
                <i className="bi bi-save me-1" />Guardar credenciales
              </button>
            </div>
            <div className="card-footer bg-light border-top p-2">
              <small className="text-muted d-block mb-2">Estado:</small>
              <div className="d-flex gap-1 align-items-center">
                <button type="button" className="btn btn-sm btn-outline-danger" id="teacher-area-remove-zoom-btn" style={{ display: 'none' }} onClick={() => w().removeZoomCredentials?.()}>
                  <i className="bi bi-trash" />
                </button>
                <small className="text-muted ms-1" id="teacher-area-no-zoom-message">No configurado</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
