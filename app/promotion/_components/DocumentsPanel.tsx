'use client';

/**
 * DocumentsPanel.tsx — Ajustes › Documentos.
 *
 * Los documentos que la app puede aportar a la carpeta de proyecto de la norma
 * (docs/tasks/documentos-carpeta-iso.md), agrupados por la carpeta a la que van.
 *
 * Están todos juntos a propósito, en vez de un botón suelto en cada sección: lo
 * que se hace aquí no es "exportar el horario", es montar una carpeta que va a
 * revisar una auditoría, y para eso hace falta ver de un vistazo qué hay y qué
 * falta. Cuando exista el ZIP que la empaqueta entera, su botón va aquí.
 *
 * Se dice también lo que la app NO puede aportar. Una carpeta a medias sin avisar
 * es peor que una lista honesta de lo que hay que subir a mano.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Loader2, FolderDown } from 'lucide-react';
import * as docs from '../_lib/documentos';

/** Mismo patrón que el resto de paneles: el contenedor lo pinta body.ts y puede
    llegar después que React, así que se espera con un sondeo corto. */
function usePortalNode(id: string): HTMLElement | null {
  const [node, setNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    let cancelado = false;
    let t: ReturnType<typeof setTimeout>;
    const mirar = () => {
      if (cancelado) return;
      const n = document.getElementById(id);
      setNode((actual) => (n !== actual ? n : actual));
      t = setTimeout(mirar, 300);
    };
    mirar();
    return () => { cancelado = true; clearTimeout(t); };
  }, [id]);
  return node;
}

interface Item { carpeta: string; titulo: string; nota: string; fn: () => Promise<void>; }

/** Marca de "se está montando el ZIP", para distinguirlo de un documento suelto. */
const TODO = '\u0000toda-la-carpeta';

const DOCUMENTOS: Item[] = [
  { carpeta: '01.2 Diseño formación', titulo: 'Competencias del programa',
    nota: 'Competencias por área, con su descripción, y el stack del bootcamp.', fn: docs.descargarCompetencias },
  { carpeta: '03.1 Selección formadores', titulo: 'Equipo formativo',
    nota: 'Quién forma parte del equipo, con su rol y los módulos que lleva.', fn: docs.descargarEquipo },
  { carpeta: '03.2 Plan de gestión', titulo: 'Horario de la formación',
    nota: 'Tramos horarios, días lectivos, festivos y periodos sin actividad.', fn: docs.descargarHorario },
  { carpeta: '03.3 Ejecución', titulo: 'Requisitos de superación',
    nota: 'Criterios del diploma, su aprobación y cómo se aplicaron a cada persona.', fn: docs.descargarRequisitos },
  { carpeta: '03.3 Ejecución', titulo: 'Entregas por estudiante',
    nota: 'Proyectos entregados por cada persona, con repositorio y fecha.', fn: docs.descargarEntregas },
  { carpeta: '03.4 Cierre', titulo: 'Métricas de la promoción',
    nota: 'Matrícula, abandono, género y empleabilidad.', fn: docs.descargarMetricas },
];

/** Lo que nace fuera de la app y hay que subir a mano. Se dice, no se esconde. */
const FUERA = [
  '02.2 a 02.6 — difusión, jornada de selección, expedientes e inscripciones',
  '03.3 — diplomas entregados y documentos del acto de clausura',
  '05 completa — cuestionarios de satisfacción y sus informes',
  '06 — autorizaciones de cambio y registro de incidencias',
];

export function DocumentsPanelHost() {
  const host = usePortalNode('documentos-tab');
  if (!host) return null;
  return createPortal(<DocumentsPanel />, host);
}

function DocumentsPanel() {
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paso, setPaso] = useState('');

  const descargarTodo = async () => {
    setCargando(TODO);
    setError(null);
    setPaso('');
    try {
      await docs.descargarCarpeta(setPaso);
    } catch (e) {
      setError(`No se pudo montar la carpeta: ${(e as Error).message}`);
    } finally {
      setCargando(null);
      setPaso('');
    }
  };

  const descargar = async (item: Item) => {
    setCargando(item.titulo);
    setError(null);
    try {
      await item.fn();
    } catch (e) {
      setError(`${item.titulo}: ${(e as Error).message}`);
    } finally {
      setCargando(null);
    }
  };

  const carpetas = [...new Set(DOCUMENTOS.map(d => d.carpeta))];

  return (
    <div className="docs my-4">
      <p className="docs-intro">
        Documentos que esta app puede aportar a la carpeta de proyecto, agrupados por
        la subcarpeta a la que van. Se descargan en PDF, listos para subir a Drive.
      </p>

      {error && <p className="docs-error" role="alert">{error}</p>}

      {/* La carpeta entera. Va arriba porque es lo que casi siempre se quiere:
          los botones de abajo son para cuando hace falta un documento suelto. */}
      <section className="docs-todo">
        <div className="docs-item-text">
          <span className="docs-item-title">Toda la carpeta de proyecto</span>
          <span className="docs-item-note">
            Un .zip con el árbol completo de la norma, los documentos de abajo ya colocados
            en su subcarpeta, el Excel de asistencia, y un LÉEME en cada carpeta diciendo
            qué falta por subir a mano.
          </span>
          {cargando === TODO && paso && <span className="docs-paso" role="status">{paso}</span>}
        </div>
        <button type="button" className="btn btn-primary btn-sm"
          disabled={cargando !== null}
          onClick={descargarTodo}>
          {cargando === TODO
            ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Montando…</>
            : <><FolderDown className="h-4 w-4" aria-hidden="true" />Descargar la carpeta</>}
        </button>
      </section>

      {carpetas.map(carpeta => (
        <section className="docs-group" key={carpeta}>
          <h3 className="docs-group-title">{carpeta}</h3>
          <ul className="docs-list">
            {DOCUMENTOS.filter(d => d.carpeta === carpeta).map(item => (
              <li className="docs-item" key={item.titulo}>
                <div className="docs-item-text">
                  <span className="docs-item-title">{item.titulo}</span>
                  <span className="docs-item-note">{item.nota}</span>
                </div>
                <button type="button" className="btn btn-outline-secondary btn-sm"
                  disabled={cargando !== null}
                  onClick={() => descargar(item)}>
                  {cargando === item.titulo
                    ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Generando…</>
                    : <><Download className="h-4 w-4" aria-hidden="true" />Descargar</>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="docs-group">
        <h3 className="docs-group-title">Esto no sale de aquí</h3>
        <p className="docs-intro">
          Nacen fuera de la app —firmas, formularios, cuestionarios— y hay que subirlos a mano:
        </p>
        <ul className="docs-outside">
          {FUERA.map(t => <li key={t}>{t}</li>)}
        </ul>
      </section>
    </div>
  );
}
