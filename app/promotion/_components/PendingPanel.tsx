'use client';

/**
 * PendingPanel.tsx — "Pendiente de ti" + las cuatro cifras del Inicio
 * (docs/tasks/navegacion-promocion.md, Fase 2).
 *
 * Responde a "¿qué tengo que hacer hoy?" antes que a "¿qué hay en esta promoción?":
 * una lista de avisos accionables, cada uno enlazado a la pantalla donde se
 * resuelve, y cuatro cifras que también llevan a su detalle.
 *
 * Todo sale de datos que la app ya tiene:
 *  - horas: window.buildHoursBreakdown(promoción, extendedInfo)  (gantt-adapter.js)
 *  - proyectos: ExtendedInfo.projectCompetences / projectEvaluations / virtualClassrooms
 *  - asistencia: GET /attendance?month=YYYY-MM
 *  - estudiantes: GET /students
 *  - festivos a mano sin nombre: promotion.holidays − regionalHolidays − holidayNames
 */

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function w(): any {
  return (typeof window !== 'undefined' ? window : {}) as unknown as any;
}

interface Alert {
  id: string;
  level: 'late' | 'soon' | 'info';
  what: string;
  where: string;
  cta: string;
  go: [string, string];
}

interface Figure {
  id: string;
  question: string;
  value: string;
  note: string;
  go: [string, string];
}

const fmtHours = (n: number) => `${n.toLocaleString('es-ES', { maximumFractionDigits: 1 })} h`;
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const LEVEL_ICON: Record<Alert['level'], string> = {
  late: 'bi-exclamation-octagon-fill',
  soon: 'bi-exclamation-triangle-fill',
  info: 'bi-info-circle-fill',
};
const LEVEL_WORD: Record<Alert['level'], string> = {
  late: 'Urgente',
  soon: 'Para esta semana',
  info: 'Cuando puedas',
};

