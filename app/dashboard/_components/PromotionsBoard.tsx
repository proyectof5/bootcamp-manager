'use client';

/**
 * PromotionsBoard.tsx — vista "Mis promociones" rediseñada.
 *
 * Antes: una rejilla de tarjetas naranjas iguales con el nombre, la descripción y
 * las semanas. Con ocho o más promociones no se distinguía cuál está en marcha ni
 * por dónde va, y no había forma de buscar ni de filtrar.
 *
 * Ahora:
 *  - buscador y filtros por estado (todas, en marcha, próximas, terminadas),
 *  - las promociones se agrupan por estado, con las que están en marcha primero,
 *  - cada tarjeta dice en qué semana va, sus fechas, cuántos módulos tiene y si
 *    hay avisos pendientes (campana),
 *  - la tarjeta entera es un enlace (se abre con teclado) y borrar vive en un
 *    menú, no en un botón siempre visible junto al nombre.
 */

import { useMemo, useState } from 'react';
import { PendingBell, type Pending } from './PendingBell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2, Search, PlusCircle } from 'lucide-react';

export interface BoardPromotion {
  id: string;
  name: string;
  description?: string;
  weeks: number;
  startDate?: string;
  endDate?: string;
  teacherId?: string;
  modules?: unknown[];
}

type Estado = 'marcha' | 'proxima' | 'terminada';
type Filtro = 'todas' | Estado;

const DAY = 86400000;
const dateOnly = (v?: string) => (v ? String(v).slice(0, 10) : '');
const parse = (v?: string) => (dateOnly(v) ? new Date(`${dateOnly(v)}T00:00:00`) : null);
const fmt = (v?: string) => {
  const d = parse(v);
  return d ? d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
};

/** Fin real: la fecha de fin si existe, o el inicio más las semanas. */
function fin(p: BoardPromotion): Date | null {
  const end = parse(p.endDate);
  if (end) return end;
  const start = parse(p.startDate);
  if (start && p.weeks) return new Date(start.getTime() + p.weeks * 7 * DAY - DAY);
  return null;
}

function estadoDe(p: BoardPromotion): Estado {
  const hoy = new Date();
  const ini = parse(p.startDate);
  const f = fin(p);
  if (ini && ini > hoy) return 'proxima';
  if (f && f < hoy) return 'terminada';
  return 'marcha';
}

/** Semana en curso y porcentaje transcurrido, para la barra de progreso. */
function progreso(p: BoardPromotion): { semana: number; total: number; pct: number } | null {
  const ini = parse(p.startDate);
  const f = fin(p);
  if (!ini || !f || f <= ini) return null;
  const total = p.weeks || Math.max(1, Math.round((f.getTime() - ini.getTime()) / (7 * DAY)));
  const transcurrido = (Date.now() - ini.getTime()) / (f.getTime() - ini.getTime());
  const pct = Math.min(100, Math.max(0, Math.round(transcurrido * 100)));
  const semana = Math.min(total, Math.max(1, Math.ceil((transcurrido * total) || 1)));
  return { semana, total, pct };
}

