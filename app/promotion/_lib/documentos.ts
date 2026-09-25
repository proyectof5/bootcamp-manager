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
import { nuevoDoc, seccion, parrafo, campos, tabla, aviso, firma, guardar, comoBlob, nombreFichero, type Doc } from './doc-pdf';
import { CARPETA_ISO } from './carpeta-iso';

/**
 * Un documento construido, todavía sin destino: se puede descargar suelto o
 * meter en el ZIP de la carpeta. Los dos caminos producen el mismo PDF.
 */
interface Pieza { carpeta: string; fichero: string; doc: Doc }

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

async function construirHorario(): Promise<Pieza> {
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

  return { carpeta: '03_Desarrollo_formación/03.2_Plan de gestión del bootcamp', fichero: nombre(nombrePromo, 'Horario'), doc };
}

// ── 03.1 Selección de formadores: el equipo ─────────────────────────────────

async function construirEquipo(): Promise<Pieza> {
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

  return { carpeta: '03_Desarrollo_formación/03.1_Selección_formadores', fichero: nombre(nombrePromo, 'Equipo formativo'), doc };
}

// ── 01.2 Diseño formación: competencias ─────────────────────────────────────

async function construirCompetencias(): Promise<Pieza> {
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

  return { carpeta: '01 Diseño Inicial del proyecto formativo/01.2 Diseño formación', fichero: nombre(nombrePromo, 'Competencias del programa'), doc };
}

// ── 03.4 Cierre: métricas ───────────────────────────────────────────────────

async function construirMetricas(): Promise<Pieza> {
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

  return { carpeta: '03_Desarrollo_formación/03.4_Cierre_formación', fichero: nombre(nombrePromo, 'Metricas'), doc };
}

// ── 03.3 Ejecución: entregas por estudiante ─────────────────────────────────

async function construirEntregas(): Promise<Pieza> {
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

  return { carpeta: '03_Desarrollo_formación/03.3_Ejecución_formación', fichero: nombre(nombrePromo, 'Entregas por estudiante'), doc };
}

// ── 03.3 Ejecución: requisitos de superación ────────────────────────────────

async function construirRequisitos(): Promise<Pieza> {
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

  return { carpeta: '03_Desarrollo_formación/03.3_Ejecución_formación', fichero: nombre(nombrePromo, 'Requisitos de superacion'), doc };
}

// ── Descargas sueltas ───────────────────────────────────────────────────────

const suelto = (construir: () => Promise<Pieza>) => async () => {
  const p = await construir();
  guardar(p.doc, p.fichero);
};

export const descargarCompetencias = suelto(construirCompetencias);
export const descargarEquipo       = suelto(construirEquipo);
export const descargarHorario      = suelto(construirHorario);
export const descargarRequisitos   = suelto(construirRequisitos);
export const descargarEntregas     = suelto(construirEntregas);
export const descargarMetricas     = suelto(construirMetricas);

// ── La carpeta entera, en un ZIP ────────────────────────────────────────────

/**
 * El Excel de asistencia lo genera el BACKEND, así que aquí se descarga tal
 * cual y se mete en el ZIP sin tocarlo. Es un requisito explícito de 03.3
 * («registros de asistencia») y sería raro que la carpeta no lo llevara.
 */
async function excelAsistencia(id: string): Promise<Blob | null> {
  try {
    const res = await apiFetch(`/api/promotions/${id}/attendance/export`);
    return res.ok ? await res.blob() : null;
  } catch { return null; }
}

/** Lo que va en el LÉEME de una subcarpeta que la app no puede llenar. */
function leeme(carpeta: string, sub: string, contenido: string[], puesto: string[]): string {
  const lineas = [
    `${carpeta} › ${sub}`,
    ''.padEnd(Math.min(70, carpeta.length + sub.length + 3), '='),
    '',
  ];
  if (puesto.length) {
    lineas.push('LO QUE HA PUESTO BOOTCAMP MANAGER', ...puesto.map(p => `  · ${p}`), '');
  }
  if (contenido.length) {
    lineas.push('LO QUE ESPERA LA NORMA EN ESTA CARPETA', ...contenido.map(c => `  · ${c}`), '');
  }
  const faltan = contenido.length && !puesto.length;
  lineas.push(
    faltan
      ? 'Nada de esto sale de Bootcamp Manager: son documentos firmados,'
      : 'El resto no sale de Bootcamp Manager: son documentos firmados,',
    'formularios, cuestionarios o materiales que hay que subir a mano.',
    '',
    'Borra este fichero cuando la carpeta esté completa.',
  );
  return lineas.join('\n');
}

