'use client';

import { useEffect, useState, useRef } from 'react';
import {
  LogOut,
  Calendar,
  CalendarX,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Eye,
  Zap,
  Map,
  Users,
  Wrench,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

export default function StudentDashboardPage() {
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const appointmentIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).APP_CONFIG = {
      API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).API_URL = (window as any).APP_CONFIG.API_URL;

    // ── Puente con JS legacy: reemplaza bootstrap.Modal del appointmentModal ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).openStudentAppointmentModal = () => setAppointmentOpen(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).closeStudentAppointmentModal = () => setAppointmentOpen(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).setStudentAppointmentIframeSrc = (url: string) => {
      if (appointmentIframeRef.current) appointmentIframeRef.current.src = url;
    };

    (async () => {
      try {
        await loadScript('/js/config.js');
        await loadScript('/js/shared.js');
        await loadScript('/js/student-dashboard.js');
      } catch (e) {
        console.error('Script load error:', e);
      }
    })();
  }, []);

  return (
    <div className="flex-1 w-full min-h-screen bg-bg-page">
      <div className="flex flex-col md:flex-row">

        {/* ── Sidebar ── */}
        <nav className="md:w-60 lg:w-64 shrink-0 bg-white border-r border-border md:min-h-screen p-4">
          <div className="flex flex-col h-full">
            <h1 id="nav-title" className="text-2xl font-bold mb-4 px-2 text-crok">Bootcamp</h1>
            <ul className="flex flex-col gap-1">
              <li><a className="flex items-center gap-2 px-3 py-2 rounded-md text-text hover:bg-crok-soft hover:text-crok transition-colors" href="#resumen"><Eye className="h-4 w-4" />Resumen</a></li>
              <li><a className="flex items-center gap-2 px-3 py-2 rounded-md text-text hover:bg-crok-soft hover:text-crok transition-colors" href="#roadmap"><Map className="h-4 w-4" />Roadmap</a></li>
              <li><a className="flex items-center gap-2 px-3 py-2 rounded-md text-text hover:bg-crok-soft hover:text-crok transition-colors" href="#details"><CheckCircle2 className="h-4 w-4" />Al detalle</a></li>
              <li><a className="flex items-center gap-2 px-3 py-2 rounded-md text-text hover:bg-crok-soft hover:text-crok transition-colors" href="#calendar"><Calendar className="h-4 w-4" />Calendario</a></li>
              <li><a className="flex items-center gap-2 px-3 py-2 rounded-md text-text hover:bg-crok-soft hover:text-crok transition-colors" href="#horario"><Clock className="h-4 w-4" />Horario</a></li>
              <li><a className="flex items-center gap-2 px-3 py-2 rounded-md text-text hover:bg-crok-soft hover:text-crok transition-colors" href="#equipo"><Users className="h-4 w-4" />Equipo</a></li>
              <li><a className="flex items-center gap-2 px-3 py-2 rounded-md text-text hover:bg-crok-soft hover:text-crok transition-colors" href="#evaluacion"><ClipboardCheck className="h-4 w-4" />Evaluación</a></li>
              <li><a className="flex items-center gap-2 px-3 py-2 rounded-md text-text hover:bg-crok-soft hover:text-crok transition-colors" href="#resources"><Wrench className="h-4 w-4" />Recursos</a></li>
              <li><a className="flex items-center gap-2 px-3 py-2 rounded-md text-text hover:bg-crok-soft hover:text-crok transition-colors" href="#link"><Zap className="h-4 w-4" />Quick Links</a></li>
              <li className="mt-3">
                <a
                  href="#"
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold transition-colors"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={(e) => { e.preventDefault(); (window as any).logout?.(); }}
                >
                  <LogOut className="h-4 w-4" />Logout
                </a>
              </li>
            </ul>
            <figure className="text-center p-3 mt-auto mb-0">
              <a href="https://factoriaf5.org/" target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/img/logo-factoria-b.svg" alt="Logotipo FactoriaF5" className="max-w-[100px] mx-auto" />
              </a>
            </figure>
          </div>
        </nav>

        {/* ── Main Content ── */}
        <main className="flex-1 p-4 md:p-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-crok">¡Hola <span id="student-name">Coder</span>! 👋</h2>

            {/* Resumen */}
            <section id="resumen" className="bg-white rounded-lg shadow border border-border p-4">
              <h5 className="font-bold flex items-center gap-2 text-crok mb-3"><Eye className="h-5 w-5" /> Resumen</h5>
              <div className="text-center">
                <p id="promotion-description" className="text-lg text-left p-3 m-0"></p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/img/info.png" alt="Infografía IA" className="max-h-[400px] object-contain mx-auto"
                  style={{ padding: '0 50px' }} />
              </div>
            </section>

            {/* Roadmap / Gantt */}
            <section id="roadmap" className="bg-white rounded-lg shadow border border-border p-4">
              <h5 className="font-bold flex items-center gap-2 text-crok mb-3"><Map className="h-5 w-5" /> Roadmap</h5>
              <p>🎯 El Bootcamp se basa en una pedagogía activa, centrada en el aprendizaje práctico mediante proyectos (learning by doing) y la enseñanza a través de la preparación e impartición de &apos;píldoras formativas&apos; (learning by teaching).</p>
              <div className="gantt-container mt-3">
                <div id="gantt-loading" className="text-center p-3">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-crok border-t-transparent" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                </div>
                <table id="gantt-table" className="w-full"></table>
              </div>
            </section>

            {/* Al detalle */}
            <section id="details" className="bg-white rounded-lg shadow border border-border p-4">
              <h5 className="font-bold flex items-center gap-2 text-crok mb-3"><Wrench className="h-5 w-5" /> Competencias al detalle</h5>
              <div className="accordion" id="accordion"></div>
            </section>

            {/* Calendar */}
            <section id="calendar" className="bg-white rounded-lg shadow border border-border p-4">
              <h5 className="font-bold flex items-center gap-2 text-crok mb-3"><Calendar className="h-5 w-5" /> Calendario</h5>
              <div id="gc-appointment-btn" className="mb-3"></div>
              <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                <iframe id="calendar-iframe" className="absolute inset-0 w-full h-full" style={{ border: 0 }}
                  frameBorder={0}></iframe>
                <div id="no-calendar-msg" className="hidden absolute inset-0 flex flex-col items-center justify-center bg-gray-50 rounded text-text-muted">
                  <CalendarX className="h-8 w-8 mb-2" />
                  <p className="m-0">No calendar configured for this promotion.</p>
                </div>
              </div>
            </section>

            {/* Horario */}
            <section id="horario" className="bg-white rounded-lg shadow border border-border p-4">
              <h5 className="font-bold flex items-center gap-2 text-crok mb-3"><Clock className="h-5 w-5" /> Horario</h5>
              <p>En el Google Calendar encontrarán la información de los eventos y la información de días online y presenciales.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Empezamos: Presencial (9:00) | Online (8:15). Daily, rompehielos, kata, etc.</li>
                <li>Presencial 9:30 | Online: 08:30 Píldoras, masterclases, etc.</li>
                <li>11:00 Descanso de 15 minutos</li>
                <li>11:15 Proyectos</li>
                <li>13:30 Media hora de almuerzo</li>
                <li>14:00 Cursos y certificaciones</li>
                <li>Fin: Presencial (16:30) | Online (15:45)</li>
              </ul>
            </section>

            {/* Equipo */}
            <section id="equipo" className="bg-white rounded-lg shadow border border-border p-4">
              <h5 className="font-bold flex items-center gap-2 text-crok mb-3"><Users className="h-5 w-5" /> Equipo</h5>
              <ul id="team-list" className="list-disc pl-5 space-y-1">
                <li><strong className="text-crok">Teachers &amp; Staff</strong></li>
                <li>Check your specific promotion details for staff assignments.</li>
              </ul>
            </section>

            {/* Evaluación */}
            <section id="evaluacion" className="bg-white rounded-lg shadow border border-border p-4">
              <h5 className="font-bold flex items-center gap-2 text-crok mb-3"><ClipboardCheck className="h-5 w-5" /> Evaluación</h5>
              <div>
                <p><strong>Evaluación de los proyectos</strong>. Se brindará retroalimentación oral el mismo día de la presentación del proyecto...</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Análisis de los commits realizados por les coders.</li>
                  <li>Participación individual en la presentación.</li>
                  <li>Capacidad de responder preguntas específicas.</li>
                </ul>
              </div>
            </section>

            {/* Recursos */}
            <section id="resources" className="bg-white rounded-lg shadow border border-border p-4">
              <h5 className="font-bold flex items-center gap-2 text-crok mb-3"><Wrench className="h-5 w-5" /> Recursos de interés</h5>
              <p className="m-0">Check &quot;Quick Links&quot; below for your specific promotion resources.</p>
            </section>

            {/* Quick Links */}
            <section id="link" className="bg-white rounded-lg shadow border border-border p-4">
              <h5 className="font-bold flex items-center gap-2 text-crok mb-3"><Zap className="h-5 w-5" /> Quick Links</h5>
              <div id="quick-links-container" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="text-center text-text-muted col-span-full">Cargando enlaces...</div>
              </div>
            </section>

          </div>
        </main>
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
    </div>
  );
}
