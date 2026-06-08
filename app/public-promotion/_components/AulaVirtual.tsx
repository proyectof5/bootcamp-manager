'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Laptop, FileText, Award, CalendarDays, CheckCircle2, CloudUpload, Send, ExternalLink, Info } from 'lucide-react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { getApiUrl } from '@/lib/api';
import type { PPVirtualClassroom, PPVCCompetence, PPStudent, PPSubmission, PPLevel } from './types';
import { indName } from './types';

const API_URL = getApiUrl();
const LEVEL_COLORS: Record<number, string> = { 1: '#ffc107', 2: '#0d6efd', 3: '#198754' };
const LEVEL_BG: Record<number, string> = { 1: '#fff3cd', 2: '#cfe2ff', 3: '#d1e7dd' };
const LEVEL_NAMES: Record<number, string> = { 1: 'Básico', 2: 'Medio', 3: 'Avanzado' };

function levelIndicators(comp: PPVCCompetence, lvl: number): string[] {
  const ci = comp.competenceIndicators;
  const cat = ci ? (lvl === 1 ? ci.initial : lvl === 2 ? ci.medio : ci.advance) : undefined;
  if (cat && cat.length) return cat.map(indName).filter(Boolean);
  const levelObj = (comp.levels || []).find((l: PPLevel) => l.level === lvl);
  return levelObj?.indicators || [];
}

