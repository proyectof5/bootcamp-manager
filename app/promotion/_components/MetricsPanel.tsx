'use client';

/**
 * MetricsPanel.tsx — sección "Métricas" de /promotion
 * (openspec add-promotion-metrics-and-student-followup, spec promotion-metrics).
 *
 * Panel de solo lectura montado por portal en #metrics-tab (body.ts). Las cifras
 * las calcula el servidor (GET /api/promotions/:id/metrics); aquí solo se pintan.
 * Se recarga al montar y cada vez que switchTab('metrics') emite
 * `promotion-metrics-open`, así refleja el seguimiento/bajas guardados después.
 *
 * Los datos que son una PROPORCIÓN se dibujan (ver docs/tasks/metricas-graficos.md):
 * anillo para un porcentaje sobre un total, barra apilada para el reparto de un
 * total, y barras ordenadas para comparar categorías. Lo que es una cifra suelta
 * —cuántos empleados, cuántos meses— se queda como número: no todo es un gráfico.
 *
 * Sin librería de gráficos: son SVG y CSS de doce líneas cada uno, y el proyecto
 * no mete dependencias sin motivo (ver openspec/project.md § convenciones).
 * Accesibilidad: cada segmento y cada barra llevan su etiqueta y su valor
 * escritos; el color nunca es el único portador del dato.
 */

import { Fragment, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '@/lib/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function w(): any { return (typeof window !== 'undefined' ? window : {}) as unknown as any; }

interface NameCount { name: string; count: number }
interface Metrics {
  endDate: string | null;
  total: number;
  withdrawn: number;
  finishing: number;
  dropoutRate: number | null;
  gender: { women: number; men: number; other: number };
  employed: { total: number; it: number; other: number };
  continuingITStudies: number;
  positiveExits: { count: number; rate: number | null; windowEnd: string | null };
  bySituation: Record<string, number>;
  byChannel: Record<string, number>;
  bySector: NameCount[];
  companies: NameCount[];
  avgMonthsToEmployment: number | null;
  withoutFollowUp: { id: string; name: string }[];
  warnings: string[];
}

const SITUATION_LABELS: Record<string, string> = {
  employed_it: 'Empleado en IT',
  employed_other: 'Empleado en otro sector',
  unemployed_studying: 'Desempleado y estudiando',
  studying: 'Solo estudiando',
  unemployed: 'Desempleado',
};
const CHANNEL_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  job_speed_dating: 'Job Speed Dating (Factoría F5)',
  final_project_client: 'Cliente de proyecto final',
  contacts: 'Contactos',
  other: 'Otra',
};

