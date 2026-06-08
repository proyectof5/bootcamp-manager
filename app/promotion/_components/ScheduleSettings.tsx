'use client';

/**
 * ScheduleSettings.tsx — sub-tab "Horario" de Contenido del Programa (spec 0014 Fase C).
 *
 * 2º bloque extraído del orquestador promotion-detail.js. Reemplaza el form de franjas
 * (online/presencial + notas) que vivía en body.ts y se poblaba/auto-guardaba en
 * promotion-detail.js (setupScheduleEditor + _saveScheduleNow). Monta por createPortal
 * en el tab-pane #program-details-schedule (vaciado en body.ts).
 *
 * IMPORTANTE: usa los MISMOS ids legacy (sched-*) porque saveExtendedInfo() del
 * orquestador los lee al "guardar todo" el Contenido del Programa (postea el objeto
 * extendedInfoData completo). Al mantener los ids + inputs controlados, esa lectura
 * sigue obteniendo los valores actuales y no se pisa el horario. El auto-guardado
 * propio (POST extended-info {schedule}, merge-safe) replica al legacy _saveScheduleNow.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '@/lib/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function w(): any { return window as unknown as any; }

function toast(message: string, type: 'success' | 'danger' | 'warning' = 'success', delay = 4000) {
  const ww = w();
  if (typeof ww.showApiToast === 'function') ww.showApiToast(message, type, delay);
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
    return () => { cancelled = true; clearTimeout(t); };
  }, [id]);
  return node;
}

interface DaySched { entry: string; start: string; break: string; lunch: string; finish: string; }
interface Sched { online: DaySched; presential: DaySched; notes: string; }
const EMPTY_DAY: DaySched = { entry: '', start: '', break: '', lunch: '', finish: '' };

export function ScheduleSettingsHost() {
  const [promotionId, setPromotionId] = useState<string | null>(null);
  useEffect(() => { setPromotionId(new URLSearchParams(window.location.search).get('id')); }, []);
  const host = usePortalNode('program-details-schedule');
  if (!host || !promotionId) return null;
  return createPortal(<ScheduleSettings promotionId={promotionId} />, host);
}

function ScheduleSettings({ promotionId }: { promotionId: string }) {
  const [sched, setSched] = useState<Sched>({ online: { ...EMPTY_DAY }, presential: { ...EMPTY_DAY }, notes: '' });
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const r = await apiFetch(`/api/promotions/${promotionId}/extended-info`);
        if (r.ok) {
          const d = await r.json();
          const s = d.schedule || {};
          setSched({
            online: { ...EMPTY_DAY, ...(s.online || {}) },
            presential: { ...EMPTY_DAY, ...(s.presential || {}) },
            notes: s.notes || '',
          });
        }
      } catch {
        /* noop */
      }
    })();
  }, [promotionId]);

  const saveNow = useCallback(async (next: Sched) => {
    try {
      const r = await apiFetch(`/api/promotions/${promotionId}/extended-info`, {
        method: 'POST',
        body: JSON.stringify({ schedule: next }),
      });
      if (r.ok) toast('Horario guardado', 'success', 2000);
      else toast('Error al guardar horario', 'danger');
    } catch {
      toast('Error al guardar horario', 'danger');
    }
  }, [promotionId]);

  // Auto-guardado debounced (800ms), como el legacy.
  const update = (section: 'online' | 'presential', field: keyof DaySched, value: string) => {
    setSched((prev) => {
      const next: Sched = { ...prev, [section]: { ...prev[section], [field]: value } };
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => saveNow(next), 800);
      return next;
    });
  };
  const updateNotes = (value: string) => {
    setSched((prev) => {
      const next: Sched = { ...prev, notes: value };
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => saveNow(next), 800);
      return next;
    });
  };
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const renderField = (
    label: string, type: string, id: string, value: string,
    onChange: (v: string) => void, placeholder?: string, last?: boolean,
  ) => (
    <div className={last ? 'mb-0' : 'mb-3'}>
      <label className="form-label form-label-sm">{label}</label>
      <input
        type={type}
        className="form-control form-control-sm"
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );

  return (
    <div className="card">
      <div className="card-body">
        <div className="row">
          <div className="col-md-6 border-end pb-md-0 pb-4">
            <h6 className="text-primary fw-bold mb-3"><i className="bi bi-laptop me-2" />Online</h6>
            {renderField('Hora de entrada', 'time', 'sched-online-entry', sched.online.entry, (v) => update('online', 'entry', v))}
            {renderField('Inicio Píldoras', 'time', 'sched-online-start', sched.online.start, (v) => update('online', 'start', v))}
            {renderField('Break', 'time', 'sched-online-break', sched.online.break, (v) => update('online', 'break', v))}
            {renderField('Comida (si se toma)', 'text', 'sched-online-lunch', sched.online.lunch, (v) => update('online', 'lunch', v), 'Use text if needed')}
            {renderField('Hora de salida', 'time', 'sched-online-finish', sched.online.finish, (v) => update('online', 'finish', v), undefined, true)}
          </div>
          <div className="col-md-6 ps-md-4">
            <h6 className="fw-bold mb-3"><i className="bi bi-people me-2" />Presencial</h6>
            {renderField('Hora de entrada', 'time', 'sched-presential-entry', sched.presential.entry, (v) => update('presential', 'entry', v))}
            {renderField('Inicio Píldoras', 'time', 'sched-presential-start', sched.presential.start, (v) => update('presential', 'start', v))}
            {renderField('Break', 'time', 'sched-presential-break', sched.presential.break, (v) => update('presential', 'break', v))}
            {renderField('Comida', 'time', 'sched-presential-lunch', sched.presential.lunch, (v) => update('presential', 'lunch', v))}
            {renderField('Hora de salida', 'time', 'sched-presential-finish', sched.presential.finish, (v) => update('presential', 'finish', v), undefined, true)}
          </div>
        </div>
        <div className="mt-4 pt-3 border-top">
          <label className="form-label form-label-sm">Notas adicionales sobre el horario</label>
          <textarea
            className="form-control form-control-sm"
            id="sched-notes"
            rows={2}
            value={sched.notes}
            onChange={(e) => updateNotes(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