function CompetenceCard({ comp }: { comp: PPVCCompetence }) {
  const levelDescs = (comp.levels || []).reduce<Record<number, string>>((acc, l) => { acc[l.level] = l.description || ''; return acc; }, {});
  return (
    <>
      {comp.description && <p className="text-muted-foreground text-sm mb-3" style={{ lineHeight: 1.4 }}>{comp.description}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[1, 2, 3].map((lvl) => {
          const inds = levelIndicators(comp, lvl);
          const desc = levelDescs[lvl] || LEVEL_NAMES[lvl];
          return (
            <div key={lvl} className="p-2 h-full rounded border" style={{ background: LEVEL_BG[lvl], borderColor: LEVEL_COLORS[lvl] }}>
              <div className="font-bold mb-1 uppercase" style={{ color: LEVEL_COLORS[lvl], fontSize: '0.6rem', letterSpacing: '0.05em' }}>
                <Award className="h-3 w-3 inline mr-1" />Nivel {lvl}
              </div>
              <div className="font-semibold mb-1" style={{ fontSize: '0.75rem', lineHeight: 1.2 }}>{desc}</div>
              {inds.length ? (
                <ul className="mb-0 pl-3 list-disc text-muted-foreground" style={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
                  {inds.map((n, k) => (<li key={k}>{n}</li>))}
                </ul>
              ) : (
                <div className="text-muted-foreground italic" style={{ fontSize: '0.7rem' }}>Sin indicadores definidos.</div>
              )}
            </div>
          );
        })}
      </div>
      {(comp.toolsWithIndicators || []).length > 0 && (
        <div className="mt-3 border rounded">
          <div className="bg-gray-50 px-3 py-2 border-b font-bold uppercase text-muted-foreground" style={{ fontSize: '0.6rem', letterSpacing: '0.05em' }}>
            <span>Herramientas y Tecnologías</span>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {(comp.toolsWithIndicators || []).map((tool, tIdx) => {
              const byLevel: Record<number, { name: string }[]> = { 1: [], 2: [], 3: [] };
              (tool.indicators || []).forEach((ind) => { if (byLevel[ind.levelId]) byLevel[ind.levelId].push(ind); });
              return (
                <AccordionItem key={tIdx} value={`tool-${tIdx}`} className="px-3">
                  <AccordionTrigger><span className="text-sm font-bold">{tool.name}</span></AccordionTrigger>
                  <AccordionContent>
                    {tool.description && <p className="text-muted-foreground text-xs mb-3 italic">{tool.description}</p>}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {[1, 2, 3].filter((l) => byLevel[l].length > 0).map((lvl) => (
                        <div key={lvl}>
                          <div className="font-bold mb-1 uppercase" style={{ color: LEVEL_COLORS[lvl], fontSize: '0.55rem' }}>Nivel {lvl} {LEVEL_NAMES[lvl]}</div>
                          <ul className="mb-0 pl-3 list-disc text-muted-foreground" style={{ fontSize: '0.65rem', lineHeight: 1.2 }}>
                            {byLevel[lvl].map((ind, k) => (<li key={k}>{ind.name}</li>))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}
    </>
  );
}

export function AulaVirtual({
  vc,
  students,
  promotionId,
  onClose,
}: {
  vc: PPVirtualClassroom;
  students: PPStudent[];
  promotionId: string;
  onClose: () => void;
}) {
  const type = vc.projectType === 'grupal' ? 'grupal' : 'individual';
  const repoPrefix = vc.repoBaseUrl && vc.repoBaseUrl.trim()
    ? vc.repoBaseUrl.trim().replace(/\/+$/, '') + '/'
    : 'https://github.com/';

  const [submissions, setSubmissions] = useState<PPSubmission[]>([]);
  const [target, setTarget] = useState('');
  const [repoSuffix, setRepoSuffix] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refreshSubmissions = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/promotions/${promotionId}/virtual-classroom/submissions?type=${type}`);
      if (!res.ok) return;
      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch {
      /* noop */
    }
  }, [promotionId, type]);

  useEffect(() => { refreshSubmissions(); }, [refreshSubmissions]);

  const submittedIds = new Set(submissions.map((s) => String(s.targetId)));
  const studentMap = new Map(students.map((s) => [String(s.id), `${s.name || ''} ${s.lastname || ''}`.trim()]));

  // Opciones del select (excluye ya entregados)
  const options = type === 'individual'
    ? students.filter((s) => !submittedIds.has(String(s.id))).map((s) => ({ value: `student:${s.id}`, label: `${s.name || ''} ${s.lastname || ''}`.trim() }))
    : (vc.groups || []).filter((g) => !submittedIds.has(g.groupName)).map((g) => {
        const members = (g.studentIds || []).map((id) => studentMap.get(String(id)) || id).filter(Boolean);
        const lbl = members.slice(0, 3).join(', ') + (members.length > 3 ? '…' : '');
        return { value: `group:${g.groupName}`, label: `${g.groupName}${lbl ? ` — ${lbl}` : ''}` };
      });

  const submit = async () => {
    if (!target) { setFeedback({ text: 'Selecciona tu nombre o equipo antes de enviar.', ok: false }); return; }
    if (!repoSuffix.trim()) { setFeedback({ text: 'Escribe el nombre de tu repositorio.', ok: false }); return; }
    const [, id] = target.split(':');
    const body: Record<string, string> = { type, repoName: repoSuffix.trim() };
    if (type === 'grupal') body.groupName = id; else body.studentId = id;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_URL}/api/promotions/${promotionId}/virtual-classroom/submissions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setFeedback({ text: data.error || 'Error al registrar la entrega.', ok: false }); return; }
      setFeedback({ text: 'Entrega registrada correctamente.', ok: true });
      setRepoSuffix('');
      setTarget('');
      await refreshSubmissions();
    } catch {
      setFeedback({ text: 'Error de conexión al enviar la entrega.', ok: false });
    } finally {
      setSubmitting(false);
    }
  };

  const dueDateFmt = vc.dueDate
    ? new Date(vc.dueDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div className="bg-white rounded-lg shadow border border-border">
      <div className="p-4">
        <div className="flex justify-between items-center flex-wrap gap-2 mb-3">
          <h5 className="m-0 flex items-center gap-2 text-lg font-semibold"><Laptop className="h-5 w-5" />Aula Virtual</h5>
          <button className="btn btn-sm btn-outline-secondary inline-flex items-center gap-1" onClick={onClose}>
            <ArrowLeft className="h-3 w-3" />Volver al inicio
          </button>
        </div>

        {vc.project?.projectName && <p className="mb-3 font-semibold text-lg text-center">{vc.project.projectName}</p>}

        <div className="mb-4">
          <h6 className="text-xs uppercase text-muted-foreground mb-1 flex items-center gap-1"><FileText className="h-3 w-3" />Briefing del proyecto</h6>
          {vc.briefingUrl ? (
            <a href={vc.briefingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-crok hover:underline">
              <ExternalLink className="h-3.5 w-3.5" />{vc.briefingUrl}
            </a>
          ) : (
            <span className="text-muted-foreground text-sm italic">El formador no ha definido un briefing.</span>
          )}
        </div>

        {dueDateFmt && (
          <div className="mb-4 bg-yellow-50 border border-yellow-300 rounded p-2 flex items-center gap-2 text-sm">
            <CalendarDays className="h-4 w-4 text-yellow-700" />
            <span><strong>Fecha de entrega:</strong> {dueDateFmt}</span>
          </div>
        )}

        <div className="mb-4">
          <h6 className="text-xs uppercase text-muted-foreground mb-1 flex items-center gap-1"><Award className="h-3 w-3" />Competencias a evaluar</h6>
          {(vc.competences || []).length === 0 ? (
            <span className="text-muted-foreground text-sm italic">Este proyecto no tiene competencias asociadas.</span>
          ) : (
            <Accordion type="single" collapsible defaultValue="vc-comp-0" className="w-full border rounded overflow-hidden">
              {(vc.competences || []).map((c, idx) => (
                <AccordionItem key={idx} value={`vc-comp-${idx}`} className="px-4">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      <span className="badge bg-primary px-2" style={{ fontSize: '0.7rem' }}>{c.area || 'General'}</span>
                      <strong>{c.name}</strong>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent><CompetenceCard comp={c} /></AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>

        {submissions.length > 0 && (
          <div className="mb-4">
            <h6 className="text-xs uppercase text-muted-foreground mb-2 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Entregas realizadas</h6>
            <div className="flex flex-col gap-1">
              {submissions.map((sub, i) => {
                const name = type === 'individual' ? (studentMap.get(String(sub.targetId)) || sub.targetId) : sub.targetId;
                const when = sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Desconocida';
                return (
                  <div key={i} className="border border-border rounded px-3 py-2 flex justify-between items-start flex-wrap gap-2">
                    <div className="flex-grow">
                      <div className="text-sm text-muted-foreground mb-1">{when} · {name}</div>
                      <a href={sub.submissionLink} target="_blank" rel="noopener noreferrer" className="text-sm text-crok hover:underline inline-flex items-center gap-1">
                        <ExternalLink className="h-3.5 w-3.5" />{sub.submissionLink.slice(0, 50)}{sub.submissionLink.length > 50 ? '…' : ''}
                      </a>
                    </div>
                    <span className="badge bg-success">{sub.submissionStatus || 'Entregado'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="border-t pt-3">
          <h6 className="text-xs uppercase text-muted-foreground mb-2 flex items-center gap-1"><CloudUpload className="h-3 w-3" />Entrega de repositorio</h6>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-5 space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">{type === 'grupal' ? 'Selecciona tu equipo' : 'Selecciona tu nombre'}</label>
              <select className="h-8 w-full text-sm rounded-md border border-input bg-transparent px-2" value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">{type === 'grupal' ? 'Selecciona tu equipo…' : 'Selecciona tu nombre…'}</option>
                {options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
            </div>
            <div className="md:col-span-7 space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">URL del repositorio</label>
              <div className="flex h-8 items-center rounded-md border border-input overflow-hidden">
                <span className="bg-gray-100 text-muted-foreground text-sm px-2 truncate" style={{ maxWidth: '60%' }}>{repoPrefix}</span>
                <input type="text" className="flex-1 h-full px-2 text-sm bg-transparent outline-none" placeholder="nombre-repo-estudiante" value={repoSuffix} onChange={(e) => setRepoSuffix(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">Solo escribe el nombre de tu repositorio. El prefijo es fijo.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button type="button" className="btn btn-sm bg-crok hover:bg-crok-hover text-crok-on inline-flex items-center gap-1" disabled={submitting} onClick={submit}>
              <Send className="h-3 w-3" />{submitting ? 'Enviando…' : 'Enviar entrega'}
            </button>
            {feedback && <span className={`text-xs ${feedback.ok ? 'text-green-600' : 'text-red-600'}`}>{feedback.text}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
