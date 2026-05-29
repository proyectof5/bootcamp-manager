'use client';

import { useEffect, useState, useRef } from 'react';
import {
  ArrowLeft,
  Award,
  BarChart3,
  Calendar,
  CalendarDays,
  CheckCircle2,
  CloudUpload,
  Eye,
  FileText,
  Info,
  Laptop,
  Lightbulb,
  Zap,
  Map,
  PlayCircle,
  Send,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

import './public-promotion.css';

// ── Script loader utility ──────────────────────────────────────────────────
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

export default function PublicPromotionPage() {
  // ── State para modales controlados ──
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const appointmentIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Expose APP_CONFIG + API_URL para scripts vanilla legacy
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).APP_CONFIG = {
      API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).API_URL = (window as any).APP_CONFIG.API_URL;

    // ── Puente con JS legacy: reemplaza bootstrap.Modal.show()/hide() ──
    // El JS legacy (public-promotion.js) llamaba new bootstrap.Modal(...).show().
    // Migrado para controlar los modales con useState desde el JSX, exponemos
    // funciones equivalentes en window.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).openPasswordModal = () => setPasswordOpen(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).closePasswordModal = () => setPasswordOpen(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).openAppointmentModal = () => setAppointmentOpen(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).closeAppointmentModal = () => setAppointmentOpen(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).setAppointmentIframeSrc = (url: string) => {
      if (appointmentIframeRef.current) appointmentIframeRef.current.src = url;
    };

    (async () => {
      try {
        await loadScript('/js/config.js');
        await loadScript('/js/public-promotion.js');
      } catch (e) {
        console.error('Script load error:', e);
      }
    })();
  }, []);

  return (
    <div style={{ flex: '1 1 100%', width: '100%', minHeight: '100vh' }}>
      {/* ── Password Access Modal (shadcn Dialog) ── */}
      <Dialog
        open={passwordOpen}
        onOpenChange={(open) => {
          // No permitir cerrar al hacer click fuera ni ESC (backdrop static)
          if (open) setPasswordOpen(true);
        }}
      >
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Acceso a la formación</DialogTitle>
          </DialogHeader>
          <p className="text-text-muted text-sm mb-3">
            Esta formación requiere contraseña. Introduce la contraseña que te han facilitado.
          </p>
          <div id="password-alert" className="hidden mb-3" role="alert">
            <Alert variant="destructive">
              <AlertDescription id="password-alert-text"></AlertDescription>
            </Alert>
          </div>
          <div className="space-y-2">
            <Label htmlFor="access-password">Contraseña</Label>
            <div className="relative">
              <Input
                id="access-password"
                type="password"
                placeholder="Introduce la contraseña"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 bg-transparent text-text-muted hover:text-crok hover:bg-transparent"
                aria-label="Mostrar/ocultar contraseña"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={() => (window as any).togglePasswordVisibility?.()}
              >
                <Eye className="h-4 w-4" id="togglePasswordIcon" />
              </Button>
            </div>
          </div>
          <Button
            type="button"
            className="w-full mt-4 bg-crok hover:bg-crok-hover text-crok-on"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={() => (window as any).verifyPromotionPassword?.()}
          >
            <span className="btn-text">Verificar</span>
          </Button>
        </DialogContent>
      </Dialog>

      {/* ── Main layout: container Bootstrap legacy mantenido (centra con margin auto) ── */}
      <div className="container">
        <div className="row">
          <main className="col-12 py-4">

            {/* ── Banner ── */}
            <div className="pp-banner mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img id="pp-banner-img" src="/img/f5_banner_roadmpa_manager.PNG" alt="Banner formación" className="pp-banner-img"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="pp-banner-body flex justify-between items-center">
                <div>
                  <h2 className="pp-banner-title" id="promotion-title">Cargando…</h2>
                  <p className="pp-banner-sub" id="pp-banner-sub"></p>
                </div>
                <a href="https://factoriaf5.org/" target="_blank" rel="noreferrer" className="ml-3 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/img/logo-factoria-b.svg" alt="Logotipo FactoriaF5"
                    style={{ maxHeight: 48, filter: 'brightness(0) invert(1)', opacity: 0.85 }} />
                </a>
              </div>
            </div>

            {/* ── Progress card ── */}
            <div className="pp-progress-card mb-4">
              <div className="pp-progress-label flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Progreso del bootcamp
              </div>
              <div className="progress mb-3 bg-gray-200 rounded" style={{ height: 14, borderRadius: 8 }}>
                <div id="pp-progress-bar" className="progress-bar h-full rounded text-white text-xs flex items-center justify-center" role="progressbar"
                  style={{ width: '0%', background: 'linear-gradient(90deg,var(--principal-1),#ff8c42)', borderRadius: 8 }}
                  aria-valuenow={0} aria-valuemin={0} aria-valuemax={100}>0%</div>
              </div>
              <div className="flex gap-3 flex-wrap">
                <div className="pp-stat-box"><div className="pp-stat-val" id="pp-stat-total">—</div><div className="pp-stat-lbl">Estudiantes activos</div></div>
                <div className="pp-stat-box"><div className="pp-stat-val" id="pp-stat-weeks-done" style={{ color: '#198754' }}>—</div><div className="pp-stat-lbl">Semanas transcurridas</div></div>
                <div className="pp-stat-box"><div className="pp-stat-val" id="pp-stat-weeks-left">—</div><div className="pp-stat-lbl">Semanas restantes</div></div>
                <div className="pp-stat-box"><div className="pp-stat-val" id="pp-stat-weeks-total">—</div><div className="pp-stat-lbl">Semanas totales</div></div>
              </div>
            </div>

            {/* ── Quick links ── */}
            <div className="pp-section-card mb-4" id="quick-links">
              <div className="pp-section-header flex items-center gap-2">
                <Zap className="pp-section-header-icon h-5 w-5" />
                <h5>Acciones Rápidas</h5>
              </div>
              <div className="pp-section-body">
                <div id="quick-links-list" className="flex flex-wrap gap-3"></div>
              </div>
            </div>

            {/* ── Aula Virtual CTA ── */}
            <div className="mb-4 hidden" id="pp-cta-aula-virtual">
              <a href="#" id="pp-cta-link" className="pp-cta-btn inline-flex items-center gap-2"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(e) => { e.preventDefault(); (window as any).openAulaVirtualPage?.(e); }}>
                <Laptop className="h-4 w-4" />Ir al Aula Virtual
              </a>
            </div>

            {/* ── Próxima Píldora + Calendario ── */}
            <div className="pp-pildora-calendar-row mb-4">
              <div className="flex min-w-0">
                <div className="pp-notice-card flex-1 w-full" id="pp-next-pildora-notice">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    <span className="font-bold" style={{ color: 'var(--principal-1)' }}>Próxima Píldora</span>
                  </div>
                  <div id="pp-next-pildora-body" className="text-text-muted text-sm">
                    <em>Sin píldoras próximas.</em>
                  </div>
                </div>
              </div>
              <div className="min-w-0" id="calendar">
                <div className="pp-section-card mb-0 hidden" id="calendar-card">
                  <div className="pp-section-header flex items-center gap-2">
                    <Calendar className="pp-section-header-icon h-5 w-5" />
                    <h5>Calendario</h5>
                  </div>
                  <div className="pp-section-body p-0">
                    <div id="gc-appointment-btn" className="p-2" style={{ display: 'flex', justifyContent: 'flex-end' }}></div>
                    <iframe id="calendar-iframe" style={{ width: '100%', height: 320, border: 'none' }} allowFullScreen></iframe>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Tabs nav (las clases pp-tabs son legacy, JS legacy las activa) ── */}
            <ul className="pp-tabs mb-4 flex gap-1" id="pp-main-tabs">
              <li className="nav-item">
                <button className="nav-link active flex items-center gap-2" id="tab-progreso-btn"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={() => (window as any).switchPublicTab?.('progreso')}>
                  <PlayCircle className="h-4 w-4" />En progreso
                </button>
              </li>
              <li className="nav-item">
                <button className="nav-link flex items-center gap-2" id="tab-info-btn"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={() => (window as any).switchPublicTab?.('info')}>
                  <Info className="h-4 w-4" />Información General
                </button>
              </li>
            </ul>

            {/* ── Tab: En Progreso ── */}
            <div id="tab-progreso">
              <div className="pp-section-card mb-4" id="roadmap">
                <div className="pp-section-header flex items-center gap-2">
                  <Map className="pp-section-header-icon h-5 w-5" />
                  <h5>Roadmap</h5>
                </div>
                <div className="pp-section-body p-0">
                  <div className="overflow-x-auto p-3">
                    <table id="gantt-table" className="w-full text-sm"></table>
                  </div>
                </div>
              </div>
              <div id="pildoras-wrapper"></div>
              <div id="recursos-wrapper"></div>
              <div id="sections-container"></div>
            </div>

            {/* ── Tab: Información General ── */}
            <div id="tab-info" className="hidden">
              <div id="horario-wrapper"></div>
              <div id="evaluacion-wrapper"></div>
              <div className="pp-section-card mb-4 hidden" id="competences-section">
                <div className="pp-section-header flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Award className="pp-section-header-icon h-5 w-5" />
                    <h5 className="m-0">Competencias</h5>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="public-competences-area-filter" className="m-0 text-xs font-semibold text-text-muted">Área:</Label>
                    {/* Native select porque el JS legacy lo rellena con options dinámicamente */}
                    <select
                      id="public-competences-area-filter"
                      className="h-8 text-sm rounded-md border border-input bg-transparent px-2"
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      onChange={() => (window as any).filterPublicCompetences?.()}
                    >
                      <option value="">Todas</option>
                    </select>
                  </div>
                </div>
                <div className="pp-section-body">
                  <div id="public-competences-list"></div>
                </div>
              </div>
              <div id="equipo-wrapper"></div>
            </div>

            {/* ── Aula Virtual page (hidden, mostrada con JS legacy) ── */}
            <div className="hidden" id="aula-virtual-page">
              <div className="bg-white rounded-lg shadow border border-border">
                <div className="p-4">
                  <div className="flex justify-between items-center flex-wrap gap-2 mb-3">
                    <h5 className="m-0 flex items-center gap-2 text-lg font-semibold">
                      <Laptop className="h-5 w-5" />Aula Virtual
                    </h5>
                    <Button
                      variant="outline"
                      size="sm"
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      onClick={() => (window as any).closeAulaVirtualPage?.()}
                    >
                      <ArrowLeft className="mr-1 h-3 w-3" />Volver al inicio
                    </Button>
                  </div>
                  <div id="aula-virtual-empty" className="bg-gray-50 border border-gray-200 rounded p-3 text-text-muted text-sm flex items-center gap-2 mb-0">
                    <Info className="h-4 w-4" />No hay ningún proyecto activo en este momento.
                  </div>
                  <div id="aula-virtual-content" className="hidden">
                    <div className="mb-4">
                      <p className="mb-3 font-semibold text-lg hidden text-center" id="aula-virtual-project-title"></p>
                      <h6 className="text-xs uppercase text-text-muted mb-1 flex items-center gap-1"><FileText className="h-3 w-3" />Briefing del proyecto</h6>
                      <p className="m-0" id="aula-virtual-briefing"></p>
                    </div>
                    <div className="mb-4 hidden" id="aula-virtual-due-date-section">
                      <div className="bg-yellow-50 border border-yellow-300 rounded p-2 flex items-center gap-2 mb-0 text-sm">
                        <CalendarDays className="h-4 w-4 text-yellow-700" />
                        <span><strong>Fecha de entrega:</strong> <span id="aula-virtual-due-date-display" className="ml-1"></span></span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <h6 className="text-xs uppercase text-text-muted mb-1 flex items-center gap-1"><Award className="h-3 w-3" />Competencias a evaluar</h6>
                      <div id="aula-virtual-competences"></div>
                    </div>
                    <div className="mb-4 hidden" id="aula-virtual-submissions-section">
                      <h6 className="text-xs uppercase text-text-muted mb-2 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Entregas realizadas</h6>
                      <div id="aula-virtual-submissions-list" className="flex flex-col gap-1"></div>
                    </div>
                    <div className="border-t pt-3">
                      <h6 className="text-xs uppercase text-text-muted mb-2 flex items-center gap-1"><CloudUpload className="h-3 w-3" />Entrega de repositorio</h6>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-5 space-y-1">
                          <Label className="text-xs font-semibold text-text-muted" id="aula-virtual-target-label">Identificación</Label>
                          {/* Native select porque el JS legacy lo rellena dinámicamente */}
                          <select
                            id="aula-virtual-target-select"
                            className="h-8 w-full text-sm rounded-md border border-input bg-transparent px-2"
                          >
                            <option value="">Selecciona tu nombre…</option>
                          </select>
                        </div>
                        <div className="md:col-span-7 space-y-1">
                          <Label className="text-xs font-semibold text-text-muted">URL del repositorio</Label>
                          <div className="flex h-8 items-center rounded-md border border-input overflow-hidden">
                            <span className="bg-gray-100 text-text-muted text-sm px-2 truncate" id="aula-virtual-repo-prefix"
                              style={{ maxWidth: '60%' }}>
                              https://github.com/proyectof5/
                            </span>
                            <input type="text" className="flex-1 h-full px-2 text-sm bg-transparent outline-none" id="aula-virtual-repo-suffix" placeholder="nombre-repo-estudiante" />
                          </div>
                          <p className="text-xs text-text-muted">Solo escribe el nombre de tu repositorio. El prefijo es fijo.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          type="button"
                          size="sm"
                          className="bg-crok hover:bg-crok-hover text-crok-on"
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          onClick={() => (window as any).submitVirtualClassroomDelivery?.()}
                        >
                          <span className="btn-label flex items-center gap-1"><Send className="h-3 w-3" />Enviar entrega</span>
                        </Button>
                        <span id="aula-virtual-feedback" className="text-xs text-text-muted"></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </main>
        </div>
      </div>

      {/* ── Appointment Modal (shadcn Dialog) ── */}
      <Dialog open={appointmentOpen} onOpenChange={setAppointmentOpen}>
        <DialogContent className="max-w-5xl p-0 gap-0 h-[85vh] flex flex-col">
          <DialogHeader className="px-4 py-2 border-b shrink-0">
            <DialogTitle className="text-base">Reservar una cita</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <iframe
              ref={appointmentIframeRef}
              id="appointment-iframe"
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="camera; microphone; geolocation"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Info tab: additional progress bars (used by renderProgressBar) ── */}
      <div style={{ display: 'none' }}>
        <div id="pp-progress-bar-info"></div>
        <div id="pp-info-stat-total"></div>
        <div id="pp-info-stat-weeks-done"></div>
        <div id="pp-info-stat-weeks-left"></div>
        <div id="pp-info-stat-weeks-total"></div>
        <div id="pp-info-title"></div>
        <div id="pp-info-sub"></div>
      </div>
    </div>
  );
}
