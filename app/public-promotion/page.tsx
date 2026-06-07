'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart3,
  Calendar,
  Eye,
  EyeOff,
  Info,
  Lightbulb,
  Zap,
  Map,
  PlayCircle,
  Video,
  MessageSquare,
  Code2,
  Globe,
  ExternalLink,
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
import { getApiUrl } from '@/lib/api';
import { PublicGanttTable } from './_components/PublicGanttTable';
import {
  GenericSections,
  ScheduleSection,
  TeamSection,
  EvaluationSection,
  ProgramResourcesSection,
  InternalResourcesSection,
} from './_components/InfoSections';
import { PildorasSection } from './_components/Pildoras';
import { CompetencesSection } from './_components/Competences';
import type {
  PPPromotion,
  PPQuickLink,
  PPCalendar,
  PPStudent,
  PPSection,
  PPPromoResource,
  PPExtendedInfo,
} from './_components/types';

import './public-promotion.css';

const API_URL = getApiUrl();

type Access = 'checking' | 'password' | 'ready' | 'notfound';

function platformIcon(link: PPQuickLink): { Icon: React.ComponentType<{ className?: string }>; color: string } {
  const name = (link.name || '').toLowerCase();
  const platform = (link.platform || '').toLowerCase();
  if (platform === 'zoom' || name.includes('zoom')) return { Icon: Video, color: '#2D8CFF' };
  if (platform === 'discord' || name.includes('discord')) return { Icon: MessageSquare, color: '#5865F2' };
  if (platform === 'github' || name.includes('github')) return { Icon: Code2, color: '#333' };
  if (name.includes('meet')) return { Icon: Globe, color: '#ea4335' };
  return { Icon: ExternalLink, color: 'var(--principal-1)' };
}

