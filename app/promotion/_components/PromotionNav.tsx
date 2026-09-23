'use client';

/**
 * PromotionNav.tsx — barra lateral por secciones + cabecera de página
 * (docs/tasks/navegacion-promocion.md, Fase 1).
 *
 * Dos piezas que leen el mismo destino de public/js/promotion-nav.js:
 *  - `SectionNavItems`: los enlaces de la barra lateral (8 secciones + Ajustes al pie).
 *  - `PromotionPageHeadHost`: portal a #promotion-page-head, con migas, título,
 *    acciones y las pestañas de la sección activa.
 *
 * Ninguna de las dos pinta contenido: al pulsar llaman a
 * window.goToPromotionDestination, que usa las funciones legacy de
 * promotion-detail.js. El estado activo llega por el evento
 * `promotion-destination-changed`.
 */

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { withBasePath } from '../../_lib/basePath';

interface NavTab { id: string; label: string; keepsCurrent?: boolean }
interface NavSection { id: string; label: string; icon: string; foot?: boolean; tabs: NavTab[] }
interface Destination { section: string; tab: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function w(): any {
  return (typeof window !== 'undefined' ? window : {}) as unknown as any;
}

function useDestination(): { dest: Destination; sections: NavSection[] } {
  const [dest, setDest] = useState<Destination>({ section: 'inicio', tab: 'resumen' });
  const [sections, setSections] = useState<NavSection[]>([]);

  useEffect(() => {
    const sync = () => {
      const s = w().PROMOTION_SECTIONS;
      if (Array.isArray(s) && s.length) setSections(s as NavSection[]);
      const d = w().getPromotionDestination?.();
      if (d) setDest(d);
    };
    sync();
    // promotion-nav.js puede cargar después que React: se reintenta un par de veces.
    const t = setInterval(sync, 300);
    const stop = setTimeout(() => clearInterval(t), 6000);
    const onChange = (e: Event) => setDest((e as CustomEvent).detail as Destination);
    window.addEventListener('promotion-destination-changed', onChange);
    return () => {
      clearInterval(t);
      clearTimeout(stop);
      window.removeEventListener('promotion-destination-changed', onChange);
    };
  }, []);

  return { dest, sections };
}

/** Enlaces de sección de la barra lateral. Ajustes va al pie, con el resto de acciones. */
export function SectionNavItems({ placement = 'main' }: { placement?: 'main' | 'foot' }) {
  const { dest, sections } = useDestination();
  const go = useCallback((sectionId: string) => w().goToPromotionDestination?.(sectionId), []);
  const list = sections.filter(s => (placement === 'foot' ? s.foot : !s.foot));

  return (
    <>
      {list.map(s => (
        <li className="nav-item teacher-only" key={s.id}>
          <a
            className={`nav-link${dest.section === s.id ? ' active' : ''}`}
            data-section={s.id}
            href={`#/${s.id}`}
            aria-current={dest.section === s.id ? 'page' : undefined}
            onClick={(e) => { e.preventDefault(); go(s.id); }}
          >
            <i className={`bi ${s.icon} me-2`} aria-hidden="true" />{s.label}
          </a>
        </li>
      ))}
    </>
  );
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

export function PromotionPageHeadHost() {
  const host = usePortalNode('promotion-page-head');
  if (!host) return null;
  return createPortal(<PromotionPageHead />, host);
}

function PromotionPageHead() {
  const { dest, sections } = useDestination();
  const section = sections.find(s => s.id === dest.section);
  const [promoName, setPromoName] = useState('Promoción');

  useEffect(() => {
    const read = () => setPromoName(w().currentPromotion?.name || 'Promoción');
    read();
    const t = setInterval(read, 1000);
    return () => clearInterval(t);
  }, []);

  // El título de la pestaña del navegador repite la etiqueta del menú (WCAG 2.4.2).
  useEffect(() => {
    if (section) document.title = `${section.label} · ${promoName}`;
  }, [section, promoName]);

  // Preview Roadmap y Syllabus son botones reales del markup legacy: se mueven aquí
  // (no se duplican) cuando la sección activa es Planificación, y vuelven al salir.
  useEffect(() => {
    const slot = document.getElementById('promotion-page-actions');
    const legacy = document.getElementById('program-details-actions');
    if (!slot || !legacy) return;
    if (dest.section === 'planificacion') slot.appendChild(legacy);
    else document.getElementById('info-tab')?.prepend(legacy);
  }, [dest.section]);

  if (!section) return null;

  return (
    <div className="promo-head">
      <nav className="promo-crumbs" aria-label="Ubicación">
        <a href={withBasePath('/dashboard')}>Promociones</a>
        <span aria-hidden="true">›</span>
        <span>{promoName}</span>
        <span aria-hidden="true">›</span>
        <span className="promo-crumb-current">{section.label}</span>
      </nav>
      <div className="promo-title-row">
        <h1 className="promo-title">{section.label}</h1>
        <div className="promo-head-actions" id="promotion-page-actions" />
      </div>
      {section.tabs.length > 1 && (
        <nav className="promo-tabs" aria-label={`Pestañas de ${section.label}`}>
          {section.tabs.map(t => (
            <button
              type="button"
              key={t.id}
              className={`promo-tab${dest.tab === t.id ? ' active' : ''}`}
              aria-current={dest.tab === t.id ? 'page' : undefined}
              onClick={() => w().goToPromotionDestination?.(section.id, t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
