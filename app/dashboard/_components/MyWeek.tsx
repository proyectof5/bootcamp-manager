'use client';

/**
 * MyWeek.tsx — "Mi semana": lo pendiente de TODAS tus promociones
 * (docs/tasks/navegacion-promocion.md, Fase 5).
 *
 * El equipo lleva varias promociones a la vez, así que la primera pantalla no
 * puede ser solo una rejilla de tarjetas: arriba va lo que hay que hacer, con un
 * enlace directo a la pantalla donde se resuelve (`/promotion?id=…#/sección/pestaña`).
 *
 * Por promoción hace dos peticiones (ficha ampliada y asistencia del mes) y
 * reutiliza el cómputo de horas de gantt-adapter.js cuando está cargado; si no
 * lo está, ese aviso se omite en vez de calcularlo dos veces.
 */

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface Promotion {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  modules?: unknown[];
  workingDays?: number[];
  holidays?: string[];
  hoursPerDay?: number;
  status?: string;
}

interface Alert {
  id: string;
  level: 'late' | 'soon' | 'info';
  promo: string;
  what: string;
  where: string;
  cta: string;
  href: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function w(): any { return (typeof window !== 'undefined' ? window : {}) as unknown as any; }

const fmtHours = (n: number) => `${n.toLocaleString('es-ES', { maximumFractionDigits: 1 })} h`;
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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

export function MyWeek({ promotions, basePath }: { promotions: Promotion[]; basePath: (p: string) => string }) {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);

  const link = useCallback((id: string, dest: string) => basePath(`/promotion?id=${id}${dest}`), [basePath]);

  const compute = useCallback(async () => {
    if (promotions.length === 0) { setAlerts([]); return; }
    const today = new Date();
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const todayKey = isoDay(today);

    // Solo las promociones en marcha hoy: ni las cerradas ni las que no han empezado.
    const enMarcha = promotions.filter(p => {
      const ini = p.startDate ? String(p.startDate).slice(0, 10) : null;
      const fin = p.endDate ? String(p.endDate).slice(0, 10) : null;
      return (!ini || ini <= todayKey) && (!fin || fin >= todayKey);
    });

    const found: Alert[] = [];
    await Promise.all(enMarcha.map(async (p) => {
      try {
        const [extRes, attRes] = await Promise.all([
          apiFetch(`/api/promotions/${p.id}/extended-info`),
          apiFetch(`/api/promotions/${p.id}/attendance?month=${month}`),
        ]);
        const ext = extRes.ok ? await extRes.json() : {};
        const attendance = attRes.ok ? await attRes.json() : [];

        // 1. Pasar lista de hoy, si hoy es día lectivo de esa promoción.
        const workingDays = (Array.isArray(p.workingDays) && p.workingDays.length ? p.workingDays : [1, 2, 3, 4, 5]).map(Number);
        const holidays = Array.isArray(p.holidays) ? p.holidays : [];
        const lectivo = workingDays.includes(today.getDay()) && !holidays.includes(todayKey);
        const pasada = (Array.isArray(attendance) ? attendance : []).some((a: { date?: string }) => a.date === todayKey);
        if (lectivo && !pasada) {
          found.push({
            id: `${p.id}-lista`, level: 'late', promo: p.name,
            what: 'Falta pasar lista de hoy',
            where: today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }),
            cta: 'Pasar lista', href: link(p.id, '#/estudiantes/asistencia'),
          });
        }

        // 2. Proyectos con competencias definidas y sin evaluar.
        const comps: { projectName?: string }[] = Array.isArray(ext.projectCompetences) ? ext.projectCompetences : [];
        const evaluados = new Set((Array.isArray(ext.projectEvaluations) ? ext.projectEvaluations : [])
          .filter((e: { evaluations?: { evaluatedAt?: string }[] }) => (e.evaluations || []).some(ev => ev.evaluatedAt))
          .map((e: { projectName?: string }) => e.projectName));
        const sinEvaluar = comps.filter(c => c.projectName && !evaluados.has(c.projectName));
        if (sinEvaluar.length > 0) {
          found.push({
            id: `${p.id}-evaluar`, level: 'soon', promo: p.name,
            what: `${sinEvaluar.length} ${sinEvaluar.length === 1 ? 'proyecto sin evaluar' : 'proyectos sin evaluar'}`,
            where: sinEvaluar.slice(0, 2).map(c => c.projectName).join(' · ') + (sinEvaluar.length > 2 ? ' y más' : ''),
            cta: 'Ver proyectos', href: link(p.id, '#/proyectos/lista'),
          });
        }

        // 3. Horas por debajo del objetivo de la titulación.
        if (typeof w().buildHoursBreakdown === 'function') {
          const bd = w().buildHoursBreakdown(p, ext);
          if (bd && bd.diff !== null && bd.diff < 0) {
            found.push({
              id: `${p.id}-horas`, level: 'info', promo: p.name,
              what: `Faltan ${fmtHours(Math.abs(bd.diff))} para el objetivo`,
              where: `${fmtHours(bd.total)} planificadas de ${fmtHours(bd.target)}`,
              cta: 'Ver horas', href: link(p.id, '#/planificacion/horas'),
            });
          }
        }
      } catch (err) {
        console.error('[Mi semana] no se pudo revisar una promoción', p.name, err);
      }
    }));

    const orden = { late: 0, soon: 1, info: 2 };
    found.sort((a, b) => orden[a.level] - orden[b.level] || a.promo.localeCompare(b.promo, 'es'));
    setAlerts(found);
  }, [promotions, link]);

  // gantt-adapter.js vive en /public y solo lo carga la vista de promoción: aquí se
  // carga una vez para poder reutilizar buildHoursBreakdown en el aviso de horas.
  useEffect(() => {
    if (typeof w().buildHoursBreakdown === 'function') return;
    if (document.getElementById('gantt-adapter-script')) return;
    const el = document.createElement('script');
    el.id = 'gantt-adapter-script';
    el.src = basePath('/js/gantt-adapter.js');
    el.onload = () => compute();
    document.body.appendChild(el);
  }, [compute, basePath]);

  useEffect(() => { compute(); }, [compute]);

  return (
    <section className="myweek" aria-labelledby="myweek-title">
      <div className="myweek-head">
        <h2 id="myweek-title">Mi semana</h2>
        <span className="myweek-date">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>

      {alerts === null && <p className="myweek-msg">Revisando tus promociones…</p>}
      {alerts !== null && alerts.length === 0 && (
        <p className="myweek-msg">
          <i className="bi bi-check-circle me-2" aria-hidden="true" />
          Nada pendiente en tus promociones activas.
        </p>
      )}
      {alerts !== null && alerts.length > 0 && (
        <ul className="myweek-list">
          {alerts.map(a => (
            <li key={a.id} className={`myweek-item is-${a.level}`}>
              <span className="myweek-level">
                <i className={`bi ${LEVEL_ICON[a.level]}`} aria-hidden="true" />
                <span className="visually-hidden-label">{LEVEL_WORD[a.level]}:</span>
              </span>
              <span className="myweek-what">
                <strong>{a.what}</strong>
                <span className="myweek-where">{a.promo} · {a.where}</span>
              </span>
              <a className="myweek-cta" href={a.href}>{a.cta}</a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
