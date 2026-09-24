'use client';

/**
 * CompletionPanel.tsx — Estudiantes › Superación.
 *
 * La pantalla que faltaba para el documento de requisitos de superación
 * (docs/tasks/documentos-carpeta-iso.md). Tres cosas, en este orden, porque es
 * el orden en que la auditoría las pide:
 *
 *   1. Los REQUISITOS: qué hay que cumplir para el diploma.
 *   2. La APROBACIÓN de esos requisitos por Escuela u Operaciones.
 *   3. La DECISIÓN sobre cada persona, contrastada con ellos.
 *
 * Dos reglas que no son cosméticas:
 *  - Sin aprobación no se decide. El backend lo rechaza y aquí se desactiva.
 *  - Cambiar un requisito ya aprobado ANULA la aprobación: lo que se aprobó no
 *    es «unos criterios» en abstracto, son estos. Las decisiones ya tomadas no
 *    se tocan, porque cada una guarda su propia instantánea.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '@/lib/api';
import { Check, X, ShieldCheck, AlertTriangle } from 'lucide-react';

interface Criterios {
  minAttendance: number; requiredLevel: number; competenceIds: (number | string)[]; extra: string;
  approvedBy: string; approvedByRole: string; approvedAt: string;
}
interface Alumno {
  id: string; nombre: string; baja: boolean;
  evaluacion: { cumple: boolean; detalle: any[]; asistencia: { valor: number | null; minimo: number; cumple: boolean } };
  decision: any | null;
}
interface Datos { criterios: Criterios; aprobados: boolean; competencias: { id: string; name: string }[]; estudiantes: Alumno[] }

const hoy = () => new Date().toISOString().slice(0, 10);
const promotionId = () => new URLSearchParams(window.location.search).get('id') || '';

function usePortalNode(id: string): HTMLElement | null {
  const [node, setNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    let cancelado = false;
    let t: ReturnType<typeof setTimeout>;
    const mirar = () => {
      if (cancelado) return;
      const n = document.getElementById(id);
      setNode((a) => (n !== a ? n : a));
      t = setTimeout(mirar, 300);
    };
    mirar();
    return () => { cancelado = true; clearTimeout(t); };
  }, [id]);
  return node;
}

export function CompletionPanelHost() {
  const host = usePortalNode('superacion-tab');
  if (!host) return null;
  return createPortal(<CompletionPanel />, host);
}

function CompletionPanel() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [borrador, setBorrador] = useState<Criterios | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [decidiendo, setDecidiendo] = useState<{ alumno: Alumno; passed: boolean } | null>(null);
  const [motivo, setMotivo] = useState('');

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch(`/api/promotions/${promotionId()}/completion`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Error ${res.status}`);
      const d: Datos = await res.json();
      setDatos(d);
      setBorrador({ ...d.criterios });
    } catch (e) { setError((e as Error).message); }
  }, []);

  useEffect(() => {
    cargar();
    window.addEventListener('promotion-superacion-open', cargar);
    return () => window.removeEventListener('promotion-superacion-open', cargar);
  }, [cargar]);

  if (error) return <p className="sup-error" role="alert">{error} <button type="button" className="btn btn-outline-secondary btn-sm" onClick={cargar}>Reintentar</button></p>;
  if (!datos || !borrador) return <p className="sup-cargando">Cargando…</p>;

  const cambiados =
    borrador.minAttendance !== datos.criterios.minAttendance ||
    borrador.requiredLevel !== datos.criterios.requiredLevel ||
    borrador.extra !== datos.criterios.extra ||
    borrador.competenceIds.join(',') !== datos.criterios.competenceIds.join(',');

  const set = <K extends keyof Criterios>(k: K, v: Criterios[K]) => setBorrador({ ...borrador, [k]: v });

  const guardarCriterios = async (aprobacion?: { approvedBy: string; approvedByRole: string }) => {
    setOcupado(true); setError(null); setAviso(null);
    // Cambiar un requisito anula la aprobación anterior: lo aprobado eran ESTOS.
    const passingCriteria: Criterios = aprobacion
      ? { ...borrador, ...aprobacion, approvedAt: hoy() }
      : { ...borrador, ...(cambiados ? { approvedBy: '', approvedByRole: '', approvedAt: '' } : {}) };
    try {
      const res = await apiFetch(`/api/promotions/${promotionId()}/extended-info`, {
        method: 'POST', body: JSON.stringify({ passingCriteria }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Error ${res.status}`);
      setAviso(aprobacion ? 'Requisitos aprobados.' : (cambiados ? 'Requisitos guardados. Al cambiarlos se ha anulado la aprobación anterior: hay que volver a aprobarlos.' : 'Requisitos guardados.'));
      await cargar();
    } catch (e) { setError((e as Error).message); } finally { setOcupado(false); }
  };

  const decidir = async (alumno: Alumno, passed: boolean, note: string) => {
    setOcupado(true); setError(null); setAviso(null);
    try {
      const res = await apiFetch(`/api/promotions/${promotionId()}/completion/students/${alumno.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          passed, note,
          decidedBy: datos.criterios.approvedBy, decidedByRole: datos.criterios.approvedByRole, decidedAt: hoy(),
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Error ${res.status}`);
      setAviso(`${alumno.nombre}: ${passed ? 'apto' : 'no apto'}, registrado.`);
      setDecidiendo(null); setMotivo('');
      await cargar();
    } catch (e) { setError((e as Error).message); } finally { setOcupado(false); }
  };

  const pedirDecision = (alumno: Alumno, passed: boolean) => {
    if (passed !== alumno.evaluacion.cumple) { setDecidiendo({ alumno, passed }); setMotivo(''); }
    else decidir(alumno, passed, '');
  };

  return (
    <div className="sup my-4">
      {aviso && <p className="sup-aviso" role="status">{aviso}</p>}

      {/* ── 1. Requisitos ─────────────────────────────────────────────── */}
      <section className="sup-block">
        <h2>Requisitos de superación</h2>
        <p className="sup-note">Qué tiene que cumplir una persona para obtener el diploma.</p>

        <div className="sup-fields">
          <div className="sup-field">
            <label htmlFor="sup-asist">Asistencia mínima</label>
            <div className="sup-inline">
              <input id="sup-asist" type="number" min={0} max={100} className="form-control form-control-sm"
                value={borrador.minAttendance}
                onChange={(e) => set('minAttendance', Number(e.target.value))} />
              <span className="sup-unit">%</span>
            </div>
          </div>
          <div className="sup-field">
            <label htmlFor="sup-nivel">Nivel mínimo por competencia</label>
            <select id="sup-nivel" className="form-control form-control-sm"
              value={borrador.requiredLevel}
              onChange={(e) => set('requiredLevel', Number(e.target.value))}>
              <option value={1}>Nivel 1</option>
              <option value={2}>Nivel 2</option>
              <option value={3}>Nivel 3</option>
            </select>
          </div>
        </div>

        <fieldset className="sup-comps">
          <legend>Competencias exigidas</legend>
          <label className="sup-check">
            <input type="checkbox" checked={borrador.competenceIds.length === 0}
              onChange={(e) => set('competenceIds', e.target.checked ? [] : datos.competencias.map(c => c.id))} />
            Todas ({datos.competencias.length})
          </label>
          {borrador.competenceIds.length > 0 && (
            <ul className="sup-comp-list">
              {datos.competencias.map(c => (
                <li key={c.id}>
                  <label className="sup-check">
                    <input type="checkbox" checked={borrador.competenceIds.map(String).includes(String(c.id))}
                      onChange={(e) => set('competenceIds', e.target.checked
                        ? [...borrador.competenceIds, c.id]
                        : borrador.competenceIds.filter(x => String(x) !== String(c.id)))} />
                    {c.name}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <div className="sup-field">
          <label htmlFor="sup-extra">Requisitos adicionales</label>
          <textarea id="sup-extra" rows={2} className="form-control form-control-sm"
            placeholder="Entrega del proyecto final, defensa ante jurado…"
            value={borrador.extra} onChange={(e) => set('extra', e.target.value)} />
        </div>

        <button type="button" className="btn btn-outline-secondary btn-sm"
          disabled={ocupado || !cambiados} onClick={() => guardarCriterios()}>
          <Check className="h-4 w-4" aria-hidden="true" />Guardar requisitos
        </button>
      </section>

      {/* ── 2. Aprobación ─────────────────────────────────────────────── */}
      <section className="sup-block">
        <h2>Aprobación</h2>
        {datos.aprobados && !cambiados ? (
          <p className="sup-ok">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Aprobados por <b>{datos.criterios.approvedBy}</b> ({datos.criterios.approvedByRole}) el{' '}
            {new Date(`${datos.criterios.approvedAt}T00:00:00`).toLocaleDateString('es-ES')}.
          </p>
        ) : (
          <>
            <p className="sup-warn">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {cambiados
                ? 'Has cambiado los requisitos: guárdalos y vuelve a aprobarlos antes de decidir sobre nadie.'
                : 'Sin aprobar. Hasta que alguien de Escuela u Operaciones los apruebe no se puede decidir sobre el diploma.'}
            </p>
            <Aprobacion ocupado={ocupado || cambiados} onAprobar={(n, c) => guardarCriterios({ approvedBy: n, approvedByRole: c })} />
          </>
        )}
      </section>

      {/* ── 3. Decisión persona a persona ─────────────────────────────── */}
      <section className="sup-block">
        <h2>Acceso al diploma</h2>
        <p className="sup-note">
          {datos.aprobados
            ? 'Cada decisión guarda los criterios y el detalle tal como están hoy, así que cambiarlos después no reescribe lo ya decidido.'
            : 'Se puede consultar, pero no decidir: faltan los requisitos aprobados.'}
        </p>

        <div className="sup-table-wrap">
          <table className="sup-table">
            <thead>
              <tr>
                <th>Estudiante</th><th>Competencias</th><th>Asistencia</th><th>Según criterios</th><th>Decisión</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {datos.estudiantes.map(a => {
                const ok = a.evaluacion.detalle.filter(d => d.cumple).length;
                const d = a.decision;
                return (
                  <tr key={a.id} className={a.baja ? 'is-baja' : ''}>
                    <td>{a.nombre}{a.baja && <span className="sup-tag">baja</span>}</td>
                    <td className="sup-num">{ok} de {a.evaluacion.detalle.length}</td>
                    <td className="sup-num">{a.evaluacion.asistencia.valor === null ? 'sin datos' : `${a.evaluacion.asistencia.valor} %`}</td>
                    <td>{a.evaluacion.cumple ? <span className="sup-pill is-ok">Cumple</span> : <span className="sup-pill is-no">No cumple</span>}</td>
                    <td>
                      {d
                        ? <span className={`sup-pill ${d.passed ? 'is-ok' : 'is-no'}`}>{d.passed ? 'APTO' : 'NO APTO'}{d.discrepa && ' *'}</span>
                        : <span className="sup-pill">sin decidir</span>}
                    </td>
                    <td>
                      <div className="sup-actions">
                        <button type="button" className="btn btn-outline-secondary btn-sm"
                          disabled={ocupado || !datos.aprobados} onClick={() => pedirDecision(a, true)}>
                          <Check className="h-4 w-4" aria-hidden="true" />Apto
                        </button>
                        <button type="button" className="btn btn-outline-secondary btn-sm"
                          disabled={ocupado || !datos.aprobados} onClick={() => pedirDecision(a, false)}>
                          <X className="h-4 w-4" aria-hidden="true" />No apto
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="sup-note">* La decisión no coincide con el resultado de los criterios; el motivo queda registrado.</p>
      </section>

      {decidiendo && (
        <div className="sup-motivo" role="dialog" aria-label="Motivo de la decisión">
          <p>
            <b>{decidiendo.alumno.nombre}</b> {decidiendo.passed ? 'no cumple los criterios y vas a darle el diploma' : 'cumple los criterios y vas a denegárselo'}.
            Explica por qué: queda en el documento justificativo.
          </p>
          <textarea rows={3} className="form-control form-control-sm" value={motivo}
            onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo de la decisión" />
          <div className="sup-actions">
            <button type="button" className="btn btn-primary btn-sm" disabled={ocupado || !motivo.trim()}
              onClick={() => decidir(decidiendo.alumno, decidiendo.passed, motivo)}>Registrar decisión</button>
            <button type="button" className="btn btn-outline-secondary btn-sm"
              onClick={() => { setDecidiendo(null); setMotivo(''); }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Aprobacion({ ocupado, onAprobar }: { ocupado: boolean; onAprobar: (n: string, c: string) => void }) {
  const [nombre, setNombre] = useState('');
  const [cargo, setCargo] = useState('Responsable de Escuela');
  return (
    <div className="sup-fields">
      <div className="sup-field">
        <label htmlFor="sup-aprob-nombre">Quién aprueba</label>
        <input id="sup-aprob-nombre" className="form-control form-control-sm" value={nombre}
          onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellidos" />
      </div>
      <div className="sup-field">
        <label htmlFor="sup-aprob-cargo">Cargo</label>
        <select id="sup-aprob-cargo" className="form-control form-control-sm" value={cargo}
          onChange={(e) => setCargo(e.target.value)}>
          <option>Responsable de Escuela</option>
          <option>Responsable de Operaciones</option>
        </select>
      </div>
      <div className="sup-field sup-field-action">
        <button type="button" className="btn btn-primary btn-sm" disabled={ocupado || !nombre.trim()}
          onClick={() => onAprobar(nombre.trim(), cargo)}>
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />Aprobar requisitos
        </button>
      </div>
    </div>
  );
}
