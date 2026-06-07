// Tipos del dominio para la vista student-dashboard.
// El backend devuelve JSON laxo; cursos/proyectos pueden venir como string u objeto.

export interface CourseLike {
  name?: string;
  url?: string;
  duration?: number;
  startOffset?: number;
}

export interface ModuleData {
  name: string;
  duration: number;
  courses?: (CourseLike | string)[];
  projects?: (CourseLike | string)[];
}

export interface EmployabilityItem {
  name: string;
  url?: string;
  startMonth: number;
  duration: number;
}

export interface Promotion {
  id?: string;
  _id?: string;
  description?: string;
  weeks?: number;
  modules?: ModuleData[];
  employability?: EmployabilityItem[];
}

export interface ScheduleBlock {
  entry?: string;
  start?: string;
  break?: string;
  lunch?: string;
  finish?: string;
}

export interface Schedule {
  online?: ScheduleBlock;
  presential?: ScheduleBlock;
  notes?: string;
}

export interface TeamMember {
  name?: string;
  role?: string;
  email?: string;
  linkedin?: string;
}

export interface ResourceItem {
  title?: string;
  url?: string;
  category?: string;
}

export interface ExtendedInfo {
  schedule?: Schedule | null;
  team?: TeamMember[] | null;
  resources?: ResourceItem[] | null;
  evaluation?: string | null;
}

export interface CalendarInfo {
  googleCalendarId?: string;
  googleAppointmentUrl?: string;
}

export interface QuickLink {
  platform?: string;
  url: string;
  name: string;
}

// Helpers para normalizar cursos/proyectos string|objeto.
export function asNamedUrl(item: CourseLike | string): { name: string; url: string } {
  if (typeof item === 'string') return { name: item, url: '' };
  return { name: item.name || 'Unnamed', url: item.url || '' };
}

export function asTimedItem(item: CourseLike | string): {
  name: string;
  url: string;
  duration: number;
  offset: number;
} {
  const isObj = item && typeof item === 'object';
  return {
    name: isObj ? item.name || 'Unnamed' : String(item),
    url: isObj ? item.url || '' : '',
    duration: isObj ? Number(item.duration) || 1 : 1,
    offset: isObj ? Number(item.startOffset) || 0 : 0,
  };
}
