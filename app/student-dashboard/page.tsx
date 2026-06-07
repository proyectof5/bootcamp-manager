'use client';

import { useEffect, useState, type ComponentType } from 'react';
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
  Mail,
  Info,
  Link2,
  Video,
  MessageSquare,
  LayoutGrid,
  Code2,
  ExternalLink,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';
import { GanttTable } from './_components/GanttTable';
import { ModulesAccordion } from './_components/ModulesAccordion';
import type {
  Promotion,
  ExtendedInfo,
  CalendarInfo,
  QuickLink,
  Schedule,
  TeamMember,
  ResourceItem,
} from './_components/types';

const PLATFORM_ICON: Record<string, ComponentType<{ className?: string }>> = {
  zoom: Video,
  discord: MessageSquare,
  classroom: LayoutGrid,
  github: Code2,
  custom: Link2,
};

function Spinner() {
  return (
    <div className="text-center p-3">
      <div
        className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-crok border-t-transparent"
        role="status"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
}

export default function StudentDashboardPage() {
  const { user, isLoading, logout } = useAuth();

  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [extended, setExtended] = useState<ExtendedInfo | null>(null);
  const [calendar, setCalendar] = useState<CalendarInfo | null>(null);
  const [quickLinks, setQuickLinks] = useState<QuickLink[] | null>(null);
  const [noEnrollment, setNoEnrollment] = useState(false);

  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [appointmentUrl, setAppointmentUrl] = useState('');

  useEffect(() => {
    if (isLoading || !user) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await apiFetch('/api/my-enrollments');
        if (!res.ok) {
          console.error('Failed to fetch enrollments:', res.status);
          return;
        }
        const promos: Promotion[] = await res.json();
        if (cancelled) return;
        if (!promos.length) {
          setNoEnrollment(true);
          return;
        }
        const promo = promos[0];
        setPromotion(promo);

        const pid = promo.id || promo._id;
        if (!pid) return;

        const [ext, cal, ql] = await Promise.all([
          apiFetch(`/api/promotions/${pid}/extended-info`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          apiFetch(`/api/promotions/${pid}/calendar`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          apiFetch(`/api/promotions/${pid}/quick-links`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);
        if (cancelled) return;
        setExtended(ext);
        setCalendar(cal);
        setQuickLinks(ql || []);
      } catch (e) {
        console.error('Error loading dashboard:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoading, user]);

  const openAppointment = (url: string) => {
    setAppointmentUrl(url);
    setAppointmentOpen(true);
  };

  const navLink = 'flex items-center gap-2 px-3 py-2 rounded-md text-text hover:bg-crok-soft hover:text-crok transition-colors';
  const cardCls = 'bg-white rounded-lg shadow border border-border p-4';
  const cardTitle = 'font-bold flex items-center gap-2 text-crok mb-3';

  return (
    <div className="flex-1 w-full min-h-screen bg-bg-page">
      <div className="flex flex-col md:flex-row">
        {/* ── Sidebar ── */}
        <nav className="md:w-60 lg:w-64 shrink-0 bg-white border-r border-border md:min-h-screen p-4">
          <div className="flex flex-col h-full">
            <h1 className="text-2xl font-bold mb-4 px-2 text-crok">Bootcamp</h1>
            <ul className="flex flex-col gap-1">
              <li><a className={navLink} href="#resumen"><Eye className="h-4 w-4" />Resumen</a></li>
              <li><a className={navLink} href="#roadmap"><Map className="h-4 w-4" />Roadmap</a></li>
              <li><a className={navLink} href="#details"><CheckCircle2 className="h-4 w-4" />Al detalle</a></li>
              <li><a className={navLink} href="#calendar"><Calendar className="h-4 w-4" />Calendario</a></li>
              <li><a className={navLink} href="#horario"><Clock className="h-4 w-4" />Horario</a></li>
              <li><a className={navLink} href="#equipo"><Users className="h-4 w-4" />Equipo</a></li>
              <li><a className={navLink} href="#evaluacion"><ClipboardCheck className="h-4 w-4" />Evaluación</a></li>
              <li><a className={navLink} href="#resources"><Wrench className="h-4 w-4" />Recursos</a></li>
              <li><a className={navLink} href="#link"><Zap className="h-4 w-4" />Quick Links</a></li>
              <li className="mt-3">
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold transition-colors"
                  onClick={() => logout()}
                >
                  <LogOut className="h-4 w-4" />Logout
                </button>
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
          {noEnrollment ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-800 text-center p-8 mt-4">
              <h3 className="text-xl font-bold mb-2">No tienes programas activos</h3>
              <p className="m-0">Parece que aún no estás matriculado/a en ningún bootcamp.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-crok">
                ¡Hola <span>{user?.name || 'Coder'}</span>! 👋
              </h2>

              {/* Resumen */}
              <section id="resumen" className={cardCls}>
                <h5 className={cardTitle}><Eye className="h-5 w-5" /> Resumen</h5>
                <div className="text-center">
                  <p className="text-lg text-left p-3 m-0">{promotion?.description || ''}</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/img/info.png" alt="Infografía IA" className="max-h-[400px] object-contain mx-auto" style={{ padding: '0 50px' }} />
                </div>
              </section>

              {/* Roadmap / Gantt */}
              <section id="roadmap" className={cardCls}>
                <h5 className={cardTitle}><Map className="h-5 w-5" /> Roadmap</h5>
                <p>🎯 El Bootcamp se basa en una pedagogía activa, centrada en el aprendizaje práctico mediante proyectos (learning by doing) y la enseñanza a través de la preparación e impartición de &apos;píldoras formativas&apos; (learning by teaching).</p>
                <div className="gantt-container mt-3 overflow-x-auto">
                  {promotion ? <GanttTable promotion={promotion} /> : <Spinner />}
                </div>
              </section>

              {/* Al detalle */}
              <section id="details" className={cardCls}>
                <h5 className={cardTitle}><Wrench className="h-5 w-5" /> Competencias al detalle</h5>
                {promotion?.modules?.length ? (
                  <ModulesAccordion modules={promotion.modules} />
                ) : (
                  <p className="text-muted-foreground m-0">Sin módulos definidos.</p>
                )}
              </section>

              {/* Calendar */}
              <section id="calendar" className={cardCls}>
                <h5 className={cardTitle}><Calendar className="h-5 w-5" /> Calendario</h5>
                {calendar?.googleAppointmentUrl && (
                  <div className="mb-3 flex justify-end">
                    <button
                      type="button"
                      className="text-white rounded px-4 py-2 font-medium"
                      style={{ backgroundColor: '#F4511E' }}
                      onClick={() => openAppointment(calendar.googleAppointmentUrl!)}
                    >
                      Reservar una cita
                    </button>
                  </div>
                )}
                <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                  {calendar?.googleCalendarId ? (
                    <iframe
                      className="absolute inset-0 w-full h-full"
                      style={{ border: 0 }}
                      src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendar.googleCalendarId)}&ctz=Europe/Madrid`}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 rounded text-muted-foreground">
                      <CalendarX className="h-8 w-8 mb-2" />
                      <p className="m-0">No calendar configured for this promotion.</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Horario */}
              <section id="horario" className={cardCls}>
                <h5 className={cardTitle}><Clock className="h-5 w-5" /> Horario</h5>
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
                <ScheduleBlock schedule={extended?.schedule ?? null} />
              </section>

              {/* Equipo */}
              <section id="equipo" className={cardCls}>
                <h5 className={cardTitle}><Users className="h-5 w-5" /> Equipo</h5>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong className="text-crok">Teachers &amp; Staff</strong></li>
                  <li>Check your specific promotion details for staff assignments.</li>
                </ul>
                <TeamBlock team={extended?.team ?? null} />
              </section>

              {/* Evaluación */}
              <section id="evaluacion" className={cardCls}>
                <h5 className={cardTitle}><ClipboardCheck className="h-5 w-5" /> Evaluación</h5>
                <div>
                  <p><strong>Evaluación de los proyectos</strong>. Se brindará retroalimentación oral el mismo día de la presentación del proyecto...</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Análisis de los commits realizados por les coders.</li>
                    <li>Participación individual en la presentación.</li>
                    <li>Capacidad de responder preguntas específicas.</li>
                  </ul>
                </div>
                <EvaluationBlock evaluation={extended?.evaluation ?? null} />
              </section>

              {/* Recursos */}
              <section id="resources" className={cardCls}>
                <h5 className={cardTitle}><Wrench className="h-5 w-5" /> Recursos de interés</h5>
                <p className="m-0">Check &quot;Quick Links&quot; below for your specific promotion resources.</p>
                <ResourcesBlock resources={extended?.resources ?? null} />
              </section>

              {/* Quick Links */}
              <section id="link" className={cardCls}>
                <h5 className={cardTitle}><Zap className="h-5 w-5" /> Quick Links</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {quickLinks === null ? (
                    <div className="text-center text-muted-foreground col-span-full">Cargando enlaces...</div>
                  ) : quickLinks.length === 0 ? (
                    <div className="text-center text-muted-foreground col-span-full">No links available</div>
                  ) : (
                    quickLinks.map((link, i) => {
                      const Icon = PLATFORM_ICON[link.platform || 'custom'] || Link2;
                      return (
                        <a
                          key={i}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 border border-crok text-crok hover:bg-crok hover:text-white rounded px-4 py-2 transition-colors"
                        >
                          <Icon className="h-4 w-4" /> {link.name}
                        </a>
                      );
                    })
                  )}
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      {/* ── Appointment Modal (shadcn Dialog) ── */}
      <Dialog open={appointmentOpen} onOpenChange={setAppointmentOpen}>
        <DialogContent className="max-w-5xl p-0 gap-0 h-[85vh] flex flex-col">
          <DialogHeader className="px-4 py-2 border-b shrink-0">
            <DialogTitle className="text-base">Reservar una cita</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {appointmentUrl && (
              <iframe
                src={appointmentUrl}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="camera; microphone; geolocation"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Bloques dinámicos (extended-info) ───────────────────────────────────── */

function ScheduleBlock({ schedule }: { schedule: Schedule | null }) {
  if (!schedule) return null;
  const hasOnline = schedule.online && Object.values(schedule.online).some(Boolean);
  const hasPresential = schedule.presential && Object.values(schedule.presential).some(Boolean);
  const hasNotes = !!schedule.notes;

  if (!hasOnline && !hasPresential && !hasNotes) {
    return (
      <div className="mt-4 p-3 bg-gray-50 rounded">
        <h6 className="text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" />No custom schedule information available</h6>
        <p className="text-muted-foreground m-0">Using default schedule shown above.</p>
      </div>
    );
  }

  const Row = ({ label, value }: { label: string; value?: string }) =>
    value ? <li><strong>{label}:</strong> {value}</li> : null;

  return (
    <div className="mt-4 p-3 bg-gray-50 rounded">
      <h6 className="text-crok flex items-center gap-2 mb-2"><Clock className="h-4 w-4" />Custom Schedule Information</h6>
      {hasOnline && (
        <div className="mb-3">
          <h6 className="text-crok">📱 Online Schedule</h6>
          <ul className="list-disc pl-5 mb-0">
            <Row label="Entry" value={schedule.online!.entry} />
            <Row label="Start" value={schedule.online!.start} />
            <Row label="Break" value={schedule.online!.break} />
            <Row label="Lunch" value={schedule.online!.lunch} />
            <Row label="Finish" value={schedule.online!.finish} />
          </ul>
        </div>
      )}
      {hasPresential && (
        <div className="mb-3">
          <h6 className="text-green-600">🏢 Presential Schedule</h6>
          <ul className="list-disc pl-5 mb-0">
            <Row label="Entry" value={schedule.presential!.entry} />
            <Row label="Start" value={schedule.presential!.start} />
            <Row label="Break" value={schedule.presential!.break} />
            <Row label="Lunch" value={schedule.presential!.lunch} />
            <Row label="Finish" value={schedule.presential!.finish} />
          </ul>
        </div>
      )}
      {hasNotes && (
        <div className="rounded border border-sky-200 bg-sky-50 text-sky-800 p-3 flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 shrink-0" /><span><strong>Notes:</strong> {schedule.notes}</span>
        </div>
      )}
    </div>
  );
}

function TeamBlock({ team }: { team: TeamMember[] | null }) {
  if (!team || team.length === 0) return null;
  return (
    <ul className="list-none pl-0 mt-2 space-y-2">
      {team.map((member, i) => (
        <li key={i} className="p-2 bg-gray-50 rounded">
          <strong className="text-crok">{member.name || 'Unknown'}</strong>
          {member.role && <> <Badge variant="secondary">{member.role}</Badge></>}
          {member.email && (
            <div className="text-sm mt-1">
              <a href={`mailto:${member.email}`} className="inline-flex items-center gap-1 text-crok hover:underline">
                <Mail className="h-3.5 w-3.5" />{member.email}
              </a>
            </div>
          )}
          {member.linkedin && (
            <a href={member.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-crok hover:underline">
              <ExternalLink className="h-3.5 w-3.5" /> LinkedIn
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

function ResourcesBlock({ resources }: { resources: ResourceItem[] | null }) {
  if (!resources || resources.length === 0) return null;
  return (
    <div className="mt-4">
      <h6 className="text-green-600 mb-3 flex items-center gap-2"><Link2 className="h-4 w-4" />Additional Resources</h6>
      <div className="flex flex-col rounded-md border border-border overflow-hidden">
        {resources.map((r, i) => (
          <a
            key={i}
            href={r.url || '#'}
            target="_blank"
            rel="noreferrer"
            className="flex w-100 justify-between items-center gap-2 p-3 border-b border-border last:border-b-0 hover:bg-gray-50 transition-colors"
          >
            <div>
              <h6 className="mb-1 font-semibold">{r.title || 'Untitled Resource'}</h6>
              {r.url && <small className="text-muted-foreground break-all">{r.url}</small>}
            </div>
            {r.category && <Badge variant="secondary">{r.category}</Badge>}
          </a>
        ))}
      </div>
    </div>
  );
}

function EvaluationBlock({ evaluation }: { evaluation: string | null }) {
  if (!evaluation) return null;
  const isHtml = /<[a-z]/i.test(evaluation);
  return (
    <div className="mt-4 p-3 rounded border border-crok" style={{ backgroundColor: 'var(--crok-soft, #fff1ea)' }}>
      <h6 className="text-crok mb-3 flex items-center gap-2"><Info className="h-4 w-4" />Custom Evaluation Information</h6>
      {isHtml ? (
        <div className="text-text" dangerouslySetInnerHTML={{ __html: evaluation }} />
      ) : (
        <div className="text-text whitespace-pre-line">{evaluation}</div>
      )}
    </div>
  );
}
