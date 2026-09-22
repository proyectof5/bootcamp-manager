'use client';

import { useEffect } from 'react';

const KEY = 'sidebarDesktopState';
const MOVIL = '(max-width: 767.98px)';

/**
 * Comportamiento del botón de menú (#sidebar-desktop-toggle) de la promoción.
 * Reemplaza public/js/sidebar-desktop-toggle.js.
 *
 * El menú lateral tiene dos vidas, y el botón es el mismo para las dos:
 *  - En escritorio la barra está siempre ahí y el botón la pliega: clase
 *    `sidebar-collapsed` en <body>, que se recuerda entre visitas.
 *  - En móvil la barra es un cajón que entra desde la izquierda sobre el
 *    contenido: clase `show` en la barra y en el velo (.sidebar-overlay), que
 *    es lo que espera el CSS de `@media (max-width: 767px)`. No se recuerda:
 *    un cajón abierto al entrar sería un estorbo.
 *
 * El cajón se cierra al tocar el velo, al pulsar Escape, al elegir una sección
 * y al pasar a una pantalla ancha.
 */
export function SidebarDesktopToggle() {
  useEffect(() => {
    const enMovil = () => window.matchMedia(MOVIL).matches;
    const barra = () => document.getElementById('sidebar-desktop');
    const velo = () => document.getElementById('sidebar-overlay');

    const abierta = () => !!barra()?.classList.contains('show');

    const pintarCajon = (abrir: boolean, btn: HTMLElement | null) => {
      barra()?.classList.toggle('show', abrir);
      velo()?.classList.toggle('show', abrir);
      btn?.setAttribute('aria-expanded', String(abrir));
    };

    // Restaurar el plegado de escritorio (en móvil esa clase no pinta nada).
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved && saved.collapsed) document.body.classList.add('sidebar-collapsed');
    } catch {
      /* noop */
    }

    let btn: HTMLElement | null = null;

    const onClick = (e: Event) => {
      e.preventDefault();
      if (enMovil()) {
        pintarCajon(!abierta(), btn);
        return;
      }
      document.body.classList.toggle('sidebar-collapsed');
      localStorage.setItem(KEY, JSON.stringify({ collapsed: document.body.classList.contains('sidebar-collapsed') }));
    };

    const cerrar = () => { if (abierta()) pintarCajon(false, btn); };

    const onDocClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest('#sidebar-overlay')) { cerrar(); return; }
      // Elegir una sección lleva a otra pantalla: el cajón sobra.
      if (abierta() && t.closest('#sidebar-desktop .nav-link')) cerrar();
    };

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
    const onResize = () => { if (!enMovil()) cerrar(); };

    // El botón puede estar en JSX o en el HTML legacy inyectado: lo esperamos.
    let tries = 120;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const attach = () => {
      btn = document.getElementById('sidebar-desktop-toggle');
      if (btn) {
        btn.addEventListener('click', onClick);
        btn.setAttribute('aria-controls', 'sidebar-desktop');
        btn.setAttribute('aria-expanded', 'false');
        return;
      }
      if (--tries > 0) timer = setTimeout(attach, 16);
    };
    attach();

    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);

    return () => {
      if (timer) clearTimeout(timer);
      if (btn) btn.removeEventListener('click', onClick);
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return null;
}
