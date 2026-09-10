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

        {/* Asana — conexión OAuth de mi cuenta (para exportar el roadmap a Asana) */}
        <div className="col-lg-6">
          <AsanaAccountCard />
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

// ── Asana: conexión OAuth de la cuenta del docente ──────────────────────────
// Fase 1 de docs/tasks/exportar-roadmap-asana.md. Cada docente conecta su
// cuenta de Asana una vez (OAuth); esa conexión luego permitirá exportar el
// roadmap como subtareas. Popup + poll de estado + postMessage del callback.
interface AsanaStatus {
  configured: boolean;
  connected: boolean;
  asanaName?: string | null;
  asanaEmail?: string | null;
}

function AsanaAccountCard() {
  const [status, setStatus] = useState<AsanaStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const s = (await w().asanaGetStatus?.()) as AsanaStatus | undefined;
      setStatus(s || { configured: false, connected: false });
    } catch {
      setStatus({ configured: false, connected: false });
    }
  };

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const connect = async () => {
    setError(null);
    setBusy(true);
    try {
      const url = await w().asanaGetAuthorizeUrl?.();
      if (!url) throw new Error('sin_url');
      window.open(url, 'asana-oauth', 'width=620,height=780,noopener=no');

      // Espera a que el callback avise (postMessage) o a que el estado cambie.
      const started = Date.now();
      const onMsg = (e: MessageEvent) => {
        if (e?.data?.source === 'asana-oauth') { cleanup(); refresh().finally(() => setBusy(false)); }
      };
      const poll = setInterval(async () => {
        const s = (await w().asanaGetStatus?.()) as AsanaStatus | undefined;
        if (s?.connected || Date.now() - started > 120000) {
          cleanup();
          setStatus(s || null);
          setBusy(false);
        }
      }, 2500);
      const cleanup = () => { clearInterval(poll); window.removeEventListener('message', onMsg); };
      window.addEventListener('message', onMsg);
    } catch (e) {
      setBusy(false);
      setError((e as Error)?.message === 'asana_not_configured'
        ? 'La integración con Asana no está configurada en el servidor.'
        : 'No se pudo iniciar la conexión con Asana.');
    }
  };

  const disconnect = async () => {
    setBusy(true);
    setError(null);
    try {
      await w().asanaDisconnect?.();
    } catch {
      setError('No se pudo desconectar.');
    }
    await refresh();
    setBusy(false);
  };

  return (
    <div className="card h-100 border-0 shadow-sm">
      <div className="card-header" style={{ background: 'linear-gradient(135deg, #F06595 0%, #CC5DE8 100%)' }}>
        <h6 className="mb-0 text-white"><i className="bi bi-person-badge me-2" />Asana — mi cuenta</h6>
      </div>
      <div className="card-body">
        <p className="small text-muted mb-3">
          Conecta tu cuenta de Asana para poder <strong>exportar el roadmap</strong> como
          subtareas. Cada docente conecta la suya; solo hace falta una vez.
        </p>

        {status == null ? (
          <div className="text-muted small"><span className="spinner-border spinner-border-sm me-2" role="status" />Comprobando…</div>
        ) : !status.configured ? (
          <div className="alert alert-secondary small mb-0 p-2">
            La integración con Asana no está activada en el servidor todavía.
          </div>
        ) : status.connected ? (
          <>
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="badge rounded-pill text-bg-success"><i className="bi bi-check-lg me-1" />Conectado</span>
              <span className="small text-truncate">{status.asanaEmail || status.asanaName}</span>
            </div>
            <button type="button" className="btn btn-sm btn-outline-danger w-100" disabled={busy} onClick={disconnect}>
              <i className="bi bi-x-circle me-1" />Desconectar mi cuenta de Asana
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-sm w-100"
            style={{ backgroundColor: '#F06595', color: 'white', border: 'none', fontWeight: 600 }}
            disabled={busy}
            onClick={connect}
          >
            {busy
              ? <><span className="spinner-border spinner-border-sm me-1" role="status" />Esperando a Asana…</>
              : <><i className="bi bi-box-arrow-up-right me-1" />Conectar mi cuenta de Asana</>}
          </button>
        )}

        {error && <div className="alert alert-warning small mt-2 mb-0 p-2">{error}</div>}
      </div>
    </div>
  );
}
