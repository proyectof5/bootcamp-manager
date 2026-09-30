/**
 * privacidad.ts — los datos del aviso de privacidad (art. 13 RGPD).
 *
 * ⚠️  ESTE FICHERO LO RELLENA FACTORÍA F5, NO SE DEDUCE DEL CÓDIGO.
 *
 * Todo lo que ponga PENDIENTE son datos que solo tiene la organización: razón
 * social, CIF, domicilio, delegado de protección de datos, base jurídica de
 * cada finalidad y plazos de conservación. Mientras quede alguno, la página
 * sale marcada como borrador, a propósito: un aviso con huecos inventados es
 * peor que no tenerlo.
 *
 * Las categorías de datos SÍ salen del código y están comprobadas contra el
 * modelo (backend/models/sql/Student.js). Si se añade un campo personal nuevo,
 * hay que añadirlo aquí.
 */

export const PENDIENTE = 'PENDIENTE' as const;

type Rellenable = string | typeof PENDIENTE;

export interface Responsable {
    razonSocial: Rellenable;
    cif: Rellenable;
    domicilio: Rellenable;
    correo: Rellenable;
    dpd: Rellenable;          // delegado de protección de datos; '' si no procede
}

export const RESPONSABLE: Responsable = {
    razonSocial: PENDIENTE,   // p. ej. "Factoría F5, S.L." — el nombre del registro
    cif: PENDIENTE,
    domicilio: PENDIENTE,
    correo: PENDIENTE,        // buzón donde se atienden los derechos
    dpd: PENDIENTE,           // correo del DPD, o '' si no hay obligación de tenerlo
};

export interface Finalidad {
    titulo: string;
    descripcion: string;
    baseJuridica: Rellenable;
    conservacion: Rellenable;
}

/**
 * Las descripciones dicen lo que la aplicación hace de verdad. La base jurídica
 * y el plazo los decide la organización: son las dos casillas que no se pueden
 * deducir mirando el código.
 */
export const FINALIDADES: Finalidad[] = [
    {
        titulo: 'Gestionar tu participación en el bootcamp',
        descripcion: 'Matrícula, seguimiento del itinerario formativo, asistencia y comunicación contigo durante la formación.',
        baseJuridica: PENDIENTE,   // p. ej. ejecución de un contrato (art. 6.1.b)
        conservacion: PENDIENTE,
    },
    {
        titulo: 'Evaluarte y acreditar que has superado la formación',
        descripcion: 'Registro de las evaluaciones por competencias, de las entregas de proyectos y de la decisión de superación, con el motivo cuando se aparta de los criterios.',
        baseJuridica: PENDIENTE,
        conservacion: PENDIENTE,
    },
    {
        titulo: 'Justificar la subvención ante quien la financia',
        descripcion: 'Elaboración de la documentación que exige la entidad financiadora: listados, asistencia, actas y memoria de la formación.',
        baseJuridica: PENDIENTE,   // p. ej. obligación legal (art. 6.1.c)
        conservacion: PENDIENTE,   // suele mandar el plazo de la subvención
    },
];

/** Lo que la aplicación guarda. Comprobado contra el modelo de datos. */
export const CATEGORIAS: { grupo: string; campos: string }[] = [
    { grupo: 'Identificación', campos: 'Nombre y apellidos, documento de identidad, fecha de nacimiento o edad, nacionalidad, género.' },
    { grupo: 'Contacto', campos: 'Correo electrónico, teléfono y domicilio.' },
    { grupo: 'Situación personal y académica', campos: 'Situación administrativa, nivel de estudios, nivel de inglés, profesión y localidad.' },
    { grupo: 'Seguimiento formativo', campos: 'Asistencia, evaluaciones por competencias, entregas de proyectos, decisión de superación y notas de seguimiento tutorial.' },
    { grupo: 'Uso de la plataforma', campos: 'Fecha del último acceso al portal de la promoción.' },
    { grupo: 'Recursos entregados', campos: 'Si se te ha prestado un equipo informático, y tu usuario de la plataforma de repositorios si lo aportas.' },
];

/**
 * A quién se le comunican. Los tres primeros son los que se ven en el código;
 * los demás dependen de qué integraciones tenga activadas cada promoción.
 */
export const DESTINATARIOS: string[] = [
    'El equipo docente y de coordinación de tu promoción.',
    'La entidad que financia la formación, cuando la justificación lo exige.',
    'Los proveedores que dan servicio a la plataforma: alojamiento del servidor y envío de correo. Actúan como encargados del tratamiento y solo tratan los datos siguiendo nuestras instrucciones.',
];

/** Transferencias fuera del Espacio Económico Europeo, si las hay. */
export const TRANSFERENCIAS: Rellenable = PENDIENTE;

/** Fecha de la última revisión del aviso. */
export const ACTUALIZADO: Rellenable = PENDIENTE;

/** ¿Queda algo por rellenar? La página lo usa para avisar de que es un borrador. */
const NOMBRES: Record<string, string> = {
    razonSocial: 'quién es el responsable',
    cif: 'su CIF',
    domicilio: 'su domicilio',
    correo: 'el correo de contacto',
    dpd: 'el delegado de protección de datos',
};

/** Qué falta, dicho como lo leería alguien de fuera, no con los nombres del código. */
export function faltanDatos(): string[] {
    const faltan: string[] = [];
    for (const [k, v] of Object.entries(RESPONSABLE)) {
        if (v === PENDIENTE) faltan.push(NOMBRES[k] || k);
    }
    FINALIDADES.forEach((f) => {
        if (f.baseJuridica === PENDIENTE) faltan.push(`la base jurídica de «${f.titulo.toLowerCase()}»`);
        if (f.conservacion === PENDIENTE) faltan.push(`cuánto se conservan los datos de «${f.titulo.toLowerCase()}»`);
    });
    if (TRANSFERENCIAS === PENDIENTE) faltan.push('si hay transferencias fuera de la Unión Europea');
    if (ACTUALIZADO === PENDIENTE) faltan.push('la fecha de actualización');
    return faltan;
}