const pct = (v: number | null) =>
  v === null ? '—' : `${v.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
const num1 = (v: number) => v.toLocaleString('es-ES', { maximumFractionDigits: 1 });
const fmtDay = (d: string | null) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

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

export function MetricsPanelHost() {
  const host = usePortalNode('metrics-tab');
  if (!host) return null;
  return createPortal(<MetricsPanel />, host);
}

/** Una cifra que no es proporción de nada: se lee como número, no como gráfico. */
function Figure({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div>
      <div className="mtr-figure-label">{label}</div>
      <div className="mtr-figure-value">{value}</div>
      {hint && <div className="mtr-figure-hint">{hint}</div>}
    </div>
  );
}

/** Lo que se enseña cuando un gráfico no tiene nada que dibujar todavía. */
function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="mtr-empty">
      <i className="bi bi-info-circle" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/**
 * Anillo: UN porcentaje sobre un total. El valor va escrito al lado, así que el
 * arco acompaña la lectura en vez de ser la única forma de saber cuánto es.
 */
function Ring({ value, caption, tone, label }: {
  value: number | null; caption: string; tone?: 'danger' | 'success'; label: string;
}) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const frac = value === null ? 0 : Math.min(100, Math.max(0, value)) / 100;
  return (
    <div className={`mtr-ring${tone ? ` is-${tone}` : ''}`} role="img" aria-label={`${label}: ${pct(value)}. ${caption}`}>
      <svg width="68" height="68" viewBox="0 0 68 68" aria-hidden="true">
        <circle className="mtr-ring-track" cx="34" cy="34" r={r} fill="none" strokeWidth="8" />
        {value !== null && frac > 0 && (
          <circle className="mtr-ring-fill" cx="34" cy="34" r={r} fill="none" strokeWidth="8"
            strokeDasharray={`${c * frac} ${c}`} />
        )}
      </svg>
      <div>
        <div className="mtr-ring-value">{pct(value)}</div>
        <div className="mtr-ring-caption">{caption}</div>
      </div>
    </div>
  );
}

interface Seg { name: string; count: number; color: string }

/**
 * Barra apilada: cómo se reparte un total. Cada segmento lleva su nombre y su
 * cifra en la leyenda de debajo — el color solo agrupa, no informa por sí solo.
 */
function Stack({ segments, total, label }: { segments: Seg[]; total: number; label: string }) {
  const vivos = segments.filter((s) => s.count > 0);
  const resumen = segments.map((s) => `${s.name}: ${s.count}`).join(', ');
  return (
    <>
      <div className="mtr-stack-track" role="img" aria-label={`${label}. ${resumen}. Total ${total}.`}>
        {vivos.map((s) => (
          <div key={s.name} className="mtr-stack-seg"
            style={{ width: `${(s.count / total) * 100}%`, background: s.color }} />
        ))}
      </div>
      <ul className="mtr-legend">
        {segments.map((s) => (
          <li key={s.name}>
            <span className="mtr-dot" style={{ background: s.color }} aria-hidden="true" />
            {s.name} <b>{s.count}</b>
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * Barras ordenadas de mayor a menor: comparar categorías. Las que están a cero
 * se mantienen en la lista (que una vía de acceso no se use es información),
 * pero sin barra y con el número apagado.
 */
function BarList({ title, rows, empty, sort = true }: {
  title: string; rows: NameCount[]; empty: React.ReactNode; sort?: boolean;
}) {
  const max = Math.max(0, ...rows.map((r) => r.count));
  const orden = sort ? [...rows].sort((a, b) => b.count - a.count) : rows;
  return (
    <section className="mtr-card">
      <h3 className="mtr-card-title">{title}</h3>
      {max === 0 ? (
        <Empty>{empty}</Empty>
      ) : (
        <dl className="mtr-bars">
          {orden.map((r) => (
            <Fragment key={r.name}>
              <dt>{r.name}</dt>
              <dd>
                <div className="mtr-bar-track">
                  <div className={`mtr-bar-fill${r.count === 0 ? ' is-zero' : ''}`}
                    style={{ width: `${(r.count / max) * 100}%` }} />
                </div>
                <span className="mtr-bar-value">{r.count}</span>
              </dd>
            </Fragment>
          ))}
        </dl>
      )}
    </section>
  );
}

function MetricsPanel() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const pid = new URLSearchParams(window.location.search).get('id');
    if (!pid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/promotions/${pid}/metrics`);
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `Error ${res.status}`); }
      setMetrics(await res.json());
    } catch (e) {
      console.error('[MetricsPanel] load:', e);
      setError((e as Error).message || 'No se pudieron cargar las métricas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener('promotion-metrics-open', load);
    return () => window.removeEventListener('promotion-metrics-open', load);
  }, [load]);

  if (loading && !metrics) {
    return (
      <div className="text-center text-muted py-5">
        <div className="spinner-border spinner-border-sm me-2" role="status" />Calculando métricas…
      </div>
    );
  }
  if (error) {
    return (
      <div className="alert alert-danger my-4 d-flex justify-content-between align-items-center">
        <span>{error}</span>
        <button type="button" className="btn btn-sm btn-outline-danger" onClick={load}>Reintentar</button>
      </div>
    );
  }
  if (!metrics) return null;

  const m = metrics;
  const noEndDate = m.warnings.includes('NO_END_DATE');
  const situationRows = Object.entries(SITUATION_LABELS).map(([k, name]) => ({ name, count: m.bySituation[k] || 0 }));
  const channelRows = Object.entries(CHANNEL_LABELS).map(([k, name]) => ({ name, count: m.byChannel[k] || 0 }));
  const generoSinDato = m.gender.other;

  return (
    <div className="my-4">
      {noEndDate && (
        <div className="alert alert-warning d-flex flex-wrap justify-content-between align-items-center gap-2" role="alert">
          <span>
            <i className="bi bi-exclamation-triangle me-2" aria-hidden="true" />
            La promoción no tiene fecha de fin: no se pueden calcular las salidas positivas ni el tiempo hasta el empleo.
          </span>
          <button type="button" className="btn btn-outline-secondary btn-sm"
            onClick={() => w().goToPromotionDestination?.('ajustes')}>
            <i className="bi bi-calendar-event" aria-hidden="true" />Fijar fecha de fin
          </button>
        </div>
      )}

      {/* ── Matrícula y abandono ─────────────────────────────────────────── */}
      <section className="mtr-section">
        <div className="mtr-section-head">
          <h2>Matrícula y abandono</h2>
          <p className="mtr-section-note">{m.total} {m.total === 1 ? 'estudiante matriculado' : 'estudiantes matriculados'}</p>
        </div>
        <div className="mtr-grid">
          <div className="mtr-card">
            <h3 className="mtr-card-title">Abandono</h3>
            <Ring value={m.dropoutRate} tone="danger" label="Porcentaje de abandono"
              caption={`${m.withdrawn} ${m.withdrawn === 1 ? 'baja' : 'bajas'} de ${m.total}`} />
          </div>
          <div className="mtr-card">
            <h3 className="mtr-card-title">Cómo se reparte la matrícula</h3>
            <Stack
              label="Reparto de la matrícula"
              total={m.total || 1}
              segments={[
                { name: 'Finalizan', count: m.finishing, color: 'var(--app-color-data-2)' },
                { name: 'Bajas', count: m.withdrawn, color: 'var(--app-color-danger-500)' },
              ]}
            />
          </div>
        </div>
      </section>

      {/* ── Género ───────────────────────────────────────────────────────── */}
      <section className="mtr-section">
        <div className="mtr-section-head">
          <h2>Género</h2>
        </div>
        <div className="mtr-card">
          <Stack
            label="Reparto por género"
            total={m.total || 1}
            segments={[
              { name: 'Mujeres', count: m.gender.women, color: 'var(--app-color-data-3)' },
              { name: 'Hombres', count: m.gender.men, color: 'var(--app-color-data-1)' },
              { name: 'Sin especificar', count: generoSinDato, color: 'var(--app-color-neutral-300)' },
            ]}
          />
          {generoSinDato > 0 && (
            <Empty>
              {generoSinDato === m.total
                ? 'Ningún estudiante tiene el género registrado, así que este reparto no dice nada todavía.'
                : `${generoSinDato} de ${m.total} estudiantes no tienen el género registrado: el reparto que se ve arriba solo cubre a los otros ${m.total - generoSinDato}.`}
            </Empty>
          )}
        </div>
      </section>

      {/* ── Salidas y empleabilidad ──────────────────────────────────────── */}
      <section className="mtr-section">
        <div className="mtr-section-head">
          <h2>Salidas y empleabilidad</h2>
          <p className="mtr-section-note">Sobre {m.finishing} {m.finishing === 1 ? 'estudiante que finaliza' : 'estudiantes que finalizan'}</p>
        </div>
        <div className="mtr-grid">
          <div className="mtr-card">
            <h3 className="mtr-card-title">Salidas positivas</h3>
            {m.positiveExits.windowEnd === null ? (
              <Empty>Sin fecha de fin de la promoción no hay ventana que medir, así que este porcentaje no se puede calcular.</Empty>
            ) : (
              <Ring value={m.positiveExits.rate} tone="success" label="Salidas positivas"
                caption={`${m.positiveExits.count} con empleo o estudios IT hasta el ${fmtDay(m.positiveExits.windowEnd)}`} />
            )}
          </div>
          <div className="mtr-card">
            <h3 className="mtr-card-title">Dónde están</h3>
            <div className="mtr-figures">
              <Figure label="Empleados" value={m.employed.total}
                hint={`${m.employed.it} en IT · ${m.employed.other} en otro sector`} />
              <Figure label="Continúan estudios IT" value={m.continuingITStudies} />
              <Figure label="Hasta el empleo"
                value={m.avgMonthsToEmployment === null ? '—' : `${num1(m.avgMonthsToEmployment)} meses`}
                hint="De media, desde el fin de la formación" />
            </div>
          </div>
        </div>

        <div className="mtr-grid" style={{ marginTop: 'var(--app-space-3)' }}>
          {/* sort={false} en situación: el orden de las etiquetas va de mejor a
              peor salida, y reordenarlo por cantidad perdería esa lectura. */}
          <BarList title="Por situación" rows={situationRows} sort={false}
            empty="Todavía no hay ningún seguimiento registrado, así que no se sabe en qué situación está nadie." />
          <BarList title="Vía de acceso al empleo" rows={channelRows}
            empty="Ningún estudiante empleado tiene registrada la vía por la que encontró trabajo." />
          <BarList title="Por sector" rows={m.bySector}
            empty="Aún no hay estudiantes empleados." />
          <BarList title="Empresas" rows={m.companies}
            empty="Aún no hay estudiantes empleados." />
        </div>
      </section>

      {/* ── Sin seguimiento ──────────────────────────────────────────────── */}
      <section className="mtr-section">
        <div className="mtr-section-head">
          <h2>Sin seguimiento registrado</h2>
          <p className="mtr-section-note">
            {m.withoutFollowUp.length} de {m.finishing} {m.finishing === 1 ? 'que finaliza' : 'que finalizan'}
          </p>
        </div>
        <div className="mtr-card">
          {m.withoutFollowUp.length === 0 ? (
            <p className="mtr-section-note">Todos los estudiantes que finalizan tienen seguimiento.</p>
          ) : (
            <ul className="mtr-people">
              {m.withoutFollowUp.map((s) => (
                <li key={s.id}>
                  <button type="button" className="btn btn-outline-secondary btn-sm"
                    onClick={() => w().StudentTracking?.openFicha?.(s.id)}
                    title="Abrir ficha del estudiante">
                    {s.name || 'Sin nombre'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
