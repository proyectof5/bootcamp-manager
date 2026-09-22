'use client';

/**
 * StudentsTable.tsx — tabla de Estudiantes › Lista
 * (docs/tasks/navegacion-promocion.md, Fase 3).
 *
 * Antes eran cuatro columnas fijas (casilla, nombre, email, acciones) pintadas por
 * `displayStudents` con innerHTML. Ahora la tabla la pinta React con:
 *  - cinco columnas por defecto y un selector para añadir las demás,
 *  - vistas guardadas (todos / en riesgo / bajas),
 *  - orden por columna, cabecera fija y buscador,
 *  - filtros avanzados plegados.
 *
 * Sigue siendo la MISMA lógica legacy por debajo: las filas conservan
 * `.student-checkbox[data-student-id]` (de ahí leen exportar/borrar seleccionados),
 * llaman a `updateSelectionState`, `StudentTracking.openFicha`, `Reports.printTechnical`,
 * `deleteStudent` y `requestStudentDeletion`. `displayStudents` detecta que React
 * manda (`window.__studentsTableReact`) y le pasa la lista por evento.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function w(): any { return (typeof window !== 'undefined' ? window : {}) as unknown as any; }

interface Student {
  id: string;
  name?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  nationality?: string;
  profession?: string;
  createdAt?: string;
  isWithdrawn?: boolean;
  withdrawal?: { date?: string };
}

interface ColumnDef {
  id: string;
  label: string;
  fixed?: boolean;
  on: boolean;
  align?: 'start' | 'end';
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: 'nombre', label: 'Estudiante', fixed: true, on: true },
  { id: 'asistencia', label: 'Asistencia del mes', on: true },
  { id: 'evaluados', label: 'Proyectos evaluados', on: true },
  { id: 'estado', label: 'Estado', on: true },
  { id: 'telefono', label: 'Teléfono', on: false },
  { id: 'nacionalidad', label: 'Nacionalidad', on: false },
  { id: 'profesion', label: 'Profesión', on: false },
  { id: 'alta', label: 'Fecha de alta', on: false },
];

const STORAGE_KEY = 'studentsTableColumns';
const fullName = (s: Student) => [s.name, s.lastname].filter(Boolean).join(' ').trim() || 'Sin nombre';
const fmtDate = (v?: string) => (v ? new Date(v).toLocaleDateString('es-ES') : '—');

export function StudentsTable() {
  const [students, setStudents] = useState<Student[]>([]);
  const [asistencia, setAsistencia] = useState<Record<string, { pres: number; total: number }>>({});
  const [evaluados, setEvaluados] = useState<Record<string, number>>({});
  const [proyectosTotal, setProyectosTotal] = useState(0);
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [view, setView] = useState<'todos' | 'riesgo' | 'bajas'>('todos');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'nombre', dir: 'asc' });
  const pickerRef = useRef<HTMLDivElement>(null);

  // Columnas elegidas: comodidad por navegador, no dato compartido.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (Array.isArray(saved)) {
        setColumns(DEFAULT_COLUMNS.map(c => ({ ...c, on: c.fixed || saved.includes(c.id) })));
      }
    } catch { /* sin memoria de columnas: se usan las de por defecto */ }
  }, []);

  const toggleColumn = (id: string) => {
    setColumns(prev => {
      const next = prev.map(c => (c.id === id && !c.fixed ? { ...c, on: !c.on } : c));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next.filter(c => c.on).map(c => c.id)));
      } catch { /* la tabla funciona igual sin guardar la preferencia */ }
      return next;
    });
  };

  // La lista la sigue trayendo el legacy (loadStudents → displayStudents).
  useEffect(() => {
    w().__studentsTableReact = true;
    const onStudents = (e: Event) => setStudents(((e as CustomEvent).detail || []) as Student[]);
    window.addEventListener('students-updated', onStudents);
    if (Array.isArray(w().currentStudents)) setStudents(w().currentStudents as Student[]);
    return () => {
      w().__studentsTableReact = false;
      window.removeEventListener('students-updated', onStudents);
    };
  }, []);

  // Asistencia del mes y proyectos evaluados por persona.
  const loadExtras = useCallback(async () => {
    const promotionId = new URLSearchParams(window.location.search).get('id');
    if (!promotionId) return;
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    try {
      const [attRes, extRes] = await Promise.all([
        apiFetch(`/api/promotions/${promotionId}/attendance?month=${month}`),
        apiFetch(`/api/promotions/${promotionId}/extended-info`),
      ]);
      const att = attRes.ok ? await attRes.json() : [];
      const ext = extRes.ok ? await extRes.json() : {};

      const porEstudiante: Record<string, { pres: number; total: number }> = {};
      (Array.isArray(att) ? att : []).forEach((r: { studentId?: string; status?: string }) => {
        if (!r.studentId) return;
        const cur = porEstudiante[r.studentId] || { pres: 0, total: 0 };
        cur.total += 1;
        if ((r.status || '').startsWith('Presente')) cur.pres += 1;
        porEstudiante[r.studentId] = cur;
      });
      setAsistencia(porEstudiante);

      const proyectos = Array.isArray(ext.projectEvaluations) ? ext.projectEvaluations : [];
      setProyectosTotal(proyectos.length);
      const conteo: Record<string, number> = {};
      proyectos.forEach((p: { evaluations?: { targetId?: string; evaluatedAt?: string }[] }) => {
        (p.evaluations || []).forEach(ev => {
          if (ev.targetId && ev.evaluatedAt) conteo[ev.targetId] = (conteo[ev.targetId] || 0) + 1;
        });
      });
      setEvaluados(conteo);
    } catch (err) {
      console.error('[StudentsTable] no se pudieron cargar asistencia y evaluaciones', err);
    }
  }, []);

  useEffect(() => { loadExtras(); }, [loadExtras, students.length]);

  // Cerrar el selector de columnas al pulsar fuera.
  useEffect(() => {
    if (!pickerOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [pickerOpen]);

  const isWithdrawn = (s: Student) => !!s.isWithdrawn || !!s.withdrawal?.date;
  const pct = (s: Student) => {
    const a = asistencia[s.id];
    return a && a.total ? Math.round((a.pres / a.total) * 100) : null;
  };

  const rows = useMemo(() => {
    let list = students.slice();
    if (view === 'bajas') list = list.filter(isWithdrawn);
    else if (view === 'riesgo') list = list.filter(s => !isWithdrawn(s) && (pct(s) ?? 100) < 80);
    else list = list.filter(s => !isWithdrawn(s));

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(s => [fullName(s), s.email, s.nationality, s.profession]
        .filter(Boolean).join(' ').toLowerCase().includes(q));
    }

    const dir = sort.dir === 'asc' ? 1 : -1;
    const value = (s: Student): string | number => {
      switch (sort.col) {
        case 'asistencia': return pct(s) ?? -1;
        case 'evaluados': return evaluados[s.id] || 0;
        case 'estado': return isWithdrawn(s) ? 'Baja' : (pct(s) ?? 100) < 80 ? 'Faltas' : 'Activa';
        case 'telefono': return s.phone || '';
        case 'nacionalidad': return s.nationality || '';
        case 'profesion': return s.profession || '';
        case 'alta': return s.createdAt || '';
        default: return fullName(s);
      }
    };
    return list.sort((a, b) => {
      const va = value(a); const vb = value(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'es', { numeric: true }) * dir;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, view, query, sort, asistencia, evaluados]);

  const visibles = columns.filter(c => c.on);
  const bajas = students.filter(isWithdrawn).length;
  const riesgo = students.filter(s => !isWithdrawn(s) && (pct(s) ?? 100) < 80).length;
  const activos = students.length - bajas;

  const sortBy = (col: string) => setSort(prev => ({ col, dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc' }));
  const ariaSort = (col: string): 'ascending' | 'descending' | 'none' =>
    (sort.col === col ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none');

  const cell = (s: Student, colId: string) => {
    const withdrawn = isWithdrawn(s);
    switch (colId) {
      case 'nombre':
        return (
          <div className="students-name">
            <a
              href="#"
              className="student-name-link"
              onClick={(e) => { e.preventDefault(); w().StudentTracking?.openFicha(s.id); }}
              title={`Ver ficha de ${fullName(s)}${withdrawn ? ' (baja)' : ''}`}
            >
              {fullName(s)}
            </a>
            <span className="students-mail">{s.email || 'Sin email'}</span>
          </div>
        );
      case 'asistencia': {
        const p = pct(s);
        return p === null ? <span className="text-muted">Sin registros</span> : `${p} %`;
      }
      case 'evaluados':
        return proyectosTotal ? `${evaluados[s.id] || 0} de ${proyectosTotal}` : String(evaluados[s.id] || 0);
      case 'estado': {
        if (withdrawn) return <span className="students-pill is-baja"><i className="bi bi-person-x me-1" aria-hidden="true" />Baja</span>;
        const p = pct(s);
        if (p !== null && p < 80) return <span className="students-pill is-riesgo"><i className="bi bi-exclamation-triangle me-1" aria-hidden="true" />Faltas</span>;
        return <span className="students-pill is-activa"><i className="bi bi-check-circle me-1" aria-hidden="true" />Activa</span>;
      }
      case 'telefono': return s.phone || '—';
      case 'nacionalidad': return s.nationality || '—';
      case 'profesion': return s.profession || '—';
      case 'alta': return fmtDate(s.createdAt);
      default: return null;
    }
  };

  return (
    <div className="students-table-block">
      <div className="students-toolbar">
        <div className="students-views" role="group" aria-label="Vistas guardadas">
          {([['todos', `Activos (${activos})`], ['riesgo', `En riesgo (${riesgo})`], ['bajas', `Bajas (${bajas})`]] as const).map(([id, label]) => (
            <button
              type="button"
              key={id}
              className={`students-view${view === id ? ' active' : ''}`}
              aria-pressed={view === id}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="students-toolbar-right" ref={pickerRef}>
          <div className="input-group input-group-sm students-search">
            <span className="input-group-text bg-white" aria-hidden="true"><i className="bi bi-search" /></span>
            <label className="visually-hidden-label" htmlFor="students-quick-search">Buscar estudiante</label>
            <input
              id="students-quick-search"
              type="search"
              className="form-control"
              placeholder="Nombre, email, nacionalidad…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="students-picker-wrap">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              aria-expanded={pickerOpen}
              onClick={() => setPickerOpen(o => !o)}
            >
              <i className="bi bi-layout-three-columns me-1" aria-hidden="true" />Columnas ({visibles.length})
            </button>
            {pickerOpen && (
              <div className="students-picker">
                {columns.map(c => (
                  <label key={c.id} htmlFor={`col-${c.id}`}>
                    <input
                      id={`col-${c.id}`}
                      type="checkbox"
                      className="form-check-input"
                      checked={c.on}
                      disabled={c.fixed}
                      onChange={() => toggleColumn(c.id)}
                    />
                    {c.label}{c.fixed ? ' (fija)' : ''}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="table-responsive students-table-wrap">
        <table className="table table-hover align-middle students-table">
          <caption className="visually-hidden-label">Estudiantes de la promoción</caption>
          <thead>
            <tr>
              <th scope="col" style={{ width: 40 }}>
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="select-all-students-header"
                  aria-label="Seleccionar todos los estudiantes"
                  onClick={(e) => w().toggleAllStudents?.(e.currentTarget)}
                />
              </th>
              {visibles.map(c => (
                <th key={c.id} scope="col" aria-sort={ariaSort(c.id)}>
                  <button type="button" className="students-sort" onClick={() => sortBy(c.id)}>
                    {c.label}
                    {sort.col === c.id && <i className={`bi ${sort.dir === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down'} ms-1`} aria-hidden="true" />}
                  </button>
                </th>
              ))}
              <th scope="col" className="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody id="students-list">
            {rows.length === 0 && (
              <tr>
                <td colSpan={visibles.length + 2} className="text-center text-muted py-4">
                  {students.length === 0
                    ? 'Todavía no hay estudiantes en esta promoción.'
                    : 'Ningún estudiante coincide con la búsqueda o la vista elegida.'}
                </td>
              </tr>
            )}
            {rows.map(s => (
              <tr key={s.id} className={isWithdrawn(s) ? 'student-row-withdrawn' : ''}>
                <td>
                  <input
                    type="checkbox"
                    className="form-check-input student-checkbox"
                    data-student-id={s.id}
                    aria-label={`Seleccionar a ${fullName(s)}`}
                    disabled={isWithdrawn(s)}
                    onChange={() => w().updateSelectionState?.()}
                  />
                </td>
                {visibles.map(c => <td key={c.id}>{cell(s, c.id)}</td>)}
                <td className="text-end">
                  <div className="btn-group">
                    <button type="button" className="btn btn-sm btn-outline-success" title="Ficha de seguimiento" onClick={() => w().StudentTracking?.openFicha(s.id)}>
                      <i className="bi bi-person-lines-fill" aria-hidden="true" />
                      <span className="visually-hidden-label">Ficha de {fullName(s)}</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      title="PDF de seguimiento técnico"
                      onClick={() => {
                        const id = new URLSearchParams(window.location.search).get('id');
                        if (w().Reports) w().Reports.printTechnical(s.id, id);
                        else w().showToast?.('La librería de informes no está cargada.', 'danger');
                      }}
                    >
                      <i className="bi bi-file-earmark-bar-graph" aria-hidden="true" />
                      <span className="visually-hidden-label">Informe de {fullName(s)}</span>
                    </button>
                    {!isWithdrawn(s) && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        title="Eliminar estudiante"
                        onClick={() => (w().getUserRole?.() === 'superadmin'
                          ? w().deleteStudent?.(s.id, s.email)
                          : w().requestStudentDeletion?.(s.id, s.email))}
                      >
                        <i className="bi bi-trash" aria-hidden="true" />
                        <span className="visually-hidden-label">Eliminar a {fullName(s)}</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="students-count text-muted small">
        {rows.length} de {students.length} {students.length === 1 ? 'estudiante' : 'estudiantes'}
        {visibles.length < columns.length && ' · hay más columnas en el selector'}
      </p>
    </div>
  );
}
