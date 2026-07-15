'use client';

/**
 * StudentTracking.tsx — Ficha de Seguimiento Integral del Coder (spec 0014 Fase C).
 *
 * Reemplaza public/js/student-tracking.js. Patrón PUENTE (como ProgramCompetences):
 * preserva `window.StudentTracking` con la API que consumen otros scripts legacy:
 *   - promotion-detail.js → StudentTracking.init(promotionId) y, vía onclick inline
 *     de la tabla de estudiantes, StudentTracking.openFicha(studentId).
 *   - reports.js → _getTeam(i) / _getCurrentStudent() (PDFs de proyecto).
 * El contenido del modal se renderiza con React (shadcn Tabs) y se monta por
 * createPortal dentro de #ficha-content-host (host memoizado en page.tsx, vive
 * dentro del shadcn Dialog "fichaModal"). El Dialog lo abre el puente con
 * window._openShadcnModal('fichaModal').
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { apiFetch } from '@/lib/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function w(): any { return window as unknown as any; }

// ─── Tipos ──────────────────────────────────────────────────────────────────
interface Member { id: string; name: string; }
interface AchievedIndicator { toolName: string; levelId: number; indicatorName: string; }
interface TeamCompetence {
  competenceId: string | number | null;
  competenceName: string;
  level: number;
  toolsUsed: string[];
  achievedIndicators?: AchievedIndicator[];
}
interface Team {
  teamName: string;
  projectType: 'individual' | 'grupal';
  role?: string;
  moduleName: string;
  moduleId: string;
  assignedDate?: string;
  teacherNote?: string;
  studentComment?: string;
  members: Member[];
  competences: TeamCompetence[];
  _fromEvaluation?: boolean;
}
interface TeacherNote { text?: string; note?: string; date?: string; createdAt?: string; }
interface CompletedModule {
  moduleId: string;
  moduleName: string;
  finalGrade?: number;
  completionDate?: string;
  notes?: string;
  progressPercent?: number | null;
  completedCourses?: string[];
  evaluatedProjectsCount?: number;
  totalProjectsCount?: number;
  manualCompletionDate?: boolean;
}
interface Withdrawal { date?: string; reason?: string; representative?: string; processedAt?: string; }
interface Student {
  id?: string;
  _id?: string;
  name?: string;
  lastname?: string;
  email?: string;
  githubUser?: string;
  laptopLoan?: boolean;
  fullName?: string;
  isWithdrawn?: boolean;
  withdrawal?: Withdrawal | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  technicalTracking?: any;
}
interface RoadmapProject { name: string; url?: string; moduleId: string; moduleName: string; competenceIds: (string | number)[]; }
interface RoadmapCourse { name?: string; url?: string; }
interface PromotionModule {
  id: string;
  name: string;
  courses?: (string | RoadmapCourse)[];
  projects?: { name: string; url?: string; competenceIds?: (string | number)[] }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pildoras?: any[];
}
interface ProgramCompetence { id: string | number; name: string; area?: string; selectedTools?: string[]; allTools?: string[]; }
interface CatalogCompetence { id: string | number; name: string; areas?: { name: string }[]; tools?: { name: string }[]; description?: string; }
interface PildoraExt { title?: string; date?: string | null; mode?: string | null; status?: string; students?: { id: string | number }[]; }
interface ModulePildoraExt { moduleId?: string; moduleName?: string; pildoras?: PildoraExt[]; }

// ─── Constantes UI ────────────────────────────────────────────────────────
const LEVEL_LABELS: Record<number, string> = { 1: 'Insuficiente', 2: 'Básico', 3: 'Competente', 4: 'Excelente' };
const LEVEL_COLORS: Record<number, string> = { 1: 'danger', 2: 'warning', 3: 'primary', 4: 'success' };
const PROJ_LEVEL_COLORS: Record<number, string> = { 0: 'secondary', 1: 'danger', 2: 'warning', 3: 'success' };
const PROJ_LEVEL_LABELS: Record<number, string> = { 0: 'Sin nivel', 1: 'Básico', 2: 'Medio', 3: 'Avanzado' };
const IND_COLORS: Record<number, string> = { 1: '#ffc107', 2: '#0d6efd', 3: '#198754' };

// ─── Helpers ──────────────────────────────────────────────────────────────
const todayISO = () => new Date().toISOString().split('T')[0];

function fmtDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function toast(message: string, type: 'success' | 'danger' | 'warning' = 'success') {
  const ww = w();
  if (typeof ww.showApiToast === 'function') { ww.showApiToast(message, type); return; }
  if (typeof document === 'undefined') return;
  const el = document.createElement('div');
  el.className = `alert alert-${type} position-fixed shadow`;
  el.style.cssText = 'top:20px;right:20px;z-index:99999;min-width:280px;max-width:380px;';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.remove(); }, 4000);
}

// Overlay: inyecta evaluaciones de ExtendedInfo.projectEvaluations que aún no
// estén en _teams (evaluaciones hechas desde la pestaña Evaluación). Port de
// _overlayEvaluationsIntoTeams.
interface EvalComp { competenceId: string | number; competenceName: string; level: number; toolsUsed?: string[]; }
interface EvalEntry { targetId?: string; evaluatedAt?: string; feedback?: string; studentComment?: string; competences?: EvalComp[]; }
interface ProjEval { type?: string; projectName?: string; moduleName?: string; moduleId?: string; groups?: { groupName: string; studentIds?: string[] }[]; evaluations?: EvalEntry[]; }

function overlayEvaluations(teams: Team[], studentId: string, projectEvaluations: unknown[]): Team[] {
  const next = [...teams];
  for (const projEval of (projectEvaluations as ProjEval[])) {
    let evalEntry: EvalEntry | undefined;
    if (projEval.type === 'grupal') {
      const group = (projEval.groups || []).find((g) => (g.studentIds || []).includes(String(studentId)));
      if (group) evalEntry = (projEval.evaluations || []).find((e) => e.targetId === group.groupName);
    } else {
      evalEntry = (projEval.evaluations || []).find((e) => String(e.targetId) === String(studentId));
    }
    if (!evalEntry) continue;
    if (!(evalEntry.competences || []).length && !evalEntry.feedback) continue;

    const alreadyInTeams = next.some((t) => t.teamName === projEval.projectName && t.moduleId === projEval.moduleId);
    if (alreadyInTeams) continue;

    next.push({
      teamName: projEval.projectName || '',
      projectType: (projEval.type as 'individual' | 'grupal') || 'individual',
      role: '',
      moduleName: projEval.moduleName || '',
      moduleId: projEval.moduleId || '',
      assignedDate: evalEntry.evaluatedAt ? evalEntry.evaluatedAt.split('T')[0] : '',
      teacherNote: evalEntry.feedback || '',
      studentComment: evalEntry.studentComment || '',
      members: [],
      competences: (evalEntry.competences || []).map((ce) => ({
        competenceId: ce.competenceId,
        competenceName: ce.competenceName,
        level: ce.level,
        toolsUsed: ce.toolsUsed || [],
      })),
      _fromEvaluation: true,
    });
  }
  return next;
}

// Construye opciones de competencia para el selector del formulario de proyecto.
// Port de _buildCompetenceOptions. Devuelve grupos por área + flag single.
interface CompOption { id: string | number | null; name: string; tools: string[]; }
function buildCompetenceGroups(
  projectIdx: number | null,
  promotionProjects: RoadmapProject[],
  promotionCompetences: ProgramCompetence[],
  catalogCompetences: CatalogCompetence[],
): { single: boolean; groups: { area: string; items: CompOption[] }[] } {
  const proj = (projectIdx !== null && !isNaN(projectIdx)) ? promotionProjects[projectIdx] : null;
  const assignedIds = proj?.competenceIds || [];

  let pool: ProgramCompetence[] = [];
  if (assignedIds.length && promotionCompetences.length) {
    pool = promotionCompetences.filter((c) => assignedIds.map((id) => String(id)).includes(String(c.id)));
  }
  if (!pool.length) {
    if (promotionCompetences.length) {
      pool = promotionCompetences;
    } else {
      pool = catalogCompetences.map((c) => ({
        id: c.id,
        name: c.name,
        area: (c.areas && c.areas[0]?.name) || '',
        allTools: (c.tools || []).map((t) => t.name),
      }));
    }
  }
  if (!pool.length) return { single: true, groups: [] };

  const getTools = (c: ProgramCompetence): string[] => {
    if (c.selectedTools && c.selectedTools.length) return c.selectedTools;
    if (c.allTools && c.allTools.length) return c.allTools;
    const fromCatalog = catalogCompetences.find((cc) => String(cc.id) === String(c.id));
    if (fromCatalog) return (fromCatalog.tools || []).map((t) => t.name);
    return [];
  };

  const byArea: Record<string, CompOption[]> = {};
  pool.forEach((c) => {
    const area = c.area || 'Sin área';
    (byArea[area] ||= []).push({ id: c.id ?? null, name: c.name, tools: getTools(c) });
  });
  const groups = Object.entries(byArea).map(([area, items]) => ({ area, items }));
  return { single: groups.length === 1, groups };
}

// Cálculo de progreso de un módulo. Port de _renderModules (parte de cálculo).
interface ModuleCalc {
  displayPct: number | null;
  isComplete: boolean;
  projPct: number | null;
  courseProgressPct: number | null;
  resolvedEvalCount: number | null;
  resolvedTotalCount: number;
  isAutoEntry: boolean;
  moduleCourses: (string | RoadmapCourse)[];
  completedCourses: Set<string>;
  barColor: string;
  borderColor: string;
}
function computeModule(m: CompletedModule, promotionModules: PromotionModule[]): ModuleCalc {
  const pct = (m.progressPercent !== undefined && m.progressPercent !== null)
    ? Math.min(100, Math.max(0, parseInt(String(m.progressPercent)) || 0))
    : null;
  const isAutoEntry = pct !== null;

  const roadmapModule = promotionModules.find((rm) => String(rm.id) === String(m.moduleId));
  const moduleCourses = roadmapModule ? (roadmapModule.courses || []) : [];
  const moduleProjects = roadmapModule ? (roadmapModule.projects || []) : [];
  const completedCourses = new Set((m.completedCourses || []).map((c) => String(c)));

  let resolvedEvalCount: number | null = null;
  let resolvedTotalCount = moduleProjects.length;
  if (isAutoEntry && moduleProjects.length > 0) {
    if (m.evaluatedProjectsCount !== undefined) {
      resolvedEvalCount = m.evaluatedProjectsCount;
      resolvedTotalCount = m.totalProjectsCount !== undefined ? m.totalProjectsCount : moduleProjects.length;
    } else if (m.notes) {
      const nm = m.notes.match(/(\d+)\/(\d+)\s*proyectos/);
      if (nm) { resolvedEvalCount = parseInt(nm[1], 10); resolvedTotalCount = parseInt(nm[2], 10); }
    }
  }

  const hasRoadmapProjects = moduleProjects.length > 0;
  let projPct: number | null;
  if (isAutoEntry) {
    projPct = resolvedEvalCount !== null && resolvedTotalCount > 0
      ? Math.round((resolvedEvalCount / resolvedTotalCount) * 100)
      : pct;
  } else {
    projPct = hasRoadmapProjects ? 0 : null;
  }

  const courseProgressPct = moduleCourses.length
    ? Math.round((completedCourses.size / moduleCourses.length) * 100)
    : null;

  let combinedPct: number | null;
  if (projPct !== null && courseProgressPct !== null) combinedPct = Math.round((projPct + courseProgressPct) / 2);
  else if (projPct !== null) combinedPct = projPct;
  else if (courseProgressPct !== null) combinedPct = courseProgressPct;
  else combinedPct = null;

  const displayPct = combinedPct;
  const isComplete = displayPct !== null && displayPct >= 100
    && (projPct === null || projPct >= 100)
    && (courseProgressPct === null || courseProgressPct >= 100);

  const barColor = isComplete ? 'bg-success'
    : (displayPct ?? 0) >= 60 ? 'bg-primary'
    : (displayPct ?? 0) >= 30 ? 'bg-warning'
    : 'bg-danger';
  const borderColor = isComplete ? 'border-success'
    : (displayPct ?? 0) >= 60 ? 'border-primary'
    : (displayPct ?? 0) >= 30 ? 'border-warning'
    : (displayPct !== null) ? 'border-danger' : 'border-primary';

  return { displayPct, isComplete, projPct, courseProgressPct, resolvedEvalCount, resolvedTotalCount, isAutoEntry, moduleCourses, completedCourses, barColor, borderColor };
}

// Resumen global de progreso. Port de _renderModulesSummary.
interface SummaryCalc {
  show: boolean;
  avgProgress: number;
  completedModulesCount: number;
  totalModules: number;
  totalCoursesAll: number;
  completedCoursesAll: number;
  globalColor: string;
  globalBarColor: string;
}
function computeSummary(completedModules: CompletedModule[], promotionModules: PromotionModule[], teamsCount: number): SummaryCalc {
  const empty: SummaryCalc = { show: false, avgProgress: 0, completedModulesCount: 0, totalModules: 0, totalCoursesAll: 0, completedCoursesAll: 0, globalColor: '#dc3545', globalBarColor: 'bg-danger' };
  const trackedModules = completedModules.filter((m) =>
    (m.progressPercent !== undefined && m.progressPercent !== null) ||
    (m.completedCourses && m.completedCourses.length > 0));
  const allModules = promotionModules.length ? promotionModules : trackedModules.map((m) => ({ id: m.moduleId, name: m.moduleName } as PromotionModule));
  if (!allModules.length || !trackedModules.length) return empty;

  let totalCombinedPct = 0, countForAvg = 0, totalCoursesAll = 0, completedCoursesAll = 0;
  completedModules.forEach((m) => {
    const projPct = (m.progressPercent !== undefined && m.progressPercent !== null)
      ? Math.min(100, Math.max(0, parseInt(String(m.progressPercent)) || 0)) : null;
    const roadmapModule = promotionModules.find((rm) => String(rm.id) === String(m.moduleId));
    const moduleCourses = roadmapModule ? (roadmapModule.courses || []) : [];
    const completedCourses = (m.completedCourses || []).length;
    const coursePct = moduleCourses.length ? Math.round((completedCourses / moduleCourses.length) * 100) : null;
    totalCoursesAll += moduleCourses.length;
    completedCoursesAll += completedCourses;
    if (projPct !== null || coursePct !== null) {
      const combined = (projPct !== null && coursePct !== null) ? Math.round((projPct + coursePct) / 2) : (projPct ?? coursePct ?? 0);
      totalCombinedPct += combined;
      countForAvg++;
    }
  });

  const totalModules = allModules.length;
  const completedModulesCount = completedModules.filter((m) => {
    const c = computeModule(m, promotionModules);
    return (c.projPct === null || c.projPct >= 100)
      && (c.courseProgressPct === null || c.courseProgressPct >= 100)
      && (c.projPct !== null || c.courseProgressPct !== null);
  }).length;

  const avgProgress = countForAvg > 0 ? Math.round(totalCombinedPct / countForAvg) : 0;
  const globalColor = avgProgress >= 100 ? '#198754' : avgProgress >= 60 ? '#0d6efd' : avgProgress >= 30 ? '#ffc107' : '#dc3545';
  const globalBarColor = avgProgress >= 100 ? 'bg-success' : avgProgress >= 60 ? 'bg-primary' : avgProgress >= 30 ? 'bg-warning' : 'bg-danger';

  return { show: true, avgProgress, completedModulesCount, totalModules, totalCoursesAll, completedCoursesAll, globalColor, globalBarColor };
}

// ─── Estado del formulario de proyecto/equipo ──────────────────────────────
interface TeamFormState {
  mode: 'new' | 'edit';
  editIndex: number;
  projectIdx: string;
  projectNameText: string;
  projectType: 'grupal' | 'individual';
  selectedMembers: Map<string, string>;
  memberSearch: string;
  memberListOpen: boolean;
  pending: TeamCompetence[];
  compSelectName: string;
  compLevel: number;
  compTools: string[];
  teacherNote: string;
}

// ─── Hook: portal node con sondeo persistente ──────────────────────────────
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

// ════════════════════════════════════════════════════════════════════════════
export function StudentTrackingHost() {
  // Datos a nivel promoción (catálogo) — estado para render reactivo
  const [promotionModules, setPromotionModules] = useState<PromotionModule[]>([]);
  const [promotionProjects, setPromotionProjects] = useState<RoadmapProject[]>([]);
  const [promotionCompetences, setPromotionCompetences] = useState<ProgramCompetence[]>([]);
  const [catalogCompetences, setCatalogCompetences] = useState<CatalogCompetence[]>([]);

  // Datos de la ficha abierta
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [teacherNotes, setTeacherNotes] = useState<TeacherNote[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [completedModules, setCompletedModules] = useState<CompletedModule[]>([]);
  const [modPildExt, setModPildExt] = useState<ModulePildoraExt[]>([]);
  const [hasUnsaved, setHasUnsaved] = useState(false);

  // Sub-formularios
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [teamForm, setTeamForm] = useState<TeamFormState | null>(null);
  const [personalForm, setPersonalForm] = useState({ name: '', lastname: '', email: '', github: '', laptop: false });
  const [bajaMode, setBajaMode] = useState<'closed' | 'editing'>('closed');
  const [bajaForm, setBajaForm] = useState({ date: '', reason: '', representative: '' });

  // Refs síncronos (puente + persistencia leen el valor actual sin re-render)
  const promotionIdRef = useRef<string | null>(null);
  const loadedRef = useRef<string | null>(null);
  const currentStudentRef = useRef<Student | null>(null);
  const currentStudentIdRef = useRef<string | null>(null);
  const teacherNotesRef = useRef<TeacherNote[]>([]);
  const teamsRef = useRef<Team[]>([]);
  const competencesRef = useRef<unknown[]>([]);
  const completedModulesRef = useRef<CompletedModule[]>([]);
  const modPildExtRef = useRef<ModulePildoraExt[]>([]);

  const host = usePortalNode('ficha-content-host');

  // ─── Píldoras presentadas → completedPildoras (port de _saveTechnical) ──
  const computeCompletedPildoras = useCallback(() => {
    const out: { pildoraTitle: string; moduleId: string; moduleName: string; date: string | null }[] = [];
    (modPildExtRef.current || []).forEach((mp) => {
      (mp.pildoras || []).forEach((p) => {
        if (p.status !== 'Presentada') return;
        const ids = (p.students || []).map((s) => String(s.id));
        if (ids.includes(String(currentStudentIdRef.current))) {
          out.push({ pildoraTitle: p.title || '—', moduleId: mp.moduleId || '', moduleName: mp.moduleName || '—', date: p.date || null });
        }
      });
    });
    return out;
  }, []);

  // ─── Persistir seguimiento técnico (PUT /ficha/technical) ──
  const persistTechnical = useCallback(async (silent = false) => {
    const payload = {
      teacherNotes: teacherNotesRef.current,
      teams: teamsRef.current,
      competences: competencesRef.current,
      completedModules: completedModulesRef.current,
      completedPildoras: computeCompletedPildoras(),
    };
    try {
      const res = await apiFetch(`/api/promotions/${promotionIdRef.current}/students/${currentStudentIdRef.current}/ficha/technical`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Error al guardar');
      setHasUnsaved(false);
      if (!silent) toast('Seguimiento técnico guardado ✓', 'success');
    } catch (e) {
      console.error('[StudentTracking] saveTechnical:', e);
      toast((e as Error).message || 'Error al guardar seguimiento técnico', 'danger');
    }
  }, [computeCompletedPildoras]);

  // Mutadores que actualizan ref + estado y auto-guardan (como el JS legacy)
  const updateNotes = useCallback((next: TeacherNote[]) => { teacherNotesRef.current = next; setTeacherNotes(next); setHasUnsaved(true); persistTechnical(true); }, [persistTechnical]);
  const updateTeams = useCallback((next: Team[]) => { teamsRef.current = next; setTeams(next); setHasUnsaved(true); persistTechnical(true); }, [persistTechnical]);
  const updateModules = useCallback((next: CompletedModule[]) => { completedModulesRef.current = next; setCompletedModules(next); setHasUnsaved(true); persistTechnical(true); }, [persistTechnical]);

  // ─── Sincroniza la fila del estudiante en la tabla legacy (port de _syncStudentInTable) ──
  const syncStudentInTable = useCallback((student: Student) => {
    const ww = w();
    if (!ww.currentStudents) return;
    const idx = ww.currentStudents.findIndex((s: Student) => s.id === currentStudentIdRef.current || s._id === currentStudentIdRef.current);
    if (idx !== -1) {
      ww.currentStudents[idx] = { ...ww.currentStudents[idx], ...student };
      if (typeof ww.displayStudents === 'function') ww.displayStudents(ww.currentStudents);
    }
  }, []);

  // ─── Carga de datos a nivel promoción (catálogo) ──
  const loadPromotionData = useCallback(async (pid: string) => {
    if (!pid) return;
    promotionIdRef.current = pid;
    if (loadedRef.current === pid) return;
    loadedRef.current = pid;
    try {
      const [promoRes, pildRes, compRes, extRes] = await Promise.all([
        apiFetch(`/api/promotions/${pid}`),
        apiFetch(`/api/promotions/${pid}/modules-pildoras`),
        apiFetch(`/api/competences`),
        apiFetch(`/api/promotions/${pid}/extended-info`),
      ]);
      if (promoRes.ok) {
        const promo = await promoRes.json();
        const mods: PromotionModule[] = promo.modules || [];
        const projects: RoadmapProject[] = [];
        mods.forEach((m) => {
          (m.projects || []).forEach((p) => {
            projects.push({ name: p.name, url: p.url, moduleId: m.id, moduleName: m.name, competenceIds: p.competenceIds || [] });
          });
        });
        setPromotionModules(mods);
        setPromotionProjects(projects);
      }
      if (pildRes.ok) { const d = await pildRes.json(); modPildExtRef.current = d.modulesPildoras || []; setModPildExt(d.modulesPildoras || []); }
      if (compRes.ok) setCatalogCompetences(await compRes.json());
      if (extRes.ok) { const ext = await extRes.json(); setPromotionCompetences(ext.competences || []); }
    } catch (e) {
      console.error('[StudentTracking] loadPromotionData:', e);
    }
  }, []);

  // ─── Abrir ficha (puente: lo llama el onclick inline de la tabla) ──
  const openFicha = useCallback(async (studentId: string) => {
    const sid = String(studentId);
    w()._openShadcnModal?.('fichaModal');
    currentStudentIdRef.current = sid;
    setCurrentStudentId(sid);
    setLoading(true);
    setCurrentStudent(null);
    setTeamForm(null);
    setNoteFormOpen(false);
    setBajaMode('closed');
    try {
      const pid = promotionIdRef.current;
      const [studentRes, pildRes, extRes] = await Promise.all([
        apiFetch(`/api/promotions/${pid}/students/${sid}`),
        apiFetch(`/api/promotions/${pid}/modules-pildoras`),
        apiFetch(`/api/promotions/${pid}/extended-info`),
      ]);
      if (!studentRes.ok) throw new Error('No se pudo cargar el estudiante');
      const student: Student = await studentRes.json();

      let modPild = modPildExtRef.current;
      if (pildRes.ok) { const d = await pildRes.json(); modPild = d.modulesPildoras || []; }
      let extEvals: unknown[] = [];
      if (extRes.ok) { const ext = await extRes.json(); extEvals = ext.projectEvaluations || []; }

      const tt = student.technicalTracking || {};
      const notes: TeacherNote[] = (tt.teacherNotes || []).map((n: TeacherNote) => ({ ...n }));
      let teamsArr: Team[] = (tt.teams || []).map((t: Team) => ({ ...t }));
      const comps: unknown[] = (tt.competences || []).map((c: unknown) => ({ ...(c as object) }));
      const mods: CompletedModule[] = (tt.completedModules || []).map((m: CompletedModule) => ({ ...m }));
      teamsArr = overlayEvaluations(teamsArr, sid, extEvals);

      currentStudentRef.current = student; setCurrentStudent(student);
      teacherNotesRef.current = notes; setTeacherNotes(notes);
      teamsRef.current = teamsArr; setTeams(teamsArr);
      competencesRef.current = comps;
      completedModulesRef.current = mods; setCompletedModules(mods);
      modPildExtRef.current = modPild; setModPildExt(modPild);
      setHasUnsaved(false);
      setLoading(false);
    } catch (e) {
      console.error('[StudentTracking] openFicha:', e);
      setLoading(false);
      toast('Error cargando datos del estudiante', 'danger');
    }
  }, []);

  // ─── Auto-init desde la URL (no dependemos del timing de promotion-detail.js) ──
  useEffect(() => {
    const pid = new URLSearchParams(window.location.search).get('id');
    if (pid) loadPromotionData(pid);
  }, [loadPromotionData]);

  // ─── Puente window.StudentTracking ──
  useEffect(() => {
    const api = {
      __react: true,
      init: (pid: string) => loadPromotionData(pid),
      openFicha,
      saveTechnical: () => persistTechnical(false),
      _getTeam: (i: number) => teamsRef.current[i],
      _getCurrentStudent: () => currentStudentRef.current,
      _getCurrentStudentId: () => currentStudentIdRef.current,
      _getPromotionId: () => promotionIdRef.current,
    };
    w().StudentTracking = api;
    return () => { if (w().StudentTracking === api) delete w().StudentTracking; };
  }, [loadPromotionData, openFicha, persistTechnical]);

  // ─── Sincroniza form personal cuando carga el estudiante ──
  useEffect(() => {
    if (currentStudent) {
      setPersonalForm({
        name: currentStudent.name || '',
        lastname: currentStudent.lastname || '',
        email: currentStudent.email || '',
        github: currentStudent.githubUser || '',
        laptop: !!currentStudent.laptopLoan,
      });
    }
  }, [currentStudent]);

  // ─── Actualiza el subtítulo del modal (vive en page.tsx, fuera del portal) ──
  useEffect(() => {
    const sub = document.getElementById('ficha-student-subtitle');
    if (sub && currentStudent) sub.textContent = `${currentStudent.name || ''} ${currentStudent.lastname || ''} — ${currentStudent.email || ''}`;
  }, [currentStudent]);

  // ─── Guardar datos personales (PUT /ficha/personal) ──
  const savePersonal = useCallback(async () => {
    const name = personalForm.name.trim();
    const lastname = personalForm.lastname.trim();
    const email = personalForm.email.trim();
    if (!name || !lastname || !email) { toast('Nombre, apellido y email son obligatorios', 'warning'); return; }
    // El backend ignora github/laptop y preserva el resto; enviamos solo lo que la ficha edita.
    const payload = { name, lastname, email, githubUser: personalForm.github.trim(), laptopLoan: personalForm.laptop };
    try {
      const res = await apiFetch(`/api/promotions/${promotionIdRef.current}/students/${currentStudentIdRef.current}/ficha/personal`, {
        method: 'PUT', body: JSON.stringify(payload),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `Error ${res.status}`); }
      const updated = await res.json();
      const ns: Student = { ...currentStudentRef.current, ...payload };
      currentStudentRef.current = ns; setCurrentStudent(ns);
      syncStudentInTable(updated.student || ns);
      toast('Datos personales guardados correctamente ✓', 'success');
    } catch (e) {
      console.error('[StudentTracking] savePersonal:', e);
      toast((e as Error).message || 'Error al guardar datos personales', 'danger');
    }
  }, [personalForm, syncStudentInTable]);

  // ─── Baja ──
  const openBajaForm = useCallback(() => {
    const w0 = currentStudentRef.current?.withdrawal || {};
    setBajaForm({ date: w0.date ? w0.date.split('T')[0] : todayISO(), reason: w0.reason || '', representative: w0.representative || '' });
    setBajaMode('editing');
  }, []);

  const saveWithdrawal = useCallback(async () => {
    const { date, reason, representative } = bajaForm;
    if (!date || !reason || !representative) { toast('Completa todos los campos de baja (*)', 'warning'); return; }
    const payload = { isWithdrawn: true, withdrawal: { date, reason, representative, processedAt: new Date().toISOString() } };
    try {
      const res = await apiFetch(`/api/promotions/${promotionIdRef.current}/students/${currentStudentIdRef.current}/ficha/personal`, {
        method: 'PUT', body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Error al guardar');
      const ns: Student = { ...currentStudentRef.current, ...payload };
      currentStudentRef.current = ns; setCurrentStudent(ns);
      syncStudentInTable(ns);
      toast('Baja registrada correctamente ✓', 'success');
      setBajaMode('closed');
      w().Reports?.printActaBaja?.(currentStudentIdRef.current, promotionIdRef.current);
    } catch (e) {
      console.error('[StudentTracking] saveWithdrawal:', e);
      toast((e as Error).message || 'Error al registrar la baja', 'danger');
    }
  }, [bajaForm, syncStudentInTable]);

  const cancelWithdrawal = useCallback(async () => {
    if (!confirm('¿Reactivar a este estudiante? Se eliminará el registro de baja.')) return;
    const payload = { isWithdrawn: false, withdrawal: null };
    try {
      const res = await apiFetch(`/api/promotions/${promotionIdRef.current}/students/${currentStudentIdRef.current}/ficha/personal`, {
        method: 'PUT', body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Error al reactivar');
      const ns: Student = { ...currentStudentRef.current, isWithdrawn: false, withdrawal: null };
      currentStudentRef.current = ns; setCurrentStudent(ns);
      syncStudentInTable(ns);
      toast('Estudiante reactivado correctamente ✓', 'success');
    } catch (e) {
      toast((e as Error).message || 'Error al reactivar el estudiante', 'danger');
    }
  }, [syncStudentInTable]);

  // ─── Notas del profesor ──
  const saveNote = () => {
    const note = noteText.trim();
    if (!note) { toast('La nota no puede estar vacía', 'warning'); return; }
    updateNotes([...teacherNotesRef.current, { text: note, date: new Date().toISOString() }]);
    setNoteText('');
    setNoteFormOpen(false);
  };
  const removeNote = (i: number) => updateNotes(teacherNotesRef.current.filter((_, idx) => idx !== i));

  // ─── Proyectos / equipos ──
  const openNewTeamForm = () => setTeamForm({
    mode: 'new', editIndex: -1, projectIdx: '', projectNameText: '', projectType: 'grupal',
    selectedMembers: new Map(), memberSearch: '', memberListOpen: false,
    pending: [], compSelectName: '', compLevel: 2, compTools: [], teacherNote: '',
  });
  const openEditTeamForm = (i: number) => {
    const t = teamsRef.current[i];
    if (!t) return;
    const projIdx = promotionProjects.findIndex((p) => p.name === t.teamName);
    setTeamForm({
      mode: 'edit', editIndex: i,
      projectIdx: projIdx >= 0 ? String(projIdx) : '',
      projectNameText: t.teamName || '',
      projectType: t.projectType === 'individual' ? 'individual' : 'grupal',
      selectedMembers: new Map((t.members || []).map((m) => [String(m.id), m.name])),
      memberSearch: '', memberListOpen: false,
      pending: JSON.parse(JSON.stringify(t.competences || [])),
      compSelectName: '', compLevel: 2, compTools: [],
      teacherNote: t.teacherNote || '',
    });
  };
  const removeTeam = (i: number) => updateTeams(teamsRef.current.filter((_, idx) => idx !== i));

  const saveNewTeam = async () => {
    if (!teamForm) return;
    let teamName = '', moduleName = '', moduleId = '';
    if (promotionProjects.length) {
      const idx = parseInt(teamForm.projectIdx);
      if (isNaN(idx) || !promotionProjects[idx]) { toast('Selecciona un proyecto del roadmap', 'warning'); return; }
      teamName = promotionProjects[idx].name; moduleName = promotionProjects[idx].moduleName; moduleId = promotionProjects[idx].moduleId || '';
    } else {
      teamName = teamForm.projectNameText.trim();
      if (!teamName) { toast('El nombre del proyecto es obligatorio', 'warning'); return; }
    }
    const projectType = teamForm.projectType;
    const members: Member[] = [...teamForm.selectedMembers.entries()].map(([id, name]) => ({ id, name }));
    const ww = w();
    const currentObj = (ww.currentStudents || []).find((s: Student) => s.id === currentStudentIdRef.current);
    const currentName = currentObj ? (currentObj.name + (currentObj.lastname ? ' ' + currentObj.lastname : '')) : (currentStudentIdRef.current || '');
    const allMembers: Member[] = [{ id: currentStudentIdRef.current as string, name: currentName }, ...members];
    const competences = teamForm.pending;
    const teacherNote = teamForm.teacherNote.trim();
    const teamEntry = { teamName, projectType, moduleName, moduleId, assignedDate: todayISO(), members: allMembers, competences, teacherNote };
    const memberStudentIds = allMembers.map((m) => m.id);
    try {
      const res = await apiFetch(`/api/promotions/${promotionIdRef.current}/teams`, {
        method: 'POST', body: JSON.stringify({ teamEntry, memberStudentIds }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); toast(err.error || 'Error al guardar el equipo', 'danger'); return; }
      const result = await res.json();
      updateTeams([...teamsRef.current, { ...teamEntry, members }]);
      setTeamForm(null);
      const propagated = (result.results || []).filter((r: { status: string; studentId: string }) => r.status === 'updated' && r.studentId !== currentStudentIdRef.current).length;
      toast(`Equipo guardado${propagated > 0 ? ` y propagado a ${propagated} compañero(s)` : ''}`, 'success');
    } catch (e) {
      console.error('[StudentTracking] saveTeam:', e);
      toast('Error de conexión al guardar el equipo', 'danger');
    }
  };

  const saveTeamEdit = () => {
    if (!teamForm || teamForm.mode !== 'edit') return;
    const i = teamForm.editIndex;
    const t = teamsRef.current[i];
    if (!t) return;
    let teamName = t.teamName, moduleName = t.moduleName, moduleId = t.moduleId;
    if (promotionProjects.length) {
      const idx = parseInt(teamForm.projectIdx);
      if (!isNaN(idx) && promotionProjects[idx]) { teamName = promotionProjects[idx].name; moduleName = promotionProjects[idx].moduleName; moduleId = promotionProjects[idx].moduleId || ''; }
    } else {
      teamName = teamForm.projectNameText.trim() || teamName;
    }
    const members: Member[] = [...teamForm.selectedMembers.entries()].map(([id, name]) => ({ id, name }));
    const next = [...teamsRef.current];
    next[i] = { ...t, teamName, projectType: teamForm.projectType, moduleName, moduleId, members, competences: teamForm.pending, teacherNote: teamForm.teacherNote.trim() };
    updateTeams(next);
    setTeamForm(null);
  };

  // ─── Módulos: toggle curso (port de _toggleCourse) + borrar ──
  const toggleCourse = (moduleIdx: number, courseIdx: number, checked: boolean) => {
    const mods = completedModulesRef.current.map((x) => ({ ...x, completedCourses: [...(x.completedCourses || [])] }));
    const m = mods[moduleIdx];
    if (!m) return;
    const key = String(courseIdx);
    if (checked) { if (!m.completedCourses!.includes(key)) m.completedCourses!.push(key); }
    else { m.completedCourses = m.completedCourses!.filter((k) => k !== key); }

    const roadmapModule = promotionModules.find((rm) => String(rm.id) === String(m.moduleId));
    const totalCourses = roadmapModule ? (roadmapModule.courses || []).length : 0;
    const totalProjects = roadmapModule ? (roadmapModule.projects || []).length : 0;
    const projPctNow = (m.progressPercent !== undefined && m.progressPercent !== null)
      ? Math.min(100, Math.max(0, parseInt(String(m.progressPercent)) || 0))
      : (totalProjects > 0 ? 0 : 100);
    const allCoursesDone = totalCourses === 0 || m.completedCourses!.length >= totalCourses;
    const allProjectsDone = projPctNow >= 100;
    if (allCoursesDone && allProjectsDone && !m.completionDate) m.completionDate = todayISO();
    else if ((!allCoursesDone || !allProjectsDone) && m.completionDate && !m.manualCompletionDate) m.completionDate = '';

    updateModules(mods);
  };
  const removeModule = (i: number) => updateModules(completedModulesRef.current.filter((_, idx) => idx !== i));

  // ════════════════════════ RENDER ════════════════════════
  if (!host) return null;

  const content = (
    <div>
      {loading ? (
        <div className="text-center p-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 text-muted">Cargando datos del coder...</p>
        </div>
      ) : currentStudent ? (
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mt-3 mx-3" style={{ width: 'calc(100% - 1.5rem)' }}>
            <TabsTrigger value="personal">
              <i className="bi bi-person-vcard me-1" /> Datos Personales
            </TabsTrigger>
            <TabsTrigger value="technical">
              <i className="bi bi-gear me-1" /> Seguimiento Técnico
              {hasUnsaved && <span className="badge bg-danger ms-1">●</span>}
            </TabsTrigger>
          </TabsList>

          {/* ── Datos Personales ── */}
          <TabsContent value="personal" className="p-4">
            <form onSubmit={(e) => { e.preventDefault(); savePersonal(); }}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-bold">Nombre(s)</label>
                  <input type="text" className="form-control" required value={personalForm.name}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Apellido(s)</label>
                  <input type="text" className="form-control" required value={personalForm.lastname}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, lastname: e.target.value }))} />
                </div>
                <div className="col-md-12">
                  <label className="form-label fw-bold">Email</label>
                  <input type="email" className="form-control" readOnly value={personalForm.email} />
                  <div className="form-text">El email no puede ser modificado.</div>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Usuario de GitHub</label>
                  <input type="text" className="form-control" placeholder="ej. octocat" value={personalForm.github}
                    onChange={(e) => setPersonalForm((f) => ({ ...f, github: e.target.value }))} />
                </div>
                <div className="col-md-6 d-flex flex-column justify-content-end">
                  <label className="form-label fw-bold">Préstamo de ordenador</label>
                  <div className="form-check form-switch mt-1">
                    <input className="form-check-input" type="checkbox" role="switch" checked={personalForm.laptop}
                      onChange={(e) => setPersonalForm((f) => ({ ...f, laptop: e.target.checked }))} id="ficha-student-laptop-loan" />
                    <label className="form-check-label" htmlFor="ficha-student-laptop-loan">Sí, tiene préstamo</label>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-end">
                <button type="submit" className="btn btn-primary px-4">
                  <i className="bi bi-save me-1" /> Guardar Cambios
                </button>
              </div>
            </form>

            {/* Withdrawal */}
            <div className="mt-5 pt-4 border-top">{renderBaja()}</div>
          </TabsContent>

          {/* ── Seguimiento Técnico ── */}
          <TabsContent value="technical" className="p-4">
            <div className="mb-4">{renderSummary()}</div>

            <div className="row g-4">
              {/* Notas del profesor */}
              <div className="col-lg-4 border-end">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="mb-0 fw-bold"><i className="bi bi-journal-text me-1" /> Notas del Profesor</h6>
                  <button className="btn btn-sm btn-outline-primary" onClick={() => { setNoteFormOpen(true); setNoteText(''); }}>
                    <i className="bi bi-plus-lg" /> Nueva
                  </button>
                </div>
                <div style={{ maxHeight: 500, overflowY: 'auto' }}>{renderNotes()}</div>
              </div>

              {/* Proyectos + módulos/píldoras */}
              <div className="col-lg-8">
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0 fw-bold"><i className="bi bi-kanban me-1" /> Proyectos Realizados</h6>
                    <button className="btn btn-sm btn-outline-primary" onClick={openNewTeamForm}>
                      <i className="bi bi-plus-lg" /> Añadir Proyecto
                    </button>
                  </div>
                  <div>{renderTeams()}</div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <h6 className="mb-3 fw-bold fs-7"><i className="bi bi-box me-1" /> Módulos Completados</h6>
                    <div className="list-group list-group-flush border rounded">{renderModules()}</div>
                  </div>
                  <div className="col-md-6">
                    <h6 className="mb-3 fw-bold fs-7"><i className="bi bi-lightning me-1" /> Píldoras (Presentaciones)</h6>
                    <div className="list-group list-group-flush border rounded">{renderPildoras()}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-top text-end">
              <button className="btn btn-success px-4" onClick={() => persistTechnical(false)}>
                <i className="bi bi-cloud-arrow-up me-1" /> Guardar Seguimiento Técnico
              </button>
            </div>
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );

  return createPortal(content, host);

  // ─────────────────────── sub-render helpers ───────────────────────
  function emptyState(icon: string, text: string) {
    return (
      <div className="text-center text-muted py-3">
        <i className={`bi bi-${icon} fs-3 d-block mb-1 opacity-50`} />
        <small>{text}</small>
      </div>
    );
  }

  function renderNotes() {
    return (
      <>
        {noteFormOpen && (
          <div className="card border-primary mb-2">
            <div className="card-body py-2 px-3">
              <div className="row g-2">
                <div className="col-12">
                  <label className="form-label small fw-semibold">Nota / Observación</label>
                  <textarea className="form-control form-control-sm" rows={3} placeholder="Escribe aquí la nota del profesor..."
                    value={noteText} onChange={(e) => setNoteText(e.target.value)} />
                </div>
              </div>
              <div className="d-flex justify-content-end gap-2 mt-2">
                <button className="btn btn-sm btn-secondary" onClick={() => setNoteFormOpen(false)}>Cancelar</button>
                <button className="btn btn-sm btn-primary" onClick={saveNote}>Añadir</button>
              </div>
            </div>
          </div>
        )}
        {!teacherNotes.length && !noteFormOpen ? emptyState('journal-text', 'Sin notas registradas') : null}
        {teacherNotes.map((n, i) => (
          <div key={i} className="card mb-2 border-start border-4 border-info">
            <div className="card-body py-2 px-3">
              <div className="d-flex justify-content-between align-items-start">
                <div className="flex-grow-1">
                  <p className="mb-1">{n.text || n.note || ''}</p>
                  <small className="text-muted"><i className="bi bi-calendar3 me-1" />{fmtDate(n.date || n.createdAt)}</small>
                </div>
                <button className="btn btn-sm btn-link text-danger p-0 ms-2" title="Eliminar" onClick={() => removeNote(i)}>
                  <i className="bi bi-trash" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </>
    );
  }

  function renderTeamCompetences(comps: TeamCompetence[]) {
    if (!comps || !comps.length) return null;
    return (
      <div className="mt-2 pt-2 border-top">
        <div className="small fw-semibold text-muted mb-1"><i className="bi bi-award me-1" />Competencias trabajadas:</div>
        <div className="d-flex flex-wrap gap-1">
          {comps.map((c, ci) => {
            const lvlColor = PROJ_LEVEL_COLORS[c.level] ?? 'secondary';
            const lvlLabel = PROJ_LEVEL_LABELS[c.level] ?? c.level;
            const indsByTool: Record<string, AchievedIndicator[]> = {};
            (c.achievedIndicators || []).forEach((ai) => { (indsByTool[ai.toolName] ||= []).push(ai); });
            return (
              <div key={ci} className="w-100 small mb-1">
                <span className={`badge bg-${lvlColor} me-1`}>Nv.{c.level ?? '—'} {lvlLabel}</span>
                <strong>{c.competenceName}</strong>
                {(c.toolsUsed || []).length ? (
                  <span className="ms-1">
                    {(c.toolsUsed || []).map((tool, ti) => (
                      <span key={ti} className="badge bg-light text-dark border">
                        <i className="bi bi-tools me-1 text-secondary" style={{ fontSize: '.65rem' }} />{tool}
                      </span>
                    ))}
                  </span>
                ) : null}
                {Object.entries(indsByTool).map(([toolName, inds]) => (
                  <div key={toolName} className="mt-1 ms-2">
                    <span className="small text-muted"><i className="bi bi-tools me-1" />{toolName}:</span>
                    <div className="d-flex flex-wrap gap-1 mt-1">
                      {inds.map((ai, ai2) => (
                        <span key={ai2} className="badge rounded-pill" style={{ fontSize: '.65rem', background: '#f0f0f0', color: '#333', border: `1px solid ${IND_COLORS[ai.levelId] ?? '#999'}` }}>
                          <span style={{ color: IND_COLORS[ai.levelId] ?? '#999' }}>Nv.{ai.levelId}</span> {ai.indicatorName}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function gmailUrlFor(t: Team): string {
    const cur = currentStudent || {};
    const fullName = `${cur.name || ''} ${cur.lastname || ''}`.trim() || (cur.fullName || '');
    const email = cur.email || '';
    if (!email) return '';
    const feedback = (t.teacherNote || '').trim();
    const subject = encodeURIComponent(`Feedback proyecto - ${fullName || 'Coder'}`);
    let body = '';
    if (feedback) {
      const compLines = (t.competences || []).map((c) => {
        const lvlLabel = PROJ_LEVEL_LABELS[c.level] ?? c.level;
        const levelText = c.level != null ? `Nivel ${c.level} - ${lvlLabel}` : `${lvlLabel}`;
        return `- ${c.competenceName || 'Competencia'}: ${levelText}`;
      });
      const bodyLines = [
        fullName ? `Hola ${fullName},` : 'Hola,', '',
        `Te comparto el feedback del proyecto "${t.teamName || 'Proyecto'}".`, '',
        feedback,
        ...(compLines.length ? ['', 'Competencias trabajadas:', ...compLines] : []),
        '', 'Un abrazo,', 'Equipo formador Factoria F5',
      ];
      body = encodeURIComponent(bodyLines.join('\n'));
    }
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${subject}&body=${body}`;
  }

  function renderTeams() {
    return (
      <>
        {teamForm && renderTeamForm()}
        {!teams.length && !teamForm ? emptyState('folder2-open', 'Sin proyectos registrados') : null}
        {teams.map((t, i) => {
          const gmail = gmailUrlFor(t);
          return (
            <div key={i} className="card mb-2 border-start border-4 border-success">
              <div className="card-body py-2 px-3">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <div className="fw-semibold mb-1">
                      <i className="bi bi-folder-fill text-success me-1" />{t.teamName || 'Proyecto'}
                      &nbsp;
                      {t.projectType === 'individual'
                        ? <span className="badge bg-info text-dark"><i className="bi bi-person me-1" />Individual</span>
                        : <span className="badge bg-success"><i className="bi bi-people-fill me-1" />Grupal</span>}
                    </div>
                    <small className="text-muted">Módulo: <strong>{t.moduleName || '—'}</strong></small>
                    {t.members && t.members.length ? (
                      <div className="small text-muted mt-1"><i className="bi bi-people me-1" />{t.members.map((m) => m.name).join(', ')}</div>
                    ) : null}
                    {t.teacherNote ? (
                      <div className="mt-2 pt-2 border-top small">
                        <i className="bi bi-chat-left-quote text-info me-1" />
                        <span className="text-muted fst-italic">{t.teacherNote}</span>
                      </div>
                    ) : null}
                    {t.studentComment ? (
                      <div className="mt-1 small">
                        <i className="bi bi-chat-right-text text-primary me-1" />
                        <span className="text-primary fst-italic">{t.studentComment}</span>
                      </div>
                    ) : null}
                    {renderTeamCompetences(t.competences)}
                  </div>
                  <div className="d-flex flex-column gap-1 ms-2">
                    {gmail && (
                      <a className="btn btn-sm btn-outline-success py-0 px-1" title="Enviar feedback por email (Gmail)"
                        href={gmail} target="_blank" rel="noopener noreferrer">
                        <i className="bi bi-envelope-fill" style={{ fontSize: '.85rem' }} />
                      </a>
                    )}
                    <button className="btn btn-sm btn-outline-secondary py-0 px-1" title="Exportar PDF de este proyecto"
                      onClick={() => { const r = w().Reports; if (r) r.printProjectReport(i, currentStudentIdRef.current, promotionIdRef.current); else alert('La librería de informes no está cargada.'); }}>
                      <i className="bi bi-file-earmark-pdf" style={{ fontSize: '.85rem' }} />
                    </button>
                    <button className="btn btn-sm btn-outline-primary py-0 px-1" title="Editar proyecto" onClick={() => openEditTeamForm(i)}>
                      <i className="bi bi-pencil" style={{ fontSize: '.85rem' }} />
                    </button>
                    <button className="btn btn-sm btn-link text-danger p-0" onClick={() => removeTeam(i)}>
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </>
    );
  }

  function renderTeamForm() {
    if (!teamForm) return null;
    const isEdit = teamForm.mode === 'edit';
    const projectIdxNum = teamForm.projectIdx === '' ? null : parseInt(teamForm.projectIdx);
    const { single, groups } = buildCompetenceGroups(projectIdxNum, promotionProjects, promotionCompetences, catalogCompetences);
    const flatOptions: CompOption[] = groups.flatMap((g) => g.items);

    const allStudents = (w().currentStudents || []).filter((s: Student) => s.id !== currentStudentIdRef.current) as Student[];
    const q = teamForm.memberSearch.toLowerCase();
    const filteredStudents = allStudents.filter((s) => {
      const fn = (s.name + (s.lastname ? ' ' + s.lastname : '')).toLowerCase();
      return fn.includes(q);
    });

    const toggleMember = (id: string, name: string) => setTeamForm((f) => {
      if (!f) return f;
      const m = new Map(f.selectedMembers);
      if (m.has(id)) m.delete(id); else m.set(id, name);
      return { ...f, selectedMembers: m };
    });
    const onCompSelect = (name: string) => setTeamForm((f) => {
      if (!f) return f;
      const opt = flatOptions.find((it) => it.name === name);
      return { ...f, compSelectName: name, compTools: opt ? [...opt.tools] : [] };
    });
    const addComp = () => {
      const name = teamForm.compSelectName;
      if (!name) { toast('Selecciona una competencia', 'warning'); return; }
      if (teamForm.pending.some((c) => c.competenceName === name)) { toast('Esta competencia ya fue añadida', 'warning'); return; }
      const opt = flatOptions.find((it) => it.name === name);
      setTeamForm((f) => f && ({
        ...f,
        pending: [...f.pending, { competenceId: opt?.id ?? null, competenceName: name, level: f.compLevel, toolsUsed: f.compTools }],
        compSelectName: '', compTools: [], compLevel: 2,
      }));
    };
    const removeTool = (tool: string) => setTeamForm((f) => f && ({ ...f, compTools: f.compTools.filter((t) => t !== tool) }));
    const removePending = (i: number) => setTeamForm((f) => f && ({ ...f, pending: f.pending.filter((_, idx) => idx !== i) }));

    const compOptions = (
      <>
        <option value="">Seleccionar...</option>
        {single
          ? flatOptions.map((it, k) => <option key={k} value={it.name}>{it.name}</option>)
          : groups.map((g) => (
            <optgroup key={g.area} label={g.area}>
              {g.items.map((it, k) => <option key={k} value={it.name}>{it.name}</option>)}
            </optgroup>
          ))}
        {!flatOptions.length && <option value="">Sin competencias en el programa</option>}
      </>
    );

    return (
      <div className={`card mb-2 ${isEdit ? 'border-primary' : 'border-success'}`}>
        {isEdit && (
          <div className="card-header py-1 px-3 bg-light d-flex align-items-center gap-2">
            <i className="bi bi-pencil-square text-primary" />
            <span className="small fw-semibold text-primary">Editando: {teamForm.projectNameText || 'Proyecto'}</span>
          </div>
        )}
        <div className="card-body py-2 px-3">
          <div className="row g-2">
            <div className="col-md-5">
              <label className="form-label small fw-semibold">Proyecto del roadmap</label>
              {promotionProjects.length ? (
                <select className="form-select form-select-sm" value={teamForm.projectIdx}
                  onChange={(e) => setTeamForm((f) => f && ({ ...f, projectIdx: e.target.value, compSelectName: '', compTools: [] }))}>
                  <option value="">Seleccionar proyecto...</option>
                  {promotionProjects.map((p, pi) => <option key={pi} value={pi}>{p.name}</option>)}
                </select>
              ) : (
                <input type="text" className="form-control form-control-sm" placeholder="Nombre del proyecto"
                  value={teamForm.projectNameText} onChange={(e) => setTeamForm((f) => f && ({ ...f, projectNameText: e.target.value }))} />
              )}
            </div>
            <div className="col-md-7">
              <label className="form-label small fw-semibold">Tipo</label>
              <select className="form-select form-select-sm" value={teamForm.projectType}
                onChange={(e) => setTeamForm((f) => f && ({ ...f, projectType: e.target.value as 'grupal' | 'individual' }))}>
                <option value="grupal">Grupal</option>
                <option value="individual">Individual</option>
              </select>
            </div>

            {/* Compañeros */}
            {teamForm.projectType !== 'individual' && (
              <div className="col-12">
                <label className="form-label small fw-semibold">
                  <i className="bi bi-people me-1" />Compañeros de equipo
                  <span className="text-muted fw-normal"> (se actualizará su ficha automáticamente)</span>
                </label>
                <div className="form-control form-control-sm d-flex flex-wrap gap-1 align-items-center" style={{ minHeight: 34, cursor: 'text' }}>
                  <input type="text" className="border-0 flex-grow-1" placeholder="Buscar estudiante..." autoComplete="off"
                    style={{ minWidth: 120, outline: 'none' }} value={teamForm.memberSearch}
                    onChange={(e) => setTeamForm((f) => f && ({ ...f, memberSearch: e.target.value, memberListOpen: true }))}
                    onFocus={() => setTeamForm((f) => f && ({ ...f, memberListOpen: true }))}
                    onBlur={() => setTimeout(() => setTeamForm((f) => f && ({ ...f, memberListOpen: false })), 200)} />
                </div>
                {teamForm.memberListOpen && (
                  <ul className="list-unstyled border rounded bg-white w-100 mt-0" style={{ maxHeight: 160, overflowY: 'auto' }}>
                    {filteredStudents.length ? filteredStudents.map((s) => {
                      const id = String(s.id);
                      const fullName = s.name + (s.lastname ? ' ' + s.lastname : '');
                      const checked = teamForm.selectedMembers.has(id);
                      return (
                        <li key={id} className="team-member-option px-3 py-1" style={{ cursor: 'pointer' }}
                          onMouseDown={(e) => { e.preventDefault(); toggleMember(id, fullName); }}>
                          <div className="form-check mb-0">
                            <input className="form-check-input" type="checkbox" readOnly checked={checked} />
                            <label className="form-check-label small w-100" style={{ cursor: 'pointer' }}>{fullName}</label>
                          </div>
                        </li>
                      );
                    }) : <li className="px-3 py-2 text-muted small">No hay más estudiantes en la promoción.</li>}
                  </ul>
                )}
                <div className="d-flex flex-wrap gap-1 mt-1">
                  {[...teamForm.selectedMembers.entries()].map(([id, name]) => (
                    <span key={id} className="badge bg-success d-flex align-items-center gap-1" style={{ fontSize: '.8rem' }}>
                      <i className="bi bi-person-fill" />{name}
                      <button type="button" className="btn-close btn-close-white" style={{ fontSize: '.6rem' }}
                        onMouseDown={(e) => { e.preventDefault(); toggleMember(id, name); }} />
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Competencias del proyecto */}
            <div className="col-12 mt-1">
              <div className="border rounded p-2 bg-light">
                <div className="small fw-semibold text-primary mb-2"><i className="bi bi-award me-1" />Competencias trabajadas en este proyecto</div>
                <div className="row g-2 align-items-end mb-2">
                  <div className="col-md-5">
                    <label className="form-label small mb-1">Competencia</label>
                    <select className="form-select form-select-sm" value={teamForm.compSelectName} onChange={(e) => onCompSelect(e.target.value)}>
                      {compOptions}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small mb-1">Nivel (0–3)</label>
                    <select className="form-select form-select-sm" value={teamForm.compLevel}
                      onChange={(e) => setTeamForm((f) => f && ({ ...f, compLevel: parseInt(e.target.value) }))}>
                      <option value={0}>0 – Sin nivel</option>
                      <option value={1}>1 – Básico</option>
                      <option value={2}>2 – Medio</option>
                      <option value={3}>3 – Avanzado</option>
                    </select>
                  </div>
                  <div className="col-md-4 d-flex align-items-end">
                    <button className="btn btn-sm btn-outline-primary w-100" onClick={addComp}><i className="bi bi-plus-lg me-1" />Añadir</button>
                  </div>
                  <div className="col-12">
                    <div className="d-flex flex-wrap gap-1 mt-1">
                      {teamForm.compSelectName && !teamForm.compTools.length && (
                        <span className="small text-muted fst-italic">Sin herramientas definidas para esta competencia.</span>
                      )}
                      {teamForm.compTools.map((tool, k) => (
                        <span key={k} className="badge bg-secondary d-inline-flex align-items-center gap-1" style={{ fontSize: '.78rem' }}>
                          {tool}
                          <button type="button" className="btn-close btn-close-white" style={{ fontSize: '.55rem' }}
                            onMouseDown={(e) => { e.preventDefault(); removeTool(tool); }} />
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  {!teamForm.pending.length ? <p className="small text-muted mb-0">Ninguna añadida aún.</p> : teamForm.pending.map((c, i) => {
                    const lvlColor = PROJ_LEVEL_COLORS[c.level] ?? 'secondary';
                    const lvlLabel = PROJ_LEVEL_LABELS[c.level] ?? c.level;
                    return (
                      <div key={i} className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                        <span className={`badge bg-${lvlColor}`}>Nv.{c.level} {lvlLabel}</span>
                        <span className="small fw-semibold">{c.competenceName}</span>
                        {(c.toolsUsed || []).map((t, k) => <span key={k} className="badge bg-light text-dark border">{t}</span>)}
                        <button className="btn btn-sm btn-link text-danger p-0 ms-auto" style={{ fontSize: '.8rem' }}
                          onMouseDown={(e) => { e.preventDefault(); removePending(i); }}>
                          <i className="bi bi-x-circle" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Nota del profesor */}
            <div className="col-12">
              <label className="form-label small fw-semibold">
                <i className="bi bi-chat-left-quote me-1 text-info" />Nota del profesor sobre este proyecto
                <span className="fw-normal text-muted"> (opcional)</span>
              </label>
              <textarea className="form-control form-control-sm" rows={2} placeholder="Valoración, observaciones, feedback..."
                value={teamForm.teacherNote} onChange={(e) => setTeamForm((f) => f && ({ ...f, teacherNote: e.target.value }))} />
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-2">
            <button className="btn btn-sm btn-secondary" onClick={() => setTeamForm(null)}>Cancelar</button>
            {isEdit ? (
              <button className="btn btn-sm btn-primary" onClick={saveTeamEdit}><i className="bi bi-floppy me-1" />Guardar cambios</button>
            ) : (
              <button className="btn btn-sm btn-success" onClick={saveNewTeam}><i className="bi bi-folder-plus me-1" />Guardar proyecto</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderModules() {
    if (!completedModules.length) return emptyState('book', 'Sin módulos registrados');
    return (
      <>
        {completedModules.map((m, i) => {
          const c = computeModule(m, promotionModules);
          const gradeBadge = m.finalGrade
            ? <span className={`badge bg-${LEVEL_COLORS[m.finalGrade] || 'secondary'} ms-1`}>{LEVEL_LABELS[m.finalGrade] || m.finalGrade}</span>
            : null;
          const dateInfo = m.completionDate
            ? <><i className="bi bi-calendar-check me-1" />{fmtDate(m.completionDate)}</>
            : (c.isComplete ? <><i className="bi bi-calendar-check me-1" />Completado</> : null);
          const detailParts: string[] = [];
          if (c.projPct !== null) {
            const evalCount = c.resolvedEvalCount !== null ? c.resolvedEvalCount : (c.isAutoEntry ? Math.round(((m.progressPercent ?? 0) / 100) * c.resolvedTotalCount) : 0);
            detailParts.push(`${evalCount}/${c.resolvedTotalCount} proy.`);
          }
          if (c.courseProgressPct !== null) detailParts.push(`${c.completedCourses.size}/${c.moduleCourses.length} cursos`);
          const pctTextColor = c.isComplete ? '#198754' : (c.displayPct ?? 0) >= 60 ? '#0d6efd' : (c.displayPct ?? 0) >= 30 ? '#ffc107' : '#dc3545';
          return (
            <div key={i} className={`card mb-2 border-start border-4 ${c.borderColor}`}>
              <div className="card-body py-2 px-3">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <div className="fw-semibold">
                      <i className="bi bi-book-fill text-primary me-1" />{m.moduleName || '—'}
                      {gradeBadge}
                      {c.isAutoEntry && <span className="badge bg-light text-secondary border ms-2" style={{ fontSize: '.65rem' }}><i className="bi bi-robot me-1" />Auto</span>}
                    </div>
                    {dateInfo && <small className="text-muted">{dateInfo}</small>}
                    {m.notes && <div className="mt-1 small text-muted fst-italic"><i className="bi bi-info-circle me-1" />{m.notes}</div>}

                    {c.displayPct !== null && (
                      <div className="mt-2">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <small className="text-muted fw-semibold">
                            Progreso del módulo {detailParts.length > 1 && <span className="text-muted fw-normal">({detailParts.join(' · ')})</span>}
                          </small>
                          <small className="fw-bold" style={{ color: pctTextColor }}>{c.displayPct}%</small>
                        </div>
                        <div className="progress" style={{ height: 8 }}>
                          <div className={`progress-bar ${c.barColor}`} role="progressbar"
                            style={{ width: `${c.displayPct}%`, transition: 'width 0.5s ease' }}
                            aria-valuenow={c.displayPct} aria-valuemin={0} aria-valuemax={100} />
                        </div>
                        {c.isComplete && <div className="mt-1"><span className="badge bg-success"><i className="bi bi-check-circle me-1" />Módulo completado</span></div>}
                      </div>
                    )}

                    {c.moduleCourses.length > 0 && (
                      <div className="mt-2 pt-2 border-top">
                        <div className="small fw-semibold text-secondary mb-1">
                          <i className="bi bi-journal-bookmark me-1" />Cursos del módulo
                          <span className="ms-1 text-muted fw-normal">({c.completedCourses.size}/{c.moduleCourses.length} completados)</span>
                        </div>
                        <div className="d-flex flex-column gap-1">
                          {c.moduleCourses.map((course, ci) => {
                            const courseName = typeof course === 'string' ? course : (course.name || `Curso ${ci + 1}`);
                            const courseUrl = typeof course === 'object' ? (course.url || '') : '';
                            const checked = c.completedCourses.has(String(ci));
                            return (
                              <div key={ci} className="form-check form-check-sm d-flex align-items-center gap-2 mb-0">
                                <input className="form-check-input flex-shrink-0" type="checkbox" checked={checked}
                                  onChange={(e) => toggleCourse(i, ci, e.target.checked)} />
                                <label className={`form-check-label small ${checked ? 'text-decoration-line-through text-muted' : ''}`} style={{ cursor: 'pointer' }}>
                                  {courseUrl
                                    ? <a href={courseUrl} target="_blank" rel="noopener noreferrer" className="text-decoration-none">{courseName} <i className="bi bi-box-arrow-up-right" style={{ fontSize: '.65rem' }} /></a>
                                    : courseName}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <button className="btn btn-sm btn-link text-danger p-0 ms-2" onClick={() => removeModule(i)}><i className="bi bi-trash" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </>
    );
  }

  function renderPildoras() {
    const presented: { pildoraName: string; moduleName: string; date: string | null; mode: string | null; status: string }[] = [];
    const pending: typeof presented = [];
    (modPildExt || []).forEach((mp) => {
      (mp.pildoras || []).forEach((p) => {
        const ids = (p.students || []).map((s) => String(s.id));
        if (!ids.includes(String(currentStudentId))) return;
        const entry = { pildoraName: p.title || '—', moduleName: mp.moduleName || '—', date: p.date || null, mode: p.mode || null, status: p.status || '' };
        if (p.status === 'Presentada') presented.push(entry); else pending.push(entry);
      });
    });
    if (!presented.length && !pending.length) return emptyState('lightning-charge', 'No hay píldoras asignadas a este coder');
    return (
      <>
        {presented.length > 0 && (
          <>
            <div className="small fw-semibold text-success mb-1 mt-2"><i className="bi bi-check-circle-fill me-1" />Presentadas ({presented.length})</div>
            {presented.map((p, i) => (
              <div key={i} className="card mb-2 border-start border-4 border-success">
                <div className="card-body py-2 px-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-semibold"><i className="bi bi-lightning-charge-fill text-success me-1" />{p.pildoraName}</div>
                      <small className="text-muted">
                        Módulo: <strong>{p.moduleName}</strong>
                        {p.date && <>&nbsp;|&nbsp;<i className="bi bi-calendar3 me-1" />{fmtDate(p.date)}</>}
                        {p.mode && <>&nbsp;|&nbsp;<i className="bi bi-display me-1" />{p.mode}</>}
                      </small>
                    </div>
                    <span className="badge bg-success"><i className="bi bi-check-circle me-1" />Presentada</span>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
        {pending.length > 0 && (
          <>
            <div className="small fw-semibold text-danger mb-1 mt-3"><i className="bi bi-x-circle-fill me-1" />No presentadas / Pendientes ({pending.length})</div>
            {pending.map((p, i) => (
              <div key={i} className="card mb-2 border-start border-4 border-danger">
                <div className="card-body py-2 px-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-semibold"><i className="bi bi-lightning-charge text-danger me-1" />{p.pildoraName}</div>
                      <small className="text-muted">
                        Módulo: <strong>{p.moduleName}</strong>
                        {p.date && <>&nbsp;|&nbsp;<i className="bi bi-calendar3 me-1" />{fmtDate(p.date)}</>}
                        {p.mode && <>&nbsp;|&nbsp;<i className="bi bi-display me-1" />{p.mode}</>}
                      </small>
                    </div>
                    <span className="badge bg-danger"><i className="bi bi-x-circle me-1" />{p.status || 'Pendiente'}</span>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </>
    );
  }

  function renderSummary() {
    const s = computeSummary(completedModules, promotionModules, teams.length);
    if (!s.show) return null;
    return (
      <div className="card border-0 bg-light mb-3">
        <div className="card-body py-2 px-3">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span className="small fw-semibold text-secondary"><i className="bi bi-bar-chart-fill me-1" />Progreso global del bootcamp</span>
            <span className="fw-bold" style={{ color: s.globalColor, fontSize: '1.1rem' }}>{s.avgProgress}%</span>
          </div>
          <div className="progress mb-2" style={{ height: 10 }}>
            <div className={`progress-bar ${s.globalBarColor}`} role="progressbar"
              style={{ width: `${s.avgProgress}%`, transition: 'width 0.6s ease' }}
              aria-valuenow={s.avgProgress} aria-valuemin={0} aria-valuemax={100} />
          </div>
          <div className="d-flex gap-3 flex-wrap">
            <small className="text-muted"><i className="bi bi-check-circle-fill text-success me-1" /><strong>{s.completedModulesCount}</strong> de <strong>{s.totalModules}</strong> módulos completados</small>
            <small className="text-muted"><i className="bi bi-folder2-open me-1" /><strong>{teams.length}</strong> proyecto{teams.length !== 1 ? 's' : ''} evaluado{teams.length !== 1 ? 's' : ''}</small>
            {s.totalCoursesAll > 0 && <small className="text-muted"><i className="bi bi-journal-bookmark me-1" /><strong>{s.completedCoursesAll}</strong>/<strong>{s.totalCoursesAll}</strong> cursos completados</small>}
          </div>
        </div>
      </div>
    );
  }

  function renderBaja() {
    const s = currentStudent;
    if (!s) return null;

    if (bajaMode === 'editing') {
      return (
        <div className="card border-danger">
          <div className="card-header bg-danger text-white d-flex align-items-center gap-2">
            <i className="bi bi-person-x-fill" />
            <strong>{s.isWithdrawn ? 'Editar datos de baja' : 'Registrar Baja Oficial'}</strong>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label small fw-semibold">Fecha oficial de baja <span className="text-danger">*</span></label>
                <input type="date" className="form-control form-control-sm" value={bajaForm.date}
                  onChange={(e) => setBajaForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-semibold">Representante Factoría F5 que firma <span className="text-danger">*</span></label>
                <input type="text" className="form-control form-control-sm" placeholder="Nombre y cargo del representante"
                  value={bajaForm.representative} onChange={(e) => setBajaForm((f) => ({ ...f, representative: e.target.value }))} />
              </div>
              <div className="col-12">
                <label className="form-label small fw-semibold">Motivo de la baja <span className="text-danger">*</span></label>
                <textarea className="form-control form-control-sm" rows={3} placeholder="Describe el motivo de la baja del estudiante…"
                  value={bajaForm.reason} onChange={(e) => setBajaForm((f) => ({ ...f, reason: e.target.value }))} />
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setBajaMode('closed')}>Cancelar</button>
              <button type="button" className="btn btn-sm btn-danger" onClick={saveWithdrawal}>
                <i className="bi bi-check-lg me-1" />{s.isWithdrawn ? 'Actualizar' : 'Registrar Baja y Generar Acta'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (s.isWithdrawn && s.withdrawal) {
      const wd = s.withdrawal;
      return (
        <div className="alert alert-danger d-flex align-items-start gap-3 mb-3" role="alert">
          <i className="bi bi-person-x-fill fs-4 text-danger mt-1 flex-shrink-0" />
          <div className="flex-grow-1">
            <h6 className="alert-heading mb-2">Este coder ha causado baja oficial</h6>
            <div className="row g-2 small">
              <div className="col-md-4"><span className="fw-semibold">Fecha de baja:</span><br />{wd.date ? new Date(wd.date).toLocaleDateString('es-ES') : '—'}</div>
              <div className="col-md-4"><span className="fw-semibold">Representante F5:</span><br />{wd.representative || '—'}</div>
              <div className="col-12"><span className="fw-semibold">Motivo:</span><br />{wd.reason || '—'}</div>
            </div>
            <div className="mt-3 d-flex gap-2 flex-wrap">
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={openBajaForm}><i className="bi bi-pencil me-1" />Editar datos de baja</button>
              <button type="button" className="btn btn-sm btn-outline-secondary"
                onClick={() => { const r = w().Reports; if (r) r.printActaBaja(currentStudentIdRef.current, promotionIdRef.current); else alert('La librería de informes no está cargada.'); }}>
                <i className="bi bi-file-earmark-text me-1" />Descargar Acta de Baja
              </button>
              <button type="button" className="btn btn-sm btn-link text-secondary p-0 ms-auto align-self-center" onClick={cancelWithdrawal}>
                <i className="bi bi-arrow-counterclockwise me-1" />Reactivar estudiante
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <button type="button" className="btn btn-outline-danger btn-sm" onClick={openBajaForm}>
        <i className="bi bi-person-x me-1" /> Dar de Baja al Estudiante
      </button>
    );
  }
}
