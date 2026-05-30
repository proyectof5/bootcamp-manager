'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Menu,
  CircleUser,
  User,
  ShieldCheck,
  LogOut,
  ArrowLeft,
  Eye,
  BookOpen,
  Info,
  UserPlus,
  PencilLine,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

import promotionDetailBody from './body';

// ── CSS injected once ────────────────────────────────────────────────────────
let cssInjected = false;
function injectCss(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

// ── Script loader ────────────────────────────────────────────────────────────
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(s);
  });
}

// ── Helpers globales del JS legacy (declarados aquí para TypeScript) ────────
// Estas funciones las define promotion-detail.js. Las llamamos desde JSX.
declare global {
  interface Window {
    switchTab?: (tab: string) => void;
    openProfileModal?: () => void;
    openEditPromotionModal?: () => void;
    openDeletePromotionModal?: () => void;
    logout?: () => void;
  }
}

export default function PromotionPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [teacherName, setTeacherName] = useState('Teacher');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    // ── Inject CSS files not in globals.css ──────────────────────────────
    if (!cssInjected) {
      injectCss('https://fonts.googleapis.com/css2?family=Pacifico');
      cssInjected = true;
    }

    // ── Expose promotion ID before scripts load ───────────────────────────
    const id = new URLSearchParams(window.location.search).get('id');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__NEXT_PROMO_ID__ = id || '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).APP_CONFIG = {
      API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).API_URL = (window as any).APP_CONFIG.API_URL;

    const openActa = new URLSearchParams(window.location.search).get('openActa') === '1';
    if (openActa) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__NEXT_OPEN_ACTA__ = true;
    }

    // ── Leer nombre del teacher de localStorage para mostrar en navbar ────
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u?.name) setTeacherName(u.name);
      }
      const role = localStorage.getItem('role');
      setIsSuperAdmin(role === 'superadmin');
    } catch { /* ignore */ }

    // ── Load scripts in dependency order ─────────────────────────────────
    (async () => {
      try {
        // External libs
        await loadScript('https://cdn.jsdelivr.net/npm/sortablejs@1/Sortable.min.js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
        // App scripts
        await loadScript('/js/config.js');
        await loadScript('/js/shared.js');
        await loadScript('/js/sidebar-desktop-toggle.js');
        await loadScript('/js/notes.js');
        await loadScript('/js/reports.js');
        await loadScript('/js/syllabus-pdf.js');
        await loadScript('/js/program-competences.js');
        await loadScript('/js/student-tracking.js');
        await loadScript('/js/promotion-detail.js');
      } catch (e) {
        console.error('Script load error:', e);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      id="promotion-detail-root"
      suppressHydrationWarning
      style={{ flex: '1 1 100%', width: '100%' }}
    >
      {/* ── Navbar (migrado a JSX en spec 0013-a, era líneas 5-51 de body.ts) ── */}
      <nav
        className="navbar navbar-expand-lg navbar-light bg-light shadow-sm sticky-top"
        style={{ zIndex: 1030 }}
      >
        <div className="container-fluid">
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="sidebar-desktop-toggle"
              className="bg-transparent border-0 p-1 text-text hover:text-crok"
              title="Mostrar/Ocultar Menú"
            >
              <Menu className="h-6 w-6" />
            </button>
            <a className="navbar-brand m-0 p-0 flex items-center" href="#">
              <span style={{
                color: '#fff',
                fontWeight: 700,
                fontSize: '1.25rem',
                lineHeight: 1.05,
                letterSpacing: '-0.01em',
              }}>
                Bootcamp<br />Manager
              </span>
            </a>
          </div>

          {/* Promotion Name Center (rellenado por JS legacy via #navbar-promotion-name) */}
          <div className="navbar-promotion-title hidden lg:flex">
            <h5 id="navbar-promotion-name" className="mb-0 font-semibold m-0">
              {/* Promotion name will be inserted here */}
            </h5>
          </div>

          {/* User menu — DropdownMenu shadcn (reemplaza Bootstrap dropdown) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="bg-transparent text-white border border-white/30 hover:bg-white hover:text-crok hover:border-white gap-2"
              >
                <CircleUser className="h-4 w-4" />
                <span id="teacher-name">{teacherName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => window.openProfileModal?.()}>
                <User className="mr-2 h-4 w-4" /> Perfil
              </DropdownMenuItem>
              {isSuperAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a href="/admin">
                      <ShieldCheck className="mr-2 h-4 w-4" /> Panel de Admin
                    </a>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.logout?.()}>
                <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* ── Sidebar overlay mobile (manipulado por sidebar-desktop-toggle.js) ── */}
      <div className="sidebar-overlay" id="sidebar-overlay"></div>

      {/* ── Sidebar desktop (migrado a JSX en spec 0013-a, era líneas 56-104 de body.ts) ── */}
      {/* Mantenemos las clases legacy .sidebar, .sidebar-sticky, .sidebar-nav,
          .nav-link-promotions, .sidebar-edit-btn, .sidebar-delete-btn,
          .sidebar-footer, .sidebar-logo-container, .sidebar-f5-logo, .teacher-only
          porque están definidas en promotion-detail.css y el JS legacy las usa.
          Los onclick="switchTab(...)" disparan funciones globales de
          promotion-detail.js — sin cambio. */}
      <nav className="bg-light sidebar" id="sidebar-desktop">
        <div className="sidebar-sticky">
          <ul className="nav flex-column sidebar-nav">
            <li className="nav-item">
              <a className="nav-link nav-link-promotions mt-4" href="/dashboard">
                <ArrowLeft className="inline-block mr-2 h-4 w-4" />Promociones
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link nav" href="#overview" onClick={() => window.switchTab?.('overview')}>
                <Eye className="inline-block mr-2 h-4 w-4" />Dashboard
              </a>
            </li>
            <li className="nav-item teacher-only">
              <a className="nav-link" href="#teacher-area" onClick={() => window.switchTab?.('teacher-area')}>
                <BookOpen className="inline-block mr-2 h-4 w-4" />Área de administración
              </a>
            </li>
            <li className="nav-item teacher-only">
              <a className="nav-link" href="#info" onClick={() => window.switchTab?.('info')}>
                <Info className="inline-block mr-2 h-4 w-4" />Contenido del Programa
              </a>
            </li>
            <li className="nav-item teacher-only">
              <a className="nav-link" href="#collaborators" onClick={() => window.switchTab?.('collaborators')}>
                <UserPlus className="inline-block mr-2 h-4 w-4" />Collaboradores
              </a>
            </li>
          </ul>

          {/* Sidebar Footer */}
          <div className="sidebar-footer">
            <div className="nav-item teacher-only w-100 mb-1">
              <a
                type="button"
                className="nav-link sidebar-edit-btn"
                onClick={() => window.openEditPromotionModal?.()}
              >
                <PencilLine className="inline-block mr-2 h-4 w-4" />Modificar promoción
              </a>
            </div>
            <div className="nav-item teacher-only w-100">
              <a
                type="button"
                className="nav-link sidebar-delete-btn"
                onClick={() => window.openDeletePromotionModal?.()}
              >
                <Trash2 className="inline-block mr-2 h-4 w-4" />Eliminar promoción
              </a>
            </div>
            <div className="sidebar-logo-container">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/logo-factoria-b.svg" alt="FactoriaF5" className="sidebar-f5-logo" />
            </div>
          </div>
        </div>
      </nav>

      {/* ── Resto del HTML legacy (main content + 23 modales) ───────────────── */}
      {/* eslint-disable-next-line react/no-danger */}
      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: promotionDetailBody }} />
    </div>
  );
}
