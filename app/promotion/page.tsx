'use client';

import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { NotesPanelHost } from './_components/NotesPanel';
import { SidebarDesktopToggle } from './_components/SidebarDesktopToggle';
import { ProgramCompetencesHost } from './_components/ProgramCompetences';
import { StudentTrackingHost } from './_components/StudentTracking';
import { initReports } from './_lib/reports';
import { initSyllabusPdf } from './_lib/syllabus-pdf';
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
  ClipboardCheck,
  UserCog,
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
import actaInicioFormHtml from './acta-inicio-body';

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

// El cuerpo legacy se inyecta UNA sola vez. memo() sin props evita que un
// re-render de PromotionPage (p.ej. al abrir/cerrar un shadcn Dialog vía
// _openShadcnModal/_closeShadcnModal) re-inyecte el dangerouslySetInnerHTML y
// borre el DOM que el JS legacy manipula imperativamente (tabla de equipo,
// panel de evaluación, badges, etc.). spec 0013-e.
const LegacyBody = memo(function LegacyBody() {
  return (
    <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: promotionDetailBody }} />
  );
});

// El form de Acta de Inicio se inyecta una sola vez (memo) dentro de su Dialog.
// Al ser opaco a React, el JS legacy (openActaModal) puede poblar/appendChild sin
// que un re-render lo borre. spec 0013-g.
const ActaInicioBody = memo(function ActaInicioBody() {
  return (
    <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: actaInicioFormHtml }} />
  );
});

// Body del selector de competencias de proyecto (epcp). El #epcp-list y las
// options de #epcp-area-filter los puebla openEvalProjectCompetencePicker(); los
// listeners de filtro se re-enganchan en cada apertura. Opaco a React (memo). spec 0013-h.
const evalProjPickerBodyHtml = `
    <div class="p-3 border-bottom bg-light d-flex flex-wrap gap-2 align-items-center">
        <div class="input-group input-group-sm" style="max-width:260px;">
            <span class="input-group-text"><i class="bi bi-search"></i></span>
            <input type="text" class="form-control" id="epcp-search" placeholder="Buscar competencia...">
        </div>
        <select class="form-select form-select-sm w-auto" id="epcp-area-filter">
            <option value="">Todas las áreas</option>
        </select>
        <span class="ms-auto badge bg-light text-dark border" id="epcp-selected-count">0 seleccionadas</span>
    </div>
    <div id="epcp-list" class="p-3" style="max-height:60vh;overflow-y:auto;"></div>
`;
const EvalProjPickerBody = memo(function EvalProjPickerBody() {
  return (
    <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: evalProjPickerBodyHtml }} />
  );
});

// #groups-modal-body lo llena _renderGroupsModalBody() imperativamente. memo (sin
// props) lo deja opaco a React para que el contenido inyectado no se borre. spec 0013-h.
const GroupsModalBody = memo(function GroupsModalBody() {
  return <div id="groups-modal-body" />;
});

