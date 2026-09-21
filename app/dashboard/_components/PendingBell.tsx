'use client';

/**
 * PendingBell.tsx — campana de avisos en la tarjeta de cada promoción
 * (docs/tasks/navegacion-promocion.md, Fase 5).
 *
 * El listado de promociones se queda limpio: no hay bloque de pendientes encima
 * de la rejilla. Cada tarjeta lleva una campana arriba a la derecha cuando esa
 * promoción tiene algo que hacer, y el detalle está en su Inicio ("Pendiente de
 * ti", PendingPanel.tsx).
 *
 * Cuenta lo mismo que el Inicio: falta pasar lista de hoy, proyectos sin evaluar
 * y horas por debajo del objetivo. Solo mira promociones en marcha hoy.
 */

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface PromotionLike {
  id: string;
  startDate?: string;
  endDate?: string;
  workingDays?: number[];
  holidays?: string[];
  modules?: unknown[];
  hoursPerDay?: number;
}

export interface Pending {
  total: number;
  /** Lo más urgente, para el texto de la campana. */
  top: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function w(): any { return (typeof window !== 'undefined' ? window : {}) as unknown as any; }

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtHours = (n: number) => `${n.toLocaleString('es-ES', { maximumFractionDigits: 1 })} h`;

/** Cuenta los avisos de cada promoción: { [id]: { total, top } }. */
export function usePendingCounts(promotions: PromotionLike[], basePath: (p: string) => string) {
  const [counts, setCounts] = useState<Record<string, Pending>>({});

  const compute = useCallback(async () => {
    if (promotions.length === 0) return;
    const today = new Date();
    const todayKey = isoDay(today);
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    const enMarcha = promotions.filter(p => {
      const ini = p.startDate ? String(p.startDate).slice(0, 10) : null;
      const fin = p.endDate ? String(p.endDate).slice(0, 10) : null;
      return (!ini || ini <= todayKey) && (!fin || fin >= todayKey);
    });

    const next: Record<string, Pending> = {};
    await Promise.all(enMarcha.map(async (p) => {
      try {
        const [extRes, attRes] = await Promise.all([
          apiFetch(`/api/promotions/${p.id}/extended-info`),
          apiFetch(`/api/promotions/${p.id}/attendance?month=${month}`),
        ]);
        const ext = extRes.ok ? await extRes.json() : {};
        const attendance = attRes.ok ? await attRes.json() : [];
        const avisos: string[] = [];

        const workingDays = (Array.isArray(p.workingDays) && p.workingDays.length ? p.workingDays : [1, 2, 3, 4, 5]).map(Number);
        const holidays = Array.isArray(p.holidays) ? p.holidays : [];
        const lectivo = workingDays.includes(today.getDay()) && !holidays.includes(todayKey);
        const pasada = (Array.isArray(attendance) ? attendance : []).some((a: { date?: string }) => a.date === todayKey);
        if (lectivo && !pasada) avisos.push('Falta pasar lista de hoy');

        const comps: { projectName?: string }[] = Array.isArray(ext.projectCompetences) ? ext.projectCompetences : [];
        const evaluados = new Set((Array.isArray(ext.projectEvaluations) ? ext.projectEvaluations : [])
          .filter((e: { evaluations?: { evaluatedAt?: string }[] }) => (e.evaluations || []).some(ev => ev.evaluatedAt))
          .map((e: { projectName?: string }) => e.projectName));
        const sinEvaluar = comps.filter(c => c.projectName && !evaluados.has(c.projectName)).length;
        if (sinEvaluar > 0) avisos.push(`${sinEvaluar} ${sinEvaluar === 1 ? 'proyecto sin evaluar' : 'proyectos sin evaluar'}`);

        if (typeof w().buildHoursBreakdown === 'function') {
          const bd = w().buildHoursBreakdown(p, ext);
          if (bd && bd.diff !== null && bd.diff < 0) avisos.push(`Faltan ${fmtHours(Math.abs(bd.diff))} para el objetivo`);
        }

        if (avisos.length) next[p.id] = { total: avisos.length, top: avisos[0] };
      } catch (err) {
        console.error('[Pendientes] no se pudo revisar una promoción', p.id, err);
      }
    }));
    setCounts(next);
  }, [promotions]);

  // gantt-adapter.js solo lo carga la vista de promoción; aquí se carga una vez
  // para reutilizar buildHoursBreakdown en el aviso de horas.
  useEffect(() => {
    if (typeof w().buildHoursBreakdown === 'function' || document.getElementById('gantt-adapter-script')) {
      compute();
      return;
    }
    const el = document.createElement('script');
    el.id = 'gantt-adapter-script';
    el.src = basePath('/js/gantt-adapter.js');
    el.onload = () => compute();
    el.onerror = () => compute();
    document.body.appendChild(el);
  }, [compute, basePath]);

  return counts;
}

/** Campana con el número de avisos, arriba a la derecha de la tarjeta. */
export function PendingBell({ pending }: { pending?: Pending }) {
  if (!pending || pending.total === 0) return null;
  const texto = pending.total === 1
    ? `1 aviso pendiente: ${pending.top}`
    : `${pending.total} avisos pendientes. El primero: ${pending.top}`;
  return (
    <span className="pending-bell" title={texto}>
      <i className="bi bi-bell-fill" aria-hidden="true" />
      <span className="pending-bell-count" aria-hidden="true">{pending.total}</span>
      <span className="visually-hidden-label">{texto}</span>
    </span>
  );
}