/**
 * Descarga la carpeta de proyecto entera como un .zip: el árbol completo de la
 * norma, con los documentos que la app sabe generar ya colocados y un LÉEME en
 * cada subcarpeta diciendo qué falta por subir a mano.
 *
 * Se monta el árbol ENTERO, también las carpetas que la app no puede llenar. El
 * objetivo no es «exportar seis PDF», es tener la carpeta empezada: una
 * estructura vacía pero correcta ahorra más trabajo que seis ficheros sueltos
 * que alguien tiene que colocar.
 *
 * @param avisar - se llama con cada paso, para que el botón cuente por dónde va
 */
export async function descargarCarpeta(avisar: (paso: string) => void = () => {}) {
  const JSZip = (window as any).JSZip;
  if (!JSZip) throw new Error('Falta JSZip. Espera a que la promoción termine de abrir e inténtalo otra vez.');

  const id = idPromocion();
  const promocion = await traer(`/api/promotions/${id}`);
  const nombrePromo = promocion.name || 'Promoción';

  const constructores: [string, () => Promise<Pieza>][] = [
    ['competencias del programa', construirCompetencias],
    ['equipo formativo', construirEquipo],
    ['horario', construirHorario],
    ['requisitos de superación', construirRequisitos],
    ['entregas por estudiante', construirEntregas],
    ['métricas', construirMetricas],
  ];

  // Qué se ha colocado en cada subcarpeta, para decirlo en su LÉEME.
  const puestoEn = new Map<string, string[]>();
  const anota = (carpeta: string, fichero: string) => {
    if (!puestoEn.has(carpeta)) puestoEn.set(carpeta, []);
    puestoEn.get(carpeta)!.push(fichero);
  };

  const zip = new JSZip();
  const raiz = zip.folder(nombreFichero(nombrePromo));

  for (const [etiqueta, construir] of constructores) {
    avisar(`Generando ${etiqueta}…`);
    // Un documento que falle no puede tumbar la carpeta entera: se anota en el
    // LÉEME de su subcarpeta y el resto sigue.
    try {
      const pieza = await construir();
      raiz.file(`${pieza.carpeta}/${nombreFichero(pieza.fichero)}`, comoBlob(pieza.doc));
      anota(pieza.carpeta, nombreFichero(pieza.fichero));
    } catch (e) {
      console.error(`[carpeta] ${etiqueta}:`, e);
      anota('03_Desarrollo_formación/03.3_Ejecución_formación', `(no se pudo generar: ${etiqueta})`);
    }
  }

  avisar('Descargando el Excel de asistencia…');
  const asistencia = await excelAsistencia(id);
  const ejecucion = '03_Desarrollo_formación/03.3_Ejecución_formación';
  if (asistencia) {
    const f = nombreFichero(`${nombrePromo} - Asistencia.xlsx`);
    raiz.file(`${ejecucion}/${f}`, asistencia);
    anota(ejecucion, f);
  }

  avisar('Montando el árbol de carpetas…');
  for (const carpeta of CARPETA_ISO) {
    if (!carpeta.subs.length) {
      raiz.file(`${carpeta.nombre}/LÉEME.txt`, leeme(carpeta.nombre, '', [], []));
      continue;
    }
    for (const sub of carpeta.subs) {
      const ruta = `${carpeta.nombre}/${sub.nombre}`;
      raiz.file(`${ruta}/LÉEME.txt`, leeme(carpeta.nombre, sub.nombre, sub.contenido, puestoEn.get(ruta) || []));
    }
  }

  avisar('Comprimiendo…');
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombreFichero(`${nombrePromo} - Carpeta de proyecto.zip`);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
