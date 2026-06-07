'use client';

import { useEffect } from 'react';

const KEY = 'sidebarDesktopState';

/**
 * Reemplaza public/js/sidebar-desktop-toggle.js: alterna la clase
 * `sidebar-collapsed` en <body> al pulsar #sidebar-desktop-toggle y persiste el
 * estado en localStorage (restaurándolo al montar). Componente sin render.
 */
export function SidebarDesktopToggle() {
  useEffect(() => {
    // Restaurar estado guardado
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved && saved.collapsed) document.body.classList.add('sidebar-collapsed');
    } catch {
      /* noop */
    }

    const onClick = (e: Event) => {
      e.preventDefault();
      document.body.classList.toggle('sidebar-collapsed');
      localStorage.setItem(KEY, JSON.stringify({ collapsed: document.body.classList.contains('sidebar-collapsed') }));
    };

    // El botón puede estar en JSX o en el HTML legacy inyectado: lo esperamos.
    let tries = 120;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let btn: HTMLElement | null = null;
    const attach = () => {
      btn = document.getElementById('sidebar-desktop-toggle');
      if (btn) { btn.addEventListener('click', onClick); return; }
      if (--tries > 0) timer = setTimeout(attach, 16);
    };
    attach();

    return () => {
      if (timer) clearTimeout(timer);
      if (btn) btn.removeEventListener('click', onClick);
    };
  }, []);

  return null;
}
