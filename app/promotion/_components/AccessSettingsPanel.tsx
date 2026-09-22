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
    <div id="teacher-area-accesos-content" className="access">
      {/* ── 1. Lo que ve el estudiantado ─────────────────────────────────── */}
      <section className="access-group" aria-labelledby="access-g-portal">
        <h2 className="access-group-title" id="access-g-portal">Entrada al portal</h2>
        <p className="access-group-note">
          La contraseña y el enlace con los que el estudiantado entra a su portal.
        </p>

        <article className="access-card access-card--wide">
          <div className="access-card-head">
            <span className="access-icon" aria-hidden="true"><i className="bi bi-key" /></span>
            <h3 className="access-card-title">Acceso del estudiantado</h3>
          </div>

          <div className="access-card-body">
            <div className="access-row">
              <div className="access-field">
                <label htmlFor="teacher-area-access-password-input">Contraseña</label>
                <div className="password-input-group">
                  <input type="password" className="form-control form-control-sm" id="teacher-area-access-password-input" placeholder="Sin contraseña" />
                  <button type="button" className="password-toggle" aria-label="Ver u ocultar la contraseña" onClick={() => w().togglePasswordVisibility?.('teacher-area-access-password-input')}>
                    <i className="bi bi-eye" aria-hidden="true" />
                  </button>
                </div>
                <span className="access-hint">Déjala vacía para que el portal quede abierto.</span>
              </div>

              <div className="access-field access-field--grow">
                <label htmlFor="teacher-area-student-access-link">Enlace del portal</label>
                <div className="access-inline">
                  <input type="text" className="form-control form-control-sm" id="teacher-area-student-access-link" readOnly />
                  <button type="button" className="btn btn-outline-secondary btn-sm" aria-label="Copiar el enlace del portal" title="Copiar" onClick={() => w().copyAccessLink?.('teacher-area')}>
                    <i className="bi bi-clipboard" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="access-field access-field--action">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => w().updateAccessPassword?.('teacher-area')}>
                  <i className="bi bi-check2" aria-hidden="true" />Actualizar contraseña
                </button>
              </div>
            </div>

            {/* El orquestador reescribe className entero al mostrarlo, así que
                aquí solo va la clase que lo mantiene oculto hasta entonces. */}
            <div id="teacher-area-password-alert" className="legacy-hidden" role="alert" />
          </div>
        </article>
      </section>

      {/* ── 2. Enlaces de la promoción ───────────────────────────────────── */}
      <section className="access-group" aria-labelledby="access-g-links">
        <h2 className="access-group-title" id="access-g-links">Enlaces de la promoción</h2>
        <p className="access-group-note">
          Herramientas que el estudiantado encuentra desde su portal.
        </p>

        <div className="access-cards">
          {/* Planificador / Refactor */}
          <article className="access-card">
            <div className="access-card-head">
              <span className="access-icon" aria-hidden="true"><i className="bi bi-journal-text" /></span>
              <h3 className="access-card-title">Planificador</h3>
            </div>
            <div className="access-card-body">
              <div className="access-field">
                <label htmlFor="teacher-area-teaching-content-url">Dirección del contenido</label>
                <input type="url" className="form-control form-control-sm" id="teacher-area-teaching-content-url" placeholder="https://…" />
              </div>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => w().updateTeachingContent?.('teacher-area')}>
                <i className="bi bi-check2" aria-hidden="true" />Guardar
              </button>
              <div id="teacher-area-teaching-content-alert" className="legacy-hidden" role="alert" />
            </div>
            <footer className="access-card-foot">
              <span className="access-state" id="teacher-area-no-content-message">Todavía sin enlace</span>
              <a id="teacher-area-teaching-content-preview-btn" href="#" className="btn btn-outline-secondary btn-sm legacy-hidden" target="_blank" rel="noopener noreferrer">
                <i className="bi bi-box-arrow-up-right" aria-hidden="true" />Abrir
              </a>
              <button type="button" className="btn btn-outline-danger btn-sm" id="teacher-area-remove-teaching-btn" style={{ display: 'none' }} onClick={() => w().removeTeachingContent?.('teacher-area')}>
                <i className="bi bi-trash" aria-hidden="true" />Quitar
              </button>
            </footer>
          </article>

          {/* Espacio de Asana de la promoción */}
          <article className="access-card">
            <div className="access-card-head">
              <span className="access-icon" aria-hidden="true"><i className="bi bi-kanban" /></span>
              <h3 className="access-card-title">Espacio de Asana</h3>
            </div>
            <div className="access-card-body">
              <div className="access-field">
                <label htmlFor="teacher-area-asana-workspace-url">Dirección del espacio</label>
                <input type="url" className="form-control form-control-sm" id="teacher-area-asana-workspace-url" placeholder="https://app.asana.com/0/…" />
              </div>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => w().updateAsanaWorkspace?.('teacher-area')}>
                <i className="bi bi-check2" aria-hidden="true" />Guardar
              </button>
              <div id="teacher-area-asana-workspace-alert" className="legacy-hidden" role="alert" />
            </div>
            <footer className="access-card-foot">
              <span className="access-state" id="teacher-area-no-asana-message">Todavía sin enlace</span>
              <a id="teacher-area-asana-workspace-preview-btn" href="#" className="btn btn-outline-secondary btn-sm legacy-hidden" target="_blank" rel="noopener noreferrer">
                <i className="bi bi-box-arrow-up-right" aria-hidden="true" />Abrir
              </a>
              <button type="button" className="btn btn-outline-danger btn-sm" id="teacher-area-remove-asana-btn" style={{ display: 'none' }} onClick={() => w().removeAsanaWorkspace?.('teacher-area')}>
                <i className="bi bi-trash" aria-hidden="true" />Quitar
              </button>
            </footer>
          </article>

          {/* Zoom */}
          <article className="access-card access-card--wide">
            <div className="access-card-head">
              <span className="access-icon" aria-hidden="true"><i className="bi bi-camera-video" /></span>
              <h3 className="access-card-title">Zoom</h3>
            </div>
            <div className="access-card-body">
              <div className="access-row">
                {/* Este campo faltaba: saveZoomCredentials lo lee y sin él no se
                    podía guardar la dirección de la sala ni abrirla desde aquí. */}
                <div className="access-field access-field--grow">
                  <label htmlFor="teacher-area-zoom-meeting-url">Dirección de la sala</label>
                  <input type="url" className="form-control form-control-sm" id="teacher-area-zoom-meeting-url" placeholder="https://zoom.us/j/…" />
                </div>
                <div className="access-field">
                  <label htmlFor="teacher-area-zoom-meeting-id">ID de reunión</label>
                  <input type="text" className="form-control form-control-sm" id="teacher-area-zoom-meeting-id" placeholder="123 456 7890" />
                </div>
                <div className="access-field">
                  <label htmlFor="teacher-area-zoom-passcode">Código de acceso</label>
                  <input type="text" className="form-control form-control-sm" id="teacher-area-zoom-passcode" placeholder="abc123" />
                </div>
                <div className="access-field">
                  <label htmlFor="teacher-area-zoom-host-key">Clave de anfitrión <span className="access-optional">(opcional)</span></label>
                  <input type="text" className="form-control form-control-sm" id="teacher-area-zoom-host-key" placeholder="123456" />
                </div>
                <div className="access-field">
                  <label htmlFor="teacher-area-zoom-email">Correo de la cuenta <span className="access-optional">(opcional)</span></label>
                  <input type="email" className="form-control form-control-sm" id="teacher-area-zoom-email" placeholder="docente@ejemplo.com" autoComplete="off" />
                </div>
                <div className="access-field">
                  <label htmlFor="teacher-area-zoom-password">Contraseña de la cuenta <span className="access-optional">(opcional)</span></label>
                  <div className="password-input-group">
                    <input type="password" className="form-control form-control-sm" id="teacher-area-zoom-password" placeholder="••••••••" autoComplete="current-password" />
                    <button type="button" className="password-toggle" aria-label="Ver u ocultar la contraseña de Zoom" onClick={() => w().togglePasswordVisibility?.('teacher-area-zoom-password')}>
                      <i className="bi bi-eye" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => w().saveZoomCredentials?.()}>
                <i className="bi bi-check2" aria-hidden="true" />Guardar
              </button>
            </div>
            <footer className="access-card-foot">
              <span className="access-state" id="teacher-area-no-zoom-message">Todavía sin sala</span>
              <a id="teacher-area-zoom-preview-btn" href="#" className="btn btn-outline-secondary btn-sm legacy-hidden" target="_blank" rel="noopener noreferrer">
                <i className="bi bi-box-arrow-up-right" aria-hidden="true" />Abrir
              </a>
              <button type="button" className="btn btn-outline-danger btn-sm" id="teacher-area-remove-zoom-btn" style={{ display: 'none' }} onClick={() => w().removeZoomCredentials?.()}>
                <i className="bi bi-trash" aria-hidden="true" />Quitar
              </button>
            </footer>
          </article>
        </div>
      </section>

      {/* ── 3. Mi cuenta ─────────────────────────────────────────────────── */}
      <section className="access-group" aria-labelledby="access-g-mine">
        <h2 className="access-group-title" id="access-g-mine">Mi cuenta</h2>
        <p className="access-group-note">
          Esto es tuyo, no de la promoción: cada docente lo conecta una vez.
        </p>
        <AsanaAccountCard />
      </section>
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
    <article className="access-card access-card--wide">
      <div className="access-card-head">
        <span className="access-icon" aria-hidden="true"><i className="bi bi-person-badge" /></span>
        <h3 className="access-card-title">Asana</h3>
      </div>
      <div className="access-card-body">
        <p className="access-hint access-hint--block">
          Conecta tu cuenta para poder <strong>exportar el roadmap</strong> como subtareas.
        </p>

        {status == null ? (
          <p className="access-state" role="status"><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Comprobando…</p>
        ) : !status.configured ? (
          <p className="access-state">La integración con Asana no está activada en el servidor todavía.</p>
        ) : status.connected ? (
          <div className="access-row access-row--middle">
            <span className="access-state is-on">
              <i className="bi bi-check-circle" aria-hidden="true" />Conectada
              {(status.asanaEmail || status.asanaName) ? ` · ${status.asanaEmail || status.asanaName}` : ''}
            </span>
            <button type="button" className="btn btn-outline-danger btn-sm" disabled={busy} onClick={disconnect}>
              <i className="bi bi-x-circle" aria-hidden="true" />Desconectar
            </button>
          </div>
        ) : (
          <div className="access-row access-row--middle">
            <span className="access-state">Sin conectar</span>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={connect}>
              {busy
                ? <><span className="spinner-border spinner-border-sm" aria-hidden="true" />Esperando a Asana…</>
                : <><i className="bi bi-box-arrow-up-right" aria-hidden="true" />Conectar mi cuenta</>}
            </button>
          </div>
        )}

        {error && <p className="access-error" role="alert"><i className="bi bi-exclamation-triangle" aria-hidden="true" />{error}</p>}
      </div>
    </article>
  );
}
