'use client';

/**
 * RoadmapDetailDrawer.tsx — panel lateral de detalle del Gantt (rediseño
 * "Gantt a pantalla completa", docs/tasks/gantt-pantalla-completa-drawer.md).
 *
 * Estilo Asana: al hacer clic en una barra/fila del Gantt se abre por la
 * derecha, SIN modal centrado que tape el diagrama y sin oscurecer el fondo.
 * Muestra la ficha del elemento y permite editar en el sitio los campos
 * básicos (nombre/título, fechas, URL, tipo de lección). Para competencias y
 * enlaces enlaza al modal completo (window.openItemEditModal).
 *
 * Cableado:
 *  - promotion-detail.js (bindGanttEditingEvents) → onTaskClick →
 *    window.__openRoadmapDrawer(task).
 *  - Guardar → window.persistRoadmapItemEdit(task, fields) (mismo PUT +
 *    loadModules que el modal).
 *  - Se monta por portal en <body> para no quedar atrapado por el transform
 *    del tab-pane (#program-details-content .tab-pane { animation: fadeIn }).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function w(): any { return (typeof window !== 'undefined' ? window : {}) as unknown as any; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GanttTask = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Item = any;

const TYPE_LABEL: Record<string, string> = {
  course: 'Curso', project: 'Proyecto', leccion: 'Lección',
  module: 'Módulo', 'leccion-group': 'Grupo de lecciones',
};
const TYPE_COLOR: Record<string, string> = {
  course: 'var(--app-color-gantt-course)',
  project: 'var(--app-color-gantt-project)',
  leccion: 'var(--app-color-gantt-leccion)',
  module: 'var(--app-color-gantt-module)',
  'leccion-group': 'var(--app-color-gantt-leccion)',
};

function isoToday() { return new Date().toISOString().slice(0, 10); }

function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!m) return '—';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

// Días lectivos entre dos ISO (ambos inclusive), según workingDays + holidays
// de la promoción — mismo criterio que el Gantt. Inline y pequeño para no
// depender de helpers que aún viven en otra rama.
function lectiveDays(startIso: string, endIso: string): number {
  const pm = w().currentPromotion || {};
  const wd: number[] = Array.isArray(pm.workingDays) && pm.workingDays.length ? pm.workingDays : [1, 2, 3, 4, 5];
  const wdSet = new Set(wd.map(Number));
  const hol = new Set(Array.isArray(pm.holidays) ? pm.holidays : []);
  const p = (s: string) => { const x = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); return x ? new Date(+x[1], +x[2] - 1, +x[3]) : null; };
  const a = p(startIso), b = p(endIso);
  if (!a || !b || b < a) return 0;
  let n = 0;
  const cur = new Date(a.getTime());
  while (cur <= b) {
    const y = cur.getFullYear(), mm = String(cur.getMonth() + 1).padStart(2, '0'), dd = String(cur.getDate()).padStart(2, '0');
    if (wdSet.has(cur.getDay()) && !hol.has(`${y}-${mm}-${dd}`)) n++;
    cur.setDate(cur.getDate() + 1);
  }
  return n;
}

// Localiza el item de dominio para una tarea del Gantt (mismo criterio que
// openItemEditModal), leyendo de window.currentPromotion (ya cargada).
function itemForTask(task: GanttTask): { item: Item | null; moduleName: string } {
  const pm = w().currentPromotion;
  const module = pm && Array.isArray(pm.modules) ? pm.modules[task.moduleIndex] : null;
  if (!module) return { item: null, moduleName: '' };
  const moduleName = module.name || 'Módulo';
  if (task.itemType === 'module' || task.itemType === 'leccion-group') {
    return { item: { name: task.text || moduleName, startDate: module.startDate, endDate: module.endDate }, moduleName };
  }
  let item: Item | null = null;
  if (Array.isArray(module.plannerItems) && module.plannerItems.length && task.plannerItemId) {
    item = module.plannerItems.find((i: Item) => i.id === task.plannerItemId) || null;
  }
  if (!item && task.itemType !== 'leccion') {
    const list = task.itemType === 'course' ? module.courses : module.projects;
    const raw = Array.isArray(list) ? list[task.legacyIndex] : null;
    if (raw != null) item = (typeof raw === 'object' && raw) ? raw : { name: String(raw) };
  }
  return { item, moduleName };
}

function competenceNames(ids: string[]): string[] {
  const catalog: Item[] = w()._extendedInfoCompetences || w()._extendedInfoData?.competences || [];
  const byId = new Map<string, string>();
  (Array.isArray(catalog) ? catalog : []).forEach((c: Item) => byId.set(c.id, c.name || c.title || c.id));
  return (ids || []).map((id) => byId.get(id) || id);
}

export function RoadmapDetailDrawerHost() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(<RoadmapDetailDrawer />, document.body);
}

function RoadmapDetailDrawer() {
  const [task, setTask] = useState<GanttTask | null>(null);
  const [saving, setSaving] = useState(false);
  // campos editables
  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [url, setUrl] = useState('');
  const [lessonType, setLessonType] = useState('teorica');

  const load = useCallback((t: GanttTask) => {
    const { item } = itemForTask(t);
    setTask(t);
    if (!item) { setName(t?.text || ''); setStart(''); setEnd(''); setUrl(''); return; }
    const isLesson = t.itemType === 'leccion';
    setName((isLesson ? item.title : item.name) || t.text || '');
    setStart(typeof item.startDate === 'string' ? item.startDate.slice(0, 10) : '');
    setEnd(typeof item.endDate === 'string' ? item.endDate.slice(0, 10) : '');
    setUrl(item.url || '');
    setLessonType(item.lessonType || 'teorica');
  }, []);

  useEffect(() => {
    w().__openRoadmapDrawer = (t: GanttTask) => load(t);
    return () => { if (w().__openRoadmapDrawer) delete w().__openRoadmapDrawer; };
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setTask(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const close = () => setTask(null);

  const type: string = task?.itemType || 'course';
  const isLesson = type === 'leccion';
  const isProject = type === 'project';
  const isModuleLike = type === 'module' || type === 'leccion-group';
  const editable = !isModuleLike;

  const { item, moduleName } = useMemo(
    () => (task ? itemForTask(task) : { item: null, moduleName: '' }),
    [task],
  );

  const days = start && end ? lectiveDays(start, end) : 0;
  const hoursPerDay = Number(w().currentPromotion?.hoursPerDay);
  const perDay = Number.isFinite(hoursPerDay) && hoursPerDay > 0 ? hoursPerDay : 7;
  const hasHoursPerDay = Number.isFinite(hoursPerDay) && hoursPerDay > 0;

  const comps = isProject ? competenceNames(item?.competenceIds || []) : [];
  const links: Item[] = isLesson && Array.isArray(item?.links) ? item.links : [];

  const save = async () => {
    if (!task || !editable) return;
    if (!start || !end) { w().showApiToast?.('Indica fecha de inicio y fin.', 'warning'); return; }
    if (end < start) { w().showApiToast?.('La fecha de fin no puede ser anterior a la de inicio.', 'warning'); return; }
    setSaving(true);
    const fields: Record<string, string> = { startDate: start, endDate: end };
    if (isLesson) { fields.title = name.trim(); fields.lessonType = lessonType; }
    else { fields.name = name.trim(); fields.url = url.trim(); }
    const r = await (w().persistRoadmapItemEdit?.(task, fields) ?? Promise.resolve({ ok: false, error: 'No disponible' }));
    setSaving(false);
    if (r?.ok) { w().showApiToast?.('Elemento actualizado', 'success'); close(); }
    else { w().showApiToast?.(r?.error || 'No se pudo guardar', 'danger'); }
  };

  const openFullModal = () => { const t = task; close(); w().openItemEditModal?.(t); };
  const openModuleEdit = () => { const mid = task?.moduleId; close(); if (mid) w().editModule?.(mid); };

  const open = !!task;
  const accentColor = TYPE_COLOR[type] || 'var(--app-color-gantt-course)';

  return (
    <aside className={`roadmap-drawer${open ? ' is-open' : ''}`} aria-hidden={!open} role="dialog" aria-label="Detalle del elemento">
      <div className="roadmap-drawer-head">
        <div className="roadmap-drawer-eyebrow">
          <span className="roadmap-drawer-dot" style={{ background: accentColor }} />
          {TYPE_LABEL[type] || 'Elemento'}{moduleName && !isModuleLike ? ` · ${moduleName}` : ''}
        </div>
        <button type="button" className="btn btn-sm btn-link roadmap-drawer-x" onClick={close} aria-label="Cerrar">
          <i className="bi bi-x-lg" />
        </button>
      </div>

      <div className="roadmap-drawer-body">
        {isModuleLike ? (
          <>
            <h5 className="roadmap-drawer-title">{name}</h5>
            <dl className="roadmap-drawer-fields">
              <dt>Fecha inicio</dt><dd>{fmtDate(start)}</dd>
              <dt>Fecha fin</dt><dd>{fmtDate(end)}</dd>
              <dt>Días lectivos</dt><dd>{start && end ? days : '—'}</dd>
            </dl>
            {type === 'module' && (
              <button type="button" className="btn btn-outline-primary btn-sm mt-2" onClick={openModuleEdit}>
                <i className="bi bi-pencil me-1" />Editar módulo
              </button>
            )}
            {type === 'leccion-group' && (
              <p className="text-muted small mb-0 mt-2">
                Grupo visual: su rango se deriva de las fechas de sus lecciones.
              </p>
            )}
          </>
        ) : (
          <>
            <label className="roadmap-drawer-label">{isLesson ? 'Título de la lección' : 'Nombre'}</label>
            <input className="form-control form-control-sm mb-3" value={name} onChange={(e) => setName(e.target.value)} />

            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="roadmap-drawer-label">Fecha inicio</label>
                <input type="date" className="form-control form-control-sm" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="col-6">
                <label className="roadmap-drawer-label">Fecha fin</label>
                <input type="date" className="form-control form-control-sm" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>

            <dl className="roadmap-drawer-fields">
              <dt>Días lectivos</dt>
              <dd>{start && end ? days : '—'}</dd>
              <dt>Horas lectivas</dt>
              <dd>
                {start && end ? `${(days * perDay).toLocaleString('es-ES', { maximumFractionDigits: 1 })} h` : '—'}
                {start && end && !hasHoursPerDay && <span className="text-muted"> · {perDay} h/día aprox.</span>}
              </dd>
            </dl>

            {isLesson ? (
              <div className="mb-3">
                <label className="roadmap-drawer-label">Tipo</label>
                <div className="d-flex gap-3 mt-1">
                  <label className="d-flex align-items-center gap-1 small mb-0">
                    <input type="radio" name="roadmap-drawer-lessontype" value="teorica" checked={lessonType === 'teorica'} onChange={() => setLessonType('teorica')} /> Teórica
                  </label>
                  <label className="d-flex align-items-center gap-1 small mb-0">
                    <input type="radio" name="roadmap-drawer-lessontype" value="workshop" checked={lessonType === 'workshop'} onChange={() => setLessonType('workshop')} /> Workshop
                  </label>
                </div>
              </div>
            ) : (
              <div className="mb-3">
                <label className="roadmap-drawer-label">URL</label>
                <input type="url" className="form-control form-control-sm" placeholder="https://… (opcional)" value={url} onChange={(e) => setUrl(e.target.value)} />
              </div>
            )}

            {isProject && (
              <div className="mb-3">
                <div className="roadmap-drawer-label mb-1">Competencias</div>
                {comps.length ? (
                  <div className="d-flex flex-wrap gap-1">
                    {comps.map((c, i) => <span key={i} className="badge rounded-pill roadmap-drawer-chip">{c}</span>)}
                  </div>
                ) : <span className="text-muted small">Sin competencias asignadas</span>}
              </div>
            )}

            {isLesson && (
              <div className="mb-3">
                <div className="roadmap-drawer-label mb-1">Enlaces</div>
                {links.length ? (
                  <div className="d-flex flex-column gap-1">
                    {links.map((l, i) => (
                      <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="small text-truncate">
                        <i className="bi bi-link-45deg me-1" />{l.label || l.url}
                      </a>
                    ))}
                  </div>
                ) : <span className="text-muted small">Sin enlaces</span>}
              </div>
            )}

            <button type="button" className="btn btn-link btn-sm p-0 roadmap-drawer-more" onClick={openFullModal}>
              Editar competencias y enlaces en detalle →
            </button>
          </>
        )}
      </div>

      {editable && (
        <div className="roadmap-drawer-foot">
          <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
            {saving
              ? <><span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />Guardando…</>
              : <><i className="bi bi-save me-1" />Guardar</>}
          </button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={close}>Cancelar</button>
        </div>
      )}
    </aside>
  );
}
