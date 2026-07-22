'use client';

/**
 * CalendarSettings.tsx — sub-tab "Calendario" de Contenido del Programa (spec 0014 Fase C).
 *
 * Primer bloque extraído del orquestador promotion-detail.js. Reemplaza el form
 * #calendar-form + #calendar-preview (config de Google Calendar) que vivía en body.ts
 * y se poblaba/guardaba imperativamente. Se monta por createPortal en el tab-pane
 * #program-details-calendar (vaciado en body.ts).
 *
 * El orquestador conserva loadOverviewCalendarId/setupCalendarPreview (preview del
 * dashboard Overview) y currentCalendarId intactos; aquí solo gestionamos el form de
 * configuración (GET/POST /api/promotions/:id/calendar), igual que hacía el legacy.
 */

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '@/lib/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function w(): any { return window as unknown as any; }

function toast(message: string, type: 'success' | 'danger' | 'warning' = 'success') {
  const ww = w();
  if (typeof ww.showApiToast === 'function') ww.showApiToast(message, type);
}

// Sondeo persistente del host (vive dentro del HTML legacy inyectado; el tab-pane
// puede mostrarse/ocultarse, pero el nodo persiste tras montarse body.ts).
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

export function CalendarSettingsHost() {
  const [promotionId, setPromotionId] = useState<string | null>(null);
  useEffect(() => { setPromotionId(new URLSearchParams(window.location.search).get('id')); }, []);
  const host = usePortalNode('program-details-calendar');
  if (!host || !promotionId) return null;
  return createPortal(<CalendarSettings promotionId={promotionId} />, host);
}

function CalendarSettings({ promotionId }: { promotionId: string }) {
  const [calendarId, setCalendarId] = useState('');
  const [appointmentUrl, setAppointmentUrl] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await apiFetch(`/api/promotions/${promotionId}/calendar`);
      if (r.ok) {
        const c = await r.json();
        setCalendarId(c.googleCalendarId || '');
        setAppointmentUrl(c.googleAppointmentUrl || '');
        if (c.googleCalendarId) setShowPreview(true);
      }
      // 404 (sin calendario configurado) → se dejan los campos vacíos, como el legacy.
    } catch {
      /* noop */
    }
  }, [promotionId]);

  useEffect(() => { load(); }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = calendarId.trim();
    if (!id) { toast('Por favor, introduce un Google Calendar ID', 'warning'); return; }
    setSaving(true);
    try {
      const r = await apiFetch(`/api/promotions/${promotionId}/calendar`, {
        method: 'POST',
        body: JSON.stringify({ googleCalendarId: id, googleAppointmentUrl: appointmentUrl.trim() || null }),
      });
      if (r.ok) { setShowPreview(true); toast('Calendario guardado correctamente', 'success'); }
      else { toast('Error al guardar el calendario', 'danger'); }
    } catch (err) {
      console.error('[CalendarSettings] save:', err);
      toast('Error al guardar el calendario', 'danger');
    }
    setSaving(false);
  };

  const embedSrc = calendarId.trim()
    ? `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId.trim())}&ctz=Europe/Madrid`
    : '';

  return (
    <>
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Configuración del Calendario</h5>
          <form onSubmit={save}>
            <div className="mb-3">
              <label className="form-label">Google Calendar ID</label>
              <input
                type="text"
                className="form-control"
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
                placeholder="your-calendar@group.calendar.google.com"
              />
              <small className="text-muted">Encuentra el Google Calendar ID en las configuraciones de Google Calendar</small>
            </div>
            <div className="mb-3">
              <label className="form-label">URL de citas (Google Calendar)</label>
              <input
                type="url"
                className="form-control"
                value={appointmentUrl}
                onChange={(e) => setAppointmentUrl(e.target.value)}
                placeholder="https://calendar.google.com/calendar/appointments/..."
              />
              <small className="text-muted">URL de la página de reserva de citas de Google Calendar. Si se configura, se mostrará un botón de reserva en la vista del estudiante.</small>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>Guardar calendario</button>
          </form>
        </div>
      </div>
      {showPreview && embedSrc && (
        <div className="mt-4">
          <h5>Previsualización del calendario</h5>
          <div className="ratio ratio-16x9">
            {/* eslint-disable-next-line jsx-a11y/iframe-has-title */}
            <iframe src={embedSrc} title="Previsualización del calendario" />
          </div>
        </div>
      )}
    </>
  );
}
