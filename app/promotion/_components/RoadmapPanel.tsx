'use client';

/**
 * RoadmapPanel.tsx — sub-tab "Roadmap" (Roadmap & Módulos) de Contenido del Programa
 * (spec 0014 Fase C).
 *
 * 10º bloque extraído del orquestador. Reemplaza el contenido del pane #program-details-roadmap
 * (cabecera + #modules-list + #gantt-table) que vivía en body.ts por un componente React montado
 * por portal.
 *
 * Patrón "markup en React, lógica legacy por id" (como ScheduleSettings/VirtualClassroomPanel): el
 * roadmap es muy acoplado (gantt con botones de edición inline, drag, navegación). En vez de
 * replicar generateGanttChart (cientos de líneas), React solo renderiza el MARKUP conservando los
 * ids legacy (#modules-list, #gantt-container) y el orquestador los puebla:
 *  - loadModules() (fetch promo + displayModules + generateGanttChart) los rellena por id.
 *  - Los controles llaman a window.openEmployabilityModal / openModuleModal.
 *  - Fase 6 (dhtmlx-gantt-roadmap): el toggle "Mostrar Empleabilidad" se quitó — la empleabilidad
 *    ya no se pinta en el Gantt DHTMLX desde la Fase 2 (TASK-7), así que el toggle no tenía efecto.
 *    El botón "Sesiones Empleabilidad" se conserva: gestiona los datos (modal), algo independiente
 *    de si se muestran o no en el Gantt.
 *  - #modules-list (cuyo render de tarjetas está comentado en el legacy → casi siempre vacío) y
 *    #gantt-table los puebla el legacy vía innerHTML → se renderizan vacíos y el componente no
 *    re-renderiza (sin estado) → no hay pelea de reconciliación.
 *
 * displayModules/generateGanttChart NO eran null-safe (tocaban .innerHTML sin guard) → se añadieron
 * guards en el orquestador. Como el roadmap es la pestaña por defecto, loadModules puede correr antes
 * de montar el portal (→ no-op por los guards); por eso React llama a window.loadModules() en cuanto
 * está disponible (poll corto) para garantizar el render tras el montaje.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '@/lib/api';
import { useAsanaAccount, asanaAccountLabel, type AsanaAccount } from './AsanaAccount';
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function w(): any { return (typeof window !== 'undefined' ? window : {}) as unknown as any; }

// Ciudades con festivos automáticos: el backend carga los nacionales y autonómicos de su
// comunidad (Nager.Date) más los locales de la ciudad (backend/data/localHolidays.js).
const HOLIDAY_CITIES = [
  { key: 'madrid', label: 'Madrid' },
  { key: 'barcelona', label: 'Barcelona' },
  { key: 'oviedo', label: 'Oviedo (Asturias)' },
  { key: 'valencia', label: 'Valencia' },
  { key: 'malaga', label: 'Málaga' },
  { key: 'sevilla', label: 'Sevilla' },
];
// Nombre corto de la comunidad para la etiqueta de los festivos autonómicos.
const REGION_SHORT: Record<string, string> = {
  'ES-MD': 'Madrid', 'ES-CT': 'Cataluña', 'ES-AS': 'Asturias', 'ES-VC': 'C. Valenciana', 'ES-AN': 'Andalucía',
};

interface RegionalHoliday {
  date: string; name: string; national: boolean; regions: string[]; cities?: string[]; provisional?: boolean;
  /** Marcado a mano (clic derecho en Gantt/Asistencia), no cargado por ciudad. */
  manual?: boolean;
}

/**
 * Festivos marcados a mano: fechas de promotion.holidays que no vienen de "Cargar festivos"
 * (regionalHolidays). Su nombre, si el docente le puso uno, vive en promotion.holidayNames.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function manualHolidaysOf(promo: any): RegionalHoliday[] {
  if (!promo) return [];
  const auto = new Set((promo.regionalHolidays || []).map((h: RegionalHoliday) => h.date));
  const names = promo.holidayNames || {};
  return (promo.holidays || [])
    .filter((d: unknown): d is string => typeof d === 'string' && !auto.has(d))
    .map((date: string) => ({ date, name: names[date] || '', national: false, regions: [], manual: true }));
}

/** Nombre editable de un festivo marcado a mano; guarda al salir del campo o con Enter. */
function ManualHolidayName({ holiday, onSave }: { holiday: RegionalHoliday; onSave: (date: string, name: string) => Promise<void> }) {
  const [value, setValue] = useState(holiday.name);
  useEffect(() => setValue(holiday.name), [holiday.name]);
  const commit = () => {
    if (value.trim() !== holiday.name) onSave(holiday.date, value.trim());
  };
  return (
    <input
      type="text"
      className="holidays-summary-name-input"
      value={value}
      maxLength={120}
      placeholder="Añadir nombre…"
      aria-label={`Nombre del festivo del ${holiday.date}`}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') { setValue(holiday.name); e.stopPropagation(); }
      }}
    />
  );
}
interface MissingLocalData { city: string; year: number }

