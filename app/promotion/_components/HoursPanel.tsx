'use client';

/**
 * HoursPanel.tsx — sub-tab "Cómputo de horas" de Contenido del Programa
 * (spec docs/tasks/horas-lectivas.md).
 *
 * Panel puramente DERIVADO — no edita ni guarda nada. Toma la promoción ya
 * cargada por el orquestador (window.currentPromotion) y su ExtendedInfo
 * (window.__promotionExtendedInfo, solo se usa .totalHours como objetivo de la
 * titulación) y llama a window.buildHoursBreakdown() de gantt-adapter.js, que
 * computa las horas lectivas del roadmap: días lectivos entre las fechas de
 * cada módulo (mismo criterio workingDays/holidays que el Gantt) ×
 * promotion.hoursPerDay.
 *
 * La jornada (hoursPerDay) NO se edita aquí: se edita en el modal de la
 * promoción (input #edit-promotion-hours-per-day). Este panel solo la muestra.
 *
 * Refresco: el orquestador llama a window.__refreshHoursPanel() tras
 * loadPromotion()/loadModules()/loadExtendedInfo() y al abrir la pestaña
 * (switchProgramDetailsTab). El panel también reintenta solo un par de veces
 * por si buildHoursBreakdown aún no estaba cargado al montar.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function w(): any {
  return (typeof window !== 'undefined' ? window : {}) as unknown as any;
}

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
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [id]);
  return node;
}

export function HoursPanelHost() {
  const host = usePortalNode('program-details-hours');
  if (!host) return null;
  return createPortal(<HoursPanel />, host);
}

interface ModuleRow {
  moduleIndex: number;
  name: string;
  hours: number;
  lectiveDays: number;
  startDate: string;
  endDate: string;
}
interface ProjectRow extends ModuleRow {
  moduleName: string;
}
interface Breakdown {
  hoursPerDay: number;
  total: number;
  byModule: ModuleRow[];
  byProject: ProjectRow[];
  target: number | null;
  diff: number | null;
}

const fmtHours = (n: number) =>
  `${n.toLocaleString('es-ES', { maximumFractionDigits: 1 })} h`;

const fmtDate = (iso: string) => {
  // iso "YYYY-MM-DD" → "DD/MM/YYYY" sin construir Date (evita saltos de huso)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso || '—';
};

function HoursPanel() {
  const [nonce, setNonce] = useState(0);
  const recompute = useCallback(() => setNonce((n) => n + 1), []);

  // Exponer el hook de refresco para el orquestador.
  useEffect(() => {
    w().__refreshHoursPanel = recompute;
    return () => {
      if (w().__refreshHoursPanel === recompute) delete w().__refreshHoursPanel;
    };
  }, [recompute]);

  // Reintento corto por si gantt-adapter.js (buildHoursBreakdown) o la promo
  // aún no estaban listos al montar / al primer refresco.
  const retriesRef = useRef(0);
  useEffect(() => {
    const ready = typeof w().buildHoursBreakdown === 'function' && w().currentPromotion;
    if (ready || retriesRef.current > 20) return;
    const t = setTimeout(() => {
      retriesRef.current += 1;
      recompute();
    }, 250);
    return () => clearTimeout(t);
  }, [nonce, recompute]);

  const build = w().buildHoursBreakdown;
  const promotion = w().currentPromotion;
  const extendedInfo = w().__promotionExtendedInfo || w().publicPromotionExtendedInfo || {};

  let data: Breakdown | null = null;
  if (typeof build === 'function' && promotion) {
    try {
      data = build(promotion, extendedInfo) as Breakdown;
    } catch (err) {
      console.error('[HoursPanel] buildHoursBreakdown falló', err);
    }
  }

  if (!data) {
    return (
      <div className="card mb-3">
        <div className="card-body text-center text-muted small py-4">
          <div className="spinner-border spinner-border-sm me-2" role="status" />
          Calculando horas lectivas…
        </div>
      </div>
    );
  }

  const { hoursPerDay, total, byModule, byProject, target, diff } = data;
  const noModules = byModule.length === 0;
  // diff < 0 → faltan horas (déficit); diff > 0 → por encima del objetivo.
  const deficit = diff !== null && diff < 0;
  const surplus = diff !== null && diff > 0;

  return (
    <div className="card mb-3" id="hours-panel">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
          <div>
            <h5 className="mb-1">
              <i className="bi bi-clock-history me-2 text-primary" />
              Cómputo de horas
            </h5>
            <p className="text-muted small mb-0">
              Horas lectivas que suma el roadmap contando solo días lectivos
              (fines de semana y festivos de la promoción excluidos) a{' '}
              <strong>{hoursPerDay.toLocaleString('es-ES', { maximumFractionDigits: 2 })} h/día</strong>.
              La jornada se edita en «Modificar promoción».
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm flex-shrink-0"
            disabled={noModules}
            onClick={() => w().exportHoursXlsx?.()}
          >
            <i className="bi bi-file-earmark-excel me-1" />Exportar a Excel
          </button>
        </div>

        {/* Resumen */}
        <div className="row g-2 mb-3">
          <div className="col-6 col-md-4">
            <div className="border rounded p-3 h-100">
              <div className="text-muted small text-uppercase">Total formación</div>
              <div className="fs-4 fw-semibold">{fmtHours(total)}</div>
            </div>
          </div>
          <div className="col-6 col-md-4">
            <div className="border rounded p-3 h-100">
              <div className="text-muted small text-uppercase">Objetivo titulación</div>
              <div className="fs-4 fw-semibold">
                {target !== null ? fmtHours(target) : <span className="text-muted">Sin definir</span>}
              </div>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="border rounded p-3 h-100">
              <div className="text-muted small text-uppercase">Diferencia</div>
              {diff === null ? (
                <div className="fs-5 text-muted">—</div>
              ) : (
                <div
                  className={`fs-4 fw-semibold ${
                    deficit ? 'text-danger' : surplus ? 'text-warning' : 'text-success'
                  }`}
                >
                  {deficit ? `Faltan ${fmtHours(Math.abs(diff))}` : null}
                  {surplus ? `+${fmtHours(diff)} sobre objetivo` : null}
                  {!deficit && !surplus ? 'Justo en el objetivo' : null}
                </div>
              )}
            </div>
          </div>
        </div>

        {noModules ? (
          <div className="text-muted small py-3">
            Esta promoción todavía no tiene módulos en el roadmap.
          </div>
        ) : (
          <>
            {/* Por módulo */}
            <h6 className="fw-semibold mt-2 mb-2">Por módulo</h6>
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Módulo</th>
                    <th className="text-nowrap">Fechas</th>
                    <th className="text-end">Días lectivos</th>
                    <th className="text-end">Horas</th>
                  </tr>
                </thead>
                <tbody>
                  {byModule.map((m) => (
                    <tr key={m.moduleIndex}>
                      <td>{m.name}</td>
                      <td className="text-nowrap text-muted small">
                        {fmtDate(m.startDate)} – {fmtDate(m.endDate)}
                      </td>
                      <td className="text-end">{m.lectiveDays}</td>
                      <td className="text-end fw-semibold">{fmtHours(m.hours)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan={3} className="text-end">
                      Total
                    </th>
                    <th className="text-end">{fmtHours(total)}</th>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Por proyecto */}
            <h6 className="fw-semibold mt-3 mb-2">Por proyecto</h6>
            {byProject.length === 0 ? (
              <div className="text-muted small">Ningún módulo tiene proyectos en el roadmap.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Módulo</th>
                      <th>Proyecto</th>
                      <th className="text-nowrap">Fechas</th>
                      <th className="text-end">Días lectivos</th>
                      <th className="text-end">Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byProject.map((p, i) => (
                      <tr key={`${p.moduleIndex}-${i}`}>
                        <td className="text-muted small">{p.moduleName}</td>
                        <td>{p.name}</td>
                        <td className="text-nowrap text-muted small">
                          {fmtDate(p.startDate)} – {fmtDate(p.endDate)}
                        </td>
                        <td className="text-end">{p.lectiveDays}</td>
                        <td className="text-end fw-semibold">{fmtHours(p.hours)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-muted small mb-0">
              El desglose por proyecto es orientativo: los proyectos pueden
              solaparse con cursos del mismo módulo, así que sus horas no tienen
              por qué sumar el total del módulo.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
