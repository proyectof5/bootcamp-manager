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

export function ppName(item: PPCourse | string): { name: string; url: string; duration: number; offset: number } {
  const isObj = item && typeof item === 'object';
  return {
    name: isObj ? item.name || 'Unnamed' : String(item),
    url: isObj ? item.url || '' : '',
    duration: isObj ? Number(item.duration) || 1 : 1,
    offset: isObj ? Number(item.startOffset) || 0 : 0,
  };
}
