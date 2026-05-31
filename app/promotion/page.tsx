'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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
  Save,
  AlertTriangle,
  InfoIcon,
  Mail,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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
// Las funciones _openShadcnModal / _closeShadcnModal las expone ESTE componente
// para que el JS legacy pueda abrir/cerrar los modales shadcn por id.
declare global {
  interface Window {
    switchTab?: (tab: string) => void;
    openProfileModal?: () => void;
    openEditPromotionModal?: () => void;
    openDeletePromotionModal?: () => void;
    saveEditPromotion?: (e: Event) => void;
    confirmDeletePromotion?: () => void;
    saveProfileInfo?: () => void;
    changePassword?: () => void;
    logout?: () => void;
    // Registro genérico para los modales shadcn (spec 0013-b en adelante)
    _openShadcnModal?: (id: string) => void;
    _closeShadcnModal?: (id: string) => void;
  }
}

export default function PromotionPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [teacherName, setTeacherName] = useState('Teacher');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // ── Registro genérico de modales shadcn (spec 0013-b en adelante) ──
  // Estado por id, abierto desde el JS legacy via window._openShadcnModal('X').
  const [shadcnModals, setShadcnModals] = useState<Record<string, boolean>>({});
  const setModalOpen = useCallback((id: string, open: boolean) => {
    setShadcnModals(prev => ({ ...prev, [id]: open }));
  }, []);
  const isModalOpen = (id: string) => !!shadcnModals[id];

  useEffect(() => {
    // Exponer registro al window para que JS legacy lo use
    window._openShadcnModal = (id) => setModalOpen(id, true);
    window._closeShadcnModal = (id) => setModalOpen(id, false);
  }, [setModalOpen]);

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
                  <DropdownMenuItem onClick={() => { window.location.href = '/admin'; }}>
                    <ShieldCheck className="mr-2 h-4 w-4" /> Panel de Admin
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

      {/* ── Resto del HTML legacy (main content + 19 modales restantes) ───── */}
      {/* eslint-disable-next-line react/no-danger */}
      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: promotionDetailBody }} />

      {/* ──────────────────────────────────────────────────────────────────────
          MODALES SHADCN (spec 0013-b en adelante)
          Cada modal usa el registro genérico `shadcnModals[id]` y el JS legacy
          los abre/cierra con window._openShadcnModal('id') / _closeShadcnModal('id').
          IMPORTANTE: preservar TODOS los ids internos (inputs, labels, alerts)
          porque el JS legacy los manipula con document.getElementById().
          ────────────────────────────────────────────────────────────────────── */}

      {/* ── editPromotionModal ── */}
      <Dialog
        open={isModalOpen('editPromotionModal')}
        onOpenChange={(o) => setModalOpen('editPromotionModal', o)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PencilLine className="h-5 w-5 text-crok" /> Modificar promoción
            </DialogTitle>
          </DialogHeader>
          <form
            id="edit-promotion-form"
            onSubmit={(e) => { e.preventDefault(); window.saveEditPromotion?.(e.nativeEvent); }}
            className="space-y-3"
          >
            <div className="space-y-2">
              <Label htmlFor="edit-promotion-name" className="font-semibold">
                Nombre de la promoción <span className="text-red-500">*</span>
              </Label>
              <Input id="edit-promotion-name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-promotion-desc" className="font-semibold">Descripción</Label>
              <Textarea id="edit-promotion-desc" rows={3} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-promotion-weeks" className="font-semibold">
                  Número de semanas <span className="text-red-500">*</span>
                </Label>
                <Input id="edit-promotion-weeks" type="number" min={1} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-promotion-hours" className="font-semibold">Horas totales</Label>
                <Input id="edit-promotion-hours" type="number" min={1} placeholder="ej. 900" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-promotion-start" className="font-semibold">Fecha de inicio</Label>
                <Input id="edit-promotion-start" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-promotion-end" className="font-semibold">Fecha de fin</Label>
                <Input id="edit-promotion-end" type="date" />
              </div>
            </div>
            {/* Alert manipulado por JS legacy: añade/quita 'd-none' y setea textContent */}
            <div id="edit-promotion-alert" className="d-none mt-2" role="alert">
              <Alert variant="destructive">
                <AlertDescription id="edit-promotion-alert-text"></AlertDescription>
              </Alert>
            </div>
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button
                type="submit"
                id="edit-promotion-save-btn"
                className="bg-crok hover:bg-crok-hover text-crok-on"
              >
                <span className="btn-label flex items-center gap-1">
                  <Save className="h-4 w-4" />Guardar cambios
                </span>
                <span className="spinner-border spinner-border-sm d-none ms-2" role="status" aria-hidden="true"></span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── deletePromotionModal ── */}
      <Dialog
        open={isModalOpen('deletePromotionModal')}
        onOpenChange={(o) => setModalOpen('deletePromotionModal', o)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Eliminar promoción
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p>
              Esta acción <strong>no se puede deshacer</strong>. Se eliminarán los datos asociados a esta promoción (roadmap, módulos, estudiantes, etc.).
            </p>
            <p>Escribe <strong>ELIMINAR</strong> para confirmar:</p>
            <Input id="delete-promotion-confirm-input" placeholder="ELIMINAR" />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => window.confirmDeletePromotion?.()}
            >
              Sí, eliminar la promoción
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── profileModal ── */}
      <Dialog
        open={isModalOpen('profileModal')}
        onOpenChange={(o) => setModalOpen('profileModal', o)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Perfil</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="profile" className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile" id="profile-tab">Información general</TabsTrigger>
              <TabsTrigger value="password" id="password-tab">Cambiar contraseña</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-3 pt-3">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Nombre</Label>
                <Input id="profile-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-lastName">Apellido</Label>
                <Input id="profile-lastName" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input id="profile-email" type="email" disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-location">Comunidad Autónoma</Label>
                {/* Native <select> porque JS legacy lo lee con .value */}
                <select
                  id="profile-location"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">-- Selecciona tu comunidad --</option>
                  <option value="Andalucía">Andalucía</option>
                  <option value="Aragón">Aragón</option>
                  <option value="Asturias">Asturias</option>
                  <option value="Islas Baleares">Islas Baleares</option>
                  <option value="Canarias">Canarias</option>
                  <option value="Cantabria">Cantabria</option>
                  <option value="Castilla-La Mancha">Castilla-La Mancha</option>
                  <option value="Castilla y León">Castilla y León</option>
                  <option value="Cataluña">Cataluña</option>
                  <option value="Ceuta">Ceuta</option>
                  <option value="Comunidad de Madrid">Comunidad de Madrid</option>
                  <option value="Comunidad Foral de Navarra">Comunidad Foral de Navarra</option>
                  <option value="Comunidad Valenciana">Comunidad Valenciana</option>
                  <option value="Extremadura">Extremadura</option>
                  <option value="Galicia">Galicia</option>
                  <option value="La Rioja">La Rioja</option>
                  <option value="Melilla">Melilla</option>
                  <option value="País Vasco">País Vasco</option>
                  <option value="Región de Murcia">Región de Murcia</option>
                </select>
              </div>
              {/* Alert manipulado por JS legacy con clases 'alert', 'hidden', etc. */}
              <div id="profile-alert" className="alert hidden" role="alert"></div>
            </TabsContent>

            <TabsContent value="password" className="space-y-3 pt-3">
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertDescription>
                  Te enviaremos un enlace a tu correo electrónico para que puedas cambiar tu contraseña de forma segura.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="reset-email">Tu correo electrónico</Label>
                <Input id="reset-email" type="email" placeholder="ejemplo@correo.com" />
              </div>
              <div id="password-alert" className="alert hidden" role="alert"></div>
              <Button
                type="button"
                className="w-full bg-crok hover:bg-crok-hover text-crok-on"
                onClick={() => window.changePassword?.()}
              >
                <Mail className="mr-2 h-4 w-4" />Enviar enlace de cambio de contraseña
              </Button>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cerrar</Button>
            </DialogClose>
            <Button
              type="button"
              id="profile-save-btn"
              className="bg-crok hover:bg-crok-hover text-crok-on"
              onClick={() => window.saveProfileInfo?.()}
            >
              Guardar perfil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── confirmDeleteTopicModal ── */}
      <Dialog
        open={isModalOpen('confirmDeleteTopicModal')}
        onOpenChange={(o) => setModalOpen('confirmDeleteTopicModal', o)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar tema</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p>Esta accion eliminara el tema y todo su contenido (lecciones y proyectos). No se puede deshacer.</p>
            <p className="font-bold" id="confirm-delete-topic-name"></p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">Cancelar</Button>
            </DialogClose>
            <Button
              type="button"
              size="sm"
              id="confirm-delete-topic-btn"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
