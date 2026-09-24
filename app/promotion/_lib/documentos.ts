/**
 * documentos.ts — los documentos que alimentan la carpeta de proyecto ISO
 * (docs/tasks/documentos-carpeta-iso.md).
 *
 * Cada función se descarga sus propios datos y devuelve un PDF. El estilo y la
 * paginación salen de doc-pdf.ts, para que los seis parezcan el mismo documento.
 *
 * A qué carpeta va cada uno:
 *   01.2 Diseño formación   → competencias del programa (+ stack, en el sílabo)
 *   03.1 Selección formadores → equipo formativo
 *   03.2 Plan de gestión    → horario
 *   03.3 Ejecución          → entregas por estudiante · requisitos de superación
 *   03.4 Cierre             → métricas de la promoción
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiFetch } from '@/lib/api';
import { nuevoDoc, seccion, parrafo, campos, tabla, aviso, firma, guardar, type Doc } from './doc-pdf';

const idPromocion = () => new URLSearchParams(window.location.search).get('id') || '';

async function traer(ruta: string): Promise<any> {
  const res = await apiFetch(ruta);
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `No se pudieron cargar los datos (${res.status}).`);
  }
  return res.json();
}

const fechaCorta = (v?: string | null) =>
  v ? new Date(`${String(v).slice(0, 10)}T00:00:00`).toLocaleDateString('es-ES') : '—';

/** Nombre de fichero con la promoción delante, para que ordene bien en la carpeta. */
const nombre = (promo: string, doc: string) => `${promo} - ${doc}.pdf`;

async function contexto() {
  const id = idPromocion();
  const promocion = await traer(`/api/promotions/${id}`);
  return { id, promocion, nombrePromo: promocion.name || 'Promoción' };
}

// ── 03.2 Plan de gestión: el horario ────────────────────────────────────────

export async function descargarHorario() {
  const { id, promocion, nombrePromo } = await contexto();
  const info = await traer(`/api/promotions/${id}/extended-info`);
  const h = info.schedule || {};

  const doc = nuevoDoc('Horario de la formación', nombrePromo,
    'Jornada lectiva y tramos horarios acordados para esta promoción.');

  const tramos = (t: any) => ([
    ['Entrada', t?.entry || '—'],
    ['Inicio de clase', t?.start || '—'],
    ['Descanso', t?.break || '—'],
    ['Comida', t?.lunch || '—'],
    ['Salida', t?.finish || '—'],
  ] as [string, string][]);

  seccion(doc, 'Presencial');
  campos(doc, tramos(h.presential));
  seccion(doc, 'En línea');
  campos(doc, tramos(h.online));

  seccion(doc, 'Calendario');
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const lectivos = (promocion.workingDays && promocion.workingDays.length ? promocion.workingDays : [1, 2, 3, 4, 5]);
  campos(doc, [
    ['Inicio', fechaCorta(promocion.startDate)],
    ['Fin', fechaCorta(promocion.endDate)],
    ['Días lectivos', lectivos.map((d: number) => dias[d]).join(', ')],
    ['Jornada', `${promocion.hoursPerDay || 7} h/día`],
    ['Modalidad', info.modality || '—'],
  ]);

  if (h.notes) { seccion(doc, 'Observaciones'); parrafo(doc, h.notes); }

  const festivos: string[] = promocion.holidays || [];
  const nombres: Record<string, string> = promocion.holidayNames || {};
  if (festivos.length) {
    seccion(doc, `Festivos (${festivos.length})`);
    tabla(doc, ['Fecha', 'Motivo'],
      [...festivos].sort().map(f => [fechaCorta(f), nombres[f] || 'Festivo']), [1, 3]);
  }

  const flex = promocion.flexibleBlocks || [];
  if (flex.length) {
    seccion(doc, 'Periodos sin actividad lectiva');
    tabla(doc, ['Desde', 'Hasta', 'Motivo'],
      flex.map((b: any) => [fechaCorta(b.startDate), fechaCorta(b.endDate), b.name || 'Tiempo flexible']), [1, 1, 3]);
  }

  guardar(doc, nombre(nombrePromo, 'Horario'));
}

// ── 03.1 Selección de formadores: el equipo ─────────────────────────────────

export async function descargarEquipo() {
  const { id, promocion, nombrePromo } = await contexto();
  const info = await traer(`/api/promotions/${id}/extended-info`);
  const equipo: any[] = info.team || [];
  const modulos: any[] = promocion.modules || [];
  const nombreModulo = (mid: string) => (modulos.find(m => m.id === mid) || {}).name || mid;

  const doc = nuevoDoc('Equipo formativo', nombrePromo,
    'Personas asignadas a la promoción y módulos de los que se ocupa cada una.');

  if (!equipo.length) {
    aviso(doc, 'Todavía no hay nadie asignado al equipo formativo de esta promoción.');
  } else {
    tabla(doc, ['Nombre', 'Rol', 'Correo', 'Módulos'],
      equipo.map(p => [
        p.name || '—',
        p.role || '—',
        p.email || '—',
        (p.moduleIds || []).map(nombreModulo).join(', ') || 'Todos',
      ]), [2, 1.4, 2.4, 3]);
  }

  guardar(doc, nombre(nombrePromo, 'Equipo formativo'));
}