/** Agrupa festivos (ya ordenados por fecha) por mes: [["octubre 2026", [...]], ...]. */
function groupHolidaysByMonth(holidays: RegionalHoliday[]): [string, RegionalHoliday[]][] {
  const groups = new Map<string, RegionalHoliday[]>();
  for (const h of holidays) {
    const label = new Date(`${h.date}T00:00:00`).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    groups.set(label, [...(groups.get(label) || []), h]);
  }
  return [...groups.entries()];
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

export function RoadmapPanelHost() {
  const host = usePortalNode('program-details-roadmap');
  if (!host) return null;
  return createPortal(<RoadmapPanel />, host);
}

// Dropdown de exportación con estado propio (useState + click-fuera para cerrar) en vez de
// data-bs-toggle="dropdown": esta página no carga el JS de Bootstrap (solo su CSS), así que
// data-bs-toggle no hace nada por sí solo — se comprobó en vivo (window.bootstrap === undefined).
//
// Causa raíz real de "el menú no se abre" (reproducida en dev Y en el export estático de
// producción, en cualquier navegador — no es cosa de bloqueadores de anuncios): shared.js trae un
// shim de Bootstrap (_bootstrapJsShim) que, en CADA clic de la página, cierra todo
// `.dropdown-menu.show` cuyo disparador no tenga `data-bs-toggle="dropdown"` — mi botón React no
// lo tiene, así que el propio clic que abre el menú (vía setOpen(true) más arriba en la cadena)
// burbujea hasta `document` y el shim le quita `show` a la clase en el mismo evento, dejando
// aria-expanded="true" (lo último que tocó React) pero la clase sin "show" (lo último que tocó el
// shim). e.stopPropagation() en el botón evita que ESE clic llegue al listener del shim; los clics
// fuera del menú (que sí deben cerrarlo) no lo llevan y siguen funcionando via el propio listener
// de abajo (mousedown) y, redundantemente, via el shim.
//
// Se evita además la palabra "Descargar"/"Download" y el icono de flecha-hacia-abajo por si acaso:
// los bloqueadores de anuncios (Brave Shields, uBlock...) traen filtros cosméticos genéricos que
// ocultan botones así por parecerse al patrón de "botón de descarga falso" tan común en publicidad
// maliciosa — no era la causa real de este bug, pero es una defensa razonable de todos modos.
// Leyenda de colores por tipo de elemento — en la vista a pantalla completa la
// fila suelta de antes ocupaba espacio vertical valioso, así que pasa a un
// popover pequeño en la barra de herramientas. Mismos tokens
// --app-color-gantt-* que .gantt_task_line.gantt-task-* en promotion-detail.css.
function LegendPopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, [open]);
  const items: [string, string][] = [
    ['var(--app-color-gantt-module)', 'Módulo'],
    ['var(--app-color-gantt-course)', 'Curso'],
    ['var(--app-color-gantt-project)', 'Proyecto'],
    ['var(--app-color-gantt-leccion)', 'Lección'],
    ['var(--app-color-gantt-flexible)', 'Tiempo flexible'],
  ];
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm roadmap-tool"
        aria-expanded={open}
        aria-label="Leyenda de colores"
        title="Leyenda de colores"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
      >
        <i className="bi bi-palette" aria-hidden="true" />
      </button>
      {open && (
        <div
          className="roadmap-legend-popover"
          style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 1010 }}
        >
          {items.map(([c, label]) => (
            <span key={label} className="gantt-legend-item">
              <span className="gantt-legend-dot" style={{ background: c }} />{label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Festivos por comunidad autónoma: el docente elige una o varias comunidades y el backend
// (PUT /api/promotions/:id/holiday-regions) carga sus festivos para toda la duración del
// bootcamp, solo los que caen en días lectivos (workingDays). Se fusionan en promotion.holidays,
// así que el Gantt los sombrea y el Cómputo de horas los descuenta como los marcados a mano.
function HolidaysPopover() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [loaded, setLoaded] = useState<RegionalHoliday[]>([]);
  const [manual, setManual] = useState<RegionalHoliday[]>([]);
  const [excludedCount, setExcludedCount] = useState(0);
  const [missing, setMissing] = useState<MissingLocalData[]>([]);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const promo = w().currentPromotion;
    if (promo) {
      // Promos que cargaron festivos por comunidad antes de existir las ciudades: se preselecciona
      // la ciudad equivalente (Andalucía se omite porque puede ser Málaga o Sevilla).
      const REGION_TO_CITY: Record<string, string> = { 'ES-MD': 'madrid', 'ES-CT': 'barcelona', 'ES-AS': 'oviedo', 'ES-VC': 'valencia' };
      setSelected(
        promo.holidayCities?.length
          ? promo.holidayCities
          : (promo.holidayRegions || []).map((code: string) => REGION_TO_CITY[code]).filter(Boolean),
      );
      setLoaded(promo.regionalHolidays || []);
      setManual(manualHolidaysOf(promo));
      setExcludedCount((promo.excludedHolidays || []).length);
    }
    // Radix pinta el menú del dropdown en un portal fuera de `ref`: no cerrar el popover
    // cuando el clic cae dentro de ese menú.
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Element;
      if (ref.current?.contains(t) || t.closest?.('[role="menu"]')) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Panel lateral de festivos: se resincroniza con currentPromotion al abrirse y cada vez que
  // cambian los festivos desde fuera (clic derecho en Gantt/Asistencia → promotion-holidays-changed).
  useEffect(() => {
    const sync = () => {
      const p = w().currentPromotion;
      if (!p) return;
      setLoaded(p.regionalHolidays || []);
      setManual(manualHolidaysOf(p));
      setExcludedCount((p.excludedHolidays || []).length);
    };
    if (drawerOpen) sync();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false); };
    window.addEventListener('promotion-holidays-changed', sync);
    if (drawerOpen) document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('promotion-holidays-changed', sync);
      document.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen]);

  const toggle = (code: string) =>
    setSelected(cur => (cur.includes(code) ? cur.filter(c => c !== code) : [...cur, code]));

  // Quita un festivo de la promoción — mismo efecto que el clic derecho en el Gantt: PUT /holidays
  // sin esa fecha; el backend lo marca como excluido para que "Cargar festivos" no lo reañada.
  const removeHoliday = async (date: string) => {
    const promotionId = new URLSearchParams(window.location.search).get('id');
    const promo = w().currentPromotion;
    if (!promotionId || !promo) return;
    setRemoving(date);
    try {
      const holidays = (promo.holidays || []).filter((d: string) => d !== date);
      const r = await apiFetch(`/api/promotions/${promotionId}/holidays`, {
        method: 'PUT',
        body: JSON.stringify({ holidays }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const body = await r.json();
      Object.assign(promo, {
        regionalHolidays: body.regionalHolidays,
        excludedHolidays: body.excludedHolidays,
        holidayNames: body.holidayNames || {},
      });
      setLoaded(body.regionalHolidays);
      setExcludedCount(body.excludedHolidays.length);
      w().__applyPromotionHolidays?.(body.holidays);
      setManual(manualHolidaysOf(promo));
    } catch {
      w().showApiToast?.('No se pudo quitar el festivo', 'danger');
    }
    setRemoving(null);
  };

  // Pone (o quita, si llega vacío) el nombre de un festivo marcado a mano. No cambia qué días son festivos.
  const renameHoliday = async (date: string, name: string) => {
    const promotionId = new URLSearchParams(window.location.search).get('id');
    const promo = w().currentPromotion;
    if (!promotionId || !promo) return;
    try {
      const r = await apiFetch(`/api/promotions/${promotionId}/holidays`, {
        method: 'PUT',
        body: JSON.stringify({ holidays: promo.holidays || [], holidayNames: { [date]: name } }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const body = await r.json();
      promo.holidayNames = body.holidayNames || {};
      setManual(manualHolidaysOf(promo));
      window.dispatchEvent(new Event('promotion-holidays-changed'));
      w().showApiToast?.(name ? 'Nombre del festivo guardado' : 'Nombre del festivo quitado', 'success', 2000);
    } catch {
      w().showApiToast?.('No se pudo guardar el nombre del festivo', 'danger');
      setManual(manualHolidaysOf(promo));
    }
  };

  const allHolidays = [...loaded, ...manual].sort((a, b) => a.date.localeCompare(b.date));

  const save = async (resetExclusions = false) => {
    const promotionId = new URLSearchParams(window.location.search).get('id');
    if (!promotionId) return;
    setSaving(true);
    try {
      const r = await apiFetch(`/api/promotions/${promotionId}/holiday-regions`, {
        method: 'PUT',
        body: JSON.stringify({ cities: selected, resetExclusions }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        w().showApiToast?.(body.error || 'No se pudieron cargar los festivos', 'danger');
      } else {
        const promo = w().currentPromotion;
        if (promo) {
          Object.assign(promo, {
            holidayCities: body.holidayCities,
            holidayRegions: body.holidayRegions,
            regionalHolidays: body.regionalHolidays,
            excludedHolidays: body.excludedHolidays,
            holidayNames: body.holidayNames || {},
          });
        }
        setLoaded(body.regionalHolidays);
        setExcludedCount(body.excludedHolidays.length);
        setMissing(body.missingLocalData || []);
        w().__applyPromotionHolidays?.(body.holidays);
        setManual(manualHolidaysOf(promo));
        w().showApiToast?.(
          selected.length ? `${body.regionalHolidays.length} festivos en días lectivos cargados` : 'Festivos automáticos eliminados',
          'success',
        );
      }
    } catch {
      w().showApiToast?.('No se pudieron cargar los festivos', 'danger');
    }
    setSaving(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn btn-outline-secondary btn-sm roadmap-tool"
        aria-expanded={open}
        aria-label="Festivos del calendario"
        title="Festivos"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
      >
        <i className="bi bi-calendar-x" aria-hidden="true" />
      </button>
      {open && (
        <div
          className="roadmap-legend-popover"
          // .roadmap-legend-popover fuerza white-space:nowrap (pensado para la leyenda) → aquí se
          // restablece para que el texto de ayuda y la lista de festivos hagan salto de línea.
          style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 1010, width: 360, maxWidth: 'calc(100vw - 32px)', display: 'block', whiteSpace: 'normal' }}
        >
          <div className="fw-semibold small mb-2">Festivos de la ciudad</div>
          {/* Botón en la misma fila que el selector: el menú se despliega hacia abajo con el
              ancho del selector, así nunca tapa "Cargar". modal={false} permite pulsarlo con el
              menú aún abierto (en modo modal el primer clic fuera solo cierra el menú). */}
          <div className="d-flex gap-2 align-items-stretch">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button type="button" className="form-select form-select-sm text-start text-truncate flex-grow-1" style={{ minWidth: 0 }} aria-label="Ciudades">
                {selected.length === 0
                  ? <span className="text-muted">Selecciona una o varias…</span>
                  : HOLIDAY_CITIES.filter(c => selected.includes(c.key)).map(c => c.label).join(', ')}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-0" style={{ width: 'var(--radix-dropdown-menu-trigger-width)' }}>
              {HOLIDAY_CITIES.map(c => (
                <DropdownMenuCheckboxItem
                  key={c.key}
                  checked={selected.includes(c.key)}
                  onCheckedChange={() => toggle(c.key)}
                  // Mantiene el menú abierto para marcar varias ciudades seguidas
                  onSelect={e => e.preventDefault()}
                >
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button type="button" className="btn btn-primary btn-sm text-nowrap" onClick={() => save()} disabled={saving}>
            {saving ? 'Cargando…' : 'Cargar festivos'}
          </button>
          </div>
          <small className="text-muted d-block mt-2">
            Se cargan los festivos nacionales, autonómicos y locales de cada ciudad entre las fechas de la
            promoción que caen en días lectivos. Puedes quitar cualquiera desde la lista o con clic derecho
            en el Gantt.
          </small>
          {missing.length > 0 && (
            <div className="holidays-summary-note is-warning">
              <i className="bi bi-exclamation-triangle me-1" />
              Aún no hay festivos locales publicados para{' '}
              {missing.map(m => `${m.city} ${m.year}`).join(', ')}. Márcalos con clic derecho cuando se aprueben.
            </div>
          )}
          {excludedCount > 0 && (
            <div className="holidays-summary-note">
              {excludedCount === 1 ? '1 festivo quitado' : `${excludedCount} festivos quitados`} no se volverán a cargar ·{' '}
              <button type="button" className="holidays-summary-link" onClick={() => save(true)} disabled={saving}>
                Restaurar
              </button>
            </div>
          )}
          {allHolidays.length > 0 && (
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm w-100 mt-3"
              onClick={() => { setOpen(false); setDrawerOpen(true); }}
            >
              <i className="bi bi-layout-sidebar-inset-reverse me-1" />
              Ver {allHolidays.length === 1 ? '1 festivo' : `${allHolidays.length} festivos`}
            </button>
          )}
        </div>
      )}

      {/* Lista de festivos en el mismo panel lateral que el detalle de los elementos del Gantt
          (.roadmap-drawer de RoadmapDetailDrawer). Portal a <body> por el mismo motivo: no quedar
          atrapado por el transform del tab-pane. Siempre montado para que anime al abrir/cerrar. */}
      {createPortal(
        <aside
          className={`roadmap-drawer${drawerOpen ? ' is-open' : ''}`}
          aria-hidden={!drawerOpen}
          role="dialog"
          aria-label="Festivos"
        >
          <div className="roadmap-drawer-head">
            <div className="roadmap-drawer-eyebrow">
              <i className="bi bi-calendar-x" />Festivos
            </div>
            <button type="button" className="btn btn-sm btn-link roadmap-drawer-x" onClick={() => setDrawerOpen(false)} aria-label="Cerrar">
              <i className="bi bi-x-lg" />
            </button>
          </div>
          <div className="roadmap-drawer-body">
            <h5 className="roadmap-drawer-title">
              {allHolidays.length === 1 ? '1 festivo' : `${allHolidays.length} festivos`}
            </h5>
            <div className="holidays-drawer-stats">
              <span className="holidays-drawer-stat">{loaded.filter(h => h.national).length} nacionales</span>
              <span className="holidays-drawer-stat">{loaded.filter(h => !h.national && !h.cities?.length).length} autonómicos</span>
              <span className="holidays-drawer-stat">{loaded.filter(h => h.cities?.length).length} locales</span>
              {manual.length > 0 && <span className="holidays-drawer-stat">{manual.length} a mano</span>}
              {excludedCount > 0 && <span className="holidays-drawer-stat">{excludedCount} quitados</span>}
            </div>
            <p className="text-muted small mb-2">
              Los festivos que marcas con clic derecho en el Gantt o en Asistencia también aparecen aquí:
              escribe su nombre si quieres. Quita cualquier festivo con <i className="bi bi-x-lg" /> o con clic
              derecho: el día vuelve a ser lectivo.
            </p>
            {allHolidays.length === 0 ? (
              <p className="text-muted small mb-0">No hay festivos.</p>
            ) : (
              groupHolidaysByMonth(allHolidays).map(([month, items]) => (
                <section key={month}>
                  <div className="holidays-summary-month">{month}</div>
                  {items.map(h => {
                    const d = new Date(`${h.date}T00:00:00`);
                    return (
                      <div key={h.date} className="holidays-summary-row">
                        <div className="holidays-summary-date">
                          <span className="holidays-summary-day">{d.getDate()}</span>
                          <span className="holidays-summary-weekday">{d.toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                        </div>
                        <div className="holidays-summary-name">
                          {h.manual ? <ManualHolidayName holiday={h} onSave={renameHoliday} /> : h.name}
                        </div>
                        <span
                          className={`holidays-summary-badge${h.manual ? ' is-manual' : h.national ? ' is-national' : h.cities?.length ? ' is-local' : ''}`}
                          title={h.provisional ? 'Aprobado por el ayuntamiento, pendiente de publicación oficial' : undefined}
                        >
                          {h.manual
                            ? 'A mano'
                            : h.national
                              ? 'Nacional'
                              : h.cities?.length
                                ? `Local · ${h.cities.join(' · ')}${h.provisional ? ' (provisional)' : ''}`
                                : h.regions.map(c => REGION_SHORT[c] || c).join(' · ')}
                        </span>
                        <button
                          type="button"
                          className="holidays-summary-remove"
                          aria-label={`Quitar festivo ${h.name || h.date}`}
                          title="Quitar festivo (el día vuelve a ser lectivo)"
                          onClick={() => removeHoliday(h.date)}
                          disabled={removing === h.date}
                        >
                          <i className="bi bi-x-lg" />
                        </button>
                      </div>
                    );
                  })}
                </section>
              ))
            )}
          </div>
        </aside>,
        document.body,
      )}
    </div>
  );
}

// Exportar el roadmap a Asana como subtareas (docs/tasks/exportar-roadmap-asana.md).
// Requiere que el docente haya conectado su cuenta de Asana en Área del Docente ›
// Accesos. Al pulsar se comprueba el estado; si está conectado se pide la URL de
// la tarea padre y se exporta. IDEMPOTENTE (Fase 3): re-exportar actualiza las
// tareas ya creadas en vez de duplicar; prefija la última URL usada.
/**
 * Flujo de exportación a Asana. Antes traía su propio botón en la barra; ahora
 * lo lanza el menú "Más", que se cierra al elegir la opción, así que el
 * componente se monta fuera del menú y se le pide abrir con `requestOpen`.
 */
function AsanaExportFlow({ requestOpen, onHandled }: { requestOpen: boolean; onHandled: () => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [lastAt, setLastAt] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'checking' | 'running'>('idle');
  const [result, setResult] = useState<{ ok: boolean; text: string; link?: string } | null>(null);

  const start = async () => {
    setPhase('checking');
    setResult(null);
    try {
      const s = await w().asanaGetStatus?.();
      if (!s?.configured) {
        w().showToast?.('La integración con Asana no está activada en el servidor.', 'warning');
        setPhase('idle');
        return;
      }
      if (!s?.connected) {
        w().showToast?.('Conecta tu cuenta de Asana primero (Área del Docente › Accesos).', 'warning');
        setPhase('idle');
        return;
      }
      try {
        const info = await w().asanaGetExportInfo?.();
        if (info?.exported) {
          if (info.parentTaskUrl && !url) setUrl(info.parentTaskUrl);
          setLastAt(info.lastExportedAt || null);
        }
      } catch { /* prefijado opcional */ }
      setOpen(true);
      setPhase('idle');
    } catch {
      w().showToast?.('No se pudo comprobar la conexión con Asana.', 'danger');
      setPhase('idle');
    }
  };

  const run = async () => {
    if (!url.trim()) return;
    setPhase('running');
    setResult(null);
    try {
      const r = await w().exportRoadmapToAsana?.(url.trim());
      const errs = Array.isArray(r?.errors) ? r.errors.length : 0;
      const orphans = Array.isArray(r?.orphans) ? r.orphans.length : 0;
      const parts = [`Creadas ${r?.created ?? 0}`, `actualizadas ${r?.updated ?? 0}`];
      if (orphans) parts.push(`${orphans} ya no están en el roadmap (revísalas en Asana)`);
      if (errs) parts.push(`${errs} con error`);
      setResult({
        ok: true,
        text: (r?.parentChanged ? 'Tarea padre nueva: se creó todo de cero. ' : '') + parts.join(' · ') + '.',
        link: r?.parentTaskUrl,
      });
      setLastAt(new Date().toISOString());
    } catch (e) {
      const err = e as { code?: string; message?: string };
      const msg = err?.code === 'asana_not_connected'
        ? 'Tu cuenta de Asana ya no está conectada. Vuelve a conectarla en Accesos.'
        : err?.code === 'asana_not_configured'
          ? 'La integración con Asana no está activada en el servidor.'
          : (err?.message || 'No se pudo exportar a Asana.');
      setResult({ ok: false, text: msg });
    }
    setPhase('idle');
  };

  const close = () => { setOpen(false); setResult(null); setPhase('idle'); };

  useEffect(() => {
    if (!requestOpen) return;
    let vivo = true;
    (async () => { await start(); if (vivo) onHandled(); })();
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestOpen]);

  return (
    <>
      {open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: 'fixed', inset: 0, zIndex: 1060, background: 'rgba(17,24,39,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseDown={(e) => { if (e.target === e.currentTarget && phase !== 'running') close(); }}
        >
          <div style={{ background: '#fff', borderRadius: 12, width: 460, maxWidth: '92vw', boxShadow: '0 20px 50px rgba(17,24,39,.25)', padding: '20px 22px' }}>
            <h6 className="mb-1"><i className="bi bi-kanban me-2" />Exportar roadmap a Asana</h6>
            <p className="text-muted small mb-3">
              Pega la URL de la tarea de Asana bajo la que colgar el roadmap. Se
              creará una subtarea por módulo y una sub-subtarea por
              curso/proyecto/lección, con fechas. Si ya exportaste antes a esa
              misma tarea, se actualizan las subtareas existentes en vez de
              duplicarlas.
            </p>
            {lastAt && (
              <p className="text-muted small mb-3">
                Última exportación:{' '}
                {new Date(lastAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}
            <label className="form-label small fw-semibold">URL de la tarea de Asana</label>
            <input
              type="url"
              className="form-control form-control-sm"
              placeholder="https://app.asana.com/0/…/…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={phase === 'running'}
              autoFocus
            />

            {result && (
              <div className={`alert ${result.ok ? 'alert-success' : 'alert-warning'} small mt-3 mb-0 p-2`}>
                {result.text}
                {result.ok && result.link && (
                  <> <a href={result.link} target="_blank" rel="noopener noreferrer">Abrir en Asana →</a></>
                )}
              </div>
            )}

            <div className="d-flex gap-2 justify-content-end mt-3">
              <button type="button" className="btn btn-outline-secondary btn-sm" disabled={phase === 'running'} onClick={close}>
                {result?.ok ? 'Cerrar' : 'Cancelar'}
              </button>
              {!result?.ok && (
                <button type="button" className="btn btn-primary btn-sm" disabled={phase === 'running' || !url.trim()} onClick={run}>
                  {phase === 'running'
                    ? <><span className="spinner-border spinner-border-sm me-1" role="status" />Exportando…</>
                    : <><i className="bi bi-box-arrow-up-right me-1" />Exportar</>}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}


// ── Barra de periodo: "Hoy · ‹ › · título" ──────────────────────────────────
// El mismo orden que un calendario: primero cómo moverte, luego dónde estás. El
// título es una región viva para que un lector de pantalla cante el periodo al
// cambiarlo, sin robar el foco de las flechas.
const VIEW_LABELS: Record<string, string> = {
  day: 'Día',
  week: 'Semana',
  month: 'Mes',
  all: 'Todo el bootcamp',
};

interface PeriodState { view: string; label: string; canStep: boolean; isEmpty?: boolean }

function useGanttPeriod(): PeriodState {
  const [state, setState] = useState<PeriodState>({ view: 'all', label: '', canStep: false, isEmpty: false });
  useEffect(() => {
    const onChange = (e: Event) => setState((e as CustomEvent<PeriodState>).detail);
    window.addEventListener('gantt-period-changed', onChange);
    // El Gantt puede haberse montado antes que esta barra: le pedimos su estado.
    const t = setInterval(() => { if (w().emitGanttPeriod) { w().emitGanttPeriod(); clearInterval(t); } }, 120);
    const stop = setTimeout(() => clearInterval(t), 8000);
    return () => { window.removeEventListener('gantt-period-changed', onChange); clearInterval(t); clearTimeout(stop); };
  }, []);
  return state;
}

function RoadmapPeriodNav() {
  const { label, canStep } = useGanttPeriod();
  return (
    <div className="roadmap-period">
      <button type="button" className="btn btn-outline-secondary btn-sm roadmap-today" onClick={() => w().ganttGoToToday?.()}>
        Hoy
      </button>
      <span className="roadmap-steps">
        <button
          type="button"
          className="roadmap-step"
          onClick={() => w().ganttStepPeriod?.(-1)}
          disabled={!canStep}
          aria-label="Periodo anterior"
          title="Periodo anterior"
        >
          <i className="bi bi-chevron-left" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="roadmap-step"
          onClick={() => w().ganttStepPeriod?.(1)}
          disabled={!canStep}
          aria-label="Periodo siguiente"
          title="Periodo siguiente"
        >
          <i className="bi bi-chevron-right" aria-hidden="true" />
        </button>
      </span>
      <h3 className="roadmap-period-label" aria-live="polite">{label}</h3>
    </div>
  );
}

// ── Selector de vista: un desplegable, no tres botones sueltos ──────────────
function ViewPicker() {
  const { view } = useGanttPeriod();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="btn btn-outline-secondary btn-sm" aria-label={`Vista: ${VIEW_LABELS[view] || 'Semana'}`}>
          {VIEW_LABELS[view] || 'Semana'}
          <i className="bi bi-chevron-down roadmap-caret" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={view} onValueChange={(v) => w().setGanttView?.(v)}>
          <DropdownMenuRadioItem value="day">Día</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="week">Semana</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="month">Mes</DropdownMenuRadioItem>
          <DropdownMenuSeparator />
          <DropdownMenuRadioItem value="all">Todo el bootcamp</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Menú "Más": lo que se usa de vez en cuando ──────────────────────────────
// Sustituye a los botones sueltos de Empleabilidad, Google Calendar, Exportar y
// Asana. Se agrupan por lo que hacen: preparar el roadmap, llevárselo a otra
// herramienta o descargarlo.
function RoadmapMoreMenu({ onAsana, asana }: { onAsana: () => void; asana: AsanaAccount }) {
  const conectada = !!asana.status?.connected;
  const sinIntegracion = asana.status != null && !asana.status.configured;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="btn btn-outline-secondary btn-sm roadmap-more" aria-label="Más opciones del roadmap" title="Más opciones">
          <i className="bi bi-three-dots" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Contenido</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => w().openEmployabilityModal?.()}>
          <i className="bi bi-briefcase me-2" aria-hidden="true" />Sesiones de empleabilidad
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Llevarlo a otra herramienta</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => w().syncRoadmapGoogleCalendar?.()}>
          <i className="bi bi-google me-2" aria-hidden="true" />Sincronizar con Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAsana}>
          <i className="bi bi-kanban me-2" aria-hidden="true" />Exportar a Asana
        </DropdownMenuItem>

        {/* La cuenta es de cada docente, no de la promoción, pero vive aquí
            porque exportar el roadmap es lo único para lo que sirve. */}
        <DropdownMenuLabel className="roadmap-menu-note">
          Mi cuenta de Asana: {asanaAccountLabel(asana.status)}
        </DropdownMenuLabel>
        {!sinIntegracion && (conectada ? (
          <DropdownMenuItem onClick={asana.disconnect} disabled={asana.busy}>
            <i className="bi bi-x-circle me-2" aria-hidden="true" />Desconectar mi cuenta
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={asana.connect} disabled={asana.busy || asana.status == null}>
            <i className="bi bi-box-arrow-up-right me-2" aria-hidden="true" />
            {asana.busy ? 'Esperando a Asana…' : 'Conectar mi cuenta'}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Descargar</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => w().exportRoadmap?.('png')}>
          <i className="bi bi-file-earmark-image me-2" aria-hidden="true" />Imagen (PNG)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => w().exportRoadmap?.('pdf')}>
          <i className="bi bi-file-earmark-pdf me-2" aria-hidden="true" />PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => w().exportRoadmap?.('xlsx')}>
          <i className="bi bi-file-earmark-excel me-2" aria-hidden="true" />Excel (XLSX)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => w().exportRoadmap?.('ics')}>
          <i className="bi bi-calendar-event me-2" aria-hidden="true" />Calendario (.ics)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Un periodo sin nada deja el Gantt en blanco y parece que se ha roto. En vez
 * de un hueco mudo, se dice qué pasa y se ofrece la salida.
 */
function RoadmapEmptyPeriod() {
  const { view, label, isEmpty } = useGanttPeriod();
  if (!isEmpty) return null;
  const cuando = view === 'day' ? 'Ese día' : view === 'week' ? 'Esa semana' : 'Ese mes';
  return (
    <p className="roadmap-empty" role="status">
      <i className="bi bi-calendar2-x" aria-hidden="true" />
      <span>{cuando} no hay nada en el roadmap.<br /><span className="roadmap-empty-when">{label}</span></span>
      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => w().setGanttView?.('all')}>
        Ver todo el bootcamp
      </button>
    </p>
  );
}

function RoadmapPanel() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [asanaRequested, setAsanaRequested] = useState(false);
  // El menú se cierra al elegir, así que el estado de la cuenta y la espera del
  // popup viven aquí, en el panel, que sigue montado.
  const asana = useAsanaAccount();

  // Tras montar, dispara el render legacy del roadmap. loadModules() puede no estar definido aún
  // (carga de promotion-detail.js) → poll corto hasta que exista y se llama una vez.
  useEffect(() => {
    let tries = 0;
    const iv = setInterval(() => {
      tries += 1;
      if (typeof w().loadModules === 'function') { w().loadModules(); clearInterval(iv); }
      else if (tries > 40) clearInterval(iv);
    }, 100);
    return () => clearInterval(iv);
  }, []);

  // Rediseño "Gantt a pantalla completa" (docs/tasks/gantt-pantalla-completa-drawer.md):
  // el diagrama ocupa TODO el alto disponible bajo las pestañas — sin la caja de
  // 500px con overflow:auto que sumaba una tercera barra de scroll. Las únicas
  // barras son las internas de DHTMLX (una vertical de filas, una horizontal de
  // línea de tiempo). Aquí solo se mide el alto: `--roadmap-h` en el wrapper la
  // consume el CSS (.roadmap-fullbleed). El ancho lo rompe el CSS con márgenes
  // negativos contra el padding de <main>.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const fit = () => {
      // Pestaña oculta (display:none del tab-pane) → getBoundingClientRect da 0.
      if (!wrap.offsetParent) return;
      const top = wrap.getBoundingClientRect().top;
      if (top <= 0) return;
      // El min-height/padding-bottom de <main> los neutraliza el CSS con :has()
      // mientras esta pestaña está activa, así que basta restar al alto del
      // viewport la distancia desde arriba + un colchón pequeño.
      const h = Math.max(360, Math.round(window.innerHeight - top - 6));
      if (wrap.style.getPropertyValue('--roadmap-h') !== h + 'px') {
        wrap.style.setProperty('--roadmap-h', h + 'px');
        const g = w().gantt;
        if (g) { g.setSizes?.(); g.render?.(); }
      }
    };
    fit();
    window.addEventListener('resize', fit);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(document.documentElement);
    // Cubre el caso "se abre la pestaña Roadmap después" (el pane pasa de
    // display:none a block y recién entonces top es real) y layout asíncrono.
    const iv = setInterval(fit, 500);
    const stopper = setTimeout(() => clearInterval(iv), 6000);
    w().__fitRoadmapGantt = fit;
    return () => {
      window.removeEventListener('resize', fit);
      ro?.disconnect();
      clearInterval(iv);
      clearTimeout(stopper);
      if (w().__fitRoadmapGantt === fit) delete w().__fitRoadmapGantt;
    };
  }, []);

  return (
    <div className="roadmap-fullbleed" ref={wrapRef}>
      {/* Barra del roadmap con el orden de un calendario: a la izquierda cómo
          moverte y dónde estás; a la derecha la acción principal, el selector de
          vista y un menú con lo que se usa de vez en cuando. Antes eran doce
          botones al mismo nivel repartidos en tres filas. */}
      <div className="roadmap-toolbar">
        <RoadmapPeriodNav />
        <div className="roadmap-toolbar-group roadmap-toolbar-group--end">
          <LegendPopover />
          <HolidaysPopover />
          <button type="button" className="btn btn-primary btn-sm" onClick={() => w().openModuleModal?.()}>
            <i className="bi bi-plus-lg" aria-hidden="true" />Módulo
          </button>
          <ViewPicker />
          <RoadmapMoreMenu onAsana={() => setAsanaRequested(true)} asana={asana} />
        </div>
      </div>

      {/* Fuera del menú a propósito: el menú se cierra al elegir y se llevaría
          por delante el diálogo. */}
      <AsanaExportFlow requestOpen={asanaRequested} onHandled={() => setAsanaRequested(false)} />

      <RoadmapEmptyPeriod />

      {/* Lista de tarjetas de módulo: su render está comentado en el legacy
          (displayModules) → casi siempre vacía. Se mantiene en el DOM oculta para
          no romper los `document.getElementById('modules-list')` del orquestador. */}
      <div id="modules-list" hidden />

      {/* Lo puebla el legacy (generateGanttChart → DHTMLX Gantt). Sin height ni
          overflow inline: el alto lo da .roadmap-fullbleed (flex:1) y el scroll
          es 100% interno de DHTMLX. */}
      <div id="gantt-container" className="roadmap-gantt-fill" />
    </div>
  );
}
