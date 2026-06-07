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
  isWithdrawn?: boolean;
  withdrawn?: boolean;
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

// extended-info trae más (píldoras/competencias) que se migran en pasos 3-4.
export interface PPExtendedInfo {
  schedule?: PPSchedule | null;
  team?: PPTeamMember[] | null;
  evaluation?: string | null;
  resources?: PPResource[] | null;
  showEmployability?: boolean;
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
