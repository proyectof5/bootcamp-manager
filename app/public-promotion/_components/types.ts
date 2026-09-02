// Tipos del dominio para /public-promotion (vista pública read-only).

export interface PPCourse {
  name?: string;
  url?: string;
  duration?: number;
  startOffset?: number;
}

export interface PPModule {
  name: string;
  duration: number;
  courses?: (PPCourse | string)[];
  projects?: (PPCourse | string)[];
}

export interface PPEmployability {
  name: string;
  url?: string;
  startMonth: number;
  duration: number;
}

export interface PPPromotion {
  id?: string;
  _id?: string;
  name?: string;
  weeks?: number;
  startDate?: string;
  endDate?: string;
  accessPassword?: string;
  modules?: PPModule[];
  employability?: PPEmployability[];
}

export interface PPQuickLink {
  name: string;
  url: string;
  platform?: string;
}

export interface PPCalendar {
  googleCalendarId?: string;
  googleAppointmentUrl?: string;
}

export interface PPStudent {
  id?: string;
  name?: string;
  lastname?: string;
  isWithdrawn?: boolean;
  withdrawn?: boolean;
}

export interface PPPildora {
  mode?: string;
  date?: string;
  title?: string;
  status?: string;
  students?: { id?: string; name?: string; lastname?: string }[];
}

export interface PPModulePildoras {
  moduleId?: string;
  moduleName?: string;
  pildoras?: PPPildora[];
}

export interface PPLevel {
  level: number;
  description?: string;
  indicators?: string[];
}

export interface PPCompetence {
  id?: string | number;
  name?: string;
  area?: string;
  description?: string;
  selectedTools?: string[];
  allTools?: string[];
  levels?: PPLevel[];
}

export interface PPProjectCompetence {
  competenceIds?: (string | number)[];
}

export interface PPSection {
  id: string;
  title: string;
  content: string;
}

export interface PPScheduleBlock {
  entry?: string;
  start?: string;
  break?: string;
  lunch?: string;
  finish?: string;
}

export interface PPSchedule {
  online?: PPScheduleBlock;
  presential?: PPScheduleBlock;
  notes?: string;
}

export interface PPTeamMember {
  name?: string;
  role?: string;
  email?: string;
  linkedin?: string;
}

export interface PPResource {
  title?: string;
  url?: string;
  category?: string;
}

export interface PPPromoResource {
  title: string;
  url: string;
  type?: string;
  module?: string;
  description?: string;
}

export interface PPExtendedInfo {
  schedule?: PPSchedule | null;
  team?: PPTeamMember[] | null;
  evaluation?: string | null;
  resources?: PPResource[] | null;
  showEmployability?: boolean;
  pildoras?: PPPildora[];
  modulesPildoras?: PPModulePildoras[];
  pildorasAssignmentOpen?: boolean;
  competences?: PPCompetence[];
  projectCompetences?: PPProjectCompetence[];
}

// ── Aula Virtual ──
export interface PPVCTool {
  name: string;
  description?: string;
  indicators?: { name: string; levelId: number }[];
}
export interface PPVCCompetence {
  name?: string;
  area?: string;
  description?: string;
  levels?: PPLevel[];
  competenceIndicators?: {
    initial?: (string | { name?: string })[];
    medio?: (string | { name?: string })[];
    advance?: (string | { name?: string })[];
  };
  toolsWithIndicators?: PPVCTool[];
}
export interface PPVCGroup {
  groupName: string;
  studentIds?: string[];
}
// Un proyecto activo del Aula Virtual (puede haber varios a la vez — uno por especialización).
export interface PPVCProject {
  projectType?: string;
  project?: { moduleId?: string; moduleName?: string; projectName?: string };
  briefingUrl?: string;
  dueDate?: string;
  competences?: PPVCCompetence[];
  repoBaseUrl?: string;
  groups?: PPVCGroup[];
}
// Respuesta de GET /virtual-classroom: 0, 1 o varios proyectos activos simultáneamente.
export interface PPVirtualClassroomResponse {
  active: boolean;
  projects: PPVCProject[];
}
export interface PPSubmission {
  targetId: string;
  submissionLink: string;
  submittedAt?: string;
  submissionStatus?: string;
}

export function indName(i: string | { name?: string }): string {
  return typeof i === 'string' ? i : i.name || '';
}

export const PROMO_RES_META: Record<string, { color: string; label: string }> = {
  video: { color: '#dc3545', label: 'Vídeo' },
  repository: { color: '#212529', label: 'Repositorio' },
  canva: { color: '#7c3aed', label: 'Canva' },
  powerpoint: { color: '#e55a1c', label: 'PowerPoint' },
  other: { color: '#6c757d', label: 'Recurso' },
};

export function hasScheduleData(s?: PPSchedule | null): boolean {
  if (!s) return false;
  const on = s.online && Object.values(s.online).some((v) => v && String(v).trim());
  const pre = s.presential && Object.values(s.presential).some((v) => v && String(v).trim());
  return !!(on || pre || (s.notes && s.notes.trim()));
}

export function ppName(item: PPCourse | string): { name: string; url: string; duration: number; offset: number } {
  const isObj = item && typeof item === 'object';
  return {
    name: isObj ? item.name || 'Unnamed' : String(item),
    url: isObj ? item.url || '' : '',
    duration: isObj ? Number(item.duration) || 1 : 1,
    offset: isObj ? Number(item.startOffset) || 0 : 0,
  };
}
