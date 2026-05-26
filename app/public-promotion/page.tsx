'use client';

import { useEffect } from 'react';

// ── Script loader utility ──────────────────────────────────────────────────
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(s);
  });
}

export default function PublicPromotionPage() {
  useEffect(() => {
    // Inject APP_CONFIG so vanilla scripts can find the API URL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).APP_CONFIG = {
      API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).API_URL = (window as any).APP_CONFIG.API_URL;

    (async () => {
      try {
        await loadScript('/js/config.js');
        await loadScript('/js/public-promotion.js');
      } catch (e) {
        console.error('Script load error:', e);
      }
    })();
  }, []);

  return (
    <>
      {/* ── Password Access Modal ── */}
      <div className="modal fade" id="passwordModal" tabIndex={-1} data-bs-backdrop="static" data-bs-keyboard="false">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header border-0">
              <h5 className="modal-title">Acceso a la formación</h5>
            </div>
            <div className="modal-body">
              <p className="text-muted mb-4">Esta formación requiere contraseña. Introduce la contraseña que te han facilitado.</p>
              <div id="password-alert" className="alert alert-danger hidden" role="alert"></div>
              <div className="mb-3">
                <label htmlFor="access-password" className="form-label">Contraseña</label>
                <div className="input-group">
                  <input type="password" className="form-control" id="access-password" placeholder="Introduce la contraseña" />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onClick={() => (window as any).togglePasswordVisibility?.()}
                  >
                    <i className="bi bi-eye" id="togglePasswordIcon"></i>
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer border-0">
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: 'var(--principal-1)', borderColor: 'var(--principal-1)' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={() => (window as any).verifyPromotionPassword?.()}
              >
                <span className="btn-text">Verificar</span>
                <span className="spinner-border spinner-border-sm ms-2 hidden" role="status" aria-hidden="true"></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="container-fluid">
        <div className="row">
          <main className="col-12 py-4">

            {/* ── Banner ── */}
            <div className="pp-banner mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img id="pp-banner-img" src="/img/f5_banner_roadmpa_manager.PNG" alt="Banner formación" className="pp-banner-img"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="pp-banner-body d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="pp-banner-title" id="promotion-title">Cargando…</h2>
                  <p className="pp-banner-sub" id="pp-banner-sub"></p>
                </div>
                <a href="https://factoriaf5.org/" target="_blank" rel="noreferrer" className="ms-3 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/img/logo-factoria-b.svg" alt="Logotipo FactoriaF5"
                    style={{ maxHeight: 48, filter: 'brightness(0) invert(1)', opacity: 0.85 }} />
                </a>
              </div>
            </div>

            {/* ── Progress card ── */}
            <div className="pp-progress-card mb-4">
              <div className="pp-progress-label">
                <i className="bi bi-bar-chart-fill me-2"></i>Progreso del bootcamp
              </div>
              <div className="progress mb-3" style={{ height: 14, borderRadius: 8 }}>
                <div id="pp-progress-bar" className="progress-bar" role="progressbar"
                  style={{ width: '0%', background: 'linear-gradient(90deg,var(--principal-1),#ff8c42)', borderRadius: 8 }}
                  aria-valuenow={0} aria-valuemin={0} aria-valuemax={100}>0%</div>
              </div>
              <div className="d-flex gap-3 flex-wrap">
                <div className="pp-stat-box"><div className="pp-stat-val" id="pp-stat-total">—</div><div className="pp-stat-lbl">Estudiantes activos</div></div>
                <div className="pp-stat-box"><div className="pp-stat-val" id="pp-stat-weeks-done" style={{ color: '#198754' }}>—</div><div className="pp-stat-lbl">Semanas transcurridas</div></div>
                <div className="pp-stat-box"><div className="pp-stat-val" id="pp-stat-weeks-left">—</div><div className="pp-stat-lbl">Semanas restantes</div></div>
                <div className="pp-stat-box"><div className="pp-stat-val" id="pp-stat-weeks-total">—</div><div className="pp-stat-lbl">Semanas totales</div></div>
              </div>
            </div>

            {/* ── Quick links ── */}
            <div className="pp-section-card mb-4" id="quick-links">
              <div className="pp-section-header">
                <i className="bi bi-lightning-charge pp-section-header-icon"></i>
                <h5>Acciones Rápidas</h5>
              </div>
              <div className="pp-section-body">
                <div id="quick-links-list" className="d-flex flex-wrap gap-3"></div>
              </div>
            </div>

            {/* ── Aula Virtual CTA ── */}
            <div className="mb-4 d-none" id="pp-cta-aula-virtual">
              <a href="#" id="pp-cta-link" className="pp-cta-btn"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(e) => { e.preventDefault(); (window as any).openAulaVirtualPage?.(e); }}>
                <i className="bi bi-laptop"></i>Ir al Aula Virtual
              </a>
            </div>

            {/* ── Próxima Píldora + Calendario ── */}
            <div className="pp-pildora-calendar-row mb-4">
              <div className="d-flex min-w-0">
                <div className="pp-notice-card flex-fill w-100" id="pp-next-pildora-notice">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <i className="bi bi-lightbulb-fill text-warning fs-4"></i>
                    <span className="fw-bold" style={{ color: 'var(--principal-1)' }}>Próxima Píldora</span>
                  </div>
                  <div id="pp-next-pildora-body" className="text-muted small">
                    <em>Sin píldoras próximas.</em>
                  </div>
                </div>
              </div>
              <div className="min-w-0" id="calendar">
                <div className="pp-section-card mb-0 hidden" id="calendar-card">
                  <div className="pp-section-header">
                    <i className="bi bi-calendar pp-section-header-icon"></i>
                    <h5>Calendario</h5>
                  </div>
                  <div className="pp-section-body p-0">
                    <div id="gc-appointment-btn" className="p-2" style={{ display: 'flex', justifyContent: 'flex-end' }}></div>
                    <iframe id="calendar-iframe" style={{ width: '100%', height: 320, border: 'none' }} allowFullScreen></iframe>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Tabs nav ── */}
            <ul className="nav pp-tabs mb-4" id="pp-main-tabs">
              <li className="nav-item">
                <button className="nav-link active" id="tab-progreso-btn"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={() => (window as any).switchPublicTab?.('progreso')}>
                  <i className="bi bi-play-circle me-2"></i>En progreso
                </button>
              </li>
              <li className="nav-item">
                <button className="nav-link" id="tab-info-btn"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={() => (window as any).switchPublicTab?.('info')}>
                  <i className="bi bi-info-circle me-2"></i>Información General
                </button>
              </li>
            </ul>

            {/* ── Tab: En Progreso ── */}
            <div id="tab-progreso">
              <div className="pp-section-card mb-4" id="roadmap">
                <div className="pp-section-header">
                  <i className="bi bi-map pp-section-header-icon"></i>
                  <h5>Roadmap</h5>
                </div>
                <div className="pp-section-body p-0">
                  <div className="table-responsive p-3">
                    <table id="gantt-table" className="table table-sm"></table>
                  </div>
                </div>
              </div>
              <div id="pildoras-wrapper"></div>
              <div id="recursos-wrapper"></div>
              <div id="sections-container"></div>
            </div>

            {/* ── Tab: Información General ── */}
            <div id="tab-info" className="d-none">
              <div id="horario-wrapper"></div>
              <div id="evaluacion-wrapper"></div>
              <div className="pp-section-card mb-4 d-none" id="competences-section">
                <div className="pp-section-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-award pp-section-header-icon"></i>
                    <h5 className="mb-0">Competencias</h5>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <label className="form-label mb-0 small fw-semibold text-muted">Área:</label>
                    <select className="form-select form-select-sm w-auto" id="public-competences-area-filter"
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      onChange={() => (window as any).filterPublicCompetences?.()}>
                      <option value="">Todas</option>
                    </select>
                  </div>
                </div>
                <div className="pp-section-body">
                  <div id="public-competences-list"></div>
                </div>
              </div>
              <div id="equipo-wrapper"></div>
            </div>

            {/* ── Aula Virtual page (hidden) ── */}
            <div className="d-none" id="aula-virtual-page">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                    <h5 className="card-title section-title mb-1"><i className="bi bi-laptop me-2"></i>Aula Virtual</h5>
                    <button className="btn btn-outline-secondary btn-sm"
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      onClick={() => (window as any).closeAulaVirtualPage?.()}>
                      <i className="bi bi-arrow-left me-1"></i>Volver al inicio
                    </button>
                  </div>
                  <div id="aula-virtual-empty" className="alert alert-light border text-muted mb-0">
                    <i className="bi bi-info-circle me-1"></i>No hay ningún proyecto activo en este momento.
                  </div>
                  <div id="aula-virtual-content" className="d-none">
                    <div className="mb-4">
                      <p className="mb-3 fw-semibold fs-5 d-none text-center" id="aula-virtual-project-title"></p>
                      <h6 className="small text-uppercase text-muted mb-1"><i className="bi bi-file-earmark-text me-1"></i>Briefing del proyecto</h6>
                      <p className="mb-0" id="aula-virtual-briefing"></p>
                    </div>
                    <div className="mb-4 d-none" id="aula-virtual-due-date-section">
                      <div className="alert alert-warning d-flex align-items-center gap-2 mb-0 py-2">
                        <i className="bi bi-calendar-event fs-5"></i>
                        <span><strong>Fecha de entrega:</strong> <span id="aula-virtual-due-date-display" className="ms-1"></span></span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <h6 className="small text-uppercase text-muted mb-1"><i className="bi bi-award me-1"></i>Competencias a evaluar</h6>
                      <div id="aula-virtual-competences"></div>
                    </div>
                    <div className="mb-4 d-none" id="aula-virtual-submissions-section">
                      <h6 className="small text-uppercase text-muted mb-2"><i className="bi bi-check-circle me-1"></i>Entregas realizadas</h6>
                      <div id="aula-virtual-submissions-list" className="list-group list-group-sm"></div>
                    </div>
                    <div className="border-top pt-3">
                      <h6 className="small text-uppercase text-muted mb-2"><i className="bi bi-cloud-arrow-up me-1"></i>Entrega de repositorio</h6>
                      <div className="row g-3 align-items-end">
                        <div className="col-md-5">
                          <label className="form-label small fw-semibold text-muted" id="aula-virtual-target-label">Identificación</label>
                          <select id="aula-virtual-target-select" className="form-select form-select-sm">
                            <option value="">Selecciona tu nombre…</option>
                          </select>
                        </div>
                        <div className="col-md-7">
                          <label className="form-label small fw-semibold text-muted">URL del repositorio</label>
                          <div className="input-group input-group-sm">
                            <span className="input-group-text bg-light text-muted" id="aula-virtual-repo-prefix"
                              style={{ maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              https://github.com/proyectof5/
                            </span>
                            <input type="text" className="form-control" id="aula-virtual-repo-suffix" placeholder="nombre-repo-estudiante" />
                          </div>
                          <div className="form-text small">Solo escribe el nombre de tu repositorio. El prefijo es fijo.</div>
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2 mt-3">
                        <button type="button" className="btn btn-sm btn-primary"
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          onClick={() => (window as any).submitVirtualClassroomDelivery?.()}>
                          <span className="btn-label"><i className="bi bi-send me-1"></i>Enviar entrega</span>
                          <span className="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                        </button>
                        <span id="aula-virtual-feedback" className="small text-muted"></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </main>
        </div>
      </div>

      {/* ── Appointment Modal ── */}
      <div className="modal fade" id="appointmentModal" tabIndex={-1} aria-labelledby="appointmentModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-xl">
          <div className="modal-content" style={{ height: '85vh' }}>
            <div className="modal-header py-2">
              <h6 className="modal-title" id="appointmentModalLabel">Reservar una cita</h6>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div className="modal-body p-0" style={{ flex: 1, overflow: 'hidden' }}>
              <iframe id="appointment-iframe" src="" style={{ width: '100%', height: '100%', border: 'none' }}
                allow="camera; microphone; geolocation"></iframe>
            </div>
          </div>
        </div>
      </div>

      {/* ── Info tab: additional progress bars (used by renderProgressBar) ── */}
      <div style={{ display: 'none' }}>
        <div id="pp-progress-bar-info"></div>
        <div id="pp-info-stat-total"></div>
        <div id="pp-info-stat-weeks-done"></div>
        <div id="pp-info-stat-weeks-left"></div>
        <div id="pp-info-stat-weeks-total"></div>
        <div id="pp-info-title"></div>
        <div id="pp-info-sub"></div>
      </div>
    </>
  );
}
