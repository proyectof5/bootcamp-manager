/**
 * stack.ts — el stack del bootcamp sale de las rúbricas de evaluación.
 *
 * Ojo con la fuente, porque hay dos parecidas y no dicen lo mismo:
 *
 *   competences[].selectedTools          → herramientas del PROGRAMA
 *   projectCompetences[].competenceTools → herramientas de cada EVALUACIÓN  ← esta
 *
 * Se mantienen por separado y divergen (en P8 Madrid, 72 frente a 75). El stack
 * son las segundas: lo que de verdad se evalúa en un proyecto con su rúbrica.
 *
 * Sin dependencias, para poder probarlo suelto.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface UsoHerramienta {
    herramienta: string;
    areas: string[];
    competencias: string[];
    proyectos: string[];
}

/**
 * Herramientas seleccionadas en las rúbricas de evaluación, sin repetir, con
 * la competencia y el proyecto en que se evalúa cada una.
 *
 * @param competencias  ExtendedInfo.competences — solo para resolver id → nombre y área.
 * @param rubricas      ExtendedInfo.projectCompetences — la selección de evaluación.
 */
export function usosDeHerramientas(competencias: any[], rubricas: any[]): UsoHerramienta[] {
    const porId = new Map<string, { name: string; area: string }>();
    for (const c of competencias || []) {
        if (c?.id == null) continue;
        porId.set(String(c.id), { name: c.name || String(c.id), area: c.area || 'Sin área' });
    }

    const usos = new Map<string, { areas: Set<string>; competencias: Set<string>; proyectos: Set<string> }>();

    for (const r of rubricas || []) {
        const proyecto = r?.projectName || 'Sin proyecto';
        for (const [idComp, herramientas] of Object.entries(r?.competenceTools || {})) {
            const comp = porId.get(String(idComp));
            for (const t of (herramientas as any[]) || []) {
                const nombre = String(t ?? '').trim();
                if (!nombre) continue;
                if (!usos.has(nombre)) usos.set(nombre, { areas: new Set(), competencias: new Set(), proyectos: new Set() });
                const u = usos.get(nombre)!;
                u.areas.add(comp?.area || 'Sin área');
                u.competencias.add(comp?.name || String(idComp));
                u.proyectos.add(proyecto);
            }
        }
    }

    return [...usos.entries()]
        .map(([herramienta, u]) => ({
            herramienta,
            areas: [...u.areas],
            competencias: [...u.competencias],
            proyectos: [...u.proyectos],
        }))
        .sort((a, b) => a.herramienta.localeCompare(b.herramienta, 'es'));
}

/** Áreas con herramientas evaluadas, en el orden en que aparecen las competencias. */
export function areasDe(competencias: any[], usos: UsoHerramienta[]): string[] {
    const orden = [...new Set((competencias || []).map(c => c?.area || 'Sin área'))];
    const conUso = orden.filter(a => usos.some(u => u.areas.includes(a)));
    // Un área que solo aparece en las rúbricas (competencia borrada del programa)
    // no puede quedarse fuera del documento.
    const sueltas = [...new Set(usos.flatMap(u => u.areas))].filter(a => !conUso.includes(a));
    return [...conUso, ...sueltas];
}

/** Rúbricas que de verdad tienen alguna herramienta marcada. */
export function rubricasConHerramientas(rubricas: any[]): number {
    return (rubricas || []).filter(r =>
        Object.values(r?.competenceTools || {}).some(t => Array.isArray(t) && t.length)
    ).length;
}
