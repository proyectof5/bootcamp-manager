'use client';

/**
 * PromotionSettingsPanel.tsx — Ajustes › Datos de la promoción
 * (docs/tasks/navegacion-promocion.md, Fase 4).
 *
 * Lo que antes era la ventana "Modificar promoción" pasa a ser una página con los
 * campos agrupados, etiquetas siempre visibles, obligatorios marcados con texto y
 * asterisco, error debajo del campo y aviso hablado al guardar (aria-live).
 *
 * Guarda con el mismo PUT /api/promotions/:id y el mismo payload que
 * `saveEditPromotion`, y después recarga la promoción con `loadPromotion()`, así
 * que la cabecera, el Gantt y el cómputo de horas se refrescan igual que antes.
 * La ventana sigue existiendo para quien la abra desde otro sitio.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '@/lib/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function w(): any { return (typeof window !== 'undefined' ? window : {}) as unknown as any; }

const DAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

interface Form {
  name: string;
  description: string;
  weeks: string;
  totalHours: string;
  hoursPerDay: string;
  startDate: string;
  endDate: string;
  workingDays: number[];
}

const EMPTY: Form = { name: '', description: '', weeks: '', totalHours: '', hoursPerDay: '', startDate: '', endDate: '', workingDays: [1, 2, 3, 4, 5] };
const dateOnly = (v?: string) => (v ? String(v).slice(0, 10) : '');

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

export function PromotionSettingsPanelHost() {
  const host = usePortalNode('ajustes-tab');
  if (!host) return null;
  return createPortal(<PromotionSettingsPanel />, host);
}

function PromotionSettingsPanel() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [holidayCount, setHolidayCount] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);
  const jornadaRef = useRef<HTMLInputElement>(null);
  const semanasRef = useRef<HTMLInputElement>(null);

  const fill = useCallback(() => {
    const p = w().currentPromotion;
    if (!p) return false;
    const ext = w().__promotionExtendedInfo || {};
    setForm({
      name: p.name || '',
      description: p.description || '',
      weeks: p.weeks ? String(p.weeks) : '',
      totalHours: ext.totalHours ? String(ext.totalHours) : '',
      hoursPerDay: p.hoursPerDay ? String(p.hoursPerDay) : '',
      startDate: dateOnly(p.startDate),
      endDate: dateOnly(p.endDate),
      workingDays: Array.isArray(p.workingDays) && p.workingDays.length ? p.workingDays.map(Number) : [1, 2, 3, 4, 5],
    });
    setHolidayCount(Array.isArray(p.holidays) ? p.holidays.length : 0);
    return true;
  }, []);

  // Se rellena cuando la promoción ya está cargada y cada vez que se entra a Ajustes.
  useEffect(() => {
    let tries = 0;
    const iv = setInterval(() => { if (fill() || ++tries > 60) clearInterval(iv); }, 150);
    const onDest = (e: Event) => { if ((e as CustomEvent).detail?.section === 'ajustes') fill(); };
    window.addEventListener('promotion-destination-changed', onDest);
    return () => { clearInterval(iv); window.removeEventListener('promotion-destination-changed', onDest); };
  }, [fill]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm(f => ({ ...f, [key]: value }));

  const toggleDay = (value: number) => setForm(f => ({
    ...f,
    workingDays: f.workingDays.includes(value) ? f.workingDays.filter(d => d !== value) : [...f.workingDays, value].sort((a, b) => a - b),
  }));

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Escribe el nombre de la promoción: es lo que se ve en el menú y en el portal.';
    const weeks = parseInt(form.weeks, 10);
    if (!Number.isFinite(weeks) || weeks < 1) next.weeks = 'Escribe cuántas semanas dura, por ejemplo 36.';
    if (form.hoursPerDay.trim()) {
      const hpd = parseFloat(form.hoursPerDay.replace(',', '.'));
      if (!Number.isFinite(hpd) || hpd <= 0) next.hoursPerDay = 'La jornada tiene que ser mayor que 0, por ejemplo 7,5.';
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      next.endDate = 'La fecha de fin no puede ser anterior a la de inicio.';
    }
    if (form.workingDays.length === 0) next.workingDays = 'Marca al menos un día lectivo.';
    return next;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      setStatus('No se guardó: revisa los campos marcados.');
      if (found.name) nameRef.current?.focus();
      else if (found.weeks) semanasRef.current?.focus();
      else if (found.hoursPerDay) jornadaRef.current?.focus();
      return;
    }

    const promotionId = new URLSearchParams(window.location.search).get('id');
    if (!promotionId) return;
    const hpd = parseFloat(form.hoursPerDay.replace(',', '.'));
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      weeks: parseInt(form.weeks, 10) || undefined,
      totalHours: parseInt(form.totalHours, 10) || undefined,
      hoursPerDay: Number.isFinite(hpd) && hpd > 0 ? hpd : undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      workingDays: form.workingDays.length ? form.workingDays : undefined,
    };

    setSaving(true);
    setStatus('Guardando…');
    try {
      const res = await apiFetch(`/api/promotions/${promotionId}`, { method: 'PUT', body: JSON.stringify(payload) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }
      if (payload.totalHours && w().extendedInfoData) w().extendedInfoData.totalHours = String(payload.totalHours);
      await w().loadPromotion?.();
      w().__refreshHoursPanel?.();
      setStatus('Cambios guardados.');
      w().showApiToast?.('Cambios guardados', 'success', 2500);
    } catch (err) {
      console.error('[Ajustes] no se pudo guardar', err);
      setStatus(`No se pudo guardar: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (key: string) => (errors[key]
    ? <span className="settings-error" id={`err-${key}`}><i className="bi bi-exclamation-circle me-1" aria-hidden="true" />{errors[key]}</span>
    : null);

  return (
    <form className="settings-form" onSubmit={submit} noValidate>
      <fieldset className="settings-group">
        <legend>Identidad</legend>
        <div className="settings-grid">
          <div className={`settings-field${errors.name ? ' is-invalid' : ''}`}>
            <label htmlFor="settings-name">Nombre de la promoción <span aria-hidden="true">*</span><span className="visually-hidden-label">(obligatorio)</span></label>
            <input
              id="settings-name" ref={nameRef} type="text" className="form-control"
              value={form.name} onChange={(e) => set('name', e.target.value)}
              aria-invalid={!!errors.name} aria-describedby={errors.name ? 'err-name settings-name-hint' : 'settings-name-hint'}
            />
            <span className="settings-hint" id="settings-name-hint">Se ve en el menú, en las migas y en el portal del estudiante.</span>
            {fieldError('name')}
          </div>
          <div className="settings-field settings-field-wide">
            <label htmlFor="settings-desc">Descripción</label>
            <textarea id="settings-desc" className="form-control" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
        </div>
      </fieldset>

      <fieldset className="settings-group">
        <legend>Fechas y jornada</legend>
        <div className="settings-grid">
          <div className="settings-field">
            <label htmlFor="settings-start">Fecha de inicio</label>
            <input id="settings-start" type="date" className="form-control" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
          </div>
          <div className={`settings-field${errors.endDate ? ' is-invalid' : ''}`}>
            <label htmlFor="settings-end">Fecha de fin</label>
            <input
              id="settings-end" type="date" className="form-control" value={form.endDate}
              onChange={(e) => set('endDate', e.target.value)}
              aria-invalid={!!errors.endDate} aria-describedby={errors.endDate ? 'err-endDate' : undefined}
            />
            {fieldError('endDate')}
          </div>
          <div className={`settings-field${errors.weeks ? ' is-invalid' : ''}`}>
            <label htmlFor="settings-weeks">Número de semanas <span aria-hidden="true">*</span><span className="visually-hidden-label">(obligatorio)</span></label>
            <input
              id="settings-weeks" ref={semanasRef} type="number" min={1} className="form-control"
              value={form.weeks} onChange={(e) => set('weeks', e.target.value)}
              aria-invalid={!!errors.weeks} aria-describedby={errors.weeks ? 'err-weeks' : undefined}
            />
            {fieldError('weeks')}
          </div>
          <div className="settings-field">
            <label htmlFor="settings-total">Horas objetivo de la titulación</label>
            <input id="settings-total" type="number" min={1} className="form-control" placeholder="ej. 1250" value={form.totalHours} onChange={(e) => set('totalHours', e.target.value)} aria-describedby="settings-total-hint" />
            <span className="settings-hint" id="settings-total-hint">Contra esto se compara el cómputo de horas del roadmap.</span>
          </div>
          <div className={`settings-field${errors.hoursPerDay ? ' is-invalid' : ''}`}>
            <label htmlFor="settings-hpd">Horas lectivas por día</label>
            <input
              id="settings-hpd" ref={jornadaRef} type="number" min={0.5} step={0.5} className="form-control"
              placeholder="ej. 7.5" value={form.hoursPerDay} onChange={(e) => set('hoursPerDay', e.target.value)}
              aria-invalid={!!errors.hoursPerDay} aria-describedby={errors.hoursPerDay ? 'err-hoursPerDay settings-hpd-hint' : 'settings-hpd-hint'}
            />
            <span className="settings-hint" id="settings-hpd-hint">7,5 son siete horas y media. Si se deja vacío se mantiene la jornada actual.</span>
            {fieldError('hoursPerDay')}
          </div>
        </div>
      </fieldset>

      <fieldset className="settings-group">
        <legend>Días lectivos y festivos</legend>
        <div className={`settings-field${errors.workingDays ? ' is-invalid' : ''}`}>
          <span className="settings-label" id="settings-days-label">Días de clase</span>
          <div className="settings-days" role="group" aria-labelledby="settings-days-label" aria-describedby={errors.workingDays ? 'err-workingDays' : undefined}>
            {DAYS.map(d => (
              <label key={d.value} htmlFor={`settings-day-${d.value}`} className={form.workingDays.includes(d.value) ? 'is-on' : ''}>
                <input
                  id={`settings-day-${d.value}`} type="checkbox" className="form-check-input"
                  checked={form.workingDays.includes(d.value)} onChange={() => toggleDay(d.value)}
                />
                {d.label}
              </label>
            ))}
          </div>
          {fieldError('workingDays')}
        </div>
        <p className="settings-hint mt-3 mb-0">
          {holidayCount === 1 ? '1 festivo cargado' : `${holidayCount} festivos cargados`} en esta promoción.{' '}
          <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={() => w().goToPromotionDestination?.('planificacion', 'roadmap')}>
            Verlos en el Roadmap
          </button>
        </p>
      </fieldset>

      <div className="settings-foot">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <button type="button" className="btn btn-outline-secondary" onClick={() => w().goToPromotionDestination?.('inicio')}>
          Cancelar
        </button>
        <button type="button" className="btn btn-outline-danger settings-delete" onClick={() => w().openDeletePromotionModal?.()}>
          <i className="bi bi-trash me-1" aria-hidden="true" />Eliminar promoción
        </button>
      </div>

      {/* Lectores de pantalla: guardado, error o validación fallida */}
      <p className="settings-status" role="status" aria-live="polite">{status}</p>
    </form>
  );
}
