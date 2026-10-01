'use client';

/**
 * ImportarRoadmap.tsx — crear el roadmap de una promoción desde un fichero JSON.
 *
 * El objetivo no es solo aceptar el fichero: es que no haya que adivinar cómo
 * se escribe. Por eso la pantalla enseña la estructura antes de pedir nada,
 * ofrece la plantilla descargable, y cuando algo falla dice en qué módulo y en
 * qué campo, no «JSON inválido».
 *
 * Validar y guardar son dos pasos distintos a propósito: primero se ve qué
 * entraría y qué se pierde, y solo entonces se confirma.
 */

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ErrorImport { donde: string; problema: string }
interface Resumen { modulos: number; cursos: number; proyectos: number; desde: string; hasta: string }

type Modo = 'reemplazar' | 'anadir';

/** 2026-04-27 → 27/04/2026. En el resumen se lee, no se copia. */
const fechaCorta = (v: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split('-').reverse().join('/') : v;

const EJEMPLO = `{
  "modules": [
    {
      "name": "Fundamentos de programación",
      "startDate": "2026-04-27",
      "endDate": "2026-06-05",
      "courses": [
        {
          "name": "Python Essentials",
          "url": "https://www.netacad.com/courses/python-essentials-1",
          "startDate": "2026-04-27",
          "endDate": "2026-05-15"
        }
      ],
      "projects": [
        {
          "name": "App con Python",
          "url": "https://github.com/…",
          "startDate": "2026-05-18",
          "endDate": "2026-06-05"
        }
      ]
    }
  ]
}`;

export function ImportarRoadmap({
    promotionId, abierto, onCerrar, onImportado,
}: {
    promotionId: string;
    abierto: boolean;
    onCerrar: () => void;
    onImportado: () => void;
}) {
    const [fichero, setFichero] = useState<string>('');
    const [datos, setDatos] = useState<unknown>(null);
    const [errores, setErrores] = useState<ErrorImport[]>([]);
    const [resumen, setResumen] = useState<Resumen | null>(null);
    const [actual, setActual] = useState<number | null>(null);
    const [modo, setModo] = useState<Modo>('reemplazar');
    const [ocupado, setOcupado] = useState(false);
    const [hecho, setHecho] = useState<string>('');

    const limpiar = () => {
        setFichero(''); setDatos(null); setErrores([]); setResumen(null); setActual(null); setHecho('');
    };

    const cerrar = () => { limpiar(); onCerrar(); };

    async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        e.target.value = '';                      // permite reelegir el mismo fichero
        if (!f) return;
        limpiar();
        setFichero(f.name);

        let json: unknown;
        try {
            json = JSON.parse(await f.text());
        } catch (err) {
            // Un JSON roto no llega ni al servidor: el navegador ya sabe dónde está.
            setErrores([{ donde: 'el fichero', problema: `no es JSON válido — ${(err as Error).message}` }]);
            return;
        }
        setDatos(json);

        setOcupado(true);
        try {
            const r = await apiFetch(`/api/promotions/${promotionId}/roadmap/validar`, {
                method: 'POST', body: JSON.stringify({ roadmap: json }),
            });
            const d = await r.json().catch(() => ({}));
            if (r.ok) { setResumen(d.resumen); setActual(d.actual?.modulos ?? null); }
            else setErrores(d.errores || [{ donde: 'el fichero', problema: d.error || 'no se pudo comprobar' }]);
        } catch {
            setErrores([{ donde: 'la conexión', problema: 'no se pudo hablar con el servidor' }]);
        } finally {
            setOcupado(false);
        }
    }

    async function importar() {
        setOcupado(true);
        try {
            const r = await apiFetch(`/api/promotions/${promotionId}/roadmap/importar`, {
                method: 'POST', body: JSON.stringify({ roadmap: datos, modo }),
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) {
                setErrores(d.errores || [{ donde: 'el fichero', problema: d.error || 'no se pudo importar' }]);
                return;
            }
            setHecho(`Roadmap importado: ${d.modulos} módulo(s) en la promoción.`);
            onImportado();
        } catch {
            setErrores([{ donde: 'la conexión', problema: 'no se pudo hablar con el servidor' }]);
        } finally {
            setOcupado(false);
        }
    }

    async function descargarPlantilla() {
        // El endpoint pide token, así que no vale un <a href>: se trae y se guarda.
        const r = await apiFetch('/api/roadmap/plantilla');
        if (!r.ok) return;
        const url = URL.createObjectURL(await r.blob());
        const a = document.createElement('a');
        a.href = url; a.download = 'plantilla-roadmap.json';
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
    }

    return (
        <Dialog open={abierto} onOpenChange={(o) => { if (!o) cerrar(); }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Importar roadmap desde JSON</DialogTitle>
                    <DialogDescription>
                        Crea los módulos de esta promoción a partir de un fichero. Antes de guardar
                        nada se comprueba el fichero entero y se dice qué entraría.
                    </DialogDescription>
                </DialogHeader>

                <section className="imp-estructura">
                    <h4>Cómo tiene que ser el fichero</h4>
                    <ul>
                        <li>Un objeto con una lista <code>modules</code>, con al menos un módulo.</li>
                        <li>Cada módulo necesita <code>name</code>, <code>startDate</code> y <code>endDate</code>.</li>
                        <li>Las fechas van en formato <code>AAAA-MM-DD</code>, por ejemplo <code>2026-04-27</code>.</li>
                        <li><code>courses</code> y <code>projects</code> son opcionales, y llevan los mismos campos.</li>
                        <li><code>url</code> es opcional; si se pone, completa y con <code>https://</code>.</li>
                        <li>La fecha de fin no puede ser anterior a la de inicio.</li>
                    </ul>
                    <details>
                        <summary>Ver un ejemplo completo</summary>
                        <pre>{EJEMPLO}</pre>
                    </details>
                    <Button type="button" variant="outline" size="sm" onClick={descargarPlantilla}>
                        <i className="bi bi-download me-2" aria-hidden="true" />Descargar plantilla
                    </Button>
                </section>

                <div className="imp-fichero">
                    <label htmlFor="imp-roadmap-file" className="form-label fw-bold">Fichero JSON</label>
                    <input id="imp-roadmap-file" type="file" accept="application/json,.json"
                        className="form-control" onChange={elegir} disabled={ocupado} />
                    {fichero && <p className="imp-nombre">{fichero}</p>}
                </div>

                {errores.length > 0 && (
                    <div className="imp-errores" role="alert">
                        <h4>{errores.length === 1 ? 'Hay un problema' : `Hay ${errores.length} problemas`}</h4>
                        <ul>
                            {errores.map((e, i) => (
                                <li key={i}><strong>{e.donde}:</strong> {e.problema}</li>
                            ))}
                        </ul>
                        <p>Corrige el fichero y vuelve a elegirlo. No se ha guardado nada.</p>
                    </div>
                )}

                {resumen && !hecho && (
                    <div className="imp-resumen">
                        <h4>El fichero está bien</h4>
                        <p>
                            Entrarían <strong>{resumen.modulos}</strong> módulo(s),{' '}
                            <strong>{resumen.cursos}</strong> curso(s) y{' '}
                            <strong>{resumen.proyectos}</strong> proyecto(s), del {fechaCorta(resumen.desde)} al {fechaCorta(resumen.hasta)}.
                        </p>
                        {actual != null && actual > 0 && (
                            <fieldset className="imp-modo">
                                <legend>Esta promoción ya tiene {actual} módulo(s). ¿Qué hago con ellos?</legend>
                                <label>
                                    <input type="radio" name="imp-modo" checked={modo === 'reemplazar'}
                                        onChange={() => setModo('reemplazar')} />
                                    Reemplazarlos por los del fichero
                                </label>
                                <label>
                                    <input type="radio" name="imp-modo" checked={modo === 'anadir'}
                                        onChange={() => setModo('anadir')} />
                                    Conservarlos y añadir los nuevos al final
                                </label>
                            </fieldset>
                        )}
                    </div>
                )}

                {hecho && <div className="imp-hecho" role="status">{hecho}</div>}

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={cerrar}>
                        {hecho ? 'Cerrar' : 'Cancelar'}
                    </Button>
                    {!hecho && (
                        <Button type="button" onClick={importar} disabled={!resumen || ocupado}>
                            {ocupado ? 'Comprobando…' : modo === 'anadir' ? 'Añadir al roadmap' : 'Importar y reemplazar'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/** Exporta el roadmap actual como JSON, que es la mejor plantilla posible. */
export async function exportarRoadmapJson(promotionId: string, nombrePromo: string) {
    const r = await apiFetch(`/api/promotions/${promotionId}`);
    if (!r.ok) return;
    const p = await r.json();
    // Solo lo que el importador acepta: así un fichero exportado se puede volver a importar.
    const roadmap = {
        _origen: `${nombrePromo} · exportado el ${new Date().toLocaleDateString('es-ES')}`,
        modules: (p.modules || []).map((m: Record<string, unknown>) => ({
            name: m.name, startDate: m.startDate, endDate: m.endDate,
            courses: ((m.courses as Record<string, unknown>[]) || []).map((c) => ({
                name: c.name, url: c.url || '', startDate: c.startDate, endDate: c.endDate,
            })),
            projects: ((m.projects as Record<string, unknown>[]) || []).map((x) => ({
                name: x.name, url: x.url || '', startDate: x.startDate, endDate: x.endDate,
                competenceIds: x.competenceIds || [],
            })),
        })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(roadmap, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombrePromo.replace(/\s+/g, '-')}-roadmap.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
}
