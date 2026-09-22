'use client';

/**
 * CommandPalette.tsx — buscador de la promoción (Ctrl/Cmd + K)
 * (docs/tasks/navegacion-promocion.md, Fase 5).
 *
 * La salida para todo lo que no cabe en siete secciones: busca páginas
 * (sección › pestaña), estudiantes, módulos y proyectos de la promoción abierta,
 * y acciones sueltas. Al elegir un resultado navega con
 * `goToPromotionDestination` o abre la ficha correspondiente.
 *
 * Teclado: Ctrl/Cmd+K abre, flechas recorren, Enter elige, Esc cierra y el foco
 * vuelve a donde estaba. La lista es un `listbox` con `aria-activedescendant`,
 * así que un lector de pantalla canta la opción según se recorre.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function w(): any { return (typeof window !== 'undefined' ? window : {}) as unknown as any; }

interface Item {
  id: string;
  label: string;
  kind: string;
  run: () => void;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setCursor(0);
    lastFocus.current?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        lastFocus.current = document.activeElement as HTMLElement;
        setOpen(o => !o);
      } else if (e.key === 'Escape' && open) {
        close();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 20);
  }, [open]);

  const items = useMemo<Item[]>(() => {
    if (!open) return [];
    const out: Item[] = [];
    const go = (section: string, tab?: string) => () => { close(); w().goToPromotionDestination?.(section, tab); };

    // Páginas: cada sección y cada pestaña del mapa de navegación.
    (w().PROMOTION_SECTIONS || []).forEach((s: { id: string; label: string; tabs: { id: string; label: string }[] }) => {
      if (s.tabs.length <= 1) {
        out.push({ id: `p-${s.id}`, label: s.label, kind: 'Página', run: go(s.id) });
      } else {
        s.tabs.forEach(t => out.push({
          id: `p-${s.id}-${t.id}`, label: `${s.label} › ${t.label}`, kind: 'Página', run: go(s.id, t.id),
        }));
      }
    });

    // Estudiantes de la promoción: abren su ficha de seguimiento.
    (w().currentStudents || []).forEach((st: { id: string; name?: string; lastname?: string; email?: string }) => {
      const nombre = [st.name, st.lastname].filter(Boolean).join(' ').trim() || st.email || 'Sin nombre';
      out.push({
        id: `s-${st.id}`, label: nombre, kind: 'Estudiante',
        run: () => { close(); w().goToPromotionDestination?.('estudiantes', 'lista'); setTimeout(() => w().StudentTracking?.openFicha(st.id), 400); },
      });
    });

    // Módulos y proyectos del roadmap.
    (w().currentPromotion?.modules || []).forEach((m: { name?: string; projects?: { name?: string }[] }) => {
      if (m.name) out.push({ id: `m-${m.name}`, label: m.name, kind: 'Módulo', run: go('planificacion', 'roadmap') });
      (m.projects || []).forEach(p => {
        if (p.name) out.push({ id: `pr-${m.name}-${p.name}`, label: p.name, kind: 'Proyecto', run: go('proyectos', 'lista') });
      });
    });

    // Acciones sueltas que la gente busca por su nombre.
    out.push(
      { id: 'a-lista', label: 'Pasar lista de hoy', kind: 'Acción', run: go('estudiantes', 'asistencia') },
      { id: 'a-festivos', label: 'Cargar festivos', kind: 'Acción', run: go('planificacion', 'roadmap') },
      { id: 'a-horas', label: 'Ver las horas que faltan', kind: 'Acción', run: go('planificacion', 'horas') },
      { id: 'a-syllabus', label: 'Descargar el syllabus', kind: 'Acción', run: () => { close(); w().downloadPromotionSyllabus?.(); } },
      { id: 'a-preview', label: 'Ver la vista previa del roadmap', kind: 'Acción', run: () => { close(); w().previewPromotion?.(); } },
      { id: 'a-ajustes', label: 'Editar los datos de la promoción', kind: 'Acción', run: go('ajustes', 'datos') },
    );
    return out;
  }, [open, close]);

  const results = useMemo(() => {
    const q = norm(query.trim());
    const list = q ? items.filter(i => norm(i.label).includes(q) || norm(i.kind).includes(q)) : items;
    return list.slice(0, 8);
  }, [items, query]);

  useEffect(() => { setCursor(0); }, [query]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => (c + 1) % Math.max(results.length, 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => (c - 1 + results.length) % Math.max(results.length, 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); results[cursor]?.run(); }
  };

  return (
    <>
      <div className="cmdk-scrim" onClick={close} />
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Buscar en la promoción">
        <label className="visually-hidden-label" htmlFor="cmdk-input">Busca una página, un estudiante, un proyecto o una acción</label>
        <input
          id="cmdk-input"
          ref={inputRef}
          type="text"
          className="cmdk-input"
          placeholder="Busca una página, un estudiante, un proyecto o una acción…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded="true"
          aria-controls="cmdk-list"
          aria-activedescendant={results[cursor] ? `cmdk-opt-${results[cursor].id}` : undefined}
          autoComplete="off"
        />
        <ul className="cmdk-list" id="cmdk-list" role="listbox" aria-label="Resultados">
          {results.length === 0 && <li className="cmdk-empty">Nada coincide con esa búsqueda.</li>}
          {results.map((r, i) => (
            <li key={r.id} id={`cmdk-opt-${r.id}`} role="option" aria-selected={i === cursor}>
              <button
                type="button"
                className={`cmdk-item${i === cursor ? ' is-active' : ''}`}
                onMouseEnter={() => setCursor(i)}
                onClick={r.run}
              >
                <span className="cmdk-label">{r.label}</span>
                <span className="cmdk-kind">{r.kind}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="cmdk-foot">
          <kbd>↑</kbd><kbd>↓</kbd> para moverte · <kbd>Enter</kbd> para abrir · <kbd>Esc</kbd> para cerrar
        </p>
      </div>
    </>
  );
}

/** Botón "Buscar" de la barra superior; abre lo mismo que Ctrl+K. */
export function CommandPaletteButton() {
  const open = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
  return (
    <button type="button" className="cmdk-trigger" onClick={open}>
      <i className="bi bi-search me-1" aria-hidden="true" />
      <span className="cmdk-trigger-text">Buscar</span>
      <kbd>Ctrl</kbd><kbd>K</kbd>
    </button>
  );
}
