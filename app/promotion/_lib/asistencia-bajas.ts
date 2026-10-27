/**
 * asistencia-bajas.ts — cómo tratar a quien está de baja en los informes de
 * asistencia.
 *
 * Dos reglas, separadas aquí para poder probarlas sin navegador:
 *
 *   1. Las bajas van en su propio bloque, al final, no mezcladas con el resto.
 *      Es como ya lo hace la tabla de asistencia en pantalla, que las agrupa
 *      bajo "Bajas oficiales".
 *   2. Su asistencia llega hasta el día de la baja, incluido. Los días
 *      posteriores no son ausencias suyas: ya no estaban. Pintarlos como
 *      ausencia falsearía su porcentaje y su hoja de vida en el bootcamp.
 */

export type Estudiante = {
    id?: string;
    _id?: string;
    name?: string;
    lastname?: string;
    isWithdrawn?: boolean;
    withdrawal?: { date?: string } | null;
};

/** La API devuelve la fecha unas veces con hora y otras sin ella. */
function soloDia(fecha?: string | null) {
    const d = String(fecha || '').split('T')[0];
    return d || null;
}

/** ¿Está de baja? Las dos señales valen y no siempre viajan juntas. */
export function esBaja(st: Estudiante) {
    return !!(st && (st.isWithdrawn || (st.withdrawal && st.withdrawal.date)));
}

/** El día en que se dio de baja, o null si consta la baja pero no la fecha. */
export function fechaDeBaja(st: Estudiante) {
    return soloDia(st?.withdrawal?.date);
}

/**
 * ¿Ese día ya estaba fuera?
 *
 * El día de la baja todavía cuenta: esa jornada estuvo. Solo los posteriores
 * quedan fuera. Si consta la baja pero no la fecha no se corta nada: inventar
 * un día sería peor que no cortar.
 */
export function yaEstabaDeBaja(st: Estudiante, dia: string) {
    const baja = fechaDeBaja(st);
    if (!baja) return false;
    return soloDia(dia)! > baja;
}

export type FilaOrdenada = {
    estudiante: Estudiante;
    deBaja: boolean;
    /** true en la primera baja: es donde va el separador "Bajas". */
    abreBajas: boolean;
};

/**
 * Ordena para el informe: primero las activas, después las bajas, cada grupo
 * por nombre de pila —el mismo criterio que renderAttendanceTable, para que
 * informe y pantalla se lean igual.
 */
export function ordenarConBajas(estudiantes: Estudiante[]) {
    const porNombre = (a: Estudiante, b: Estudiante) =>
        String(a.name || '').localeCompare(String(b.name || ''), 'es', { sensitivity: 'base' });

    const activas = (estudiantes || []).filter((e) => !esBaja(e)).sort(porNombre);
    const bajas = (estudiantes || []).filter((e) => esBaja(e)).sort(porNombre);

    const filas: FilaOrdenada[] = [
        ...activas.map((estudiante) => ({ estudiante, deBaja: false, abreBajas: false })),
        ...bajas.map((estudiante, i) => ({ estudiante, deBaja: true, abreBajas: i === 0 })),
    ];

    return { filas, hayBajas: bajas.length > 0, totalActivas: activas.length };
}