function formatDateShort(d?: string): string {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

export default function PublicPromotionPage() {
  const [promotionId, setPromotionId] = useState<string | null>(null);
  const [access, setAccess] = useState<Access>('checking');

  const [promotion, setPromotion] = useState<PPPromotion | null>(null);
  const [quickLinks, setQuickLinks] = useState<PPQuickLink[]>([]);
  const [calendar, setCalendar] = useState<PPCalendar | null>(null);
  const [students, setStudents] = useState<PPStudent[]>([]);
  const [sections, setSections] = useState<PPSection[]>([]);
  const [promoResources, setPromoResources] = useState<PPPromoResource[]>([]);
  const [extended, setExtended] = useState<PPExtendedInfo | null>(null);

  const [activeTab, setActiveTab] = useState<'progreso' | 'info'>('progreso');

  // password modal
  const [passwordValue, setPasswordValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [verifying, setVerifying] = useState(false);

  // appointment modal
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [appointmentUrl, setAppointmentUrl] = useState('');

  const loadContent = useCallback(async (id: string) => {
    const get = <T,>(path: string, fallback: T): Promise<T> =>
      fetch(`${API_URL}/api/promotions/${id}${path}`).then((r) => (r.ok ? r.json() : fallback)).catch(() => fallback);
    const [promo, ql, cal, studs, secs, promoRes, ext] = await Promise.all([
      get<PPPromotion | null>('', null),
      get<PPQuickLink[]>('/quick-links', []),
      get<PPCalendar | null>('/calendar', null),
      get<PPStudent[]>('/public-students', []),
      get<PPSection[]>('/sections', []),
      get<PPPromoResource[]>('/promotion-resources', []),
      get<PPExtendedInfo | null>(`/extended-info?t=${Date.now()}`, null),
    ]);
    if (promo) {
      setPromotion(promo);
      document.title = `${promo.name} - Bootcamp`;
    }
    setQuickLinks(Array.isArray(ql) ? ql : []);
    setCalendar(cal);
    setStudents(Array.isArray(studs) ? studs : []);
    setSections(Array.isArray(secs) ? secs : []);
    setPromoResources(Array.isArray(promoRes) ? promoRes : []);
    setExtended(ext);
    setAccess('ready');
  }, []);

  // Recarga solo extended-info (tras auto-asignarse a una píldora, y por polling)
  const reloadExtended = useCallback(async (id: string) => {
    try {
      const r = await fetch(`${API_URL}/api/promotions/${id}/extended-info?t=${Date.now()}`);
      if (r.ok) setExtended(await r.json());
    } catch {
      /* noop */
    }
  }, []);

  // Polling de extended-info cada 30s (estado de auto-asignación de píldoras),
  // en pausa cuando la pestaña está oculta.
  useEffect(() => {
    if (access !== 'ready' || !promotionId) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => { timer = setInterval(() => reloadExtended(promotionId), 30000); };
    const onVis = () => {
      if (document.hidden) { if (timer) clearInterval(timer); timer = null; }
      else if (!timer) { reloadExtended(promotionId); start(); }
    };
    start();
    document.addEventListener('visibilitychange', onVis);
    return () => { if (timer) clearInterval(timer); document.removeEventListener('visibilitychange', onVis); };
  }, [access, promotionId, reloadExtended]);

  // ── Flujo de acceso (preview / pwd en URL / contraseña) ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const preview = params.get('preview') === '1';
    const pwd = params.get('pwd');
    if (!id) {
      setAccess('notfound');
      return;
    }
    setPromotionId(id);

    (async () => {
      if (preview) {
        await loadContent(id);
        return;
      }
      if (pwd) {
        const ok = await verifyPasswordRequest(id, pwd);
        if (ok) await loadContent(id);
        else await checkPasswordRequirement(id);
        return;
      }
      await checkPasswordRequirement(id);
    })();

    async function checkPasswordRequirement(pid: string) {
      try {
        const res = await fetch(`${API_URL}/api/promotions/${pid}`);
        if (!res.ok) return;
        const promo = await res.json();
        if (promo.accessPassword) {
          setAccess('password');
        } else {
          await loadContent(pid);
        }
      } catch (e) {
        console.error('Error checking password requirement:', e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadContent]);

  async function verifyPasswordRequest(id: string, password: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/api/promotions/${id}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const ct = res.headers.get('content-type');
      const data = ct && ct.includes('application/json') ? await res.json() : {};
      if (res.ok) {
        sessionStorage.setItem('promotionAccessToken', data.accessToken);
        sessionStorage.setItem('promotionId', id);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  const submitPassword = async () => {
    if (!passwordValue) {
      setPasswordError('Please enter the password');
      return;
    }
    setPasswordError('');
    setVerifying(true);
    try {
      const res = await fetch(`${API_URL}/api/promotions/${promotionId}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordValue }),
      });
      const ct = res.headers.get('content-type');
      const data = ct && ct.includes('application/json') ? await res.json() : {};
      if (res.ok) {
        sessionStorage.setItem('promotionAccessToken', data.accessToken);
        sessionStorage.setItem('promotionId', promotionId!);
        setAccess('checking');
        await loadContent(promotionId!);
      } else {
        setPasswordError(data.error || 'Invalid password. Please try again.');
      }
    } catch {
      setPasswordError('Connection error. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const openAppointment = (url: string) => {
    setAppointmentUrl(url);
    setAppointmentOpen(true);
  };

  // ── Progreso ──
  const progress = (() => {
    const active = students.filter((s) => !s.isWithdrawn && !s.withdrawn).length || students.length;
    let pct = 0, weeksDone = 0, weeksLeft = 0, totalWeeks = 0;
    if (promotion) {
      totalWeeks = promotion.weeks || 0;
      if (totalWeeks > 0 && promotion.startDate) {
        const start = new Date(promotion.startDate);
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        weeksDone = Math.max(0, Math.min(totalWeeks, Math.floor((Date.now() - start.getTime()) / msPerWeek)));
        weeksLeft = Math.max(0, totalWeeks - weeksDone);
        pct = Math.round((weeksDone / totalWeeks) * 100);
      }
    }
    return { active, pct, weeksDone, weeksLeft, totalWeeks };
  })();

  // Próxima píldora (de modulesPildoras o legacy)
  const nextPildora = (() => {
    if (!extended) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fromModules = (extended.modulesPildoras || []).filter((mp) => mp.pildoras?.length);
    const all = fromModules.length ? fromModules.flatMap((mp) => mp.pildoras || []) : extended.pildoras || [];
    let best: { title?: string; date?: string; mode?: string } | null = null;
    let bestDate: Date | null = null;
    all.forEach((p) => {
      if (!p.date || !p.date.trim()) return;
      const d = new Date(p.date);
      d.setHours(0, 0, 0, 0);
      if (d >= today && (!bestDate || d < bestDate)) {
        bestDate = d;
        best = p;
      }
    });
    return best;
  })();

  if (access === 'notfound') {
    return <div className="alert alert-danger m-5">Promotion not found</div>;
  }

  const sub = promotion?.startDate && promotion?.endDate
    ? `${formatDateShort(promotion.startDate)} → ${formatDateShort(promotion.endDate)}`
    : '';

  return (
    <div style={{ flex: '1 1 100%', width: '100%', minHeight: '100vh' }}>
      {/* ── Password Access Modal ── */}
      <Dialog open={access === 'password'} onOpenChange={() => { /* backdrop estático */ }}>
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Acceso a la formación</DialogTitle>
          </DialogHeader>
          <p className="text-text-muted text-sm mb-3">
            Esta formación requiere contraseña. Introduce la contraseña que te han facilitado.
          </p>
          {passwordError && (
            <Alert variant="destructive" className="mb-3">
              <AlertDescription>{passwordError}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="access-password">Contraseña</Label>
            <div className="relative">
              <Input
                id="access-password"
                type={showPassword ? 'text' : 'password'}
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitPassword(); }}
                placeholder="Introduce la contraseña"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 bg-transparent text-text-muted hover:text-crok hover:bg-transparent"
                aria-label="Mostrar/ocultar contraseña"
                onClick={() => setShowPassword((s) => !s)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Button
            type="button"
            className="w-full mt-4 bg-crok hover:bg-crok-hover text-crok-on"
            disabled={verifying}
            onClick={submitPassword}
          >
            {verifying ? 'Verificando…' : 'Verificar'}
          </Button>
        </DialogContent>
      </Dialog>

      <div className="container">
        <div className="row">
          <main className="col-12 py-4">

            {/* ── Banner ── */}
            <div className="pp-banner mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/f5_banner_roadmpa_manager.PNG" alt="Banner formación" className="pp-banner-img"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="pp-banner-body flex justify-between items-center">
                <div>
                  <h2 className="pp-banner-title">{promotion ? `¡Hola Coder! 👋 - ${promotion.name}` : 'Cargando…'}</h2>
                  <p className="pp-banner-sub">{sub}</p>
                </div>
                <a href="https://factoriaf5.org/" target="_blank" rel="noreferrer" className="ml-3 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/img/logo-factoria-b.svg" alt="Logotipo FactoriaF5" style={{ maxHeight: 48, filter: 'brightness(0) invert(1)', opacity: 0.85 }} />
                </a>
              </div>
            </div>

            {/* ── Progress card ── */}
            <div className="pp-progress-card mb-4">
              <div className="pp-progress-label flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Progreso del bootcamp
              </div>
              <div className="progress mb-3 bg-gray-200 rounded" style={{ height: 14, borderRadius: 8 }}>
                <div className="progress-bar h-full rounded text-white text-xs flex items-center justify-center" role="progressbar"
                  style={{ width: `${progress.pct}%`, background: 'linear-gradient(90deg,var(--principal-1),#ff8c42)', borderRadius: 8 }}
                  aria-valuenow={progress.pct} aria-valuemin={0} aria-valuemax={100}>{progress.pct}%</div>
              </div>
              <div className="flex gap-3 flex-wrap">
                <div className="pp-stat-box"><div className="pp-stat-val">{progress.active || '—'}</div><div className="pp-stat-lbl">Estudiantes activos</div></div>
                <div className="pp-stat-box"><div className="pp-stat-val" style={{ color: '#198754' }}>{progress.weeksDone || '—'}</div><div className="pp-stat-lbl">Semanas transcurridas</div></div>
                <div className="pp-stat-box"><div className="pp-stat-val">{progress.weeksLeft || '—'}</div><div className="pp-stat-lbl">Semanas restantes</div></div>
                <div className="pp-stat-box"><div className="pp-stat-val">{progress.totalWeeks || '—'}</div><div className="pp-stat-lbl">Semanas totales</div></div>
              </div>
            </div>

            {/* ── Quick links ── */}
            {quickLinks.length > 0 && (
              <div className="pp-section-card mb-4">
                <div className="pp-section-header flex items-center gap-2">
                  <Zap className="pp-section-header-icon h-5 w-5" />
                  <h5>Acciones Rápidas</h5>
                </div>
                <div className="pp-section-body">
                  <div className="flex flex-wrap gap-3">
                    {quickLinks.map((link, i) => {
                      const { Icon, color } = platformIcon(link);
                      return (
                        <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" title={link.name} className="quick-action-link">
                          <div className="quick-action-icon" style={{ color }}><Icon className="h-5 w-5" /></div>
                          <div className="quick-action-label">{link.name}</div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Próxima Píldora + Calendario ── */}
            <div className="pp-pildora-calendar-row mb-4">
              <div className="flex min-w-0">
                <div className="pp-notice-card flex-1 w-full">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    <span className="font-bold" style={{ color: 'var(--principal-1)' }}>Próxima Píldora</span>
                  </div>
                  {nextPildora ? (
                    <div className="text-sm">
                      <p className="mb-1 font-semibold">{(nextPildora as { title?: string }).title || 'Píldora'}</p>
                      <p className="mb-1">📅 {(nextPildora as { date?: string }).date}</p>
                      {(nextPildora as { mode?: string }).mode && <p className="mb-0">📡 {(nextPildora as { mode?: string }).mode}</p>}
                    </div>
                  ) : (
                    <div className="text-text-muted text-sm"><em>Sin píldoras próximas.</em></div>
                  )}
                </div>
              </div>
              <div className="min-w-0">
                {calendar?.googleCalendarId && (
                  <div className="pp-section-card mb-0">
                    <div className="pp-section-header flex items-center gap-2">
                      <Calendar className="pp-section-header-icon h-5 w-5" />
                      <h5>Calendario</h5>
                    </div>
                    <div className="pp-section-body p-0">
                      {calendar.googleAppointmentUrl && (
                        <div className="p-2" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button type="button" className="text-white rounded px-4 py-2" style={{ backgroundColor: '#F4511E' }}
                            onClick={() => openAppointment(calendar.googleAppointmentUrl!)}>
                            Reservar una cita
                          </button>
                        </div>
                      )}
                      <iframe style={{ width: '100%', height: 320, border: 'none' }} allowFullScreen
                        src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendar.googleCalendarId)}&ctz=Europe/Madrid`} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Tabs nav ── */}
            <ul className="pp-tabs mb-4 flex gap-1">
              <li className="nav-item">
                <button className={`nav-link flex items-center gap-2${activeTab === 'progreso' ? ' active' : ''}`} onClick={() => setActiveTab('progreso')}>
                  <PlayCircle className="h-4 w-4" />En progreso
                </button>
              </li>
              <li className="nav-item">
                <button className={`nav-link flex items-center gap-2${activeTab === 'info' ? ' active' : ''}`} onClick={() => setActiveTab('info')}>
                  <Info className="h-4 w-4" />Información General
                </button>
              </li>
            </ul>

            {/* ── Tab: En Progreso ── */}
            <div className={activeTab === 'progreso' ? '' : 'hidden'}>
              <div className="pp-section-card mb-4">
                <div className="pp-section-header flex items-center gap-2">
                  <Map className="pp-section-header-icon h-5 w-5" />
                  <h5>Roadmap</h5>
                </div>
                <div className="pp-section-body p-0">
                  <div className="overflow-x-auto p-3">
                    {promotion && <PublicGanttTable promotion={promotion} />}
                  </div>
                </div>
              </div>
              {extended && promotionId && (
                <PildorasSection
                  info={extended}
                  students={students}
                  promotion={promotion}
                  promotionId={promotionId}
                  onReload={() => reloadExtended(promotionId)}
                />
              )}
              <ProgramResourcesSection resources={extended?.resources} />
              <InternalResourcesSection resources={promoResources} />
              <GenericSections sections={sections} />
            </div>

            {/* ── Tab: Información General ── */}
            <div className={activeTab === 'info' ? '' : 'hidden'}>
              <ScheduleSection schedule={extended?.schedule} />
              <EvaluationSection evaluation={extended?.evaluation} />
              <TeamSection team={extended?.team} />
              {extended && <CompetencesSection info={extended} />}
            </div>

            {/* Step 4 (pendiente): Aula Virtual */}

          </main>
        </div>
      </div>

      {/* ── Appointment Modal ── */}
      <Dialog open={appointmentOpen} onOpenChange={setAppointmentOpen}>
        <DialogContent className="max-w-5xl p-0 gap-0 h-[85vh] flex flex-col">
          <DialogHeader className="px-4 py-2 border-b shrink-0">
            <DialogTitle className="text-base">Reservar una cita</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {appointmentUrl && (
              <iframe src={appointmentUrl} style={{ width: '100%', height: '100%', border: 'none' }} allow="camera; microphone; geolocation" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