const ESTADOS: { id: Estado; label: string; icono: string }[] = [
  { id: 'marcha', label: 'En marcha', icono: 'bi-play-circle-fill' },
  { id: 'proxima', label: 'Próxima', icono: 'bi-clock' },
  { id: 'terminada', label: 'Terminada', icono: 'bi-check-circle' },
];

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function PromotionsBoard({
  promotions, userId, pending, onOpen, onDelete, onCreate,
}: {
  promotions: BoardPromotion[];
  userId?: string;
  pending: Record<string, Pending>;
  onOpen: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onCreate: () => void;
}) {
  const [query, setQuery] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');

  const conEstado = useMemo(
    () => promotions.map(p => ({ p, estado: estadoDe(p) })),
    [promotions],
  );

  const cuenta = useMemo(() => ({
    todas: conEstado.length,
    marcha: conEstado.filter(x => x.estado === 'marcha').length,
    proxima: conEstado.filter(x => x.estado === 'proxima').length,
    terminada: conEstado.filter(x => x.estado === 'terminada').length,
  }), [conEstado]);

  const visibles = useMemo(() => {
    const q = norm(query.trim());
    return conEstado
      .filter(x => (filtro === 'todas' ? true : x.estado === filtro))
      .filter(x => !q || norm(`${x.p.name} ${x.p.description || ''}`).includes(q))
      .sort((a, b) => {
        const ai = parse(a.p.startDate)?.getTime() ?? 0;
        const bi = parse(b.p.startDate)?.getTime() ?? 0;
        return bi - ai;
      });
  }, [conEstado, filtro, query]);

  const grupos: { estado: Estado; label: string; items: typeof visibles }[] = ESTADOS.map(e => ({
    estado: e.id,
    label: e.label,
    items: visibles.filter(x => x.estado === e.id),
  })).filter(g => g.items.length > 0);

  return (
    <div className="promos">
      <div className="promos-bar">
        <div className="promos-search">
          <Search className="promos-search-icon" aria-hidden="true" />
          <label className="visually-hidden-label" htmlFor="promos-q">Buscar promoción por nombre</label>
          <input
            id="promos-q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre…"
          />
        </div>

        <div className="promos-chips" role="group" aria-label="Filtrar por estado">
          {([['todas', 'Todas'], ['marcha', 'En marcha'], ['proxima', 'Próximas'], ['terminada', 'Terminadas']] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`promos-chip${filtro === id ? ' is-on' : ''}`}
              aria-pressed={filtro === id}
              onClick={() => setFiltro(id)}
            >
              {label} <span className="promos-chip-n">{cuenta[id]}</span>
            </button>
          ))}
        </div>

        <button type="button" className="promos-new" onClick={onCreate}>
          <PlusCircle className="h-4 w-4" aria-hidden="true" />Añadir promoción
        </button>
      </div>

      {visibles.length === 0 && (
        <p className="promos-empty">
          {promotions.length === 0
            ? 'Aún no tienes promociones. Crea la primera para empezar.'
            : 'Ninguna promoción coincide con la búsqueda o el filtro.'}
        </p>
      )}

      {grupos.map(g => (
        <section key={g.estado} className="promos-group" aria-labelledby={`grupo-${g.estado}`}>
          <h2 className="promos-group-title" id={`grupo-${g.estado}`}>
            {g.label} <span className="promos-group-n">{g.items.length}</span>
          </h2>
          <ul className="promos-grid">
            {g.items.map(({ p, estado }) => {
              const esPropia = p.teacherId === userId;
              const pr = progreso(p);
              const meta = ESTADOS.find(e => e.id === estado)!;
              const inicio = fmt(p.startDate);
              const final = fin(p);
              return (
                <li key={p.id} className={`promo-card is-${estado}`}>
                  <a
                    className="promo-card-link"
                    href={`/promotion?id=${p.id}`}
                    onClick={(e) => { e.preventDefault(); onOpen(p.id); }}
                  >
                    <span className="promo-card-head">
                      <span className={`promo-state is-${estado}`}>
                        <i className={`bi ${meta.icono}`} aria-hidden="true" />{meta.label}
                      </span>
                      {!esPropia && <span className="promo-role">Colaboras</span>}
                      <PendingBell pending={pending[p.id]} />
                    </span>

                    <span className="promo-name">{p.name}</span>
                    {p.description && <span className="promo-desc">{p.description}</span>}

                    <span className="promo-meta">
                      {inicio && (
                        <span>
                          {inicio}
                          {final ? ` – ${final.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                        </span>
                      )}
                      <span>{p.weeks} {p.weeks === 1 ? 'semana' : 'semanas'}</span>
                      <span>{(p.modules || []).length} {(p.modules || []).length === 1 ? 'módulo' : 'módulos'}</span>
                    </span>

                    {pr && estado !== 'proxima' && (
                      <span className="promo-progress">
                        <span className="promo-progress-track">
                          <span className="promo-progress-fill" style={{ width: `${pr.pct}%` }} />
                        </span>
                        <span className="promo-progress-text">
                          {estado === 'terminada' ? 'Terminada' : `Semana ${pr.semana} de ${pr.total}`}
                        </span>
                      </span>
                    )}
                  </a>

                  {esPropia && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="promo-more" aria-label={`Más acciones de ${p.name}`}>
                          <MoreVertical className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={(e) => onDelete(p.id, e as unknown as React.MouseEvent)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />Eliminar promoción
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