// ── 01.2 Diseño formación: competencias ─────────────────────────────────────

export async function descargarCompetencias() {
  const { id, promocion, nombrePromo } = await contexto();
  const info = await traer(`/api/promotions/${id}/extended-info`);
  const comps: any[] = info.competences || [];

  const doc = nuevoDoc('Competencias del programa', nombrePromo,
    'Competencias que el bootcamp desarrolla y evalúa, con su área y descripción.');

  if (promocion.stack) { seccion(doc, 'Stack tecnológico'); parrafo(doc, promocion.stack); }

  if (!comps.length) {
    aviso(doc, 'Esta promoción todavía no tiene competencias asignadas desde el catálogo.');
  } else {
    const porArea = new Map<string, any[]>();
    for (const c of comps) {
      const a = c.area || 'Sin área';
      if (!porArea.has(a)) porArea.set(a, []);
      porArea.get(a)!.push(c);
    }
    for (const [area, lista] of porArea) {
      seccion(doc, `${area} (${lista.length})`);
      tabla(doc, ['Competencia', 'Descripción'],
        lista.map(c => [c.name || '—', c.description || '—']), [2, 3]);
    }
  }

  guardar(doc, nombre(nombrePromo, 'Competencias del programa'));
}

// ── 03.4 Cierre: métricas ───────────────────────────────────────────────────

export async function descargarMetricas() {
  const { id, nombrePromo } = await contexto();
  const m = await traer(`/api/promotions/${id}/metrics`);
  const pct = (v: number | null) => (v === null || v === undefined ? '—' : `${v} %`);

  const doc = nuevoDoc('Métricas de la promoción', nombrePromo,
    'Resultados de matrícula, abandono y empleabilidad.');

  if ((m.warnings || []).includes('NO_END_DATE')) {
    aviso(doc, 'La promoción no tiene fecha de fin, así que no se han podido calcular las salidas positivas ni el tiempo medio hasta el empleo.');
  }

  seccion(doc, 'Matrícula y abandono');
  campos(doc, [
    ['Estudiantes', String(m.total)],
    ['Bajas', String(m.withdrawn)],
    ['Finalizan', String(m.finishing)],
    ['Abandono', pct(m.dropoutRate)],
  ]);

  seccion(doc, 'Género');
  campos(doc, [
    ['Mujeres', String(m.gender.women)],
    ['Hombres', String(m.gender.men)],
    ['Sin especificar', String(m.gender.other)],
  ]);

  seccion(doc, 'Salidas y empleabilidad');
  campos(doc, [
    ['Salidas positivas', `${m.positiveExits.count} (${pct(m.positiveExits.rate)})`],
    ['Empleados', `${m.employed.total} · ${m.employed.it} en IT, ${m.employed.other} en otro sector`],
    ['Continúan estudios IT', String(m.continuingITStudies)],
    ['Tiempo medio hasta el empleo', m.avgMonthsToEmployment === null ? '—' : `${m.avgMonthsToEmployment} meses`],
  ]);

  const filas = Object.entries(m.bySituation || {}).map(([k, v]) => [k, String(v)]);
  if (filas.length) { seccion(doc, 'Por situación'); tabla(doc, ['Situación', 'Personas'], filas, [3, 1]); }

  if ((m.bySector || []).length) {
    seccion(doc, 'Por sector');
    tabla(doc, ['Sector', 'Personas'], m.bySector.map((r: any) => [r.name, String(r.count)]), [3, 1]);
  }

  if ((m.withoutFollowUp || []).length) {
    seccion(doc, `Sin seguimiento registrado (${m.withoutFollowUp.length})`);
    parrafo(doc, m.withoutFollowUp.map((s: any) => s.name).join(' · '), 'suave');
  }

  guardar(doc, nombre(nombrePromo, 'Metricas'));
}

// ── 03.3 Ejecución: entregas por estudiante ─────────────────────────────────

