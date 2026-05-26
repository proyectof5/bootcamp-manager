'use client';

import { useEffect } from 'react';

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

export default function StudentDashboardPage() {
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).APP_CONFIG = {
      API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).API_URL = (window as any).APP_CONFIG.API_URL;

    (async () => {
      try {
        await loadScript('/js/config.js');
        await loadScript('/js/shared.js');
        await loadScript('/js/student-dashboard.js');
      } catch (e) {
        console.error('Script load error:', e);
      }
    })();
  }, []);

  return (
    <div className="container-fluid">
      <div className="row">

        {/* ── Sidebar ── */}
        <nav className="col-md-3 col-lg-2 d-md-block sidebar collapse">
          <div className="sidebar-content d-flex flex-column h-100">
            <h1 id="nav-title" className="nav-title h3 mb-4 px-3">Bootcamp</h1>
            <ul className="nav flex-column">
              <li className="nav-item"><a className="nav-link" href="#resumen"><i className="bi bi-eye me-2"></i>Resumen</a></li>
              <li className="nav-item"><a className="nav-link" href="#roadmap"><i className="bi bi-map me-2"></i>Roadmap</a></li>
              <li className="nav-item"><a className="nav-link" href="#details"><i className="bi bi-check-circle me-1"></i>Al detalle</a></li>
              <li className="nav-item"><a className="nav-link" href="#calendar"><i className="bi bi-calendar me-2"></i>Calendario</a></li>
              <li className="nav-item"><a className="nav-link" href="#horario"><i className="bi bi-clock me-1"></i>Horario</a></li>
              <li className="nav-item"><a className="nav-link" href="#equipo"><i className="bi bi-people me-1"></i>Equipo</a></li>
              <li className="nav-item"><a className="nav-link" href="#evaluacion"><i className="bi bi-clipboard-check me-1"></i>Evaluación</a></li>
              <li className="nav-item"><a className="nav-link" href="#resources"><i className="bi bi-tools me-1"></i>Recursos</a></li>
              <li className="nav-item"><a className="nav-link" href="#link"><i className="bi bi-lightning-charge me-1"></i>Quick Links</a></li>
              <li className="nav-item mt-auto">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <a className="nav-link text-danger" href="#" onClick={(e) => { e.preventDefault(); (window as any).logout?.(); }}>
                  <i className="bi bi-box-arrow-right me-2"></i>Logout
                </a>
              </li>
            </ul>
            <figure className="logo-container text-center p-3 mt-auto mb-0">
              <a href="https://factoriaf5.org/" target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/img/logo-factoria-b.svg" alt="Logotipo FactoriaF5" className="img-fluid" style={{ maxWidth: 100 }} />
              </a>
            </figure>
          </div>
        </nav>

        {/* ── Main Content ── */}
        <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4">
          <div className="container section-container mt-4">
            <div className="row g-4">
              <h2 className="section-title">¡Hola <span id="student-name">Coder</span>! 👋</h2>

              {/* General / Resumen */}
              <div className="col-md-12" id="resumen">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title section-title"><i className="bi bi-eye"></i> Resumen</h5>
                    <div style={{ textAlign: 'center' }}>
                      <p id="promotion-description" className="lead text-start p-3"></p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/img/info.png" alt="Infografía IA" className="img-fluid"
                        style={{ padding: '0 50px', maxHeight: 400, objectFit: 'contain' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Roadmap / Gantt */}
              <div className="col-md-12" id="roadmap">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title section-title"><i className="bi bi-map me-2"></i> Roadmap</h5>
                    <br />
                    <p>🎯 El Bootcamp se basa en una pedagogía activa, centrada en el aprendizaje práctico mediante proyectos (learning by doing) y la enseñanza a través de la preparación e impartición de &apos;píldoras formativas&apos; (learning by teaching).</p>
                    <br />
                    <div className="gantt-container mt-3">
                      <div id="gantt-loading" className="text-center p-3">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                      <table id="gantt-table"></table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Al detalle */}
              <div className="col-md-12" id="details">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title section-title"><i className="bi bi-tools"></i> Competencias al detalle</h5>
                    <br />
                    <div className="accordion" id="accordion"></div>
                  </div>
                </div>
              </div>

              {/* Calendar */}
              <div className="col-12" id="calendar">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title section-title"><i className="bi bi-calendar me-2"></i> Calendario</h5>
                    <br />
                    <div id="gc-appointment-btn" className="mb-3"></div>
                    <div className="ratio ratio-16x9">
                      <iframe id="calendar-iframe" src="" style={{ border: 0 }} width="800" height="600"
                        frameBorder={0}></iframe>
                      <div id="no-calendar-msg" className="text-center p-5 hidden bg-light rounded">
                        <i className="bi bi-calendar-x" style={{ fontSize: '2rem' }}></i>
                        <p>No calendar configured for this promotion.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Horario */}
              <div className="col-12" id="horario">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title section-title"><i className="bi bi-clock"></i> Horario</h5>
                    <br />
                    <p>En el Google Calendar encontrarán la información de los eventos y la información de días online y presenciales.</p>
                    <ul>
                      <li>Empezamos: Presencial (9:00) | Online (8:15). Daily, rompehielos, kata, etc.</li>
                      <li>Presencial 9:30 | Online: 08:30 Píldoras, masterclases, etc.</li>
                      <li>11:00 Descanso de 15 minutos</li>
                      <li>11:15 Proyectos</li>
                      <li>13:30 Media hora de almuerzo</li>
                      <li>14:00 Cursos y certificaciones</li>
                      <li>Fin: Presencial (16:30) | Online (15:45)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Equipo */}
              <div className="col-md-12" id="equipo">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title section-title"><i className="bi bi-people"></i> Equipo</h5>
                    <ul id="team-list">
                      <li><strong className="text-primary">Teachers &amp; Staff</strong></li>
                      <li>Check your specific promotion details for staff assignments.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Evaluación */}
              <div className="col-md-12" id="evaluacion">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title section-title"><i className="bi bi-clipboard-check"></i> Evaluación</h5>
                    <br />
                    <div>
                      <p><strong>Evaluación de los proyectos</strong>. Se brindará retroalimentación oral el mismo día de la presentación del proyecto...</p>
                      <ul>
                        <li>Análisis de los commits realizados por les coders.</li>
                        <li>Participación individual en la presentación.</li>
                        <li>Capacidad de responder preguntas específicas.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recursos */}
              <div className="col-md-12" id="resources">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title section-title"><i className="bi bi-tools"></i> Recursos de interés</h5>
                    <p>Check &quot;Quick Links&quot; below for your specific promotion resources.</p>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="col-md-12" id="link">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title section-title"><i className="bi bi-lightning-charge"></i> Quick Links</h5>
                    <div className="row" id="quick-links-container">
                      <div className="col-12 text-center text-muted">Cargando enlaces...</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </main>
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
    </div>
  );
}