// Hosts de los modales de program-competences.js (spec 0014 Fase A). El body lo
// llenan _buildAddCompetenceModal / _openToolsEditor imperativamente (opaco a React).
const AddCompetenceHost = memo(function AddCompetenceHost() {
  return <div id="add-competence-host" />;
});
const ToolsEditorHost = memo(function ToolsEditorHost() {
  return <div id="tools-editor-host" />;
});
// Host de la ficha de student-tracking.js (spec 0014 Fase A). _showFichaModal inyecta
// aquí el #ficha-content del template (sin el modal-header, que va en el DialogHeader).
const FichaHost = memo(function FichaHost() {
  return <div id="ficha-content-host" />;
});
// Host del modal de config de informe (reports.js _askWeekSelect). spec 0014 Fase A.
const WeekSelectHost = memo(function WeekSelectHost() {
  return <div id="week-select-host" />;
});

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

  // ── Confirm reutilizable (reemplaza el _showConfirmModal de Bootstrap) ──
  // El JS legacy llama window.__showConfirmDialog({...}); aquí se renderiza un
  // shadcn Dialog en vez de un bootstrap.Modal dinámico. spec 0013.
  const [confirmDialog, setConfirmDialog] = useState<{
    htmlMessage: string;
    onConfirm: () => void;
    confirmLabel: string;
    confirmClass: string;
  } | null>(null);
  useEffect(() => {
    (window as unknown as {
      __showConfirmDialog?: (o: {
        htmlMessage: string;
        onConfirm: () => void;
        confirmLabel?: string;
        confirmClass?: string;
      }) => void;
    }).__showConfirmDialog = (o) =>
      setConfirmDialog({
        htmlMessage: o.htmlMessage,
        onConfirm: o.onConfirm,
        confirmLabel: o.confirmLabel || 'Confirmar',
        confirmClass: o.confirmClass || 'btn-danger',
      });
  }, []);

  // ── Input dialog reutilizable (reemplaza el _showInputModal de Bootstrap) ──
  type InputField = { id: string; label: string; placeholder?: string; value?: string; type?: string };
  const [inputDialog, setInputDialog] = useState<{
    fields: InputField[];
    title: string;
    onConfirm: (values: Record<string, string>) => void;
    onCancel?: () => void;
    confirmLabel: string;
  } | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const inputSettledRef = useRef(false);
  useEffect(() => {
    (window as unknown as {
      __showInputDialog?: (o: {
        fields: InputField[];
        title: string;
        onConfirm: (v: Record<string, string>) => void;
        onCancel?: () => void;
        confirmLabel?: string;
      }) => void;
    }).__showInputDialog = (o) => {
      inputSettledRef.current = false;
      setInputValues(Object.fromEntries(o.fields.map((f) => [f.id, f.value || ''])));
      setInputDialog({ fields: o.fields, title: o.title, onConfirm: o.onConfirm, onCancel: o.onCancel, confirmLabel: o.confirmLabel || 'Aceptar' });
    };
  }, []);
  // Resuelve UNA sola vez (confirm o cancel) — cubre OK, Cancelar, y Esc/overlay/X.
  const settleInputDialog = (confirmed: boolean) => {
    if (inputSettledRef.current) return;
    inputSettledRef.current = true;
    const d = inputDialog;
    const vals = inputValues;
    setInputDialog(null);
    if (confirmed) d?.onConfirm?.(vals);
    else d?.onCancel?.();
  };
  const submitInputDialog = () => settleInputDialog(true);

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
        // reports.js migrado a módulo TS (spec 0014 Fase C): se ejecuta aquí en la
        // misma posición de la secuencia (tras shared.js, antes de promotion-detail.js
        // que consume window.Reports). Reemplaza loadScript('/js/reports.js').
        initReports();
        // syllabus-pdf.js migrado a módulo TS (spec 0014 Fase C): expone window.SyllabusPDF.
        initSyllabusPdf();
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

      {/* ── Resto del HTML legacy (main content + modales restantes) ───── */}
      {/* Inyectado UNA sola vez vía <LegacyBody> memoizado (def. arriba) para que
          un re-render no re-inyecte y borre el DOM que manipula el JS legacy. */}
      <LegacyBody />

      {/* Bloc de notas (spec 0014 Fase C): React portal a #notes-container,
          reemplaza public/js/notes.js (NotesManager/NotesUI). */}
      <NotesPanelHost />
      <SidebarDesktopToggle />
      {/* Editor de competencias del programa (spec 0014 Fase C): React vía portal
          a #competences-list-container + puente window.ProgramCompetences que
          consume promotion-detail.js. Reemplaza public/js/program-competences.js. */}
      <ProgramCompetencesHost />
      {/* Ficha de seguimiento del coder (spec 0014 Fase C): React vía portal a
          #ficha-content-host + puente window.StudentTracking (init/openFicha +
          getters que usa reports.js). Reemplaza public/js/student-tracking.js. */}
      <StudentTrackingHost />

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

      {/* ──────────────────────────────────────────────────────────────────
          MODALES ESTRUCTURA (spec 0013-c)
          ────────────────────────────────────────────────────────────────── */}

      {/* ── moduleModal ── */}
      <Dialog
        open={isModalOpen('moduleModal')}
        onOpenChange={(o) => setModalOpen('moduleModal', o)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle id="moduleModalTitle">Agregar Módulo</DialogTitle>
          </DialogHeader>
          <form id="module-form" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="module-name">Nombre del Módulo</Label>
                <Input id="module-name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="module-duration">Duración (semanas)</Label>
                <Input id="module-duration" type="number" min={1} required />
              </div>
            </div>

            {/* LEGACY hidden — kept for backward compat (TASK-RM-06b) */}
            <div id="courses-container" style={{ display: 'none' }}></div>
            <div id="projects-container" style={{ display: 'none' }}></div>

            {/* Planificador de Módulo */}
            <div className="space-y-2">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <h6 className="m-0 font-semibold">Planificador de Módulo</h6>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => (window as unknown as { addPlannerItem?: (t: string) => void }).addPlannerItem?.('curso')}
                  >
                    Añadir Curso
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => (window as unknown as { addPlannerItem?: (t: string) => void }).addPlannerItem?.('proyecto')}
                  >
                    Añadir Proyecto
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => (window as unknown as { addPlannerItem?: (t: string) => void }).addPlannerItem?.('leccion')}
                  >
                    Añadir Lección
                  </Button>
                </div>
              </div>
              <div id="planner-container" className="border rounded p-3 bg-gray-50">
                <p className="text-text-muted text-sm m-0">No hay elementos todavía. Añade un curso, proyecto o lección.</p>
              </div>
              <p className="text-xs text-text-muted">Arrastra los elementos para reordenarlos. Los cambios se guardan al pulsar &quot;Guardar Módulo&quot;.</p>
            </div>

            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" className="bg-crok hover:bg-crok-hover text-crok-on">
                Guardar Módulo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── quickLinkModal ── */}
      <Dialog
        open={isModalOpen('quickLinkModal')}
        onOpenChange={(o) => setModalOpen('quickLinkModal', o)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Quick Link</DialogTitle>
          </DialogHeader>
          <form id="quick-link-form" className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="link-platform">Plataforma</Label>
              {/* Native <select> porque JS legacy lo lee con .value + onChange */}
              <select
                id="link-platform"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                onChange={() => (window as unknown as { updateLinkName?: () => void }).updateLinkName?.()}
              >
                <option value="">Selecciona una plataforma o customizala</option>
                <option value="zoom">Zoom</option>
                <option value="discord">Discord</option>
                <option value="classroom">Google Classroom</option>
                <option value="github">GitHub</option>
                <option value="custom">Link customizado</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-name">Nombre del Link</Label>
              <Input id="link-name" placeholder="e.g., Zoom Class" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input id="link-url" type="url" required />
            </div>
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" className="bg-crok hover:bg-crok-hover text-crok-on">
                Agregar Link
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── sectionModal ── */}
      <Dialog
        open={isModalOpen('sectionModal')}
        onOpenChange={(o) => setModalOpen('sectionModal', o)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agregar Sección</DialogTitle>
          </DialogHeader>
          <form id="section-form" className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="section-title">Título</Label>
              <Input id="section-title" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="section-content">Contenido</Label>
              <Textarea id="section-content" rows={8} required />
            </div>
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" className="bg-crok hover:bg-crok-hover text-crok-on">
                Agregar Sección
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── promoResourceModal ── */}
      <Dialog
        open={isModalOpen('promoResourceModal')}
        onOpenChange={(o) => setModalOpen('promoResourceModal', o)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle id="promo-resource-modal-title">Nuevo Recurso</DialogTitle>
          </DialogHeader>
          <form id="promo-resource-form" className="space-y-3">
            <input type="hidden" id="promo-resource-id" defaultValue="" />
            <div className="space-y-2">
              <Label htmlFor="promo-resource-title" className="font-semibold">
                Título <span className="text-red-500">*</span>
              </Label>
              <Input id="promo-resource-title" placeholder="Ej: Intro al proyecto final" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-resource-description" className="font-semibold">Descripción</Label>
              <Textarea id="promo-resource-description" rows={3} placeholder="Breve descripción del recurso…" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="promo-resource-type" className="font-semibold">Tipo de recurso</Label>
                <select
                  id="promo-resource-type"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  defaultValue="video"
                >
                  <option value="video">📹 Vídeo</option>
                  <option value="repository">💻 Repositorio</option>
                  <option value="canva">🎨 Presentación Canva</option>
                  <option value="powerpoint">📊 PowerPoint</option>
                  <option value="other">📎 Otro</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo-resource-module" className="font-semibold">Módulo</Label>
                {/* JS legacy rellena las opciones dinámicamente */}
                <select
                  id="promo-resource-module"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  defaultValue=""
                >
                  <option value="">— Sin módulo —</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-resource-url" className="font-semibold">
                Link al recurso <span className="text-red-500">*</span>
              </Label>
              <Input id="promo-resource-url" type="url" placeholder="https://…" required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-semibold">Estado de publicación</Label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="promo-resource-status"
                      id="promo-resource-draft"
                      value="draft"
                      defaultChecked
                      onChange={(e) => (window as unknown as { togglePublishAtField?: (v: string) => void }).togglePublishAtField?.(e.target.value)}
                    />
                    <span className="inline-flex items-center rounded-md bg-gray-500 text-white px-2 py-0.5 text-xs font-semibold">Borrador</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="promo-resource-status"
                      id="promo-resource-published"
                      value="published"
                      onChange={(e) => (window as unknown as { togglePublishAtField?: (v: string) => void }).togglePublishAtField?.(e.target.value)}
                    />
                    <span className="inline-flex items-center rounded-md bg-green-500 text-white px-2 py-0.5 text-xs font-semibold">Publicar ahora</span>
                  </label>
                </div>
              </div>
              {/* Fila publishAt manipulada por JS legacy (style.display toggled) */}
              <div className="space-y-2" id="promo-resource-publishAt-row" style={{ display: 'none' }}>
                <Label htmlFor="promo-resource-publishAt" className="font-semibold">
                  Publicar en esta fecha <small className="text-text-muted font-normal">(deja vacío para no programar)</small>
                </Label>
                <Input id="promo-resource-publishAt" type="datetime-local" />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button
                type="submit"
                id="promo-resource-submit-btn"
                className="bg-crok hover:bg-crok-hover text-crok-on"
              >
                <Save className="mr-1 h-4 w-4" />Guardar recurso
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── resourceModal (búsqueda en catálogo externo) ── */}
      <Dialog
        open={isModalOpen('resourceModal')}
        onOpenChange={(o) => setModalOpen('resourceModal', o)}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogHeader
            className="px-4 py-3 text-white"
            style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}
          >
            <DialogTitle className="text-white font-bold">
              Buscar y agregar recurso
            </DialogTitle>
          </DialogHeader>
          <div>
            {/* Barra de búsqueda + filtros */}
            <div className="p-3 border-b bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                <div className="md:col-span-6 space-y-1">
                  <Label className="text-xs font-semibold m-0">Buscar recurso</Label>
                  <div className="flex">
                    <Input
                      id="resource-search-input"
                      placeholder="Nombre, tecnología, proveedor…"
                      onInput={() => (window as unknown as { filterResourceCatalog?: () => void }).filterResourceCatalog?.()}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="ml-1"
                      onClick={() => {
                        const inp = document.getElementById('resource-search-input') as HTMLInputElement | null;
                        if (inp) inp.value = '';
                        (window as unknown as { filterResourceCatalog?: () => void }).filterResourceCatalog?.();
                      }}
                      aria-label="Limpiar búsqueda"
                    >
                      ✕
                    </Button>
                  </div>
                </div>
                <div className="md:col-span-3 space-y-1">
                  <Label htmlFor="resource-area-filter" className="text-xs font-semibold m-0">Área</Label>
                  <select
                    id="resource-area-filter"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                    onChange={() => (window as unknown as { filterResourceCatalog?: () => void }).filterResourceCatalog?.()}
                  >
                    <option value="">Todas las áreas</option>
                  </select>
                </div>
                <div className="md:col-span-3 space-y-1">
                  <Label htmlFor="resource-type-filter" className="text-xs font-semibold m-0">Tipo</Label>
                  <select
                    id="resource-type-filter"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                    onChange={() => (window as unknown as { filterResourceCatalog?: () => void }).filterResourceCatalog?.()}
                  >
                    <option value="">Todos los tipos</option>
                  </select>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span id="resource-catalog-count" className="inline-flex items-center rounded-md bg-gray-500 text-white px-2 py-0.5 text-xs font-semibold">0 recursos</span>
                <span id="resource-catalog-loading" className="text-text-muted text-xs d-none">Cargando catálogo…</span>
              </div>
            </div>

            {/* Resultados */}
            <div id="resource-catalog-grid" className="p-3" style={{ minHeight: 300 }}></div>
            <div className="text-center text-text-muted py-12 d-none" id="resource-catalog-empty">
              No se encontraron recursos con estos filtros
            </div>
          </div>
          <DialogFooter className="bg-gray-50 px-4 py-3">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── studentModal (crear/editar estudiante) ── spec 0013-d */}
      <Dialog
        open={isModalOpen('studentModal')}
        onOpenChange={(o) => setModalOpen('studentModal', o)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle id="studentModalTitle">Añadir Estudiante</DialogTitle>
          </DialogHeader>
          <form id="student-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="student-name" className="font-semibold">
                  Nombre(s) <span className="text-red-600">*</span>
                </Label>
                <Input id="student-name" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="student-lastname" className="font-semibold">
                  Apellido(s) <span className="text-red-600">*</span>
                </Label>
                <Input id="student-lastname" required />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label htmlFor="student-email" className="font-semibold">
                  Email <span className="text-red-600">*</span>
                </Label>
                <Input type="email" id="student-email" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="student-github" className="font-semibold">Usuario de GitHub</Label>
                <Input id="student-github" placeholder="ej. octocat" />
              </div>
              <div className="space-y-1 flex flex-col justify-end">
                <Label className="font-semibold">Préstamo de ordenador</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="checkbox" id="student-laptop-loan" />
                  <Label htmlFor="student-laptop-loan" className="cursor-pointer m-0">
                    Sí, tiene préstamo
                  </Label>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" className="bg-crok hover:bg-crok-hover text-crok-on">
                Guardar Estudiante
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── studentProgressModal (progreso del estudiante) ── spec 0013-d */}
      <Dialog
        open={isModalOpen('studentProgressModal')}
        onOpenChange={(o) => setModalOpen('studentProgressModal', o)}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle id="progressModalTitle">Progreso del estudiantes</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
            <div className="md:col-span-1 space-y-3">
              <div className="border rounded-lg">
                <div className="border-b px-3 py-2 font-semibold text-sm">Información del estudiante</div>
                <div className="p-3 text-sm space-y-1">
                  <p><strong>Nombre:</strong> <span id="progress-student-name">-</span></p>
                  <p><strong>Apellido:</strong> <span id="progress-student-lastname">-</span></p>
                  <p><strong>Email:</strong> <span id="progress-student-email">-</span></p>
                  <p><strong>último acceso:</strong> <span id="progress-last-accessed">-</span></p>
                </div>
              </div>
              <div className="border rounded-lg">
                <div className="border-b px-3 py-2 font-semibold text-sm">Actualizar progreso</div>
                <div className="p-3 space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor="update-modules-completed">Módulos completados</Label>
                    <Input type="number" id="update-modules-completed" min={0} max={20} />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => (window as unknown as { updateStudentProgress?: () => void }).updateStudentProgress?.()}
                  >
                    Actualizar progreso
                  </Button>
                </div>
              </div>
            </div>
            <div className="md:col-span-2 space-y-3">
              <div className="border rounded-lg">
                <div className="border-b px-3 py-2 font-semibold text-sm">Resumen del progreso</div>
                <div className="p-3 grid grid-cols-3 text-center">
                  <div>
                    <h3 className="text-2xl font-bold text-crok" id="progress-modules-completed">0</h3>
                    <p className="mb-0 text-sm">Módulos completados</p>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-blue-500" id="progress-modules-viewed-count">0</h3>
                    <p className="mb-0 text-sm">Módulos vistos</p>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-green-600" id="progress-sections-completed-count">0</h3>
                    <p className="mb-0 text-sm">Secciones completadas</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border rounded-lg h-full">
                  <div className="border-b px-3 py-2 font-semibold text-sm">Módulos vistos</div>
                  <div className="p-3">
                    <div id="progress-modules-viewed">
                      <p className="text-text-muted mb-0 text-sm">Cargando...</p>
                    </div>
                  </div>
                </div>
                <div className="border rounded-lg h-full">
                  <div className="border-b px-3 py-2 font-semibold text-sm">Secciones completadas</div>
                  <div className="p-3">
                    <div id="progress-sections-completed">
                      <p className="text-text-muted mb-0 text-sm">Cargando...</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border rounded-lg">
                <div className="border-b px-3 py-2 flex justify-between items-center">
                  <span className="font-semibold text-sm">Notas del Formador</span>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-crok hover:bg-crok-hover text-crok-on"
                    onClick={() => (window as unknown as { saveStudentNotes?: () => void }).saveStudentNotes?.()}
                  >
                    <Save className="h-4 w-4 mr-1" /> Guardar notas
                  </Button>
                </div>
                <div className="p-3">
                  <Textarea
                    id="progress-student-notes"
                    rows={4}
                    placeholder="Add notes about student progress, behavior, or any important observations..."
                  />
                </div>
              </div>
              <div className="border rounded-lg">
                <div className="border-b px-3 py-2">
                  <span className="font-semibold text-sm">Proyectos</span>
                  {/* botón "+ Asignar Proyecto" eliminado (spec 0013-e 4/5):
                      la feature assignProjectModal nunca se implementó. */}
                </div>
                <div className="p-3">
                  <div id="progress-student-projects">
                    <p className="text-text-muted mb-0 text-sm">No hay proyectos asignados aún</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cerrar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── employabilityModal (sesiones de empleabilidad) ── spec 0013-d */}
      <Dialog
        open={isModalOpen('employabilityModal')}
        onOpenChange={(o) => setModalOpen('employabilityModal', o)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle id="employabilityModalTitle">Agregar sesiones de empleabilidad</DialogTitle>
          </DialogHeader>
          <form id="employability-form" className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="employability-name">Título de la sesión</Label>
              <Input id="employability-name" placeholder="e.g., CV Preparation" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="employability-url">URL (Opcional)</Label>
              <Input type="url" id="employability-url" placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <Label htmlFor="employability-start-month">Mes de inicio</Label>
              <Input type="number" id="employability-start-month" min={1} defaultValue={1} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="employability-duration">Duración (Cuántos Meses)</Label>
              <Input type="number" id="employability-duration" min={1} defaultValue={1} required />
            </div>
          </form>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              type="button"
              className="bg-crok hover:bg-crok-hover text-crok-on"
              onClick={() => (window as unknown as { saveEmployabilityItem?: () => void }).saveEmployabilityItem?.()}
            >
              Guardar sesión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── attendanceModal (detalle de asistencia) ── spec 0013-d */}
      <Dialog
        open={isModalOpen('attendanceModal')}
        onOpenChange={(o) => setModalOpen('attendanceModal', o)}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la asistencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div id="attendance-detail-info" className="text-sm">
              <p><strong>Estudiante:</strong> <span id="attendance-modal-student-name">-</span></p>
              <p><strong>Fecha:</strong> <span id="attendance-modal-date">-</span></p>
            </div>
            <div className="space-y-1">
              <Label>Estado</Label>
              <select
                id="attendance-modal-status"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                defaultValue=""
              >
                <option value="">No marcado</option>
                <option value="Presente">Presente</option>
                <option value="Ausente">Ausente</option>
                <option value="Con retraso">Con retraso</option>
                <option value="Justificado">Justificado</option>
                <option value="Sale antes">Sale antes</option>
              </select>
            </div>
            <div id="attendance-camera-off-wrapper" className="flex items-center gap-2">
              <input type="checkbox" id="attendance-modal-camera-off" />
              <Label htmlFor="attendance-modal-camera-off" className="m-0">
                <strong>Cámara apagada</strong>{' '}
                <span className="text-text-muted text-xs">(solo si está presente)</span>
              </Label>
            </div>
            <div className="space-y-1">
              <Label>Nota / Comentario</Label>
              <Textarea id="attendance-modal-note" rows={3} placeholder="Add a comment..." />
            </div>
            <hr />
            <h6 className="font-semibold text-sm">Estadísticas de asistencia (Mes actual)</h6>
            <div className="grid grid-cols-4 text-center mt-2 text-sm">
              <div>
                <div className="font-bold text-green-600 text-xs">Pres.</div>
                <div id="student-stat-present">0</div>
              </div>
              <div>
                <div className="font-bold text-red-600 text-xs">Aus.</div>
                <div id="student-stat-absent">0</div>
              </div>
              <div>
                <div className="font-bold text-yellow-600 text-xs">Retr.</div>
                <div id="student-stat-late">0</div>
              </div>
              <div>
                <div className="font-bold text-blue-500 text-xs">Just.</div>
                <div id="student-stat-justified">0</div>
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="border-blue-500 text-blue-500 hover:bg-blue-50"
              id="view-student-summary-btn"
            >
              Resumen del mes
            </Button>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button
                type="button"
                className="bg-crok hover:bg-crok-hover text-crok-on"
                onClick={() => (window as unknown as { saveAttendanceFromModal?: () => void }).saveAttendanceFromModal?.()}
              >
                Guardar Cambios
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── studentSummaryModal (resumen mensual asistencia) ── spec 0013-d */}
      <Dialog
        open={isModalOpen('studentSummaryModal')}
        onOpenChange={(o) => setModalOpen('studentSummaryModal', o)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="px-4 py-3 bg-crok-soft border-b-2 border-crok">
            <DialogTitle className="text-crok font-semibold">
              Resumen del mes: <span id="summary-student-name">-</span>
            </DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <h6 id="summary-month-title" className="mb-4 text-crok font-semibold">-</h6>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-crok-soft">
                  <tr>
                    <th className="text-left p-2 text-crok font-semibold">Fecha</th>
                    <th className="text-left p-2 text-crok font-semibold">Estado</th>
                    <th className="text-left p-2 text-crok font-semibold">Nota / Comentario</th>
                  </tr>
                </thead>
                <tbody id="student-summary-body">{/* dinámico */}</tbody>
              </table>
            </div>
          </div>
          <DialogFooter className="bg-crok-soft px-4 py-3 gap-2 flex-wrap">
            <Button
              type="button"
              size="sm"
              id="summary-pdf-month-btn"
              className="bg-yellow-400 hover:bg-yellow-500 text-black"
              onClick={() => (window as unknown as { exportStudentAttendancePdf?: (s: string) => void }).exportStudentAttendancePdf?.('month')}
            >
              PDF este mes
            </Button>
            <Button
              type="button"
              size="sm"
              id="summary-pdf-all-btn"
              className="bg-crok hover:bg-crok-hover text-crok-on"
              onClick={() => (window as unknown as { exportStudentAttendancePdf?: (s: string) => void }).exportStudentAttendancePdf?.('all')}
            >
              PDF todos los meses
            </Button>
            <DialogClose asChild>
              <Button type="button" size="sm" variant="outline">Cerrar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── editTeamModal (editar miembro del equipo) ── spec 0013-e v2 (1/5) */}
      <Dialog
        open={isModalOpen('editTeamModal')}
        onOpenChange={(o) => setModalOpen('editTeamModal', o)}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar miembro del Equipo</DialogTitle>
          </DialogHeader>
          <form id="edit-team-form" className="space-y-3">
            <input type="hidden" id="edit-team-index" />
            <div className="space-y-1">
              <Label htmlFor="edit-team-name">Nombre</Label>
              <Input id="edit-team-name" readOnly className="bg-gray-100" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-team-role">Rol</Label>
              <Input id="edit-team-role" readOnly className="bg-gray-100" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-team-email">Email</Label>
              <Input type="email" id="edit-team-email" readOnly className="bg-gray-100" />
            </div>
            <div className="space-y-1">
              <Label className="font-bold flex items-center gap-1">
                <BookOpen className="h-4 w-4 text-crok" />
                Participación en Módulos
              </Label>
              <div
                id="edit-team-module-list"
                className="border rounded p-2 bg-gray-50 text-sm"
                style={{ minHeight: 40 }}
              >
                <span className="text-text-muted text-xs">Cargando módulos...</span>
              </div>
              <div className="text-xs text-text-muted flex items-center gap-1">
                <InfoIcon className="h-3 w-3" />
                Para cambiar los módulos de este integrante, debes hacerlo desde la pestaña de <strong>Colaboradores</strong>.
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-team-linkedin">
                LinkedIn <span className="text-text-muted text-xs">(opcional)</span>
              </Label>
              <Input type="url" id="edit-team-linkedin" placeholder="https://linkedin.com/in/..." />
            </div>
          </form>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              type="button"
              className="bg-crok hover:bg-crok-hover text-crok-on"
              onClick={() => (window as unknown as { updateTeamMember?: () => void }).updateTeamMember?.()}
            >
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── teamModal (agregar miembro del equipo) ── spec 0013-e (2/5) */}
      <Dialog
        open={isModalOpen('teamModal')}
        onOpenChange={(o) => setModalOpen('teamModal', o)}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agregar miembro del Equipo</DialogTitle>
          </DialogHeader>
          <form id="team-form" className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="team-from-collaborator" className="font-semibold">
                Seleccionar colaborador
              </Label>
              {/* select poblado por JS via innerHTML (sin children JSX: evita reconciliacion React de los <option>) */}
              <select
                id="team-from-collaborator"
                required
                onChange={() =>
                  (window as unknown as { fillTeamFromCollaborator?: () => void }).fillTeamFromCollaborator?.()
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-text-muted">
                Solo colaboradores asignados a este programa pueden ser agregados
              </p>
            </div>

            {/* preview del colaborador (se muestra/oculta con d-none desde JS) */}
            <div id="team-collab-preview" className="d-none">
              <div className="flex items-center gap-3 rounded border bg-gray-50 p-2">
                <CircleUser className="h-7 w-7 text-crok" />
                <div>
                  <div className="font-semibold" id="team-preview-name" />
                  <div className="text-sm text-text-muted" id="team-preview-email" />
                  <span className="badge mt-1" id="team-preview-role-badge" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="team-linkedin">
                LinkedIn <span className="text-text-muted text-xs">(opcional)</span>
              </Label>
              <Input type="url" id="team-linkedin" placeholder="https://linkedin.com/in/..." />
            </div>
          </form>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              type="button"
              className="bg-crok hover:bg-crok-hover text-crok-on"
              onClick={() => (window as unknown as { addTeamMember?: () => void }).addTeamMember?.()}
            >
              Agregar Miembro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── evaluationModal (evaluacion de proyecto) ── spec 0013-e (5/5) */}
      <Dialog
        open={isModalOpen('evaluationModal')}
        onOpenChange={(o) => setModalOpen('evaluationModal', o)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle id="eval-modal-title" className="flex items-center gap-2 text-crok">
              <ClipboardCheck className="h-5 w-5" />
              Evaluación
            </DialogTitle>
          </DialogHeader>
          {/* cuerpo poblado dinamicamente por openEvaluationModal() via innerHTML */}
          <div id="eval-modal-body" />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cerrar</Button>
            </DialogClose>
            <Button
              type="button"
              id="eval-modal-save-btn"
              className="d-none bg-crok hover:bg-crok-hover text-crok-on"
              onClick={() => (window as unknown as { saveProjectEvaluation?: () => void }).saveProjectEvaluation?.()}
            >
              <Save className="mr-1 h-4 w-4" />
              Guardar evaluación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── collaboratorModulesModal (gestionar modulos de colaborador) ── spec 0013-e/f */}
      <Dialog
        open={isModalOpen('collaboratorModulesModal')}
        onOpenChange={(o) => setModalOpen('collaboratorModulesModal', o)}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-crok">
              <UserCog className="h-5 w-5" />
              Gestionar Colaborador
            </DialogTitle>
          </DialogHeader>
          <div className="rounded border border-dashed p-3">
            <div className="text-lg font-bold" id="collab-name-display" />
            <div className="text-text-muted text-sm flex items-center gap-1">
              <Mail className="h-3 w-3" />
              <span id="collab-email-display" />
            </div>
            <span className="badge bg-primary mt-1 inline-block" id="collab-role-display" />
          </div>
          <div className="space-y-1">
            <Label className="font-bold">Módulos Asignados</Label>
            <p className="text-text-muted text-xs">
              Selecciona los módulos donde el colaborador tendrá presencia:
            </p>
            {/* checklist poblado por JS (openCollaboratorModulesModal) */}
            <div
              id="collab-modules-checklist"
              className="flex flex-col gap-2 rounded border bg-gray-50 p-3"
              style={{ maxHeight: 220, overflowY: 'auto' }}
            />
            <p className="text-text-muted text-xs">Los cambios se guardarán para esta promoción en curso.</p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cerrar</Button>
            </DialogClose>
            <Button
              type="button"
              className="bg-crok hover:bg-crok-hover text-crok-on"
              onClick={() => (window as unknown as { saveCollaboratorModules?: () => void }).saveCollaboratorModules?.()}
            >
              <Save className="mr-1 h-4 w-4" />
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── collaboratorModal (agregar colaborador) ── spec 0013-f */}
      <Dialog
        open={isModalOpen('collaboratorModal')}
        onOpenChange={(o) => setModalOpen('collaboratorModal', o)}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-crok">
              <UserPlus className="h-5 w-5" />
              Agregar Colaborador
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="collaborator-select">Seleccionar usuario</Label>
              {/* poblado por JS (openCollaboratorModal) via innerHTML */}
              <select
                id="collaborator-select"
                onChange={() => (window as unknown as { onCollaboratorSelected?: () => void }).onCollaboratorSelected?.()}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-text-muted text-xs">
                Los usuarios registrados recientemente deben al menos haber hecho un login para aparecer aquí.
              </p>
            </div>
            <div id="collaborator-info-preview" className="d-none">
              <div className="flex items-center gap-3 rounded border bg-gray-50 p-2">
                <CircleUser className="h-7 w-7 text-crok" />
                <div>
                  <div className="font-semibold" id="collab-preview-name" />
                  <div className="text-text-muted text-sm" id="collab-preview-email" />
                  <span className="badge mt-1" id="collab-preview-role-badge" />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label>
                Asignación de módulo <span className="text-text-muted text-xs">(Opcional)</span>
              </Label>
              <div
                id="collaborator-module-checklist"
                className="flex flex-col gap-2 rounded border p-2"
                style={{ maxHeight: 180, overflowY: 'auto' }}
              >
                <span className="text-text-muted text-xs">Cargando módulos...</span>
              </div>
              <p className="text-text-muted text-xs">
                Selecciona los módulos en los que estará presente. Puede ser más de uno o todos.
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              type="button"
              id="add-collaborator-btn"
              className="bg-crok hover:bg-crok-hover text-crok-on"
              onClick={() => (window as unknown as { addCollaboratorById?: () => void }).addCollaboratorById?.()}
            >
              Agregar Colaborador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── actaInicioModal (datos confidenciales) ── spec 0013-g */}
      <Dialog
        open={isModalOpen('actaInicioModal')}
        onOpenChange={(o) => setModalOpen('actaInicioModal', o)}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-crok">
              <ShieldCheck className="h-5 w-5" />
              Acta de Inicio — Datos Confidenciales
            </DialogTitle>
            <p className="text-text-muted text-xs">
              Solo visible para el equipo. No se muestra a los estudiantes.
            </p>
          </DialogHeader>
          {/* form inyectado una sola vez (memo); poblado por openActaModal() */}
          <ActaInicioBody />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const id = new URLSearchParams(window.location.search).get('id');
                (window as unknown as { Reports?: { printActaInicio?: (id: string | null) => void } }).Reports?.printActaInicio?.(id);
              }}
            >
              Generar PDF
            </Button>
            <Button
              type="button"
              className="bg-crok hover:bg-crok-hover text-crok-on"
              onClick={() => (window as unknown as { saveActaData?: () => void }).saveActaData?.()}
            >
              <Save className="mr-1 h-4 w-4" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm reutilizable (reemplaza _showConfirmModal de Bootstrap) ── spec 0013 */}
      <Dialog open={!!confirmDialog} onOpenChange={(o) => { if (!o) setConfirmDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar</DialogTitle>
          </DialogHeader>
          {confirmDialog && (
            <div dangerouslySetInnerHTML={{ __html: confirmDialog.htmlMessage }} />
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDialog(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className={
                confirmDialog?.confirmClass?.includes('danger')
                  ? 'bg-danger text-white hover:opacity-90'
                  : 'bg-crok hover:bg-crok-hover text-crok-on'
              }
              onClick={() => {
                const cb = confirmDialog?.onConfirm;
                setConfirmDialog(null);
                cb?.();
              }}
            >
              {confirmDialog?.confirmLabel ?? 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Input dialog reutilizable (reemplaza _showInputModal de Bootstrap) ── spec 0013 */}
      <Dialog
        open={!!inputDialog}
        onOpenChange={(o) => { if (!o) settleInputDialog(false); }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{inputDialog?.title ?? ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {inputDialog?.fields.map((f) => (
              <div key={f.id} className="space-y-1">
                <Label htmlFor={`__inp-${f.id}`}>{f.label}</Label>
                {f.type === 'textarea' ? (
                  <Textarea
                    id={`__inp-${f.id}`}
                    placeholder={f.placeholder || ''}
                    value={inputValues[f.id] ?? ''}
                    onChange={(e) => setInputValues((v) => ({ ...v, [f.id]: e.target.value }))}
                  />
                ) : (
                  <Input
                    id={`__inp-${f.id}`}
                    type={f.type || 'text'}
                    placeholder={f.placeholder || ''}
                    value={inputValues[f.id] ?? ''}
                    onChange={(e) => setInputValues((v) => ({ ...v, [f.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitInputDialog(); } }}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => settleInputDialog(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-crok hover:bg-crok-hover text-crok-on"
              onClick={submitInputDialog}
            >
              {inputDialog?.confirmLabel ?? 'Aceptar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── epcp: selector de competencias de proyecto (eval) ── spec 0013-h */}
      <Dialog open={isModalOpen('evalProjCompModal')} onOpenChange={(o) => setModalOpen('evalProjCompModal', o)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2 text-crok">
              <BookOpen className="h-5 w-5" />
              <span>Competencias del proyecto: <span id="epcp-proj-title" /></span>
            </DialogTitle>
            <p className="text-text-muted text-xs" id="epcp-mod-subtitle" />
          </DialogHeader>
          <EvalProjPickerBody />
          <DialogFooter className="p-4 pt-2 sm:justify-between">
            <span className="text-text-muted text-xs">
              Selecciona las competencias y elige qué herramientas se evaluarán en este proyecto.
            </span>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button
                type="button"
                className="bg-crok hover:bg-crok-hover text-crok-on"
                onClick={() => (window as unknown as { saveEvalProjectCompetences?: () => void }).saveEvalProjectCompetences?.()}
              >
                Guardar competencias
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── groupsModal (definir grupos de un proyecto) ── spec 0013-h */}
      <Dialog open={isModalOpen('groupsModal')} onOpenChange={(o) => setModalOpen('groupsModal', o)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-crok">
              <User className="h-5 w-5" />
              <span id="groups-modal-title">Definir grupos</span>
            </DialogTitle>
          </DialogHeader>
          <GroupsModalBody />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              type="button"
              variant="outline"
              onClick={() => (window as unknown as { sendTeamEmailsFromGroupsModal?: () => void }).sendTeamEmailsFromGroupsModal?.()}
            >
              Notificar equipos
            </Button>
            <Button
              type="button"
              className="bg-crok hover:bg-crok-hover text-crok-on"
              onClick={() => (window as unknown as { saveGroups?: () => void }).saveGroups?.()}
            >
              Guardar grupos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── addCompetenceModal (program-competences.js) ── spec 0014 Fase A */}
      <Dialog open={isModalOpen('addCompetenceModal')} onOpenChange={(o) => setModalOpen('addCompetenceModal', o)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-crok">
              <BookOpen className="h-5 w-5" />
              Añadir Competencia al Programa
            </DialogTitle>
          </DialogHeader>
          <AddCompetenceHost />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cerrar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── toolsEditorModal (program-competences.js) ── spec 0014 Fase A */}
      <Dialog open={isModalOpen('toolsEditorModal')} onOpenChange={(o) => setModalOpen('toolsEditorModal', o)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle><span id="tools-editor-title">Herramientas</span></DialogTitle>
          </DialogHeader>
          <ToolsEditorHost />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              type="button"
              className="bg-crok hover:bg-crok-hover text-crok-on"
              onClick={() => {
                const w = window as unknown as {
                  ProgramCompetences?: { _saveToolsSelection?: (i: number) => void };
                  _toolsEditorIdx?: number;
                };
                w.ProgramCompetences?._saveToolsSelection?.(w._toolsEditorIdx ?? -1);
              }}
            >
              <Save className="mr-1 h-4 w-4" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── fichaModal (student-tracking.js) ── spec 0014 Fase A */}
      <Dialog open={isModalOpen('fichaModal')} onOpenChange={(o) => setModalOpen('fichaModal', o)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="bg-gray-100 p-4">
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-crok" />
              Ficha de Seguimiento del Coder
            </DialogTitle>
            <small className="text-text-muted" id="ficha-student-subtitle">—</small>
          </DialogHeader>
          {/* #ficha-content lo inyecta _showFichaModal() (sin el modal-header) */}
          <FichaHost />
        </DialogContent>
      </Dialog>

      {/* ── weekSelectModal (reports.js _askWeekSelect, config de informe) ── spec 0014 Fase A */}
      <Dialog
        open={isModalOpen('weekSelectModal')}
        onOpenChange={(o) => {
          if (!o) {
            (window as unknown as { __weekSelectOnClose?: () => void }).__weekSelectOnClose?.();
            setModalOpen('weekSelectModal', false);
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2 text-crok">
              <ClipboardCheck className="h-5 w-5" />
              Seleccionar Semana
            </DialogTitle>
          </DialogHeader>
          {/* body inyectado por _askWeekSelect() */}
          <WeekSelectHost />
        </DialogContent>
      </Dialog>
    </div>
  );
}