export async function descargarEntregas() {
  const { id, nombrePromo } = await contexto();
  const info = await traer(`/api/promotions/${id}/extended-info`);
  const estudiantes: any[] = await traer(`/api/promotions/${id}/students`);
  const bloques: any[] = Object.values(info.projectEvaluations || {});

  const doc = nuevoDoc('Entregas por estudiante', nombrePromo,
    'Proyectos entregados por cada persona, con el repositorio y la fecha.');

  // Un índice estudiante → entregas, resolviendo los grupos a sus integrantes.
  const porEstudiante = new Map<string, string[][]>();
  for (const b of bloques) {
    const grupos = new Map<string, string[]>();
    for (const g of b.groups || []) grupos.set(String(g.name || '').trim(), g.studentIds || []);

    for (const g of b.groups || []) {
      for (const sid of g.studentIds || []) {
        if (!porEstudiante.has(sid)) porEstudiante.set(sid, []);
        porEstudiante.get(sid)!.push([
          b.projectName || b.moduleName || '—',
          g.name || 'Individual',
          g.repoUrl || g.repo || '—',
          fechaCorta(g.submittedAt),
        ]);
      }
    }
  }

  let conEntregas = 0;
  for (const s of estudiantes) {
    const filas = porEstudiante.get(s.id) || [];
    if (filas.length) conEntregas++;
    seccion(doc, `${s.name || ''} ${s.lastname || ''}`.trim() || 'Sin nombre');
    if (!filas.length) parrafo(doc, 'Sin entregas registradas.', 'suave');
    else tabla(doc, ['Proyecto', 'Grupo', 'Repositorio', 'Fecha'], filas, [2.2, 1.4, 3.4, 1]);
  }

  if (!conEntregas) {
    aviso(doc, 'Ningún estudiante tiene entregas registradas todavía. Las entregas llegan cuando el estudiantado publica su repositorio desde el portal.');
  }

  guardar(doc, nombre(nombrePromo, 'Entregas por estudiante'));
}

// ── 03.3 Ejecución: requisitos de superación ────────────────────────────────

export async function descargarRequisitos() {
  const { id, nombrePromo } = await contexto();
  const c = await traer(`/api/promotions/${id}/completion`);
  const cr = c.criterios || {};

  const doc = nuevoDoc('Requisitos de superación del bootcamp', nombrePromo,
    'Criterios exigidos para obtener el diploma y resultado de su aplicación a cada persona.');

  if (!c.aprobados) {
    aviso(doc, 'ATENCIÓN: estos requisitos todavía NO están aprobados por el Responsable de Escuela u Operaciones. Sin esa aprobación el documento no es válido como justificación.');
  }

  seccion(doc, 'Requisitos');
  campos(doc, [
    ['Asistencia mínima', `${cr.minAttendance} %`],
    ['Nivel mínimo exigido', `Nivel ${cr.requiredLevel} en cada competencia`],
    ['Competencias exigidas',
      (cr.competenceIds && cr.competenceIds.length)
        ? `${cr.competenceIds.length} de ${(c.competencias || []).length}`
        : `Todas (${(c.competencias || []).length})`],
  ]);
  if (cr.extra) parrafo(doc, cr.extra);

  seccion(doc, 'Aprobación');
  firma(doc, cr.approvedBy, cr.approvedByRole, fechaCorta(cr.approvedAt));

  seccion(doc, 'Aplicación a cada estudiante');
  const alumnos: any[] = c.estudiantes || [];
  tabla(doc, ['Estudiante', 'Competencias', 'Asistencia', 'Cumple', 'Decisión', 'Decide'],
    alumnos.map(a => {
      const d = a.decision;
      const ok = (a.evaluacion.detalle || []).filter((x: any) => x.cumple).length;
      return [
        a.nombre + (a.baja ? ' (baja)' : ''),
        `${ok} de ${(a.evaluacion.detalle || []).length}`,
        a.evaluacion.asistencia.valor === null ? 'sin datos' : `${a.evaluacion.asistencia.valor} %`,
        a.evaluacion.cumple ? 'Sí' : 'No',
        d ? (d.passed ? 'APTO' : 'NO APTO') : 'sin decidir',
        d ? `${d.decidedBy} · ${fechaCorta(d.decidedAt)}` : '—',
      ];
    }), [2.6, 1.2, 1.1, 0.9, 1.1, 2]);

  const discrepan = alumnos.filter(a => a.decision && a.decision.discrepa);
  if (discrepan.length) {
    seccion(doc, 'Decisiones motivadas');
    parrafo(doc, 'Personas cuya decisión no coincide con el resultado automático de los criterios. El motivo queda registrado junto a la decisión.', 'suave');
    tabla(doc, ['Estudiante', 'Decisión', 'Motivo'],
      discrepan.map(a => [a.nombre, a.decision.passed ? 'APTO' : 'NO APTO', a.decision.note]), [2, 1, 4]);
  }

  guardar(doc, nombre(nombrePromo, 'Requisitos de superacion'));
}

/** Todo junto, para engancharlo desde el JS legacy por id. */
export function initDocumentos() {
  const w = window as any;
  w.Documentos = {
    horario: descargarHorario,
    equipo: descargarEquipo,
    competencias: descargarCompetencias,
    metricas: descargarMetricas,
    entregas: descargarEntregas,
    requisitos: descargarRequisitos,
  };
}
