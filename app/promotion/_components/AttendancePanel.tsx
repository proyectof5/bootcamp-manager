'use client';

/**
 * AttendancePanel.tsx — sub-tab "Asistencia" de la Teacher-Area (spec 0014 Fase C).
 *
 * 15º bloque. Reemplaza el contenido del pane #teacher-area-attendance (#attendance-tab: cabecera con
 * navegación de mes + stats + leyenda + tabla #attendance-table) por un componente React montado por
 * portal.
 *
 * Patrón "markup en React, lógica legacy por id": React renderiza el MARKUP conservando los ids legacy;
 * el orquestador puebla: loadAttendance() + renderAttendanceTable() rellenan #current-attendance-month-display,
 * los #stat-* y la tabla (#attendance-weekday-row/#attendance-header-row/#attendance-body), disparado por
 * switchTeacherAreaSubTab('attendance') al abrir. Los controles llaman a window.* (exportAttendanceToExcel,
 * prevAttendanceMonth, nextAttendanceMonth) y a window.__printWeeklyAttendance (wrapper expuesto en el
 * orquestador porque la versión inline usaba los globales de módulo promotionId/currentAttendanceMonth).
 *
 * loadAttendance/renderAttendanceTable NO eran null-safe → se añadieron guards en el orquestador. React
 * dispara loadAttendance() tras montar (poll) como red de seguridad.
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

export function AttendancePanelHost() {
  const host = usePortalNode('teacher-area-attendance');
  if (!host) return null;
  return createPortal(<AttendancePanel />, host);
}

function StatCard({ id, label, bg, color, icon }: { id: string; label: string; bg: string; color: string; icon?: string }) {
  return (
    <div className="col-auto d-flex">
      <div className="card" style={{ backgroundColor: bg, color, border: 'none' }}>
        <div className="card-body text-center py-2">
          <h6 className="mb-0">{icon ? <i className={`bi ${icon} me-1`} /> : null}{label}</h6>
          <h3 className="mb-0" id={id}>0</h3>
        </div>
      </div>
    </div>
  );
}

function AttendancePanel() {
  useEffect(() => {
    let tries = 0;
    const iv = setInterval(() => {
      tries += 1;
      if (typeof w().loadAttendance === 'function') { w().loadAttendance(); clearInterval(iv); }
      else if (tries > 40) clearInterval(iv);
    }, 100);
    return () => clearInterval(iv);
  }, []);

  return (
    <div id="attendance-tab">
      <div className="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
        <h2 className="mb-0 subtitle-page"> Control de Asistencia</h2>
        <div className="d-flex align-items-center gap-3 flex-wrap w-100 justify-content-end">
          <button type="button" className="btn" onClick={() => w().exportAttendanceToExcel?.()} style={{ backgroundColor: 'var(--green-f5)', color: 'var(--principal-2)', border: 'none', fontWeight: 500 }}>
            <i className="bi bi-file-earmark-spreadsheet me-2" />Exportar en Excel
          </button>
          <button type="button" className="btn" onClick={() => w().__printWeeklyAttendance?.()} style={{ backgroundColor: 'var(--principal-1)', color: '#fff', border: 'none', fontWeight: 500 }}>
            Informe de asistencia semanal
          </button>
          <div className="d-flex align-items-center gap-2" id="month-selector">
            <button type="button" className="btn" onClick={() => w().prevAttendanceMonth?.()} style={{ color: 'var(--principal-1)', border: '1px solid var(--principal-1)' }}>
              <i className="bi bi-chevron-left" />
            </button>
            <h4 className="mb-0" id="current-attendance-month-display" style={{ color: 'var(--principal-1)', fontWeight: 600, minWidth: 140, textAlign: 'center' }}>Month Year</h4>
            <button type="button" className="btn" onClick={() => w().nextAttendanceMonth?.()} style={{ color: 'var(--principal-1)', border: '1px solid var(--principal-1)' }}>
              <i className="bi bi-chevron-right" />
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Stats Row */}
      <div className="row mb-4 g-2" id="attendance-stats-container">
        <StatCard id="stat-present-total" label="Presente" bg="var(--green-f5)" color="var(--principal-2)" />
        <StatCard id="stat-absent-total" label="Ausente" bg="var(--principal-1)" color="var(--principal-3)" />
        <StatCard id="stat-late-total" label="Retraso" bg="var(--complementario-2)" color="var(--principal-2)" />
        <StatCard id="stat-justified-total" label="Justificado" bg="var(--blue-light-f5)" color="var(--principal-2)" />
        <StatCard id="stat-early-leave-total" label="Sale antes" bg="#e9d8fd" color="#5b21b6" />
        <StatCard id="stat-camera-off-total" label="Cámara apagada" bg="#e2e8f0" color="#475569" icon="bi-camera-video-off" />
        <StatCard id="stat-attendance-avg" label="Media Asistencia" bg="var(--complementario-1-extra-light)" color="var(--principal-2)" />
      </div>

      <div className="ins-attendance">
        <div className="d-flex flex-wrap gap-4 small" style={{ color: 'var(--principal-2)' }}>
          <div className="d-flex align-items-center"><span className="attendance-dot me-2" style={{ backgroundColor: 'var(--green-f5)' }} /> Presente</div>
          <div className="d-flex align-items-center"><span className="attendance-dot me-2" style={{ backgroundColor: 'var(--principal-1)' }} /> Ausente</div>
          <div className="d-flex align-items-center"><span className="attendance-dot me-2" style={{ backgroundColor: 'var(--complementario-2)' }} /> Con retraso</div>
          <div className="d-flex align-items-center"><span className="attendance-dot me-2" style={{ backgroundColor: 'var(--blue-light-f5)' }} /> Justificado</div>
          <div className="d-flex align-items-center"><span className="attendance-dot me-2" style={{ backgroundColor: '#e9d8fd' }} /> Sale antes</div>
          <div className="d-flex align-items-center"><i className="bi bi-camera-video-off me-2 text-secondary" /> Cámara apagada</div>
          <div className="ms-auto"><i className="bi bi-info-circle me-1" /><strong>Click</strong> para marcar | <strong>Clic derecho</strong> para comentario</div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body p-0">
          <div className="table-responsive attendance-table-wrapper">
            <table className="table table-bordered mb-0" id="attendance-table">
              <thead style={{ backgroundColor: 'var(--complementario-1-extra-light)' }}>
                <tr id="attendance-weekday-row">
                  <th className="sticky-column" style={{ minWidth: 250, zIndex: 10, backgroundColor: 'var(--complementario-1-extra-light)' }} />
                </tr>
                <tr id="attendance-header-row">
                  <th className="sticky-column" style={{ minWidth: 250, zIndex: 10, backgroundColor: 'var(--complementario-1-extra-light)', color: 'var(--principal-1)', fontWeight: 600 }}>Estudiante</th>
                </tr>
              </thead>
              <tbody id="attendance-body">
                {/* Lo puebla el legacy (renderAttendanceTable) por innerHTML. */}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