export function PendingPanel() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [figures, setFigures] = useState<Figure[]>([]);
  const [error, setError] = useState(false);

  const go = useCallback((section: string, tab: string) => w().goToPromotionDestination?.(section, tab), []);

  const compute = useCallback(async () => {
    const promotionId = new URLSearchParams(window.location.search).get('id');
    const promo = w().currentPromotion;
    if (!promotionId || !promo) return false;

    const today = new Date();
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    try {
      const [extRes, studentsRes, attRes] = await Promise.all([
        apiFetch(`/api/promotions/${promotionId}/extended-info`),
        apiFetch(`/api/promotions/${promotionId}/students`),
        apiFetch(`/api/promotions/${promotionId}/attendance?month=${month}`),
      ]);
      const ext = extRes.ok ? await extRes.json() : {};
      const students = studentsRes.ok ? await studentsRes.json() : [];
      const attendance = attRes.ok ? await attRes.json() : [];

      const active = (Array.isArray(students) ? students : []).filter((s: { isWithdrawn?: boolean }) => !s.isWithdrawn);
      const next: Alert[] = [];

      // 1. ¿Falta pasar lista de hoy? Solo si hoy es día lectivo de la promoción.
      const workingDays: number[] = Array.isArray(promo.workingDays) && promo.workingDays.length ? promo.workingDays : [1, 2, 3, 4, 5];
      const todayKey = iso(today);
      const holidays: string[] = Array.isArray(promo.holidays) ? promo.holidays : [];
      const flexKeys: Set<string> = w().getFlexibleBlockDateKeys?.(promo) || new Set();
      const lectiveToday = workingDays.map(Number).includes(today.getDay())
        && !holidays.includes(todayKey)
        && !flexKeys.has(todayKey);
      const passedToday = (Array.isArray(attendance) ? attendance : []).some((a: { date?: string }) => a.date === todayKey);
      if (lectiveToday && active.length > 0 && !passedToday) {
        next.push({
          id: 'lista', level: 'late',
          what: 'Falta pasar lista de hoy',
          where: `${active.length} ${active.length === 1 ? 'estudiante' : 'estudiantes'} · ${today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`,
          cta: 'Pasar lista', go: ['estudiantes', 'asistencia'],
        });
      }

      // 2. Proyectos con competencias definidas y sin ninguna evaluación guardada.
      const projectCompetences: { projectName?: string }[] = Array.isArray(ext.projectCompetences) ? ext.projectCompetences : [];
      const evaluated = new Set(
        (Array.isArray(ext.projectEvaluations) ? ext.projectEvaluations : [])
          .map((e: { projectName?: string }) => e.projectName)
          .filter(Boolean),
      );
      const sinEvaluar = projectCompetences.filter(p => p.projectName && !evaluated.has(p.projectName));
      if (sinEvaluar.length > 0) {
        next.push({
          id: 'evaluar', level: 'soon',
          what: `${sinEvaluar.length} ${sinEvaluar.length === 1 ? 'proyecto sin evaluar' : 'proyectos sin evaluar'}`,
          where: sinEvaluar.slice(0, 2).map(p => p.projectName).join(' · ') + (sinEvaluar.length > 2 ? ' y más' : ''),
          cta: 'Ver proyectos', go: ['proyectos', 'lista'],
        });
      }

      // 3. Horas planificadas frente al objetivo de la titulación.
      const breakdown = typeof w().buildHoursBreakdown === 'function' ? w().buildHoursBreakdown(promo, ext) : null;
      if (breakdown && breakdown.diff !== null && breakdown.diff < 0) {
        next.push({
          id: 'horas', level: 'info',
          what: `Faltan ${fmtHours(Math.abs(breakdown.diff))} para el objetivo de la titulación`,
          where: `${fmtHours(breakdown.total)} planificadas de ${fmtHours(breakdown.target)}`,
          cta: 'Ver horas', go: ['planificacion', 'horas'],
        });
      }

      // 4. Festivos marcados a mano a los que nadie puso nombre.
      const autoDates = new Set((promo.regionalHolidays || []).map((h: { date: string }) => h.date));
      const names = promo.holidayNames || {};
      const sinNombre = holidays.filter(d => !autoDates.has(d) && !names[d]);
      if (sinNombre.length > 0) {
        next.push({
          id: 'festivos', level: 'info',
          what: `${sinNombre.length} ${sinNombre.length === 1 ? 'festivo marcado a mano sin nombre' : 'festivos marcados a mano sin nombre'}`,
          where: 'Se ven en el Gantt, pero sin saber qué se celebra',
          cta: 'Ponerles nombre', go: ['planificacion', 'roadmap'],
        });
      }

      // ── Cifras ───────────────────────────────────────────────────────────
      const presentes = (Array.isArray(attendance) ? attendance : []).filter((a: { status?: string }) => (a.status || '').startsWith('Presente')).length;
      const registros = (Array.isArray(attendance) ? attendance : []).length;
      const vcActivos = (Array.isArray(ext.virtualClassrooms) ? ext.virtualClassrooms : []).filter((v: { isActive?: boolean }) => v && v.isActive);

      setFigures([
        {
          id: 'horas',
          question: '¿Llegamos al objetivo de horas?',
          value: breakdown ? fmtHours(breakdown.total) : '—',
          note: breakdown && breakdown.target
            ? `de ${fmtHours(breakdown.target)}${breakdown.diff && breakdown.diff < 0 ? ` · faltan ${fmtHours(Math.abs(breakdown.diff))}` : ''}`
            : 'sin objetivo definido',
          go: ['planificacion', 'horas'],
        },
        {
          id: 'asistencia',
          question: '¿Cómo va la asistencia?',
          value: registros ? `${Math.round((presentes / registros) * 100)} %` : '—',
          note: registros ? `${today.toLocaleDateString('es-ES', { month: 'long' })} · ${active.length} estudiantes` : 'sin registros este mes',
          go: ['estudiantes', 'asistencia'],
        },
        {
          id: 'aula',
          question: '¿Qué hay abierto en el Aula Virtual?',
          value: String(vcActivos.length),
          note: vcActivos.length
            ? vcActivos.slice(0, 1).map((v: { projectName?: string }) => v.projectName).join('') + (vcActivos.length > 1 ? ` y ${vcActivos.length - 1} más` : '')
            : 'ningún proyecto activo',
          go: ['proyectos', 'lista'],
        },
        {
          id: 'estudiantes',
          question: '¿Cuánta gente hay en la promoción?',
          value: String(active.length),
          note: `${(students as { isWithdrawn?: boolean }[]).length - active.length} de baja`,
          go: ['estudiantes', 'lista'],
        },
      ]);
      setAlerts(next);
      setError(false);
      return true;
    } catch (err) {
      console.error('[PendingPanel] no se pudo calcular lo pendiente', err);
      setError(true);
      return true;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const tick = async () => {
      if (cancelled) return;
      const done = await compute();
      tries += 1;
      if (!done && tries < 40) setTimeout(tick, 250);
    };
    tick();
    // Se recalcula al volver al Inicio y cuando cambian los festivos.
    const onDest = (e: Event) => {
      if ((e as CustomEvent).detail?.section === 'inicio') compute();
    };
    window.addEventListener('promotion-destination-changed', onDest);
    window.addEventListener('promotion-holidays-changed', compute);
    return () => {
      cancelled = true;
      window.removeEventListener('promotion-destination-changed', onDest);
      window.removeEventListener('promotion-holidays-changed', compute);
    };
  }, [compute]);

  return (
    <section className="pending-block" aria-labelledby="pending-title">
      <div className="pending-head">
        <h2 className="pending-title" id="pending-title">Pendiente de ti</h2>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => go('estudiantes', 'asistencia')}>
          <i className="bi bi-check2-square me-1" aria-hidden="true" />Pasar lista
        </button>
      </div>

      {alerts === null && !error && (
        <p className="text-muted small mb-3">Revisando qué tienes pendiente…</p>
      )}
      {error && (
        <p className="text-muted small mb-3">
          No se pudo calcular lo pendiente. Recarga la página; el resto del Inicio sigue funcionando.
        </p>
      )}
      {alerts !== null && alerts.length === 0 && (
        <p className="pending-empty">
          <i className="bi bi-check-circle me-2" aria-hidden="true" />Nada pendiente: lista pasada, proyectos evaluados y horas cuadradas.
        </p>
      )}
      {alerts !== null && alerts.length > 0 && (
        <ul className="pending-list">
          {alerts.map(a => (
            <li key={a.id} className={`pending-item is-${a.level}`}>
              <span className="pending-level">
                <i className={`bi ${LEVEL_ICON[a.level]}`} aria-hidden="true" />
                <span className="sr-only-text">{LEVEL_WORD[a.level]}:</span>
              </span>
              <span className="pending-what">
                <strong>{a.what}</strong>
                <span className="pending-where">{a.where}</span>
              </span>
              <button type="button" className="btn btn-sm btn-outline-secondary pending-cta" onClick={() => go(a.go[0], a.go[1])}>
                {a.cta}
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2 className="pending-title pending-title-figures">De un vistazo</h2>
      <div className="pending-figures">
        {figures.map(f => (
          <button type="button" key={f.id} className="pending-figure" onClick={() => go(f.go[0], f.go[1])}>
            <span className="pending-figure-q">{f.question}</span>
            <span className="pending-figure-v">{f.value}</span>
            <span className="pending-figure-n">{f.note}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
